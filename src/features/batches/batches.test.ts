import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { t } from "@/lib/messages";
import { BATCH_LIMITS, clampBatchSize } from "./limits";
import { batchSummary } from "./batches-section";
import { pickEligible, type Candidate } from "./select";
import { createBatch, editDraft, removeFromBatch, validateBatch } from "./service";

const PLAN = "33333333-3333-4333-8333-333333333333";
const AUDIT = "11111111-1111-4111-8111-111111111111";
const URL_OK = "https://mega-coloring.com/coloriage-licorne";
const GOOD_BODY = `Bonjour,

J'ai lu votre page "Nos ressources pour occuper les enfants à la maison" et je pense que notre coloriage licorne à imprimer pourrait plaire à vos lecteurs : ${URL_OK}
Seriez-vous d'accord pour l'ajouter à votre liste ?

Jonathan`;

const cand = (over: Partial<Candidate> = {}): Candidate => ({
  draftId: "d1",
  position: 1,
  channel: "email",
  ready: true,
  status: "brouillon",
  sendable: true,
  ...over,
});

describe("lots : sélection et taille", () => {
  it("borne la taille du lot", () => {
    expect(clampBatchSize("abc")).toBe(BATCH_LIMITS.defaultSize);
    expect(clampBatchSize(0)).toBe(BATCH_LIMITS.minSize);
    expect(clampBatchSize(9999)).toBe(BATCH_LIMITS.maxSize);
    expect(clampBatchSize("7")).toBe(7);
  });

  it("ne retient que les emails prêts et vérifiés, plus les formulaires prêts, hors lot, dans l'ordre du plan", () => {
    const picked = pickEligible(
      [
        cand({ draftId: "a", position: 3 }),
        cand({ draftId: "b", position: 1 }),
        cand({ draftId: "formulaire", channel: "formulaire", position: 9, sendable: false }),
        cand({ draftId: "pas-pret", ready: false }),
        cand({ draftId: "non-verifie", sendable: false }),
        cand({ draftId: "deja-valide", status: "valide" }),
        cand({ draftId: "deja-lot" }),
        cand({ draftId: "c", position: 2 }),
      ],
      new Set(["deja-lot"]),
      4,
    );
    expect(picked.map((p) => p.draftId)).toEqual(["b", "c", "a", "formulaire"]);
  });

  it("un lot n'est validable que si tous ses messages sont prêts", () => {
    const item = (ready: boolean) => ({ ready }) as never;
    expect(batchSummary({ items: [] }).canValidate).toBe(false);
    expect(batchSummary({ items: [item(true), item(false)] }).canValidate).toBe(false);
    expect(batchSummary({ items: [item(true), item(true)] }).canValidate).toBe(true);
  });
});

