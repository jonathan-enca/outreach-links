# Direction artistique (MN.2, piste I « clair et émeraude », 15/11/2026)

Nom de travail : voir `docs/naming.md`. Le nom est **un seul réglage** (`app.name` dans `messages/fr.ts`) ; le logo et les titres le lisent, rien n'est écrit en dur (un test le vérifie). Logo, nom et domaine sont provisoires.

Aperçu de référence : `docs/da-pistes/i-clair-emeraude.html` et `docs/img/da-i-clair-emeraude.png`. Choix de Jonathan, après comparaison de 13 pistes (A à N, dossier `docs/da-pistes/`, conservées comme archive). Variante « bande produit sombre » : `docs/da-pistes/m-hybride-clair-nuit.html` (utile pour la home, voir 2).

## 1. Concept : un vrai SaaS B2B, clair et rassurant

Un produit d'audit qui se montre : titre centré, champ « votre site », **grande capture de l'application** (menu latéral, compteurs, tableau avec statuts), rangée de réassurance, trois fonctions, tarifs. Blanc, encre marine, un seul vert d'action. Les codes sont ceux d'un SaaS (Stripe, Notion, Linear), l'ambiance reste calme et lisible. Structure inspirée de `docs/home-reference.md`, sans copier ni son style (bleu, dégradé violet) ni ses textes.

**Le détail propre au produit : le surlignage du hook**, passage de la page cible qui justifie le message, en ambre clair dans les brouillons et les tableaux.

## 2. Palette

| Rôle                         | Valeur                                                               | Jeton                                  |
| ---------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| Fond de page, cartes         | `#ffffff`                                                            | `background`, `card`                   |
| Texte (encre marine)         | `#0e1a2b`                                                            | `foreground`                           |
| Fond discret                 | `#f1f5f9`                                                            | `muted`                                |
| Texte discret (ardoise)      | `#5b6678`                                                            | `muted-foreground`                     |
| Filets                       | `#e3e8ef`                                                            | `border`                               |
| Action principale (émeraude) | `#047857`                                                            | `primary`                              |
| Lavis du haut de page        | `#ecfdf5` vers blanc                                                 | utilitaire `bg-hero-wash`              |
| Hook                         | `#fde68a`                                                            | `highlight`                            |
| Statuts                      | info `#1d4f91`, alerte `#8a5300`, succès `#166534`, danger `#a3301d` | `info`, `warning`, `success`, `danger` |

**Surface nuit** (`.surface-night`) : bande produit de la home, appel final, pied de page. Marine `#0b1b2e`, carte `#12263d`, filet `#243a55`, texte `#eaf2f8`, action menthe `#5eead4` (texte marine dessus). Les mêmes jetons sont redéfinis : un bouton, une carte ou une pastille posés dedans s'adaptent seuls. `bg-grid` (quadrillage 56 px très discret) n'est utilisé que sur cette bande.

Règles : le vert est la seule couleur d'action (le vert d'origine `#059669` des maquettes est assombri en `#047857` pour atteindre 4,5:1 avec du texte blanc) ; l'ambre ne sert qu'au hook ; un seul système de statuts (`StatusBadge`). Le contraste AA de chaque paire texte / fond, en clair et en nuit, est vérifié par `src/lib/design-tokens.test.ts`.

## 3. Typographie

- **Une seule famille : Inter** (400, 500, 600, 700), chargée par `next/font`. Titres en 700, interlettrage serré (`-0.03em`), `text-wrap: balance`.
- Échelle : hero 60 px (mobile 36), section 34 à 38 px, carte 19 à 20 px, texte 16 px (18 à 19 px pour le chapô), libellés et pastilles 12 à 13 px. Interligne 1,55 pour le texte.
- **Chiffres tabulaires** partout (compteurs, tableaux, prix). Pas de police mono, pas de majuscules espacées.
- Lignes de 45 à 75 caractères au maximum.

## 4. Logo provisoire

Un carré arrondi vert contenant **deux maillons croisés**, suivi du nom en Inter 700. Composant `src/components/brand/logo.tsx` (`LogoMark`, `Logo`) ; le nom vient de `t.app.name`, la marque suit les jetons (`primary`), donc elle s'inverse seule en surface nuit. À redessiner quand le nom sera arrêté (piste : le skill brand-studio).

## 5. Ton des textes

