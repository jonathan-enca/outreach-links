---
title: "Dofollow ou nofollow : ce que vaut un lien gratuit en nofollow"
shortTitle: "Dofollow ou nofollow"
description: "Ce que dit la documentation de Google sur nofollow, sponsored et ugc, pourquoi « dofollow » n'y figure pas, et ce qu'un lien gratuit en nofollow peut quand même vous apporter."
lead: "« Dofollow » n'existe pas dans la documentation de Google : c'est un lien sans attribut. Voici ce que Google écrit vraiment sur nofollow, sponsored et ugc, et pourquoi un lien nofollow gratuit garde souvent de l'intérêt."
slug: dofollow-nofollow-lien-gratuit
keyword: "backlink dofollow"
theme: backlinks-gratuits
author: jonathan
publishedAt: 2026-11-24
updatedAt: 2026-11-24
draft: false
summary:
  - "Le mot « dofollow » ne figure pas dans la page de Google sur les liens sortants : un lien normal n'a simplement aucun attribut `rel`."
  - "Google distingue trois valeurs, `nofollow`, `sponsored` et `ugc`, et indique que ces liens ne sont généralement pas suivis."
  - "Depuis septembre 2019, Google présente ces valeurs comme des indices, pas comme des ordres."
  - "Un lien nofollow peut amener des lecteurs et une mention, même s'il ne faut pas compter sur lui pour le classement."
  - "Quand vous demandez un lien, c'est l'éditeur de la page qui choisit l'attribut, pas vous."
faq:
  - question: "Un backlink dofollow existe-t-il vraiment ?"
    answer: "Le mot n'apparaît pas dans la page de Google sur les liens sortants. Il désigne un lien ordinaire, sans attribut `rel`, que Google peut suivre."
  - question: "Comment savoir si un lien est nofollow ?"
    answer: "Faites un clic droit sur le lien, choisissez « Inspecter » et cherchez `rel=` dans la ligne de code. La présence de `nofollow`, `sponsored` ou `ugc` indique un lien qualifié."
  - question: "Puis-je demander un lien dofollow à un éditeur ?"
    answer: "Vous pouvez l'espérer, mais pas l'exiger. L'attribut dépend de la page, de son outil de publication et de la politique de son auteur."
sources:
  - "Google Search Central, « Qualifier vos liens sortants auprès de Google » (developers.google.com/search/docs/crawling-indexing/qualify-outbound-links), consulté le 22 novembre 2026."
  - "Google Search Central Blog, « Evolving nofollow: new ways to identify the nature of links », Danny Sullivan et Gary Illyes, 10 septembre 2019, consulté le 22 novembre 2026."
related:
  - blog/backlink-de-qualite
  - blog/backlinks-profil-commentaire-forum
  - guides/backlinks-gratuits
---

Vous avez obtenu un lien, ou on vous en propose un, et un outil indique « nofollow ». Faut-il s'en désintéresser ? Pas forcément, mais il faut d'abord savoir ce que ce mot recouvre. Il se trouve que le vocabulaire courant ne correspond pas tout à fait à celui de Google.

## Ce que dit la page de Google {Ce que dit Google}

Nous avons ouvert, le 22 novembre 2026, la page de Google Search Central intitulée « Qualifier vos liens sortants auprès de Google ». Elle présente trois valeurs de l'attribut `rel` d'un lien :

| Valeur | Quand l'utiliser, selon la page |
| --- | --- |
| `sponsored` | Les liens publicitaires ou les placements payants. Google la préfère à `nofollow` pour ces liens, tout en acceptant `nofollow`. |
| `ugc` | Les liens de contenus générés par les internautes, comme les commentaires et les messages de forum. |
| `nofollow` | Quand les deux autres ne s'appliquent pas et que vous ne voulez pas que Google associe votre site à la page liée ou l'explore depuis votre site. |

Les valeurs peuvent être combinées dans une liste séparée par des espaces ou des virgules. Pour ces liens, la page écrit qu'ils ne seront généralement pas suivis (« will generally not be followed »). Elle ajoute que la page liée peut quand même être découverte autrement, par un sitemap ou par des liens venus d'autres sites.

Remarquez le « généralement ». La page ne dit pas « jamais ».

## Indices, pas ordres {Des indices, pas des ordres}

La page de documentation n'emploie pas elle-même le mot « indice ». Cette formulation vient d'un article du blog de Google daté du 10 septembre 2019, signé Danny Sullivan et Gary Illyes. Il annonce que `nofollow`, `sponsored` et `ugc` sont traités comme des indices (« hints ») sur les liens à prendre en compte ou à écarter dans la recherche.

Deux précisions du même article, que nous reprenons telles que nous les avons lues :

- l'évolution du côté de l'exploration et de l'indexation pour `nofollow` était annoncée pour le 1er mars 2020 ;
- il n'y a aucune raison de modifier les liens `nofollow` déjà en place.

Le même texte explique la raison du choix : un lien contient des informations utiles, par exemple ce que son texte dit de la page visée. Un indice permet à Google de garder cette information tout en tenant compte du souhait de l'éditeur. L'article indique aussi que Google s'attend à ce que les liens `ugc` et `nofollow` ne comptent généralement pas pour le classement.

Ce qu'il faut en retenir : Google ne s'engage ni à toujours ignorer un lien qualifié, ni à toujours compter un lien ordinaire. Quiconque vous promet un effet précis d'un attribut sur vos positions affirme plus que ce que Google écrit.

## « Dofollow » : un mot qui n'existe pas chez Google {Dofollow n'existe pas}

