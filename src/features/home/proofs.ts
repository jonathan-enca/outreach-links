/**
 * Preuves de la home : les sites gérés par le fondateur, dont les liens ont été demandés à la main.
 *
 * ⚠ CHIFFRES D'ILLUSTRATION (décision de Jonathan, 15/11/2026) : ils ne viennent d'aucune mesure.
 * Tant que `PROOFS_ARE_ILLUSTRATIVE` vaut true, la home affiche un bandeau « chiffres
 * d'illustration » et les domaines cités comme sources de liens sont des noms fictifs
 * (`exemple-*`). Pour passer aux vrais chiffres : remplacer ce fichier par les mesures réelles
 * (outil d'autorité de domaine, Search Console), puis mettre `PROOFS_ARE_ILLUSTRATIVE` à false.
 */
export const PROOFS_ARE_ILLUSTRATIVE = true;

export interface ProofMetric {
  label: "traffic" | "referring" | "links";
  from?: number;
  to: number;
}

export interface ProofSite {
  domain: string;
  kind: "outil" | "coloriages" | "ecommerce" | "saas";
  /** Autorité du domaine (indicateur tiers, échelle 0 à 100) au début et à la fin de la période. */
  authority: { from: number; to: number };
  period: string;
  /** Une valeur par mois, de l'autorité de départ à l'autorité d'arrivée. */
  series: number[];
  metrics: ProofMetric[];
  linkedFrom: { domain: string; authority: number }[];
}

export const PROOF_SITES: ProofSite[] = [
  {
    domain: "mega-coloring.com",
    kind: "coloriages",
    authority: { from: 8, to: 34 },
    period: "mars → novembre 2026",
    series: [8, 11, 15, 19, 23, 27, 30, 32, 34],
    metrics: [
      { label: "traffic", from: 1_900, to: 7_400 },
      { label: "referring", to: 24 },
      { label: "links", to: 31 },
    ],
    linkedFrom: [
      { domain: "exemple-ecole-primaire.fr", authority: 41 },
      { domain: "exemple-ressources-parents.fr", authority: 52 },
      { domain: "exemple-bibliotheque.fr", authority: 47 },
    ],
  },
  {
    domain: "oma-and-me.com",
    kind: "ecommerce",
    authority: { from: 12, to: 29 },
    period: "avril → novembre 2026",
    series: [12, 14, 17, 20, 23, 25, 27, 29],
    metrics: [
      { label: "traffic", from: 620, to: 1_850 },
      { label: "referring", to: 14 },
      { label: "links", to: 19 },
    ],
    linkedFrom: [
      { domain: "exemple-blog-maman.fr", authority: 38 },
      { domain: "exemple-selection-cadeaux.fr", authority: 44 },
    ],
  },
  {
    domain: "squadraplanning.com",
    kind: "saas",
    authority: { from: 5, to: 27 },
    period: "mai → novembre 2026",
    series: [5, 9, 13, 16, 20, 24, 27],
    metrics: [
      { label: "traffic", from: 310, to: 1_240 },
      { label: "referring", to: 17 },
      { label: "links", to: 22 },
    ],
    linkedFrom: [
      { domain: "exemple-annuaire-logiciels.fr", authority: 58 },
      { domain: "exemple-blog-rh.fr", authority: 46 },
      { domain: "exemple-communaute-pme.fr", authority: 39 },
    ],
  },
  {
    domain: "remove-me.io",
    kind: "outil",
    authority: { from: 3, to: 21 },
    period: "juin → novembre 2026",
    series: [3, 7, 10, 14, 18, 21],
    metrics: [
      { label: "traffic", from: 140, to: 960 },
      { label: "referring", to: 11 },
      { label: "links", to: 15 },
    ],
    linkedFrom: [
      { domain: "exemple-guide-vie-privee.fr", authority: 49 },
      { domain: "exemple-forum-securite.fr", authority: 43 },
    ],
  },
];

/** Synthèse du haut de la section, calculée à partir des sites (jamais saisie à la main). */
export function proofSummary(sites: readonly ProofSite[] = PROOF_SITES) {
  const gains = sites.map((s) => s.authority.to - s.authority.from);
  const best = sites[gains.indexOf(Math.max(...gains))]!;
  const ratios = sites.map((s) => {
    const m = s.metrics.find((x) => x.label === "traffic");
    return m?.from ? m.to / m.from : 0;
  });
  const bestTraffic = sites[ratios.indexOf(Math.max(...ratios))]!;
  const links = sites.reduce(
    (sum, s) => sum + (s.metrics.find((x) => x.label === "links")?.to ?? 0),
    0,
  );
  return {
    best,
    bestTraffic,
    trafficRatio: Math.round(Math.max(...ratios) * 10) / 10,
    links,
  };
}
