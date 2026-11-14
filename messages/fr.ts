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
    signIn: "Se connecter",
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
    intro: "Commencez par l'audit : il alimente tout le reste.",
    startAudit: "Aller à l'audit",
  },
  nav: {
    label: "Navigation principale",
    home: "Accueil",
    skipToContent: "Aller au contenu",
    audit: "Audit",
    plan: "Plan",
    lots: "Lots",
    inbox: "Inbox",
    liens: "Liens",
    garde_fous: "Garde-fous",
  },
  pages: {
    audit: {
      title: "Audit",
      description:
        "Concurrents réels de la SERP, écart de liens, pages à pousser. Le coût estimé est annoncé avant tout lancement.",
      emptyTitle: "Aucun audit pour le moment",
      emptyBody:
        "Lancez un audit de votre site pour découvrir vos vrais concurrents et les opportunités de liens.",
      emptyHint: "Disponible dans un prochain jalon.",
    },
    plan: {
      title: "Plan de liens",
      description:
        "Les types de cibles, les pages à promouvoir et les ancres suggérées. Rien n'est lancé sans votre validation.",
      emptyTitle: "Aucun plan à valider",
      emptyBody: "Le plan de liens apparaîtra ici une fois l'audit terminé.",
      emptyHint: "Disponible après l'audit.",
    },
    lots: {
      title: "Lots",
      description:
        "Des listes courtes de cibles triées, avec le hook et le message. Rien n'est envoyé avant votre accord sur le lot.",
      emptyTitle: "Aucun lot préparé",
      emptyBody: "Les cibles qualifiées seront regroupées en lots à relire et à valider.",
      emptyHint: "Disponible après la validation du plan.",
    },
    inbox: {
      title: "Inbox",
      description:
        "Les réponses classées par catégorie : chaud, tiède, offres payantes, en négociation, gagné.",
      emptyTitle: "Aucune réponse pour le moment",
      emptyBody: "Les réponses aux messages envoyés arriveront ici, déjà classées.",
      emptyHint: "Disponible après le premier envoi.",
    },
    liens: {
      title: "Liens obtenus",
      description:
        "Vérification des liens posés : actif, dofollow ou nofollow, indexé, et alerte si un lien disparaît.",
      emptyTitle: "Aucun lien obtenu pour le moment",
      emptyBody: "Chaque lien posé sera vérifié automatiquement à J+7, J+14 et J+30.",
      emptyHint: "Disponible après les premières réponses.",
    },
    garde_fous: {
      title: "Garde-fous",
      description:
        "Plafonds d'envoi, niveau d'autonomie, seuil de qualité et pause. Par défaut, rien ne part sans votre validation.",
      emptyTitle: "Aucune boîte d'envoi connectée",
      emptyBody:
        "Les réglages de sécurité apparaîtront ici. Aucun envoi n'est possible tant qu'une boîte n'est pas connectée.",
      emptyHint: "Disponible dans un prochain jalon.",
    },
  },
  status: {
    brouillon: "Brouillon",
    valide: "Validé",
    envoye: "Envoyé",
    relance: "Relancé",
    termine_sans_reponse: "Terminé sans réponse",
    repondu: "Répondu",
    lien_pose: "Lien posé",
    refuse: "Refusé",
    ne_pas_contacter: "Ne pas contacter",
    chaud: "Chaud",
    tiede: "Tiède",
    offre_payante: "Offre payante",
    froid: "Froid",
    en_negociation: "En négociation",
    gagne: "Gagné",
    archive: "Archivé",
  },
  errors: {
    notFoundTitle: "Page introuvable",
    notFoundBody: "Cette page n'existe pas ou a été déplacée.",
    backHome: "Retour à l'accueil",
    backApp: "Retour à l'espace",
    errorTitle: "Une erreur est survenue",
    errorBody: "Réessayez dans un instant. Si le problème persiste, notez la référence ci-dessous.",
    retry: "Réessayer",
    reference: "Référence",
  },
} as const;

export type Messages = typeof fr;
