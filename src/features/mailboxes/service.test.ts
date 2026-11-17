import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { parseKeyRing, decryptSecret } from "./crypto";
import {
  connectMailbox,
  removeMailbox,
  testMailbox,
  updateSendSchedule,
  type MailboxDeps,
} from "./service";

const ring = parseKeyRing(`v1:${Buffer.alloc(32, 7).toString("base64")}`);
const form = (over: Record<string, string> = {}) => {
  const fd = new FormData();
  const v = {
    email: "jo@alice-site.fr",
    fromName: "Jo",
    username: "jo",
    password: "secret-d-app",
    smtpHost: "smtp.alice-site.fr",
    smtpPort: "587",
    imapHost: "imap.alice-site.fr",
    imapPort: "993",
    ...over,
  };
  for (const [k, x] of Object.entries(v)) fd.set(k, x);
  return fd;
};

function setup(realSending = false, smtpOk = true) {
  const f = fakeSupabase({ sites: [{ id: "s1", workspace_id: "w1" }] }, { userId: "u1" });
  const sendSmtp = vi.fn(async () => ({ ok: true }) as const);
  const deps: MailboxDeps = {
    getServiceClient: () => f.client,
    keyRing: () => ring,
    realSendingAllowed: () => realSending,
    transport: {
      verifySmtp: async () => (smtpOk ? { ok: true } : { ok: false, error: "auth refusée" }),
      verifyImap: async () => ({ ok: true }),
      sendSmtp,
    },
    health: async () => ({
      domain: "alice-site.fr",
      spf: true,
      dkim: false,
      dmarc: true,
      checkedAt: "x",
    }),
  };
  return { f, deps, sendSmtp };
}

describe("service boîte d'envoi", () => {
  it("enregistre le mot de passe chiffré, jamais en clair", async () => {
    const { f, deps } = setup();
    const r = await connectMailbox(f.client, "s1", form(), deps);
    expect(r.status).toBe("ok");
    const row = f.tables.mailboxes![0]!;
    expect(JSON.stringify(row)).not.toContain("secret-d-app");
    expect(decryptSecret(String(row.password_enc), ring)).toBe("secret-d-app");
    expect(JSON.stringify(f.log)).not.toContain("secret-d-app");
  });

  it("refuse sans clé de chiffrement, sans connexion, avec un formulaire invalide", async () => {
    const { f, deps } = setup();
    const noKey = { ...deps, keyRing: () => parseKeyRing(undefined) };
    expect((await connectMailbox(f.client, "s1", form(), noKey)).status).toBe("error");
    expect((await connectMailbox(f.client, "s1", form({ smtpPort: "22" }), deps)).status).toBe(
      "error",
    );
    expect(f.tables.mailboxes ?? []).toHaveLength(0);
    const anon = fakeSupabase({ sites: [{ id: "s1", workspace_id: "w1" }] }, { userId: null });
    expect((await connectMailbox(anon.client, "s1", form(), deps)).status).toBe("error");
  });

  it("test en simulation : vérifie, n'envoie rien, enregistre la santé", async () => {
    const { f, deps, sendSmtp } = setup(false);
    await connectMailbox(f.client, "s1", form(), deps);
    const id = String(f.tables.mailboxes![0]!.id);
    const r = await testMailbox(f.client, id, deps);
    expect(r).toMatchObject({ status: "ok" });
    expect(r.message).toMatch(/simulation/);
    expect(sendSmtp).not.toHaveBeenCalled();
    expect(f.tables.mailboxes![0]).toMatchObject({
      status: "verifiee",
      smtp_ok: true,
      imap_ok: true,
    });
    expect(f.tables.mailboxes![0]!.health).toMatchObject({ spf: true, dkim: false });
  });

  it("envoi réel autorisé : le message de test ne va qu'à l'utilisateur", async () => {
    const { f, deps, sendSmtp } = setup(true);
    f.client.auth.getUser = async () =>
      ({ data: { user: { id: "u1", email: "moi@perso.fr" } }, error: null }) as never;
    await connectMailbox(f.client, "s1", form(), deps);
    const r = await testMailbox(f.client, String(f.tables.mailboxes![0]!.id), deps);
    expect(r.status).toBe("ok");
    expect(sendSmtp).toHaveBeenCalledTimes(1);
    expect((sendSmtp.mock.calls[0] as unknown[])[2]).toMatchObject({ to: "moi@perso.fr" });
  });

  it("échec SMTP : statut erreur, jamais « vérifiée »", async () => {
    const { f, deps } = setup(false, false);
    await connectMailbox(f.client, "s1", form(), deps);
    const r = await testMailbox(f.client, String(f.tables.mailboxes![0]!.id), deps);
    expect(r.status).toBe("error");
    expect(f.tables.mailboxes![0]).toMatchObject({ status: "erreur", smtp_ok: false });
  });

  it("clé changée : message clair, aucune connexion tentée", async () => {
    const { f, deps } = setup();
    await connectMailbox(f.client, "s1", form(), deps);
    const other = {
      ...deps,
      keyRing: () => parseKeyRing(`v9:${Buffer.alloc(32, 9).toString("base64")}`),
    };
    const r = await testMailbox(f.client, String(f.tables.mailboxes![0]!.id), other);
    expect(r.status).toBe("error");
  });

  it("suppression", async () => {
    const { f, deps } = setup();
    await connectMailbox(f.client, "s1", form(), deps);
    const r = await removeMailbox(f.client, String(f.tables.mailboxes![0]!.id), deps);
    expect(r.status).toBe("ok");
    expect(f.tables.mailboxes).toHaveLength(0);
  });
  it("horaires d'envoi : enregistre les jours et heures choisis, refuse un réglage incohérent", async () => {
    const { f, deps } = setup();
    await connectMailbox(f.client, "s1", form(), deps);
    const id = String(f.tables.mailboxes![0]!.id);
    const schedule = (days: string[], start: string, end: string) => {
      const fd = new FormData();
      for (const d of days) fd.append("days", d);
      fd.set("startHour", start);
      fd.set("endHour", end);
      return fd;
    };
    const ok = await updateSendSchedule(f.client, id, schedule(["6", "2", "2"], "8", "20"), deps);
    expect(ok.status).toBe("ok");
    expect(f.tables.mailboxes![0]).toMatchObject({
      send_days: [2, 6],
      send_window_start: 8,
      send_window_end: 20,
    });
    // Aucun jour, heures inversées, jour inconnu : rien n'est écrit.
    for (const bad of [
      schedule([], "9", "18"),
      schedule(["1"], "18", "9"),
      schedule(["8"], "9", "18"),
    ]) {
      expect((await updateSendSchedule(f.client, id, bad, deps)).status).toBe("error");
    }
    expect(f.tables.mailboxes![0]).toMatchObject({ send_days: [2, 6], send_window_start: 8 });
    expect(
      (await updateSendSchedule(f.client, "inconnue", schedule(["1"], "9", "18"), deps)).status,
    ).toBe("error");
  });
});
