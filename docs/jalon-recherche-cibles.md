# Jalon proposé : recherche de cibles à grande échelle (à valider)

> Statut : **proposition, non codée, non validée**. Identifiant à attribuer (par exemple MR.1, à caler sur `PLAN.md`).
> Source des chiffres : campagne de `jonathan.encaoua@gmail.com` sur mega-coloring.com, audit `e0888804-9878-420f-9fe1-3554a7478f32`, lue le 19/11/2026 dans la base `outreach-links`, plus la grille tarifaire DataForSEO.
> Règle de généralité (CLAUDE.md, décision du 17/11) : aucun mot, règle ou seuil propre à un thème dans le code ; toute mesure se fait sur au moins deux sites de thèmes différents.

## 1. Constat

Dans la campagne mesurée, l'appel « qui cite ce site ? » est le seul canal qui produit des cibles de liste courte à partir de sites tiers. Il est aujourd'hui limité à 6 sites par niveau.

| Chiffre | Ce qu'il mesure | Source |
|---|---|---|
| 76 | Cibles de liste courte du niveau 0, toutes pistes confondues (56 en citation, 11 en contenu, 4 en SERP, 2 en intersection, 2 en liens morts, 1 en requête de contenu) | `qualified_targets` |
| 420 | Sites distincts cités par les liens sortants de ces 76 pages (lecture gratuite) | `page.cites.links` |
| 69 | Parmi les 420, sites cités par au moins 2 de ces pages (17 par au moins 3) | Calcul sur les liens sortants, **avant** les filtres du code |
| 60 | Les 60 sites les plus cités montrés au modèle (tri par nombre de citations, puis alphabétique) | `src/features/snowball/seeds.ts` |
| 6 | Sites réellement interrogés au niveau 1 (« qui cite ce site ? ») | `maxResources` |
| 403 | Pages candidates trouvées pour ces 6 sites, après filtres spam et autorité (environ 67 par site) | `collection_candidates` |
| 12 | Cibles de liste courte issues de ces 403 (environ 2 par site) | `qualified_targets` |

**Le goulot d'étranglement est le nombre de sites interrogés**, pas le tri : 6 sites sur 420 sont testés.

Autres constats :
- La Search Console est branchée (20 h 39 UTC le 19/11) et lue au lancement : 100 requêtes, 100 pages. Seules les 4 requêtes les plus cliquées (au moins 10 impressions) servent à des recherches Google ; elles ont donné 1 cible de liste courte sur 20 (13 en réserve, 6 exclues). Les 100 pages ne servent à rien dans la recherche de cibles.
- Le mode différé existe pour la SERP seulement (0,0006 USD par page, contre 0,002 en direct). Testé le 19/11 : 0,0006 USD, résultat prêt après 38 secondes. Pour les backlinks, DataForSEO ne propose que le mode direct.

## 2. Coûts unitaires (USD)

| Poste | Prix | Remarque |
|---|---|---|
| Appel « qui cite ce site ? » (backlinks, live) | 0,024 par requête + 0,000036 par ligne | 150 lignes = 0,029. Le forfait domine : une requête par site, pas une par ligne. |
| SERP, mode direct | 0,002 par page de 10 résultats | Utilisé aujourd'hui. |
| SERP, mode différé (task_post puis task_get) | 0,0006 par page | Économie d'environ 0,15 USD sur 35 requêtes. |
| `bulk_referring_domains` (pré-tri) | Prix non publié sur la page de la doc ; hypothèse : 0,024 par requête + 0,000036 par cible renvoyée | Jusqu'à 1 000 sites par requête ; renvoie seulement des totaux (nombre de domaines citants), pas les pages. |
| Jugement LLM d'une page | environ 0,0016 en direct | Mode lots (API par lots) : tarif réduit de moitié, déjà codé pour l'arrière-plan (`LLM_BATCH_JUDGEMENT`). |
| Requête Google en différé | 0,0006 | Pour les requêtes de contenu et les requêtes Search Console. |

## 3. Pipeline proposé

Étapes dans l'ordre, chacune avec son plafond.

**E0. Requêtes Search Console.** Passer de 4 à 20 requêtes (les plus cliquées, au moins 10 impressions), en SERP différée. Coût : environ 0,01 USD.

**E1. Sites de départ.** Prendre les sites cités par les cibles de liste courte du niveau 0 (420 dans la campagne mesurée). Compter, pour chaque site, le nombre de pages qui le citent (`citedBy`).

**E2. Pré-tri.** Interroger `bulk_referring_domains` sur tous les sites de E1 (en une ou deux requêtes). Ne garder que les sites ayant au moins **10 domaines citants** (seuil de départ à valider). Coût : environ 0,14 USD (420 sites en 5 appels de 100 cibles : la limite du schéma du client est de 100 cibles par appel, la doc en annonce 1 000).

**E3. Choix des sites à interroger.** Au lieu de l'ordre alphabétique (aujourd'hui départagé par nom de domaine), classer par `citedBy` décroissant, puis par nombre de domaines citants (E2). Interroger **N sites**, N = 20 pour le test (N = 30, 40, 50 après mesure).

**E4. Appels « qui cite ce site ? ».** Un appel par site retenu, `backlinks/backlinks/live`, mode `one_per_domain`, limite 150 lignes (à tester à 300 ou 1 000). Coût : environ 0,029 par site. Les requêtes partent en parallèle (au plus 30 à la fois, selon la doc).

**E5. Tri gratuit avant tout jugement.** Filtres sans LLM : spam (seuil actuel 40), autorité du domaine citant (minimum actuel 20), pages légales ou rubriques reconnaissables à l'adresse, domaines déjà jugés (cache), langue différente de la campagne, doublons.

