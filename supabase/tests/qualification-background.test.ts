import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  advanceBackground,
  AUTO_LIMITS,
  startBackground,
} from "@/features/qualification/background";
import type { FunnelStats } from "@/features/qualification/funnel";
import { beginMore, finalizeMore, requestMore, type MoreRun } from "@/features/qualification/more";
import type { QualResult } from "@/features/qualification/types";
import type { Database } from "@/lib/supabase/database.types";
import { pgSupabase } from "./pg-client";

/**
 * Lecture automatique de la réserve (étape 1 du 17/11/2026), sur une VRAIE base : un seul lot à la
 * fois, compteurs rejouables, rangs contigus, écritures qui remplacent des lignes sans les perdre.
 * (La base simulée des tests unitaires ne connaît pas les contraintes, voir `pg-client.ts`.)
 */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `qual_bg_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;
let service: SupabaseClient<Database>;

let workspaceId: string;
let siteId: string;
let auditId: string;
let collectionId: string;
let runId: string;

const lotStats = (costUsd: number, stock = 0) =>
  ({ costUsd, stock, lots: 1 }) as unknown as FunnelStats;

function result(domain: string, over: Partial<QualResult> = {}): QualResult {
  return {
    domain,
    url: `https://${domain}/`,
    tactics: ["inconnus"],
    status: "liste_courte",
    stageReached: 6,
    exclusionReason: null,
    exclusionDetail: null,
    provisionalScore: 40,
    page: null,
    judgement: null,
    contact: {
      status: "email_verifie",
      email: `contact@${domain}`,
      contactUrl: null,
      formUrl: null,
      sendable: true,
      reason: "",
    },
    score: 50,
    scoreParts: null,
    rank: 1,
    requestLines: ["a", "b", "c"],
    why: "Parce que.",
    platformHosted: false,
    domainRank: null,
    competitorsCount: 0,
    ...over,
  };
}

const run = (over: Partial<MoreRun> = {}): MoreRun => ({
  id: runId,
  auditId,
  collectionId,
  workspaceId,
  siteId,
  budgetUsd: 0.15,
  model: "m",
  auditCapUsd: 2,
  priorYield: {},
  ...over,
});

async function seed(stock: number, delivered = 3) {
  await db.query("delete from public.qualified_targets where run_id = $1", [runId]);
  await db.query(
    `update public.qualification_runs set status = 'termine', more_status = 'aucun', auto_status = 'aucun',
       auto_started_at = null, auto_lots = 0, auto_low_streak = 0, auto_added = 0, auto_cost_usd = 0,
       auto_stop = null, stats = '{}'::jsonb, actual_cost_usd = 0.9 where id = $1`,
    [runId],
  );
  for (let i = 1; i <= delivered; i++) {
    await db.query(
      `insert into public.qualified_targets (run_id, audit_id, workspace_id, domain, tactics, status, stage_reached,
         score, rank, request_lines, why, contact_status)
       values ($1, $2, $3, $4, array['inconnus'], 'liste_courte', 6, $5, $6, array['a','b','c'], 'p', 'email_verifie')`,
      [runId, auditId, workspaceId, `livre${i}.fr`, 90 - i, i],
    );
  }
  for (let i = 1; i <= stock; i++) {
    await db.query(
      `insert into public.qualified_targets (run_id, audit_id, workspace_id, domain, tactics, status, stage_reached, exclusion_reason)
       values ($1, $2, $3, $4, array['inconnus'], 'reserve', 1, 'hors_budget_lecture')`,
      [runId, auditId, workspaceId, `stock${i}.fr`],
    );
  }
}

const auto = async () =>
  (await db.query("select * from public.qualification_runs where id = $1", [runId])).rows[0];
const ranks = async () =>
  (
    await db.query(
      "select rank from public.qualified_targets where run_id = $1 and status = 'liste_courte' order by rank",
      [runId],
    )
  ).rows.map((r) => r.rank as number);
const stockLeft = async () =>
  Number(
    (
      await db.query(
        "select count(*) from public.qualified_targets where run_id = $1 and exclusion_reason = 'hors_budget_lecture'",
        [runId],
      )
    ).rows[0].count,
  );

