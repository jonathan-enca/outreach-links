import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { stepsToReset } from "@/features/analysis/restart";

/**
 * Chantier A.2 : « Reprendre à partir d'ici ». Sur une VRAIE base : les suppressions suivent les clés
 * étrangères en cascade ; ce qui précède l'étape reprise reste intact.
 */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");
const dbName = `restart_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");

describe("stepsToReset", () => {
  it("l'étape et les suivantes ; contacts = le bloc du tri ; l'état des lieux n'est jamais repris", () => {
    expect(stepsToReset("comprendre")).toHaveLength(7);
    expect(stepsToReset("recherche")).toEqual([
      "recherche",
      "tri",
      "contacts",
      "constats",
      "demandes",
    ]);
    expect(stepsToReset("contacts")).toEqual(["tri", "contacts", "constats", "demandes"]);
    expect(stepsToReset("demandes")).toEqual(["demandes"]);
    expect(stepsToReset("etat_des_lieux")).toBeNull();
    expect(stepsToReset("n'importe quoi")).toBeNull();
  });
});

describe.skipIf(!adminUrl)("resetSteps sur la base réelle", () => {
  let admin: Client;
  let db: Client;

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
  });
  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName} with (force)`);
    await admin?.end();
  });

  const count = async (table: string, where = "true") =>
    Number(
      (await db.query(`select count(*)::int as n from public.${table} where ${where}`)).rows[0].n,
    );

  it("reprendre à « recherche » efface la collecte, la qualification et les constats, garde les concurrents et le profil", async () => {
    const u = await db.query(
      "insert into auth.users (email) values ('a@example.com') returning id",
    );
    const m = await db.query("select workspace_id from public.memberships where user_id = $1", [
      u.rows[0].id,
    ]);
    const ws = m.rows[0].workspace_id as string;
    const site = (
      await db.query(
        "insert into public.sites (workspace_id, domain) values ($1, 'mon-site.fr') returning id",
        [ws],
      )
    ).rows[0].id as string;
    const audit = (
      await db.query(
        `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
         values ($1, $2, array['coloriage'], 3, 2) returning id`,
        [ws, site],
      )
    ).rows[0].id as string;
    await db.query(
      `insert into public.competitors (audit_id, workspace_id, domain, queries_count, appearances, best_rank, avg_rank, score)
       values ($1, $2, 'rival.fr', 1, 1, 2, 2, 0.9)`,
      [audit, ws],
    );
    await db.query(
      `insert into public.audit_serp_results (audit_id, workspace_id, query, rank, domain, url)
       values ($1, $2, 'coloriage', 1, 'rival.fr', 'https://rival.fr/')`,
      [audit, ws],
    );
    await db.query(
      `insert into public.brand_profiles (site_id, workspace_id, version, source, profile)
       values ($1, $2, 1, 'llm', '{}'::jsonb)`,
      [site, ws],
    );
    const col = (
      await db.query(
        `insert into public.candidate_collections (audit_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, target_usd, status)
         values ($1, $2, $3, '{"serp":[]}'::jsonb, 0.4, 0.55, 0.55, 'termine') returning id`,
        [audit, ws, site],
      )
    ).rows[0].id as string;
    await db.query(
      `insert into public.collection_candidates (collection_id, audit_id, workspace_id, domain, tactics)
       values ($1, $2, $3, 'asso.fr', '{inconnus}')`,
      [col, audit, ws],
    );
    const qrun = (
      await db.query(
        `insert into public.qualification_runs (audit_id, collection_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, budget_usd)
         values ($1, $2, $3, $4, '{"model":"m","budgetUsd":0.1}'::jsonb, 0.05, 0.08, 0.1) returning id`,
        [audit, col, ws, site],
      )
    ).rows[0].id as string;
    const target = (
      await db.query(
        `insert into public.qualified_targets (run_id, audit_id, workspace_id, domain, tactics, status, stage_reached, exclusion_reason)
         values ($1, $2, $3, 'asso.fr', array['inconnus'], 'exclu', 1, 'concurrent') returning id`,
        [qrun, audit, ws],
      )
    ).rows[0].id as string;
    const frun = (
      await db.query(
        `insert into public.findings_runs (audit_id, qualification_run_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, budget_usd)
         values ($1, $2, $3, $4, '{"model":"m","budgetUsd":0.05}'::jsonb, 0.02, 0.04, 0.05) returning id`,
        [audit, qrun, ws, site],
      )
    ).rows[0].id as string;
    await db.query(
      `insert into public.target_findings (run_id, audit_id, workspace_id, target_id, domain, page_url, quote, resource_url, resource_title, replacement_how, reason, request_lines, brief, kind, link_url, http_status)
       values ($1, $2, $3, $4, 'asso.fr', 'https://asso.fr/p', 'q', 'https://mon-site.fr/', 'Accueil', 'accueil', 'r', array['a','b','c'], '{}', 'lien_mort', 'https://vieux.fr/x', 404)`,
      [frun, audit, ws, target],
    );
    for (const [i, key] of [
      "comprendre",
      "concurrents",
      "etat_des_lieux",
      "recherche",
      "tri",
      "contacts",
      "constats",
      "demandes",
    ].entries()) {
      await db.query(
        `insert into public.analysis_steps (audit_id, workspace_id, key, position, status, counters, last_example)
         values ($1, $2, $3, $4, 'termine', '{"done": 3}'::jsonb, 'exemple')`,
        [audit, ws, key, i + 1],
      );
    }
    await db.query(
      `insert into public.analysis_feed (audit_id, workspace_id, kind, step_key, message) values
        ($1, $2, 'etape', 'concurrents', 'Étape terminée : concurrents'),
        ($1, $2, 'etape', 'recherche', 'Étape terminée : recherche'),
        ($1, $2, 'cible', 'contacts', 'Cible prête : asso.fr'),
        ($1, $2, 'info', null, 'Analyse terminée')`,
      [audit, ws],
    );

    await db.query("select public.analysis_reset_steps($1, $2)", [
      audit,
      ["recherche", "tri", "contacts", "constats", "demandes"],
    ]);

    // Effacé : tout ce qui dérive de la recherche.
    expect(await count("candidate_collections")).toBe(0);
    expect(await count("collection_candidates")).toBe(0);
    expect(await count("qualification_runs")).toBe(0);
    expect(await count("qualified_targets")).toBe(0);
    expect(await count("findings_runs")).toBe(0);
    expect(await count("target_findings")).toBe(0);
    // Gardé : ce qui précède (concurrents, SERP, profil) et l'étape parallèle.
    expect(await count("competitors")).toBe(1);
    expect(await count("audit_serp_results")).toBe(1);
    expect(await count("brand_profiles")).toBe(1);
    const steps = await db.query(
      "select key, status, counters, last_example from public.analysis_steps order by position",
    );
    const by = Object.fromEntries(steps.rows.map((r) => [r.key, r]));
    for (const k of ["comprendre", "concurrents", "etat_des_lieux"]) {
      expect(by[k].status).toBe("termine");
      expect(by[k].counters).toEqual({ done: 3 });
    }
    for (const k of ["recherche", "tri", "contacts", "constats", "demandes"]) {
      expect(by[k]).toMatchObject({ status: "attente", counters: {}, last_example: null });
    }
    const feed = await db.query("select step_key from public.analysis_feed order by id");
    expect(feed.rows.map((r) => r.step_key)).toEqual(["concurrents"]);

    // Reprendre à « concurrents » : les concurrents et la SERP partent, l'audit repasse « confirme »,
    // « comprendre » reste ; reprendre à « comprendre » pose le drapeau de relecture du site.
    await db.query("select public.analysis_reset_steps($1, $2)", [audit, ["concurrents"]]);
    expect(await count("competitors")).toBe(0);
    expect(await count("audit_serp_results")).toBe(0);
    expect(
      (await db.query("select status from public.audits where id = $1", [audit])).rows[0].status,
    ).toBe("confirme");
    await db.query("select public.analysis_reset_steps($1, $2)", [audit, ["comprendre"]]);
    const c = await db.query(
      "select counters from public.analysis_steps where audit_id = $1 and key = 'comprendre'",
      [audit],
    );
    expect(c.rows[0].counters).toEqual({ redo: 1 });
    expect(await count("brand_profiles")).toBe(1); // les versions de profil ne sont jamais effacées
  });

  it("seul service_role peut appeler la fonction", async () => {
    await db.query("begin");
    try {
      await db.query("set local role authenticated");
      await expect(
        db.query("select public.analysis_reset_steps(gen_random_uuid(), array['tri'])"),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.query("rollback");
    }
  });
});
