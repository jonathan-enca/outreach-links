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
  auth: {
    title: "Connexion",
    intro: "Entrez votre email : nous vous envoyons un lien de connexion, sans mot de passe.",
    emailLabel: "Adresse email",
    submit: "Recevoir le lien de connexion",
    sent: "Lien envoyé. Consultez votre boîte mail pour vous connecter.",
    errorInvalidEmail: "Adresse email invalide.",
    errorSend: "Impossible d'envoyer le lien. Réessayez dans un instant.",
    errorCallback: "Le lien de connexion est invalide ou a expiré. Demandez-en un nouveau.",
    signOut: "Se déconnecter",
  },
  workspace: {
    title: "Votre espace",
    signedInAs: "Connecté en tant que",
    workspace: "Workspace",
  },
} as const;

export type Messages = typeof fr;
