import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { chainProgressView } from "@/features/audits/chain-progress";
import { t } from "@/lib/messages";
import { runWatchdog } from "./run";
import { isStuck, WATCHDOG_LIMITS, WATCHED_STEPS } from "./steps";

const NOW = new Date("2026-11-16T15:00:00Z");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const now = () => NOW;

const audit = (over: Record<string, unknown>) => ({
  id: "a1",
  workspace_id: "w1",
  status: "termine",
  auto_chain: true,
  started_at: ago(300),
  updated_at: ago(300),
  backlinks_status: "termine",
  backlinks_started_at: ago(290),
  profile_status: "termine",
  profile_started_at: ago(280),
  opportunities_status: "aucun",
  opportunities_started_at: null,
  opportunities_cost_usd: null,
  deadlinks_status: "aucun",
  deadlinks_started_at: null,
  ...over,
});

const stepOf = (key: string) => WATCHED_STEPS.find((s) => s.key === key)!;

describe("étape bloquée : règle de délai", () => {
  const def = stepOf("audit.opportunities");
  it("une étape en cours récente n'est jamais touchée", () => {
    const row = audit({ opportunities_status: "en_cours", opportunities_started_at: ago(5) });
    expect(isStuck(def, row, NOW.getTime())).toBe(false);
  });
  it("une étape en cours au-delà du délai est bloquée", () => {
    const row = audit({
      opportunities_status: "en_cours",
      opportunities_started_at: ago(WATCHDOG_LIMITS.runningMinutes + 1),
    });
    expect(isStuck(def, row, NOW.getTime())).toBe(true);
  });
  it("une étape confirmée jamais démarrée utilise la dernière écriture, avec un délai plus court", () => {
    const base = { opportunities_status: "confirme", opportunities_started_at: null };
    expect(isStuck(def, audit({ ...base, updated_at: ago(10) }), NOW.getTime())).toBe(false);
    expect(
      isStuck(
        def,
        audit({ ...base, updated_at: ago(WATCHDOG_LIMITS.confirmedMinutes + 1) }),
        NOW.getTime(),
      ),
    ).toBe(true);
  });
  it("une étape terminée, échouée ou sans date lisible n'est jamais touchée", () => {
    for (const s of ["termine", "echoue", "aucun"]) {
      expect(isStuck(def, audit({ opportunities_status: s }), NOW.getTime())).toBe(false);
    }
    const noDate = audit({ opportunities_status: "en_cours", updated_at: null });
    expect(isStuck(def, noDate, NOW.getTime())).toBe(false);
  });
});

describe("chien de garde", () => {
  it("répare une étape affichée « en cours » alors que son événement de fin existe", async () => {
    // Le défaut de l'audit du 16/11 : statut resté « en_cours », journal « audit.opportunities_done ».
    const db = fakeSupabase({
      audits: [audit({ opportunities_status: "en_cours", opportunities_started_at: ago(120) })],
      events: [
        {
          workspace_id: "w1",
          type: "audit.opportunities_done",
          created_at: ago(118),
          payload: { audit_id: "a1", total: 0, cost_usd: 0.016 },
        },
      ],
    });
    const onAuditRepaired = vi.fn(async () => {});
    const report = await runWatchdog(db.client, { now, onAuditRepaired });
    expect(report.actions).toEqual([
      expect.objectContaining({ step: "audit.opportunities", id: "a1", action: "repare" }),
    ]);
    const row = db.tables.audits![0]!;
    expect(row.opportunities_status).toBe("termine");
    expect(row.opportunities_finished_at).toBe(ago(118));
    expect(row.opportunities_cost_usd).toBe(0.016);
    expect(onAuditRepaired).toHaveBeenCalledWith("a1");
    expect(db.tables.events!.some((e) => e.type === "watchdog.step_repaired")).toBe(true);
    // L'écran ne montre plus « en cours ».
    const view = chainProgressView({
      auditStatus: String(row.status),
      backlinks: String(row.backlinks_status),
      profile: String(row.profile_status),
      opportunities: String(row.opportunities_status),
      uncovered: [],
    });
    expect(view.stages.every((s) => s.state === "termine")).toBe(true);
  });

  it("un événement de fin d'un AUTRE audit ou antérieur au début ne répare rien", async () => {
    const db = fakeSupabase({
      audits: [audit({ opportunities_status: "en_cours", opportunities_started_at: ago(120) })],
      events: [
        {
          workspace_id: "w1",
          type: "audit.opportunities_done",
          created_at: ago(110),
          payload: { audit_id: "autre" },
        },
        {
          workspace_id: "w1",
          type: "audit.opportunities_done",
          created_at: ago(400),
          payload: { audit_id: "a1" },
        },
      ],
    });
    const report = await runWatchdog(db.client, { now });
    expect(report.actions[0]).toMatchObject({ action: "echoue" });
    expect(db.tables.audits![0]!.opportunities_status).toBe("echoue");
  });

  it("passe en échec, avec un message clair, une étape bloquée sans événement de fin", async () => {
    const db = fakeSupabase({
      audits: [
        audit({
          backlinks_status: "en_cours",
          backlinks_started_at: ago(90),
          profile_status: "aucun",
        }),
      ],
      events: [],
      candidate_collections: [
        { id: "c1", workspace_id: "w1", status: "confirme", started_at: null, updated_at: ago(45) },
        {
          id: "c2",
          workspace_id: "w1",
          status: "en_cours",
          started_at: ago(3),
          updated_at: ago(3),
        },
      ],
    });
    const onAuditRepaired = vi.fn(async () => {});
    const report = await runWatchdog(db.client, { now, onAuditRepaired });
    expect(report.actions.map((a) => `${a.step}:${a.id}:${a.action}`).sort()).toEqual([
      "audit.backlinks:a1:echoue",
      "collection:c1:echoue",
    ]);
    const a = db.tables.audits![0]!;
    expect(a.backlinks_status).toBe("echoue");
    expect(a.backlinks_error).toBe(t.watchdog.stuck);
    expect(a.backlinks_finished_at).toBe(NOW.toISOString());
    const [c1, c2] = db.tables.candidate_collections!;
    expect(c1!.status).toBe("echoue");
    expect(c1!.error_message).toBe(t.watchdog.stuck);
    expect(c2!.status).toBe("en_cours"); // récente : intacte
    expect(onAuditRepaired).not.toHaveBeenCalled(); // jamais de relance automatique d'un échec
    expect(db.tables.events!.filter((e) => e.type === "watchdog.step_failed")).toHaveLength(2);
  });

  it("un audit confirmé dont le job n'a jamais démarré est libéré (il bloquait le site)", async () => {
    const db = fakeSupabase({
      audits: [
        audit({
          status: "confirme",
          started_at: null,
          updated_at: ago(40),
          backlinks_status: "aucun",
          profile_status: "aucun",
        }),
      ],
      events: [],
    });
    await runWatchdog(db.client, { now });
    const a = db.tables.audits![0]!;
    expect(a.status).toBe("echoue");
    expect(a.error_message).toBe(t.watchdog.stuck);
  });

  it("est idempotent : un second passage ne fait rien", async () => {
    const db = fakeSupabase({
      audits: [audit({ profile_status: "en_cours", profile_started_at: ago(200) })],
      events: [],
    });
    expect((await runWatchdog(db.client, { now })).actions).toHaveLength(1);
    expect((await runWatchdog(db.client, { now })).actions).toHaveLength(0);
  });

  it("surveille toutes les étapes longues d'avant l'envoi", () => {
    expect(WATCHED_STEPS.map((s) => s.key)).toEqual([
      "audit.discover",
      "audit.backlinks",
      "audit.profile",
      "audit.opportunities",
      "audit.deadlinks",
      "audit.analysis",
      "analysis.step",
      "collection",
      "qualification",
      "findings",
      "plan.triage",
      "plan.contacts",
      "plan.drafts",
      "public_audit",
    ]);
  });
});