Le terme « dofollow » est courant dans les outils et les articles SEO. Il n'apparaît pas dans la page de Google que nous avons lue. La même page précise que, pour un lien normal que vous voulez voir suivi et analysé par Google, aucun attribut `rel` n'est nécessaire.

Autrement dit :

- un lien dit « dofollow » est un lien ordinaire, sans `rel` particulier ;
- on ne « pose » pas un lien dofollow, on omet de le qualifier ;
- un lien sans attribut n'est pas pour autant garanti de compter. Google reste libre de l'ignorer, par exemple si son système le juge artificiel (voir [notre guide sur les backlinks gratuits](/guides/backlinks-gratuits)).

Quand un outil vous annonce « 120 backlinks dofollow », il compte donc des liens sans attribut. Ce n'est pas une note de qualité. Pour juger un lien, les six questions de [l'article sur le backlink de qualité](/blog/backlink-de-qualite) sont plus utiles que son étiquette.

## Voir l'attribut d'un lien {Voir l'attribut}

Pas besoin d'outil payant ni d'extension.

1. Ouvrez la page qui contient le lien.
2. Faites un clic droit sur le lien, puis choisissez « Inspecter » (le libellé varie un peu selon le navigateur).
3. Dans la ligne de code mise en évidence, cherchez `rel=`.

Si vous lisez `rel="nofollow"`, `rel="sponsored"` ou `rel="ugc"`, ou une combinaison, le lien est qualifié. S'il n'y a aucun `rel`, c'est un lien ordinaire. Attention : certains sites ajoutent l'attribut par JavaScript après le chargement, ce que l'inspecteur montre bien, alors que l'option « Afficher le code source de la page » peut l'omettre.

Vérifiez aussi que le lien est bien là, sur la bonne page, avec la bonne adresse. L'attribut ne vous dit rien de cela.

## Pourquoi un lien nofollow peut quand même servir {Ce qu'un lien nofollow peut apporter}

Sur le classement, Google écrit que ces liens ne sont généralement pas pris en compte. Gardez cette idée comme prudente, sans chercher à la chiffrer : personne n'a publié de mesure fiable que nous puissions citer.

Mais un lien ne sert pas qu'au classement. Deux usages restent possibles.

- **Des visiteurs.** Un lien est cliquable, qu'il soit qualifié ou non. Sur une page lue par votre public, il envoie des gens qui cherchaient justement ce sujet.
- **Une mention.** Un lecteur qui découvre votre site par ce lien peut en parler ailleurs, ou le citer à son tour, cette fois sans attribut.

Ce raisonnement vaut surtout pour les pages éditoriales. Un lien en nofollow dans un profil ou une signature de forum n'a pas ces effets : personne ne le lit. Nous revenons sur ces cas dans l'article sur [les liens de profil, de commentaire et de forum](/blog/backlinks-profil-commentaire-forum).

## Pourquoi vous ne choisissez pas l'attribut {Qui choisit l'attribut}

Quand vous demandez un lien à l'auteur d'une page, c'est lui qui décide de ce qui s'affiche. Il peut ajouter votre lien à la main, sans attribut. Il peut aussi utiliser un outil de publication qui qualifie automatiquement tous les liens sortants, ou appliquer une règle personnelle : `nofollow` partout, ou `ugc` pour tout ce qui vient de l'extérieur. Vous n'avez aucun moyen de le voir avant la publication.

Demander un lien « sans nofollow » dans votre message a deux défauts. Cela transforme une demande de service en demande technique, et cela annonce que votre intérêt est le classement. Un éditeur qui lit cela peut y voir du SEO plutôt que l'intérêt de ses lecteurs, et refuser.

Il faut aussi rester honnête sur un point : un éditeur qui accepte un lien en échange d'un paiement doit le qualifier, selon Google, par `sponsored` ou `nofollow`. C'est une raison de plus pour ne pas faire de l'attribut un critère d'achat. Si on vous propose un lien payant « dofollow », la proposition ne respecte pas les consignes de Google.

[[audit-gratuit]]

## Ce que nous faisons à la place {Ce que nous faisons à la place}

Chez backleenks, nous ne discutons pas l'attribut dans la première demande. Nous écrivons pour une raison précise : une page de l'éditeur, un passage où votre page rendrait service à ses lecteurs, et l'adresse exacte à ajouter. Une fois le lien posé, la vérification indique son attribut et si la page est accessible : vous le savez sans ouvrir l'inspecteur, et vous jugez le lien sur ce qu'il est.

Voici un exemple inventé pour illustrer le principe. Il ne mentionne ni SEO ni attribut.

```message
Objet : une ressource pour votre page sur le jardinage en pot
Étiquette : Exemple de démonstration

Bonjour Claire,

Votre article sur le jardinage en pot cite plusieurs guides pour débuter. ==Le lien vers le calendrier des semis mène à une page qui n'est plus en ligne.==

Nous avons un calendrier à jour, gratuit et sans inscription : exemple.fr/calendrier-semis. S'il vous convient, il peut remplacer l'ancien lien.

Bonne journée,
Julien
```

Que Claire ajoute le lien avec ou sans attribut, la demande reste la même, et c'est à elle de décider.

## En pratique {En pratique}

- Traitez « dofollow » comme un raccourci pour « lien sans attribut », pas comme un label de qualité.
- Inspectez l'attribut pour savoir à quoi vous avez affaire, pas pour renoncer au lien.
- Jugez d'abord la page : son sujet, ses lecteurs, la place du lien.
- Ne comptez pas sur un nofollow pour monter dans les résultats, mais ne l'écartez pas s'il vous place devant les bonnes personnes.
- Ne demandez pas l'attribut à l'éditeur : demandez le lien, avec une bonne raison.
