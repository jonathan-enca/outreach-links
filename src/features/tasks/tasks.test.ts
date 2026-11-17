import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { lintMessage } from "@/features/drafting/lint";
import { buildFollowUpMessage } from "./followup-message";
import {
  cancelFollowUp,
  completeFollowUp,
  completeTask,
  countDueTasks,
  listTasks,
  skipTask,
} from "./service";
import { groupTasks, reminderText, taskState, type TaskView } from "./view";

const NOW = new Date("2026-11-26T10:00:00Z");
const URL_ = "https://alice-site.fr/guide";

function world(over: Record<string, unknown> = {}, batchStatus = "valide") {
  return fakeSupabase({
    manual_tasks: [
      {
        id: "t1",
        plan_item_id: "i1",
        plan_id: "p1",
        workspace_id: "w1",
        form_url: "https://mairie.fr/contact",
        status: "a_faire",
        follow_up_status: null,
        created_at: "2026-11-20",
        ...over,
      },
    ],
    link_plan_items: [
      { id: "i1", plan_id: "p1", source_domain: "mairie.fr", target_page_url: URL_ },
    ],
    link_plans: [{ id: "p1", site_id: "s1" }],
    sites: [{ id: "s1", signature_first_name: "Alice" }],
    target_drafts: [
      { id: "d1", plan_item_id: "i1", body: "Bonjour", status: "valide", proposed_url: URL_ },
    ],
    batch_items: [{ draft_id: "d1", batch_id: "b1" }],
    batches: [{ id: "b1", status: batchStatus }],
  });
}

describe("taskState / groupTasks", () => {
  const base: Pick<TaskView, "status" | "followUpStatus" | "followUpDueAt"> = {
    status: "a_faire",
    followUpStatus: null,
    followUpDueAt: null,
  };
  it("couvre tous les états", () => {
    expect(taskState(base, NOW)).toBe("a_faire");
    expect(taskState({ ...base, status: "ignoree" }, NOW)).toBe("ignoree");
    const done = { status: "fait", followUpStatus: "en_attente" };
    expect(taskState({ ...done, followUpDueAt: "2026-12-01T00:00:00Z" }, NOW)).toBe(
      "attente_relance",
    );
    expect(taskState({ ...done, followUpDueAt: "2026-11-25T00:00:00Z" }, NOW)).toBe("relance_due");
    expect(taskState({ status: "fait", followUpStatus: "fait", followUpDueAt: null }, NOW)).toBe(
      "relance_faite",
    );
    expect(taskState({ status: "fait", followUpStatus: "annulee", followUpDueAt: null }, NOW)).toBe(
      "relance_annulee",
    );
  });
  it("rappel lisible", () => {
    expect(reminderText({ toDo: 0, followUps: 0 })).toMatch(/Aucune/);
    expect(reminderText({ toDo: 2, followUps: 1 })).toBe(
      "2 tâche(s) à faire · 1 relance(s) à faire",
    );
    expect(groupTasks([], NOW).toDo).toEqual([]);
  });
});

describe("message de relance", () => {
  it("passe le linter, garde l'URL exacte et la signature, sans mention de l'IA", () => {
    const body = buildFollowUpMessage({ url: URL_, firstName: "Alice" });
    expect(body).toContain(URL_);
    expect(body.trim().endsWith("Alice")).toBe(true);
    const issues = lintMessage({
      channel: "formulaire",
      subject: null,
      body,
      proposedUrl: URL_,
      signatureFirstName: "Alice",
    });
    expect(issues).toEqual([]);
  });
});

describe("listTasks", () => {
  it("ne montre que les tâches dont le message est dans un lot validé", async () => {
    const { client } = world();
    const rows = await listTasks(client);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ domain: "mairie.fr", message: "Bonjour", status: "a_faire" });
    const hidden = world({}, "brouillon");
    expect(await listTasks(hidden.client)).toEqual([]);
  });
  it("compte les tâches à faire et les relances dues", async () => {
    const w = world({
      status: "fait",
      done_at: "2026-11-10",
      follow_up_status: "en_attente",
      follow_up_due_at: "2026-11-20T00:00:00Z",
    });
    expect(await countDueTasks(w.client, NOW)).toEqual({ toDo: 0, followUps: 1 });
    expect(await countDueTasks(world().client, NOW)).toEqual({ toDo: 1, followUps: 0 });
  });
});

describe("completeTask", () => {
  it("marque faite, planifie la relance à J+10 et prépare son message", async () => {
    const w = world();
    const r = await completeTask(
      w.client,
      () => w.client,
      "t1",
      () => NOW,
    );
    expect(r.status).toBe("ok");
    const t1 = w.tables.manual_tasks![0]!;
    expect(t1.status).toBe("fait");
    expect(t1.follow_up_status).toBe("en_attente");
    expect(t1.follow_up_due_at).toBe("2026-12-06T10:00:00.000Z");
    expect(String(t1.follow_up_message)).toContain(URL_);
    expect(String(t1.follow_up_message).trim().endsWith("Alice")).toBe(true);
    expect(w.tables.events!.map((e) => e.type)).toEqual(["task.done"]);
  });
  it("refuse une tâche déjà faite, inconnue ou sans session", async () => {
    const w = world({ status: "fait", done_at: "x" });
    expect((await completeTask(w.client, () => w.client, "t1")).status).toBe("error");
    expect((await completeTask(w.client, () => w.client, "inconnue")).status).toBe("error");
    const anon = fakeSupabase({}, { userId: null });
    expect((await completeTask(anon.client, () => anon.client, "t1")).status).toBe("error");
  });
});

describe("relance d'un formulaire", () => {
  const doneTask = (due: string) =>
    world({
      status: "fait",
      done_at: "2026-11-10",
      follow_up_status: "en_attente",
      follow_up_due_at: due,
      follow_up_message: "relance",
    });
  it("refusée avant l'échéance, acceptée ensuite", async () => {
    const early = doneTask("2026-12-06T00:00:00Z");
    expect(
      (
        await completeFollowUp(
          early.client,
          () => early.client,
          "t1",
          () => NOW,
        )
      ).status,
    ).toBe("error");
    const due = doneTask("2026-11-20T00:00:00Z");
    const r = await completeFollowUp(
      due.client,
      () => due.client,
      "t1",
      () => NOW,
    );
    expect(r.status).toBe("ok");
    expect(due.tables.manual_tasks![0]).toMatchObject({ follow_up_status: "fait" });
  });
  it("une réponse annule la relance ; motif invalide refusé", async () => {
    const w = doneTask("2026-11-20T00:00:00Z");
    expect((await cancelFollowUp(w.client, () => w.client, "t1", "n'importe quoi")).status).toBe(
      "error",
    );
    expect((await cancelFollowUp(w.client, () => w.client, "t1", "reponse")).status).toBe("ok");
    expect(w.tables.manual_tasks![0]).toMatchObject({
      follow_up_status: "annulee",
      follow_up_cancel_reason: "reponse",
    });
    // une relance annulée ne peut plus être faite
    expect(
      (
        await completeFollowUp(
          w.client,
          () => w.client,
          "t1",
          () => NOW,
        )
      ).status,
    ).toBe("error");
  });
});

describe("skipTask", () => {
  it("ignore une tâche à faire, pas une tâche faite", async () => {
    const w = world();
    expect((await skipTask(w.client, () => w.client, "t1")).status).toBe("ok");
    expect(w.tables.manual_tasks![0]!.status).toBe("ignoree");
    expect((await skipTask(w.client, () => w.client, "t1")).status).toBe("error");
  });
});