describe.skipIf(!adminUrl)("lecture automatique de la réserve sur une vraie base", () => {
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
    const u = await db.query(
      "insert into auth.users (email) values ('bg@example.com') returning id",
    );
    workspaceId = (
      await db.query("select workspace_id from public.memberships where user_id = $1", [
        u.rows[0].id,
      ])
    ).rows[0].workspace_id;
    siteId = (
      await db.query(
        "insert into public.sites (workspace_id, domain) values ($1, 'bg-site.fr') returning id",
        [workspaceId],
      )
    ).rows[0].id;
    auditId = (
      await db.query(
        `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
         values ($1, $2, array['coloriage'], 10, 2) returning id`,
        [workspaceId, siteId],
      )
    ).rows[0].id;
    collectionId = (
      await db.query(
        `insert into public.candidate_collections (audit_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, target_usd, status)
         values ($1, $2, $3, '{}'::jsonb, 0.3, 0.5, 0.55, 'termine') returning id`,
        [auditId, workspaceId, siteId],
      )
    ).rows[0].id;
    runId = (
      await db.query(
        `insert into public.qualification_runs (audit_id, collection_id, workspace_id, site_id, status, plan, expected_cost_usd, worst_case_usd, budget_usd)
         values ($1, $2, $3, $4, 'termine', '{"model":"m"}'::jsonb, 0.05, 0.08, 0.1) returning id`,
        [auditId, collectionId, workspaceId, siteId],
      )
    ).rows[0].id;
    service = pgSupabase(db) as unknown as SupabaseClient<Database>;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  beforeEach(() => seed(100));

  it("deux démarrages en même temps : un seul lot est lancé", async () => {
    const [a, b] = await Promise.all([
      startBackground(service, auditId),
      startBackground(service, auditId),
    ]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const row = await auto();
    expect(row.auto_status).toBe("en_cours");
    expect(row.more_status).toBe("demande");
  });

  it("le bouton « Lire d'autres sites » ne lance rien tant que la lecture automatique tourne", async () => {
    await startBackground(service, auditId);
    // Entre deux lots : le lot est « terminé » mais la chaîne continue.
    await db.query("update public.qualification_runs set more_status = 'termine' where id = $1", [
      runId,
    ]);
    const sent: string[] = [];
    const out = await requestMore(
      service,
      () => service,
      auditId,
      async (e) => {
        sent.push(e.name);
      },
    );
    expect(out.status).toBe("ok");
    expect(sent).toHaveLength(0);
    expect((await auto()).more_status).toBe("termine");
  });

  it("un événement en retard ou rejoué ne relance pas un lot déjà fait", async () => {
    const started = await startBackground(service, auditId);
    expect(started?.lot).toBe(1);
    expect(await beginMore(service, auditId, { lot: 2 })).toBeNull();
    expect(await beginMore(service, auditId, { lot: 1 })).not.toBeNull();
    // Rejeu du lot 1 après sa prise en charge : toujours le même lot, pas un second.
    expect(await beginMore(service, auditId, { lot: 1 })).not.toBeNull();
    await db.query("update public.qualification_runs set auto_status = 'termine' where id = $1", [
      runId,
    ]);
    expect(await beginMore(service, auditId, { lot: 1 })).toBeNull();
  });

  it("un lot automatique est borné par ce qui reste du budget et du temps", async () => {
    const started = await startBackground(service, auditId, new Date(Date.now() - 12 * 60_000));
    await db.query("update public.qualification_runs set auto_cost_usd = 0.2 where id = $1", [
      runId,
    ]);
    const r = await beginMore(service, auditId, { lot: started!.lot });
    expect(r!.budgetUsd).toBeCloseTo(0.05, 6);
    expect(r!.maxReadMs).toBeLessThanOrEqual(3 * 60_000 + 2_000);
    expect(r!.maxReadMs).toBeGreaterThan(2 * 60_000);
  });

  it("finalizeMore remplace les lignes de réserve sans rien perdre, avec des rangs contigus, et se rejoue sans doublon", async () => {
    const results = [
      ...Array.from({ length: 6 }, (_, i) => result(`stock${i + 1}.fr`, { score: 95 - i })),
      result("stock7.fr", {
        status: "exclu",
        exclusionReason: "hors_sujet",
        score: null,
        rank: null,
        requestLines: null as never,
        why: null as never,
        contact: null,
      }),
      result("stock8.fr", {
        status: "exclu",
        exclusionReason: "concurrent",
        score: null,
        rank: null,
        requestLines: null as never,
        why: null as never,
        contact: null,
      }),
    ];
    const first = await finalizeMore(service, run(), results, lotStats(0.09));
    expect(first.added).toBe(6);
    expect(await ranks()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(await stockLeft()).toBe(92);
    // Rejeu : les sites ne sont plus en stock, rien n'est réécrit ni doublé.
    const again = await finalizeMore(service, run(), results, lotStats(0.09));
    expect(again.added).toBe(0);
    expect(await ranks()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const total = Number(
      (await db.query("select count(*) from public.qualified_targets where run_id = $1", [runId]))
        .rows[0].count,
    );
    expect(total).toBe(103);
  });

  it("enchaînement complet : les lots avancent, les compteurs ne comptent jamais deux fois un lot rejoué", async () => {
    const s = await startBackground(service, auditId);
    expect(s?.lot).toBe(1);
    const a1 = await advanceBackground(service, run(), 1, lotStats(0.09), 12);
    expect(a1).toMatchObject({ continue: true, lot: 2 });
    // Rejeu du même lot : même décision, aucun compteur doublé.
    const a1bis = await advanceBackground(service, run(), 1, lotStats(0.09), 12);
    expect(a1bis).toMatchObject({ continue: true, lot: 2 });
    const row = await auto();
    expect(row.auto_lots).toBe(1);
    expect(row.auto_added).toBe(12);
    expect(Number(row.auto_cost_usd)).toBeCloseTo(0.09, 6);
    expect(row.more_status).toBe("demande");
    expect(row.auto_status).toBe("en_cours");
  });

  it("arrêt : deux lots de suite sous 5 cibles ajoutées (un bon lot remet le compteur à zéro)", async () => {
    await startBackground(service, auditId);
    expect(await advanceBackground(service, run(), 1, lotStats(0.02), 4)).toMatchObject({
      continue: true,
    });
    expect(await advanceBackground(service, run(), 2, lotStats(0.02), 9)).toMatchObject({
      continue: true,
    });
    expect((await auto()).auto_low_streak).toBe(0);
    expect(await advanceBackground(service, run(), 3, lotStats(0.02), 1)).toMatchObject({
      continue: true,
    });
    const last = await advanceBackground(service, run(), 4, lotStats(0.02), 2);
    expect(last).toEqual({ continue: false, stop: "rendement_faible" });
    const row = await auto();
    expect(row.auto_status).toBe("termine");
    expect(row.auto_stop).toBe("rendement_faible");
    // Un lot en retard après l'arrêt ne relance rien.
    expect(await advanceBackground(service, run(), 5, lotStats(0.02), 20)).toEqual({
      continue: false,
      stop: "rendement_faible",
    });
  });

  it("arrêt : budget total de jugement de l'arrière-plan atteint", async () => {
    await startBackground(service, auditId);
    expect(await advanceBackground(service, run(), 1, lotStats(0.12), 15)).toMatchObject({
      continue: true,
    });
    const out = await advanceBackground(service, run(), 2, lotStats(0.11), 15);
    expect(out).toEqual({ continue: false, stop: "budget" });
    expect(Number((await auto()).auto_cost_usd)).toBeLessThanOrEqual(AUTO_LIMITS.budgetUsd + 0.2);
  });

  it("arrêt : réserve épuisée", async () => {
    await seed(0);
    expect(await startBackground(service, auditId)).toBeNull();
    const row = await auto();
    expect(row.auto_status).toBe("termine");
    expect(row.auto_stop).toBe("reserve_epuisee");
    await seed(3);
    await startBackground(service, auditId);
    await db.query(
      "delete from public.qualified_targets where run_id = $1 and exclusion_reason = 'hors_budget_lecture'",
      [runId],
    );
    expect(await advanceBackground(service, run(), 1, lotStats(0.02), 20)).toEqual({
      continue: false,
      stop: "reserve_epuisee",
    });
  });

  it("arrêt : durée maximale de 15 minutes", async () => {
    await startBackground(service, auditId, new Date(Date.now() - 14.5 * 60_000));
    const out = await advanceBackground(service, run(), 1, lotStats(0.02), 20);
    expect(out).toEqual({ continue: false, stop: "duree" });
    expect((await auto()).auto_stop).toBe("duree");
  });

  it("redémarrage d'une chaîne terminée : compteurs remis à zéro", async () => {
    await startBackground(service, auditId, new Date(Date.now() - 20 * 60_000));
    await advanceBackground(service, run(), 1, lotStats(0.02), 20);
    expect((await auto()).auto_status).toBe("termine");
    await db.query("update public.qualification_runs set more_status = 'termine' where id = $1", [
      runId,
    ]);
    const again = await startBackground(service, auditId);
    expect(again?.lot).toBe(1);
    const row = await auto();
    expect([row.auto_lots, row.auto_added, row.auto_stop]).toEqual([0, 0, null]);
  });
});
