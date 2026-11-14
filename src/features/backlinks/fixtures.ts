/**
 * Fixtures SYNTHÉTIQUES de backlinks au format DataForSEO (backlinks/backlinks/live),
 * d'après la documentation : aucune donnée réelle. Chaque ligne illustre une règle de
 * nettoyage ; le commentaire dit laquelle. Utilisées par les tests, jamais en production.
 */

type Item = Record<string, unknown>;

let n = 0;
const link = (over: Item): Item => ({
  type: "backlink",
  item_type: "anchor",
  domain_from: "blog-maman.fr",
  url_from: `https://blog-maman.fr/article-${++n}`,
  domain_to: "hugolescargot.com",
  url_to: "https://hugolescargot.com/coloriages/licorne",
  anchor: "coloriages licorne",
  dofollow: true,
  is_broken: false,
  rank: 120,
  page_from_rank: 90,
  domain_from_rank: 250,
  backlink_spam_score: 5,
  first_seen: "2025-06-02 00:00:00 +00:00",
  last_seen: "2026-11-10 00:00:00 +00:00",
  ...over,
});

export const COMPETITOR = "hugolescargot.com";

export const FIXTURE_ITEMS: Item[] = [
  // Propres (conservés)
  link({
    domain_from: "ecole-saint-exupery.fr",
    url_from: "https://ecole-saint-exupery.fr/ressources",
  }),
  link({ domain_from: "blog-maman.fr", url_from: "https://blog-maman.fr/idees-activites" }),
  link({
    domain_from: "assmat-du-village.be",
    url_from: "https://assmat-du-village.be/liens",
    dofollow: false,
  }),
  link({
    domain_from: "wanderlust-voyages.com",
    url_from: "https://wanderlust-voyages.com/enfants",
  }),
  link({ domain_from: "startup.io", url_from: "https://startup.io/blog/enfants" }),
  link({
    domain_from: "mairie-de-lyon.fr",
    url_from: "https://www.mairie-de-lyon.fr/loisirs?utm_source=x",
  }),
  // Spam : score du fournisseur
  link({
    domain_from: "super-site.fr",
    url_from: "https://super-site.fr/a",
    backlink_spam_score: 82,
  }),
  // Spam : heuristique sur le domaine
  link({
    domain_from: "casino-en-ligne-gratuit.fr",
    url_from: "https://casino-en-ligne-gratuit.fr/x",
  }),
  link({ domain_from: "meilleurs-liens.xyz", url_from: "https://meilleurs-liens.xyz/p" }),
  link({ domain_from: "top-bet-france.fr", url_from: "https://top-bet-france.fr/p" }),
  // Spam : ancre
  link({
    domain_from: "annuaire-gratuit.fr",
    url_from: "https://annuaire-gratuit.fr/p",
    anchor: "casino en ligne",
  }),
  // Pas du spam malgré une sous-chaîne trompeuse
  link({ domain_from: "alphabet-des-enfants.fr", url_from: "https://alphabet-des-enfants.fr/a" }),
  // Images réutilisées automatiquement (3 liens image du même domaine) + une image isolée conservée
  link({
    domain_from: "scraper-images.fr",
    url_from: "https://scraper-images.fr/g/1",
    item_type: "image",
    anchor: null,
    url_to: "https://hugolescargot.com/img/licorne.png",
  }),
  link({
    domain_from: "scraper-images.fr",
    url_from: "https://scraper-images.fr/g/2",
    item_type: "image",
    anchor: null,
    url_to: "https://hugolescargot.com/img/chat.png",
  }),
  link({
    domain_from: "scraper-images.fr",
    url_from: "https://scraper-images.fr/g/3",
    item_type: "image",
    anchor: null,
    url_to: "https://hugolescargot.com/img/chien.png",
  }),
  link({
    domain_from: "prof-des-ecoles.fr",
    url_from: "https://prof-des-ecoles.fr/fiches",
    item_type: "image",
    anchor: null,
    url_to: "https://hugolescargot.com/img/licorne.png",
  }),
  // Étrangers
  link({ domain_from: "kinderspiele.de", url_from: "https://kinderspiele.de/malvorlagen" }),
  link({ domain_from: "pintar-ninos.es", url_from: "https://pintar-ninos.es/dibujos" }),
  link({
    domain_from: "raskraska.com",
    url_from: "https://raskraska.com/p",
    anchor: "раскраски единорог",
  }),
  link({
    domain_from: "tokyo-kids.com",
    url_from: "https://tokyo-kids.com/p",
    anchor: "ユニコーン 塗り絵",
  }),
  // Plateformes génériques
  link({ domain_from: "fr.pinterest.com", url_from: "https://fr.pinterest.com/pin/123" }),
  link({ domain_from: "www.youtube.com", url_from: "https://www.youtube.com/watch?v=abc" }),
  // Internes
  link({
    domain_from: "boutique.hugolescargot.com",
    url_from: "https://boutique.hugolescargot.com/",
  }),
  link({ domain_from: "mega-coloring.com", url_from: "https://mega-coloring.com/liens" }),
  // Doublons : même source et même cible (avec www, fragment, paramètres de suivi, slash final)
  link({
    domain_from: "doublon-blog.fr",
    url_from: "https://doublon-blog.fr/post",
    dofollow: false,
  }),
  link({
    domain_from: "doublon-blog.fr",
    url_from: "https://www.doublon-blog.fr/post/?utm_campaign=a#c",
  }),
  // Liens cassés (conservés : utiles pour reprendre des liens morts)
  link({ domain_from: "ancien-blog.fr", url_from: "https://ancien-blog.fr/p", is_broken: true }),
];

/** Enveloppe de réponse DataForSEO autour des lignes (pour le client réel avec fetch simulé). */
export function backlinksEnvelope(items: Item[], target = COMPETITOR, cost = 0.0203) {
  return {
    version: "x",
    status_code: 20000,
    status_message: "Ok.",
    cost,
    tasks_count: 1,
    tasks_error: 0,
    tasks: [
      {
        id: `task-${target}`,
        status_code: 20000,
        status_message: "Ok.",
        cost,
        result_count: 1,
        result: [{ target, total_count: items.length, items_count: items.length, items }],
      },
    ],
  };
}
