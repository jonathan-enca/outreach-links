import { mailboxProviders } from "./mailbox-providers/index";

/**
 * Guides « connecter sa boîte d'envoi » : un par fournisseur de messagerie.
 * Les réglages et les chemins de menus viennent de l'aide officielle de chaque fournisseur (champ
 * `sources`), relue le jour indiqué par `ui.checkedOn`. Un fournisseur change ses menus sans prévenir :
 * à la moindre remontée d'un utilisateur, corriger ici et mettre la date à jour.
 */
export type GuideGroup = "grandPublic" | "operateur" | "hebergeur" | "autre";

export interface GuideLink {
  label: string;
  href: string;
}

export interface GuideStep {
  title: string;
  body: readonly string[];
  /** Lien direct vers la page du fournisseur où se fait l'étape. */
  link?: GuideLink;
}

export interface ServerPreset {
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
}

export interface ProviderGuide {
  /** Segment d'URL du guide : /aide/boite-envoi/{slug}. */
  slug: string;
  name: string;
  /** Titre du guide, quand « Connecter une boîte {name} » ne se lit pas bien. */
  title?: string;
  /** Précision affichée dans la liste déroulante et le sommaire (types d'adresses concernés). */
  scope: string;
  group: GuideGroup;
  /** Domaines d'adresses qui désignent ce fournisseur à coup sûr (détection automatique). */
  domains: readonly string[];
  /** Suffixes de serveurs qui désignent ce fournisseur (adresse à son propre domaine). */
  hostSuffixes?: readonly string[];
  /** Faux : la connexion par mot de passe n'est pas possible aujourd'hui chez ce fournisseur. */
  compatible: boolean;
  /** Réglages fixes, remplis d'office dans le formulaire. Absent si le serveur dépend du compte. */
  server?: ServerPreset;
  /** Précision sur les serveurs : où lire leur nom quand il dépend du compte, ou les variantes d'une offre. */
  serverHint?: string;
  /** Port d'envoi à proposer quand le nom du serveur est à saisir (587 sinon). */
  defaultSmtpPort?: number;
  /** Ce qu'il faut écrire dans « Identifiant ». */
  username: string;
  /** Nature du mot de passe attendu : créé exprès pour une application, ou celui de la boîte. */
  password: "application" | "boite";
  /** Aide courte sous le champ du mot de passe. */
  passwordHint: string;
  /** Une phrase : ce qui rend ce fournisseur particulier. */
  intro: string;
  /** Temps à prévoir, en clair. */
  duration: string;
  needs: readonly string[];
  steps: readonly GuideStep[];
  errors: readonly { symptom: string; fix: string }[];
  notes?: readonly string[];
  /** Fournisseur non compatible : quoi faire à la place. */
  alternatives?: readonly string[];
  sources: readonly GuideLink[];
}

