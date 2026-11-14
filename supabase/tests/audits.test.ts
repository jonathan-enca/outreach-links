import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M1.3 : RLS des audits, résultats SERP et concurrents ; clé étrangère du cost_ledger. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `audits_test_${process.pid}_${Date.now()}`;
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

describe.skipIf(!adminUrl)("audits : RLS et contraintes", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let siteId: string;
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
    siteId = s.rows[0].id as string;
    const a = await db.query(
      `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
       values ($1, $2, array['coloriage licorne'], 3, 0.25) returning id`,
      [alice.workspaceId, siteId],
    );
    auditId = a.rows[0].id as string;
    await db.query(
      `insert into public.competitors (audit_id, workspace_id, domain, queries_count, appearances, best_rank, avg_rank, score)
       values ($1, $2, 'rival.fr', 1, 1, 2, 2, 0.9)`,
      [auditId, alice.workspaceId],
    );
    await db.query(
      `insert into public.audit_serp_results (audit_id, workspace_id, query, rank, domain, url)
       values ($1, $2, 'coloriage licorne', 1, 'rival.fr', 'https://rival.fr/')`,
      [auditId, alice.workspaceId],
    );
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("un membre lit les audits, résultats et concurrents de son workspace", async () => {
    await asRole("authenticated", alice.userId, async (c) => {
      for (const table of ["audits", "audit_serp_results", "competitors"]) {
        expect((await c.query(`select * from public.${table}`)).rowCount).toBe(1);
      }
    });
  });

  it("un autre workspace ne voit rien", async () => {
    await asRole("authenticated", bob.userId, async (c) => {
      for (const table of ["audits", "audit_serp_results", "competitors"]) {
        expect((await c.query(`select * from public.${table}`)).rowCount).toBe(0);
      }
    });
  });

  it("un anonyme est refusé", async () => {
    await db.query("begin");
    try {
      await db.query("set local role anon");
      await expect(db.query("select * from public.audits")).rejects.toThrow(/permission denied/);
    } finally {
      await db.query("rollback");
    }
  });

  it("aucune écriture côté client (statut, coûts, concurrents)", async () => {
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(
        c.query(
          `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
           values ($1, $2, array['x'], 3, 0.25)`,
          [alice.workspaceId, siteId],
        ),
      ).rejects.toThrow(/permission denied/);
    });
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query("update public.audits set status = 'termine'")).rejects.toThrow(
        /permission denied/,
      );
    });
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query("delete from public.competitors")).rejects.toThrow(/permission denied/);
    });
  });

  it("le plan du workspace n'est pas modifiable côté client", async () => {
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(
        c.query("update public.workspaces set plan = 'payant' where id = $1", [alice.workspaceId]),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("service_role écrit et le statut est contraint", async () => {
    await asRole("service_role", null, async (c) => {
      const r = await c.query("update public.audits set status = 'estime' where id = $1", [
        auditId,
      ]);
      expect(r.rowCount).toBe(1);
      await expect(c.query("update public.audits set status = 'inconnu'")).rejects.toThrow(
        /check constraint/,
      );
    });
  });

  it("un seul audit actif par site", async () => {
    await expect(
      db.query(
        `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
         values ($1, $2, array['autre'], 3, 0.25)`,
        [alice.workspaceId, siteId],
      ),
    ).rejects.toThrow(/audits_one_active_per_site_idx/);
    // Un audit terminé libère le site.
    await db.query("update public.audits set status = 'termine' where id = $1", [auditId]);
    await db.query(
      `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
       values ($1, $2, array['autre'], 3, 0.25)`,
      [alice.workspaceId, siteId],
    );
  });

  it("cost_ledger.audit_id référence audits et survit à sa suppression", async () => {
    await expect(
      db.query(
        "insert into public.cost_ledger (provider, operation, audit_id) values ('x', 'y', gen_random_uuid())",
      ),
    ).rejects.toThrow(/cost_ledger_audit_id_fkey/);
    const row = await db.query(
      "insert into public.cost_ledger (provider, operation, audit_id) values ('x', 'y', $1) returning id",
      [auditId],
    );
    await db.query("delete from public.audits where id = $1", [auditId]);
    const after = await db.query("select audit_id from public.cost_ledger where id = $1", [
      row.rows[0].id,
    ]);
    expect(after.rows[0].audit_id).toBeNull();
  });
});