describe("lots : service", () => {
  const base = (extra: Record<string, Record<string, unknown>[]> = {}) =>
    fakeSupabase({
      link_plans: [{ id: PLAN, audit_id: AUDIT, workspace_id: "w", version: 1 }],
      target_drafts: [
        {
          id: "d1",
          plan_id: PLAN,
          plan_item_id: "i1",
          channel: "email",
          ready: true,
          status: "brouillon",
          subject: "Une ressource pour votre page",
          body: GOOD_BODY,
          hook: "Nos ressources pour occuper les enfants à la maison",
          proposed_url: URL_OK,
          url_status: 200,
        },
        {
          id: "d2",
          plan_id: PLAN,
          plan_item_id: "i2",
          channel: "email",
          ready: true,
          status: "brouillon",
          subject: "s",
          body: GOOD_BODY,
          hook: "h",
          proposed_url: URL_OK,
          url_status: 200,
        },
      ],
      target_contacts: [
        { plan_id: PLAN, plan_item_id: "i1", sendable: true },
        { plan_id: PLAN, plan_item_id: "i2", sendable: false },
      ],
      batches: [],
      batch_items: [],
      audits: [{ id: AUDIT, site_id: "s1" }],
      sites: [{ id: "s1", signature_first_name: "Jonathan" }],
      events: [],
      ...extra,
    });

  it("crée un lot avec les seuls messages vérifiés et journalise la décision", async () => {
    const db = base();
    const r = await createBatch(db.client as never, AUDIT, 10, () => db.client as never);
    expect(r.status).toBe("ok");
    expect(db.tables.batches).toHaveLength(1);
    expect(db.tables.batch_items.map((i) => i.draft_id)).toEqual(["d1"]);
    expect(db.tables.events.map((e) => e.type)).toEqual(["batch.created"]);
    // Un seul lot en préparation à la fois.
    const again = await createBatch(db.client as never, AUDIT, 10, () => db.client as never);
    expect(again).toMatchObject({ status: "error", message: t.batches.messages.openExists });
  });

  it("refuse de créer un lot sans message admissible", async () => {
    const db = base({ target_contacts: [] });
    const r = await createBatch(db.client as never, AUDIT, 10, () => db.client as never);
    expect(r.message).toBe(t.batches.messages.nothingEligible);
    expect(db.tables.batches).toHaveLength(0);
  });

  it("modification : relue par le linter, jamais « prête » si elle échoue", async () => {
    const db = base({
      batches: [{ id: "b1", plan_id: PLAN, workspace_id: "w", number: 1, status: "brouillon" }],
      batch_items: [{ batch_id: "b1", draft_id: "d1" }],
    });
    const svc = () => db.client as never;
    const bad = await editDraft(
      db.client as never,
      AUDIT,
      "b1",
      "d1",
      { subject: "Sujet correct", body: "Achetez avec notre IA, résultat garanti ! Jonathan" },
      svc,
    );
    expect(bad.message).toBe(t.batches.messages.savedNotReady);
    const row = db.tables.target_drafts.find((d) => d.id === "d1")!;
    expect(row.ready).toBe(false);
    expect(row.edited_by_user).toBe(true);
    const good = await editDraft(
      db.client as never,
      AUDIT,
      "b1",
      "d1",
      { subject: "Une ressource pour votre page", body: GOOD_BODY },
      svc,
    );
    expect(good.message).toBe(t.batches.messages.savedReady);
    expect(db.tables.target_drafts.find((d) => d.id === "d1")!.ready).toBe(true);
  });

  it("un lot validé ne se modifie plus côté service", async () => {
    const db = base({
      batches: [{ id: "b1", plan_id: PLAN, workspace_id: "w", number: 1, status: "valide" }],
      batch_items: [{ batch_id: "b1", draft_id: "d1" }],
    });
    const svc = () => db.client as never;
    const e = await editDraft(
      db.client as never,
      AUDIT,
      "b1",
      "d1",
      { subject: "s", body: GOOD_BODY },
      svc,
    );
    expect(e.message).toBe(t.batches.messages.locked);
    const r = await removeFromBatch(db.client as never, AUDIT, "b1", "d1", svc);
    expect(r.message).toBe(t.batches.messages.locked);
    expect(db.tables.batch_items).toHaveLength(1);
  });

  it("retire un message d'un lot en préparation", async () => {
    const db = base({
      batches: [{ id: "b1", plan_id: PLAN, workspace_id: "w", number: 1, status: "brouillon" }],
      batch_items: [{ batch_id: "b1", draft_id: "d1" }],
    });
    const r = await removeFromBatch(
      db.client as never,
      AUDIT,
      "b1",
      "d1",
      () => db.client as never,
    );
    expect(r.status).toBe("ok");
    expect(db.tables.batch_items).toHaveLength(0);
    expect(db.tables.events.map((e) => e.type)).toEqual(["batch.draft_removed"]);
  });

  it("validation : journalisée ; message clair si la base refuse", async () => {
    const db = base({
      batches: [{ id: "b1", plan_id: PLAN, workspace_id: "w", number: 1, status: "brouillon" }],
    });
    const ok = await validateBatch(db.client as never, AUDIT, "b1", () => db.client as never);
    expect(ok.message).toBe(t.batches.messages.validated);
    expect(db.tables.batches[0]!.status).toBe("valide");
    expect(db.tables.events.map((e) => e.type)).toEqual(["batch.validated"]);
    const again = await validateBatch(db.client as never, AUDIT, "b1", () => db.client as never);
    expect(again.message).toBe(t.batches.messages.alreadyValidated);
  });
});
