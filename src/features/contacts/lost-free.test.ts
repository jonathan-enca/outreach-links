import { describe, expect, it } from "vitest";
import { parseHtml } from "@/features/triage/page-reader";
import { investigateItem, type InvestigateDeps } from "./investigate";

const html = (body: string) =>
  `<html lang="fr"><head><title>T</title></head><body>${body}</body></html>`;

function web(pages: Record<string, string>, robots = "User-agent: *\nAllow: /") {
  const fetch = async (url: string) => {
    if (url.endsWith("/robots.txt")) return { status: 200, text: robots };
    const body = pages[url];
    return body === undefined ? { status: 404, text: "" } : { status: 200, text: body };
  };
  let t = 1_000_000;
  const deps: InvestigateDeps = {
    fetch,
    sleep: async (ms) => void (t += ms),
    now: () => t,
    provider: null,
    isSuppressed: () => false,
    paidCallsLeft: 0,
  };
  return deps;
}

const item = { id: "x", domain: "exemple.fr", resolvedUrl: "https://exemple.fr/article" };

describe("pertes gratuites de contact (chantier D.1)", () => {
  it("garde le lien « Contact » du pied de page même après 120 liens", () => {
    const many = Array.from({ length: 150 }, (_, i) => `<a href="/a${i}">article ${i}</a>`).join(
      "",
    );
    const read = parseHtml(
      html(
        `${many}<footer><a href="/contact">Contact</a><a href="/mentions-legales">Mentions légales</a></footer>`,
      ),
      "https://exemple.fr/",
    );
    const hrefs = read.links.map((l) => l.href);
    expect(hrefs).toContain("https://exemple.fr/contact");
    expect(hrefs).toContain("https://exemple.fr/mentions-legales");
    // Les autres liens restent plafonnés comme avant.
    expect(read.links.length).toBeLessThanOrEqual(150);
    expect(hrefs).not.toContain("https://exemple.fr/a149");
  });

  it("reconnaît un formulaire de contact sans zone de message", () => {
    const ninja = parseHtml(
      html(`<div id="nf-form-1-cont" class="nf-form-cont"></div>`),
      "https://e.fr/",
    );
    expect(ninja.hasContactForm).toBe(true);
    const fields = parseHtml(
      html(
        `<form action="/envoi"><input name="nom"><input type="email" name="mail"><input name="objet"><button>OK</button></form>`,
      ),
      "https://e.fr/",
    );
    expect(fields.hasContactForm).toBe(true);
  });

  it("ne prend ni une recherche ni une inscription à une lettre d'information pour un formulaire de contact", () => {
    const news = parseHtml(
      html(`<form action="/abonnement"><input type="email" name="mail"><button>OK</button></form>`),
      "https://e.fr/",
    );
    expect(news.hasContactForm).toBe(false);
    const search = parseHtml(
      html(`<form action="/search"><input name="q"><button>OK</button></form>`),
      "https://e.fr/",
    );
    expect(search.hasContactForm).toBe(false);
  });

  it("essaie les pages de contact usuelles quand le menu n'en montre aucune", async () => {
    const d = web({
      "https://exemple.fr/article": html("<p>Un article</p>"),
      "https://exemple.fr/": html("<p>Accueil</p>"),
      "https://exemple.fr/contact": html(`<p>Écrivez-nous : bonjour@exemple.fr</p>`),
    });
    const r = await investigateItem(item, d);
    expect(r.email).toBe("bonjour@exemple.fr");
  });

  it("ne devine aucune adresse : rien d'écrit nulle part = introuvable", async () => {
    const d = web({
      "https://exemple.fr/article": html("<p>Un article</p>"),
      "https://exemple.fr/": html("<p>Accueil</p>"),
    });
    const r = await investigateItem(item, d);
    expect(r.status).toBe("introuvable");
    expect(r.email).toBeNull();
  });

  it("page de contact liée par le site mais fermée par robots.txt : tâche manuelle, jamais lue", async () => {
    const d = web(
      {
        "https://exemple.fr/article": html(`<a href="/contact">Contact</a>`),
        "https://exemple.fr/": html(`<a href="/contact">Contact</a>`),
        "https://exemple.fr/contact": html("<p>ne doit pas être lue : secret@exemple.fr</p>"),
      },
      "User-agent: *\nAllow: /\nDisallow: /contact",
    );
    const r = await investigateItem(item, d);
    expect(r.status).toBe("formulaire");
    expect(r.formUrl).toBe("https://exemple.fr/contact");
    expect(r.email).toBeNull();
    expect(r.sendable).toBe(false);
  });
});

describe("page de contact fermée par robots.txt : seulement une vraie page « Contact »", () => {
  it("ignore une page de connexion et un contact produit", async () => {
    const robots = "User-agent: *\nAllow: /\nDisallow: /contacts\nDisallow: /extranet";
    const d = web(
      {
        "https://exemple.fr/article": html(
          `<a href="/contacts/login?redirect=%2Fpage">Contact</a><a href="/extranet/fr/contact-kits">Contact</a>`,
        ),
        "https://exemple.fr/": html("<p>Accueil</p>"),
      },
      robots,
    );
    const r = await investigateItem(item, d);
    expect(r.status).toBe("introuvable");
  });
});