describe("chien de garde : analyse unique (MU.1)", () => {
  const step = (over: Record<string, unknown>) => ({
    id: "s1",
    audit_id: "a1",
    workspace_id: "w1",
    key: "recherche",
    status: "en_cours",
    started_at: ago(40),
    updated_at: ago(20),
    ...over,
  });

  it("une étape d'analyse sans écriture depuis 15 minutes échoue, et son analyse avec elle", async () => {
    const db = fakeSupabase({
      analysis_steps: [step({})],
      audits: [audit({ analysis_status: "en_cours", analysis_confirmed_at: ago(5) })],
      events: [],
    });
    const report = await runWatchdog(db.client, { now });
    expect(report.actions.map((a) => `${a.step}:${a.action}`)).toEqual(["analysis.step:echoue"]);
    expect(db.tables.analysis_steps![0]).toMatchObject({
      status: "echoue",
      error_message: t.watchdog.stuck,
    });
    expect(db.tables.audits![0]).toMatchObject({
      analysis_status: "echoue",
      analysis_error: t.watchdog.stuck,
    });
  });

  it("une étape qui écrit régulièrement n'est jamais touchée", async () => {
    const db = fakeSupabase({
      analysis_steps: [step({ updated_at: ago(3) })],
      audits: [audit({ analysis_status: "en_cours", analysis_confirmed_at: ago(5) })],
      events: [],
    });
    expect((await runWatchdog(db.client, { now })).actions).toEqual([]);
    expect(db.tables.audits![0]!.analysis_status).toBe("en_cours");
  });

  it("l'état des lieux (étape parallèle) bloqué n'emporte pas l'analyse", async () => {
    const db = fakeSupabase({
      analysis_steps: [step({ key: "etat_des_lieux" })],
      audits: [audit({ analysis_status: "en_cours", analysis_confirmed_at: ago(5) })],
      events: [],
    });
    const report = await runWatchdog(db.client, { now });
    expect(report.actions).toHaveLength(1);
    expect(db.tables.analysis_steps![0]!.status).toBe("echoue");
    expect(db.tables.audits![0]!.analysis_status).toBe("en_cours");
  });

  it("une analyse « en cours » dont le job est mort depuis une heure échoue avec un message clair", async () => {
    const db = fakeSupabase({
      audits: [
        audit({
          analysis_status: "en_cours",
          analysis_confirmed_at: ago(90),
          analysis_started_at: ago(90),
        }),
      ],
      events: [],
    });
    const report = await runWatchdog(db.client, { now });
    expect(report.actions.map((a) => a.step)).toEqual(["audit.analysis"]);
    expect(db.tables.audits![0]).toMatchObject({
      analysis_status: "echoue",
      analysis_error: t.watchdog.stuck,
    });
  });
});
