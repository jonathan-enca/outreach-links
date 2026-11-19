import type { CollectionSource } from "@/features/collection/types";
import type { Tactic } from "@/features/queries/schema";

/**
 * MQ.1 : piste de découverte d'une cible (la source qui l'a trouvée) et suivi interne par piste,
 * par niveau de boule de neige et par type de site. Pure : la lecture en base est dans
 * `tracking-report.ts`. Un candidat a toujours une piste : à défaut de source, la tactique suffit.
 */

/** Ordre de priorité : la piste la plus forte (preuve sur la page) l'emporte sur les autres. */
export const PISTES = [
  "lien_mort",
  "citation",
  "mention",
  "intersection",
  "content",
  "requete_contenu",
  "serp",
] as const satisfies readonly CollectionSource[];
export type Piste = (typeof PISTES)[number];

export const PISTE_LABELS: Record<Piste, string> = {
  lien_mort: "Lien mort chez un concurrent",
  citation: "Cite déjà une ressource comparable",
  mention: "Mention de la marque sans lien",
  intersection: "Recoupe plusieurs concurrents",
  content: "Recherche de contenu",
  requete_contenu: "Requête de contenu sans lien",
  serp: "Résultats de recherche Google",
};

export function pisteFromTactics(tactics: readonly Tactic[]): Piste {
  if (tactics.includes("mentions")) return "mention";
  if (tactics.includes("ressources")) return "citation";
  return "serp";
}

/** Piste d'un candidat : première source connue selon `PISTES`, sinon déduite des tactiques. */
export function pisteOf(
  sources: readonly { source: CollectionSource }[],
  tactics: readonly Tactic[],
): Piste {
  for (const p of PISTES) if (sources.some((s) => s.source === p)) return p;
  return pisteFromTactics(tactics);
}

export function niveauLabel(niveau: number): string {
  return niveau === 0 ? "Premier passage" : `Boule de neige, niveau ${niveau}`;
}

/** Une cible retenue (liste courte) et ce qui lui est arrivé. */
export interface TrackedTarget {
  piste: string | null;
  niveau: number;
  siteType: string | null;
  /** Au moins un premier message réellement envoyé. */
  sent: boolean;
  /** Au moins une réponse reçue à ce message. */
  replied: boolean;
  /** Au moins un lien vérifié en ligne (statut `live`). */
  linked: boolean;
}

export type TrackingDimension = "piste" | "niveau" | "siteType";

export interface TrackingLine {
  key: string;
  cibles: number;
  envois: number;
  reponses: number;
  liens: number;
}

export const SANS_PISTE = "(sans piste)";
export const SANS_TYPE = "(type non jugé)";

function keyOf(t: TrackedTarget, by: TrackingDimension): string {
  if (by === "piste") return t.piste ?? SANS_PISTE;
  if (by === "niveau") return String(t.niveau);
  return t.siteType ?? SANS_TYPE;
}

/** Compte les cibles, envois, réponses et liens par une dimension. Tri : niveau croissant, sinon cibles décroissantes. */
export function summarizeTracking(
  targets: readonly TrackedTarget[],
  by: TrackingDimension,
): TrackingLine[] {
  const lines = new Map<string, TrackingLine>();
  for (const t of targets) {
    const key = keyOf(t, by);
    const line = lines.get(key) ?? { key, cibles: 0, envois: 0, reponses: 0, liens: 0 };
    line.cibles += 1;
    if (t.sent) line.envois += 1;
    if (t.replied) line.reponses += 1;
    if (t.linked) line.liens += 1;
    lines.set(key, line);
  }
  const out = [...lines.values()];
  if (by === "niveau") return out.sort((a, b) => Number(a.key) - Number(b.key));
  return out.sort((a, b) => b.cibles - a.cibles || a.key.localeCompare(b.key));
}

const pct = (part: number, whole: number) =>
  whole === 0 ? "—" : `${Math.round((100 * part) / whole)} %`;

function table(title: string, lines: TrackingLine[], label: (key: string) => string): string {
  const head = `| ${title} | Cibles | Envois | Réponses | Liens | Réponse / envoi | Lien / cible |`;
  const sep = "|---|---:|---:|---:|---:|---:|---:|";
  const rows = lines.map(
    (l) =>
      `| ${label(l.key)} | ${l.cibles} | ${l.envois} | ${l.reponses} | ${l.liens} | ${pct(l.reponses, l.envois)} | ${pct(l.liens, l.cibles)} |`,
  );
  return [head, sep, ...rows].join("\n");
}

/** Tableau interne en Markdown : trois vues (piste, niveau, type de site). */
export function formatTrackingMarkdown(targets: readonly TrackedTarget[]): string {
  const piste = table("Piste", summarizeTracking(targets, "piste"), (k) =>
    k in PISTE_LABELS ? PISTE_LABELS[k as Piste] : k,
  );
  const niveau = table("Niveau", summarizeTracking(targets, "niveau"), (k) =>
    niveauLabel(Number(k)),
  );
  const siteType = table("Type de site", summarizeTracking(targets, "siteType"), (k) => k);
  return [
    `## Par piste (${targets.length} cibles)`,
    piste,
    "## Par niveau de boule de neige",
    niveau,
    "## Par type de site",
    siteType,
  ].join("\n\n");
}
