import { describe, expect, it } from "vitest";
import { parsePublishers, parseProfileForm, profileToFields } from "@/features/brand/form";
import type { PublisherType } from "@/features/brand/schema";
import { mergeStats } from "@/features/qualification/more";
import type { FunnelStats } from "@/features/qualification/funnel";
import { assignPublisher, publisherTabs } from "./publishers";
import { funnelView } from "./service";

const types: PublisherType[] = [
  {
    label: "Clubs de randonnée",
    category: "association",
    terms: ["club de randonnée", "club alpin"],
    origin: "persona",
  },
  {
    label: "Offices de tourisme",
    category: "collectivite",
    terms: ["office de tourisme"],
    origin: "persona",
  },
  { label: "Blogs de voyage", category: "blog", terms: ["blog voyage"], origin: "persona" },
  {
    label: "Gîtes d'étape",
    category: "professionnel",
    terms: ["gîte d'étape", "refuge"],
    origin: "voisin",
  },
];
const t = (o: Partial<Parameters<typeof assignPublisher>[0]>) => ({
  domain: "exemple.fr",
  pageTitle: null,
  siteType: null,
  foundBy: [],
  ...o,
});

describe("une cible est rangée sous le type d'éditeur cherché", () => {
  it("d'abord un mot du type dans le nom du site ou le titre (singulier ou pluriel, accents ignorés)", () => {
    expect(assignPublisher(t({ pageTitle: "Le Club Alpin de Savoie" }), types)).toBe(
      "Clubs de randonnée",
    );
    expect(assignPublisher(t({ domain: "refuges-du-mercantour.fr" }), types)).toBe("Gîtes d'étape");
    expect(
      assignPublisher(t({ pageTitle: "Office de Tourisme du Vercors", siteType: "blog" }), types),
    ).toBe("Offices de tourisme");
  });

  it("puis la recherche du type qui l'a trouvée, sauf si le type jugé dit autre chose", () => {
    expect(assignPublisher(t({ foundBy: ["Gîtes d'étape"], siteType: "ecommerce" }), types)).toBe(
      "Gîtes d'étape",
    );
    expect(
      assignPublisher(t({ foundBy: ["Offices de tourisme"], siteType: "mairie" }), types),
    ).toBe("Offices de tourisme");
    // Trouvée par la recherche « offices de tourisme », mais c'est un blog : rangée avec les blogs.
    expect(assignPublisher(t({ foundBy: ["Offices de tourisme"], siteType: "blog" }), types)).toBe(
      "Blogs de voyage",
    );
  });

  it("puis le type de site jugé ; sinon « autres sites » : jamais de rangement forcé", () => {
    expect(assignPublisher(t({ siteType: "association" }), types)).toBe("Clubs de randonnée");
    expect(assignPublisher(t({ siteType: "media" }), types)).toBeNull();
    expect(assignPublisher(t({}), [])).toBeNull();
  });

  it("un onglet par type cherché, même à zéro, puis « autres sites »", () => {
    const tabs = publisherTabs(["Blogs de voyage", "Blogs de voyage", null, "Ancien type"], types);
    expect(tabs.map((x) => [x.label, x.count])).toEqual([
      ["Clubs de randonnée", 0],
      ["Offices de tourisme", 0],
      ["Blogs de voyage", 2],
      ["Gîtes d'étape", 0],
      [null, 2],
    ]);
    expect(publisherTabs(["Blogs de voyage"], types).some((x) => x.label === null)).toBe(false);
    // Aucun plafond par type : tout ce qui est rangé est compté.
    expect(publisherTabs(Array(60).fill("Blogs de voyage"), types)[2]!.count).toBe(60);
  });
});

