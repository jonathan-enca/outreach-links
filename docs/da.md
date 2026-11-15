# Direction artistique (MN.2, 15/11/2026)

Nom de travail : voir `docs/naming.md`. Le nom est **un seul réglage** (`app.name` dans `messages/fr.ts`) ; le logo et les titres le lisent, rien n'est écrit en dur (un test le vérifie). Logo, nom et domaine sont provisoires. Aperçu visuel : `docs/da-specimen.html` et `docs/img/da-specimen.png`.

## 1. Concept : « l'instrument d'audit »

Un SaaS B2B qui ressemble à un outil de consultant : froid, précis, lisible, sans effet. Il inspire confiance parce qu'il montre ses preuves (URL vérifiée, motif de tri, statut). La structure s'inspire de `docs/home-reference.md` (alternance sections nuit et claires, maquettes d'interface plutôt que photos), l'ambiance est **la nôtre** : pas de bleu électrique ni de dégradé violet, pas de mono en majuscules, pas de cartes flottantes décoratives.

**Le seul moment mémorable : le surlignage du hook.** Le passage de la page cible qui justifie le message est surligné en ambre dans les brouillons, les maquettes et le logo des lots. Tout le reste reste calme.

Remplace la palette papier `#faf8f3` / sapin `#14595a` et les polices Fraunces / Public Sans de M0.4.

## 2. Palette

| Rôle                          | Nom                             | Valeur                                        | Jeton                                  |
| ----------------------------- | ------------------------------- | --------------------------------------------- | -------------------------------------- |
| Fond de page                  | Craie                           | `#f5f7fa`                                     | `background`                           |
| Texte, fond des sections nuit | Encre marine                    | `#0f1b2d`                                     | `foreground`                           |
| Carte                         | Blanc                           | `#ffffff`                                     | `card`                                 |
| Fond discret, texte discret   | Brume / ardoise                 | `#eaeef3` / `#4b5a6e`                         | `muted`, `muted-foreground`            |
| Filets                        | Filet                           | `#d5dce6`                                     | `border`                               |
| Action principale             | Vert lien                       | `#0b6b5e`                                     | `primary`                              |
| Action sur fond nuit          | Menthe                          | `#6fe3cf`                                     | `primary` dans `.surface-night`        |
| Hook                          | Surligneur                      | `#fde68a`                                     | `highlight`                            |
| Statuts                       | info / alerte / succès / danger | `#1d4f91` / `#8a5300` / `#1f6b3a` / `#a3301d` | `info`, `warning`, `success`, `danger` |

Règles : le vert lien est la seule couleur d'action ; l'ambre ne sert qu'au hook (jamais un bouton, jamais une alerte, l'alerte est `warning`) ; un seul système de statuts partout (`StatusBadge`). Le contraste AA (4,5:1) de chaque paire texte / fond, en clair et en nuit, est vérifié par `src/lib/design-tokens.test.ts`.

**Surface nuit** : la classe `.surface-night` redéfinit les mêmes jetons (fond marine `#0f1b2d`, carte `#172a43`, filet `#2a4264`, texte `#eef2f7`). Un bouton, une carte ou une pastille posés dedans s'adaptent seuls. Usage : hero, boucle de la méthode, appel final, pied de page. Le quadrillage discret `bg-grid` est réservé au hero.

## 3. Typographies

- **Titres : Bricolage Grotesque** (700, gris-bleu très lisible, de la personnalité sans fantaisie), interlettrage serré (`-0.02em`), `text-wrap: balance`. Échelle : hero 60 / 72 px (mobile 36), section 34 à 44 px, carte 19 à 22 px.
- **Texte : Instrument Sans** (400, 500, 600), 16 à 18 px, interligne 1,55, **chiffres tabulaires** partout (tableaux, scores, compteurs). Pas de police mono : les chiffres et libellés techniques restent en Instrument Sans.
- Lignes de 45 à 75 caractères au maximum. Phrases en minuscules (sentence case), pas de majuscules espacées, pas d'étiquette au-dessus de chaque titre : un petit libellé n'existe que s'il donne une information (une section numérotée seulement si le contenu est une suite d'étapes, comme les 5 étapes de la méthode).
- Les deux polices sont chargées via `next/font` (swap), sous-ensemble latin.

