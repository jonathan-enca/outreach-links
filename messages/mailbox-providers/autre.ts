import type { ProviderGuide } from "../mailbox-guides";

/** Guide générique : toute messagerie qui propose SMTP et IMAP avec un mot de passe. */
export const autre: readonly ProviderGuide[] = [
  {
    slug: "autre",
    name: "Autre messagerie",
    title: "Connecter une autre messagerie",
    scope: "PlanetHoster, one.com, Amen, Alwaysdata, serveur d'entreprise…",
    group: "autre",
    domains: [],
    compatible: true,
    serverHint:
      "Quatre informations à demander à votre fournisseur : le serveur d'envoi (SMTP) et son port, le serveur de lecture (IMAP) et son port. Ports acceptés : 465 ou 587 pour l'envoi, 993 pour la lecture.",
    username: "Le plus souvent, votre adresse complète",
    password: "boite",
    passwordHint:
      "Le mot de passe de la boîte, ou un mot de passe d'application si votre fournisseur en propose.",
    intro:
      "Toute messagerie qui propose l'envoi par SMTP et la lecture par IMAP avec un mot de passe peut être connectée. Il faut seulement retrouver ses réglages.",
    duration: "10 minutes",
    needs: [
      "Les réglages de connexion de votre boîte. Ils figurent dans l'aide de votre fournisseur, souvent sous le titre « configurer un logiciel de messagerie » ou « paramètres IMAP et SMTP ».",
      "Le mot de passe de la boîte.",
    ],
    steps: [
      {
        title: "Trouvez les réglages IMAP et SMTP",
        body: [
          "Dans l'aide de votre fournisseur ou dans votre espace client, cherchez la page qui explique comment configurer Outlook, Thunderbird ou un téléphone : ce sont les mêmes réglages.",
          "Vous devez en ressortir avec un serveur SMTP (du type smtp.fournisseur.fr), un serveur IMAP (du type imap.fournisseur.fr) et leurs ports.",
        ],
      },
      {
        title: "Regardez quel mot de passe est attendu",
        body: [
          "Si votre fournisseur parle de « mot de passe d'application », de « mot de passe spécifique » ou de « mot de passe d'appareil », c'est celui-là qu'il faut créer et utiliser. Sinon, c'est le mot de passe de la boîte.",
        ],
      },
      {
        title: "Vérifiez que l'accès IMAP est activé",
        body: [
          "Certaines messageries le coupent par défaut. Le réglage se trouve dans les paramètres du webmail, sous un nom comme « POP/IMAP », « Synchronisation » ou « Accès par des applications ».",
        ],
      },
    ],
    errors: [
      {
        symptom: "Votre fournisseur ne propose que POP, ou seulement sa propre application",
        fix: "La boîte ne peut pas être connectée : nous avons besoin d'IMAP pour lire les réponses. Utilisez une autre adresse.",
      },
      {
        symptom:
          "Votre fournisseur impose une connexion par fenêtre (bouton « Se connecter avec… »)",
        fix: "C'est une connexion sans mot de passe à recopier, que nous ne proposons pas encore. Utilisez une autre adresse.",
      },
      {
        symptom: "Le certificat ne correspond pas au nom du serveur",
        fix: "Utilisez le nom de serveur donné par votre fournisseur, pas mail.votre-site.fr.",
      },
      {
        symptom: "Le serveur ne répond pas",
        fix: "Vérifiez le port. Pour l'envoi : 465 ou 587. Pour la lecture : 993.",
      },
    ],
    sources: [],
  },
];