describe("étiquettes du formulaire de profil", () => {
  it("désactivation gardée, ajout reconstruit côté serveur, entrée illisible ignorée", () => {
    const raw = JSON.stringify([
      types[0],
      { ...types[1], active: false },
      {
        label: "Musées de montagne",
        category: "autre",
        terms: ["musées de montagne"],
        origin: "utilisateur",
      },
      { label: "", category: "nope" },
      types[0],
    ]);
    const out = parsePublishers(raw)!;
    expect(out.map((x) => x.label)).toEqual([
      "Clubs de randonnée",
      "Offices de tourisme",
      "Musées de montagne",
    ]);
    expect(out[1]!.active).toBe(false);
    expect(out[2]).toMatchObject({
      category: "bibliotheque",
      terms: ["musées de montagne"],
      origin: "utilisateur",
    });
    expect(parsePublishers(null)).toBeNull();
    expect(parsePublishers("pas du json")).toBeNull();
    expect(parsePublishers("[]")).toEqual([]);
  });

  it("le profil enregistré garde les étiquettes et les mots du thème ; un changement d'étiquette est un changement", () => {
    const fd = new FormData();
    fd.set("profile_activity", "Guide de randonnée en montagne.");
    fd.set("profile_offer", "Itinéraires, cartes et conseils.");
    fd.set("profile_audience", "randonneurs");
    fd.set("profile_names", "Rando Guide");
    fd.set(
      "profile_personas",
      "Clubs | sites de clubs | Ils conseillent des itinéraires.\nOffices | sites d'offices | Ils orientent les visiteurs.",
    );
    fd.set("profile_tone", "pratique");
    fd.set("profile_publishers", JSON.stringify([types[0], { ...types[3], active: false }]));
    fd.set("profile_theme_terms", JSON.stringify(["randonnée", "itinéraires de randonnée"]));
    const res = parseProfileForm(fd, { domain: "rando-guide.fr", language: "fr" });
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.profile.publisher_types).toHaveLength(2);
    expect(res.profile.theme_terms).toEqual(["randonnée", "itinéraires de randonnée"]);
    const other = { ...res.profile, publisher_types: [types[0]!] };
    expect(profileToFields(res.profile).publishers).not.toBe(profileToFields(other).publishers);
    // Sans le champ (ancien profil) : rien n'est inventé ni effacé.
    fd.delete("profile_publishers");
    const bare = parseProfileForm(fd, { domain: "rando-guide.fr", language: "fr" });
    expect(bare.status === "ok" && bare.profile.publisher_types).toBeUndefined();
  });
});

describe("chiffres de l'analyse et lot supplémentaire", () => {
  const stats = {
    candidates: 677,
    pagesRead: 320,
    judged: 120,
    relevant: 52,
    stock: 150,
    preRead: { langue: 60, robots: 20, concurrent: 13, doublon: 0 },
    costUsd: 0.2,
    lots: 8,
    bySource: {
      content: { candidates: 343, read: 200, alive: 90, judged: 90, relevant: 40, shortlist: 35 },
    },
  } as unknown as FunnelStats;

  it("résumé lisible : sites examinés, écartés sans lecture par motif, pages lues", () => {
    const f = funnelView(stats, 45, 150)!;
    expect(f).toMatchObject({
      candidates: 677,
      pagesRead: 320,
      judged: 120,
      shortlist: 45,
      stock: 150,
    });
    expect(f.preReadTotal).toBe(93);
    expect(f.preRead.map((x) => x.reason)).toEqual(["langue", "robots", "concurrent"]);
    expect(funnelView({}, 0, 0)).toBeNull();
    expect(funnelView(null, 0, 0)).toBeNull();
  });

  it("un lot de plus s'ajoute aux compteurs ; le stock et la liste sont ceux d'après le lot", () => {
    const lot = {
      ...stats,
      pagesRead: 80,
      judged: 40,
      relevant: 12,
      stock: 70,
      costUsd: 0.07,
      lots: 2,
      bySource: {
        content: { candidates: 150, read: 80, alive: 40, judged: 40, relevant: 12, shortlist: 9 },
      },
    } as unknown as FunnelStats;
    const merged = mergeStats(stats, lot, 54);
    expect(merged).toMatchObject({
      pagesRead: 400,
      judged: 160,
      relevant: 64,
      stock: 70,
      shortlist: 54,
      lots: 10,
    });
    expect(merged.costUsd).toBeCloseTo(0.27, 6);
    expect(merged.bySource!.content).toMatchObject({
      candidates: 343,
      read: 280,
      relevant: 52,
      shortlist: 44,
    });
  });
});