## 4. Logo provisoire

Un carré arrondi vert lien contenant **deux maillons croisés** (deux rectangles arrondis inclinés), suivi du nom en Bricolage Grotesque 700. Composant `src/components/brand/logo.tsx` (`LogoMark`, `Logo`) ; le nom vient de `t.app.name`, la marque suit les jetons (`primary` / `primary-foreground`), donc elle s'inverse seule en surface nuit. Pas de version définitive : à redessiner quand le nom sera arrêté.

## 5. Ton des textes

- Français naturel, vouvoiement (la cible est professionnelle ; le tutoiement du hero de `CLAUDE.md` section 4.1 est un raccourci de rédaction à trancher en MH.2, voir backlog).
- On décrit ce que fait le produit, avec des verbes simples : « Lancer l'audit », « Valider le lot », « Modifier ». Un bouton dit ce qui se passe ; la même action garde le même nom dans tout le parcours.
- Honnêteté : jamais « backlinks garantis », jamais de chiffre non mesuré ; dire ce qu'on ne fait pas (pas de lien acheté, pas de PBN). Les emails d'outreach ne mentionnent jamais l'IA ; le site peut parler d'automatisation.
- Erreurs : dire ce qui s'est passé et comment corriger, sans excuse. États vides : une invitation à agir.
- Pas de superlatifs, pas de point d'exclamation, pas de flèche ajoutée à chaque bouton (une flèche seulement quand le lien quitte la page).

## 6. Illustrations et captures

- **Aucune photo de stock, aucune illustration décorative.** Le produit se montre lui-même : **maquettes vivantes en HTML/CSS** construites avec les vrais composants et de vraies données de démonstration (un brouillon avec son hook surligné, une table de cibles avec motifs de tri, une jauge de score, le digest).
- Fenêtre de maquette : rayon panneau (20 px), ombre flottante, barre de titre discrète ; sur fond nuit, la maquette est **claire** (contraste, lisibilité).
- Icônes : `lucide-react`, trait 1,5 à 2 px, 16 à 20 px, couleur du texte (jamais décoratives seules, `aria-hidden`).
- Données de maquette : plausibles mais **marquées comme démonstration** ; aucune capture de client, aucun logo de marque tierce, aucun chiffre de preuve avant les mesures de MB.2.
- Motif graphique : le maillon et la ligne qui relie deux points (cible, lien) ; une seule animation d'entrée au hero, aucune animation par section, `prefers-reduced-motion` respecté (réglé globalement).

## 7. Composants clés

| Composant            | Spécification                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Rayons               | `rounded-control` 8 px (boutons, champs), `rounded-card` 14 px (cartes), `rounded-panel` 20 px (maquettes, grands blocs)            |
| Ombres               | `shadow-card` (carte posée, très légère), `shadow-float` (maquette, menu) ; teintées d'encre, jamais de gris pur                    |
| Bouton               | Plein vert lien (menthe en nuit), contour, fantôme ; hauteur 40 px, 36 px en petit ; focus visible 2 px                             |
| Champ « votre site » | Champ + bouton dans un même cadre (hero) ; libellé visible, erreur sous le champ                                                    |
| Carte                | Blanc, filet, `shadow-card`, un titre de 19 à 22 px, 1 à 2 lignes de texte ; pas de grille de cartes identiques si une liste suffit |
| Pastille de statut   | `StatusBadge` (système unique, 5 tons) ; texte toujours présent, jamais la couleur seule                                            |
| Hook                 | `mark-hook` (surligneur ambre, texte encre) ; légende « tiré de sa page »                                                           |
| Score                | Grand chiffre tabulaire + libellé ; « non classé » plutôt que 0 pour un site neuf                                                   |
| En-tête (home)       | Collant, 64 px, sombre ; logo, 4 liens, « Se connecter », bouton « Audit gratuit » ; mobile : panneau latéral                       |
| Tableau              | Lignes séparées par des filets, chiffres alignés à droite, défilement horizontal dans son cadre sur mobile                          |

## 8. Ce qui reste à faire (hors MN.2)

Pages (MH.2, MH.3), logo et nom définitifs, favicon propre, image de partage. Le doute éventuel sur le vouvoiement ou le thème sombre de l'application est noté au backlog de `PROGRESS.md`.
