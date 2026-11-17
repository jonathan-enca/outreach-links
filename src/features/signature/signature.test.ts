import { describe, expect, it } from "vitest";
import {
  applySignature,
  counterpartSentence,
  renderHtml,
  signatureFromSite,
  signatureText,
  splitSignoff,
  type Signature,
} from "./signature";

const base: Signature = {
  firstName: "Jonathan",
  lastName: null,
  role: "fondateur",
  domain: "monsite.fr",
  showSite: true,
  linkedinUrl: null,
  phone: null,
  logoUrl: null,
};

describe("signature : composition", () => {
  it("lit les réglages du site, et rien sans prénom", () => {
    const row = {
      domain: "monsite.fr",
      founder_role: "equipe",
      signature_first_name: " Léa ",
      signature_last_name: "Martin",
      signature_show_site: false,
      signature_linkedin_url: "https://www.linkedin.com/in/lea/",
      signature_phone: null,
      signature_logo_token: "a".repeat(32),
    };
    const s = signatureFromSite(row, "https://app.exemple.fr/")!;
    expect(s.firstName).toBe("Léa");
    expect(s.logoUrl).toBe(`https://app.exemple.fr/api/logo/${"a".repeat(32)}`);
    expect(signatureText(s)).toBe(
      "Léa Martin\nÉquipe de monsite.fr\nhttps://www.linkedin.com/in/lea/",
    );
    expect(signatureFromSite({ ...row, signature_first_name: " " }, "https://a.fr")).toBeNull();
  });

  it("n'écrit un rôle que s'il a été déclaré", () => {
    expect(signatureText({ ...base, role: null })).toBe("Jonathan\nhttps://monsite.fr");
    expect(signatureText({ ...base, showSite: false, phone: "06 00 00 00 00" })).toBe(
      "Jonathan\nFondateur de monsite.fr\n06 00 00 00 00",
    );
  });
});

describe("signature : remplacement du prénom final", () => {
  it("remplace le prénom seul sur la dernière ligne", () => {
    const body = "Bonjour,\n\nVotre page cite une ressource.\n\nJonathan";
    expect(applySignature(body, base)).toBe(
      "Bonjour,\n\nVotre page cite une ressource.\n\nJonathan\nFondateur de monsite.fr\nhttps://monsite.fr",
    );
  });

  it("garde la formule de politesse collée au nom", () => {
    const body = "Bonjour,\n\nMerci.\n\nCordialement,\nJonathan";
    expect(applySignature(body, base)).toBe(
      "Bonjour,\n\nMerci.\n\nCordialement,\nJonathan\nFondateur de monsite.fr\nhttps://monsite.fr",
    );
  });

  it("remplace aussi un ancien prénom, quand il a changé après la rédaction", () => {
    const body = "Bonjour,\n\nVotre page cite une ressource.\n\nJon";
    expect(applySignature(body, { ...base, lastName: "Martin" })).toContain(
      "ressource.\n\nJonathan Martin\n",
    );
    expect(applySignature(body, base)).not.toContain("\nJon\n");
  });

  it("ne prend pas une formule de fin ni une phrase pour un prénom", () => {
    expect(splitSignoff("Bonjour,\n\nMerci.\n\nCordialement", base).found).toBe(false);
    expect(splitSignoff("Bonjour,\n\nMerci pour votre retour.", base).found).toBe(false);
    expect(applySignature("Bonjour,\n\nMerci pour votre retour.", base)).toBe(
      "Bonjour,\n\nMerci pour votre retour.\n\nJonathan\nFondateur de monsite.fr\nhttps://monsite.fr",
    );
  });

  it("ne touche à rien sans signature", () => {
    expect(applySignature("Bonjour,\n\nJonathan", null)).toBe("Bonjour,\n\nJonathan");
  });
});

describe("signature : version HTML", () => {
  const s: Signature = { ...base, logoUrl: "https://app.exemple.fr/api/logo/abc" };
  const text = `${applySignature("Bonjour,\n\nVoir https://monsite.fr/guide.\n\nJonathan", s)}\n\n--\nRépondez « stop ».`;

  it("pose le logo et les liens, et échappe le texte", () => {
    const html = renderHtml(text, s);
    expect(html).toContain('<img src="https://app.exemple.fr/api/logo/abc"');
    expect(html).toContain('<a href="https://monsite.fr/guide">https://monsite.fr/guide</a>.');
    expect(html).toContain('<a href="https://monsite.fr">monsite.fr</a>');
    expect(html).toContain("<strong>Jonathan</strong>");
    expect(html).toContain("Répondez « stop ».");
    expect(renderHtml("a <b> & c", s)).toContain("a &lt;b&gt; &amp; c");
  });

  it("ne remplace pas la signature citée dans une relance", () => {
    const quoted = text
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    const relance = `Bonjour,\n\nJe reviens vers vous.\n\n${signatureText(s)}\n\nLe 3 mai, j'écrivais :\n${quoted}`;
    const html = renderHtml(relance, s);
    expect(html.match(/<img /g)?.length).toBe(1);
    expect(html).toContain("&gt; Jonathan");
  });
});

describe("contreparties", () => {
  it("compose la proposition, ou rien si rien n'est accepté", () => {
    expect(counterpartSentence([])).toBeNull();
    expect(counterpartSentence(["article"])).toBe("écrire un article original pour votre site");
    expect(counterpartSentence(["lien_retour", "partage", "article"])).toBe(
      "partager votre page auprès de nos lecteurs, écrire un article original pour votre site ou faire un lien vers votre site depuis le nôtre",
    );
  });
});
