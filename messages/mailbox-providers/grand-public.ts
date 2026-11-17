import type { ProviderGuide } from "../mailbox-guides";

/** Grandes messageries : l'adresse désigne le service (gmail.com, yahoo.fr…). */
export const grandPublic: readonly ProviderGuide[] = [
  {
    slug: "gmail",
    name: "Gmail",
    scope: "Adresses @gmail.com",
    group: "grandPublic",
    domains: ["gmail.com", "googlemail.com"],
    hostSuffixes: ["gmail.com"],
    compatible: true,
    server: {
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      imapHost: "imap.gmail.com",
      imapPort: 993,
    },
    username: "Votre adresse Gmail complète",
    password: "application",
    passwordHint:
      "Le code de 16 caractères créé par Google pour cette connexion. Votre mot de passe Google habituel est refusé.",
    intro:
      "Google refuse votre mot de passe habituel dans une application extérieure. Il faut créer un mot de passe d'application : un code de 16 caractères réservé à cette connexion.",
    duration: "5 minutes",
    needs: [
      "La validation en deux étapes activée sur votre compte Google (l'étape 1 l'active si besoin). Sans elle, Google ne propose pas les mots de passe d'application.",
      "Votre téléphone à portée de main : Google peut vous demander de confirmer que c'est bien vous.",
    ],
    steps: [
      {
        title: "Activez la validation en deux étapes",
        body: [
          "Ouvrez votre compte Google, rubrique « Sécurité et connexion ». Sous « Comment vous connecter à Google », cliquez sur « Activer la validation en deux étapes » et suivez les écrans.",
          "Si elle est déjà activée, passez à l'étape suivante.",
        ],
        link: { label: "Ouvrir mon compte Google", href: "https://myaccount.google.com/" },
      },
      {
        title: "Ouvrez la page des mots de passe d'application",
        body: [
          "Cette page n'apparaît pas toujours dans les menus : le plus sûr est d'y aller par le lien direct. Google vous redemande votre mot de passe habituel avant de l'afficher.",
        ],
        link: {
          label: "Ouvrir les mots de passe d'application Google",
          href: "https://myaccount.google.com/apppasswords",
        },
      },
      {
        title: "Créez le mot de passe",
        body: [
          "Donnez-lui un nom qui vous parle, par exemple « Demandes de liens », puis validez. Le nom sert seulement à le reconnaître plus tard dans la liste.",
          "Google affiche alors un code de 16 caractères.",
        ],
      },
      {
        title: "Copiez le code tout de suite",
        body: [
          "Il n'est affiché qu'une seule fois. S'il est perdu, ce n'est pas grave : supprimez-le dans la liste et créez-en un autre.",
        ],
      },
    ],
    errors: [
      {
        symptom:
          "Google dit que les mots de passe d'application ne sont pas disponibles pour votre compte",
        fix: "Trois causes possibles : la validation en deux étapes n'est pas activée, elle repose uniquement sur une clé de sécurité, ou la Protection Avancée est activée. Si l'adresse est celle de votre entreprise ou de votre école, suivez plutôt le guide Google Workspace.",
      },
      {
        symptom: "« Username and Password not accepted » (erreur 535)",
        fix: "Le mot de passe collé n'est pas le bon. C'est presque toujours le mot de passe Google habituel à la place du code de 16 caractères. Créez un nouveau mot de passe d'application et reconnectez la boîte.",
      },
      {
        symptom: "« Application-specific password required » (erreur 534)",
        fix: "Google confirme qu'il attend un mot de passe d'application : reprenez à l'étape 2.",
      },
      {
        symptom: "La connexion fonctionnait, puis s'est arrêtée",
        fix: "Changer le mot de passe de votre compte Google supprime tous les mots de passe d'application. Créez-en un nouveau, supprimez la boîte dans les réglages et reconnectez-la.",
      },
    ],
    notes: [
      "Google limite un compte Gmail à 500 messages par jour. Notre rythme reste très en dessous.",
      "Vous pouvez supprimer ce mot de passe d'application à tout moment depuis la même page : la connexion s'arrête aussitôt, sans toucher à votre mot de passe habituel.",
    ],
    sources: [
      {
        label: "Google : se connecter avec des mots de passe d'application",
        href: "https://support.google.com/accounts/answer/185833?hl=fr",
      },
      {
        label: "Google : activer la validation en deux étapes",
        href: "https://support.google.com/accounts/answer/185839?hl=fr",
      },
      {
        label: "Google : ajouter Gmail à un autre client de messagerie",
        href: "https://support.google.com/mail/answer/7126229?hl=fr",
      },
      {
        label: "Google : limites d'envoi de Gmail",
        href: "https://support.google.com/mail/answer/22839?hl=fr",
      },
    ],
  },
  {
    slug: "outlook",
    name: "Outlook et Hotmail",
    scope: "Adresses @outlook.fr, @outlook.com, @hotmail.fr, @hotmail.com, @live.fr, @msn.com",
    group: "grandPublic",
    domains: [
      "outlook.com",
      "outlook.fr",
      "hotmail.com",
      "hotmail.fr",
      "live.com",
      "live.fr",
      "msn.com",
    ],
    hostSuffixes: ["outlook.com"],
    compatible: false,
    username: "",
    password: "application",
    passwordHint: "",
    intro:
      "Depuis le 16 septembre 2024, Microsoft n'accepte plus la connexion par mot de passe pour les boîtes Outlook, Hotmail, Live et MSN. Une telle boîte ne peut pas encore être connectée.",
    duration: "",
    needs: [
      "Microsoft impose désormais sa propre fenêtre de connexion (« authentification moderne ») pour l'envoi comme pour la lecture. Un mot de passe recopié dans une application, même un mot de passe d'application, est refusé.",
      "Notre connexion fonctionne aujourd'hui par mot de passe. La connexion directe par compte Microsoft est prévue, sans date annoncée.",
    ],
    steps: [],
    errors: [],
    alternatives: [
      "Le mieux : utiliser une adresse au nom de votre site (prenom@votre-site.fr), chez l'hébergeur de votre nom de domaine. Une demande de lien envoyée depuis l'adresse du site inspire davantage confiance.",
      "Sinon : connecter une adresse Gmail, Yahoo ou celle de votre opérateur. Chacune a son guide.",
    ],
    sources: [
      {
        label: "Microsoft : paramètres POP, IMAP et SMTP pour Outlook.com",
        href: "https://support.microsoft.com/fr-fr/office/param%C3%A8tres-pop-imap-et-smtp-pour-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040",
      },
      {
        label: "Microsoft : l'authentification moderne est désormais requise",
        href: "https://support.microsoft.com/fr-FR/Support/known-issues/modern-authentication-methods-now-needed-to-continue-syncing-outlook-email-in-non-microsoft-email-ap",
      },
    ],
  },
  {
    slug: "yahoo",
    name: "Yahoo Mail",
    scope: "Adresses @yahoo.fr, @yahoo.com, @ymail.com",
    group: "grandPublic",
    domains: ["yahoo.fr", "yahoo.com", "ymail.com", "rocketmail.com"],
    hostSuffixes: ["yahoo.com"],
    compatible: true,
    server: {
      smtpHost: "smtp.mail.yahoo.com",
      smtpPort: 465,
      imapHost: "imap.mail.yahoo.com",
      imapPort: 993,
    },
    username: "Votre adresse Yahoo complète",
    password: "application",
    passwordHint:
      "Le mot de passe d'application créé chez Yahoo pour cette connexion, pas votre mot de passe habituel.",
    intro:
      "Yahoo demande un mot de passe d'application : un mot de passe créé exprès pour cette connexion, depuis la page de sécurité de votre compte.",
    duration: "5 minutes",
    needs: [
      "Un navigateur dans lequel vous êtes connecté à Yahoo depuis plusieurs jours, hors navigation privée. Yahoo refuse de créer un mot de passe d'application depuis un appareil qu'il ne connaît pas encore.",
    ],
    steps: [
      {
        title: "Ouvrez la page de sécurité de votre compte Yahoo",
        body: ["Connectez-vous si Yahoo le demande."],
        link: {
          label: "Ouvrir la sécurité du compte Yahoo",
          href: "https://login.yahoo.com/account/security",
        },
      },
      {
        title: "Créez le mot de passe d'application",
        body: [
          "Dans la partie « Connexions externes », cliquez sur « Créer un mot de passe d'application ». Saisissez un nom qui vous parle, par exemple « Demandes de liens », puis cliquez sur « Générer le mot de passe ».",
        ],
      },
      {
        title: "Copiez le mot de passe, puis cliquez sur « Terminé »",
        body: [
          "Il n'est affiché qu'une seule fois. S'il est perdu, supprimez-le et créez-en un autre.",
        ],
      },
    ],
    errors: [
      {
        symptom: "Yahoo ne propose pas de créer un mot de passe d'application",
        fix: "Yahoo vérifie que l'appareil lui est familier. Réessayez depuis le navigateur où vous lisez vos messages Yahoo d'habitude, hors navigation privée, en restant connecté quelques jours si le compte vient d'être ouvert sur cet appareil.",
      },
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "Vérifiez que vous avez collé le mot de passe d'application et non votre mot de passe Yahoo, et que l'identifiant est l'adresse complète.",
      },
    ],
    notes: [
      "Un mot de passe d'application Yahoo reste valable même si vous changez votre mot de passe habituel. Pour couper la connexion, supprimez-le dans la page de sécurité.",
      "Yahoo ne publie pas de limite d'envoi chiffrée.",
    ],
    sources: [
      {
        label: "Yahoo : paramètres IMAP et SMTP",
        href: "https://fr.aide.yahoo.com/kb/SLN4075.html",
      },
      {
        label: "Yahoo : créer et gérer les mots de passe d'application",
        href: "https://fr.aide.yahoo.com/kb/SLN15241.html",
      },
    ],
  },
  {
    slug: "icloud",
    name: "iCloud Mail",
    scope: "Adresses @icloud.com, @me.com, @mac.com",
    group: "grandPublic",
    domains: ["icloud.com", "me.com", "mac.com"],
    hostSuffixes: ["mail.me.com"],
    compatible: true,
    server: {
      smtpHost: "smtp.mail.me.com",
      smtpPort: 587,
      imapHost: "imap.mail.me.com",
      imapPort: 993,
    },
    username:
      "Votre adresse iCloud complète. Si la lecture échoue, essayez seulement la partie avant le @.",
    password: "application",
    passwordHint:
      "Le mot de passe pour application créé sur votre compte Apple, pas le mot de passe de votre compte.",
    intro:
      "Apple demande un mot de passe pour application : un mot de passe créé exprès pour cette connexion, depuis la page de votre compte Apple.",
    duration: "5 minutes",
    needs: [
      "L'identification à deux facteurs activée sur votre compte Apple. C'est le cas de presque tous les comptes récents.",
    ],
    steps: [
      {
        title: "Connectez-vous à votre compte Apple",
        body: ["Utilisez l'identifiant et le mot de passe de votre compte Apple."],
        link: { label: "Ouvrir mon compte Apple", href: "https://account.apple.com" },
      },
      {
        title: "Créez le mot de passe pour application",
        body: [
          "Dans la rubrique « Connexion et sécurité », choisissez « Mots de passe pour applications », puis « Générer un mot de passe pour application ». Donnez-lui un nom qui vous parle et suivez les écrans.",
        ],
      },
      {
        title: "Copiez le mot de passe tout de suite",
        body: ["Il n'est affiché qu'une seule fois. S'il est perdu, créez-en un autre."],
      },
    ],
    errors: [
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "Vérifiez que vous avez collé le mot de passe pour application et non celui de votre compte Apple. Si l'envoi passe mais pas la lecture, ouvrez « Identifiant et serveurs » et remplacez l'identifiant par la partie de l'adresse avant le @.",
      },
      {
        symptom: "La connexion fonctionnait, puis s'est arrêtée",
        fix: "Changer le mot de passe de votre compte Apple supprime tous les mots de passe pour application. Créez-en un nouveau, supprimez la boîte dans les réglages et reconnectez-la.",
      },
    ],
    notes: [
      "Apple limite iCloud Mail à 1 000 messages par jour. Notre rythme reste très en dessous.",
    ],
    sources: [
      {
        label: "Apple : réglages du serveur de messagerie iCloud",
        href: "https://support.apple.com/fr-fr/102525",
      },
      {
        label: "Apple : se connecter avec des mots de passe pour application",
        href: "https://support.apple.com/fr-fr/102654",
      },
      { label: "Apple : limites d'iCloud Mail", href: "https://support.apple.com/fr-fr/102198" },
    ],
  },
  {
    slug: "gmx",
    name: "GMX",
    scope: "Adresses @gmx.fr, @gmx.com",
    group: "grandPublic",
    domains: ["gmx.fr", "gmx.com"],
    hostSuffixes: ["gmx.com"],
    compatible: true,
    server: { smtpHost: "mail.gmx.com", smtpPort: 587, imapHost: "imap.gmx.com", imapPort: 993 },
    username: "Votre adresse GMX complète",
    password: "boite",
    passwordHint:
      "Votre mot de passe GMX. Si la double authentification est activée sur votre compte, un mot de passe spécifique aux applications à la place.",
    intro:
      "Chez GMX, l'accès par une application extérieure est coupé par défaut : il faut l'activer une fois dans les paramètres de la messagerie.",
    duration: "5 minutes",
    needs: ["Votre mot de passe GMX."],
    steps: [
      {
        title: "Activez l'accès POP3/IMAP",
        body: [
          "Connectez-vous à GMX, ouvrez l'onglet « E-mail », puis « Paramètres » et « Fonctions POP3/IMAP ». Cochez « Envoyer et recevoir des emails via des programmes externes (Outlook, Thunderbird) », puis cliquez sur « Sauvegarder ».",
        ],
        link: {
          label: "Aide GMX : activer POP3 et IMAP",
          href: "https://support.gmx.fr/pop-imap/toggle.html",
        },
      },
      {
        title: "Si vous utilisez la double authentification : créez un mot de passe spécifique",
        body: [
          "Cliquez sur l'icône de profil en haut à droite, puis sur « Options de sécurité » et « Gérer les mots de passe spécifiques aux applications ». Choisissez « Créer un nouveau mot de passe propre à une application », donnez-lui un nom et cliquez sur « Continuer ». Il n'est affiché qu'une seule fois.",
          "Sans double authentification, votre mot de passe GMX habituel suffit.",
        ],
        link: {
          label: "Aide GMX : mots de passe spécifiques aux applications",
          href: "https://support.gmx.fr/security/2fa/application-specific-passwords.html",
        },
      },
    ],
    errors: [
      {
        symptom: "Identifiant ou mot de passe refusé alors qu'ils sont justes",
        fix: "L'accès POP3/IMAP est coupé. GMX le désactive aussi de lui-même après une longue période sans utilisation : refaites l'étape 1.",
      },
    ],
    sources: [
      {
        label: "GMX : serveurs IMAP et SMTP",
        href: "https://support.gmx.fr/pop-imap/imap/server.html",
      },
      { label: "GMX : activer POP3 et IMAP", href: "https://support.gmx.fr/pop-imap/toggle.html" },
    ],
  },
  {
    slug: "aol",
    name: "AOL Mail",
    scope: "Adresses @aol.com, @aol.fr",
    group: "grandPublic",
    domains: ["aol.com", "aol.fr"],
    hostSuffixes: ["aol.com"],
    compatible: true,
    server: { smtpHost: "smtp.aol.com", smtpPort: 465, imapHost: "imap.aol.com", imapPort: 993 },
    username: "Votre adresse AOL complète",
    password: "application",
    passwordHint:
      "Le mot de passe d'application créé chez AOL pour cette connexion, pas votre mot de passe habituel.",
    intro:
      "AOL fonctionne comme Yahoo : il faut créer un mot de passe d'application depuis la page de sécurité du compte. Cette page est en anglais.",
    duration: "5 minutes",
    needs: [
      "Un navigateur dans lequel vous êtes connecté à AOL depuis plusieurs jours, hors navigation privée.",
    ],
    steps: [
      {
        title: "Ouvrez la page de sécurité de votre compte AOL",
        body: ["Connectez-vous si AOL le demande."],
        link: {
          label: "Ouvrir la sécurité du compte AOL",
          href: "https://login.aol.com/myaccount/security",
        },
      },
      {
        title: "Créez le mot de passe d'application",
        body: [
          "Cliquez sur « Generate app password », puis sur « Get Started ». Saisissez un nom qui vous parle et cliquez sur « Generate password ».",
        ],
      },
      {
        title: "Copiez le mot de passe, puis cliquez sur « Done »",
        body: ["Il n'est affiché qu'une seule fois."],
      },
    ],
    errors: [
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "Vérifiez que vous avez collé le mot de passe d'application et non votre mot de passe AOL, et que l'identifiant est l'adresse complète.",
      },
    ],
    sources: [
      {
        label: "AOL : utiliser une autre application de messagerie",
        href: "https://help.aol.com/articles/how-do-i-use-other-email-applications-to-send-and-receive-my-aol-mail",
      },
      {
        label: "AOL : créer et gérer un mot de passe d'application",
        href: "https://help.aol.com/articles/create-and-manage-app-password",
      },
    ],
  },
  {
    slug: "mailo",
    name: "Mailo",
    scope: "Adresses @mailo.com, @net-c.com, @netcourrier.com",
    group: "grandPublic",
    domains: ["mailo.com", "net-c.com", "netcourrier.com"],
    hostSuffixes: ["mailo.com"],
    compatible: true,
    server: {
      smtpHost: "mail.mailo.com",
      smtpPort: 465,
      imapHost: "mail.mailo.com",
      imapPort: 993,
    },
    username: "Votre adresse complète",
    password: "boite",
    passwordHint:
      "Le mot de passe de votre compte Mailo, ou un mot de passe d'application si vous en avez créé un.",
    intro:
      "Chez Mailo, le mot de passe du compte suffit le plus souvent. Un réglage de synchronisation peut toutefois exiger un mot de passe d'application.",
    duration: "5 minutes",
    needs: ["Votre mot de passe Mailo."],
    steps: [
      {
        title: "Vérifiez que l'accès IMAP et SMTP est autorisé",
        body: [
          "Dans Mailo, ouvrez « Options » (la roue dentée en haut à droite), puis « Synchronisation » et « Protocoles de synchronisation ». IMAP et SMTP doivent être activés.",
          "S'ils sont réglés sur « mots de passe d'application uniquement », créez-en un à l'étape suivante.",
        ],
        link: {
          label: "Aide Mailo : adresses des serveurs",
          href: "https://faq.mailo.com/synchronisation/adresses-des-serveurs-pour-parametrer-mailo-sur-iphone-android-ou-logiciel.htm",
        },
      },
      {
        title: "Au besoin, créez un mot de passe d'application",
        body: [
          "Dans « Options », rubrique « Sécurité », section « Mots de passe d'application », cliquez sur « Configurer ». Remplissez le champ « Description », puis cliquez sur « Générer un mot de passe ». Il n'est affiché qu'une seule fois.",
        ],
        link: {
          label: "Aide Mailo : créer un mot de passe d'application",
          href: "https://faq.mailo.com/acces/creer-un-mot-de-passe-application.htm",
        },
      },
    ],
    errors: [
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "Si le mot de passe du compte est refusé, vos protocoles sont réglés pour n'accepter que les mots de passe d'application : faites l'étape 2.",
      },
    ],
    sources: [
      {
        label: "Mailo : configurer un logiciel de messagerie",
        href: "https://faq.mailo.com/synchronisation/configurer-mailo-dans-thunderbird-mobile.htm",
      },
      {
        label: "Mailo : créer un mot de passe d'application",
        href: "https://faq.mailo.com/acces/creer-un-mot-de-passe-application.htm",
      },
    ],
  },
  {
    slug: "proton",
    name: "Proton Mail",
    scope: "Adresses @proton.me, @protonmail.com, @pm.me",
    group: "grandPublic",
    domains: ["proton.me", "protonmail.com", "protonmail.ch", "pm.me"],
    hostSuffixes: ["protonmail.ch"],
    compatible: false,
    username: "",
    password: "application",
    passwordHint: "",
    intro:
      "Une boîte Proton Mail ne peut pas être connectée : Proton ne laisse aucune application extérieure lire les messages sans un logiciel installé sur votre ordinateur.",
    duration: "",
    needs: [
      "Proton chiffre les messages. Pour les lire depuis une autre application, il impose Proton Mail Bridge, un logiciel qui tourne sur votre propre ordinateur. Notre service tourne sur un serveur : il ne peut pas l'utiliser.",
      "Proton propose bien un envoi seul (par jeton SMTP, sur les offres payantes avec nom de domaine), mais sans lecture. Or nous devons lire les réponses pour arrêter les relances dès qu'on vous répond.",
    ],
    steps: [],
    errors: [],
    alternatives: [
      "Utiliser une adresse au nom de votre site, chez l'hébergeur de votre nom de domaine.",
      "Sinon : connecter une adresse Gmail, Yahoo ou celle de votre opérateur. Chacune a son guide.",
    ],
    sources: [
      {
        label: "Proton : configuration IMAP, SMTP et POP3",
        href: "https://proton.me/support/imap-smtp-and-pop3-setup",
      },
      {
        label: "Proton : envoi par jeton SMTP",
        href: "https://proton.me/fr/support/smtp-submission",
      },
    ],
  },
  {
    slug: "tuta",
    name: "Tuta",
    scope: "Adresses @tuta.com, @tutanota.com, @tutamail.com",
    group: "grandPublic",
    domains: ["tuta.com", "tutanota.com", "tutamail.com", "tuta.io", "keemail.me"],
    compatible: false,
    username: "",
    password: "application",
    passwordHint: "",
    intro:
      "Une boîte Tuta ne peut pas être connectée : Tuta n'ouvre ses messages à aucune application extérieure.",
    duration: "",
    needs: [
      "Tuta chiffre les messages de bout en bout et ne propose pas d'accès IMAP, quelle que soit l'offre. Seules ses propres applications peuvent lire et envoyer.",
    ],
    steps: [],
    errors: [],
    alternatives: [
      "Utiliser une adresse au nom de votre site, chez l'hébergeur de votre nom de domaine.",
      "Sinon : connecter une adresse Gmail, Yahoo ou celle de votre opérateur. Chacune a son guide.",
    ],
    sources: [
      {
        label: "Tuta : pourquoi Tuta ne propose pas IMAP",
        href: "https://tuta.com/blog/tuta-add-on-in-thunderbird",
      },
    ],
  },
];
