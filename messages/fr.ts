/** Toutes les chaînes de l'interface passent par ce fichier (UI en français). */
export const fr = {
  app: {
    name: "Outreach backlinks",
    description:
      "Un audit SEO d'abord, puis une prospection par email pour obtenir des backlinks éditoriaux gratuits.",
  },
  home: {
    title: "Des backlinks éditoriaux, à partir d'un vrai audit",
    subtitle: "Le site arrive bientôt. L'audit gratuit sera la première étape.",
  },
} as const;

export type Messages = typeof fr;
