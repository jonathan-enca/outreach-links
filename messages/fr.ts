import { mailboxGuides } from "./mailbox-guides";

/** Toutes les chaînes de l'interface passent par ce fichier (UI en français). */
export const fr = {
  // Guides « connecter sa boîte d'envoi » : un fichier à part, un guide par fournisseur.
  mailboxGuides,
  app: {
    // Nom de travail provisoire : SEUL endroit où il est écrit (docs/naming.md). Le changer ici suffit.
    name: "Autolink.ai",
    description:
      "Un audit SEO d'abord, puis une prospection par email pour obtenir des backlinks éditoriaux gratuits.",
  },
  home: {
    title: "Des backlinks éditoriaux, à partir d'un vrai audit",
    subtitle:
      "Entrez votre site : on regarde qui se classe devant vous, d'où viennent leurs liens et quelles pages méritent d'être poussées. 7 jours d'essai offerts.",
    signIn: "Se connecter",
    nav: {
      label: "Navigation principale",
      whatItIs: "C'est quoi",
      tactics: "Tactiques",
      howItWorks: "Comment ça marche",
      how: "Fonctionnement",
      pricing: "Tarifs",
      faq: "FAQ",
      menu: "Menu",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu",
      cta: "Essai gratuit",
    },
    hero: {
      pill: "7 jours d'essai offerts, sans carte bancaire",
      audience: "Pour les sites, blogs, SaaS et e-commerces",
      title: "Des backlinks gratuits, demandés aux bons sites",
      titleAccent: "Des backlinks gratuits,",
      titleRest: "demandés aux bons sites",
      lead: "Nous trouvons les sites qui méritent de vous citer, rédigeons pour chacun une demande personnalisée et l'envoyons depuis votre propre boîte mail. Puis nous relançons, classons les réponses et vérifions que le lien est bien en ligne. Vous fixez les règles et validez chaque lot : le reste tourne tout seul.",
      cta: { primary: "Essai gratuit", secondary: "Fonctionnement" },
      hints: [
        "7 jours d'essai offerts",
        "Aucun lien acheté",
        "Rien n'est envoyé sans votre accord",
      ],
      refine: "Préciser mes requêtes et mon thème",
      cardsLabel: "Exemples de ce que le service prépare pour vous",
      cards: {
        target: {
          tag: "Cible qualifiée",
          badge: "Qualifiée",
          relevance: "Pertinence",
          checks: "Vendeur de liens : non · Concurrent : non",
        },
        pitch: {
          tag: "Brouillon",
          hookLabel: "Accroche tirée de leur page :",
          hook: "« guide complet des randonnées en Bretagne »",
          detail: "Adresse vérifiée · signé de votre prénom",
        },
        guardrails: {
          tag: "Garde-fous",
          perHour: "10 envois / heure",
          hours: "Heures ouvrées",
          review: "Lot à valider",
          ok: "Dans les limites",
        },
        sent: {
          tag: "Lot envoyé",
          from: "depuis vous@votresite.fr",
          today: "Aujourd'hui",
        },
        reply: {
          tag: "Réponse",
          ago: "il y a 2 min",
          quote: "« Avec plaisir, je l'ajoute à ma page ressources. »",
          status: "lien à poser",
        },
        live: {
          tag: "Lien vérifié en ligne",
          url: "blog-voyage.fr/ressources",
          kind: "dofollow",
        },
      },
    },
    tour: {
      title: "Visite du produit",
      pending: "Démonstration vidéo bientôt disponible",
      pendingHint: "En attendant, essayez gratuitement : votre espace se crée en un champ.",
      videoLabel: "Visite guidée du produit",
    },
    whatItIs: {
      label: "En clair",
      title: "C'est quoi ?",
      intro:
        "Un outil de netlinking pour les sites, blogs, SaaS et e-commerces. Il trouve les sites qui ont une vraie raison de vous citer, leur écrit depuis votre boîte mail avec votre accord, et suit chaque demande jusqu'au lien en ligne.",
      items: [
        {
          q: "Ce que c'est",
          a: "Un audit de votre site et de vos concurrents, puis des demandes de liens envoyées par email à des sites qui ne vendent pas les leurs.",
        },
        {
          q: "Pour qui",
          a: "Un site vitrine, un blog, un SaaS, une boutique en ligne. Tous ceux qui veulent des liens éditoriaux sans sortir la carte bancaire sur une plateforme de liens sponsorisés.",
        },
        {
          q: "Ce que l'outil fait seul",
          a: "Il analyse vos concurrents, lit chaque site avant de le retenir, cherche le bon contact, rédige la demande, relance une fois, classe les réponses et contrôle le lien posé.",
        },
        {
          q: "Ce que vous décidez",
          a: "Les sites à contacter, le texte de chaque message, le rythme d'envoi. Et la réponse à donner quand un site demande de l'argent.",
        },
        {
          q: "D'où partent les messages",
          a: "De votre boîte mail, signés de votre prénom. Jamais d'un serveur d'envoi partagé avec d'autres clients.",
        },
        {
          q: "Ce que nous ne faisons pas",
          a: "Acheter des liens, monter des réseaux de sites, promettre un nombre de liens. En face, c'est toujours quelqu'un qui décide de vous citer ou non.",
        },
      ],
    },
    tactics: {
      label: "Tactiques",
      title: "Trois façons d'obtenir un lien sans l'acheter",
      intro:
        "Les meilleurs liens ne sont pas en vente. Ils sont sur des sites que personne ne pense à contacter, sur des pages dont un lien ne mène plus nulle part, ou chez des gens qui parlent déjà de vous.",
      kicker: "Tactique",
      exampleLabel: "Exemple de demande",
      frame:
        "Le cadre est le même pour les trois : vous validez chaque lot avant l'envoi, dix emails par heure au plus, une seule relance.",
      primary: "Essai gratuit",
      secondary: "Fonctionnement",
      hint: "7 jours d'essai offerts, sans carte bancaire : le temps de voir vos premières cibles.",
      closing:
        "Ce que nous ne faisons pas : acheter des liens, publier des articles sponsorisés déguisés, monter des réseaux de sites.",
      items: [
        {
          title: "Les sites que personne ne sollicite",
          text: "Mairies, associations, photographes, boutiques, forums modérés. Ils ne vendent pas de liens, mais ils en donnent quand la demande leur est utile.",
          steps: [
            {
              title: "Vos recherches comme point de départ",
              text: "Les 30 premiers résultats de Google, et les sites qui citent vos concurrents.",
            },
            {
              title: "Chaque site est lu",
              text: "Vendeurs de liens, concurrents, sites piratés : écartés, motif à l'appui.",
            },
            {
              title: "Le bon contact",
              text: "Cherché jusque dans les mentions légales.",
            },
            {
              title: "Trois lignes, validées par vous",
              text: "Le message cite leur page. Rien ne part sans votre accord.",
            },
          ],
          example: {
            to: "À une médiathèque qui recommande des sites pour enfants",
            body: "Bonjour, j'ai vu votre sélection de sites pour occuper les enfants le mercredi. Nous publions des coloriages gratuits à imprimer : monsite.example/coloriages. S'ils y ont leur place, je serais ravie de les voir dans la liste.",
            signature: "Camille",
          },
        },
        {
          title: "Les liens morts à remplacer",
          text: "Un site ferme, une page déménage, et le lien renvoie une erreur. Nous le signalons à l'éditeur et proposons votre page à la place.",
          steps: [
            {
              title: "Les pages de ressources de votre thème",
              text: "Et celles qui renvoient déjà vers vos concurrents.",
            },
            {
              title: "Leurs liens, testés un par un",
              text: "Mort seulement si la page répond vraiment « introuvable ».",
            },
            {
              title: "Votre page la plus proche",
              text: "Celle qui traite le sujet de la page disparue.",
            },
            {
              title: "Une demande précise",
              text: "Le lien cassé, où il se trouve, par quoi le remplacer.",
            },
          ],
          example: {
            to: "À un blog de randonnée dont un lien ne répond plus",
            body: "Bonjour, dans votre guide du sentier des douaniers, le lien « préparer son sac » mène à une page qui n'existe plus. Nous avons une liste de matériel à jour : monsite.example/sac-rando. Elle peut le remplacer si elle vous convient.",
            signature: "Camille",
          },
        },
        {
          title: "Les mentions de votre marque sans lien",
          text: "Un article, un comparatif ou un forum cite déjà votre site sans le lier. L'auteur vous connaît : il lui reste un lien à ajouter.",
          steps: [
            {
              title: "Votre nom, sous toutes ses écritures",
              text: "Avec espace, avec tiret, collé, ou votre adresse en toutes lettres.",
            },
            {
              title: "Deux vérifications",
              text: "La page parle bien de vous, et elle ne vous lie pas déjà.",
            },
            {
              title: "La phrase prête à copier",
              text: "Les mots à rendre cliquables, et le résultat une fois le lien posé.",
            },
            {
              title: "Le contrôle",
              text: "Nous vérifions sur la page que le lien est en ligne.",
            },
          ],
          example: {
            to: "À l'auteur d'un comparatif qui cite votre outil",
            body: "Bonjour, merci d'avoir cité Monsite dans votre comparatif des outils de planning. Le nom n'est pas cliquable : pourriez-vous le lier vers monsite.example ? Vos lecteurs y arriveront directement.",
            signature: "Camille",
          },
        },
      ],
    },
    proofs: {
      label: "Sur le terrain",
      title: "La preuve, sur les sites que nous gérons nous-mêmes",
      intro:
        "Ce sont les sites de notre fondateur. Leurs liens ont été demandés à la main, avec la méthode que ce service automatise. Voici ce que ces liens ont changé : autorité du domaine, trafic, et qui les cite aujourd'hui.",
      illustrative:
        "Chiffres d'illustration : les mesures réelles remplaceront ces valeurs avant l'ouverture. Les sites cités comme sources de liens sont des exemples.",
      authority: "Autorité du domaine",
      linkedFrom: "Cité par",
      footnote: "Site du fondateur · liens demandés à la main",
      summary: {
        authority: "Autorité du domaine",
        traffic: "Trafic organique",
        links: "Liens obtenus",
        linksNote: "Sur l'ensemble des quatre sites",
      },
      metrics: {
        traffic: "Trafic organique par mois",
        referring: "Nouveaux sites référents de bon niveau",
        links: "Liens obtenus",
      },
      kinds: {
        outil: "Outil en ligne",
        coloriages: "Coloriages à imprimer",
        ecommerce: "Boutique en ligne",
        saas: "Logiciel en ligne (SaaS)",
      },
    },
    how: {
      label: "Comment ça marche",
      title: "De l'adresse de votre site au lien en ligne",
      intro:
        "Six étapes, dont trois où vous avez la main. Cliquez sur une étape pour voir l'écran qui lui correspond.",
      roles: { you: "À vous", tool: "Automatique" },
      screenCaption: "Écrans d'exemple, données de démonstration",
      steps: [
        {
          role: "you",
          title: "Vous donnez l'adresse de votre site",
          text: "Un seul champ à remplir. L'outil lit votre site, en déduit votre thème et les recherches à viser. Vous corrigez si besoin.",
        },
        {
          role: "tool",
          title: "L'audit part chercher",
          text: "Qui se classe devant vous, quels sites leur font des liens, quelles pages parlent déjà de vous. Chaque site trouvé est lu avant d'être retenu.",
        },
        {
          role: "you",
          title: "Vous recevez une liste courte",
          text: "Pas deux mille domaines à trier : quelques dizaines de sites classés, avec pour chacun la demande à faire et la raison. Vous cochez ceux que vous voulez contacter.",
        },
        {
          role: "you",
          title: "Vous relisez les messages",
          text: "Chaque brouillon cite le passage de leur page qui justifie la demande. Vous corrigez ce que vous voulez, puis vous validez le lot d'un bloc.",
        },
        {
          role: "tool",
          title: "Les emails partent de votre boîte",
          text: "Dix par heure au plus, aux heures de bureau. Une seule relance, dix jours plus tard, annulée si on vous a répondu.",
        },
        {
          role: "tool",
          title: "Les réponses arrivent triées",
          text: "Oui, peut-être, non, « c'est payant » : chaque réponse est classée. Quand un site dit oui, le lien est contrôlé sur sa page, puis recontrôlé.",
        },
      ],
      mockup: {
        bars: ["Démarrer", "Audit", "Vos cibles", "Lot n°1", "Envois", "Inbox"],
        start: {
          fieldLabel: "Adresse de votre site",
          fieldValue: "monsite.example",
          understood: "Ce que nous avons compris",
          themeLabel: "Thème",
          theme: "Coloriages à imprimer pour enfants",
          queriesLabel: "Recherches visées",
          queries: [
            "coloriage à imprimer",
            "coloriage enfant gratuit",
            "activités manuelles maternelle",
          ],
          button: "Lancer l'audit",
        },
        audit: {
          title: "Audit de monsite.example",
          stats: [
            { label: "Concurrents dans Google", value: "12" },
            { label: "Sites candidats", value: "552" },
            { label: "Pages lues", value: "300" },
            { label: "Retenus", value: "30" },
          ],
          competitorsLabel: "Devant vous sur vos recherches",
          competitors: [
            { domain: "coloriages-faciles.example", note: "184 sites lui font un lien" },
            { domain: "dessins-enfants.example", note: "97 sites lui font un lien" },
            { domain: "atelier-creatif.example", note: "61 sites lui font un lien" },
          ],
          gap: "118 de ces sites ne vous citent pas encore",
        },
        targets: {
          title: "Vos cibles",
          count: "30 sites retenus",
          cards: [
            {
              rank: "1",
              domain: "mediatheque-exemple.example",
              kind: "Médiathèque",
              tactic: "Jamais sollicité",
              tone: "accent",
              why: "Sa page « sites pour les enfants » liste des ressources gratuites.",
              contact: "Email vérifié",
            },
            {
              rank: "2",
              domain: "classe-de-lea.example",
              kind: "Blog d'enseignante",
              tactic: "Lien mort",
              tone: "warning",
              why: "Un lien de sa page ressources ne répond plus.",
              contact: "Email vérifié",
            },
            {
              rank: "3",
              domain: "forum-parents.example",
              kind: "Forum",
              tactic: "Mention sans lien",
              tone: "info",
              why: "Un fil cite votre site sans le lier.",
              contact: "Formulaire",
            },
          ],
          discarded: { domain: "top-liens.example", reason: "Écarté : vend des liens" },
          button: "Valider ces demandes",
        },
        draft: {
          from: "De",
          to: "À",
          subject: "Objet",
          fromValue: "Camille, depuis votre boîte mail",
          toValue: "contact@mediatheque-exemple.example",
          subjectValue: "Des coloriages pour votre sélection",
          before: "Bonjour, j'ai vu votre ",
          hook: "sélection de sites pour occuper les enfants le mercredi",
          after:
            ". Nous publions des coloriages gratuits à imprimer : monsite.example/coloriages. S'ils y ont leur place, je serais ravie de les voir dans la liste.",
          hookLabel: "Passage cité dans leur page",
          urlLabel: "Adresse testée avant l'envoi",
          edit: "Modifier",
          button: "Valider le lot",
        },
        sending: {
          title: "Envois du jour",
          stats: [
            { label: "Cette heure", value: "2 sur 10" },
            { label: "Fenêtre d'envoi", value: "9 h à 18 h" },
            { label: "Relance", value: "Une seule" },
          ],
          rows: [
            {
              who: "mediatheque-exemple.example",
              what: "Parti à 10 h 12",
              status: "Envoyé",
              tone: "success",
            },
            {
              who: "classe-de-lea.example",
              what: "Départ prévu à 10 h 24",
              status: "Programmé",
              tone: "info",
            },
            {
              who: "asso-parents.example",
              what: "Sans réponse depuis dix jours",
              status: "Relance",
              tone: "warning",
            },
            {
              who: "club-lecture.example",
              what: "A répondu : relance annulée",
              status: "Répondu",
              tone: "accent",
            },
          ],
        },
        inbox: {
          title: "Inbox",
          rows: [
            {
              who: "mediatheque-exemple.example",
              what: "« Avec plaisir, je l'ajoute à la liste. »",
              status: "Chaud",
              tone: "success",
            },
            {
              who: "asso-parents.example",
              what: "Propose un échange de liens",
              status: "En négociation",
              tone: "info",
            },
            {
              who: "annuaire-pro.example",
              what: "Demande un paiement : à vous de décider",
              status: "Offre payante",
              tone: "warning",
            },
            {
              who: "classe-de-lea.example",
              what: "Lien en ligne, dofollow",
              status: "Lien vérifié",
              tone: "accent",
            },
          ],
        },
      },
      cta: "Essai gratuit",
      ctaHint: "7 jours d'essai offerts, sans carte bancaire.",
    },
    compare: {
      label: "Comparatif",
      title: "Acheter des liens, y passer ses soirées, ou déléguer",
      intro:
        "Vous avez sans doute déjà essayé l'une des deux premières. Voici ce que chacune vous coûte vraiment.",
      columns: ["", "Acheter sur une plateforme", "Tout faire à la main"],
      rows: [
        {
          label: "Ce que ça coûte",
          values: ["Un tarif par lien, à chaque lien", "Rien, sauf vos soirées"],
        },
        {
          label: "Les liens obtenus",
          values: ["Sponsorisés, à déclarer comme tels", "Éditoriaux, quand on vous répond"],
        },
        {
          label: "Qui choisit les sites",
          values: ["Le catalogue de la plateforme", "Vous, un onglet après l'autre"],
        },
        {
          label: "Qui écrit et relance",
          values: ["Personne : vous payez, le lien est posé", "Vous. Et la relance s'oublie"],
        },
        {
          label: "Si le lien disparaît",
          values: ["À voir avec la plateforme", "Vous le découvrez par hasard"],
        },
      ],
      usColumn: "Avec nous",
      usValues: [
        "Un abonnement fixe, peu importe le nombre de liens",
        "Éditoriaux, quand on vous répond",
        "L'audit propose, vous cochez",
        "L'outil rédige, vous relisez, la relance part seule",
        "Vous recevez une alerte",
      ],
      note: "Hors achat, personne ne peut promettre un lien. Un site reste libre de dire non.",
    },
    pricing: {
      label: "Tarifs",
      title: "Essayez 7 jours. Payez seulement si vous continuez.",
      intro:
        "Sept jours pour voir vos cibles et lire les messages préparés pour vous. Ensuite, un abonnement fixe : le prix ne bouge pas, que vous obteniez deux liens ou vingt.",
      free: {
        title: "7 jours d'essai offerts",
        text: "Sans carte bancaire. Vous voyez ce que l'outil trouve pour votre site avant de payer quoi que ce soit.",
        cta: "Essai gratuit",
      },
      perMonth: "TTC par mois",
      popular: "Recommandé",
      unavailable:
        "Les tarifs ne sont pas affichables pour le moment. Ils seront disponibles à la création de votre compte.",
      note: "Prix TTC, abonnement mensuel. Un email envoyé est un message parti de votre boîte : la relance et vos réponses comptent chacune pour un. Grille de lancement, susceptible d'évoluer.",
      limits: {
        sends: "emails envoyés par mois",
        sites: "site",
        sitesPlural: "sites",
        mailboxes: "boîte mail connectée",
        mailboxesPlural: "boîtes mail connectées",
        audits: "audit complet par mois",
        auditsPlural: "audits complets par mois",
      },
      plans: {
        starter: {
          tagline: "Un site, un blog ou une boutique à faire monter.",
          cta: "Essai gratuit",
          features: [
            "Audit complet et liste de cibles classée",
            "Messages rédigés, à valider par lot",
            "Relance unique et inbox classé",
            "Liens vérifiés, alerte s'ils disparaissent",
          ],
        },
        pro: {
          tagline: "Plusieurs sites, ou un rythme plus soutenu.",
          cta: "Essai gratuit",
          features: [
            "Tout Starter",
            "Réponse prête à insérer quand un site dit oui",
            "Trois options toutes faites quand on vous demande de payer",
          ],
        },
        business: {
          tagline: "Un portefeuille de sites, ou ceux de vos clients.",
          cta: "Essai gratuit",
          features: [
            "Tout Pro",
            "Une boîte d'envoi par site ou par marque",
            "De quoi mener plusieurs campagnes de front",
          ],
        },
      },
    },
    faq: {
      label: "Questions fréquentes",
      title: "Les questions qu'on se pose avant d'essayer",
      items: [
        {
          q: "C'est quoi, exactement ?",
          a: "Un outil de netlinking par email. Il trouve les sites qui ont une raison de vous citer, rédige une demande pour chacun, l'envoie depuis votre boîte mail, relance une fois, classe les réponses et vérifie que le lien est en ligne. Vous validez chaque lot avant l'envoi.",
        },
        {
          q: "C'est fait pour qui ?",
          a: "Pour ceux qui ont un site à faire monter et pas le temps de faire du netlinking : éditeurs de sites, blogueurs, fondateurs de SaaS, e-commerçants. Si vous gérez plusieurs sites, ou ceux de vos clients, l'offre Business est prévue pour ça.",
        },
        {
          q: "Est-ce que c'est du spam ?",
          a: "Non. Dix emails par heure au plus, depuis votre propre boîte, à des sites dont la page a été lue et qui ont une raison précise de vous citer. Chaque message cite cette raison. Une seule relance, un lien de désinscription, et quelqu'un qui refuse n'est plus recontacté.",
        },
        {
          q: "Google peut-il me pénaliser ?",
          a: "Ce que Google sanctionne, ce sont les liens achetés non déclarés et les réseaux de sites. Nous ne faisons ni l'un ni l'autre : chaque lien vient d'un éditeur qui a choisi de vous citer. Personne ne peut exclure tout risque, mais un lien éditorial demandé à un site pertinent reste dans ses consignes.",
        },
        {
          q: "Combien de liens vais-je obtenir ?",
          a: "On ne peut pas le savoir à l'avance, et nous ne promettons aucun nombre de liens. En face, quelqu'un décide de vous citer ou non. Ce qui dépend de nous : écrire au bon site, pour une bonne raison, et ne laisser aucune réponse sans suite.",
        },
        {
          q: "Les messages partent de ma propre boîte ?",
          a: "Oui. Vous reliez votre boîte mail et tout part de votre adresse, signé de votre prénom. Rien ne passe par un serveur d'envoi partagé avec d'autres clients, et vos identifiants sont chiffrés.",
        },
        {
          q: "Que fait l'IA, et qu'est-ce que je garde en main ?",
          a: "L'IA cherche, lit les sites, rédige, relance et classe les réponses. Vous choisissez les cibles, relisez les messages et validez chaque lot : rien ne part sans vous. Les emails ne précisent pas qu'une IA a aidé à les écrire, puisque vous les relisez et les signez. Si on vous pose la question, la réponse doit rester honnête.",
        },
        {
          q: "Et si un site me demande de payer ?",
          a: "Ça arrive souvent. La réponse est classée à part et vous avez trois options : décliner, proposer un échange, ou accepter si vous avez fixé un budget, le lien étant alors présenté comme sponsorisé. L'option proposée par défaut est de décliner poliment.",
        },
        {
          q: "Et les sites qui n'ont qu'un formulaire de contact ?",
          a: "Le message est prêt, vous le collez vous-même dans leur formulaire : c'est une tâche dans votre liste. Nous ne remplissons aucun formulaire et ne créons aucun compte à votre place.",
        },
        {
          q: "Combien ça coûte ? Puis-je essayer sans carte ?",
          a: "Oui. Les sept premiers jours sont offerts, sans carte bancaire. Si vous continuez, vous choisissez l'une des trois offres de la section Tarifs, plus haut.",
        },
        {
          q: "Est-ce légal ? Et mes données ?",
          a: "Écrire à un professionnel au sujet de son activité est permis, à condition qu'il puisse refuser : chaque message le lui permet, et un refus est définitif. Côté données, la lecture de votre boîte se limite aux fils de campagne et rien n'est revendu. Nos textes juridiques sont en cours de relecture par un juriste.",
        },
      ],
    },
    finalCta: {
      label: "Pour commencer",
      title: "Regardez d'abord ce que l'outil trouve pour votre site",
      text: "En quelques minutes : vos concurrents, vos pages à pousser, les sites à contacter. Sept jours d'essai offerts, et aucun email ne part sans votre accord.",
      primary: "Essai gratuit",
      secondary: "Voir les tarifs",
      hints: [
        "7 jours d'essai offerts",
        "Aucun lien acheté",
        "Rien n'est envoyé sans votre accord",
      ],
    },
    footer: {
      label: "Pied de page",
      tagline:
        "Des liens éditoriaux demandés aux bons sites, depuis votre boîte mail, avec votre accord.",
      productTitle: "Produit",
      accountTitle: "Compte",
      legalTitle: "Informations légales",
      legalLinks: [
        { href: "/mentions-legales", label: "Mentions légales" },
        { href: "/confidentialite", label: "Confidentialité" },
        { href: "/conditions", label: "Conditions d'utilisation" },
      ],
      freeAudit: "Essai gratuit",
      mailboxGuides: "Connecter sa boîte mail",
      signIn: "Se connecter",
      rights: "Tous droits réservés.",
    },
  },
  legalPages: {
    provisional:
      "Version provisoire : ce texte décrit le fonctionnement actuel du service et sera revu par un juriste avant l'ouverture au public.",
    toBeFilled: "À renseigner avant l'ouverture au public",
    back: "Retour à l'accueil",
    updated: "Dernière mise à jour : 15 novembre 2026",
    notice: {
      slug: "mentions-legales",
      title: "Mentions légales",
      description: "Éditeur, hébergement et contact du service.",
      sections: [
        {
          title: "Éditeur du service",
          body: [
            "Éditeur : à renseigner (nom ou raison sociale, forme juridique, adresse, numéro d'immatriculation).",
            "Directeur de la publication : à renseigner.",
            "Contact : à renseigner.",
          ],
        },
        {
          title: "Hébergement",
          body: [
            "Application : Vercel Inc. Base de données et authentification : Supabase, projet hébergé dans la région de Paris.",
          ],
        },
        {
          title: "Nature du service",
          body: [
            "Le service prépare et envoie, avec l'accord de l'utilisateur, des demandes de liens éditoriaux depuis sa propre boîte mail. Il ne vend ni n'achète de liens et ne garantit l'obtention d'aucun lien.",
          ],
        },
      ],
    },
    privacy: {
      slug: "confidentialite",
      title: "Confidentialité",
      description: "Les données que nous traitons, pourquoi, et comment exercer vos droits.",
      sections: [
        {
          title: "Données de votre compte",
          body: [
            "Votre adresse email (connexion par lien), votre site, vos requêtes et votre prénom de signature. Elles servent à faire fonctionner le service et à vous contacter à son sujet.",
          ],
        },
        {
          title: "Votre boîte mail",
          body: [
            "Les identifiants sont chiffrés. La lecture se limite aux fils de campagne ; le contenu d'un email entrant est traité comme une donnée, jamais comme une instruction.",
          ],
        },
        {
          title: "Données des sites contactés",
          body: [
            "Nous lisons des pages publiques et des adresses de contact publiées par les sites cibles, à des fins de prospection professionnelle. Chaque message permet de refuser ; une désinscription alimente une liste de suppression et arrête tout envoi. Ces données sont conservées pour une durée limitée et supprimées à la demande.",
          ],
        },
        {
          title: "Prestataires",
          body: [
            "Hébergement et base de données (Vercel, Supabase), orchestration (Inngest), données de référencement (DataForSEO), modèles de langage pour l'analyse et la rédaction, paiement (Stripe) et emails du service (Resend). Seules les données nécessaires leur sont transmises.",
          ],
        },
        {
          title: "Vos droits",
          body: [
            "Accès, rectification, effacement, opposition et limitation du traitement, auprès du contact indiqué dans les mentions légales. Vous pouvez aussi saisir la CNIL.",
          ],
        },
      ],
    },
    terms: {
      slug: "conditions",
      title: "Conditions d'utilisation",
      description: "Les règles d'usage du service.",
      sections: [
        {
          title: "Objet",
          body: [
            "Le service aide à obtenir des liens éditoriaux gratuits : audit, plan, tri des cibles, préparation et envoi de messages validés par l'utilisateur, suivi des réponses et des liens.",
          ],
        },
        {
          title: "Aucune garantie de résultat",
          body: [
            "Un lien dépend de la décision du site contacté. Aucun nombre de liens, de positions ou de trafic n'est garanti.",
          ],
        },
        {
          title: "Usage autorisé",
          body: [
            "Vous ne devez pas envoyer de messages trompeurs, contacter des personnes qui ont refusé, ni contourner les plafonds d'envoi. Le service peut suspendre une boîte ou un compte en cas de rebonds ou de plaintes élevés.",
          ],
        },
        {
          title: "Abonnement",
          body: [
            "L'audit gratuit ne demande aucune carte. Les envois réels demandent un abonnement mensuel, dont les plafonds sont indiqués sur la page d'accueil. Les conditions de résiliation et de remboursement restent à définir.",
          ],
        },
      ],
    },
  },
  auth: {
    title: "Connexion",
    welcome: "Bon retour",
    welcomeIntro: "Connectez-vous à votre espace.",
    email: "Adresse email",
    password: "Mot de passe",
    submit: "Se connecter",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    forgotLink: "Mot de passe oublié ?",
    noAccount: "Vous n'avez pas encore d'espace ?",
    createOne: "Créer mon espace",
    backToSite: "Retour au site",
    terms: "Conditions d'utilisation",
    privacy: "Confidentialité",
    signOut: "Se déconnecter",
    errorCallback:
      "Le lien est invalide ou a expiré. Reconnectez-vous ou demandez un nouveau lien.",
    signupConfirm: "Vérifiez votre boîte mail.",
    checkInbox: {
      title: "Vérifiez votre boîte mail",
      signup:
        "Si un espace peut être créé pour {email}, un lien de confirmation vient d'y être envoyé. Cliquez dessus pour ouvrir votre espace.",
      reset:
        "Si un espace existe pour {email}, un lien pour choisir un nouveau mot de passe vient d'y être envoyé.",
      spam: "Rien reçu après quelques minutes ? Regardez dans vos courriers indésirables.",
      otherAddress: "Utiliser une autre adresse",
      haveAccount: "Vous avez déjà un espace ?",
      signIn: "Se connecter",
    },
    forgot: {
      title: "Mot de passe oublié",
      intro:
        "Entrez votre email : nous vous envoyons un lien pour choisir un nouveau mot de passe.",
      submit: "Envoyer le lien",
      sent: "Lien envoyé.",
      back: "Retour à la connexion",
    },
    reset: {
      title: "Nouveau mot de passe",
      intro: "Choisissez le mot de passe de votre espace.",
      password: "Nouveau mot de passe",
      submit: "Enregistrer le mot de passe",
    },
    errors: {
      email: "Adresse email invalide.",
      name: "Indiquez votre nom (80 caractères au plus).",
      passwordShort: "Le mot de passe doit contenir au moins 8 caractères.",
      passwordLong: "Le mot de passe est trop long (72 caractères au plus).",
      passwordRequired: "Indiquez votre mot de passe.",
      invalidCredentials: "Email ou mot de passe incorrect.",
      notConfirmed: "Confirmez d'abord votre adresse : un email de confirmation vous a été envoyé.",
      rateLimit: "Trop de tentatives ou d'emails envoyés. Réessayez dans quelques minutes.",
      sessionExpired: "Le lien a expiré. Demandez un nouveau lien de réinitialisation.",
      generic: "Une erreur est survenue. Réessayez dans un instant.",
    },
  },
  signup: {
    title: "Créez votre espace",
    intro: "Trois champs et vous y êtes : aucune carte pour voir vos premières cibles.",
    fields: {
      name: "Votre nom",
      namePlaceholder: "Camille Martin",
      email: "Adresse email",
      emailPlaceholder: "camille@monsite.fr",
      password: "Mot de passe",
      passwordPlaceholder: "Choisissez un mot de passe sûr",
      passwordHint: "8 caractères au moins.",
    },
    submit: "Créer mon espace",
    steps: [
      "Confirmez votre adresse email : un lien vous est envoyé.",
      "Ajoutez l'adresse de votre site : nous déduisons le thème et les recherches à surveiller.",
      "Voyez vos vraies cibles et des exemples de messages, gratuitement. La carte n'est demandée qu'au premier envoi réel.",
    ],
    already: "Vous avez déjà un espace ?",
    signIn: "Se connecter",
    legal: "En créant votre espace, vous acceptez les",
    legalLink: "conditions d'utilisation",
    panel: {
      label: "Netlinking par audit",
      title: "Les demandes partent toutes seules. Vous validez les lots.",
      points: [
        "Messages envoyés depuis votre propre boîte mail",
        "Tri des cibles : liens payants, sites piratés et concurrents écartés",
        "Chaque lien vérifié sur la page en ligne",
      ],
      agent: "agent",
      running: "En cours",
      example: "Exemple",
      lines: [
        { step: "Vérifié", text: "Lien en ligne : blog-voyage.fr/ressources" },
        { step: "Réponse", text: "« Avec plaisir, je l'ajoute à ma page ressources. »" },
        { step: "Envoi", text: "Demande envoyée depuis vous@votresite.fr" },
        {
          step: "Brouillon",
          text: "Accroche tirée de leur page : « guide complet des randonnées en Bretagne »",
        },
      ],
    },
  },
  workspace: {
    title: "Votre espace",
    signedInAs: "Connecté en tant que",
    workspace: "Workspace",
    intro: "Commencez par l'audit : il alimente tout le reste.",
    startAudit: "Aller à l'audit",
    setupSite: "Configurer mon site",
    analyzeSite: "Analyser mon site",
    mySites: "Mon site",
  },
  onboarding: {
    title: "Analyser votre site",
    description:
      "Collez l'adresse de votre site. Nous en déduisons le thème et les recherches à surveiller, puis vous relisez et lancez l'analyse.",
    urlLabel: "Adresse de votre site",
    urlPlaceholder: "monsite.fr",
    urlHint: "Rien d'autre à renseigner pour commencer.",
    market: {
      country: "Pays visé",
      countryHint:
        "Chaque pays a sa propre campagne : son analyse, ses cibles, son contexte local. Vous pourrez en ajouter une autre pour le même site.",
      language: "Langue du site",
      languageAuto: "Détectée sur votre site",
      languageHint:
        "Si votre site existe en plusieurs langues, nous lisons la version de cette langue, sans rien traduire.",
      goalLegend: "Votre objectif",
      goalAuthority: "Faire ranker le site en général",
      goalAuthorityBody: "Nous visons l'autorité de votre site : la page citée est votre accueil.",
      goalPages: "Faire ranker des pages précises",
      goalPagesBody: "Vous choisissez les pages de votre site à faire citer.",
      addCountry: "Ajouter un pays",
      campaignNote: "Une campagne = un site pour un pays. Vous pourrez en ajouter une par pays.",
    },
    reading: {
      title: "Lecture de votre site",
      estimate: "Environ 30 secondes. Vous pouvez rester sur cette page.",
      home: "Page d'accueil lue",
      homeDetail: (language: string, theme: string) =>
        `Langue : ${language === "en" ? "anglais" : "français"}${theme ? ` · thème : ${theme}` : ""}`,
      pages: "Plan du site et pages principales lus",
      profile: "Activité et public compris",
      failed: "Nous n'avons pas pu lire tout votre site : vous pourrez compléter à la main.",
    },
    submit: "Analyser mon site",
    submitting: "Lecture de votre site…",
    advanced: "Vous préférez tout saisir vous-même ?",
    advancedLink: "Formulaire complet",
    messages: {
      invalidUrl: "Cette adresse ne ressemble pas à un site public. Exemple : monsite.fr",
      unauthenticated: "Votre session a expiré. Reconnectez-vous.",
      noWorkspace: "Aucun espace de travail trouvé pour ce compte.",
      saveError: "Impossible d'enregistrer votre site. Réessayez dans un instant.",
      siteNotFound: "Site introuvable.",
      invalid: "Vérifiez les informations saisies.",
      themeInvalid: "Indiquez le thème de votre site en quelques mots (2 à 60 caractères).",
      queriesMissing: "Indiquez le thème de votre site pour que nous puissions lancer l'audit.",
      costChanged:
        "Le coût ou les recherches ont changé depuis l'affichage. Rechargez la page pour revoir le total avant de lancer.",
    },
    brand: {
      title: "Ce que nous avons compris de votre site",
      body: "Ce profil guide toute la suite : les recherches, les sites à contacter et les messages. Relisez-le et corrigez ce qui est faux, c'est ce qui compte le plus.",
      empty:
        "Nous n'avons pas pu lire assez de votre site pour établir ce profil. Remplissez-le à la main, ou laissez vide : vous pourrez le compléter plus tard.",
      readSummary: (pages: number, version: number) =>
        `Établi à partir de ${pages} page${pages > 1 ? "s" : ""} de votre site (version ${version}).`,
      editedSummary: (version: number) => `Version ${version}, corrigée par vous.`,
      pagesRead: "Pages lues",
      activity: "Activité",
      activityHint: "Ce qu'est votre site, en une phrase.",
      offer: "Ce que vous proposez",
      offerHint: "Contenus, outils, produits ou services concrets.",
      audience: "Public visé",
      audienceHint: "Une personne ou un groupe par ligne.",
      resources: "Pages à faire citer",
      resourcesHint:
        "Cochez les pages de votre site qu'un éditeur aurait intérêt à citer, en plus de l'accueil. Décochée, une page n'est simplement pas proposée comme cible d'un lien.",
      resourcesNone:
        "Nous n'avons pas trouvé d'autre page à proposer : seule l'accueil sera citée. Vous pourrez affiner après l'audit.",
      homePage: "Page d'accueil",
      homeAlways: "Proposée par défaut : décochez-la si vous préférez faire citer d'autres pages.",
      addPage: "Ajouter une page de votre site",
      addPageHint: "Collez l'adresse complète : nous vérifions qu'elle répond avant de l'ajouter.",
      edit: "Modifier",
      summaryEmpty: "Non renseigné",
      names: "Façons d'écrire votre nom",
      namesHint:
        "Une par ligne. Elles servent à retrouver les sites qui parlent de vous sans vous lier.",
      publishers: {
        title: "Les types de sites que nous chercherons",
        hint: "Déduits de votre site. Cliquez sur une étiquette pour la désactiver, retirez celles qui ne vous concernent pas, ajoutez les vôtres : la recherche ne visera que les étiquettes actives.",
        suggested: "suggestion",
        turnOff: "Ne plus chercher ce type de site",
        turnOn: "Chercher de nouveau ce type de site",
        remove: (label: string) => `Retirer « ${label} »`,
        none: "Aucune étiquette : la recherche partira des profils décrits ci-dessus.",
        addLabel: "Ajouter un type de site",
        addPlaceholder: "Un autre type de site qui pourrait vous citer",
        add: "Ajouter",
      },
      personas: "Qui aurait une raison de vous citer",
      personasHint:
        "Les sites que personne ne sollicite et qui servent le même public que vous. Une ligne par profil : qui | où on les trouve | pourquoi ils vous citeraient.",
      tone: "Ton",
      messages: {
        noPageSelected: "Cochez au moins une page de votre site à faire citer.",
        addPageInvalid:
          "Cette adresse n'est pas une page de votre site, ou elle ne répond pas (HTTP 200). Vérifiez-la et réessayez.",
        resourceInvalid:
          "Une page à faire citer n'est pas une adresse complète de votre site. Rechargez la page et réessayez.",
        personaInvalid:
          "Chaque profil tient sur une ligne en trois parties : qui | où on les trouve | pourquoi ils vous citeraient.",
        personasMissing: "Indiquez au moins deux profils de sites qui pourraient vous citer.",
        audienceMissing: "Indiquez au moins un public visé.",
        activityMissing: "Renseignez l'activité et ce que vous proposez.",
        invalid: "Le profil de votre site est incomplet ou trop long. Vérifiez les champs.",
        saveError: "Impossible d'enregistrer le profil de votre site. Réessayez dans un instant.",
      },
    },
    review: {
      pageDescription:
        "Relisez ce que nous avons compris de votre site, puis lancez l'analyse. Rien n'est envoyé.",
      title: "Voici ce que nous avons compris",
      body: "Corrigez si besoin : le thème et le profil ci-dessous guident la recherche des sites qui peuvent vous citer.",
      domain: "Site",
      theme: "Thème",
      themeHint: "Quelques mots, sans le nom de votre marque.",
      queriesTitle: "Comment nous cherchons vos concurrents",
      queriesNote:
        "Pour repérer vos vrais concurrents, nous lançons quelques recherches Google déduites automatiquement de votre thème : vous n'avez rien à saisir. Elles ne servent qu'à établir la liste de vos concurrents ; les sites à contacter seront cherchés ensuite à partir des profils qui peuvent vous citer.",
      goal: {
        legend: "Votre objectif",
        hint: "Vous pourrez le changer plus tard. Dans les deux cas, nous visons l'autorité et la visibilité de votre site, sans promesse de résultat.",
        authority: {
          label: "Gagner en autorité générale",
          badge: "Par défaut",
          body: "La page citée est votre accueil. Les ancres sont des noms de marque ou des adresses, ce qui reste naturel et sûr.",
        },
        keywords: {
          label: "Faire monter des mots-clés précis",
          body: "Les mots-clés ne se choisissent pas maintenant : après l'audit, dans le Plan de liens, parmi les mots-clés sur lesquels votre site apparaît réellement.",
        },
        invalid: "Choisissez un objectif parmi les deux propositions.",
      },
      query: "Recherche",
      emptyDeduction:
        "Nous n'avons pas pu lire votre site pour en déduire le thème. Indiquez-le ci-dessous : une seule information suffit.",
      later: {
        title: "Ce que nous vous demanderons plus tard",
        body: "Rien de tout cela n'est nécessaire pour voir les résultats : la vérification que le site est bien le vôtre, votre prénom de signature, ce que vous offrez en échange et votre boîte d'envoi. Nous les demandons juste avant le premier lot de messages. Aucun message n'est envoyé avant que vous ayez validé un lot.",
      },
      launchCard: {
        title: "Prêt à lancer l'analyse",
        body: "Nous cherchons les sites qui peuvent vous citer, nous les trions, puis nous préparons une demande pour chacun. Comptez une quinzaine de minutes.",
        closeWithEmail:
          "Inutile de rester devant l'écran : vous pouvez fermer la page, nous vous écrivons dès que vos cibles sont prêtes.",
        closeNoEmail:
          "Inutile de rester devant l'écran : vous pouvez fermer la page et revenir plus tard, vos cibles seront ici.",
        noSend: "Aucun message n'est envoyé aux sites sans que vous l'ayez validé.",
      },
      seeCost: "Enregistrer et continuer",
      launch: "Lancer l'analyse",
      launching: "Lancement…",
      alreadyTitle: "Une analyse existe déjà pour ce site",
      alreadyOpen: "Voir l'analyse",
    },
  },
  sites: {
    title: "Votre site",
    description:
      "Les informations qui cadrent l'audit et les messages : votre domaine, votre niche, votre signature et ce que vous offrez en échange.",
    listEmptyTitle: "Aucun site enregistré",
    listEmptyBody:
      "Ajoutez votre site pour préparer l'audit. Aucun envoi n'est possible à ce stade.",
    add: "Ajouter mon site",
    edit: "Modifier",
    newTitle: "Ajouter votre site",
    editTitle: "Modifier votre site",
    back: "Retour à mes sites",
    manage: "Gérer ce site",
    fields: {
      domain: "Domaine du site",
      domainHint: "Sans https:// ni chemin, par exemple monsite.fr.",
      niche: "Niche ou thème",
      nicheHint: "Par exemple : coloriages pour enfants, matériel de randonnée.",
      country: "Pays cible",
      language: "Langue des messages",
      signatureFirstName: "Prénom de signature",
      signatureHint: "Les messages seront signés de ce prénom.",
      offeredAsset: "Ce que vous offrez en échange",
      offeredAssetHint:
        "Un guide, un outil, une ressource, une contribution ou un échange de lien : en une ou deux phrases.",
      senderEmail: "Adresse d'envoi (facultatif)",
      senderEmailHint:
        "Vous pourrez connecter votre boîte plus tard, juste avant le premier envoi. Rien n'est envoyé à ce stade.",
      queries: "Requêtes prioritaires",
      queriesHint:
        "Jusqu'à trois requêtes sur lesquelles vous voulez gagner des positions. L'audit analyse le haut de chaque résultat.",
      query: "Requête",
    },
    countries: {
      FR: "France",
      BE: "Belgique",
      CH: "Suisse",
      CA: "Canada",
      LU: "Luxembourg",
      MC: "Monaco",
      GB: "Royaume-Uni",
      US: "États-Unis",
    },
    languages: { fr: "Français", en: "Anglais" },
    save: "Enregistrer",
    create: "Créer le site",
    messages: {
      unauthenticated: "Votre session a expiré. Reconnectez-vous.",
      noWorkspace: "Aucun espace de travail trouvé pour votre compte.",
      duplicate: "Ce domaine est déjà enregistré dans votre espace.",
      notFound: "Site introuvable.",
      saveError: "Enregistrement impossible. Réessayez dans un instant.",
      invalid: "Corrigez les champs signalés.",
      saved: "Site enregistré.",
      verified: "Propriété du domaine vérifiée.",
      alreadyVerified: "Ce domaine est déjà vérifié.",
      notFoundToken:
        "Nous n'avons pas trouvé la balise ni le fichier sur votre site. Vérifiez qu'ils sont en ligne puis réessayez.",
      unreachable: "Votre site est injoignable pour le moment. Réessayez dans un instant.",
      verifyUnavailable: "La vérification est momentanément indisponible. Réessayez plus tard.",
    },
    validation: {
      domain: "Domaine invalide (exemple : monsite.fr).",
      niche: "Décrivez votre niche en 2 à 120 caractères.",
      country: "Choisissez un pays.",
      language: "Choisissez une langue.",
      signatureFirstName: "Indiquez un prénom (60 caractères maximum).",
      offeredAsset: "Décrivez ce que vous offrez en échange (3 à 500 caractères).",
      senderEmail: "Adresse email invalide.",
      queryShort: "Chaque requête fait au moins 3 caractères.",
      queriesMin: "Saisissez au moins une requête prioritaire.",
      queriesMax: "Trois requêtes prioritaires au maximum.",
    },
  },
  audits: {
    title: "Audit",
    description:
      "Concurrents réels de la SERP, écart de liens, pages à pousser. Le coût estimé est annoncé avant tout lancement.",
    analysisTitle: "Votre analyse de",
    analysisDescription: "Nous cherchons les sites qui peuvent vous citer. Rien n'est envoyé.",
    analysisRunning: {
      title: "Analyse en cours",
      body: "Environ 15 minutes. Vous pouvez fermer cette page : l'analyse continue sans vous, et cette page se met à jour toute seule.",
    },
    analysisFailed: {
      title: "L'analyse s'est arrêtée",
      body: "Rien n'est perdu : reprendre l'analyse repart de là où elle s'était arrêtée.",
    },
    analysisDone: {
      title: "Analyse terminée",
      body: "Vos cibles sont prêtes : pour chacune, la demande à faire et pourquoi.",
      cta: "Voir vos cibles",
    },
    noSitesTitle: "Ajoutez d'abord votre site",
    noSitesBody:
      "L'audit part de votre site et de vos requêtes prioritaires. Ajoutez-les pour préparer un audit.",
    addSite: "Ajouter mon site",
    sitesTitle: "Vos sites",
    prepare: "Préparer un audit",
    openCurrent: "Reprendre l'audit en cours",
    noQueriesHint: "Ajoutez au moins une requête prioritaire à ce site pour préparer un audit.",
    editSite: "Modifier le site",
    historyTitle: "Audits précédents",
    open: "Ouvrir",
    back: "Retour aux audits",
    detailTitle: "Audit de",
    status: {
      en_attente: "En attente",
      estime: "Coût estimé",
      confirme: "Confirmé",
      en_cours: "En cours",
      termine: "Terminé",
      echoue: "Échoué",
    },
    estimate: {
      title: "Lancer l'analyse",
      body: "L'analyse cherche les sites qui peuvent vous citer, les trie, trouve un contact et prépare une demande pour chacun. Comptez une quinzaine de minutes : vous pouvez fermer la page. Aucun message n'est envoyé aux sites sans votre accord.",
      confirm: "Lancer l'analyse",
      confirming: "Lancement…",
      retrySend: "Relancer le démarrage de l'analyse",
      resumeTitle: "Reprendre là où elle s'est arrêtée",
      resumeBody: "Ce qui est déjà fait est conservé : reprendre ne refait rien.",
      resume: "Reprendre l'analyse",
    },
    chain: {
      title: "Coût total du parcours",
      body: "Une seule confirmation : après la découverte des concurrents, les backlinks, le profil de liens et les opportunités s'enchaînent seuls, sans autre clic. Aucun email n'est envoyé.",
      discovery: "Concurrents (recherches Google)",
      backlinks: "Backlinks des concurrents",
      profile: "Profil de liens, pages à pousser, écart",
      opportunities: "Opportunités de liens",
      total: "Coût total estimé",
      /** MU.1 : une seule analyse (remplace backlinks, profil de liens et opportunités). */
      analysis: "Recherche, tri et préparation de vos cibles",
      bodyAnalysis:
        "Une seule confirmation : après la découverte des concurrents, la recherche des sites, le tri, les contacts et la préparation des demandes s'enchaînent seuls, sans autre clic. Aucun email n'est envoyé.",
      uncovered:
        "Le plafond de cet audit ne couvre pas toutes les étapes : celles qui manquent (ci-dessous) resteront à lancer à la main, sans frais supplémentaire.",
      progressTitle: "Progression de l'audit",
      progressBody:
        "Les étapes s'enchaînent seules. Vous pouvez quitter cette page : elle se met à jour toute seule.",
      stage: {
        discover: "Concurrents",
        backlinks: "Backlinks",
        profile: "Profil de liens",
        opportunities: "Opportunités",
      },
      state: {
        attente: "En attente",
        en_cours: "En cours",
        termine: "Terminé",
        echoue: "Échoué",
        manuel: "À lancer à la main",
      },
      stopped:
        "L'enchaînement s'est arrêté : relancez l'étape concernée dans la section correspondante.",
    },
    running: {
      title: "Audit en cours",
      body: "La découverte des concurrents est en cours. Vous pouvez quitter cette page : actualisez-la dans une minute.",
    },
    failed: {
      title: "L'audit a échoué",
      body: "Rien de plus n'a été facturé au-delà du coût indiqué. Vous pouvez préparer un nouvel audit.",
    },
    result: {
      title: "Vos concurrents dans la SERP",
      body: "Domaines qui se classent le plus souvent dans le top 30 de vos requêtes prioritaires, hors plateformes génériques.",
      domain: "Domaine",
      queries: "Requêtes",
      bestRank: "Meilleure position",
      appearances: "Apparitions",
      selected: "Retenu",
      yes: "Oui",
      no: "Non",
      none: "Aucun concurrent n'a été trouvé pour ces requêtes.",
      costTitle: "Coût de l'audit",
      estimatedCost: "Estimé",
      actualCost: "Réel",
      gap: "Écart",
      freeNote:
        "Le plan gratuit retient 3 concurrents. Les autres restent listés pour information.",
    },
    messages: {
      unauthenticated: "Votre session a expiré. Reconnectez-vous.",
      siteNotFound: "Site introuvable.",
      notFound: "Audit introuvable.",
      noQueries: "Ajoutez au moins une requête prioritaire à ce site.",
      overCap: "Le coût estimé dépasse le plafond de votre plan. Réduisez le nombre de requêtes.",
      alreadyActive: "Un audit est déjà en cours de préparation pour ce site.",
      dailyCap:
        "Le plafond de dépense quotidien de la plateforme est atteint. Réessayez dans quelques heures : rien n'a été lancé ni facturé.",
      alreadyStarted: "Cet audit est déjà lancé.",
      notReady: "Cet audit n'est pas prêt à être confirmé.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Impossible de préparer l'audit. Réessayez.",
      sendFailed:
        "Audit confirmé, mais le lancement du travail a échoué. Cliquez de nouveau pour le relancer.",
      started: "Audit lancé.",
    },
  },
  backlinks: {
    title: "Backlinks de vos concurrents",
    body: "Pour chaque concurrent retenu, on récupère un lien par domaine qui le cite, puis on retire le bruit : spam, images réutilisées automatiquement, sites étrangers, doublons. Rien n'est lancé sans votre confirmation.",
    estimate: {
      total: "Coût estimé",
      competitors: "Concurrents analysés",
      perCompetitor: "Par concurrent",
      limit: "Liens demandés par concurrent",
      note: "Estimation basée sur la grille publique du fournisseur, comprise dans le plafond de l'audit. Le coût réel est mesuré et affiché à la fin.",
      confirm: "Confirmer et récupérer les backlinks",
      confirming: "Lancement…",
      retrySend: "Relancer l'envoi du travail",
      unavailable:
        "Le plafond de cet audit ne permet pas de récupérer les backlinks de tous les concurrents retenus.",
    },
    running: {
      title: "Récupération des backlinks en cours",
      body: "Vous pouvez quitter cette page : actualisez-la dans une minute.",
    },
    failed: {
      title: "La récupération des backlinks a échoué",
      body: "Vous pouvez la relancer : les appels déjà payés sont réutilisés depuis le cache quand c'est possible.",
    },
    result: {
      title: "Jeu de données nettoyé",
      body: "Compteurs avant et après nettoyage. Seuls les liens conservés sont exportés par défaut.",
      before: "Liens récupérés",
      after: "Liens conservés",
      excluded: "Liens écartés",
      domainsBefore: "Domaines sources avant",
      domainsAfter: "Domaines sources après",
      reasonsTitle: "Pourquoi des liens sont écartés",
      reasonsNote: "Chaque lien écarté est compté une seule fois, dans son premier motif.",
      perCompetitorTitle: "Par concurrent",
      competitor: "Concurrent",
      sampleTitle: "Aperçu des meilleurs liens conservés",
      source: "Source",
      anchor: "Ancre",
      spam: "Spam",
      follow: "Dofollow",
      yes: "Oui",
      no: "Non",
      cost: "Coût réel de cette étape",
      exportKept: "Exporter les liens conservés (CSV)",
      exportAll: "Exporter tout, avec les motifs (CSV)",
      noneKept: "Aucun lien n'a été conservé après nettoyage.",
    },
    reasons: {
      interne: "Lien interne ou de votre propre site",
      plateforme: "Plateforme générique",
      spam: "Spam probable",
      image_reuse: "Image réutilisée automatiquement",
      foreign: "Site étranger hors langue cible",
      doublon: "Doublon",
    },
    csv: {
      headers: [
        "Concurrent",
        "Domaine source",
        "URL source",
        "URL cible",
        "Ancre",
        "Type",
        "Dofollow",
        "Lien cassé",
        "Score de spam",
        "Rang source",
        "Vu pour la dernière fois",
        "Statut",
        "Motifs",
      ],
      kept: "conservé",
      excluded: "écarté",
    },
    messages: {
      unauthenticated: "Votre session a expiré. Reconnectez-vous.",
      notFound: "Audit introuvable.",
      auditNotDone: "L'audit doit être terminé avant de récupérer les backlinks.",
      noCompetitors: "Aucun concurrent retenu pour cet audit.",
      overCap:
        "Le plafond de cet audit ne permet pas de récupérer les backlinks des concurrents retenus.",
      alreadyStarted: "La récupération des backlinks est déjà lancée.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Impossible de préparer la récupération. Réessayez.",
      sendFailed:
        "Récupération confirmée, mais le lancement du travail a échoué. Cliquez de nouveau pour le relancer.",
      started: "Récupération des backlinks lancée.",
    },
  },
  collection: {
    messages: {
      unauthenticated: "Connectez-vous pour lancer la collecte.",
      notFound: "Audit introuvable.",
      auditNotDone: "La collecte devient disponible une fois l'audit des concurrents terminé.",
      noUniverse:
        "Aucune recherche d'éditeurs n'est prête : relancez le cadrage du site pour les générer.",
      alreadyStarted: "La collecte est déjà lancée.",
      overCap:
        "Le coût attendu de la collecte dépasse ce qui reste du plafond de cet audit : rien n'est lancé.",
      dailyCap:
        "Le plafond de sécurité du jour est atteint : la collecte est reportée, rien n'est facturé.",
      saveError: "Impossible d'enregistrer la collecte. Réessayez.",
      sendFailed: "La collecte est enregistrée mais n'a pas pu démarrer. Réessayez.",
      unavailable: "Service momentanément indisponible. Réessayez.",
      started: "Collecte lancée. Rien n'est contacté à cette étape.",
    },
    stopReasons: {
      termine: "Toutes les recherches prévues ont été faites.",
      rendement: "Arrêtée : les dernières recherches n'apportaient presque plus de nouveaux sites.",
      budget_phase: "Arrêtée : le budget prévu pour une phase est atteint.",
      plafond: "Arrêtée : un plafond de sécurité est atteint.",
    },
  },
  qualification: {
    messages: {
      unauthenticated: "Connectez-vous pour lancer la qualification.",
      collectionNotDone:
        "La qualification devient disponible une fois la collecte des sites terminée.",
      alreadyStarted: "La qualification est déjà en cours.",
      overCap:
        "Le coût maximal de la qualification dépasse ce qui reste du plafond de cet audit : rien n'est lancé.",
      dailyCap:
        "Le plafond de sécurité du jour est atteint : la qualification est reportée, rien n'est facturé.",
      saveError: "Impossible d'enregistrer la qualification. Réessayez.",
      sendFailed: "La qualification est enregistrée mais n'a pas pu démarrer. Réessayez.",
      started: "Qualification lancée. Rien n'est contacté à cette étape.",
    },
    /** Motif d'exclusion lisible (code de `EXCLUSION_REASONS`). */
    reasons: {
      doublon: "Même éditeur qu'un autre site de la liste.",
      propre_site: "C'est votre propre site.",
      concurrent: "Concurrent : il propose la même chose que vous.",
      plateforme: "Plateforme ou réseau social : pas un éditeur à qui écrire.",
      geant: "Très grand site : il ne répondra pas à une petite demande.",
      faux_domaine: "Ce n'est pas un vrai site.",
      deja_contacte: "Déjà sollicité récemment par un autre utilisateur.",
      ne_pas_contacter: "Sur la liste « ne pas contacter ».",
      page_accueil: "Page d'accueil : pas une page qu'un éditeur modifie pour une demande de lien.",
      page_legale:
        "Page légale (mentions, conditions, confidentialité) : on ne la fait pas modifier.",
      page_paginee: "Page de pagination (page 2, 3...) : une liste, pas une page de contenu.",
      fichier: "Fichier ou flux, pas une page de contenu.",
      spam: "Signaux de spam trop élevés.",
      langue: "Pas dans votre langue.",
      irrealiste: "Trop gros ou trop institutionnel pour répondre.",
      robots: "Le site interdit la lecture de ses pages par les robots.",
      injoignable: "Le site ne répond pas.",
      page_morte: "La page n'existe plus.",
      parque: "Site parqué, suspendu ou à vendre.",
      pirate: "Le site semble piraté.",
      vend_des_liens: "Le site vend des liens ou des articles sponsorisés.",
      mur_connexion: "Il faut un compte pour voir la page.",
      editeur_introuvable: "Aucun éditeur identifiable (ni contact, ni mentions, ni auteur).",
      hors_budget_lecture: "Pas encore lu : gardé en réserve pour une lecture ultérieure.",
      ressource_abandonnee:
        "Trouvée par un site comparable dont les pages lues n'ont donné aucune cible : non lue.",
      hors_sujet: "Pas assez proche de votre sujet ou de votre public.",
      pas_de_contenu: "Rubrique ou liste d'articles : pas une page où ajouter un lien.",
      page_commerciale: "Page commerciale : on ne la fait pas modifier pour un lien gratuit.",
      ferme_a_liens: "Site d'articles écrits pour placer des liens, pas pour des lecteurs.",
      sans_angle:
        "La page ne cite aucune ressource comme la vôtre : pas de raison honnête de demander un lien.",
      hors_budget_llm: "Pas évalué cette fois : budget de qualification atteint.",
      non_qualifie: "Évaluation impossible cette fois.",
      sans_contact: "Aucun email ni formulaire trouvé.",
      hors_budget_contact: "Contact pas encore cherché : au-delà du nombre prévu.",
    },
    stopReasons: {
      termine: "Tous les candidats retenus ont été évalués.",
      budget: "Arrêtée : le budget de qualification est atteint ; le reste est en réserve.",
      plafond: "Arrêtée : un plafond de sécurité est atteint ; le reste est en réserve.",
    },
  },
  findings: {
    messages: {
      unauthenticated: "Connectez-vous pour lancer l'analyse des pages.",
      qualificationNotDone:
        "L'analyse des pages devient disponible une fois la qualification des cibles terminée.",
      noTargets: "Aucune cible dans la liste courte : rien à analyser.",
      alreadyStarted: "L'analyse des pages est déjà en cours.",
      overCap:
        "Le coût maximal de l'analyse des pages dépasse ce qui reste du plafond de cet audit : rien n'est lancé.",
      dailyCap:
        "Le plafond de sécurité du jour est atteint : l'analyse est reportée, rien n'est facturé.",
      saveError: "Impossible d'enregistrer l'analyse des pages. Réessayez.",
      sendFailed: "L'analyse des pages est enregistrée mais n'a pas pu démarrer. Réessayez.",
      started: "Analyse des pages lancée. Rien n'est contacté à cette étape.",
    },
    kinds: {
      lien_mort: "Lien mort à remplacer",
      lien_inadapte: "Lien peu utile à remplacer",
      mention_sans_lien: "Mention sans lien",
    },
    stops: {
      termine: "Toutes les pages de la liste courte ont été analysées.",
      budget:
        "Arrêtée : le budget d'analyse est atteint ; les pages restantes n'ont que les constats gratuits.",
      plafond:
        "Arrêtée : un plafond de sécurité est atteint ; les pages restantes n'ont que les constats gratuits.",
    },
  },
  targets: {
    title: "Vos cibles",
    reviewSteps: "Voir le détail de l'analyse",
    description:
      "La liste courte, classée : pour chaque site, la demande à faire et pourquoi. Rien n'est envoyé avant que vous ayez validé un lot de messages.",
    back: "Retour à l'analyse",
    notReady: {
      title: "Vos cibles arrivent",
      running: "L'analyse est en cours. Les cibles s'afficheront ici dès qu'elle sera terminée.",
      failed: "L'analyse s'est arrêtée avant la fin. Reprenez-la pour obtenir vos cibles.",
      cta: "Voir l'analyse",
    },
    toPlan: "Voir les messages et le lot",
    messages: {
      unauthenticated: "Connectez-vous pour continuer.",
      notFound: "Audit introuvable.",
      saveError: "Impossible d'enregistrer. Réessayez.",
      unavailable: "Le service est momentanément indisponible. Réessayez.",
      founderMissing:
        "Dites d'abord comment vous vous présentez aux éditeurs : on n'écrit jamais « fondateur » sans votre accord.",
      founderSaved: "Réponse enregistrée.",
      nothingSelected: "Cochez au moins une cible avec un contact.",
      noneEligible:
        "Aucune des cibles cochées ne peut être validée (contact manquant ou déjà validée).",
      planError: "Impossible de créer les demandes. Réessayez.",
      validated:
        "{n} demandes validées. La rédaction des messages est lancée : vous les relirez dans le lot, rien n'est envoyé.",
      validatedNoDrafts: "{n} demandes validées, mais la rédaction n'a pas pu démarrer : {reason}",
      skipped: "{n} ignorées (déjà validées ou sans contact utilisable).",
    },
    founder: {
      title: "Avant de rédiger vos messages",
      body: "Vos messages sont signés de votre prénom. Pour rester honnête avec ceux qui les lisent, choisissez ce qui est vrai : on n'écrit jamais « fondateur » sans votre accord. Ces réglages se changent à tout moment.",
      firstName: "Votre prénom de signature",
      saveAndValidate: "Enregistrer et valider ({n} demandes)",
      recap: "Messages signés {name}, présentés comme {role}.",
      cancel: "Annuler",
      roles: {
        fondateur: "Je suis le fondateur de {site}",
        equipe: "Je fais partie de l'équipe de {site}",
        agence: "Je travaille pour l'agence ou le prestataire de {site}",
      },
      current: "Présentation actuelle : {role}.",
      save: "Enregistrer",
      saving: "Enregistrement…",
      change: "Modifier",
      shortRoles: {
        fondateur: "fondateur",
        equipe: "membre de l'équipe",
        agence: "agence ou prestataire",
      },
    },
    steps: {
      collectMissing:
        "Les sites candidats ne sont pas encore collectés pour cet audit : lancez d'abord la collecte ci-dessus.",
      collect: {
        title: "Collecter les sites candidats",
        body: "On cherche les sites qui lient déjà vos concurrents, ceux qui ressortent sur les recherches de votre public et ceux qui parlent de votre marque. Rien n'est contacté.",
        detail: "{n} recherches payantes sont prévues.",
        button: "Collecter",
        confirm: "Lancer la collecte",
        running: "Collecte en cours (quelques minutes). Actualisez cette page plus tard.",
        failed: "La collecte a échoué : relancez-la (les réponses déjà payées sont gardées).",
        done: "Collecte terminée, coût réel {cost}.",
        redo: "Relancer la collecte",
      },
      cost: {
        expected: "Coût attendu",
        worst: "Pire cas",
        budget: "Budget de l'étape",
        remaining: "Reste sur le plafond de l'audit",
        note: "Annoncé avant tout appel payant. Le coût réel est mesuré et affiché à la fin.",
      },
      qualify: {
        title: "Qualifier les sites",
        body: "On lit les pages candidates, on écarte les sites qui ne conviennent pas (concurrents, vendeurs de liens, hors sujet) et on cherche un contact. Rien n'est envoyé.",
        candidates: "{n} sites passent les filtres gratuits et seront lus.",
        button: "Qualifier",
        confirm: "Lancer la qualification",
        running: "Qualification en cours (de 10 à 25 minutes). Actualisez cette page plus tard.",
        failed: "La qualification a échoué : relancez-la.",
        done: "Qualification terminée : {n} cibles en liste courte, coût réel {cost}.",
        redo: "Requalifier",
        redoNote:
          "Requalifier réécrit la liste courte et supprime les constats : il faudra analyser les pages de nouveau.",
      },
      findings: {
        title: "Analyser les pages",
        body: "On relit la page de chaque cible : liens morts constatés (erreur 404 ou 410), liens peu utiles à son lecteur, mentions de votre nom sans lien. Chaque constat cite la page.",
        targets: "{n} pages seront relues, dont {m} cibles « mentions » sans contact.",
        button: "Analyser les pages",
        confirm: "Lancer l'analyse",
        running: "Analyse en cours (quelques minutes). Actualisez cette page plus tard.",
        failed: "L'analyse a échoué : relancez-la.",
        done: "Analyse terminée : {n} constats, coût réel {cost}.",
        redo: "Relancer l'analyse",
        needQualification: "L'analyse devient disponible une fois la qualification terminée.",
      },
      starting: "Lancement…",
    },
    funnel: {
      summary: (examined: number, kept: number) =>
        `Nous avons examiné ${examined} sites et retenu ${kept} ${kept > 1 ? "cibles" : "cible"}.`,
      detail: (skipped: number, read: number, judged: number) =>
        `${skipped} écartés sans les lire, ${read} pages lues, ${judged} étudiées en détail.`,
      skippedTitle: "Pourquoi des sites sont écartés sans être lus",
      reasons: {
        langue: "dans une autre langue",
        robots: "lecture interdite aux robots",
        injoignable: "ne répondent pas",
        concurrent: "vos concurrents",
        doublon: "déjà présents sous un autre nom",
        plateforme: "plateformes, pas des éditeurs",
        geant: "très gros sites",
        irrealiste: "très gros sites",
        spam: "sites douteux",
        faux_domaine: "adresses invalides",
        propre_site: "votre propre site",
        deja_contacte: "déjà sollicités récemment",
        ne_pas_contacter: "votre liste « ne pas contacter »",
        page_accueil: "pages d'accueil",
        page_legale: "pages légales",
        page_paginee: "pages de pagination",
        fichier: "fichiers, pas des pages",
        autre: "autres motifs",
      } as Record<string, string>,
    },
    /** Suivi de la recherche qui continue après la première liste (18/11). */
    live: {
      running: "La recherche continue.",
      runningBody: (min: number) =>
        `Nous lisons encore d'autres sites : fin estimée dans environ ${min} minutes. Vous pouvez déjà valider les cibles ci-dessous, ou fermer cette page : vous recevrez un email à la fin.`,
      added: (n: number) =>
        `${n} ${n > 1 ? "cibles ajoutées" : "cible ajoutée"} depuis la première liste.`,
      reveal: (n: number) =>
        `${n} ${n > 1 ? "nouveaux sites, afficher" : "nouveau site, afficher"}`,
      done: (n: number) => `Recherche terminée : ${n} ${n > 1 ? "sites" : "site"} à contacter.`,
      newBadge: "Nouveau",
      newFilter: "Nouveaux",
    },
    more: {
      stock: (n: number) =>
        `${n} ${n > 1 ? "autres sites trouvés par la recherche n'ont pas encore été lus" : "autre site trouvé par la recherche n'a pas encore été lu"}.`,
      hint: "Un clic lit le lot suivant (jusqu'à 150 sites, environ 5 minutes), avec les mêmes exigences. Les bonnes cibles trouvées s'ajoutent à votre liste. Vous pouvez recommencer tant qu'il reste des sites.",
      button: "Lire le lot suivant",
      busy: "Lancement…",
      running:
        "Lecture en cours : les nouvelles cibles s'ajouteront à cette liste dans quelques minutes. Vous pouvez rester ici ou revenir plus tard.",
      done: (n: number) =>
        n > 0
          ? `${n} ${n > 1 ? "nouvelles cibles ajoutées" : "nouvelle cible ajoutée"} à la liste.`
          : "Aucune nouvelle cible dans ce lot : nous n'ajoutons rien pour faire du volume.",
      auto: {
        running: (added: number, stock: number) =>
          `Nous continuons à lire les autres sites trouvés. ${added} ${added > 1 ? "cibles ajoutées" : "cible ajoutée"} depuis la première liste, ${stock} ${stock > 1 ? "sites restent à lire" : "site reste à lire"}. Cette liste se met à jour toute seule.`,
        doneLine: (added: number) =>
          `${added} ${added > 1 ? "cibles ont été ajoutées" : "cible a été ajoutée"} après la première liste.`,
        stop: {
          reserve_epuisee: "Lecture terminée : tous les sites trouvés ont été lus.",
          budget:
            "Lecture arrêtée : le budget prévu pour la lecture automatique est atteint. Vous pouvez la reprendre à la main.",
          rendement_faible:
            "Lecture arrêtée : les deux dernières lectures n'ont presque rien apporté, nous n'ajoutons rien pour faire du volume.",
          duree:
            "Lecture arrêtée : la durée maximale de 25 minutes est atteinte. Vous pouvez la reprendre à la main.",
          erreur: "La lecture automatique s'est arrêtée sur une erreur. Vous pouvez la relancer.",
        } as Record<string, string>,
      },
      failedLine: "La lecture s'est arrêtée avant la fin. Vous pouvez la relancer.",
      notReady: "Les cibles ne sont pas encore prêtes.",
      already: "Une lecture est déjà en cours.",
      autoRunning: "La lecture des sites restants est déjà en cours : elle continue toute seule.",
      empty: "Tous les sites trouvés ont déjà été lus.",
      failed: "Impossible de lancer la lecture. Réessayez.",
      started: "Lecture lancée : les nouvelles cibles s'ajouteront à la liste.",
    },
    publishers: {
      label: "Filtrer par type de site",
      title: "Les types de sites cherchés",
      all: "Toutes",
      others: "Autres sites",
      zero: "aucune cible pour l'instant",
      suggested: "suggestion",
      short: "Type de site",
      emptyTab:
        "Aucune cible de ce type pour l'instant. Nous l'avons cherché ; rien n'a passé le tri.",
    },
    filters: {
      label: "Filtrer par tactique",
      rowTitle: "La demande",
      toutes: "Toutes",
      inconnus: "Sites que personne ne sollicite",
      ressources: "Pages ressources et liens morts",
      mentions: "Mentions sans lien",
      count: "{n} cibles",
    },
    siteTypes: {
      mairie: "Mairie ou collectivité",
      association: "Association",
      ecole: "École ou enseignant",
      photographe: "Photographe",
      ecommerce: "Boutique en ligne",
      forum_modere: "Forum modéré",
      blog: "Blog",
      media: "Média",
      annuaire: "Annuaire",
      autre: "Autre site",
    },
    tacticLabels: {
      inconnus: "Personne ne le sollicite",
      ressources: "Page ressources ou lien mort",
      mentions: "Mention sans lien",
    },
    card: {
      rank: "N° {n}",
      why: "Pourquoi cette cible",
      contact: "Contact",
      email: "Email vérifié : {email}",
      emailUnverified: "Email à vérifier : {email}",
      form: "Formulaire de contact : une tâche pour vous (message à copier)",
      none: "Aucun contact trouvé",
      request: "La demande en trois lignes",
      findings: "Ce que nous avons vu sur sa page",
      quote: "Citation de sa page",
      page: "Page lue",
      linkCited: "Lien concerné",
      status: "Réponse du lien : erreur {code}",
      proposed: "Ressource proposée",
      sentenceAfter: "Phrase après",
      anchor: "Ancre",
      select: "Retenir cette demande",
      alreadyValidated: "Déjà validée",
      hosted: "Blog hébergé",
      authority: "Autorité {n}",
      moreFindings: "Autres points relevés sur cette page",
    },
    /** Écran en tableau (18/11) : libellés courts des colonnes et du détail déplié. */
    table: {
      site: "Site",
      why: "Pourquoi ce site",
      request: "Demande",
      type: "Type",
      contact: "Contact",
      open: "Voir le détail",
      close: "Replier le détail",
      quote: "Ce que dit sa page",
      whyLead: "Pourquoi ce site.",
      offer: "Ce que nous proposons",
      page: "Page lue",
      resource: "Votre page",
      alsoTitle: "Autre raison de le contacter",
      requestTags: {
        site_non_sollicite: "Jamais sollicité",
        page_ressources: "Page ressources",
        lien_mort: "Lien mort",
        lien_inadapte: "Lien à remplacer",
        mention_sans_lien: "Mention sans lien",
      },
      contactShort: {
        email: "Email vérifié",
        emailUnverified: "Email à vérifier",
        form: "Formulaire",
        none: "Aucun contact",
      },
    },
    kinds: {
      lien_mort: "Lien mort à remplacer",
      lien_inadapte: "Lien peu utile à remplacer",
      mention_sans_lien: "Mention sans lien",
    },
    list: {
      title: "Liste courte",
      heading: (n: number) => `${n} ${n > 1 ? "sites" : "site"} à contacter`,
      lead: "Chaque site a sa raison. Ouvrez une ligne pour voir le détail, décochez un site pour l'écarter.",
      empty:
        "Vos cibles apparaissent ici quand l'analyse est terminée. Rien n'est contacté à cette étape.",
      emptyFiltered: "Aucune cible pour cette tactique.",
      /** Tactique cherchée sans résultat, ou non lancée faute de chance (chantier C, 18/11/2026). */
      tacticNone: "Cette recherche a été faite : elle n'a trouvé aucune cible pour votre site.",
      mentionsSkipped: "Cette recherche n'a pas été lancée : {reason}.",
      deadPagesSkipped:
        "Les pages disparues de {n} concurrent(s) n'ont pas été cherchées (site trop gros ou d'une autre langue) : {names}.",
      selectAll: "Tout retenir",
      selectNone: "Tout écarter",
      selected: "{n} demandes retenues",
    },
    contactless: {
      title: "Mentions sans lien, sans contact trouvé",
      body: "Ces pages nomment déjà votre site sans le lier (vérifié). Aucun email ni formulaire n'a été trouvé : cherchez l'éditeur dans les mentions légales, ou laissez-les de côté. Elles ne sont pas incluses dans la validation.",
    },
    noContact: {
      title: "Sites pertinents sans contact trouvé ({n})",
      body: "Ces sites ont été jugés pertinents, mais aucun email ni formulaire n'a pu être trouvé. Ils ne sont pas perdus : ouvrez la page, cherchez l'éditeur dans les mentions légales ou les réseaux du site. Ils ne sont pas inclus dans la validation.",
      open: "Ouvrir la page",
    },
    serp: {
      title: "Vos concurrents sur Google",
      body: "Ces sites apparaissent avant vous sur Google pour vos recherches. Nous ne les contactons pas : nous regardons qui fait des liens vers eux, pour trouver des sites qui pourraient aussi en faire un vers vous.",
      empty: "Aucun concurrent trouvé pour ce site.",
      row: "présent sur {queries} de vos recherches · meilleure place : {rank}",
    },
    validate: {
      button: "Valider ces demandes ({n})",
      busy: "Validation…",
      note: "Les messages seront rédigés avec le point précis cité sur chaque page, puis réunis dans un lot que vous relisez et validez avant tout envoi. Rien n'est envoyé maintenant.",
      empty: "Cochez au moins une demande.",
    },
  },
  opportunities: {
    title: "Opportunités de liens",
    body: "On cherche, à partir de votre écart de liens et de requêtes thématiques, les sites susceptibles de vous citer : mentions de marque, pages ressources, annuaires, sites que personne ne sollicite. Rien n'est contacté à cette étape.",
    needsProfile: "Cette étape devient disponible une fois le profil de liens analysé.",
    rationale: {
      ecart_domaines: "Cite déjà plusieurs de vos concurrents mais pas votre site.",
      mention_marque: "Page qui parle de votre marque (requête « {query} ») : lien à vérifier.",
      page_ressources: "Page ressources ou liste de sites de votre thème (requête « {query} »).",
      jamais_sollicite: "Site de votre thème rarement sollicité (requête « {query} »).",
      annuaire: "Annuaire de votre thème (requête « {query} »).",
    },
    types: {
      ecart_domaines: "Écart de domaines",
      mention_marque: "Mention de marque",
      page_ressources: "Page ressources",
      jamais_sollicite: "Jamais sollicité",
      annuaire: "Annuaire",
      lien_mort: "Lien mort",
    },
    priorities: { haute: "Haute", moyenne: "Moyenne", basse: "Basse" },
    estimate: {
      total: "Coût estimé",
      queries: "Requêtes de recherche",
      cap: "Plafond de l'étape",
      note: "Estimation basée sur la grille publique du fournisseur ; le coût réel est mesuré et affiché à la fin.",
      confirm: "Confirmer et chercher des opportunités",
      confirming: "Lancement…",
      retrySend: "Relancer l'envoi du travail",
      unavailable: "Le plafond de cette étape ne permet pas de la lancer. Rien n'a été facturé.",
    },
    running: {
      title: "Recherche d'opportunités en cours",
      body: "Vous pouvez quitter cette page : actualisez-la dans une minute.",
    },
    failed: {
      title: "La recherche d'opportunités a échoué",
      body: "Vous pouvez la relancer : les appels déjà payés sont réutilisés depuis le cache quand c'est possible.",
    },
    result: {
      title: "Opportunités de liens",
      total: "Opportunités",
      byType: "Par type",
      cost: "Coût réel de cette étape",
      none: "Aucune opportunité trouvée.",
      domain: "Site",
      type: "Type",
      priority: "Priorité",
      target: "Page à promouvoir",
      why: "Pourquoi",
      note: "Aucun contact n'est lancé : le plan se valide à l'étape suivante.",
    },
    messages: {
      unauthenticated: "Vous devez être connecté.",
      notFound: "Audit introuvable.",
      profileNotDone: "Analysez d'abord le profil de liens.",
      alreadyStarted: "La recherche d'opportunités est déjà lancée ou terminée.",
      overCap: "Le plafond de l'étape ne permet pas de la lancer.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Impossible de préparer la recherche. Réessayez.",
      sendFailed:
        "Recherche confirmée, mais le lancement du travail a échoué. Cliquez de nouveau pour le relancer.",
      started: "Recherche d'opportunités lancée.",
    },
  },
  plan: {
    keywords: {
      title: "Mots-clés à faire monter",
      body: "Vous avez choisi de faire monter des mots-clés précis. Cochez jusqu'à {max} mots-clés parmi ceux sur lesquels votre site apparaît réellement : ils orienteront les pages citées et les ancres, pour gagner en autorité et en visibilité sur ces recherches.",
      empty:
        "L'audit n'a pas encore trouvé de mots-clés sur lesquels votre site apparaît. Ils s'afficheront ici dès que les pages de l'audit seront analysées ; votre objectif est déjà enregistré.",
      position: "position {n}",
      volume: "{n} recherches par mois",
      save: "Enregistrer mes mots-clés",
      saving: "Enregistrement...",
      authority: {
        title: "Objectif : gagner en autorité générale",
        body: "La page citée est votre accueil et les ancres sont des noms de marque ou des adresses. Pour viser des mots-clés précis, changez d'objectif au prochain lancement d'un audit.",
      },
      messages: {
        unauthenticated: "Votre session a expiré. Reconnectez-vous.",
        notFound: "Audit introuvable.",
        wrongGoal:
          "Votre objectif actuel est l'autorité générale : il n'y a pas de mots-clés à choisir.",
        unknown: "Un mot-clé choisi ne fait pas partie de ceux de votre site. Rechargez la page.",
        tooMany: "Choisissez {max} mots-clés au plus.",
        saveError: "Impossible d'enregistrer vos mots-clés. Réessayez dans un instant.",
        saved: "{count} mot(s)-clé(s) enregistré(s).",
        cleared: "Aucun mot-clé retenu.",
      },
    },
    title: "Plan de liens",
    description:
      "Choisissez les opportunités à travailler, ordonnez-les, puis validez le plan. Rien ne part sans cette validation.",
    back: "Retour à l'audit",
    open: "Ouvrir le plan de liens",
    notReady: "Le plan sera disponible une fois les opportunités de liens générées.",
    none: "Aucune opportunité à planifier pour cet audit.",
    summary: {
      title: "Votre plan",
      body: "Retenez les cibles qui vous conviennent. L'ordre compte : c'est celui des premiers lots. Les ancres suggérées suivent votre profil de liens actuel, pour éviter la sur-optimisation.",
      retained: "retenues sur",
      proposed: "proposées",
      lastVersion: "Dernière version validée : v{version}, {count} cibles, le {date}.",
      neverValidated: "Aucune version validée pour l'instant.",
      note: "Valider fige une nouvelle version (les versions précédentes restent consultables). Aucun contact n'est lancé à cette étape.",
    },
    retain: "Retenir",
    discard: "Écarter",
    discarded: "Écartée",
    partialUrl: "Page à préciser",
    up: "Monter",
    down: "Descendre",
    target: "Page à promouvoir",
    anchor: "Ancre suggérée",
    offer: "Offert en échange",
    noOffer: "Non précisé",
    anchorKinds: {
      marque: "marque",
      url: "adresse du site",
      descriptive: "descriptive",
      generique: "générique",
    },
    validate: "Valider le plan",
    validating: "Validation…",
    messages: {
      unauthenticated: "Vous devez être connecté.",
      notFound: "Élément introuvable.",
      notReady: "Générez d'abord les opportunités de liens.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Impossible d'enregistrer. Réessayez.",
      retained: "Cible retenue.",
      discarded: "Cible écartée.",
      moved: "Ordre mis à jour.",
      nothingSelected: "Retenez au moins une cible avant de valider.",
      alreadyValidated: "Le plan vient d'être validé.",
      validated: "Plan validé : version {version}.",
    },
  },
  triage: {
    title: "Tri des cibles",
    body: "On lit la page de chaque cible du plan validé (robots.txt respecté, une page par site) et on écarte celles qui ne conviennent pas, avec le motif. Rien n'est envoyé : c'est une étape de vérification. Seules les cibles « à contacter » passent à la suite.",
    start: "Trier les cibles",
    starting: "Lancement…",
    running: "Tri en cours. Actualisez la page dans une minute.",
    failed: "Le tri a échoué",
    version: "Plan validé, version {version}",
    summary: "{ok} à contacter, {excluded} écartées, {review} à relire.",
    cost: "Coût de l'analyse : {cost} USD",
    review: "À relire",
    pageFallback: "Page d'accueil utilisée : la page exacte n'a pas été retrouvée.",
    hook: "Accroche",
    columns: { target: "Cible", verdict: "Verdict", reason: "Pourquoi" },
    verdicts: {
      ok: "À contacter",
      payant: "Vend des liens",
      mort: "Page morte",
      pirate: "Site piraté",
      hors_sujet: "Hors sujet",
      compte_obligatoire: "Compte obligatoire",
      concurrent_direct: "Concurrent direct",
      irrealiste: "Trop irréaliste",
      non_verifiable: "Non vérifiable",
      pending: "À trier",
    },
    messages: {
      unauthenticated: "Vous devez être connecté.",
      noPlan: "Validez d'abord le plan de liens.",
      alreadyStarted: "Le tri est déjà lancé ou terminé.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Impossible de lancer le tri. Réessayez.",
      sendFailed: "Le lancement du travail a échoué. Cliquez de nouveau pour le relancer.",
      started: "Tri lancé.",
    },
  },
  contacts: {
    title: "Contacts des cibles",
    body: "Pour chaque cible « à contacter », on cherche l'email sur son site (page de contact, mentions légales, pied de page), sinon via un service de recherche s'il est configuré, sinon un formulaire de contact. Un email n'est jamais marqué « envoyable » tant qu'il n'a pas été vérifié valide. Les formulaires deviennent des tâches à faire à la main. Rien n'est envoyé.",
    start: "Chercher les contacts",
    starting: "Lancement…",
    running: "Recherche en cours. Actualisez la page dans une minute.",
    failed: "La recherche a échoué",
    summary:
      "{sendable} email(s) vérifié(s), {form} formulaire(s) à remplir à la main, {missing} sans contact.",
    tasks: "{count} tâche(s) manuelle(s) à faire.",
    columns: { target: "Cible", status: "Contact" },
    statuses: {
      email_verifie: "Email vérifié",
      email_a_verifier: "Email à vérifier",
      email_invalide: "Email invalide",
      formulaire: "Formulaire à remplir",
      introuvable: "Aucun contact trouvé",
      supprime: "Ne pas contacter",
      pending: "À chercher",
    },
    messages: {
      unauthenticated: "Vous devez être connecté.",
      noPlan: "Validez d'abord le plan de liens.",
      needTriage: "Terminez d'abord le tri des cibles.",
      alreadyStarted: "La recherche est déjà lancée ou terminée.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Impossible de lancer la recherche. Réessayez.",
      sendFailed: "Le lancement du travail a échoué. Cliquez de nouveau pour le relancer.",
      started: "Recherche de contacts lancée.",
    },
  },
  drafts: {
    title: "Messages à valider",
    body: "Pour chaque cible contactable, nous relisons sa page en entier et cherchons le point précis où une de vos pages rendrait service à ses lecteurs. S'il existe, un message court est écrit, avec l'adresse de sa page et celle de la vôtre, signé de votre prénom. Sinon, la cible est écartée avec son motif. Chaque message est vérifié : l'adresse de votre page répond bien (HTTP 200), aucune mention de l'IA, pas de promesse, pas de formule creuse, pas de doublon dans le lot. Les messages de formulaire sont copiés dans vos tâches manuelles. Rien n'est envoyé : la validation par lot vient ensuite.",
    start: "Rédiger les messages",
    starting: "Lancement…",
    running: "Rédaction en cours. Actualisez la page dans une minute.",
    failed: "La rédaction a échoué",
    summary: "{ready} message(s) prêt(s), {fix} à corriger ou à relire.",
    why: "Pourquoi cette cible :",
    hook: "S'appuie sur :",
    ready: "Prêt",
    toFix: "À relire",
    channels: { email: "Email", formulaire: "Formulaire" },
    messages: {
      unauthenticated: "Vous devez être connecté.",
      noPlan: "Validez d'abord le plan de liens.",
      needContacts: "Terminez d'abord la recherche des contacts.",
      needSignature: "Renseignez d'abord le prénom de signature de votre site.",
      alreadyStarted: "La rédaction est déjà lancée ou terminée.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Impossible de lancer la rédaction. Réessayez.",
      sendFailed: "Le lancement du travail a échoué. Cliquez de nouveau pour le relancer.",
      started: "Rédaction lancée.",
      anywayUnknown: "Cette cible n'est plus dans la liste des cibles écartées.",
      anywayStarted:
        "Rédaction lancée pour cette cible. Le message arrive dans « À valider » dans une minute.",
      anywayQueued:
        "Une rédaction est en cours : cette cible sera rédigée à la prochaine exécution (« Rédiger les messages manquants »).",
      nothingMissing: "Tous les messages sont déjà rédigés.",
      missingStarted: (n: number) =>
        `Rédaction lancée pour ${n} ${n > 1 ? "cibles" : "cible"}. Les messages arrivent ici dans quelques minutes.`,
    },
  },
  mailboxes: {
    title: "Boîte d'envoi",
    body: "Les messages partent de votre propre boîte : nous envoyons ceux que vous avez approuvés et lisons les réponses, rien d'autre. Le mot de passe est chiffré avant d'être enregistré et n'est jamais affiché ni relu. Ici, rien n'est envoyé à un tiers : le test vérifie seulement la connexion et, si l'envoi réel est activé, vous adresse un message de test à vous-même.",
    emptyTitle: "Aucune boîte connectée",
    email: "Adresse d'envoi",
    fromName: "Nom affiché",
    username: "Identifiant",
    password: "Mot de passe d'application",
    smtpHost: "Serveur SMTP",
    smtpPort: "Port SMTP",
    imapHost: "Serveur IMAP",
    imapPort: "Port IMAP",
    connect: "Connecter la boîte",
    connecting: "Connexion…",
    test: "Tester la connexion",
    testing: "Test en cours…",
    remove: "Supprimer la boîte",
    removeConfirm:
      "Supprimer cette boîte ? Les messages déjà envoyés restent dans votre historique, mais les réponses lues depuis cette boîte sont supprimées avec elle. Vos messages approuvés attendront qu'une boîte soit reconnectée.",
    status: {
      en_attente: "À tester",
      verifiee: "Connexion vérifiée",
      erreur: "Connexion en échec",
      suspendue: "Suspendue",
    },
    smtp: "Envoi (SMTP)",
    imap: "Lecture (IMAP)",
    ok: "ok",
    ko: "échec",
    healthTitle: "Authentification du domaine d'envoi",
    healthMissing:
      "Non détecté : {list}. Sans SPF et DKIM, vos messages risquent d'arriver en spam. Ce test n'est pas bloquant.",
    healthOk: "SPF, DKIM et DMARC détectés.",
    caps: "Plafonds : {hourly} messages par heure, {daily} par jour.",
    messages: {
      unauthenticated: "Connectez-vous pour gérer votre boîte d'envoi.",
      invalid:
        "Vérifiez les champs : adresse, serveurs, ports (SMTP 25, 465, 587 ou 2525 ; IMAP 143 ou 993) et mot de passe.",
      siteNotFound: "Site introuvable.",
      noKey:
        "Le chiffrement des identifiants n'est pas configuré sur ce serveur : la boîte ne peut pas être enregistrée.",
      duplicate: "Cette adresse est déjà connectée à votre espace.",
      saveError: "Enregistrement impossible. Réessayez.",
      saved: "Boîte enregistrée. Lancez le test de connexion.",
      notFound: "Boîte introuvable.",
      unreadable:
        "Les identifiants enregistrés sont illisibles (clé de chiffrement changée). Supprimez la boîte et reconnectez-la.",
      testOk: "Connexion vérifiée (SMTP et IMAP).",
      testOkDryRun:
        "Connexion vérifiée (SMTP et IMAP). Mode simulation : aucun message n'a été envoyé.",
      testOkSent: "Connexion vérifiée. Un message de test a été envoyé à votre adresse.",
      testFail: "Connexion en échec : {detail}",
      removed: "Boîte supprimée.",
      scheduleSaved: "Horaires enregistrés.",
      scheduleOpenNow: "Les envois sont ouverts en ce moment.",
      scheduleNext: (when: string) => `Prochaine ouverture : ${when}.`,
      scheduleInvalid: "Choisissez au moins un jour, et une heure de fin après l'heure de début.",
    },
    schedule: {
      title: "Jours et heures d'envoi",
      body: "Vos messages ne partent que pendant ces horaires, un par un. Un message approuvé en dehors attend la prochaine ouverture.",
      advice:
        "Conseillé : du lundi au vendredi, de 9 h à 18 h. Un message reçu aux heures de bureau paraît plus naturel et a plus de chances d'être lu.",
      days: "Jours d'envoi",
      dayNames: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
      allDay: "24 h sur 24",
      from: "De",
      to: "à",
      hour: (h: number) => `${h} h`,
      timezone: "Heure de Paris.",
      save: "Enregistrer les horaires",
      saving: "Enregistrement…",
      current: (hours: string) => `Horaires actuels : ${hours}.`,
    },
  },
  batches: {
    title: "Lots à valider",
    body: "Un lot regroupe des messages prêts, à contacts vérifiés. Pour chaque site : la demande, pourquoi lui, ce qui a motivé le tri, et le message exact. Vous pouvez modifier ou retirer un message (il est alors relu par le même contrôle). Valider le lot le verrouille : seul un lot validé pourra être envoyé. Aucun envoi n'a lieu dans cette étape.",
    request: "Demande : un lien vers {url} (ancre « {anchor} »).",
    sizeLabel: "Nombre de messages",
    create: "Créer un lot",
    creating: "Création…",
    eligible: "{n} message(s) prêt(s) et sans lot.",
    lot: "Lot {n}",
    count: "{n} message(s)",
    validate: "Valider le lot",
    validating: "Validation…",
    validatedOn: "Validé le {date}",
    locked: "Verrouillé : ce lot est validé.",
    why: "Pourquoi cette cible :",
    triage: "Tri :",
    hook: "S'appuie sur :",
    to: "Destinataire :",
    formChannel: "Formulaire de contact (à remplir à la main, message prêt à coller) :",
    edit: "Modifier",
    save: "Enregistrer",
    saving: "Enregistrement…",
    remove: "Retirer du lot",
    subject: "Sujet",
    message: "Message",
    ready: "Prêt",
    toFix: "À relire",
    edited: "Modifié par vous",
    status: { brouillon: "En préparation", valide: "Validé" },
    messages: {
      unauthenticated: "Vous devez être connecté.",
      noPlan: "Validez d'abord le plan de liens.",
      openExists: "Un lot est déjà en préparation : validez-le ou retirez-en des messages.",
      nothingEligible:
        "Aucun message ne peut entrer dans un lot : il faut un email vérifié et un message prêt, pas déjà dans un lot.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Enregistrement impossible. Réessayez.",
      created: "Lot créé avec {n} message(s). Relisez-le avant de le valider.",
      notFound: "Message ou lot introuvable.",
      locked: "Ce lot est validé : il ne peut plus être modifié.",
      savedReady: "Message enregistré : il passe tous les contrôles.",
      savedNotReady:
        "Message enregistré, mais il ne passe pas tous les contrôles : corrigez-le avant de valider.",
      removed: "Message retiré du lot.",
      emptyBatch: "Le lot est vide.",
      notAllReady: "Certains messages ne sont pas prêts : corrigez-les ou retirez-les du lot.",
      alreadyValidated: "Ce lot est déjà validé.",
      validated: "Lot validé. Il est verrouillé ; l'envoi viendra plus tard.",
    },
  },
  deadlinks: {
    title: "Chasseur 404 : liens morts à reprendre",
    body: "Gratuit, aucun appel payant : on vérifie en HTTP les pages de vos concurrents qui avaient des backlinks (elles répondent 404 ou 410 aujourd'hui) et les liens cassés des pages ressources trouvées. Le crawl est limité (200 requêtes au plus, robots.txt respecté, une requête par seconde et par site). Rien n'est contacté.",
    start: "Lancer le chasseur 404",
    confirming: "Lancement…",
    rationale: {
      competitor_page:
        "Ce site cite {url}, une page de {competitor} qui répond maintenant {status} : un lien de remplacement vers votre site peut l'intéresser.",
      resource_page:
        "Cette page ressources contient un lien cassé vers {url} (réponse {status}) : proposer votre page en remplacement.",
    },
    running: {
      title: "Chasseur 404 en cours",
      body: "Vous pouvez quitter cette page : actualisez-la dans une minute.",
    },
    failed: { title: "Le chasseur 404 a échoué" },
    result: {
      title: "Chasseur 404 terminé",
      created: "Opportunités « lien mort » créées",
      competitorUrls: "Pages de concurrents vérifiées",
      pages: "Pages ressources lues",
      links: "Liens sortants vérifiés",
      robots: "Adresses ignorées (robots.txt)",
      truncated:
        "Le plafond de requêtes a été atteint : une partie des liens n'a pas été vérifiée.",
      note: "Chaque lien mort est prouvé par une réponse 404 ou 410 constatée ; ils apparaissent dans la liste des opportunités.",
    },
    messages: {
      unauthenticated: "Vous devez être connecté.",
      notFound: "Audit introuvable.",
      opportunitiesNotDone: "Générez d'abord les opportunités de liens.",
      alreadyStarted: "Le chasseur 404 est déjà lancé ou terminé.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Impossible de lancer le chasseur 404. Réessayez.",
      sendFailed: "Le lancement du travail a échoué. Cliquez de nouveau pour le relancer.",
      started: "Chasseur 404 lancé.",
    },
  },
  profile: {
    title: "Profil de liens et pages à pousser",
    body: "On mesure les liens de votre site, ses positions dans Google, les domaines qui citent vos concurrents mais pas vous, et on contrôle techniquement les pages les plus utiles. Rien n'est lancé sans votre confirmation.",
    needsBacklinks:
      "Cette étape devient disponible une fois les backlinks des concurrents récupérés.",
    estimate: {
      total: "Coût estimé",
      competitors: "Concurrents de repère",
      rows: "Lignes demandées par appel",
      pages: "Pages contrôlées techniquement",
      note: "Estimation basée sur la grille publique du fournisseur, comprise dans le plafond de l'audit. Le coût réel est mesuré et affiché à la fin.",
      confirm: "Confirmer et analyser le profil de liens",
      confirming: "Lancement…",
      retrySend: "Relancer l'envoi du travail",
      unavailable:
        "Le plafond de cet audit ne permet pas cette étape. Elle n'a pas été lancée et rien n'a été facturé.",
    },
    running: {
      title: "Analyse du profil de liens en cours",
      body: "Vous pouvez quitter cette page : actualisez-la dans une minute.",
    },
    failed: {
      title: "L'analyse du profil de liens a échoué",
      body: "Vous pouvez la relancer : les appels déjà payés sont réutilisés depuis le cache quand c'est possible.",
    },
    result: {
      title: "Profil de liens du site",
      summaryTitle: "Résumé",
      summaryLlm: "Résumé rédigé automatiquement à partir des chiffres ci-dessous.",
      summaryTemplate: "Résumé standard (rédaction automatique indisponible).",
      disclaimer:
        "Les besoins en domaines référents sont des ordres de grandeur, jamais une promesse de classement.",
      referringDomains: "Domaines référents",
      backlinks: "Backlinks",
      brokenBacklinks: "Backlinks cassés",
      dofollow: "Part de liens dofollow (échantillon)",
      brandAnchors: "Ancres de marque (échantillon)",
      benchmark: "Médiane des concurrents mesurés",
      cost: "Coût réel de cette étape",
      overOptimized: "Une ancre commerciale domine l'échantillon : à surveiller.",
      partial:
        "La liste de vos domaines référents est tronquée : l'écart ci-dessous peut inclure des domaines qui vous citent déjà.",
      anchorsTitle: "Ancres les plus fréquentes",
      anchor: "Ancre",
      count: "Occurrences",
      kind: "Type",
      anchorKinds: {
        marque: "Marque",
        url: "URL",
        generique: "Générique",
        vide: "Sans texte",
        autre: "Autre",
      },
      pagesTitle: "Pages à pousser (positions 4 à 20, volume notable)",
      pagesNone: "Aucune page n'est actuellement en positions 4 à 20 avec un volume notable.",
      page: "Page",
      position: "Position moyenne",
      volume: "Volume cumulé",
      pageDomains: "Domaines référents (échantillon)",
      needed: "Besoin estimé (fourchette)",
      tech: "Contrôle technique",
      techStatus: {
        ok: "Correct",
        attention: "À vérifier",
        probleme: "Problème",
        non_verifie: "Non vérifié",
      },
      techIssues: {
        http_erreur: "page en erreur",
        redirection: "redirection",
        non_indexable: "non indexable",
        sans_titre: "sans titre",
        sans_description: "sans description",
        sans_h1: "sans titre H1",
        score_faible: "score technique faible",
      },
      gapTitle: "Écart : domaines qui citent vos concurrents mais pas vous",
      gapNone: "Aucun écart détecté dans l'échantillon.",
      gapDomain: "Domaine",
      gapCompetitors: "Concurrents cités",
      gapSample: "Exemple de page",
    },
    messages: {
      unauthenticated: "Votre session a expiré. Reconnectez-vous.",
      notFound: "Audit introuvable.",
      backlinksNotDone: "Les backlinks des concurrents doivent d'abord être récupérés.",
      noCompetitors: "Aucun concurrent retenu pour cet audit.",
      overCap: "Le plafond de cet audit ne permet pas cette étape.",
      alreadyStarted: "L'analyse du profil de liens est déjà lancée.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Impossible de préparer l'analyse. Réessayez.",
      sendFailed:
        "Analyse confirmée, mais le lancement du travail a échoué. Cliquez de nouveau pour le relancer.",
      started: "Analyse du profil de liens lancée.",
    },
  },
  inbox: {
    intro:
      "Les réponses à vos messages, classées. Rien n'est envoyé d'ici : un brouillon validé attend l'étape d'envoi des réponses.",
    views: {
      chaud: "Chaud",
      tiede: "Tiède",
      offres_payantes: "Offres payantes",
      froid: "Froid",
      en_negociation: "En négociation",
      gagne: "Gagné",
      archive: "Archivé",
    },
    empty: "Aucune réponse dans cette vue.",
    from: "De :",
    receivedOn: "Reçu le {date}",
    confidence: "Confiance {n} %",
    toReview: "À relire",
    injection:
      "Ce message contient des consignes adressées au classifieur : aucun brouillon n'est confié au modèle.",
    category: "Catégorie",
    correct: "Corriger la catégorie",
    correctHint:
      "Une correction vers « désinscription » ou « plainte » supprime aussitôt l'adresse de vos envois.",
    thread: "Fil",
    ourMessage: "Votre message",
    theirMessage: "Leur réponse (contenu externe, non exécuté)",
    drafts: "Réponse à valider",
    noDraft: "Aucun brouillon pour le moment.",
    prepare: "Préparer un brouillon",
    preparing: "Préparation…",
    edit: "Modifier",
    save: "Enregistrer",
    saving: "Enregistrement…",
    validate: "Valider ce brouillon",
    reject: "Rejeter",
    validated:
      "Validé. Il partira au prochain créneau d'envoi (heures ouvrées, plafonds respectés).",
    sendStatus: {
      en_cours: "Envoi en cours.",
      envoye: "Envoyé.",
      simule: "Envoi simulé (mode test : rien n'est sorti du serveur).",
      a_reessayer: "Envoi à réessayer (échec temporaire).",
      echec: "Envoi en échec.",
      ignore: "Non envoyé (adresse supprimée ou réponse à risque).",
    },
    rejected: "Rejeté.",
    edited: "Modifié par vous",
    fromModel: "Rédigé par le modèle",
    fromTemplate: "Gabarit",
    subject: "Sujet",
    message: "Message",
    toFix: "À corriger avant validation :",
    readyToInsert: "Prêt à insérer",
    insertPage: "Page à modifier",
    insertAnchor: "Ancre",
    insertLink: "Lien vers",
    insertAdd: "Phrase à ajouter",
    insertAfter: "Passage après modification",
    copy: "Copier",
    copied: "Copié",
    payment: {
      title: "Cette personne demande de l'argent",
      body: "Trois options, à vous de choisir. Par défaut : décliner poliment. Un achat est toujours présenté comme un lien sponsorisé.",
      decliner: "Décliner poliment",
      echanger: "Proposer un échange",
      achat_plafonne: "Acheter, avec un plafond (lien sponsorisé)",
      budget: "Plafond en euros",
      choose: "Choisir cette option",
      nature: "Nature du lien",
      natureLabels: {
        editorial_gratuit: "Lien éditorial gratuit",
        echange: "Échange",
        sponsorise: "Lien sponsorisé",
      },
    },
    state: {
      title: "Suivi du fil",
      en_negociation: "Mettre en négociation",
      gagne: "Marquer comme gagné",
      archive: "Archiver",
      aucun: "Remettre dans sa vue",
    },
    autonomy: {
      title: "Niveau d'autonomie",
      body: "Manuel : rien n'est préparé sans votre clic. Assisté (par défaut) : les brouillons sont préparés à l'avance, mais rien n'est jamais envoyé sans votre validation. L'autopilot viendra plus tard et ne sera jamais activé par défaut.",
      manuel: "Manuel",
      assiste: "Assisté",
      save: "Appliquer",
    },
    back: "Retour à l'inbox",
    open: "Ouvrir",
    messages: {
      unauthenticated: "Vous devez être connecté.",
      notFound: "Réponse introuvable.",
      noContext: "Le message d'origine n'a pas pu être retrouvé.",
      noSignature: "Renseignez d'abord le prénom de signature du site.",
      noDraftForCategory: "Aucun brouillon n'est prévu pour cette catégorie.",
      injectionBlocked:
        "Ce message contient des consignes cachées : aucun brouillon n'est rédigé par le modèle. Répondez vous-même ou archivez.",
      llmUnavailable: "Le modèle n'est pas disponible pour le moment. Réessayez plus tard.",
      draftReady: "Brouillon prêt à relire.",
      draftFrozen: "Ce brouillon est déjà validé ou rejeté : il ne peut plus changer.",
      badOption: "Choix invalide.",
      budgetRequired: "Indiquez un plafond en euros (entre 1 et 1000).",
      notPayment: "Cette réponse n'est pas une demande de paiement.",
      emptyBody: "Le message ne peut pas être vide.",
      mustFix: "Corrigez d'abord :",
    },
  },
  tasks: {
    intro:
      "Certains sites n'ont qu'un formulaire de contact. Ils ne sont jamais remplis automatiquement : copiez le message, ouvrez la page, envoyez-le vous-même, puis marquez la tâche comme faite. Une relance vous est proposée 10 jours plus tard.",
    sections: {
      toDo: "À faire",
      followUp: "À relancer",
      waiting: "Envoyées, en attente de réponse",
      closed: "Terminées",
    },
    empty: "Rien dans cette liste.",
    summary: {
      toDo: "{n} tâche(s) à faire",
      followUp: "{n} relance(s) à faire",
      none: "Aucune tâche en attente.",
    },
    status: {
      a_faire: "À faire",
      relance_due: "Relance due",
      attente_relance: "Relance prévue",
      relance_faite: "Relancée",
      relance_annulee: "Relance annulée",
      ignoree: "Ignorée",
    },
    cancelReason: {
      reponse: "Réponse reçue",
      refus: "Refus",
      abandon: "Abandonnée",
    },
    fields: {
      message: "Message à coller dans le formulaire",
      followUpMessage: "Message de relance",
      page: "Page de contact",
      target: "Page de votre site proposée",
      doneOn: "Envoyé le {date}",
      followUpOn: "Relance à partir du {date}",
    },
    actions: {
      open: "Ouvrir le formulaire",
      done: "J'ai envoyé le message",
      followUpDone: "J'ai envoyé la relance",
      gotReply: "Ils ont répondu",
      refused: "Refus",
      skip: "Ignorer cette cible",
      abandon: "Ne pas relancer",
      copy: "Copier",
      copied: "Copié",
    },
    messages: {
      unauthenticated: "Vous devez être connecté.",
      notFound: "Tâche introuvable.",
      notPending: "Cette tâche n'est plus à faire.",
      batchNotValidated: "Le lot de ce message n'est pas encore validé.",
      noFollowUp: "Cette tâche n'a pas de relance en attente.",
      tooEarly: "La relance n'est pas encore due.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans un instant.",
      saveError: "Impossible d'enregistrer. Réessayez.",
      done: "Tâche marquée comme faite. Relance prévue dans 10 jours.",
      followUpDone: "Relance marquée comme faite.",
      followUpCancelled: "Relance annulée.",
      skipped: "Cible ignorée.",
    },
    followUpMessage: {
      line1: "Bonjour,",
      line2:
        "Je me permets de revenir vers vous au sujet de mon message envoyé il y a quelques jours par le formulaire de contact de votre site, à propos de cette page : {url}",
      line3:
        "Si ce n'est pas le bon moment ou si je ne m'adresse pas à la bonne personne, aucun souci : un simple mot me suffira.",
      line4: "Bonne journée,",
    },
  },
  links: {
    intro:
      "Les liens posés vers vos pages, vérifiés automatiquement à J+7, J+14 et J+30 : le lien est-il toujours en ligne, dofollow ou nofollow, dans un vrai texte, sur une page indexable ? Une alerte apparaît si un lien disparaît.",
    declareTitle: "Déclarer un lien posé",
    declareHelp:
      "Une cible vous a confirmé le lien : indiquez la page où il se trouve. La première vérification a lieu 7 jours plus tard.",
    fields: {
      site: "Site",
      sourceUrl: "Page qui porte le lien",
      targetUrl: "Page de votre site visée",
      anchor: "Ancre attendue (facultatif)",
    },
    submit: "Suivre ce lien",
    empty: "Aucun lien suivi pour le moment.",
    alertsTitle: "Alertes",
    columns: {
      source: "Page source",
      status: "État",
      rel: "Type de lien",
      checks: "Contrôles",
      next: "Prochain contrôle",
    },
    status: {
      a_verifier: "À vérifier",
      live: "En ligne",
      disparu: "Disparu",
      disparuNeverSeen: "Introuvable",
      injoignable: "Page injoignable",
    },
    rel: {
      dofollow: "Dofollow",
      nofollow: "Nofollow",
      sponsored: "Sponsorisé",
      ugc: "UGC (contenu d'internaute)",
    },
    flags: {
      contextual: "dans le texte",
      notContextual: "hors du texte (menu, pied de page)",
      indexable: "page indexable",
      notIndexable: "page non indexable",
      exactPage: "page exacte",
      otherPage: "autre page du site",
    },
    alerts: {
      disparu: "Le lien a disparu de la page.",
      devenu_nofollow: "Le lien est devenu nofollow ou sponsorisé.",
      non_indexable: "La page qui porte le lien n'est plus indexable.",
    },
    never: "jamais",
    done: "Terminé",
    messages: {
      unauthenticated: "Connectez-vous pour déclarer un lien.",
      siteUnknown: "Site introuvable.",
      sourceInvalid: "L'adresse de la page source n'est pas valide (http ou https).",
      targetInvalid: "L'adresse de la page visée n'est pas valide (http ou https).",
      targetNotOwned: "La page visée doit appartenir au site choisi.",
      sourceSameSite: "La page source doit être sur un autre site que le vôtre.",
      limit: "Limite de liens suivis atteinte pour ce site.",
      duplicate: "Ce lien est déjà suivi.",
      failed: "Impossible d'enregistrer le lien. Réessayez.",
      declared: "Lien enregistré : première vérification dans 7 jours.",
    },
  },
  journey: {
    label: "Étapes",
    steps: {
      site: "Votre site",
      verification: "Vérification",
      vous: "Vous",
      analyse: "Analyse",
      cibles: "Vos cibles",
    },
    stepOf: (i: number, n: number) => `Étape ${i} sur ${n}`,
    done: "terminée",
    current: "en cours",
    open: (name: string) => `Ouvrir l'étape ${name}`,
  },
  shell: {
    nav: {
      home: "Accueil",
      campaigns: "Campagnes",
      toValidate: "À valider",
      conversations: "Conversations",
      mailbox: "Boîte d'envoi",
      yourMessages: "Vos messages",
      billing: "Abonnement",
      notifications: "Notifications",
      changeSite: "Voir tous vos sites",
      short: { conversations: "Échanges" },
      groups: {
        prospecting: "Prospection",
        mailbox: "Messagerie",
        results: "Résultats",
        settings: "Réglages",
      },
      targets: "Cibles",
      overview: "État des lieux",
      account: "Compte",
      messages: "Messages",
      replies: "Réponses",
      links: "Liens obtenus",
      lockedHint: "Après votre premier lot",
      needSite: "Disponible après l'ajout de votre site",
    },
    home: {
      hello: "Bonjour",
      lead: "Voici où en sont vos campagnes et ce qui vous attend.",
      newCampaign: "Nouvelle campagne",
      stats: {
        targets: "Cibles prêtes",
        targetsHint: (n: number) => `dont ${n} ${n > 1 ? "validées" : "validée"}`,
        sent: "Messages envoyés",
        sentHint: "premiers messages partis de votre boîte",
        replies: "Réponses",
        repliesHint: (pct: number | null) =>
          pct === null ? "aucun message envoyé pour l'instant" : `${pct} % de réponse`,
        links: "Liens obtenus",
        linksHint: "vérifiés sur la page",
      },
      steps: {
        title: "Vos premiers liens",
        progress: (done: number, total: number) => `${done} sur ${total} faits`,
        campaign: "Créez votre première campagne",
        campaignDone: "Campagne créée",
        campaignHint: "Nous analysons votre site et trouvons les sites à contacter.",
        validate: "Validez vos cibles",
        validateDone: "Cibles validées",
        validateHint: "Vous choisissez les sites à contacter ; les messages sont rédigés.",
        mailbox: "Connectez votre boîte d'envoi",
        mailboxDone: "Boîte d'envoi connectée",
        mailboxHint: "Les messages partent de votre adresse, à un rythme régulier.",
        send: "Envoyez votre premier lot",
        sendDone: "Premier lot envoyé",
        sendHint: "Vous relisez chaque message avant qu'il parte.",
        go: {
          campaign: "Commencer",
          validate: "Voir les cibles",
          mailbox: "Connecter",
          send: "Relire",
        },
      },
      todo: {
        title: "À faire maintenant",
        none: "Rien ne vous attend pour l'instant.",
        replies: (n: number) =>
          `${n} ${n > 1 ? "réponses attendent" : "réponse attend"} votre décision`,
        drafts: (n: number) => `${n} ${n > 1 ? "messages" : "message"} à valider avant envoi`,
        forms: (n: number) => `${n} ${n > 1 ? "formulaires" : "formulaire"} à remplir à la main`,
        open: "Ouvrir",
      },
      title: "Vos sites",
      description: "Où en est chacun de vos sites, et quoi faire ensuite.",
      add: "Ajouter un site",
      review: "Voir le détail de l'analyse",
      state: {
        onboarding: "À vérifier avant l'analyse",
        analyse: "Analyse en cours",
        reprise: "Analyse arrêtée",
        cibles: "Cibles prêtes",
      },
      action: {
        onboarding: "Continuer",
        analyse: "Voir l'analyse",
        reprise: "Reprendre l'analyse",
        cibles: "Voir vos cibles",
      },
    },
    settingsHub: {
      title: "Réglages",
      description: "Votre boîte d'envoi, vos messages, vos notifications et votre abonnement.",
      back: "Réglages",
      groups: { sending: "Envoi", follow: "Suivi", account: "Compte" },
      links: {
        mailbox: {
          label: "Boîte d'envoi",
          hint: "Connecter votre boîte, jours et heures d'envoi",
        },
        messages: { label: "Vos messages", hint: "Qui écrit, signature, contreparties" },
        notifications: { label: "Notifications", hint: "Ce que vous recevez par email" },
        safeguards: { label: "Garde-fous d'envoi", hint: "Plafonds, pause, niveau d'autonomie" },
        links: { label: "Liens obtenus", hint: "Les liens posés et leur vérification" },
        tasks: { label: "Tâches à faire à la main", hint: "Formulaires de contact à remplir" },
        sites: { label: "Vos sites", hint: "Ajouter un site ou régler l'un d'eux" },
        billing: { label: "Abonnement", hint: "Votre offre et votre facturation" },
      },
    },
    account: {
      title: "Compte",
      description: "Vos réglages, votre abonnement et la sécurité de vos envois.",
      sites: "Vos sites et leurs réglages",
      safeguards: "Garde-fous d'envoi",
      tasks: "Tâches à faire à la main",
      billing: "Abonnement",
    },
  },
  campaigns: {
    eyebrow: "Prospection",
    title: "Campagnes",
    description:
      "Une campagne est l'analyse complète d'un site pour un pays, puis les messages envoyés à ses cibles.",
    new: "Nouvelle campagne",
    empty:
      "Aucune campagne pour l'instant. Créez la première : nous analysons votre site et trouvons les sites à contacter.",
    analysed: (date: string, n: number) =>
      `Analyse du ${date} · ${n} ${n > 1 ? "cibles trouvées" : "cible trouvée"}`,
    notAnalysed: "Pas encore analysée",
    stats: {
      targets: "cibles",
      validated: "validées",
      contacted: "contactées",
      replies: "réponses",
      links: "liens obtenus",
    },
    status: {
      onboarding: "À vérifier avant l'analyse",
      analyse: "Analyse en cours",
      reprise: "Analyse arrêtée",
      toValidate: "Cibles à valider",
      ready: "Messages à envoyer",
      sending: "Envois en cours",
    },
    detail: "Voir le détail de l'analyse",
    conversations: "Voir les conversations",
  },
  settings: {
    eyebrow: "Réglages",
    messages: {
      unauthenticated: "Connectez-vous pour continuer.",
      saveError: "Enregistrement impossible. Réessayez.",
      saved: "Réglages enregistrés.",
    },
    mailbox: {
      title: "Boîte d'envoi",
      description:
        "La boîte d'où partent vos messages. Nous réglons le rythme et arrêtons les envois si trop de messages reviennent en erreur.",
      authTitle: (domain: string) => `Contrôles anti-spam de ${domain}`,
      authNote:
        "Ces trois réglages évitent que vos messages arrivent en indésirables. Ils se font chez l'hébergeur de votre nom de domaine.",
      auth: {
        spf: {
          name: "SPF",
          ok: "votre domaine dit qui a le droit d'envoyer en son nom.",
          absent: "réglage absent. Ajoutez-le chez l'hébergeur de votre domaine.",
          inconnu: "contrôle impossible pour l'instant. Réessayez plus tard.",
        },
        dkim: {
          name: "DKIM",
          ok: "vos messages sont signés.",
          absent: "réglage absent.",
          inconnu:
            "signature non trouvée automatiquement. Vérifiez chez votre fournisseur de messagerie qu'elle est activée.",
        },
        dmarc: {
          name: "DMARC",
          ok: "votre domaine dit quoi faire d'un message non conforme.",
          absent: "réglage absent. Ajoutez-le chez l'hébergeur de votre domaine.",
          inconnu: "contrôle impossible pour l'instant. Réessayez plus tard.",
        },
      },
    },
    yourMessages: {
      title: "Vos messages",
      description:
        "Qui signe vos messages et comment. L'aperçu montre ce que reçoit un éditeur, au mot près pour la signature.",
      who: {
        title: "Qui écrit",
        body: "Un vrai prénom et un vrai rôle : c'est ce qu'un éditeur vérifie en premier.",
        firstName: "Prénom",
        lastName: "Nom",
        optional: "(facultatif)",
        role: (domain: string) => `Votre rôle pour ${domain}`,
        roles: {
          fondateur: "Fondateur",
          equipe: "Membre de l'équipe",
          agence: "Agence ou prestataire",
        },
        written: (sentence: string) => `Écrit tel quel dans le message : « ${sentence} ».`,
        previewName: "Votre prénom",
        noRole: (first: string) => `Je suis ${first}`,
      },
      signature: {
        title: "Signature",
        body: "Une signature d'entreprise classique : votre nom, votre rôle, et ce que vous cochez ici.",
        logo: "Logo de votre entreprise",
        logoHint: "Affiché en petit à côté de votre nom, comme dans une signature professionnelle.",
        logoFile: "Votre logo",
        logoFileHint:
          "PNG ou JPG. Si la messagerie du destinataire bloque les images, le reste de la signature s'affiche normalement.",
        logoCurrent: "Logo actuel",
        logoAlt: "Votre logo",
        logoUnreadable: "Cette image n'a pas pu être lue. Choisissez un fichier PNG ou JPG.",
        site: "Lien vers votre site",
        siteHint: (domain: string) => `${domain}, ajouté sous votre nom.`,
        linkedin: "Profil LinkedIn",
        linkedinHint:
          "Montre qu'une vraie personne écrit. Le plus efficace pour inspirer confiance.",
        linkedinUrl: "Adresse de votre profil",
        linkedinPlaceholder: "linkedin.com/in/votre-profil",
        phone: "Téléphone",
        phoneHint:
          "Utile pour les mairies, associations et commerces, qui préfèrent parfois appeler.",
        phoneNumber: "Votre numéro",
      },
      counterparts: {
        title: "Si un éditeur demande une contrepartie",
        body: "Votre premier message ne propose rien en échange : il propose une page utile à ses lecteurs. Ces choix servent seulement à préparer votre réponse quand un éditeur demande quelque chose en retour.",
        items: {
          partage: { title: "Partager sa page", hint: "Sur vos réseaux ou dans votre newsletter." },
          article: {
            title: "Écrire un article pour son site",
            hint: "Un contenu original, signé de votre nom.",
          },
          lien_retour: {
            title: "Faire un lien en retour",
            hint: "Depuis votre site vers le sien. À garder rare : des échanges de liens en série se repèrent.",
          },
        },
        short: {
          partage: "partager sa page",
          article: "écrire un article pour son site",
          lien_retour: "faire un lien en retour",
        },
        paid: "Payer pour un lien",
        paidHint:
          "Jamais automatique. Chaque demande de paiement vous est soumise, et la réponse par défaut est un refus poli.",
        none: "Rien de coché : si un éditeur demande une contrepartie, la réponse préparée sera un refus poli.",
        some: (list: string) =>
          `Si un éditeur demande une contrepartie, la réponse proposera : ${list}. Vous la validez avant l'envoi.`,
        or: " ou ",
      },
      save: "Enregistrer",
      saving: "Enregistrement…",
      saveNote:
        "S'applique aux prochains messages et à ceux déjà dans « À valider ». Les messages déjà envoyés ne changent pas.",
      preview: {
        title: "Ce que reçoit l'éditeur",
        body: "Exemple de message. Les passages entre crochets changent pour chaque site.",
        from: "De",
        subject: "Objet",
        subjectValue: "Un lien ne fonctionne plus sur votre page",
        hello: "Bonjour,",
        p1: (intro: string) =>
          `${intro}. Dans votre article « [titre de sa page] », le lien vers [la ressource citée] affiche une erreur 404.`,
        p2: (domain: string) =>
          `Nous publions une page à jour sur le même sujet : https://${domain}/[votre-page]. Elle peut le remplacer si elle vous semble utile à vos lecteurs.`,
        bye: "Bonne journée,",
        signature: "Votre signature",
        facts: [
          "Rien ne part sans votre validation.",
          "Chaque message permet à l'éditeur de demander à ne plus être contacté.",
          "Dans un formulaire de contact, la même signature part en texte simple, sans logo.",
        ],
      },
      errors: {
        firstName: "Indiquez votre prénom (60 caractères au plus).",
        lastName: "Le nom est trop long (60 caractères au plus).",
        role: "Choisissez votre rôle.",
        linkedin: "Adresse LinkedIn invalide. Exemple : linkedin.com/in/votre-profil",
        phone: "Numéro de téléphone invalide.",
        logo: "Logo refusé : choisissez une image PNG ou JPG plus légère.",
      },
    },
  },
  notifications: {
    title: "Notifications",
    description:
      "Les emails que nous vous envoyons quand quelque chose demande votre décision ou qu'un lien change.",
    soon: "Bientôt",
    note: "Envoyés à l'adresse de votre compte. Les réglages s'enregistrent dès que vous les changez. Les notifications marquées « Bientôt » sont enregistrées et partiront dès qu'elles seront en service.",
    items: {
      reply_waiting: {
        title: "Une réponse vous attend",
        body: "Un prospect a répondu et sa réponse demande votre décision.",
        when: "Dans les dix minutes",
      },
      to_validate: {
        title: "Des messages sont à valider",
        body: "De nouveaux messages sont prêts à partir.",
        when: "Regroupés, un email par jour au plus",
      },
      links: {
        title: "Un lien est obtenu ou a disparu",
        body: "Un lien vers votre site est en ligne, a changé ou a été retiré.",
        when: "Le premier lien tout de suite, les suivants dans le résumé",
      },
      mailbox: {
        title: "Votre boîte d'envoi a un problème",
        body: "Elle doit être reconnectée ou a été mise en pause.",
        when: "Tout de suite : les envois sont bloqués",
      },
      new_sites: {
        title: "De nouveaux sites à contacter",
        body: "Nous avons trouvé de nouvelles opportunités de lien pour une de vos campagnes.",
        when: "Dans le résumé de la semaine",
      },
      weekly: {
        title: "Résumé de la semaine",
        body: "Messages envoyés, réponses, liens obtenus et prochaines actions.",
        when: "Chaque lundi matin",
      },
    },
    email: {
      subject: (n: number) =>
        n > 1 ? `${n} réponses attendent votre décision` : "Une réponse attend votre décision",
      body: (n: number) =>
        n > 1
          ? `${n} sites que vous avez contactés vous ont répondu. Une réponse est proposée pour chacun : relisez-la, modifiez-la si besoin, puis approuvez-la.`
          : "Un site que vous avez contacté vous a répondu. Une réponse est proposée : relisez-la, modifiez-la si besoin, puis approuvez-la.",
      cta: "Voir les réponses",
      footer:
        "Vous recevez cet email parce que la notification « Une réponse vous attend » est activée dans vos réglages.",
    },
    messages: {
      unauthenticated: "Connectez-vous pour continuer.",
      saveError: "Enregistrement impossible. Réessayez.",
    },
  },
  conversations: {
    eyebrow: "Messagerie",
    title: "Conversations",
    description: "Tous les messages échangés avec tous vos prospects, toutes campagnes confondues.",
    empty:
      "Aucune conversation pour l'instant. Elles apparaissent ici dès qu'un premier message est parti.",
    noMatch: "Aucun fil pour ces filtres.",
    // Pourquoi un email approuvé n'est pas encore parti (retour de Jonathan, 17/11).
    queue: {
      rhythm: (hours: string) =>
        `Vos horaires d'envoi : ${hours}. Un email part toutes les six minutes environ, et pas plus de cinq par jour la première semaine, pour ménager votre boîte.`,
      edit: "Modifier les horaires",
      ouvert: (n: number) =>
        `${n} ${n > 1 ? "emails approuvés attendent" : "email approuvé attend"} leur tour : les envois sont en cours.`,
      plafondJour: (n: number, cap: number, when: string) =>
        `Pour ménager votre boîte, ${cap} ${cap > 1 ? "emails" : "email"} au plus partent par 24 heures pendant les premières semaines : ${n} ${n > 1 ? "attendent" : "attend"} cette limite, le prochain part ${when}.`,
      plafondHeure: (n: number, cap: number, when: string) =>
        `${cap} ${cap > 1 ? "emails" : "email"} au plus partent par heure : ${n} ${n > 1 ? "attendent" : "attend"} cette limite, le prochain part ${when}.`,
      ferme: (n: number, when: string) =>
        `${n} ${n > 1 ? "emails approuvés partiront" : "email approuvé partira"} à la reprise des envois, ${when}.`,
      sans_boite: (n: number) =>
        `${n} ${n > 1 ? "emails approuvés attendent" : "email approuvé attend"} : aucune boîte d'envoi n'est connectée et vérifiée.`,
      simulation: (n: number) =>
        `${n} ${n > 1 ? "emails approuvés attendent" : "email approuvé attend"} : ce serveur est en mode simulation, aucun email réel n'en part.`,
      connect: "Connecter la boîte d'envoi",
    },
    list: "Fils de discussion",
    back: "Retour à la liste",
    you: "Vous",
    why: "Pourquoi ce site.",
    addTag: "Ajouter une étiquette",
    add: "Ajouter",
    removeTag: "Retirer cette étiquette",
    proposed: "Réponse proposée, modifiable",
    approve: "Approuver et envoyer",
    busy: "En cours…",
    more: "Autres options de réponse",
    reply: "Répondre à ce message",
    archive: "Archiver (traité)",
    unarchive: "Remettre dans la boîte de réception",
    archivedBadge: "Archivé",
    inboxZero:
      "Boîte à zéro : plus rien à traiter ici. Les conversations archivées sont dans le filtre « Archivées ».",
    filters: {
      box: "Boîte",
      inbox: (n: number) => `Boîte de réception (${n})`,
      archivedBox: (n: number) => `Archivées (${n})`,
      allBox: "Tout",
      campaign: "Campagne",
      allCampaigns: "Toutes les campagnes",
      read: "Lecture",
      allRead: "Lus et non lus",
      unread: "Non lus",
      status: "Statut",
      allStatus: "Tous les statuts",
      tag: "Étiquette",
      allTags: "Toutes les étiquettes",
      search: "Chercher un site ou une adresse",
    },
    status: {
      a_traiter: "À traiter",
      a_repondu: "A répondu",
      relance: "Relancé",
      envoye: "Envoyé",
      lien_obtenu: "Lien obtenu",
      refuse: "Refusé",
      erreur: "Message revenu en erreur",
      en_attente: "Approuvé, en attente d'envoi",
    },
    messages: {
      notFound: "Conversation introuvable.",
      saveError: "Enregistrement impossible. Réessayez.",
      archived: "Conversation archivée. Elle revient dans la boîte si le site répond.",
      unarchived: "Conversation remise dans la boîte de réception.",
      emptyTag: "Écrivez une étiquette.",
      tooManyTags: "Dix étiquettes au plus par conversation.",
      queued: "Message approuvé. Il partira de votre boîte d'envoi au rythme prévu.",
      queuedAt: (when: string) =>
        `Message approuvé. Départ prévu ${when}, depuis votre boîte d'envoi.`,
      queuedClosed: (when: string) =>
        `Message approuvé. Il part ${when} : vos horaires d'envoi sont fermés d'ici là.`,
      queuedDayCap: (when: string, cap: number) =>
        `Message approuvé. Limite de ${cap} ${cap > 1 ? "emails" : "email"} par 24 heures atteinte (rythme progressif des premières semaines, pour ménager votre boîte). Départ prévu ${when}.`,
      queuedHourCap: (when: string, cap: number) =>
        `Message approuvé. Limite de ${cap} ${cap > 1 ? "emails" : "email"} par heure atteinte. Départ prévu ${when}.`,
      followUpPlanned: (date: string) => `Relance prévue le ${date} sans réponse.`,
      system: {
        rebond: "Le message est revenu en erreur : cette adresse ne sera plus utilisée.",
        reponse_automatique: "Réponse automatique reçue (absence) : la relance est repoussée.",
      } as Record<string, string>,
    },
  },
  toValidate: {
    eyebrow: "Messagerie",
    title: "À valider",
    description: "Tout ce qui attend votre accord avant de partir. Rien n'est envoyé sans vous.",
    none: "Rien à valider pour l'instant. Les messages apparaissent ici dès que vous validez des cibles.",
    noMailbox:
      "Aucune boîte d'envoi n'est connectée : connectez-la pour approuver et envoyer vos emails. Vous pouvez déjà les relire et les modifier.",
    connect: "Connecter une boîte",
    missing: (n: number) =>
      `${n} ${n > 1 ? "cibles validées n'ont" : "cible validée n'a"} pas encore de message.`,
    missingCta: "Rédiger les messages manquants",
    declined: (n: number) =>
      `${n} ${n > 1 ? "cibles écartées" : "cible écartée"} : la rédaction a jugé qu'elles n'avaient pas leur place.`,
    declinedHelp:
      "Une cible proche de votre contenu est toujours rédigée. Celles-ci sont écartées pour une raison nette : concurrent direct, page juridique, ferme à liens, très gros média ou sujet sans rapport. Vous restez libre d'en juger autrement : « Rédiger quand même » écrit un message avec la page de votre site la plus proche, que vous relisez avant tout envoi.",
    anyway: "Rédiger quand même",
    reviewNote: "À relire :",
    hintMailbox: "Connectez d'abord une boîte d'envoi pour approuver et envoyer ce message.",
    hintNotReady: "Corrigez d'abord les points signalés en rouge.",
    drafting: "Rédaction en cours : les nouveaux messages apparaissent ici dans quelques minutes.",
    to: "À :",
    subject: "Objet",
    body: "Message",
    approve: "Approuver et envoyer",
    approveForm: "Approuver ce message",
    edit: "Modifier",
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    later: "Plus tard",
    laterHelp: "Remis à demain",
    wake: "Tout remettre dans la file",
    select: "Sélectionner",
    campaign: {
      label: "Campagne",
      all: "Toutes",
      allLong: "Toutes les campagnes",
      only: "Ne voir que cette campagne",
      onlyNotice: "Vous ne voyez que cette campagne : sélection et actions ne touchent qu'elle.",
      showAll: "Tout voir",
      count: (n: number) => `${n} à valider`,
      selectGroup: (name: string) => `Tout sélectionner dans ${name}`,
      mixed: (n: number) => `Votre sélection touche ${n} campagnes.`,
      several: (n: number) => `${n} campagnes`,
    },
    selectAll: (n: number) => `Tout sélectionner (${n})`,
    selectNone: "Tout désélectionner",
    selected: (n: number) => `${n} ${n > 1 ? "sélectionnés" : "sélectionné"}`,
    bulkApprove: (n: number) => `Approuver et envoyer (${n})`,
    bulkRefuse: (n: number) => `Refuser (${n})`,
    bulkLater: (n: number) => `Plus tard (${n})`,
    bulkRefuseConfirm: (n: number) =>
      `Refuser ${n} ${n > 1 ? "éléments" : "élément"} ? Rien ne sera envoyé.`,
    bulkSkipped: (n: number) =>
      `${n} ${n > 1 ? "formulaires ne s'approuvent" : "formulaire ne s'approuve"} pas ici : ouvrez-les un par un.`,
    busy: "En cours…",
    noReply: "Ne pas répondre",
    openThread: "Voir la conversation",
    copy: "Copier le message",
    copied: "Copié",
    openForm: "Ouvrir le formulaire",
    markDone: "C'est fait",
    formSubject: "Message à coller dans leur formulaire",
    repliesFirst: "Les réponses d'abord : quelqu'un attend.",
    showMore: (n: number) => (n > 1 ? `Afficher les ${n} autres` : "Afficher le dernier"),
    clearSelection: "Annuler",
    confirmRefuse: "Confirmer le refus",
    refuse: "Refuser",
    refuseHelp: "Rien ne sera envoyé. La cible rejoint les cibles écartées.",
    row: {
      reply: "Réponse",
      email: "Email",
      form: "Formulaire",
      fix: "À corriger :",
      formWhy: "Ce site n'a pas d'adresse email : à envoyer vous-même.",
      open: (name: string) => `Lire : ${name}`,
    },
    pane: {
      label: "Lecture du message",
      position: (i: number, n: number) => `${i} sur ${n}`,
      previous: "Précédent",
      next: "Suivant",
      back: "Retour",
      why: "Pourquoi ce site",
      autoNext: "Après chaque décision, le suivant s'ouvre tout seul.",
    },
    recap: {
      title: (n: number) => `${n} ${n > 1 ? "éléments sélectionnés" : "élément sélectionné"}`,
      approveTitle: "Si vous approuvez",
      approve: (n: number) =>
        `${n} ${n > 1 ? "messages partent" : "message part"} de votre boîte, au rythme prévu.`,
      approveNone: "Rien ne peut partir dans cette sélection.",
      stayTitle: "Ce qui ne part pas",
      notReady: (n: number) =>
        `${n} ${n > 1 ? "emails à corriger : ils restent" : "email à corriger : il reste"} dans la file.`,
      noMailbox: (n: number) =>
        `${n} ${n > 1 ? "emails attendent" : "email attend"} une boîte d'envoi connectée.`,
      forms: (n: number) =>
        `${n} ${n > 1 ? "formulaires : à envoyer vous-même, ils restent" : "formulaire : à envoyer vous-même, il reste"} dans la file.`,
      refuseTitle: "Si vous refusez",
      refuse: (n: number) =>
        `${n} ${n > 1 ? "messages sont écartés" : "message est écarté"}, rien n'est envoyé. Les cibles rejoignent les cibles écartées.`,
      refuseNone: "Un formulaire ne se refuse pas ici : rien ne change.",
      laterTitle: "Si vous remettez à plus tard",
      later: (n: number) =>
        `${n > 1 ? `Les ${n} éléments quittent la file et reviennent` : "L'élément quitte la file et revient"} demain.`,
    },
    laterTab: {
      tab: "Plus tard",
      title: (n: number) => `${n} ${n > 1 ? "éléments remis" : "élément remis"} à plus tard`,
      returns: (when: string) => `Revient ${when}`,
      wakeOne: "Remettre dans la file",
      undo: "Annuler",
      none: "Rien n'est remis à plus tard.",
      foot: "Ils reviennent seuls dans la file, à l'heure indiquée.",
      helpTitle: "« Plus tard », comment ça marche",
      help1:
        "Un élément remis à plus tard quitte la file et le compteur du menu pendant 24 heures, puis il revient tout seul.",
      help2:
        "Entre-temps, rien n'est envoyé et rien n'est perdu. Vous pouvez le remettre dans la file à tout moment.",
      help3:
        "Pour ne plus voir un élément, utilisez « Refuser » : la cible rejoint les cibles écartées.",
    },
    zero: {
      title: "Tout est traité",
      lead: "Rien n'attend votre accord. Voici ce qui se passe maintenant, sans vous.",
      sending:
        "Les emails approuvés partent de votre boîte, au rythme prévu. Dans Conversations, chacun affiche son heure de départ.",
      later: (n: number) =>
        `${n} ${n > 1 ? "éléments remis à plus tard reviennent" : "élément remis à plus tard revient"} ici tout seul.`,
      laterCta: "Les voir maintenant",
      replies:
        "Les réponses arrivent dans Conversations. Celles qui demandent votre accord reviennent ici.",
      conversations: "Voir les conversations",
      campaigns: "Voir vos campagnes",
    },
    filters: {
      label: "Filtrer par nature",
      all: "Tout",
      replies: "Réponses",
      messages: "Emails à envoyer",
      forms: "Formulaires à remplir",
      messagesShort: "Emails",
      formsShort: "Formulaires",
    },
    tags: {
      reply: "Réponse à approuver",
      message: "Email à envoyer",
      formMessage: "Message pour un formulaire",
      form: "Formulaire à remplir",
    },
    aside: {
      theirs: "Ce qu'ils ont écrit",
      hook: "S'appuie sur",
      then: "Ensuite",
      thenEmail:
        "Le message part de votre boîte, au rythme prévu. Une seule relance, dix jours après, sans réponse.",
      thenForm:
        "Ce site n'a pas d'email. Une fois approuvé, le message vous attend ici, prêt à coller dans son formulaire.",
      todo: "À faire",
      todoForm:
        "Ce site n'a pas d'adresse email. Copiez le message, ouvrez son formulaire, collez-le, envoyez-le, puis cliquez « C'est fait » : la relance sera prévue dans dix jours.",
    },
    messages: {
      unauthenticated: "Connectez-vous pour continuer.",
      nothing: "Aucun message choisi.",
      notFound: "Message introuvable.",
      notReady: "Ce message n'est pas prêt : corrigez les points signalés avant de l'approuver.",
      needMailbox: "Connectez d'abord votre boîte d'envoi : sans elle, aucun email ne peut partir.",
      unavailable: "Service indisponible. Réessayez dans un instant.",
      saveError: "Enregistrement impossible. Réessayez.",
      approved: (n: number) =>
        `${n} ${n > 1 ? "messages approuvés" : "message approuvé"}. Rien d'autre à faire : les emails partent au rythme prévu.`,
      snoozed: (n: number) =>
        `${n} ${n > 1 ? "éléments remis" : "élément remis"} à demain : ${n > 1 ? "ils reviennent" : "il revient"} dans la file à ce moment-là.`,
      woken: "Tout est de retour dans la file.",
      wokenSome: (n: number) =>
        `${n} ${n > 1 ? "éléments sont de retour" : "élément est de retour"} dans la file.`,
      refusedReason: "Refusé par vous.",
      refused: (n: number) =>
        `${n} ${n > 1 ? "messages refusés" : "message refusé"} : rien n'est envoyé. Vous les retrouvez dans les cibles écartées.`,
      repliesDeclined: (n: number) =>
        `${n} ${n > 1 ? "réponses écartées" : "réponse écartée"} : rien n'est envoyé.`,
      saved: "Message enregistré.",
      savedNotReady: "Message enregistré, mais des points restent à corriger avant de l'approuver.",
    },
  },
  overview: {
    title: "État des lieux",
    description: "Les liens de votre site, ceux de vos concurrents et les pages à pousser.",
    waitingTitle: "L'état des lieux arrive avec l'analyse",
    waitingBody: "Il s'affichera ici quand l'analyse de votre site sera terminée.",
    soonTitle: "L'état des lieux arrive bientôt",
    soonBody: "Cet écran est en préparation : il ne bloque rien, vos cibles sont déjà prêtes.",
    toTargets: "Voir vos cibles",
    toAnalysis: "Voir l'analyse",
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
    taches: "Tâches",
    garde_fous: "Garde-fous",
  },
  billing: {
    title: "Abonnement",
    description:
      "Votre plan, vos plafonds d'envoi et vos crédits. Paiement en mode test pour l'instant : aucun prélèvement réel.",
    noWorkspace: "Aucun espace de travail trouvé.",
    currentPlan: "Plan actuel",
    freeNote:
      "Le plan gratuit donne l'audit et le plan de liens. L'envoi réel de messages demande un abonnement.",
    usage: (used: number, cap: number) => `${used} envois sur ${cap} ce mois-ci.`,
    renewsOn: "Renouvellement le",
    endsOn: "Fin de l'abonnement le",
    credits: (n: number) => `Crédits disponibles : ${n}.`,
    fakeNote:
      "Les clés de paiement ne sont pas encore configurées : le bouton de souscription n'aboutit pas à un vrai paiement.",
    portal: "Gérer mon abonnement",
    free: "Gratuit",
    perMonth: "TTC par mois",
    noSending: "Aucun envoi réel",
    sendCap: (n: number) => `${n} envois par mois`,
    sites: (n: number) => `${n} site${n > 1 ? "s" : ""}`,
    audits: (n: number) => `${n} audit${n > 1 ? "s" : ""} complet${n > 1 ? "s" : ""} par mois`,
    mailboxes: (n: number) => `${n} boîte${n > 1 ? "s" : ""} d'envoi`,
    creditsPerMonth: (n: number) => `${n} crédits par mois`,
    choose: (name: string) => `Choisir ${name}`,
    paymentOk: "Merci : votre paiement est en cours de confirmation.",
    link: "Abonnement",
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
    taches: {
      title: "Tâches manuelles",
      description:
        "Les formulaires de contact à remplir vous-même : message prêt à copier, lien vers la page, relance à J+10.",
      emptyTitle: "Aucune tâche pour le moment",
      emptyBody:
        "Quand un lot contient des cibles sans email (formulaire de contact), leurs tâches apparaissent ici après la validation du lot.",
      emptyHint: "Disponible après la validation d'un lot.",
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
  publicAudit: {
    form: {
      domainLabel: "Votre site",
      domainPlaceholder: "monsite.fr",
      queriesLabel: "Vos requêtes principales (facultatif)",
      queriesHint:
        "Jusqu'à 3. Sans saisie, on les déduit des mots-clés sur lesquels votre site est déjà classé (ou, à défaut, de votre thème).",
      queryPlaceholder: "Par exemple : coloriage licorne",
      nicheLabel: "Votre thème (facultatif)",
      nicheHint:
        "Pour un site récent, sans mot-clé classé : on s'en sert pour trouver vos concurrents dans Google.",
      nichePlaceholder: "Par exemple : coloriage pour enfants",
      submit: "Lancer l'audit gratuit",
      retrySubmit: "Relancer l'audit avec ces requêtes",
      pending: "Envoi en cours",
      fineprint:
        "Audit réduit : 3 concurrents, 3 pages prioritaires, 10 cibles à découvrir. Aucun email n'est envoyé à quiconque.",
    },
    errors: {
      invalide: "Demande invalide.",
      domaine_invalide: "Ce domaine n'est pas valide. Exemple : monsite.fr",
      domaine_non_eligible:
        "Ce domaine (plateforme généraliste) ne peut pas faire l'objet d'un audit gratuit.",
      requete_invalide: "Chaque requête doit faire entre 2 et 100 caractères.",
      trop_de_demandes: "Trop de demandes en peu de temps. Réessayez un peu plus tard.",
      limite_quotidienne: "Vous avez atteint la limite d'audits gratuits pour aujourd'hui.",
      capacite_atteinte:
        "L'audit gratuit a atteint sa capacité pour aujourd'hui. Revenez demain ou créez un compte.",
      ferme: "L'audit gratuit est momentanément indisponible.",
      domaine_epuise:
        "L'audit gratuit de ce domaine n'a pas pu aboutir ce mois-ci. Créez un compte pour un audit complet.",
      file_indisponible: "Le service d'audit est momentanément indisponible. Réessayez plus tard.",
      email_invalide: "Adresse email invalide.",
      consentement: "Merci de cocher la case pour recevoir le rapport.",
      rapport_indisponible: "Ce rapport n'est pas encore prêt.",
      erreur: "Une erreur est survenue. Réessayez dans un instant.",
    },
    wait: {
      title: "Audit en cours",
      body: "On interroge Google et les profils de liens de vos concurrents. Cela prend en général une à deux minutes ; la page se met à jour toute seule.",
    },
    failed: {
      title: "L'audit n'a pas abouti",
      reasons: {
        aucun_mot_cle:
          "Google ne montre encore aucun mot-clé classé pour votre site : on ne peut pas déduire vos requêtes. Indiquez ci-dessous 1 à 3 requêtes sur lesquelles vous voulez apparaître, puis relancez.",
        aucun_concurrent: "Aucun concurrent exploitable n'a été trouvé pour ces requêtes.",
        plafond_audit: "L'audit a atteint son plafond de coût avant la fin.",
        erreur_fournisseur: "Une source de données a répondu en erreur.",
        file_indisponible: "Le service d'audit est momentanément indisponible.",
        defaut: "Une erreur est survenue pendant l'audit.",
      },
      back: "Retour à l'accueil",
    },
    report: {
      title: "Audit gratuit de",
      period: "Valable pour le mois en cours : un audit gratuit par domaine et par mois.",
      scoreTitle: "Score d'audit",
      scoreOutOf: "sur 100",
      scoreBands: { a_renforcer: "À renforcer", correct: "Correct", solide: "Solide" },
      scoreNote:
        "Repère de lecture : 60 % pour vos liens comparés à ceux de vos concurrents, 40 % pour la visibilité de vos pages. Ce n'est pas une promesse de résultat.",
      scoreNone: "Pas assez de données pour calculer un score.",
      notRanked: "Non classé",
      notRankedBody:
        "Google ne classe encore aucune page de votre site : un score n'aurait pas de sens. L'analyse repose sur vos concurrents dans Google pour votre thème ; le plan de liens ci-dessous reste valable.",
      numbersTitle: "Votre site en chiffres",
      referringDomains: "Domaines référents",
      rankedKeywords: "Mots-clés classés",
      benchmark: "Médiane des concurrents",
      competitorsTitle: "Vos concurrents dans Google",
      competitorsBody: "Les sites qui se classent le plus souvent devant vous sur vos requêtes.",
      competitor: "Domaine",
      queries: "Requêtes",
      bestRank: "Meilleure position",
      competitorLinks: "Domaines référents",
      pagesTitle: "Pages à pousser en priorité",
      pagesBody:
        "Pages déjà classées entre la 4e et la 20e position sur des mots-clés recherchés : les plus proches d'un gain.",
      pagesNone:
        "Aucune page n'est classée entre la 4e et la 20e position sur des mots-clés recherchés.",
      pagesNewSite:
        "Aucune page classée pour l'instant : la première page à pousser est votre accueil, avec les cibles ci-dessous.",
      page: "Page",
      position: "Position moyenne",
      volume: "Recherches par mois",
      keywordsTitle: "Mots-clés",
      needed: "Domaines référents à viser",
      neededNote: "Ordre de grandeur, sans tenir compte des liens déjà reçus par la page.",
      locked: "Réservé au rapport complet",
      targetsTitle: "Cibles de liens repérées",
      targetsBody:
        "Sites qui renvoient vers vos concurrents et pas vers vous, après retrait du spam et des plateformes.",
      targetMasked: "Domaine masqué",
      targetsShared: "{n} de ces cibles renvoient vers au moins 2 de vos concurrents.",
      targetDofollow: "lien suivi (dofollow)",
      targetNofollow: "lien non suivi (nofollow)",
      targetCitesOne: "Renvoie vers 1 de vos concurrents",
      targetCitesMany: "Renvoie vers {n} de vos concurrents",
      targetExample: "Exemple de page",
      more: "cibles de plus dans l'audit complet",
      partial: "Votre liste de domaines référents est tronquée : l'écart est approximatif.",
    },
    gate: {
      title: "Voir le rapport complet",
      body: "Indiquez votre email pour déverrouiller les 10 cibles, le détail des pages et les domaines à viser. Aucun email n'est envoyé à des sites tiers.",
      emailLabel: "Votre email",
      consent:
        "J'accepte de recevoir mon rapport et des conseils sur mon audit. Je peux me désinscrire à tout moment.",
      submit: "Débloquer le rapport",
      pending: "Envoi en cours",
      legal:
        "Texte de consentement provisoire, à valider par un juriste avant ouverture au public.",
    },
    cta: {
      title: "Aller plus loin",
      body: "Un compte permet de lancer l'audit complet (10 à 20 concurrents, toutes les cibles) puis de préparer un plan de liens que vous validez avant toute action.",
      signIn: "Créer un compte",
    },
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
  analysis: {
    /** Noms affichés des huit étapes de l'analyse unique (docs/jalon-mu.md section 2.2). */
    steps: {
      comprendre: "Comprendre votre site",
      concurrents: "Repérer vos concurrents sur Google",
      etat_des_lieux: "Mesurer vos liens actuels",
      recherche: "Chercher les sites qui peuvent vous citer",
      tri: "Lire et trier les pages trouvées",
      contacts: "Trouver à qui écrire",
      constats: "Relire les pages retenues",
      demandes: "Préparer vos demandes",
    },
    /** Écran « Analyse en cours » (MU.3, textes revus le 18/11/2026 : voir PROGRESS.md, tableau d'audit). */
    screen: {
      intro:
        "Nous cherchons les sites qui peuvent vous citer, et la demande à leur faire. Rien n'est envoyé.",
      closeWithEmail:
        "Vous pouvez fermer cette page : vous recevrez un email dès que c'est prêt. Rien n'est envoyé à qui que ce soit.",
      closeNoEmail:
        "Vous pouvez fermer cette page : l'analyse continue sans vous. Retrouvez-la ici à votre retour. Rien n'est envoyé à qui que ce soit.",
      starting: "L'analyse démarre…",
      /** Ce qui se passe maintenant, en une phrase (titre de l'écran pendant l'analyse). */
      now: {
        comprendre: "Nous lisons votre site",
        concurrents: "Nous repérons vos concurrents sur Google",
        etat_des_lieux: "Nous mesurons vos liens actuels",
        recherche: "Nous cherchons les sites qui peuvent vous citer",
        tri: "Nous lisons les pages trouvées",
        contacts: "Nous cherchons à qui écrire",
        constats: "Nous relisons les pages retenues",
        demandes: "Nous préparons vos demandes",
        between: "L'analyse avance",
      },
      percent: (n: number) => `${n} %`,
      progressLabel: (n: number) => `Avancement de l'analyse : ${n} %`,
      /** Fourchette : une minute précise changerait à chaque rafraîchissement. */
      remaining: (lo: number, hi: number) =>
        hi <= 2
          ? "Moins de 2 minutes"
          : lo === hi
            ? `Encore ${hi} minutes environ`
            : `Encore ${lo} à ${hi} minutes`,
      stepsLabel: "Les étapes de l'analyse",
      stepState: {
        attente: "En attente",
        en_cours: "En cours",
        termine: "Terminée",
        echoue: "Interrompue",
        saute: "Écartée",
      },
      parallel: "en parallèle",
      /** L'étape parallèle n'a rien donné : l'analyse n'est pas interrompue pour autant. */
      parallelFailed: "Non abouti",
      /** Résultat de chaque étape, en une ligne (jamais de montant). Chaque chiffre est celui que le moteur mesure. */
      results: {
        understood: (strong: number) =>
          strong === 0
            ? "Votre activité est cernée"
            : strong === 1
              ? "Votre activité est cernée · 1 page forte repérée"
              : `Votre activité est cernée · ${strong} pages fortes repérées`,
        understoodNote:
          "Pour chaque site contacté, nous choisirons celle de vos pages qui lui correspond le mieux.",
        competitorSearch: (i: number, n: number) => `Recherche Google ${i} sur ${n}`,
        competitorSizing: "Mesure de la taille de chaque concurrent",
        competitors: (n: number) =>
          n <= 1
            ? `${n} vrai concurrent repéré sur Google`
            : `${n} vrais concurrents repérés sur Google`,
        competitorsNote:
          "Les sites qui les citent déjà peuvent vous citer aussi : c'est là que nous cherchons.",
        linksMeasuring: (done: number, total: number) => `Mesure ${done} sur ${total}`,
        linksReferring: (n: number) =>
          n === 0
            ? "Aucun site ne fait encore de lien vers vous"
            : n === 1
              ? "1 site fait déjà un lien vers vous"
              : `${n} sites font déjà un lien vers vous`,
        linksKeywords: (n: number) =>
          n <= 1 ? `visible sur ${n} recherche Google` : `visible sur ${n} recherches Google`,
        linksMeasured: "Vos liens actuels sont mesurés",
        linksTopKeyword: (q: string) => `Votre recherche la plus populaire : « ${q} »`,
        searching: (done: number, total: number) =>
          done < total
            ? `${done} ${done <= 1 ? "recherche faite" : "recherches faites"} sur ${total} environ`
            : `${done} ${done <= 1 ? "recherche faite" : "recherches faites"}`,
        searched: (n: number) => (n <= 1 ? `${n} recherche` : `${n} recherches`),
        sitesFound: (n: number) => (n <= 1 ? `${n} site trouvé` : `${n} sites trouvés`),
        lastSearch: (q: string) => `Dernière recherche : « ${q} »`,
        lastSite: (d: string) => `Dernier site trouvé : ${d}`,
        skippedMentions: (reason: string) =>
          `Recherche de mentions de votre marque écartée : ${reason}.`,
        skippedDead: (n: number) =>
          n <= 1
            ? "Liens morts non cherchés chez 1 concurrent : trop peu de chances d'y trouver quelque chose d'utile."
            : `Liens morts non cherchés chez ${n} concurrents : trop peu de chances d'y trouver quelque chose d'utile.`,
        reading: (done: number, total: number) =>
          `${done} ${done <= 1 ? "page lue" : "pages lues"} sur ${total}`,
        readable: (n: number) => (n <= 1 ? `${n} lisible` : `${n} lisibles`),
        readingNote:
          "Les pages les plus prometteuses sont lues en premier. Les autres sites trouvés restent en réserve.",
        judging: (done: number, total: number) =>
          `${done} ${done <= 1 ? "page évaluée" : "pages évaluées"} sur ${total}`,
        read: (n: number) => (n <= 1 ? `${n} page lue` : `${n} pages lues`),
        kept: (n: number) => (n === 0 ? "aucune retenue" : n === 1 ? "1 retenue" : `${n} retenues`),
        keptPages: (n: number) =>
          n === 0 ? "Aucune page retenue" : n === 1 ? "1 page retenue" : `${n} pages retenues`,
        pageRead: (d: string) => `Page lue : ${d}`,
        checking: (done: number, total: number) =>
          `${done} ${done <= 1 ? "site vérifié" : "sites vérifiés"} sur ${total}`,
        checked: (n: number) => (n <= 1 ? `${n} site vérifié` : `${n} sites vérifiés`),
        contacts: (n: number) =>
          n === 0 ? "aucun contact trouvé" : n === 1 ? "1 contact trouvé" : `${n} contacts trouvés`,
        noSiteToCheck: "Aucun site à vérifier",
        siteChecked: (d: string) => `Dernier site vérifié : ${d}`,
        rereading: (done: number, total: number) =>
          `${done} ${done <= 1 ? "page relue" : "pages relues"} sur ${total}`,
        reread: (n: number) => (n <= 1 ? `${n} page relue` : `${n} pages relues`),
        occasions: (n: number) =>
          n === 0
            ? "aucun lien cassé ni mention à signaler"
            : n === 1
              ? "1 occasion trouvée (lien cassé ou mention)"
              : `${n} occasions trouvées (liens cassés, mentions)`,
        pageReread: (d: string) => `Page relue : ${d}`,
        rereadSkipped: "Écartée : aucune page retenue à relire.",
        skippedGeneric: "Écartée : rien à faire à cette étape.",
        readySoFar: (n: number) =>
          n === 0
            ? "Aucune cible prête pour l'instant"
            : n === 1
              ? "1 cible prête pour l'instant"
              : `${n} cibles prêtes pour l'instant`,
        ready: (n: number) =>
          n === 0 ? "Aucune cible prête" : n === 1 ? "1 cible prête" : `${n} cibles prêtes`,
      },
      funnelTitle: "Du plus large au plus précis",
      funnelRows: {
        found: "Sites trouvés",
        read: "Pages lues",
        kept: "Pages retenues",
        targets: "Cibles avec un contact",
        targetsSoFar: "Cibles avec un contact, pour l'instant",
      },
      funnelPending: "à venir",
      targetsTitle: "Premières cibles prêtes",
      targetsTitleEmpty: "Vos premières cibles",
      targetsEmpty:
        "Elles apparaîtront ici vers la fin, quand un contact aura été trouvé (étape 6).",
      targetsNone: "Aucune cible retenue cette fois.",
      targetsAfterResume: "Elles apparaîtront ici une fois l'analyse reprise.",
      targetsMore: (n: number) => (n <= 1 ? "+ 1 autre cible" : `+ ${n} autres cibles`),
      /** Fin : « terminée » n'est dit que lorsque la lecture des autres sites trouvés est finie elle aussi. */
      doneTitle: (n: number) =>
        n === 0
          ? "Analyse terminée"
          : n === 1
            ? "Analyse terminée : 1 cible est prête"
            : `Analyse terminée : ${n} cibles sont prêtes`,
      doneBody: (n: number) =>
        n === 0
          ? "Aucune cible retenue cette fois. Rien n'a été envoyé."
          : "Pour chacune, la demande à faire et pourquoi. Rien n'a été envoyé.",
      /** Première liste prête, mais la lecture des autres sites trouvés tourne encore : l'écran reste « en cours ». */
      continuingTitle: "Nous continuons à lire d'autres sites",
      continuingBody: (n: number) =>
        n === 0
          ? "Aucune cible pour l'instant : la lecture des autres sites trouvés continue. Rien n'a été envoyé."
          : n === 1
            ? "Votre première cible est déjà prête, d'autres peuvent s'ajouter. Rien n'a été envoyé."
            : `Vos ${n} premières cibles sont déjà prêtes, d'autres peuvent s'ajouter. Rien n'a été envoyé.`,
      continuingCta: "Voir vos premières cibles",
      doneCta: "Voir vos cibles",
      redirecting: "Ouverture de vos cibles…",
      failedTitle: "L'analyse s'est arrêtée",
      failedTitleAt: (n: number) => `L'analyse s'est arrêtée à l'étape ${n}`,
      failedBody:
        "Ce qui est déjà fait est conservé. Reprendre repart de là où elle s'est arrêtée, sans rien refaire.",
      failedWorked: "Déjà fait",
      failedStopped: "Ce qui s'est arrêté",
      failedNothing: "Rien n'était encore terminé.",
      failedGeneric: "L'analyse s'est interrompue avant la fin.",
      resume: "Reprendre l'analyse",
      resuming: "Reprise en cours…",
      offline: "Connexion perdue : nouvelle tentative dans quelques secondes.",
      /** Appels que le fournisseur n'a pas pu servir : l'analyse continue avec le reste. */
      missed: (n: number) =>
        n === 1
          ? "1 recherche n'a pas abouti : l'analyse continue avec le reste."
          : `${n} recherches n'ont pas abouti : l'analyse continue avec le reste.`,
      /** Confirmée, mais aucune étape n'a démarré depuis plus de 2 minutes. */
      slowStart: "Le démarrage prend plus de temps que prévu.",
      slowStartBody:
        "L'analyse n'a pas encore commencé. Vous pouvez la relancer : rien n'est facturé tant qu'elle n'a pas démarré.",
      slowStartCta: "Relancer le démarrage",
      /** Reprise à partir d'une étape. */
      restartFrom: "Reprendre à partir d'ici",
      restartConfirm:
        "Cette étape et les suivantes seront refaites. Ce qui précède est conservé et rien n'est repayé.",
      restarting: "Reprise en cours…",
      restartCancel: "Annuler",
    },
    messages: {
      unauthenticated: "Connectez-vous pour lancer l'analyse.",
      notFound: "Analyse introuvable.",
      alreadyStarted: "L'analyse est déjà lancée.",
      alreadyDone: "Cette analyse est terminée.",
      notConfirmed: "Cette analyse n'a pas encore été confirmée.",
      overCap:
        "Le coût attendu de l'analyse dépasse ce qui reste du plafond prévu : rien n'est lancé.",
      dailyCap:
        "Le plafond de sécurité du jour est atteint : l'analyse est reportée, rien n'est facturé.",
      saveError: "Impossible d'enregistrer l'analyse. Réessayez.",
      sendFailed: "L'analyse est enregistrée mais n'a pas pu démarrer. Réessayez.",
      started: "Analyse lancée. Rien n'est contacté à cette étape.",
      resumed: "Analyse reprise là où elle s'était arrêtée. Rien de déjà fait n'est refait.",
      restarted: "Analyse relancée à partir de cette étape. Ce qui précède est conservé.",
      restartRunning: "L'analyse est en cours : attendez qu'elle s'arrête pour la reprendre.",
      restartUnknownStep: "Cette étape ne peut pas être reprise.",
    },
    /** Email « vos cibles sont prêtes » (D7) : transactionnel, aucun montant. */
    email: {
      subject: (domain: string, n: number) =>
        n === 0
          ? `Votre analyse de ${domain} est terminée`
          : n === 1
            ? `1 cible est prête pour ${domain}`
            : `${n} cibles sont prêtes pour ${domain}`,
      body: (domain: string, n: number) =>
        n === 0
          ? `L'analyse de ${domain} est terminée. Aucune cible n'a été retenue cette fois : vous pouvez consulter le détail dans votre espace.`
          : `L'analyse de ${domain} est terminée : ${n === 1 ? "1 cible est prête" : `${n} cibles sont prêtes`}, avec pour chacune la demande à faire et pourquoi. Rien n'a été envoyé.`,
      cta: "Voir vos cibles",
      footer: "Vous recevez cet email parce que vous avez lancé une analyse dans votre espace.",
    },
    /** Motifs d'arrêt écrits dans l'étape en échec (lisibles tels quels). */
    errors: {
      siteUnreadable:
        "Nous n'avons pas réussi à lire votre site. Vérifiez qu'il est en ligne, puis reprenez l'analyse.",
      noCompetitors:
        "Aucun concurrent n'a été trouvé pour vos recherches. Corrigez le thème de votre site, puis reprenez l'analyse.",
      noQueries:
        "Les recherches d'éditeurs n'ont pas pu être préparées. Reprenez l'analyse dans quelques minutes.",
      interrupted:
        "L'analyse s'est interrompue avant la fin. Vous pouvez la reprendre : rien de déjà fait n'est refait.",
      noCandidates:
        "La recherche n'a trouvé aucun site utile. Vérifiez le thème et le pays de votre site, puis reprenez à partir de cette étape.",
      searchMissedAll:
        "Aucune de nos recherches n'a abouti : le service de recherche ne répond pas. Reprenez à partir de cette étape dans quelques minutes.",
    },
    /** Lignes du fil d'événements (`analysis_feed`). */
    feed: {
      stepDone: (step: string) => `Étape terminée : ${step}`,
      stepSkipped: (step: string) => `Étape écartée : ${step}`,
      targetReady: (domain: string) => `Cible prête : ${domain}`,
      finding: {
        lien_mort: (domain: string) => `Lien mort repéré sur ${domain}`,
        lien_inadapte: (domain: string) => `Lien à remplacer repéré sur ${domain}`,
        mention_sans_lien: (domain: string) => `Mention sans lien repérée sur ${domain}`,
      },
      done: (count: number) =>
        count === 0
          ? "Analyse terminée : aucune cible retenue cette fois."
          : count === 1
            ? "Analyse terminée : 1 cible prête."
            : `Analyse terminée : ${count} cibles prêtes.`,
      linksStateFailed:
        "Vos liens actuels n'ont pas pu être mesurés. L'analyse continue sans cette mesure.",
    },
  },
  watchdog: {
    /** Écrit dans le message d'erreur d'une étape restée bloquée (MU.0). */
    stuck:
      "Cette étape s'est interrompue avant la fin. Rien de plus n'a été lancé : vous pouvez la relancer.",
  },
} as const;

export type Messages = typeof fr;
