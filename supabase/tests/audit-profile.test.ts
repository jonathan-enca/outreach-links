import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M1.5 : RLS de audit_pages, audit_gap_domains et colonnes profile_* des audits. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `profile_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function asRole<T>(
  role: "authenticated" | "service_role",
  userId: string | null,
  fn: (c: Client) => Promise<T>,
): Promise<T> {
  await db.query("begin");
  try {
    await db.query(`set local role ${role}`);
    if (userId) {
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role }),
      ]);
    }
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

async function signUp(email: string) {
  const u = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  const userId = u.rows[0].id as string;
  const m = await db.query("select workspace_id from public.memberships where user_id = $1", [
    userId,
  ]);
  return { userId, workspaceId: m.rows[0].workspace_id as string };
}

const ZERO_UUID = "00000000-0000-4000-8000-000000000000";

describe.skipIf(!adminUrl)("audit_pages et audit_gap_domains : RLS et contraintes", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let auditId: string;

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`create database ${dbName}`);
    const url = new URL(adminUrl!);
    url.pathname = `/${dbName}`;
    db = new Client({ connectionString: url.toString() });
    await db.connect();
    await db.query(readFileSync(path.join(dir, "tests/bootstrap.sql"), "utf8"));
    for (const f of readdirSync(path.join(dir, "migrations")).sort()) {
      await db.query(readFileSync(path.join(dir, "migrations", f), "utf8"));
    }
    alice = await signUp("alice@example.com");
    bob = await signUp("bob@example.com");
    const s = await db.query(
      "insert into public.sites (workspace_id, domain) values ($1, 'alice-site.fr') returning id",
      [alice.workspaceId],
    );
    const a = await db.query(
      `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
       values ($1, $2, array['coloriage licorne'], 3, 0.25) returning id`,
      [alice.workspaceId, s.rows[0].id],
    );
    auditId = a.rows[0].id as string;
    await db.query(
      "insert into public.audit_pages (audit_id, workspace_id, url) values ($1, $2, 'https://alice-site.fr/a')",
      [auditId, alice.workspaceId],
    );
    await db.query(
      `insert into public.audit_gap_domains (audit_id, workspace_id, domain, competitors_count)
       values ($1, $2, 'ecole.fr', 2)`,
      [auditId, alice.workspaceId],
    );
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it.each(["audit_pages", "audit_gap_domains"])(
    "%s : un membre lit son workspace, pas un autre",
    async (table) => {
      await asRole("authenticated", alice.userId, async (c) => {
        expect((await c.query(`select * from public.${table}`)).rowCount).toBe(1);
      });
      await asRole("authenticated", bob.userId, async (c) => {
        expect((await c.query(`select * from public.${table}`)).rowCount).toBe(0);
      });
    },
  );

  it.each(["audit_pages", "audit_gap_domains"])("%s : un anonyme est refusé", async (table) => {
    await db.query("begin");
    try {
      await db.query("set local role anon");
      await expect(db.query(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.query("rollback");
    }
  });

  it.each([
    `insert into public.audit_pages (audit_id, workspace_id, url) values ('${ZERO_UUID}', '${ZERO_UUID}', 'x')`,
    "update public.audit_pages set is_priority = true",
    "delete from public.audit_gap_domains",
    "update public.audits set profile_status = 'termine'",
    "update public.audits set profile_summary = 'texte libre'",
  ])("aucune écriture côté client : %s", async (sql) => {
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query(sql)).rejects.toThrow(/permission denied/);
    });
  });

  it("service_role écrit", async () => {
    await asRole("service_role", null, async (c) => {
      const r = await c.query(
        "update public.audit_pages set is_priority = true, priority_rank = 1, tech_status = 'ok'",
      );
      expect(r.rowCount).toBe(1);
      const a = await c.query(
        "update public.audits set profile_status = 'confirme', profile_summary_source = 'llm'",
      );
      expect(a.rowCount).toBe(1);
    });
  });

  it("unicité par audit : une URL et un domaine d'écart une seule fois", async () => {
    await asRole("service_role", null, async (c) => {
      await expect(
        c.query(
          "insert into public.audit_pages (audit_id, workspace_id, url) select audit_id, workspace_id, url from public.audit_pages",
        ),
      ).rejects.toThrow(/duplicate key/);
    });
    await asRole("service_role", null, async (c) => {
      await expect(
        c.query(
          "insert into public.audit_gap_domains (audit_id, workspace_id, domain, competitors_count) select audit_id, workspace_id, domain, 1 from public.audit_gap_domains",
        ),
      ).rejects.toThrow(/duplicate key/);
    });
  });

  it.each([
    "update public.audits set profile_status = 'inconnu'",
    "update public.audits set profile_summary_source = 'humain'",
    "update public.audits set profile_cost_usd = -1",
    "update public.audit_pages set tech_status = 'bizarre'",
    "update public.audit_pages set total_volume = -5",
    "update public.audit_gap_domains set competitors_count = 0",
  ])("contrainte refusée : %s", async (sql) => {
    await asRole("service_role", null, async (c) => {
      await expect(c.query(sql)).rejects.toThrow(/check constraint/);
    });
  });

  it("la suppression de l'audit supprime pages et écart (cascade)", async () => {
    await db.query("delete from public.audits where id = $1", [auditId]);
    for (const table of ["audit_pages", "audit_gap_domains"]) {
      const r = await db.query(`select count(*)::int as n from public.${table}`);
      expect(r.rows[0].n).toBe(0);
    }
  });
});
