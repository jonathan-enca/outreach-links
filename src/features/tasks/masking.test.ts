import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { contactsLockedMessage, exportLockedMessage } from "@/features/billing/entitlements";
import { contactOf } from "@/features/targets/service";
import { completeTask, listTasks } from "./service";

/** MO.2 : une tâche masquée (offre sans contacts visibles) n'expose ni lien ni message, et se refuse. */
function world(masked: boolean) {
  return fakeSupabase({
    manual_tasks: [
      {
        id: "t1",
        plan_item_id: "i1",
        plan_id: "p1",
        workspace_id: "w1",
        form_url: masked ? null : "https://mairie.fr/contact",
        status: "a_faire",
        follow_up_status: null,
        created_at: "2026-11-20",
        masked,
      },
    ],
    link_plan_items: [
      { id: "i1", plan_id: "p1", source_domain: "mairie.fr", target_page_url: "https://a.fr/" },
    ],
    link_plans: [{ id: "p1", site_id: "s1" }],
    sites: [{ id: "s1", signature_first_name: "Alice" }],
    target_drafts: [{ id: "d1", plan_item_id: "i1", body: "Bonjour", status: "valide" }],
    batch_items: [{ draft_id: "d1", batch_id: "b1" }],
    batches: [{ id: "b1", status: "valide" }],
  });
}

describe("tâches manuelles masquées", () => {
  it("la liste n'expose rien d'une tâche masquée", async () => {
    expect(await listTasks(world(true).client)).toEqual([]);
  });
  it("un abonné voit sa tâche", async () => {
    const rows = await listTasks(world(false).client);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.formUrl).toBe("https://mairie.fr/contact");
  });
  it("marquer faite une tâche masquée est refusé, avec l'offre qui débloque", async () => {
    const w = world(true);
    const res = await completeTask(w.client, () => w.client, "t1");
    expect(res).toMatchObject({ status: "error", message: contactsLockedMessage() });
    expect(contactsLockedMessage()).toMatch(/Starter/);
    expect(w.tables.manual_tasks![0]!.status).toBe("a_faire");
  });
});

describe("cibles masquées et refus d'export", () => {
  const base = { contact_url: null, form_url: null, contact_email: null };
  it("l'état reste connu, jamais l'adresse ni le lien", () => {
    expect(contactOf({ ...base, contact_status: "email_verifie", contact_masked: true })).toEqual({
      kind: "email",
      verified: true,
      email: null,
      url: null,
      hidden: true,
    });
    expect(
      contactOf({ ...base, contact_status: "formulaire", contact_masked: true }),
    ).toMatchObject({
      kind: "formulaire",
      url: null,
      hidden: true,
    });
    expect(contactOf({ ...base, contact_status: null, contact_masked: true }).kind).toBe("aucun");
  });
  it("l'export refusé nomme l'offre", () => {
    expect(exportLockedMessage()).toMatch(/Starter/);
  });
});
