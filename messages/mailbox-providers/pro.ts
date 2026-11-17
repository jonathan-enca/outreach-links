import type { ProviderGuide } from "../mailbox-guides";

/** Suites de messagerie d'entreprise : l'adresse est au nom de domaine de l'entreprise. */
export const suites: readonly ProviderGuide[] = [
  {
    slug: "google-workspace",
    name: "Google Workspace",
    scope: "Adresse professionnelle gérée par Google (Gmail d'entreprise)",
    group: "hebergeur",
    domains: [],
    compatible: true,
    server: {
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      imapHost: "imap.gmail.com",
      imapPort: 993,
    },
    username: "Votre adresse professionnelle complète",
    password: "application",
    passwordHint:
      "Le code de 16 caractères créé par Google pour cette connexion. Votre mot de passe habituel est refusé.",
    intro:
      "Une adresse Google Workspace se connecte comme une adresse Gmail, avec un mot de passe d'application. Deux réglages de l'administrateur peuvent toutefois l'empêcher.",
    duration: "5 à 10 minutes",
    needs: [
      "La validation en deux étapes activée sur votre compte. Si Google ne vous la propose pas, l'administrateur doit l'autoriser (voir « Si le test échoue »).",
      "Si vous êtes seul dans votre entreprise, l'administrateur, c'est vous : la console d'administration est à l'adresse admin.google.com.",
    ],
    steps: [
      {
        title: "Activez la validation en deux étapes",
        body: [
          "Ouvrez votre compte Google professionnel, rubrique « Sécurité et connexion ». Sous « Comment vous connecter à Google », cliquez sur « Activer la validation en deux étapes ».",
        ],
        link: { label: "Ouvrir mon compte Google", href: "https://myaccount.google.com/" },
      },
      {
        title: "Ouvrez la page des mots de passe d'application",
        body: [
          "Passez par le lien direct en étant connecté avec votre adresse professionnelle. Google vous redemande votre mot de passe habituel.",
        ],
        link: {
          label: "Ouvrir les mots de passe d'application Google",
          href: "https://myaccount.google.com/apppasswords",
        },
      },
      {
        title: "Créez le mot de passe et copiez-le",
        body: [
          "Donnez-lui un nom qui vous parle, puis validez. Google affiche un code de 16 caractères, une seule fois : copiez-le tout de suite.",
        ],
      },
    ],
    errors: [
      {
        symptom:
          "Google ne propose ni la validation en deux étapes ni les mots de passe d'application",
        fix: "L'administrateur doit l'autoriser. Dans la console d'administration : « Sécurité », « Authentification », « Validation en deux étapes », cocher « Autoriser les utilisateurs à activer la validation en deux étapes ». La méthode ne doit pas être « Clé de sécurité uniquement », qui désactive les mots de passe d'application.",
      },
      {
        symptom: "L'envoi fonctionne mais la lecture est refusée",
        fix: "L'accès IMAP est coupé pour votre organisation. Dans la console d'administration : « Applications », « Google Workspace », « Gmail », « Accès des utilisateurs finaux », « Accès POP et IMAP », activer l'accès IMAP pour tous les utilisateurs, avec « Autoriser n'importe quel client de messagerie ».",
      },
      {
        symptom: "« Username and Password not accepted » (erreur 535)",
        fix: "Le mot de passe collé n'est pas le code de 16 caractères. Depuis 2025, Google Workspace refuse le mot de passe habituel dans toute application extérieure.",
      },
    ],
    notes: [
      "Google Workspace autorise 2 000 messages par jour et par utilisateur (500 pendant la période d'essai).",
      "Vous utilisez Google Workspace acheté par l'intermédiaire de Wix, Squarespace ou d'un autre prestataire : c'est le même guide.",
    ],
    sources: [
      {
        label: "Google : se connecter avec des mots de passe d'application",
        href: "https://support.google.com/accounts/answer/185833?hl=fr",
      },
      {
        label: "Google Workspace : fin des applications moins sécurisées",
        href: "https://knowledge.workspace.google.com/admin/sync/transition-from-less-secure-apps-to-oauth?hl=fr",
      },
      {
        label: "Google Workspace : déployer la validation en deux étapes",
        href: "https://knowledge.workspace.google.com/admin/security/deploy-2-step-verification?hl=fr",
      },
      {
        label: "Google Workspace : activer ou désactiver POP et IMAP",
        href: "https://knowledge.workspace.google.com/admin/sync/turn-pop-and-imap-on-or-off-for-users?hl=fr",
      },
    ],
  },
  {
    slug: "microsoft-365",
    name: "Microsoft 365",
    scope: "Adresse professionnelle gérée par Microsoft (Exchange Online, Outlook d'entreprise)",
    group: "hebergeur",
    domains: [],
    hostSuffixes: ["office365.com"],
    compatible: false,
    username: "",
    password: "application",
    passwordHint: "",
    intro:
      "Microsoft a coupé la lecture des boîtes Microsoft 365 par mot de passe, pour toutes les entreprises et sans dérogation possible. Une telle boîte ne peut pas encore être connectée.",
    duration: "",
    needs: [
      "Pour lire les réponses, il nous faut un accès IMAP. Microsoft l'a fermé aux connexions par mot de passe dans toutes les organisations ; ni votre administrateur ni le support Microsoft ne peuvent le rouvrir. Les mots de passe d'application sont concernés aussi.",
      "L'envoi par mot de passe fonctionne encore dans certaines organisations, mais Microsoft le désactive par défaut à partir de fin décembre 2026. Sans lecture des réponses, il ne nous suffirait de toute façon pas.",
      "Notre connexion fonctionne aujourd'hui par mot de passe. La connexion directe par compte Microsoft est prévue, sans date annoncée.",
    ],
    steps: [],
    errors: [],
    alternatives: [
      "Créer une adresse dédiée à vos demandes de liens chez l'hébergeur de votre nom de domaine (OVHcloud, IONOS, o2switch…), si votre offre en comprend. Attention : un nom de domaine ne peut faire arriver son courrier que chez un seul service ; demandez à votre hébergeur avant de changer quoi que ce soit.",
      "Plus simple : connecter une adresse Gmail ou Yahoo le temps que la connexion par compte Microsoft arrive. Chacune a son guide.",
    ],
    sources: [
      {
        label: "Microsoft : fin de l'authentification de base dans Exchange Online",
        href: "https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-basic-authentication-exchange-online",
      },
      {
        label: "Microsoft : calendrier de fin de l'envoi SMTP par mot de passe",
        href: "https://techcommunity.microsoft.com/blog/Exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835",
      },
    ],
  },
];

