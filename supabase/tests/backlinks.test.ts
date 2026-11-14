import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M1.4 : RLS de competitor_backlinks et colonnes backlinks_* des audits. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `backlinks_test_${process.pid}_${Date.now()}`;
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

describe.skipIf(!adminUrl)("competitor_backlinks : RLS et contraintes", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let auditId: string;
  let competitorId: string;

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
    const c = await db.query(
      `insert into public.competitors (audit_id, workspace_id, domain, queries_count, appearances, best_rank, avg_rank, score)
       values ($1, $2, 'rival.fr', 1, 1, 2, 2, 0.9) returning id`,
      [auditId, alice.workspaceId],
    );
    competitorId = c.rows[0].id as string;
    await db.query(
      `insert into public.competitor_backlinks (audit_id, workspace_id, competitor_id, source_domain, source_url)
       values ($1, $2, $3, 'blog.fr', 'https://blog.fr/a')`,
      [auditId, alice.workspaceId, competitorId],
    );
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("un membre lit les backlinks de son workspace, pas un autre", async () => {
    await asRole("authenticated", alice.userId, async (c) => {
      expect((await c.query("select * from public.competitor_backlinks")).rowCount).toBe(1);
    });
    await asRole("authenticated", bob.userId, async (c) => {
      expect((await c.query("select * from public.competitor_backlinks")).rowCount).toBe(0);
    });
  });

  it("un anonyme est refusé", async () => {
    await db.query("begin");
    try {
      await db.query("set local role anon");
      await expect(db.query("select * from public.competitor_backlinks")).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.query("rollback");
    }
  });

  it("aucune écriture côté client", async () => {
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(
        c.query(
          `insert into public.competitor_backlinks (audit_id, workspace_id, competitor_id, source_domain, source_url)
           values ($1, $2, $3, 'x.fr', 'https://x.fr')`,
          [auditId, alice.workspaceId, competitorId],
        ),
      ).rejects.toThrow(/permission denied/);
    });
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(
        c.query("update public.competitor_backlinks set clean_status = 'exclu'"),
      ).rejects.toThrow(/permission denied/);
    });
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(
        c.query("update public.audits set backlinks_status = 'termine'"),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("service_role écrit", async () => {
    await asRole("service_role", null, async (c) => {
      const r = await c.query(
        "update public.competitor_backlinks set clean_status = 'exclu', exclusion_reasons = array['spam']",
      );
      expect(r.rowCount).toBe(1);
    });
  });

  it.each([
    "update public.competitor_backlinks set clean_status = 'autre'",
    "update public.audits set backlinks_status = 'inconnu'",
    "update public.audits set backlinks_limit = 5000",
  ])("contrainte refusée : %s", async (sql) => {
    await asRole("service_role", null, async (c) => {
      await expect(c.query(sql)).rejects.toThrow(/check constraint/);
    });
  });

  it("la suppression d'un concurrent supprime ses backlinks (cascade)", async () => {
    await db.query("delete from public.competitors where id = $1", [competitorId]);
    const r = await db.query("select count(*)::int as n from public.competitor_backlinks");
    expect(r.rows[0].n).toBe(0);
  });
});
