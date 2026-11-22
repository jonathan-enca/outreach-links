---
title: "Outils SEO gratuits pour suivre ses liens"
shortTitle: "Outils SEO gratuits"
description: "Search Console et Ahrefs Webmaster Tools donnent gratuitement une partie de vos backlinks, avec des limites déclarées. Ce qu'ils montrent, et comment vérifier un lien obtenu sans outil payant."
lead: "Deux outils gratuits montrent une partie des liens qui pointent vers votre site, à condition de prouver que le site est le vôtre. Voici ce que chacun affiche, ce qu'il ne dit pas, et comment contrôler à la main un lien que vous venez d'obtenir."
slug: outils-seo-gratuits-liens
keyword: "outils seo gratuits"
theme: backlinks-gratuits
author: jonathan
publishedAt: 2026-11-26
updatedAt: 2026-11-26
draft: false
summary:
  - "Le rapport Liens de la Search Console est gratuit, mais Google précise qu'il ne contient pas la liste exhaustive des liens et qu'il n'indique pas le statut nofollow."
  - "Ahrefs Webmaster Tools est gratuit pour les sites dont vous vérifiez la propriété, avec 1 000 backlinks visibles à la fois dans son Site Explorer."
  - "Aucun de ces outils ne remplace la vérification d'un lien précis : page ouverte, lien présent, attribut rel, indexation."
  - "Cette vérification se fait en cinq minutes avec un navigateur et la Search Console."
faq:
  - question: "Les outils gratuits suffisent-ils pour suivre ses backlinks ?"
    answer: "Ils donnent une vue partielle : Google parle d'un échantillon, Ahrefs affiche 1 000 backlinks à la fois. Pour un lien précis que vous avez demandé, la vérification manuelle reste plus fiable."
  - question: "Peut-on voir les backlinks d'un concurrent gratuitement ?"
    answer: "Pas avec ces deux outils : ils exigent de vérifier la propriété du site. Ahrefs indique que l'analyse de sites non vérifiés est réservée aux offres payantes."
  - question: "Comment savoir si un lien obtenu est en nofollow ?"
    answer: "Faites un clic droit sur le lien, choisissez Inspecter et cherchez l'attribut rel dans le code. La Search Console ne l'indique pas."
sources:
  - "Aide Search Console, « Rapport Liens » (support.google.com/webmasters/answer/9049606), consulté le 22 novembre 2026."
  - "Ahrefs, page « Ahrefs Webmaster Tools » (ahrefs.com/webmaster-tools), consultée le 22 novembre 2026."
  - "Google Search Central, « Qualifier vos liens sortants auprès de Google » (valeurs nofollow, sponsored et ugc), consulté le 22 novembre 2026."
related:
  - blog/dofollow-nofollow-lien-gratuit
  - blog/campagne-de-netlinking
  - guides/backlinks-gratuits
---

Pour savoir qui vous cite, vous n'avez pas besoin d'un abonnement : la Search Console de Google et les Ahrefs Webmaster Tools le font gratuitement, avec des limites qu'il vaut mieux connaître avant d'en tirer des conclusions. Cet article décrit ce que disent leurs pages publiques, ouvertes le 22 novembre 2026, puis une méthode manuelle pour contrôler chaque lien obtenu.

Nous n'avons pas comparé la qualité de leurs données sur un même site : ce qui suit s'en tient à ce que ces pages annoncent. Pour le tableau d'ensemble des liens gratuits, voyez [le guide sur les backlinks gratuits](/guides/backlinks-gratuits).

## Google Search Console : le rapport Liens {Search Console}

C'est l'outil de référence, puisque c'est Google lui-même qui le fournit. Son rapport Liens, d'après la page d'aide, présente deux familles de données.

- **Liens externes** : les pages de votre site les plus liées, les sites d'origine les plus présents, les textes d'ancrage les plus fréquents, et, pour un site donné, les liens qu'il envoie vers une page précise.
- **Liens internes** : les pages de votre site les plus citées par votre propre site.

Le rapport sur les textes d'ancrage ne concerne que les liens externes (voir la fiche [ancre de lien](/glossaire/ancre-de-lien)). Les liens sans texte apparaissent avec la mention « (vide) ». Les données s'exportent en CSV ou vers une feuille Google Sheets.

### Les limites que Google déclare

La page d'aide est franche sur ce que le rapport n'est pas.

| Limite | Ce que dit la page |
| --- | --- |
| Pas exhaustif | Le rapport ne contient pas une liste exhaustive de tous les liens du site ; il affiche un échantillon |
| Tableaux courts | Les tableaux sont limités à 1 000 lignes ; l'export va jusqu'à 100 000 lignes sur certains segments |
| Liens peut-être disparus | Il est possible que des liens listés aient été supprimés depuis |
| Pas de nofollow | Le rapport ne précise pas si un lien est marqué `nofollow` |
| Regroupement par domaine | Les données sont regroupées par domaine racine, les sous-domaines sont omis |

La page ne mentionne pas de fréquence de mise à jour. Deux conséquences pratiques : l'absence d'un lien dans le rapport ne prouve pas qu'il n'existe pas, et sa présence ne prouve pas qu'il est encore en ligne. Pour un lien obtenu hier, ne comptez pas le voir apparaître tout de suite.