**E6. Jugement LLM.** Au plus **20 pages par site** interrogé, en mode lots (demi-tarif). Coût : environ 0,0016 par page jugée, soit environ 0,03 par site. Le reste reste en réserve.

**E7. Liste courte et mesure.** Résultat par site : nombre de cibles de liste courte, nombre envoyables, coût réel. Tableau à produire après chaque run.

## 4. Coûts estimés

Hypothèses : coûts fixes de la campagne après économie différée d'environ 0,35 USD ; pré-tri à 0,04 USD ; 20 pages jugées par site ; rendement entre 1 et 2 cibles de liste courte par site (fourchette observée sur 6 sites, probablement haute).

| Sites interrogés (N) | DataForSEO | Total avec pré-tri | Cibles de liste courte attendues | Coût par cible |
|---|---|---|---|---|
| 6 (aujourd'hui, pour mémoire) | 0,2 | ≈ 1,5 (sans pré-tri, avec SERP en direct : 1,51 réel) | 12 | ≈ 0,12 |
| 20 | 0,6 | ≈ 1,6 | 20 à 40 | ≈ 0,05 |
| 30 | 0,9 | ≈ 2,2 | 30 à 60 | ≈ 0,05 |
| 40 | 1,2 | ≈ 2,8 | 40 à 80 | ≈ 0,05 |
| 50 | 1,5 | ≈ 3,4 | 50 à 100 | ≈ 0,05 |

À titre de comparaison : sans pré-tri, le jugement de 67 pages par site ferait environ 0,11 USD par site de plus.

Environ 70 % des cibles de liste courte sont envoyables (61 sur 88 dans la campagne).

## 5. Critères d'acceptation

1. **Rendement** : sur 20 sites, au moins **1 cible de liste courte par site en moyenne** (sinon N = 20 ne tient pas le budget de cible visé).
2. **Coût** : total du run inférieur à **2 USD**, plafond dur (arrêt automatique au-delà, comme la collecte existante).
3. **Généralité** : mesure sur mega-coloring.com et sur remove-me.io, avec le même réglage (aucune adaptation par thème).
4. **Traçabilité** : chaque appel payant passe par le client qui écrit dans `cost_ledger`, y compris le pré-tri et les requêtes Search Console. Les tests manuels de ce document ne l'étaient pas (0,0006 USD, à corriger).
5. **Reproductibilité** : le classement des sites à interroger est déterministe (même entrée, même ordre).
6. **Tests** : un test par filtre gratuit (E5), un test du classement (E3), un test du plafond de coût (E4 et E6). Typecheck, lint, et tests des fichiers touchés localement (CLAUDE.md, section 15).

## 6. Décisions à valider

Pour chaque point : la proposition par défaut est indiquée en premier.

1. **Taille du test** : 20 sites, puis 30, 40, 50 selon le résultat ? Ou directement 50 ?
2. **Seuil du pré-tri** : 10 domaines citants (proposé), 5, ou 20 ?
3. **Ordre de choix** : `citedBy` puis domaines citants (proposé), ou un autre critère (autorité du site cité) ? L'alphabétique est écarté.
4. **Plafond de dépense du test** : 2 USD (proposé).
5. **Lignes par requête** : 1 000 (validé par Jonathan le 19/11 : le surcoût est très léger, environ 0,06 USD par site au lieu de 0,029).
6. **Nombre de requêtes Search Console** : 20 (proposé) ou plus ?
7. **Mode lots pour le jugement** : activé sur ce test (proposé, demi-tarif, réponse en décalé), ou appels directs pour voir les résultats tout de suite ?
8. **Niveaux 2 et 3 de la boule de neige** : hors de ce jalon (proposé). L'interrupteur `SNOWBALL_DEEP_ENABLED` reste coupé.
9. **Pages Search Console** : utilisées ici pour le plan de liens (pages à promouvoir), ou laissées de côté ? Proposé : hors de ce jalon.

## 7. Risques

- **Rendement décroissant** : les sites les moins cités rapportent probablement moins. Le test à 20 sites le mesurera ; ne pas extrapoler au-delà sans mesure.
- **Chiffres non publiés** : le prix du pré-tri est déduit de la grille (non affiché). Le prix du mode différé pour les backlinks n'existe pas.
- **Comptages avant filtres** : les 420 et 69 sont des liens sortants bruts. Le nombre réel de sites interrogeables sera un peu inférieur.
- **Qualité de la Search Console** : les 34 candidats de la piste « requête de contenu » n'ont pas été relus ; seule l'unique cible de liste courte a été vérifiée.
- **Biais du test** : la campagne de référence est sur un seul site (mega-coloring.com). Le même test doit être fait sur remove-me.io pour vérifier que le résultat ne dépend pas du thème.

## 8. Hors périmètre (backlog)

- Niveaux 2 et 3 de la boule de neige (interrupteur coupé).
- Usage des pages Search Console pour le plan de liens.
- Endpoints `bulk_backlinks` et `bulk_referring_domains` pour autre chose que le pré-tri.
- Mode différé pour les backlinks (inexistant chez DataForSEO).
- Tri par qualité du site citant au lieu de l'ordre alphabétique au-delà du jalon.

## 9. Points à vérifier avant le codage

1. Confirmer sur la page tarifaire le prix du pré-tri (`bulk_referring_domains`).
2. Relire la liste des filtres gratuits existants avant d'en ajouter.
3. Vérifier que le client DataForSEO écrit bien chaque requête dans `cost_ledger` pour les nouveaux endpoints.
4. Vérifier que le mode lots est utilisé pour ce jalon et que son coût réel est journalisé.
