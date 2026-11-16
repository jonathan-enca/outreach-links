import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { PlannedQuery } from "@/features/queries/schema";
import type { CacheStore } from "@/lib/dataforseo";

/**
 * Entrée FIXE des runs réels de démonstration sur mega-coloring.com (MT.3 `pnpm demo:collect`,
 * MT.4 `pnpm demo:qualify`) : mêmes requêtes et concurrents à chaque run, pour comparer les mesures
 * et profiter du cache sur fichier (`COLLECT_LIVE_CACHE`).
 */
export const DEMO_COMPETITORS = [
  "coloriez.com",
  "hugolescargot.com",
  "tete-a-modeler.com",
  "momes.net",
];

const q = (
  i: number,
  text: string,
  persona: string,
  tactic: PlannedQuery["tactic"] = "inconnus",
): PlannedQuery => ({
  q: text,
  tactic,
  persona,
  target: "home",
  keyword: null,
  score: 1 - i / 100,
  rank: i,
  estUsd: 0.006,
  origin: "regle",
});

export const DEMO_QUERIES: PlannedQuery[] = [
  q(1, '"Mega Coloring" -site:mega-coloring.com', "", "mentions"),
  q(2, '"megacoloring" -site:mega-coloring.com', "", "mentions"),
  q(3, "coloriages à imprimer blog de classe", "Enseignants"),
  q(4, "coloriages à imprimer ressources maternelle", "Enseignants", "ressources"),
  q(5, "activités enfants coloriages blog maman", "Parents blogueurs"),
  q(6, "coloriages à imprimer médiathèque", "Médiathèques"),
  q(7, "coloriages à imprimer centre de loisirs", "Associations"),
  q(8, "coloriages à imprimer liens utiles", "Enseignants", "ressources"),
  q(9, "forum parents activités coloriage", "Parents blogueurs"),
  q(10, "coloriages à imprimer association", "Associations"),
].map((x, i) => ({ ...x, rank: i + 1 }));

/** Cache sur fichier (COLLECT_LIVE_CACHE) : une relance du run ne repaie pas les appels déjà réussis. */
export function fileCache(file: string | undefined): CacheStore {
  const map: Record<string, { response: unknown; costUsd: number }> =
    file && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  return {
    async get(key) {
      return map[key] ?? null;
    },
    async set(key, entry) {
      map[key] = { response: entry.response, costUsd: entry.costUsd };
      if (file) writeFileSync(file, JSON.stringify(map));
    },
  };
}