- Français naturel, **vouvoiement** (choix de Jonathan, 15/11/2026).
- On décrit ce que fait le produit, avec des verbes simples : « Lancer l'audit gratuit », « Valider le lot ». Un bouton dit ce qui se passe ; la même action garde le même nom dans tout le parcours.
- Honnêteté : jamais « backlinks garantis », jamais de chiffre non mesuré ; dire ce qu'on ne fait pas (aucun lien acheté, pas de PBN). Les emails d'outreach ne mentionnent jamais l'IA ; le site peut parler d'automatisation.
- Erreurs : dire ce qui s'est passé et comment corriger, sans excuse. États vides : une invitation à agir.
- Pas de superlatifs, pas de point d'exclamation.

## 6. Illustrations et captures

- **La capture de l'application est l'illustration.** Maquette HTML/CSS construite avec les vrais composants et des données de démonstration plausibles (un lot avec ses cibles, leurs hooks et leurs statuts), jamais une photo de stock ni une illustration décorative.
- Fenêtre : rayon 16 px, filet, ombre flottante teintée d'encre ; sur la bande sombre la fenêtre reste **claire** (lisibilité).
- Données de maquette marquées comme démonstration ; aucun logo de marque tierce, aucun chiffre de preuve avant les mesures de MB.2. Prix affichés : ceux de `plans`, jamais inventés.
- Icônes : `lucide-react`, trait 1,5 à 2 px, 16 à 20 px, `aria-hidden` quand elles sont décoratives.
- Mouvement : une seule animation d'entrée au hero au plus, rien par section, `prefers-reduced-motion` respecté (réglé globalement).

## 7. Composants clés

| Composant             | Spécification                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rayons                | `rounded-control` 8 px (boutons, champs), `rounded-card` 14 px (cartes), `rounded-panel` 16 px (fenêtre de capture, grands blocs)                                                     |
| Ombres                | `shadow-card` (carte posée), `shadow-float` (fenêtre de capture) ; teintées d'encre                                                                                                   |
| Bouton                | Plein émeraude (menthe en nuit), contour, fantôme ; 40 px de haut, 36 px en petit ; focus visible 2 px                                                                                |
| Champ « votre site »  | Champ et bouton dans un même cadre blanc (filet, ombre légère), centré dans le hero ; libellé visible, erreur sous le champ                                                           |
| Pastille d'annonce    | Petite pastille verte pâle au-dessus du titre (« Audit gratuit, sans carte bancaire ») ; une seule par page                                                                           |
| Carte fonction        | Blanc, filet, pastille numérotée (le contenu est une suite d'étapes), titre 19 px, deux lignes de texte                                                                               |
| Rangée de réassurance | Pastilles à filet fin (envoi depuis votre boîte, liste de suppression, RGPD, aucun lien acheté, validation par lot) ; rien d'inventé                                                  |
| Tarifs                | 3 cartes (Gratuit, Starter, Pro), la carte du milieu inversée (marine, prix en menthe) ; prix lus dans `plans`                                                                        |
| Pastille de statut    | `StatusBadge` (système unique, 5 tons) ; texte toujours présent, jamais la couleur seule                                                                                              |
| Hook                  | `mark-hook` (surligneur ambre, texte encre)                                                                                                                                           |
| En-tête (home)        | Collant, 68 px ; logo, liens (Fonctionnalités, Tarifs, FAQ), « Se connecter », bouton « Essai gratuit » (mène à l'inscription, décision de Jonathan 15/11) ; mobile : panneau latéral |
| Tableau               | Filets fins, chiffres alignés, défilement horizontal dans son cadre sur mobile                                                                                                        |

## 7 bis. Hero de la home (15/11, demande de Jonathan)

Hero **clair** (`bg-hero-wash`, jamais la surface nuit) : pastille verte pâle, titre centré avec l'accroche en émeraude, deux boutons (« Essai gratuit » plein, « Fonctionnement » contour), cartes d'exemple **blanches** (filet, `shadow-float`, Inter) inclinées de chaque côté dès 1280 px, décoratives (`aria-hidden`). Libellés de section : `text-sm font-semibold text-primary`, sans majuscules espacées ni police mono.

## 8. Hors périmètre (à faire ensuite)

Pages (MH.2, MH.3), logo et nom définitifs (brand-studio), favicon propre, image de partage. Le mode sombre de l'application n'est pas prévu (la surface nuit ne sert qu'à la home).
