/** Ancres de la home : utilisées par les sections et par l'en-tête (un test vérifie qu'elles se correspondent). */
export const HOME_SECTIONS = {
  whatItIs: "c-est-quoi",
  problem: "probleme",
  proofs: "preuves",
  howItWorks: "comment-ca-marche",
  quality: "qualite",
  features: "fonctions",
  compare: "comparatif",
  pricing: "tarifs",
  faq: "faq",
} as const;

/** Vidéo de la visite du produit : à renseigner quand elle existera (URL d'un fichier MP4 dans `public/`). */
export const PRODUCT_TOUR_VIDEO: { src: string; poster?: string } | null = null;
