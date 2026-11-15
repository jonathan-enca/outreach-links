import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** MT.3 : collectes de candidats par audit et candidats bruts (lecture membres, écriture service_role). */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `collections_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function asRole<T>(role: string, userId: string | null, fn: (c: Client) => Promise<T>) {
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

describe.skipIf(!adminUrl)("collecte de candidats : RLS et contraintes", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let siteId: string;
  let auditId: string;

  const insertCollection = (extra = "") => ({
    text: `insert into public.candidate_collections
             (audit_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, target_usd ${extra ? ", status" : ""})
           values ($1, $2, $3, '{"serp":[]}'::jsonb, 0.4, 0.55, 0.55 ${extra ? `, '${extra}'` : ""}) returning id`,
    values: [auditId, alice.workspaceId, siteId],
  });
  const insertCandidate = (collectionId: string, domain: string, tactics = "{inconnus}") => ({
    text: `insert into public.collection_candidates (collection_id, audit_id, workspace_id, domain, tactics)
           values ($1, $2, $3, $4, $5)`,
    values: [collectionId, auditId, alice.workspaceId, domain, tactics],
  });

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
    siteId = s.rows[0].id;
    const a = await db.query(
      `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
       values ($1, $2, array['coloriage'], 10, 2) returning id`,
      [alice.workspaceId, siteId],
    );
    auditId = a.rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("un membre lit la collecte et ses candidats ; un autre espace ne voit rien", async () => {
    const col = await db.query(insertCollection());
    await db.query(insertCandidate(col.rows[0].id, "blog-maman.fr"));
    await asRole("authenticated", alice.userId, async (c) => {
      expect((await c.query("select * from public.candidate_collections")).rowCount).toBe(1);
      expect((await c.query("select * from public.collection_candidates")).rowCount).toBe(1);
    });
    await asRole("authenticated", bob.userId, async (c) => {
      expect((await c.query("select * from public.candidate_collections")).rowCount).toBe(0);
      expect((await c.query("select * from public.collection_candidates")).rowCount).toBe(0);
    });
    await db.query("delete from public.candidate_collections");
  });

  it("aucun membre n'écrit : le plan, le coût et les candidats sont des faits du serveur", async () => {
    const col = await db.query(insertCollection());
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query(insertCollection())).rejects.toThrow(/permission denied/);
    });
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(
        c.query("update public.candidate_collections set actual_cost_usd = 0"),
      ).rejects.toThrow(/permission denied/);
    });
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query(insertCandidate(col.rows[0].id, "x.fr"))).rejects.toThrow(
        /permission denied/,
      );
    });
    await asRole("anon", null, async (c) => {
      await expect(c.query("select * from public.collection_candidates")).rejects.toThrow(
        /permission denied/,
      );
    });
    await db.query("delete from public.candidate_collections");
  });

  it("service_role écrit ; une seule collecte par audit ; les candidats suivent la cascade", async () => {
    await asRole("service_role", null, async (c) => {
      const col = await c.query(insertCollection());
      await c.query(insertCandidate(col.rows[0].id, "asso.fr", "{inconnus,mentions}"));
      await expect(c.query(insertCandidate(col.rows[0].id, "asso.fr"))).rejects.toThrow(
        /duplicate key|unique/,
      );
    });
    await db.query(insertCollection());
    await expect(db.query(insertCollection())).rejects.toThrow(/duplicate key|unique/);
    await db.query("delete from public.candidate_collections");
    expect((await db.query("select * from public.collection_candidates")).rowCount).toBe(0);
  });

  it("les contraintes refusent statut inconnu, coût négatif, tactique inconnue, tactiques vides", async () => {
    await expect(db.query(insertCollection("annule"))).rejects.toThrow(/check/);
    await expect(
      db.query({
        text: `insert into public.candidate_collections (audit_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, target_usd)
               values ($1, $2, $3, '{}'::jsonb, -1, 0.5, 0.55)`,
        values: [auditId, alice.workspaceId, siteId],
      }),
    ).rejects.toThrow(/check/);
    const col = await db.query(insertCollection());
    await expect(db.query(insertCandidate(col.rows[0].id, "a.fr", "{pbn}"))).rejects.toThrow(
      /check/,
    );
    await expect(db.query(insertCandidate(col.rows[0].id, "b.fr", "{}"))).rejects.toThrow(/check/);
    await db.query("delete from public.candidate_collections");
  });

  it("la mise à jour d'une collecte actualise updated_at", async () => {
    const col = await db.query(insertCollection());
    const before = await db.query("select updated_at from public.candidate_collections");
    await db.query("select pg_sleep(0.01)");
    await db.query("update public.candidate_collections set status = 'en_cours' where id = $1", [
      col.rows[0].id,
    ]);
    const after = await db.query("select updated_at from public.candidate_collections");
    expect(after.rows[0].updated_at.getTime()).toBeGreaterThan(before.rows[0].updated_at.getTime());
    await db.query("delete from public.candidate_collections");
  });
});
