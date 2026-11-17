import type { ProviderGuide } from "../mailbox-guides";

/** Boîtes fournies avec un abonnement internet ou mobile français. */
export const operateurs: readonly ProviderGuide[] = [
  {
    slug: "orange",
    name: "Orange",
    scope: "Adresses @orange.fr, @wanadoo.fr",
    group: "operateur",
    domains: ["orange.fr", "wanadoo.fr"],
    hostSuffixes: ["orange.fr"],
    compatible: true,
    server: {
      smtpHost: "smtp.orange.fr",
      smtpPort: 465,
      imapHost: "imap.orange.fr",
      imapPort: 993,
    },
    username: "Votre adresse complète (@orange.fr ou @wanadoo.fr)",
    password: "application",
    passwordHint:
      "Le mot de passe dédié créé dans votre espace client Orange : 23 caractères, en groupes séparés par des tirets.",
    intro:
      "Orange propose un mot de passe dédié aux logiciels de messagerie : un mot de passe créé exprès, distinct de celui de votre compte. C'est lui qu'il faut utiliser.",
    duration: "5 à 10 minutes",
    needs: [
      "L'accès à votre espace client Orange. Orange vous demandera de confirmer votre identité (code reçu par SMS ou par e-mail).",
    ],
    steps: [
      {
        title: "Vérifiez que l'accès IMAP est ouvert",
        body: [
          "Dans le Mail Orange, sur ordinateur, cliquez sur la roue crantée, puis sur « tous les paramètres » et « Sécurité ». À la ligne « Protocoles POP ou IMAP », l'accès doit être activé. Sinon, cliquez sur « Modifier », activez-le et validez.",
        ],
        link: {
          label: "Aide Orange : activer les accès POP et IMAP",
          href: "https://assistance.orange.fr/ordinateurs-peripheriques/installer-et-utiliser/l-utilisation-du-mail-et-services-associes/mail-orange/parametrer-la-boite-mail/mail-orange-comment-activer-ou-desactiver-les-acces-pop-imap-pour-les-logiciels-ou-applications-de-messagerie-tiers_427398-957069",
        },
      },
      {
        title: "Ouvrez la page du mot de passe dédié",
        body: [
          "Dans l'espace client : « Infos personnelles », puis « Connexion et sécurité », puis « Mot de passe pour logiciels et applications de messagerie tiers ». Le lien ci-dessous y mène directement.",
        ],
        link: {
          label: "Ouvrir la page de sécurité de l'espace client Orange",
          href: "https://espace-client.orange.fr/compte/securite#logiciels",
        },
      },
      {
        title: "Générez le mot de passe",
        body: [
          "Confirmez votre identité, puis cliquez sur « Générer ». Orange affiche un mot de passe de 23 caractères.",
        ],
      },
      {
        title: "Copiez-le tout de suite",
        body: [
          "Il n'est affiché qu'une seule fois. À partir de ce moment, votre mot de passe de compte n'est plus accepté dans les logiciels de messagerie : si vous lisez cette boîte sur un téléphone ou dans un logiciel, mettez-y aussi le nouveau mot de passe.",
        ],
      },
    ],
    errors: [
      {
        symptom: "« L'adresse email ou le mot de passe sont incorrects »",
        fix: "Vous avez sans doute collé le mot de passe de votre compte Orange. Utilisez le mot de passe dédié de l'étape 3. S'il est perdu, générez-en un nouveau.",
      },
      {
        symptom: "« Le serveur imap.orange.fr est indisponible »",
        fix: "L'accès IMAP est coupé sur la boîte : refaites l'étape 1.",
      },
    ],
    notes: [
      "Chaque boîte secondaire a son propre mot de passe dédié : générez-le en étant connecté avec cette adresse.",
    ],
    sources: [
      {
        label: "Orange : générer un mot de passe dédié aux logiciels de messagerie",
        href: "https://assistance.orange.fr/ordinateurs-peripheriques/installer-et-utiliser/l-utilisation-du-mail-et-du-cloud/mail-orange/le-mail-orange-nouvelle-version/parametrer-la-boite-mail/mail-orange-generer-un-mot-de-passe-dedie-pour-consulter-sa-boite-mail-orange-depuis-une-application-ou-un-logiciel-de-messagerie-non-fourni-par-orange_441119-970656",
      },
      {
        label: "Orange : accéder à sa boîte depuis un logiciel de messagerie",
        href: "https://assistance.orange.fr/ordinateurs-peripheriques/installer-et-utiliser/l-utilisation-du-mail-et-services-associes/mail-orange/parametrer-la-boite-mail/mail-orange-comment-acceder-a-sa-boite-mail-orange-depuis-une-application-ou-un-logiciel-de-messagerie-non-fourni-par-orange_434630-964290",
      },
      {
        label: "Orange : messages d'erreur du Mail Orange",
        href: "https://assistance.orange.fr/ordinateurs-peripheriques/depanner/probleme-de-mail/probleme-pour-acceder-a-la-messagerie/mail-orange-messages-d-erreur_77598-78554",
      },
    ],
  },
  {
    slug: "free",
    name: "Free",
    scope: "Adresses @free.fr",
    group: "operateur",
    domains: ["free.fr"],
    hostSuffixes: ["free.fr"],
    compatible: true,
    server: { smtpHost: "smtp.free.fr", smtpPort: 465, imapHost: "imap.free.fr", imapPort: 993 },
    username: "Votre adresse complète, @free.fr compris",
    password: "boite",
    passwordHint:
      "Le mot de passe de cette adresse @free.fr (celui du webmail), pas celui de votre espace abonné Freebox.",
    intro:
      "Chez Free, le mot de passe est celui de la boîte, le même pour l'envoi et la lecture. Aucun mot de passe spécial à créer.",
    duration: "3 minutes",
    needs: ["Le mot de passe de l'adresse @free.fr, celui que vous tapez sur le webmail de Free."],
    steps: [
      {
        title: "Vérifiez votre mot de passe sur le webmail",
        body: [
          "Connectez-vous au webmail de Free avec l'adresse et son mot de passe. Si la connexion passe, vous avez les bons identifiants : il n'y a rien d'autre à préparer chez Free.",
        ],
        link: { label: "Ouvrir le webmail de Free", href: "https://webmail.free.fr/" },
      },
    ],
    errors: [
      {
        symptom: "La lecture fonctionne mais l'envoi est refusé",
        fix: "Sur d'anciens comptes, l'envoi authentifié se débloquait à la main : connectez-vous à la gestion de vos comptes mail avec la partie de l'adresse avant le @ et le mot de passe de la boîte, puis cherchez « Gestion du SMTP authentifié » et activez-le. Free a annoncé la disparition de cette option : si elle n'apparaît pas, elle n'est plus nécessaire.",
      },
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "L'identifiant doit être l'adresse complète, @free.fr compris. Le mot de passe est celui de la boîte, pas l'identifiant Freebox.",
      },
    ],
    notes: ["Free ne publie pas de limite d'envoi chiffrée."],
    sources: [
      {
        label: "Free : configurer un logiciel de messagerie",
        href: "https://assistance.free.fr/articles/609",
      },
    ],
  },
  {
    slug: "sfr",
    name: "SFR",
    scope: "Adresses @sfr.fr, @neuf.fr, @cegetel.net, @numericable.fr, @noos.fr",
    group: "operateur",
    domains: ["sfr.fr", "neuf.fr", "cegetel.net", "9online.fr", "numericable.fr", "noos.fr"],
    hostSuffixes: ["sfr.fr", "numericable.fr"],
    compatible: true,
    server: { smtpHost: "smtp.sfr.fr", smtpPort: 465, imapHost: "imap.sfr.fr", imapPort: 993 },
    serverHint:
      "Ces réglages valent pour les adresses @sfr.fr, @neuf.fr et @cegetel.net. Pour une adresse @numericable.fr ou @noos.fr, remplacez les serveurs par smtps.numericable.fr (envoi) et imap.numericable.fr (lecture).",
    username: "Votre adresse complète",
    password: "boite",
    passwordHint: "Le mot de passe de cette adresse, celui du SFR Mail.",
    intro: "Chez SFR, le mot de passe est celui de la boîte. Aucun mot de passe spécial à créer.",
    duration: "3 minutes",
    needs: ["Le mot de passe de l'adresse, celui que vous tapez sur le SFR Mail."],
    steps: [
      {
        title: "Vérifiez votre mot de passe sur le SFR Mail",
        body: [
          "Connectez-vous au SFR Mail avec l'adresse et son mot de passe. Si la connexion passe, vous avez les bons identifiants.",
        ],
        link: {
          label: "Aide SFR : configurer sa messagerie",
          href: "https://assistance.sfr.fr/sfrmail-appli/sfrmail/configurer-messagerie-recevoir-email-sfr.html",
        },
      },
    ],
    errors: [
      {
        symptom: "La boîte se bloque après la connexion",
        fix: "SFR bloque un compte qui se connecte ou envoie depuis une adresse IP inhabituelle, ce qui peut arriver ici puisque la connexion part de nos serveurs. Le déblocage passe par un changement de mot de passe chez SFR ; reconnectez ensuite la boîte.",
      },
      {
        symptom: "« L'envoi de mail est suspendu »",
        fix: "SFR a suspendu l'envoi de cette boîte. Seul le chat technique de SFR peut la débloquer.",
      },
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "L'identifiant est l'adresse complète. Pour une adresse @numericable.fr ou @noos.fr, vérifiez aussi les serveurs.",
      },
    ],
    notes: [
      "SFR surveille de près les envois des boîtes grand public. Pour demander des liens, une adresse au nom de votre site reste un choix plus sûr.",
    ],
    sources: [
      {
        label: "SFR : configurer sa messagerie",
        href: "https://assistance.sfr.fr/sfrmail-appli/sfrmail/configurer-messagerie-recevoir-email-sfr.html",
      },
      {
        label: "SFR : problèmes d'accès à la boîte",
        href: "https://assistance.sfr.fr/sfrmail-appli/sfrmail/problemes-acces-boite-email-sfr.html",
      },
      {
        label: "SFR : envoi d'e-mails suspendu",
        href: "https://assistance.sfr.fr/sfrmail-appli/sfrmail/envoi-emails-suspendu-messagerie-sfr.html",
      },
    ],
  },
  {
    slug: "laposte",
    name: "La Poste",
    scope: "Adresses @laposte.net",
    group: "operateur",
    domains: ["laposte.net"],
    hostSuffixes: ["laposte.net"],
    compatible: true,
    server: {
      smtpHost: "smtp.laposte.net",
      smtpPort: 587,
      imapHost: "imap.laposte.net",
      imapPort: 993,
    },
    username:
      "Votre adresse complète. Si elle est refusée, essayez seulement la partie avant @laposte.net.",
    password: "boite",
    passwordHint: "Le mot de passe de votre boîte laposte.net.",
    intro:
      "Chez La Poste, le mot de passe est celui de la boîte. Aucun mot de passe spécial à créer.",
    duration: "3 minutes",
    needs: [
      "Le mot de passe de votre boîte laposte.net.",
      "Une adresse laposte.net définitive : les adresses temporaires ne sont lisibles que sur le webmail.",
    ],
    steps: [
      {
        title: "Vérifiez votre mot de passe sur le webmail",
        body: [
          "Connectez-vous à laposte.net avec l'adresse et son mot de passe. Si la connexion passe, vous avez les bons identifiants.",
        ],
        link: {
          label: "Aide La Poste : paramétrer un logiciel de messagerie",
          href: "https://aide.laposte.net/contents/comment-parametrer-un-logiciel-de-messagerie-pour-envoyer-et-recevoir-mes-courriers-electroniques",
        },
      },
    ],
    errors: [
      {
        symptom: "L'envoi échoue alors que la lecture fonctionne",
        fix: "Ouvrez « Identifiant et serveurs » et remplacez le port SMTP 587 par 465, puis relancez le test.",
      },
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "Essayez l'identifiant sans « @laposte.net ». Si rien ne passe, changez votre mot de passe sur laposte.net : il arrive que La Poste coupe l'accès des logiciels jusqu'à ce changement.",
      },
      {
        symptom: "« 550 5.7.2 Message refusé Spamhaus »",
        fix: "La Poste refuse l'envoi à cause de la réputation de l'adresse IP d'où part la connexion. Ce n'est pas un réglage que vous pouvez corriger : connectez une autre boîte d'envoi.",
      },
    ],
    notes: [
      "La Poste ne publie pas de limite d'envoi chiffrée, mais ralentit les envois rapprochés.",
    ],
    sources: [
      {
        label: "La Poste : paramétrer un logiciel de messagerie",
        href: "https://aide.laposte.net/contents/comment-parametrer-un-logiciel-de-messagerie-pour-envoyer-et-recevoir-mes-courriers-electroniques",
      },
      {
        label: "La Poste : erreur Spamhaus",
        href: "https://aide.laposte.net/kb/guide/fr/jai-une-erreur-spamhaus-que-faire-DH6DpN48aX",
      },
    ],
  },
  {
    slug: "bouygues",
    name: "Bouygues Telecom",
    scope: "Adresses @bbox.fr",
    group: "operateur",
    domains: ["bbox.fr"],
    hostSuffixes: ["bbox.fr"],
    compatible: true,
    server: { smtpHost: "smtp.bbox.fr", smtpPort: 465, imapHost: "imap.bbox.fr", imapPort: 993 },
    username: "Votre adresse @bbox.fr complète",
    password: "boite",
    passwordHint: "Le mot de passe de votre boîte @bbox.fr.",
    intro:
      "Chez Bouygues Telecom, le mot de passe est celui de la boîte. Aucun mot de passe spécial à créer.",
    duration: "3 minutes",
    needs: ["Le mot de passe de votre adresse @bbox.fr, celui de la messagerie Bbox."],
    steps: [
      {
        title: "Vérifiez votre mot de passe sur la messagerie Bbox",
        body: [
          "Connectez-vous à la messagerie Bbox avec l'adresse et son mot de passe. Si la connexion passe, vous avez les bons identifiants.",
        ],
        link: {
          label: "Aide Bouygues Telecom : logiciel de messagerie et e-mails Bbox",
          href: "https://www.assistance.bouyguestelecom.fr/internet-bbox/envoi-reception-email/logiciel-messagerie-emails-bbox",
        },
      },
    ],
    errors: [
      {
        symptom: "Le serveur de lecture est introuvable",
        fix: "Le serveur est imap.bbox.fr, sans chiffre : si vous avez saisi imap4.bbox.fr, retirez le 4.",
      },
      {
        symptom: "Identifiant ou mot de passe refusé",
        fix: "L'identifiant est l'adresse complète, @bbox.fr compris.",
      },
    ],
    notes: [
      "Après la résiliation d'une ligne Bbox, la boîte reste accessible six mois. Pour une prospection durable, préférez une adresse au nom de votre site.",
    ],
    sources: [
      {
        label: "Bouygues Telecom : logiciel de messagerie et e-mails Bbox",
        href: "https://www.assistance.bouyguestelecom.fr/internet-bbox/envoi-reception-email/logiciel-messagerie-emails-bbox",
      },
    ],
  },
];