export const mailboxGuides = {
  ui: {
    checkedOn: "Réglages vérifiés sur l'aide officielle le 17 novembre 2026.",
    index: {
      eyebrow: "Aide",
      title: "Connecter votre boîte d'envoi",
      metaTitle: "Connecter votre boîte d'envoi : un guide par messagerie",
      description:
        "Vos messages partent de votre propre adresse. Choisissez votre messagerie : le guide vous montre, écran par écran, quoi cliquer et quoi recopier.",
      how: {
        title: "Comment ça se passe",
        steps: [
          "Chez votre messagerie, vous créez un mot de passe réservé à cette connexion (ou vous retrouvez celui de la boîte, selon le fournisseur).",
          "Dans les réglages, vous choisissez votre messagerie : les adresses des serveurs se remplissent toutes seules.",
          "Vous collez le mot de passe, puis vous lancez le test. Il vérifie l'envoi et la lecture des réponses.",
        ],
      },
      groups: {
        grandPublic: "Messageries grand public",
        operateur: "Opérateurs internet français",
        hebergeur: "Adresse à votre nom de domaine",
        autre: "Autre cas",
      },
      groupHints: {
        grandPublic: "Une adresse gratuite ou payante chez un grand service de messagerie.",
        operateur: "L'adresse fournie avec votre abonnement internet ou mobile.",
        hebergeur:
          "Une adresse du type prenom@votre-site.fr, gérée par l'hébergeur de votre nom de domaine ou par une suite de messagerie professionnelle. C'est le meilleur choix pour demander des liens : votre adresse porte le nom de votre site.",
        autre: "Votre messagerie n'est pas dans la liste.",
      },
      compatible: "Compatible",
      notCompatible: "Pas encore compatible",
      read: "Voir le guide",
      whichTitle: "Vous ne savez pas chez qui est votre boîte ?",
      which: [
        "Regardez ce qui suit le @ de votre adresse : gmail.com, orange.fr, yahoo.fr désignent directement le service.",
        "Si c'est le nom de votre site (prenom@votre-site.fr), la boîte est le plus souvent chez l'hébergeur de votre nom de domaine, ou chez Google Workspace ou Microsoft 365 si votre entreprise les utilise. La page où vous lisez vos messages dans un navigateur donne la réponse : son adresse contient le nom du service.",
      ],
      safetyTitle: "Ce que nous faisons de ce mot de passe",
      safety: [
        "Il est chiffré avant d'être enregistré et n'est plus jamais affiché, ni à vous ni à nous.",
        "Il sert à deux choses : envoyer les messages que vous avez approuvés, et lire les réponses à ces messages. Le reste de votre boîte n'est pas lu.",
        "Vous pouvez le révoquer à tout moment chez votre messagerie : la connexion s'arrête aussitôt.",
      ],
    },
    guide: {
      breadcrumbLabel: "Fil d'Ariane",
      title: (name: string) => `Connecter une boîte ${name}`,
      titleNotCompatible: (name: string) => `${name} : pas encore compatible`,
      metaDescription: (name: string) =>
        `Le guide pas à pas pour connecter une boîte ${name} : où créer le mot de passe, quels serveurs indiquer, que faire si le test échoue.`,
      metaDescriptionNotCompatible: (name: string) =>
        `Pourquoi une boîte ${name} ne peut pas encore être connectée par mot de passe, et quoi faire à la place.`,
      all: "Tous les guides",
      duration: "Temps à prévoir",
      needsTitle: "Ce qu'il vous faut",
      stepsTitle: (name: string) => `Chez ${name}`,
      settingsTitle: "Les réglages à utiliser",
      settingsPrefilled: (name: string) =>
        `Ils se remplissent tout seuls quand vous choisissez « ${name} » dans la liste. Les voici pour vérifier.`,
      settingsManual:
        "Ces valeurs dépendent de votre compte : recopiez celles que vous donne votre fournisseur.",
      settings: {
        username: "Identifiant",
        password: "Mot de passe",
        passwordApplication: "Le mot de passe d'application créé à l'étape précédente",
        passwordBoite: "Le mot de passe de la boîte",
        smtp: "Serveur d'envoi (SMTP)",
        imap: "Serveur de lecture (IMAP)",
        port: (n: number) => `port ${n}`,
        toRead: "à recopier depuis votre compte",
      },
      appTitle: (app: string) => `Dans ${app}`,
      appSteps: (name: string) => [
        "Ouvrez Réglages, puis Boîte d'envoi.",
        `Dans « Votre messagerie », choisissez « ${name} ».`,
        "Indiquez votre adresse d'envoi et le nom qui s'affichera chez vos destinataires (votre prénom et votre nom, par exemple).",
        "Collez le mot de passe, puis cliquez sur « Connecter la boîte ».",
        "Cliquez sur « Tester la connexion ». Le test vérifie l'envoi et la lecture ; il n'écrit à personne d'autre que vous.",
      ],
      open: "Ouvrir les réglages de la boîte d'envoi",
      errorsTitle: "Si le test échoue",
      notesTitle: "À savoir",
      whyTitle: "Pourquoi",
      alternativesTitle: "Quoi faire à la place",
      sourcesTitle: "Sources officielles",
    },
    form: {
      provider: "Votre messagerie",
      providerPlaceholder: "Choisissez votre messagerie",
      firstTime: "Première connexion ? Un guide pas à pas existe pour chaque messagerie.",
      allGuides: "Voir tous les guides",
      guide: (name: string) => `Guide pas à pas : ${name}`,
      whyNot: "Pourquoi, et quoi faire à la place",
      detected: (name: string) => `Messagerie reconnue à votre adresse : ${name}.`,
      passwordApplication: "Mot de passe d'application",
      passwordBoite: "Mot de passe de la boîte",
      usernameHint: "Le plus souvent, votre adresse complète.",
      advanced: "Identifiant et serveurs",
      advancedFilled: "déjà remplis",
      advancedToFill: "à remplir",
    },
    errorHelp: {
      appPassword:
        "Votre messagerie demande un mot de passe d'application, pas votre mot de passe habituel. Créez-en un chez elle, puis reconnectez la boîte.",
      microsoftBlocked:
        "Microsoft refuse la connexion par mot de passe pour cette boîte. Elle ne peut pas encore être connectée.",
      credentials:
        "L'identifiant ou le mot de passe est refusé. Vérifiez que vous avez collé un mot de passe d'application si votre messagerie en exige un, sans espace en trop, et que l'identifiant est bien votre adresse complète.",
      disabledAccess:
        "Votre messagerie bloque l'accès par une application extérieure. Activez l'accès IMAP dans ses réglages, puis relancez le test.",
      hostNotFound:
        "Le nom d'un serveur est introuvable. Vérifiez l'orthographe du serveur SMTP et du serveur IMAP.",
      unreachable:
        "Le serveur ne répond pas. Vérifiez le nom du serveur et le port (SMTP : 465 ou 587 ; IMAP : 993).",
      certificate:
        "Le certificat de sécurité ne correspond pas au nom du serveur. Utilisez le nom de serveur exact donné par votre fournisseur, pas celui de votre site.",
      privateHost:
        "Ce nom de serveur ne mène pas à une adresse publique. Utilisez le serveur donné par votre fournisseur.",
    },
    rowGuide: (name: string) => `Revoir le guide ${name}`,
    rowGuides: "Voir les guides de connexion",
  },
  providers: mailboxProviders,
};
