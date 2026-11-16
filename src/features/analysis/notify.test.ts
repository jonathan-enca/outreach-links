import { describe, expect, it, vi } from "vitest";
import { buildReadyEmail, notifyAnalysisReady, type ReadyEmail } from "./notify";

const run = {
  auditId: "a1",
  workspaceId: "w1",
  siteId: "s1",
  domain: "exemple.test",
  actorId: "u1",
};

/** Faux client Supabase : un journal d'événements et un annuaire d'utilisateurs en mémoire. */
function fakeService(opts: { email?: string | null; already?: boolean } = {}) {
  const inserted: unknown[] = [];
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "contains"]) builder[m] = () => builder;
  builder.limit = async () => ({ data: opts.already ? [{ id: 1 }] : [] });
  builder.insert = async (row: unknown) => {
    inserted.push(row);
    return { error: null };
  };
  const service = {
    from: () => builder,
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: opts.email === null ? null : { email: opts.email ?? "moi@exemple.test" } },
        }),
      },
    },
  };
  return { service: service as never, inserted };
}

describe("buildReadyEmail", () => {
  it("lien vers les cibles, sans montant ni mention d'IA", () => {
    const m = buildReadyEmail({
      to: "a@b.test",
      domain: "exemple.test",
      shortlist: 22,
      url: "https://app.test/app/site/s1/cibles",
    });
    expect(m.subject).toBe("22 cibles sont prêtes pour exemple.test");
    expect(m.text).toContain("https://app.test/app/site/s1/cibles");
    expect(m.html).toContain('href="https://app.test/app/site/s1/cibles"');
    expect(`${m.subject}${m.text}${m.html}`).not.toMatch(
      /\$|USD|dollar|\bIA\b|intelligence artificielle/i,
    );
  });
  it("échappe le domaine dans le HTML ; 0 et 1 cible bien accordés", () => {
    const m = buildReadyEmail({
      to: "a@b.test",
      domain: "<b>x</b>",
      shortlist: 1,
      url: "https://a.test/?a=1&b=2",
    });
    expect(m.html).not.toContain("<b>x</b>");
    expect(m.html).toContain("&amp;b=2");
    expect(
      buildReadyEmail({ to: "a@b.test", domain: "d.test", shortlist: 0, url: "https://a.test" })
        .subject,
    ).toBe("Votre analyse de d.test est terminée");
  });
});

describe("notifyAnalysisReady", () => {
  it("envoie une fois et le journalise sans l'adresse", async () => {
    const { service, inserted } = fakeService();
    const send = vi.fn(async (email: ReadyEmail) => void email);
    expect(await notifyAnalysisReady(service, run, 22, send)).toBe("envoye");
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]![0].to).toBe("moi@exemple.test");
    expect(JSON.stringify(inserted)).not.toContain("moi@exemple.test");
    expect(inserted[0]).toMatchObject({ type: "analysis.email_sent" });
  });
  it("sans service d'email : rien n'est envoyé, sans erreur", async () => {
    expect(await notifyAnalysisReady(fakeService().service, run, 5, null)).toBe("sans_service");
  });
  it("déjà envoyé : pas de doublon", async () => {
    const send = vi.fn(async () => {});
    expect(await notifyAnalysisReady(fakeService({ already: true }).service, run, 5, send)).toBe(
      "deja",
    );
    expect(send).not.toHaveBeenCalled();
  });
  it("sans adresse ou service en panne : ne lève jamais", async () => {
    expect(
      await notifyAnalysisReady(fakeService({ email: null }).service, run, 5, async () => {}),
    ).toBe("sans_adresse");
    const { service, inserted } = fakeService();
    expect(
      await notifyAnalysisReady(service, run, 5, async () => {
        throw new Error("Resend 500");
      }),
    ).toBe("echec");
    // Aucun email_sent, mais la cause est tracée (sans adresse).
    expect(inserted.map((e) => (e as { type: string }).type)).toEqual(["analysis.email_error"]);
    expect(JSON.stringify(inserted)).not.toContain("@");
  });
});

describe("diagnostic d'un refus de Resend", () => {
  it("garde le nom de l'erreur, jamais le message (il peut contenir une adresse)", async () => {
    const { resendErrorName } = await import("./notify");
    const res = (body: string) => ({ text: async () => body });
    expect(
      await resendErrorName(
        res('{"statusCode":401,"name":"restricted_api_key","message":"clé limitée, a@b.fr"}'),
      ),
    ).toBe(" restricted_api_key");
    expect(await resendErrorName(res("pas du json"))).toBe("");
    expect(await resendErrorName(res('{"name":"<script>"}'))).toBe("");
  });
});
