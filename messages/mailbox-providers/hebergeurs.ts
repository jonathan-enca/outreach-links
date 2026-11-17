import type { ProviderGuide } from "../mailbox-guides";

/** Boîtes à son propre nom de domaine, chez l'hébergeur du domaine. */
export const hebergeurs: readonly ProviderGuide[] = [
  {
    slug: "ovh",
    name: "OVHcloud",
    scope: "MX Plan, Zimbra Mail, Email Pro, Exchange",
    group: "hebergeur",
    domains: [],
    hostSuffixes: ["ovh.net", "ovh.ca"],
    compatible: true,
    server: { smtpHost: "ssl0.ovh.net", smtpPort: 465, imapHost: "ssl0.ovh.net", imapPort: 993 },
    serverHint:
      "Ces réglages valent pour MX Plan et Zimbra Mail. Avec Email Pro ou Exchange, remplacez les deux serveurs par celui qu'affiche votre espace client (du type pro1.mail.ovh.net ou ex5.mail.ovh.net) et mettez 587 comme port SMTP.",
    username: "Votre adresse complète (prenom@votre-site.fr)",
    password: "boite",
    passwordHint:
      "Le mot de passe de cette adresse, celui du webmail. Pas celui de votre compte client OVHcloud.",
    intro:
      "Chez OVHcloud, c'est le mot de passe de l'adresse elle-même qui sert. Seul le nom du serveur change selon votre offre.",
    duration: "5 minutes",
    needs: [
      "Le mot de passe de l'adresse (celui que vous tapez sur le webmail OVHcloud). Si vous l'avez oublié, l'étape 3 le redéfinit.",
      "L'accès à votre espace client OVHcloud, pour lire votre offre.",
    ],
    steps: [
      {
        title: "Repérez votre offre",
        body: [
          "Dans l'espace client OVHcloud, ouvrez « Web Cloud ». Votre messagerie apparaît dans l'une de ces rubriques : « MX Plan », « Zimbra Mail », « Email Pro » ou « Exchange ».",
        ],
        link: {
          label: "Aide OVHcloud : les offres et leurs réglages",
          href: "https://docs.ovhcloud.com/fr/guides/web-cloud/email-and-collaborative-solutions/mx-plan/email-generalities",
        },
      },
      {
        title: "Notez le nom du serveur",
        body: [
          "MX Plan ou Zimbra Mail : c'est ssl0.ovh.net pour l'envoi comme pour la lecture. Rien à noter, il est déjà rempli.",
          "Email Pro ou Exchange : ouvrez votre service, onglet « Informations générales », cadre « Connexion ». Le serveur ressemble à pro1.mail.ovh.net ou ex5.mail.ovh.net ; le chiffre change d'un compte à l'autre.",
        ],
      },
      {
        title: "Retrouvez ou redéfinissez le mot de passe de l'adresse",
        body: [
          "Un mot de passe oublié ne se retrouve pas : il se redéfinit. Dans votre service, ouvrez l'onglet « Emails » (ou « Comptes e-mail »), cliquez sur « ... » au bout de la ligne de l'adresse, puis sur « Changer le mot de passe » (ou « Modifier »).",
          "Pensez à le mettre à jour aussi sur votre téléphone et votre ordinateur.",
        ],
        link: {
          label: "Aide OVHcloud : modifier le mot de passe d'une adresse",
          href: "https://docs.ovhcloud.com/fr/guides/web-cloud/email-and-collaborative-solutions/mx-plan/email-change-password",
        },
      },
    ],
    errors: [
      {
        symptom: "Identifiant ou mot de passe refusé (erreur 535)",
        fix: "Vérifiez que l'identifiant est l'adresse complète et que le mot de passe est celui de l'adresse, pas celui du compte client. Si les deux sont bons, regardez dans l'espace client la colonne « Statut » ou « Bloqué pour SPAM » de l'adresse : OVHcloud a pu suspendre l'envoi.",
      },
      {
        symptom: "Le serveur ne répond pas",
        fix: "Avec Email Pro ou Exchange, le serveur n'est pas ssl0.ovh.net : recopiez celui du cadre « Connexion » et utilisez le port SMTP 587.",
      },
    ],
    notes: [
      "OVHcloud annonce une limite de 200 messages par heure et par compte. Notre rythme reste très en dessous.",
    ],
    sources: [
      {
        label: "OVHcloud : généralités sur les e-mails MX Plan",
        href: "https://docs.ovhcloud.com/fr/guides/web-cloud/email-and-collaborative-solutions/mx-plan/email-generalities",
      },
      {
        label: "OVHcloud : premiers pas avec Email Pro",
        href: "https://docs.ovhcloud.com/fr/guides/web-cloud/email-and-collaborative-solutions/email-pro/first-config",
      },
      {
        label: "OVHcloud : diagnostic des erreurs d'envoi",
        href: "https://docs.ovhcloud.com/fr/guides/web-cloud/email-and-collaborative-solutions/troubleshooting/diagnostic-advanced",
      },
    ],
  },
  {
    slug: "ionos",
    name: "IONOS",
    scope: "Mail Basic, Mail Business (ex 1&1)",
    group: "hebergeur",
    domains: [],
    hostSuffixes: ["ionos.fr", "ionos.com", "1and1.fr"],
    compatible: true,
    server: { smtpHost: "smtp.ionos.fr", smtpPort: 465, imapHost: "imap.ionos.fr", imapPort: 993 },
    username: "Votre adresse complète (prenom@votre-site.fr)",
    password: "boite",
    passwordHint: "Le mot de passe de cette adresse, pas celui de votre compte client IONOS.",
    intro:
      "Chez IONOS, les serveurs sont les mêmes pour tout le monde et le mot de passe est celui de l'adresse.",
    duration: "3 minutes",
    needs: [
      "Le mot de passe de l'adresse. Si vous l'avez oublié, l'étape ci-dessous le redéfinit (seul le titulaire du contrat peut le faire).",
    ],
    steps: [
      {
        title: "Retrouvez ou redéfinissez le mot de passe de l'adresse",
        body: [
          "Connectez-vous à votre compte IONOS et ouvrez la tuile « Email ». Sur la ligne de l'adresse, cliquez sur la roue dentée de la colonne « Actions », puis sur « Modifier le mot de passe ».",
          "Le nouveau mot de passe est actif en quelques minutes.",
        ],
        link: {
          label: "Aide IONOS : modifier le mot de passe d'un compte e-mail",
          href: "https://www.ionos.fr/assistance/email/depannage-mail-basicmail-business-basicmail/modifier-le-mot-de-passe-dun-compte-e-mail-chez-11-ionos/",
        },
      },
    ],
    errors: [
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "L'identifiant doit être l'adresse complète. Si vous venez de changer le mot de passe, attendez quelques minutes avant de relancer le test.",
      },
      {
        symptom: "Vous avez une boîte Exchange chez IONOS",
        fix: "Les serveurs sont différents : exchange.ionos.eu pour la lecture (port 993) et smtp.exchange.ionos.eu pour l'envoi (port 587). Activez d'abord la fonction IMAP/POP3 dans la gestion de Microsoft Exchange.",
      },
    ],
    notes: [
      "IONOS limite les envois d'une boîte récente (de l'ordre de 50 messages par heure la première semaine). Notre rythme reste en dessous.",
    ],
    sources: [
      {
        label: "IONOS : données de serveur pour IMAP, POP3 et SMTP",
        href: "https://www.ionos.fr/assistance/email/sujets-generaux/messagerie-ionos-donnees-de-serveur-pour-imap-pop3-et-smtp/",
      },
      {
        label: "IONOS : échec de la configuration du programme de messagerie",
        href: "https://www.ionos.fr/assistance/email/depannage-mail-basicmail-business-basicmail/echec-de-la-configuration-du-programme-de-messagerie/",
      },
    ],
  },
  {
    slug: "gandi",
    name: "Gandi",
    scope: "GandiMail",
    group: "hebergeur",
    domains: [],
    hostSuffixes: ["gandi.net"],
    compatible: true,
    server: {
      smtpHost: "mail.gandi.net",
      smtpPort: 465,
      imapHost: "mail.gandi.net",
      imapPort: 993,
    },
    username: "Votre adresse complète (prenom@votre-site.fr)",
    password: "boite",
    passwordHint: "Le mot de passe de cette boîte, pas celui de votre compte Gandi.",
    intro:
      "Chez Gandi, le serveur est le même pour l'envoi et la lecture, et le mot de passe est celui de la boîte.",
    duration: "5 minutes",
    needs: ["Le mot de passe de la boîte. Si vous l'avez oublié, l'étape 2 le redéfinit."],
    steps: [
      {
        title: "Vérifiez que l'accès extérieur est ouvert",
        body: [
          "Connectez-vous au webmail Gandi avec votre adresse, puis ouvrez la page « Paramètres de sécurité ». Dans la section « Accès E-mail », les interrupteurs IMAP et SMTP doivent être activés.",
        ],
        link: {
          label: "Ouvrir les paramètres de sécurité du webmail Gandi",
          href: "https://webmail.gandi.net/settings/login",
        },
      },
      {
        title: "Retrouvez ou redéfinissez le mot de passe de la boîte",
        body: [
          "Dans votre compte Gandi, ouvrez « Nom de domaine », choisissez votre domaine, puis « Boîtes & redirections mail ». Ouvrez la boîte et cliquez sur « Modifier le mot de passe ».",
        ],
        link: {
          label: "Aide Gandi : modifier le mot de passe d'une boîte",
          href: "https://docs.gandi.net/fr/gandimail/operations_courantes/modifier_mot_de_passe.html",
        },
      },
    ],
    errors: [
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "Chez Gandi, la cause la plus fréquente est un identifiant qui n'est pas l'adresse complète. Vérifiez aussi les interrupteurs IMAP et SMTP de l'étape 1.",
      },
    ],
    notes: [
      "Gandi limite chaque message à 40 destinataires et suspend les boîtes utilisées pour de l'envoi en masse. Nos messages partent un par un, à un seul destinataire.",
    ],
    sources: [
      {
        label: "Gandi : configurer un logiciel de messagerie",
        href: "https://docs.gandi.net/fr/gandimail/configuration_messagerie/index.html",
      },
      {
        label: "Gandi : sécurité du webmail et accès e-mail",
        href: "https://docs.gandi.net/fr/gandimail/operations_courantes/gerer_2fa.html",
      },
      {
        label: "Gandi : limites techniques",
        href: "https://docs.gandi.net/fr/gandimail/limitations_techniques.html",
      },
    ],
  },
  {
    slug: "o2switch",
    name: "o2switch",
    scope: "Boîtes créées dans cPanel",
    group: "hebergeur",
    domains: [],
    hostSuffixes: ["o2switch.net"],
    compatible: true,
    defaultSmtpPort: 465,
    serverHint:
      "Le serveur est le même pour l'envoi et la lecture : c'est le nom de votre serveur d'hébergement, qui se termine par .o2switch.net (exemple : machette.o2switch.net). Ports : 465 pour l'envoi, 993 pour la lecture.",
    username: "Votre adresse complète (prenom@votre-site.fr)",
    password: "boite",
    passwordHint: "Le mot de passe de cette adresse, pas celui de votre cPanel.",
    intro:
      "Chez o2switch, le serveur porte le nom de votre hébergement : il faut le lire dans cPanel. Le mot de passe est celui de l'adresse.",
    duration: "5 minutes",
    needs: ["L'accès à votre cPanel o2switch."],
    steps: [
      {
        title: "Lisez le nom de votre serveur",
        body: [
          "Dans cPanel, ouvrez « Comptes de messagerie ». En face de votre adresse, cliquez sur « Connect devices » : la page affiche le serveur entrant et le serveur sortant. C'est le même nom, qui se termine par .o2switch.net.",
          "Ce nom figure aussi dans l'e-mail « Bienvenue chez o2switch » reçu à l'ouverture de votre hébergement.",
        ],
        link: {
          label: "Aide o2switch : les adresses e-mail",
          href: "https://faq.o2switch.fr/cpanel/emails/adresse-email/",
        },
      },
      {
        title: "Retrouvez ou redéfinissez le mot de passe de l'adresse",
        body: [
          "Toujours dans « Comptes de messagerie », cliquez sur « Gérer » en face de l'adresse, saisissez un nouveau mot de passe, puis validez avec « Update email settings ». L'ancien mot de passe n'est pas demandé.",
        ],
      },
    ],
    errors: [
      {
        symptom: "Le certificat ne correspond pas au nom du serveur",
        fix: "Utilisez le nom en .o2switch.net, pas mail.votre-site.fr : le certificat de sécurité est établi au nom du serveur d'hébergement.",
      },
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "L'identifiant est l'adresse complète, et le mot de passe celui de l'adresse (pas celui de cPanel).",
      },
    ],
    sources: [
      {
        label: "o2switch : créer et configurer une adresse e-mail",
        href: "https://faq.o2switch.fr/cpanel/emails/adresse-email/",
      },
      {
        label: "o2switch : serveurs SMTP sortants",
        href: "https://faq.o2switch.fr/guides/emails/serveurs-smtp-sortant/",
      },
    ],
  },
  {
    slug: "infomaniak",
    name: "Infomaniak",
    scope: "kSuite, Service Mail",
    group: "hebergeur",
    domains: ["ik.me", "ikmail.com", "etik.com"],
    hostSuffixes: ["infomaniak.com"],
    compatible: true,
    server: {
      smtpHost: "mail.infomaniak.com",
      smtpPort: 587,
      imapHost: "mail.infomaniak.com",
      imapPort: 993,
    },
    username: "Votre adresse complète",
    password: "application",
    passwordHint:
      "Le mot de passe d'appareil créé dans Infomaniak pour cette adresse. Celui de votre compte Infomaniak ne fonctionne pas ici.",
    intro:
      "Infomaniak demande un mot de passe d'appareil : un mot de passe créé exprès pour cette connexion, distinct de celui de votre compte.",
    duration: "5 minutes",
    needs: [
      "L'accès à la messagerie Infomaniak de cette adresse (ou au Manager, si vous l'administrez).",
    ],
    steps: [
      {
        title: "Ouvrez les paramètres de l'adresse",
        body: [
          "Dans la messagerie Infomaniak, cliquez sur le menu « ⋮ » à droite de votre adresse, puis sur « Paramètres de l'adresse ».",
        ],
        link: {
          label: "Ouvrir la messagerie Infomaniak",
          href: "https://ksuite.infomaniak.com/mail",
        },
      },
      {
        title: "Ajoutez un appareil",
        body: [
          "Dans la partie consacrée au mot de passe, cliquez sur « Gérer », puis sur « Ajouter un appareil ». Choisissez l'onglet « IMAP / SMTP » et lancez la création du mot de passe.",
        ],
        link: {
          label: "Aide Infomaniak : gérer les appareils et leurs mots de passe",
          href: "https://www.infomaniak.com/fr/support/faq/711/gerer-les-appareils-mots-de-passe-depuis-mail-infomaniak",
        },
      },
      {
        title: "Copiez le mot de passe tout de suite",
        body: [
          "Il n'est affiché qu'une seule fois. S'il est perdu, il suffit d'en créer un autre par le même chemin.",
        ],
      },
    ],
    errors: [
      {
        symptom: "Identifiant ou mot de passe refusé (535 authentication failed)",
        fix: "Vous avez sans doute collé le mot de passe de votre compte Infomaniak. Il faut le mot de passe d'appareil de l'étape 2, et l'adresse complète comme identifiant.",
      },
      {
        symptom: "La lecture fonctionne mais l'envoi est refusé",
        fix: "L'administrateur de votre messagerie a pu retirer le droit d'envoi à cette adresse, ou Infomaniak a suspendu l'envoi après un volume inhabituel. Dans ce second cas, un e-mail d'Infomaniak contient le lien de déblocage.",
      },
    ],
    notes: [
      "Infomaniak limite les envois sur 24 heures glissantes : 200 destinataires pour les offres gratuites et Starter, 500 pour les offres payantes.",
    ],
    sources: [
      {
        label: "Infomaniak : synchroniser ses mails (serveurs et ports)",
        href: "https://www.infomaniak.com/fr/support/faq/2427/synchroniser-ses-mails-sur-tous-ses-appareils",
      },
      {
        label: "Infomaniak : ajouter un appareil depuis le Service Mail",
        href: "https://www.infomaniak.com/fr/support/faq/1321/ajouter-un-appareil-creer-un-mot-de-passe-mail-depuis-le-service-mail",
      },
      {
        label: "Infomaniak : limites de mails sortants",
        href: "https://www.infomaniak.com/fr/support/faq/2065/comprendre-les-limites-de-mails-sortants",
      },
    ],
  },
  {
    slug: "hostinger",
    name: "Hostinger",
    scope: "Hostinger Email, Titan Email",
    group: "hebergeur",
    domains: [],
    hostSuffixes: ["hostinger.com", "titan.email"],
    compatible: true,
    server: {
      smtpHost: "smtp.hostinger.com",
      smtpPort: 465,
      imapHost: "imap.hostinger.com",
      imapPort: 993,
    },
    serverHint:
      "Ces réglages valent pour Hostinger Email. Avec Titan Email, remplacez les serveurs par smtp.titan.email (envoi) et imap.titan.email (lecture).",
    username: "Votre adresse complète (prenom@votre-site.fr)",
    password: "boite",
    passwordHint: "Le mot de passe de cette adresse, pas celui de votre compte Hostinger.",
    intro:
      "Chez Hostinger, le mot de passe est celui de l'adresse. Les serveurs dépendent du produit : Hostinger Email ou Titan Email.",
    duration: "5 minutes",
    needs: ["L'accès à hPanel, l'espace client Hostinger."],
    steps: [
      {
        title: "Vérifiez votre produit et vos réglages",
        body: [
          "Dans hPanel, ouvrez « Emails » et choisissez votre domaine. La section « Paramètres de configuration », puis « Configuration manuelle », affiche vos serveurs : smtp.hostinger.com et imap.hostinger.com pour Hostinger Email, smtp.titan.email et imap.titan.email pour Titan Email.",
        ],
        link: {
          label: "Ouvrir la page Emails de hPanel",
          href: "https://hpanel.hostinger.com/emails/",
        },
      },
      {
        title: "Retrouvez ou redéfinissez le mot de passe de l'adresse",
        body: [
          "Sur la même page, cliquez sur « Gérer », puis sur « ⋮ » à côté du compte et sur « Changer le mot de passe ». Validez avec « Mettre à jour ».",
        ],
        link: {
          label: "Aide Hostinger : réinitialiser le mot de passe d'un compte e-mail",
          href: "https://www.hostinger.com/fr/support/1583468-comment-reinitialiser-le-mot-de-passe-d-un-compte-email-pour-hostinger-email/",
        },
      },
    ],
    errors: [
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "Vérifiez d'abord que les serveurs correspondent à votre produit (Hostinger Email ou Titan Email), puis que l'identifiant est l'adresse complète.",
      },
    ],
    notes: [
      "Hostinger compte les messages sur 24 heures glissantes : 100 pour les offres gratuites et les essais, 1 000 pour Business Starter, 3 000 pour Business Premium.",
    ],
    sources: [
      {
        label: "Hostinger : détails de configuration d'un compte e-mail",
        href: "https://www.hostinger.com/fr/support/1575756-comment-obtenir-les-details-de-la-configuration-d-un-compte-e-mail-sur-hpanel-hostinger/",
      },
      {
        label: "Hostinger : détails de configuration pour Titan Email",
        href: "https://www.hostinger.com/fr/support/5966022-comment-obtenir-les-details-de-configuration-d-un-compte-email-pour-email-titan-chez-hostinger/",
      },
      {
        label: "Hostinger : paramètres et limites du service e-mail",
        href: "https://www.hostinger.com/fr/support/4625828-parametres-et-limites-du-service-email-de-hostinger/",
      },
    ],
  },
];
