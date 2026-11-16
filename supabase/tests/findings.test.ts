import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * MT.5 : constats par page (exécutions et constats). Lecture par les membres, écriture service_role,
 * preuves exigées en base (404/410 pour un lien mort, phrase pour une mention, trois lignes).
 */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `findings_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function inTx<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
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

describe.skipIf(!adminUrl)("constats par page : RLS et contraintes de preuve", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let siteId: string;
  let auditId: string;
  let qrunId: string;

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
    siteId = (
      await db.query(
        "insert into public.sites (workspace_id, domain) values ($1, 'alice-site.fr') returning id",
        [alice.workspaceId],
      )
    ).rows[0].id;
    auditId = (
      await db.query(
        `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
         values ($1, $2, array['coloriage'], 10, 2) returning id`,
        [alice.workspaceId, siteId],
      )
    ).rows[0].id;
    const collectionId = (
      await db.query(
        `insert into public.candidate_collections (audit_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, target_usd, status)
         values ($1, $2, $3, '{}'::jsonb, 0.3, 0.5, 0.55, 'termine') returning id`,
        [auditId, alice.workspaceId, siteId],
      )
    ).rows[0].id;
    qrunId = (
      await db.query(
        `insert into public.qualification_runs (audit_id, collection_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, budget_usd, status)
         values ($1, $2, $3, $4, '{"model":"m","budgetUsd":0.1}'::jsonb, 0.05, 0.08, 0.1, 'termine') returning id`,
        [auditId, collectionId, alice.workspaceId, siteId],
      )
    ).rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  const insertRun = (c: Client, extra: { worst?: number; budget?: number } = {}) =>
    c
      .query(
        `insert into public.findings_runs (audit_id, qualification_run_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, budget_usd)
       values ($1, $2, $3, $4, '{"model":"m","budgetUsd":0.05}'::jsonb, 0.02, $5, $6) returning id`,
        [auditId, qrunId, alice.workspaceId, siteId, extra.worst ?? 0.04, extra.budget ?? 0.05],
      )
      .then((r) => r.rows[0].id as string);
  const insertTarget = async (c: Client, domain = "asso.fr") =>
    (
      await c.query(
        `insert into public.qualified_targets (run_id, audit_id, workspace_id, domain, tactics, status, stage_reached, exclusion_reason)
         values ($1, $2, $3, $4, array['inconnus'], 'exclu', 1, 'concurrent') returning id`,
        [qrunId, auditId, alice.workspaceId, domain],
      )
    ).rows[0].id as string;
  const base = {
    domain: "asso.fr",
    page_url: "https://asso.fr/p",
    quote: "Une phrase de la page.",
    resource_url: "https://alice-site.fr/",
    resource_title: "Accueil",
    replacement_how: "accueil",
    reason: "raison",
    request_lines: ["a", "b", "c"],
    brief: "{}",
  };
  const insertFinding = (
    c: Client,
    runId: string,
    targetId: string,
    o: Record<string, unknown>,
  ) => {
    const row = { ...base, ...o };
    const cols = Object.keys(row);
    return c.query(
      `insert into public.target_findings (run_id, audit_id, workspace_id, target_id, ${cols.join(", ")})
       values ($1, $2, $3, $4, ${cols.map((_, i) => `$${i + 5}`).join(", ")})`,
      [runId, auditId, alice.workspaceId, targetId, ...Object.values(row)],
    );
  };
  const dead = { kind: "lien_mort", link_url: "https://vieux.fr/x", http_status: 404 };
  const mention = {
    kind: "mention_sans_lien",
    anchor: "Alice",
    proposed_sentence: "On aime [Alice](https://alice-site.fr/).",
  };
  const unsuited = { kind: "lien_inadapte", link_url: "https://x.com/p", anchor: "ce site" };

  it("un membre lit exécutions et constats ; un autre espace ne voit rien ; personne n'écrit", async () => {
    await inTx(async (c) => {
      const run = await insertRun(c);
      await insertFinding(c, run, await insertTarget(c), dead);
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: alice.userId, role: "authenticated" }),
      ]);
      await c.query("set local role authenticated");
      expect((await c.query("select * from public.target_findings")).rowCount).toBe(1);
      expect((await c.query("select * from public.findings_runs")).rowCount).toBe(1);
      await c.query("savepoint a");
      await expect(c.query("update public.target_findings set reason = 'x'")).rejects.toThrow(
        /permission denied/,
      );
      await c.query("rollback to savepoint a");
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: bob.userId, role: "authenticated" }),
      ]);
      expect((await c.query("select * from public.target_findings")).rowCount).toBe(0);
      expect((await c.query("select * from public.findings_runs")).rowCount).toBe(0);
    });
  });

  it("pire cas au-dessus du budget, statut inconnu : refusés ; une seule exécution par audit", async () => {
    await inTx(async (c) => {
      await c.query("savepoint a");
      await expect(insertRun(c, { worst: 0.08, budget: 0.05 })).rejects.toThrow(/check|violates/i);
      await c.query("rollback to savepoint a");
      await insertRun(c);
      await c.query("savepoint b");
      await expect(insertRun(c)).rejects.toThrow(/duplicate|unique/i);
      await c.query("rollback to savepoint b");
      await c.query("savepoint c");
      await expect(c.query("update public.findings_runs set status = 'inconnu'")).rejects.toThrow(
        /check|violates/i,
      );
      await c.query("rollback to savepoint c");
    });
  });

  it("preuves exigées : lien mort = 404 ou 410 et lien ; mention = phrase et ancre, sans lien ; trois lignes", async () => {
    await inTx(async (c) => {
      const run = await insertRun(c);
      const t = await insertTarget(c);
      for (const bad of [
        { ...dead, http_status: 500 },
        { ...dead, http_status: null },
        { ...dead, link_url: null },
        { ...mention, proposed_sentence: null },
        { ...mention, anchor: null },
        { ...mention, link_url: "https://x.fr/" },
        { ...unsuited, link_url: null },
        { ...unsuited, http_status: 404 },
        { ...dead, request_lines: ["a", "b"] },
        { ...dead, quote: "" },
        { ...dead, replacement_how: "au_hasard" },
        { ...dead, kind: "autre" },
      ]) {
        await c.query("savepoint a");
        await expect(insertFinding(c, run, t, bad), JSON.stringify(bad)).rejects.toThrow(
          /check|violates/i,
        );
        await c.query("rollback to savepoint a");
      }
      await insertFinding(c, run, t, dead);
      await insertFinding(c, run, t, mention);
      await insertFinding(c, run, t, unsuited);
      await c.query("savepoint b");
      await expect(insertFinding(c, run, t, dead)).rejects.toThrow(/duplicate|unique/i);
      await c.query("rollback to savepoint b");
    });
  });

  it("supprimer les cibles qualifiées ou l'exécution supprime les constats", async () => {
    await inTx(async (c) => {
      const run = await insertRun(c);
      const t = await insertTarget(c);
      await insertFinding(c, run, t, dead);
      await c.query("delete from public.qualified_targets where id = $1", [t]);
      expect((await c.query("select 1 from public.target_findings")).rowCount).toBe(0);
      const t2 = await insertTarget(c, "autre.fr");
      await insertFinding(c, run, t2, { ...mention, domain: "autre.fr" });
      await c.query("delete from public.findings_runs where id = $1", [run]);
      expect((await c.query("select 1 from public.target_findings")).rowCount).toBe(0);
    });
  });
});
