/** Ancres de la home : utilisées par les sections et par l'en-tête (un test vérifie qu'elles se correspondent). */
export const HOME_SECTIONS = {
  whatItIs: "c-est-quoi",
  proofs: "preuves",
  howItWorks: "comment-ca-marche",
  tactics: "tactiques",
  compare: "comparatif",
  pricing: "tarifs",
  faq: "faq",
} as const;

/** Vidéo de la visite du produit : à renseigner quand elle existera (URL d'un fichier MP4 dans `public/`). */
export const PRODUCT_TOUR_VIDEO: {
  src: string;
  poster?: string;
  /** Durée ISO 8601 et date de mise en ligne : servent aux données structurées (VideoObject). */
  duration: string;
  uploadDate: string;
} | null = {
  src: "/visite-produit.mp4",
  poster: "/visite-produit-poster.webp",
  duration: "PT27S",
  uploadDate: "2026-11-21",
};
