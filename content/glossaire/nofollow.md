---
title: "Nofollow : définition, ce que Google en fait et quand le trouver"
shortTitle: "Nofollow"
description: "Le nofollow est une valeur de l'attribut rel d'un lien. Google le traite comme un indice. Les trois valeurs, quand un site les utilise et ce que cela change pour qui demande un lien."
slug: nofollow
keyword: "nofollow"
theme: glossaire
author: jonathan
publishedAt: 2026-11-27
updatedAt: 2026-11-27
draft: false
summary:
  - "Le nofollow est une valeur de l'attribut rel posé sur une balise a. Elle indique que le site qui publie le lien ne veut pas le recommander."
  - "Google traite cette valeur comme un indice depuis 2019. Il ne s'agit pas d'une règle absolue."
  - "Il existe trois valeurs : nofollow, sponsored pour les liens payés, et ugc pour les contenus publiés par les utilisateurs."
  - "Un lien en nofollow peut quand même amener des visiteurs. Il ne transmet en général pas de crédit de classement."
faq:
  - question: "Un lien nofollow compte-t-il pour le référencement ?"
    answer: "Google le traite comme un indice. Il ne transmet en général pas de crédit de classement, mais le lien peut toujours amener des visiteurs."
  - question: "Faut-il refuser un lien parce qu'il est en nofollow ?"
    answer: "Non. Un lien utile posé sur une page proche de votre sujet vaut mieux qu'un lien dofollow posé sur une page sans rapport avec lui."
  - question: "Le nofollow est-il une pénalité ?"
    answer: "Non. C'est un attribut que le site qui publie le lien pose pour le qualifier. Les pages de Google que nous avons consultées ne le présentent pas comme une sanction."
sources:
  - "Google Search Central, « Qualifier vos liens sortants », developers.google.com/search/docs/crawling-indexing/qualify-outbound-links, consulté le 22 novembre 2026."
  - "Google Search Central Blog, « Evolving nofollow: new ways to identify the nature of links », 10 septembre 2019, developers.google.com/search/blog/2019/09/evolving-nofollow-new-ways-to-identify, consulté le 22 novembre 2026."
related:
  - blog/dofollow-nofollow-lien-gratuit
  - guides/backlinks-gratuits
  - glossaire/ancre-de-lien
---

Le nofollow est une valeur de l'attribut `rel` d'un lien. Elle indique aux moteurs de recherche que le site qui publie le lien ne veut pas le recommander, ni lui transmettre de crédit de classement.

## Comment on le voit dans le code {Dans le code}

Un lien ordinaire ressemble à ceci :

```html
<a href="https://www.exemple.fr/guide">Notre guide</a>
```

Avec la valeur nofollow, l'attribut `rel` se place dans la balise :

```html
<a rel="nofollow" href="https://www.exemple.fr/guide">Notre guide</a>
```

On repère l'attribut en ouvrant le code source de la page ou avec l'inspecteur de son navigateur. Google documente aussi une forme qui agit sur toute la page : la balise meta robots avec la valeur nofollow.

## Les trois valeurs {Les trois valeurs}

| Valeur | À quoi elle sert |
| --- | --- |
| `nofollow` | Le cas général : le site ne veut pas cautionner la page liée. |
| `sponsored` | Les liens publicitaires et les placements payés. Google préfère cette valeur à nofollow pour ces liens. |
| `ugc` | Les liens publiés par les utilisateurs, comme les commentaires ou les messages de forum. |

Plusieurs valeurs peuvent être combinées, séparées par une espace ou une virgule : `rel="ugc nofollow"`.

## Un indice, pas un ordre {Indice et non ordre}

Depuis septembre 2019, Google traite ces trois valeurs comme des indices. Il s'en sert avec d'autres signaux pour décider quels liens prendre en compte, et il garde l'information plutôt que de l'ignorer. La documentation dit que ces liens ne sont en général pas suivis. Les pages liées peuvent donc tout de même être trouvées par un sitemap ou par un autre lien.

## Quand un site le met {Quand un site le met}

- Un site qui publie un lien payé doit le qualifier avec `sponsored`, ou au minimum avec `nofollow`. Google le demande pour les publicités et les placements rémunérés.
- Un blog qui accepte les commentaires attribue en général `ugc` aux liens que laissent ses lecteurs.
- Un site qui cite une page sans la recommander, par exemple pour la critiquer ou pour parler d'un concurrent, utilise `nofollow`.

## Ce que ça change pour qui demande un lien {Pour qui demande un lien}

Quand vous demandez un lien à un site, retenez trois points.

- Un lien en nofollow reste utile. Il peut amener des visiteurs, et Google en tient compte comme indice. Ne refusez pas une offre au seul motif de l'attribut.
- Un lien dofollow posé sur une page sans rapport avec votre sujet vaut peu. La page qui vous cite compte davantage que l'attribut.
- Ne demandez pas à un site de changer son attribut à votre place. C'est à lui de qualifier ses liens.

backleenks ne choisit pas l'attribut du lien. Le produit demande un lien éditorial à la page la plus proche de votre sujet, et le site décide ensuite de la manière dont il le qualifie. [[audit-gratuit]]

Pour la méthode complète, lisez [notre guide des backlinks gratuits](/guides/backlinks-gratuits) et [dofollow ou nofollow : ce qui change pour un lien gratuit](/blog/dofollow-nofollow-lien-gratuit). Pour le texte du lien lui-même, voir [la fiche sur l'ancre de lien](/glossaire/ancre-de-lien).