/** Autres services de messagerie professionnelle. */
export const autresPros: readonly ProviderGuide[] = [
  {
    slug: "lws",
    name: "LWS",
    scope: "Boîtes des offres LWS Panel",
    group: "hebergeur",
    domains: [],
    hostSuffixes: ["lwspanel.com"],
    compatible: true,
    defaultSmtpPort: 465,
    serverHint:
      "Le serveur est propre à votre compte, du type mail26.lwspanel.com : il se lit dans votre espace client. Le même sert pour l'envoi (port 465) et la lecture (port 993).",
    username: "Votre adresse complète (prenom@votre-site.fr)",
    password: "boite",
    passwordHint: "Le mot de passe de cette adresse, pas celui de votre espace client LWS.",
    intro:
      "Chez LWS, le nom du serveur change d'un compte à l'autre : il faut le lire dans l'espace client. Le mot de passe est celui de l'adresse.",
    duration: "5 minutes",
    needs: ["L'accès à votre espace client LWS."],
    steps: [
      {
        title: "Lisez les réglages de votre adresse",
        body: [
          "Dans l'espace client LWS, ouvrez le service de votre nom de domaine, puis la gestion des adresses e-mail. Sur la ligne de l'adresse, le menu d'actions donne accès aux paramètres de configuration : notez le nom du serveur.",
        ],
        link: { label: "Ouvrir l'espace client LWS", href: "https://panel.lws.fr" },
      },
      {
        title: "Retrouvez le mot de passe de l'adresse",
        body: [
          "C'est celui que vous tapez sur le webmail de LWS. S'il est oublié, il se redéfinit au même endroit de l'espace client.",
        ],
      },
    ],
    errors: [
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "L'identifiant est l'adresse complète, et le mot de passe celui de l'adresse.",
      },
      {
        symptom: "Vous avez une offre cPanel ou un serveur VPS chez LWS",
        fix: "Les serveurs sont différents : cPanel les affiche dans « Comptes de messagerie », bouton de connexion des appareils en face de l'adresse.",
      },
    ],
    notes: [
      "LWS limite les envois par boîte : de 60 à 240 messages par heure selon l'offre. Notre rythme reste en dessous.",
    ],
    sources: [
      {
        label: "LWS : quels ports utiliser pour configurer une adresse e-mail",
        href: "https://aide.lws.fr/base/Email/outllook-thunderbird-iphone/Quels-ports-utiliser-pour-la-configuration-dune-adresse-email",
      },
      {
        label: "LWS : limites d'envoi des offres mutualisées",
        href: "https://help.lws.net/en/Email-quotas-limits-for-shared-web-hosting-packages",
      },
    ],
  },
  {
    slug: "zoho",
    name: "Zoho Mail",
    scope: "Adresses @zohomail.com, @zohomail.eu ou à votre nom de domaine",
    group: "hebergeur",
    domains: ["zohomail.com", "zohomail.eu"],
    hostSuffixes: ["zoho.com", "zoho.eu"],
    compatible: true,
    defaultSmtpPort: 465,
    serverHint:
      "Les serveurs Zoho dépendent de votre offre et de la région de votre compte : par exemple smtppro.zoho.eu et imappro.zoho.eu pour un compte payant hébergé en Europe. Recopiez ceux qu'affiche votre compte (étape 1). Ports : 465 pour l'envoi, 993 pour la lecture.",
    username: "Votre adresse Zoho complète",
    password: "boite",
    passwordHint:
      "Votre mot de passe Zoho. Si la double authentification est activée, un mot de passe d'application à la place.",
    intro:
      "Chez Zoho, il faut activer l'accès IMAP et recopier les serveurs propres à votre compte. L'offre gratuite ne permet pas cette connexion.",
    duration: "10 minutes",
    needs: [
      "Une offre payante : pour les comptes gratuits récents, Zoho ne propose pas l'accès IMAP.",
      "Votre mot de passe Zoho.",
    ],
    steps: [
      {
        title: "Activez l'accès IMAP et notez vos serveurs",
        body: [
          "Dans Zoho Mail, ouvrez « Settings » (Paramètres), puis « Mail Accounts » (Comptes de messagerie), et cliquez sur votre adresse principale. Dans la partie IMAP, cochez « IMAP Access » (Accès IMAP), puis « Save » (Enregistrer).",
          "La même page affiche le serveur IMAP et le serveur SMTP de votre compte : notez-les.",
        ],
        link: {
          label: "Aide Zoho : accès IMAP",
          href: "https://www.zoho.com/fr/mail/help/imap-access.html",
        },
      },
      {
        title: "Si vous utilisez la double authentification : créez un mot de passe d'application",
        body: [
          "Dans votre compte Zoho, rubrique « Security », ouvrez « App passwords », cliquez sur « Generate New Password », donnez un nom et validez avec « Generate ». Il n'est affiché qu'une seule fois.",
          "Sans double authentification, votre mot de passe Zoho habituel suffit.",
        ],
        link: {
          label: "Ouvrir les mots de passe d'application Zoho",
          href: "https://accounts.zoho.com/home#security/app_password",
        },
      },
    ],
    errors: [
      {
        symptom: "Le serveur ne répond pas ou refuse la connexion",
        fix: "Vous n'utilisez pas les serveurs de votre région. Un compte hébergé en Europe ne se connecte pas aux serveurs en .com : recopiez ceux de l'étape 1.",
      },
      {
        symptom: "« Authentication Failure »",
        fix: "L'identifiant n'est pas l'adresse complète, le mot de passe est faux, ou la double authentification exige un mot de passe d'application.",
      },
      {
        symptom: "« Relaying Disallowed »",
        fix: "L'adresse d'envoi indiquée ne correspond pas au compte Zoho connecté. L'adresse d'envoi et l'identifiant doivent être la même adresse.",
      },
    ],
    notes: [
      "Zoho ne publie pas de limite d'envoi chiffrée : elle dépend de l'ancienneté du compte.",
    ],
    sources: [
      { label: "Zoho : accès IMAP", href: "https://www.zoho.com/fr/mail/help/imap-access.html" },
      { label: "Zoho : configuration SMTP", href: "https://www.zoho.com/mail/help/zoho-smtp.html" },
      {
        label: "Zoho : double authentification et mots de passe d'application",
        href: "https://www.zoho.com/mail/help/adminconsole/two-factor-authentication.html",
      },
    ],
  },
];
