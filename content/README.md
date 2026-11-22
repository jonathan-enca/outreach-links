# Guide du rédacteur

Un fichier Markdown par page, dans le dossier de sa rubrique. Le nom du fichier est l'adresse :
`content/blog/mon-article.md` donne `/blog/mon-article`.

| Dossier        | Adresse         | Contenu                                    |
| -------------- | --------------- | ------------------------------------------ |
| `guides/`      | `/guides/…`     | guides piliers (2 500 à 4 000 mots)        |
| `blog/`        | `/blog/…`       | articles (1 200 à 2 000 mots)              |
| `glossaire/`   | `/glossaire/…`  | un terme par page (400 à 800 mots)         |
| `comparatifs/` | `/comparatifs/…`| avis et alternatives                       |

Modèle complet : `guides/backlinks-gratuits.md`. Aucun code à toucher pour publier.

## En-tête

```yaml
---
title: "Titre de la page (h1), 110 caractères au plus"
shortTitle: "Titre court" # facultatif : fil d'Ariane
description: "Résumé pour Google et les partages, 200 caractères au plus"
lead: "Chapô sous le titre" # facultatif : par défaut, la description
slug: mon-article # identique au nom du fichier, minuscules, chiffres et tirets
keyword: "mot-clé principal"
theme: backlinks-gratuits
author: jonathan # facultatif
publishedAt: 2026-11-25 # heure de Paris ; avec une heure : 2026-11-25T08:00
updatedAt: 2026-11-25 # facultatif : par défaut, publishedAt
draft: false
summary: # points « En bref », 6 au plus
  - "Premier point."
faq:
  - question: "La question ?"
    answer: "La réponse, en une ou deux phrases."
sources:
  - "Auteur, « Titre », date de publication ou de consultation."
related: # « À lire ensuite » : rubrique/slug
  - blog/autre-article
---
```

- `theme` : `backlinks-gratuits`, `methode`, `acheter-des-liens`, `avis-et-alternatives`,
  `demandes-par-email`, `liens-et-ia`, `par-type-de-site`, `etude`, `glossaire`.
- Une clé inconnue, une date illisible ou un slug différent du nom du fichier font échouer les tests et
  la mise en ligne, avec le nom du fichier et du champ.
- `summary`, `faq` et `sources` acceptent le gras, les liens et le code en ligne.
- `related` : un contenu pas encore en ligne est simplement ignoré ; la liste est complétée jusqu'à
  trois par les contenus les plus récents du même thème.

## Publication

Une page est en ligne (rendue, listée, au sitemap, dans `/llms.txt`) si `draft` est `false` **et** si
`publishedAt` est passé, à l'heure de Paris. Avant, son adresse répond 404. Le site se relit toutes les
heures : un contenu programmé sort seul, dans l'heure qui suit sa date, sans redéploiement.

## Corps du texte

Markdown courant : titres `##` et `###` (jamais `#`, le titre vient de l'en-tête), listes, tableaux,
liens, **gras**, `code`. Le HTML n'est pas rendu ; un commentaire `<!-- … -->` reste invisible.

**Sommaire.** Chaque titre `##` entre dans le sommaire. Pour un libellé plus court, le mettre entre
accolades en fin de titre :

```md
## Pourquoi ces liens ne font rien bouger {Pourquoi ça ne fait rien bouger}
```

**Exemple de message.** Un bloc `message` : la ligne « Objet : » (obligatoire), une ligne
« Étiquette : » facultative (par défaut « Exemple de démonstration »), une ligne vide, puis le corps.
`==texte==` surligne le passage tiré de la page de la cible. Un message inventé garde l'étiquette
« Exemple de démonstration ».

````md
```message
Objet : un lien mort dans votre article
Étiquette : Exemple de démonstration

Bonjour Claire,

Dans votre article, ==le lien vers les « coloriages à imprimer » mène à une page qui n'existe plus==.

Bonne journée,
Julien
```
````

**Appel à l'action.** La ligne `[[audit-gratuit]]`, seule, place l'encadré « Qui cite vos concurrents,
mais pas vous ? ». Sans elle, il se place après la troisième section. Les autres appels (colonne,
bandeau final) sont automatiques.

**Information manquante.** Laisser un commentaire `<!-- À FOURNIR : … -->` à l'endroit voulu et garder
`draft: true`.

## Règles

- Vouvoiement. Pas de point d'exclamation.
- Jamais « backlinks garantis », ni aucune promesse de résultat.
- Aucun chiffre inventé : un chiffre vient d'une source citée ou de nos propres campagnes.
- Sources datées (date de publication ou de consultation) ; prix des comparatifs datés et sourcés.
- Chaque article renvoie vers son guide, vers deux ou trois fiches du glossaire et vers l'audit gratuit.
- Ne jamais présenter un exemple inventé comme un message réellement envoyé.

## Prévisualiser

```sh
NEXT_PUBLIC_APP_URL=http://localhost:3111 NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=fictive pnpm dev -p 3111
```

Puis ouvrir `http://localhost:3111/apercu` : tous les contenus, brouillons et programmés compris. Cet
aperçu n'existe qu'en développement. Vérifier les fichiers : `pnpm vitest run src/features/content`.