## Ahrefs Webmaster Tools {Ahrefs Webmaster Tools}

Sur sa page publique, Ahrefs présente cet outil comme gratuit, sans durée limite indiquée (la page le désigne aussi sous le nom « Ahrefs Free »). Il comprend, entre autres, un audit technique de site et un module appelé Site Explorer, qui montre les mots-clés sur lesquels le site se positionne dans Google, ses pages les plus visitées et les sites et pages qui pointent vers lui, donc ses backlinks.

Les conditions et limites annoncées par la page :

- il faut **vérifier la propriété** de chaque site ; le nombre de sites vérifiés est annoncé comme illimité ;
- l'analyse de sites non vérifiés, donc de concurrents, est réservée aux abonnements payants ;
- le Site Explorer affiche 1 000 backlinks et 1 000 mots-clés visibles à la fois ;
- l'audit de site dispose de 5 000 crédits d'exploration par mois et par projet.

La page indique aussi qu'une offre payante, Starter, démarre à 29 $ par mois pour dépasser ces limites. Ce prix est celui lu le 22 novembre 2026 ; il peut changer.

Nous avons aussi cherché la page de présentation de Bing Webmaster Tools, qui existe elle aussi, mais son contenu ne s'est pas affiché à la lecture : nous ne décrivons donc pas cet outil.

[[audit-gratuit]]

## Ce que ces outils ne font pas {Ce qu'ils ne font pas}

Aucun des deux ne vous dit si le lien que vous avez demandé hier à une personne précise est en place, sur quelle page, avec quel attribut. Ils servent plutôt à voir l'ensemble, repérer des sites qui vous citent déjà et suivre la tendance dans le temps. Et comme les deux limitent ce qu'ils montrent, un lien absent d'un rapport ne prouve rien.

Pour un lien que vous avez obtenu par une demande, mieux vaut le vérifier directement.

## Vérifier un lien obtenu, sans outil payant {Vérifier un lien à la main}

Quand quelqu'un vous répond « c'est fait », quatre contrôles suffisent. Comptez cinq minutes.

1. **Le lien est-il présent ?** Ouvrez l'adresse de la page que la personne a modifiée. Cherchez le lien à l'œil, ou avec la recherche du navigateur (Ctrl+F ou Cmd+F). Notez l'adresse exacte vers laquelle il pointe : elle doit être celle de votre page, sans faute.
2. **Que fait-il ?** Cliquez dessus. Il doit mener à votre page, pas à une adresse de redirection ni à une erreur.
3. **Est-il en nofollow ?** Clic droit sur le lien, « Inspecter », puis cherchez l'attribut `rel=` dans la ligne de code. Google distingue `nofollow`, `sponsored` pour les liens payants et `ugc` pour les contenus d'internautes, et indique que ces liens ne sont généralement pas suivis. Un lien sans ces valeurs est un lien classique. Le sujet est détaillé dans [dofollow et nofollow](/blog/dofollow-nofollow-lien-gratuit) et dans la fiche [nofollow](/glossaire/nofollow).
4. **La page est-elle indexée ?** Tapez `site:` suivi de l'adresse de la page dans Google, sans espace. Si la page sort, Google la connaît. L'outil d'inspection d'URL de la Search Console donne plus de détails (état de l'indexation, dernière exploration, adresse canonique), mais il est prévu pour les pages de votre propre site : pour la page d'un autre site, la recherche `site:` reste le contrôle accessible.

Tenez un simple tableau avec la date de chaque contrôle, l'adresse de la page, l'ancre et l'attribut. Revenez-y quelques semaines plus tard : une page peut être refaite, et le lien disparaître sans que personne vous prévienne. C'est le seul moyen de repérer une perte.

## Ce que nous faisons à la place {Ce que nous faisons à la place}

Ces outils vous montrent des liens. Ils ne vont pas en chercher. Chez backleenks, le travail se fait en amont : l'audit repère les pages qui citent déjà des ressources comme la vôtre, chaque demande est rédigée pour une page précise, envoyée depuis votre boîte mail après votre accord, avec une seule relance. Le suivi des liens obtenus fait partie du service ; le détail de ce qu'il contrôle est expliqué dans [le guide](/guides/backlinks-gratuits).

Voici le genre de message qui précède le suivi. Il est inventé pour l'exemple.

```message
Objet : une ressource pour compléter votre page sur les sentiers
Étiquette : Exemple de démonstration

Bonjour Claire,

Votre article sur les balades en famille ==cite trois cartes de sentiers, dont une qui ne s'ouvre plus==.

Nous avons une carte à jour, gratuite et sans inscription : exemple.fr/sentiers. Si elle vous convient, elle peut prendre la place de l'ancien lien.

Bonne journée,
Julien
```

Une fois la réponse reçue, les contrôles ci-dessus disent si le lien est vraiment là. Pour comprendre ce qui rend un lien utile avant même de le demander, lisez [Reconnaître un backlink de qualité en 6 questions](/blog/backlink-de-qualite).
