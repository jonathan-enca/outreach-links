import { describe, expect, it } from "vitest";
import { buildPaymentDraft } from "@/features/inbox/payment";
import { buildReplyPrompt } from "@/features/inbox/reply-writer";
import { WRITER_SYSTEM, buildWriterPrompt } from "@/features/drafting/write";
import { counterpartSentence } from "@/features/signature/signature";
import {
  LOGO_MAX_BYTES,
  normalizeLinkedin,
  normalizePhone,
  parseLogo,
  parseMessageSettings,
} from "./messages";

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(40, 1),
]);
const dataUrl = (mime: string, b: Buffer) => `data:${mime};base64,${b.toString("base64")}`;

function form(v: Record<string, string>) {
  const fd = new FormData();
  for (const [k, x] of Object.entries(v)) fd.set(k, x);
  return fd;
}

describe("réglages « Vos messages » : lecture du formulaire", () => {
  it("accepte le minimum : prénom et rôle ; tout le reste est décoché", () => {
    const r = parseMessageSettings(form({ firstName: " Jo ", role: "equipe" }));
    expect(r).toEqual({
      ok: true,
      value: {
        firstName: "Jo",
        lastName: null,
        role: "equipe",
        showSite: false,
        linkedinUrl: null,
        phone: null,
        logo: "remove",
      },
    });
  });

  it("refuse un prénom vide, un rôle inconnu, un LinkedIn ou un téléphone invalides", () => {
    expect(parseMessageSettings(form({ firstName: "", role: "equipe" })).ok).toBe(false);
    expect(parseMessageSettings(form({ firstName: "Jo", role: "pdg" })).ok).toBe(false);
    expect(
      parseMessageSettings(
        form({ firstName: "Jo", role: "equipe", linkedin: "on", linkedinUrl: "monsite.fr/moi" }),
      ).ok,
    ).toBe(false);
    expect(
      parseMessageSettings(
        form({ firstName: "Jo", role: "equipe", phone: "on", phoneNumber: "appelez-moi" }),
      ).ok,
    ).toBe(false);
  });

  it("lit la signature complète et les contreparties cochées, dans un ordre stable", () => {
    const r = parseMessageSettings(
      form({
        firstName: "Jo",
        lastName: "Martin",
        role: "fondateur",
        showSite: "on",
        linkedin: "on",
        linkedinUrl: "www.linkedin.com/in/jo-martin/",
        phone: "on",
        phoneNumber: "06  12 34 56 78",
        logo: "on",
        logoData: dataUrl("image/png", PNG),
      }),
    );
    expect(r.ok && r.value).toMatchObject({
      lastName: "Martin",
      showSite: true,
      linkedinUrl: "https://www.linkedin.com/in/jo-martin",
      phone: "06 12 34 56 78",
      logo: { mime: "image/png" },
    });
  });

  it("logo coché sans nouvelle image : l'actuel est gardé ; décoché : il est retiré", () => {
    const keep = parseMessageSettings(form({ firstName: "Jo", role: "equipe", logo: "on" }));
    expect(keep.ok && keep.value.logo).toBe("keep");
    const off = parseMessageSettings(
      form({ firstName: "Jo", role: "equipe", logoData: dataUrl("image/png", PNG) }),
    );
    expect(off.ok && off.value.logo).toBe("remove");
  });
});

describe("logo, LinkedIn, téléphone", () => {
  it("n'accepte qu'un vrai PNG ou JPEG, léger", () => {
    expect(parseLogo(dataUrl("image/png", PNG))?.mime).toBe("image/png");
    expect(
      parseLogo(dataUrl("image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2])))?.mime,
    ).toBe("image/jpeg");
    // Type annoncé faux, SVG, trop lourd, pas une image.
    expect(parseLogo(dataUrl("image/jpeg", PNG))).toBeNull();
    expect(parseLogo("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBeNull();
    expect(
      parseLogo(dataUrl("image/png", Buffer.concat([PNG, Buffer.alloc(LOGO_MAX_BYTES)]))),
    ).toBeNull();
    expect(parseLogo("bonjour")).toBeNull();
  });

  it("normalise l'adresse LinkedIn et refuse tout autre site", () => {
    expect(normalizeLinkedin("linkedin.com/in/jo")).toBe("https://linkedin.com/in/jo");
    expect(normalizeLinkedin("https://fr.linkedin.com/in/jo/")).toBe(
      "https://fr.linkedin.com/in/jo",
    );
    expect(normalizeLinkedin("https://linkedin.com.pirate.fr/in/jo")).toBeNull();
    expect(normalizeLinkedin("linkedin.com/")).toBeNull();
  });

  it("garde un numéro lisible", () => {
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33 6 12 34 56 78");
    expect(normalizePhone("123")).toBeNull();
  });
});

describe("contreparties : seulement dans les réponses", () => {
  it("le premier message ne cite plus d'offre et ne propose rien en échange", () => {
    expect(WRITER_SYSTEM).not.toContain("actif offert");
    expect(WRITER_SYSTEM).toContain("Rien en échange");
    const prompt = buildWriterPrompt(
      {
        planItemId: "pi",
        channel: "email",
        domain: "cible.fr",
        pageTitle: "Titre",
        pageUrl: "https://cible.fr/page",
        hook: "une citation",
        type: "ressource",
        targetPageUrl: "https://monsite.fr/guide",
        anchorText: null,
        offer: "des coloriages gratuits",
        brief: null,
      } as never,
      {
        siteDomain: "monsite.fr",
        niche: "coloriages",
        language: "fr",
        offeredAsset: "des coloriages gratuits",
        signatureFirstName: "Jo",
      } as never,
      {
        url: "https://cible.fr/page",
        title: "Titre",
        description: "",
        text: "Texte.",
        moved: false,
      },
      [{ url: "https://monsite.fr/guide", title: "Guide", description: "", text: "Le guide." }],
    );
    expect(prompt).not.toContain("actif_offert");
    expect(prompt).not.toContain("coloriages gratuits");
  });

  it("la réponse à une demande d'argent propose ce qui est coché, sinon une simple ressource", () => {
    const ctx = { signatureFirstName: "Jo", targetUrl: "https://monsite.fr/guide" };
    const withList = buildPaymentDraft("echanger", {
      ...ctx,
      counterpartSentence: counterpartSentence(["article", "partage"]),
    });
    expect(withList.body).toContain(
      "partager votre page auprès de nos lecteurs ou écrire un article original pour votre site",
    );
    expect(withList.body).not.toContain("lien vers votre site");
    const none = buildPaymentDraft("echanger", { ...ctx, counterpartSentence: null });
    expect(none.body).toContain("une ressource que vos lecteurs pourraient utiliser");
    expect(none.body).not.toContain("contribution");
    expect(none.body.trimEnd().endsWith("Jo")).toBe(true);
  });

  it("le rédacteur de réponses reçoit la liste des contreparties acceptées", () => {
    const p = buildReplyPrompt({
      signatureFirstName: "Jo",
      siteDomain: "monsite.fr",
      ourMessage: "Bonjour",
      theirMessage: "Un échange de liens ?",
      theirSubject: null,
      category: "demande_echange",
      allowedUrls: [],
      counterparts: ["écrire un article original pour votre site"],
    });
    expect(p).toContain('"contreparties_acceptees":["écrire un article original pour votre site"]');
  });
});
