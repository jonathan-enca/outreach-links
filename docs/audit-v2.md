# Audit v2 : comprendre le site, puis trouver des cibles qui ne sont pas des concurrents

Conception du 15/11/2026 (demande de Jonathan). Objectif : à partir de l'adresse d'un site, produire **une liste courte, classée, avec pour chaque site la demande à faire et pourquoi**, pour les trois tactiques (sites que personne ne sollicite, pages ressources et liens morts, mentions de marque sans lien), de façon industrielle, pour n'importe quel client.

## 1. Constat sur l'audit actuel (v1)

- Il part de **3 requêtes** et de **ce que Google classe devant le site**. Premier vrai audit (15/11, mega-coloring.com) : la liste de « concurrents » mélange vrais concurrents, plateformes et faux domaines ; elle est le résultat final au lieu d'être une étape.
- Il ne **comprend pas le site** : pas de profil de marque, donc pas de public cible, pas de variantes du nom (pour les mentions), pas d'idée de qui aurait une raison de le citer.
- La découverte de cibles réutilise la même SERP (top 10) et l'écart de domaines calculé localement : trop étroit pour « personne ne sollicite ».
- Un concurrent n'est pas une cible. Une cible est un site **qui peut citer le nôtre sans conflit d'intérêt**.

## 2. Ce que font Semrush et Ahrefs (et ce qu'on en retient)

- **Backlink Gap (Semrush) et Link Intersect (Ahrefs)** : on saisit le site et ses concurrents ; l'outil liste les domaines qui lient aux concurrents mais pas au site, **triés d'abord par nombre de concurrents liés (recoupement), puis par autorité**. C'est la source de cibles la plus fiable : un site qui a déjà cité trois acteurs du thème est un éditeur qui cite. ([Linkody](https://www.linkody.com/en/seo-tools/free-backlink-gap), [guide de gap](https://growwithsakib.com/backlink-gap-analysis/))
- **Content Explorer (Ahrefs)** : base de pages classées par thème pour trouver des pages qui parlent du sujet, indépendamment des concurrents. Notre équivalent : la SERP par requêtes de public + l'API Content Analysis de DataForSEO.
- Leur limite, et notre avantage : ils livrent une **liste brute** de milliers de domaines à trier à la main. Notre valeur est ce qui vient après : typage, filtre, contact, demande rédigée, envoi. (Les sources de comparaison sont en partie affiliées : à lire avec prudence.)

## 3. Pipeline v2

Chaque phase est un job Inngest (idempotent, un step par unité de travail), écrit son coût dans `cost_ledger`, et produit une sortie lisible.

### Phase 0. Profil de marque (nouveau, ~1 minute, quelques millièmes de dollar)

- Lire l'accueil, le sitemap et 5 à 10 pages clés (même lecteur sûr que M3.1 : robots.txt, SSRF).
- Un appel LLM structuré produit un **brand profile** : ce que c'est (activité, offre), langue et pays, public visé, ressources « liables » du site (guides, outils, pages utiles à citer), variantes du nom (pour trouver les mentions), ton, et surtout **les profils d'éditeurs qui auraient une raison de le citer** (« personas de donneurs de liens »).
- Affiché à l'utilisateur en un écran, corrigeable (la compréhension du site conditionne tout le reste). Stocké, versionné.

### Phase 1. Univers de requêtes (nouveau)

- À partir du profil : requêtes **par persona et par tactique** (pas seulement 3 requêtes du site). Exemple de gabarits : « {thème} pour enseignants », « blog {thème} maternelle », « ressources {thème} », « liens utiles {thème} », « association {thème} » ; plus les mots-clés déjà classés (Labs `ranked_keywords`) pour rester près de la demande réelle.
- Générées par LLM, **mises en cache par recette** (niche + langue + persona) : un client de la même niche réutilise la recette. Nombre de requêtes réglé par le budget de l'audit.

### Phase 2. Graphe de concurrence (existant, à fiabiliser)

- Vrais concurrents : SERP + Labs `competitors_domain`, plateformes et faux domaines exclus (corrigé le 15/11), tailles mesurées. Sert à **exclure** et à alimenter le gap, jamais à fournir les cibles.

### Phase 3. Collecte de candidats, par tactique

| Tactique                           | Sources (DataForSEO ou lecture directe)                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Sites que personne ne sollicite | **Domain Intersection** (domaines liant ≥ 2 concurrents, pas nous) ; SERP top 30 sur les requêtes de personas ; **Content Analysis `search`** avec `page_type` = `blogs`, `organization` (associations, collectivités, institutions), `message-boards` (forums), `ecommerce`, filtrés par `domain_rank` et `spam_score` |
| 2. Pages ressources et liens morts | SERP « ressources / liens utiles / à lire + thème » ; lecture des liens sortants (M2.2) ; pages de nos concurrents devenues 404 (`target_url` des backlinks, M2.2)                                                                                                                                                      |
| 3. Mentions de marque sans lien    | Content Analysis `search` sur chaque variante du nom ; requêtes de marque en SERP ; **vérification HTTP que la page ne lie pas déjà le site**                                                                                                                                                                           |

### Phase 4. Entonnoir de qualification (du moins cher au plus cher)

1. Dédoublonner, normaliser, retirer concurrents, plateformes, géants, faux domaines, domaines déjà contactés par un autre utilisateur (gratuit).
2. Filtre par signaux fournisseur : autorité, spam, langue, type de page (quasi gratuit).
3. Lecture de la page (gratuit, robots.txt) : vivante, en ligne, éditeur identifiable.
4. LLM : **type de site** (mairie, association, photographe, e-commerce, forum modéré, blog, média, annuaire), **adéquation** avec le profil de marque, **vendeur de liens ?** (tarifs, « article sponsorisé », « devenir contributeur »), accroche tirée de la page (citation réelle).
5. Contact (M3.2) : email ou formulaire ; sans contact, la cible est écartée de la liste courte.
6. Score final = pertinence × « personne ne la sollicite » × facilité de contact × autorité plafonnée ; **top N classé** avec la demande en trois lignes et le pourquoi.

- Ordre de grandeur visé : de 1 500 à 3 000 candidats bruts à 30 à 60 cibles livrées.

### Phase 5. Boucle d'apprentissage

- Les réponses et liens posés (M5) alimentent les scores par type de site et par tactique ; jeu d'évaluation annoté FR pour mesurer précision et rappel avant tout changement de règle.

## 4. Exemple : mega-coloring.com (coloriages à imprimer)

Personas de donneurs de liens que le profil doit faire émerger : enseignants et assistantes maternelles (blogs de classe, sites de ressources pédagogiques), blogs de parents et d'activités enfants, associations (scoutisme, catéchèse, centres de loisirs), médiathèques et collectivités (pages « ressources en ligne »), forums modérés de parents. Ce sont exactement les sites que la méthode manuelle de Jonathan visait ; ils ne sont **pas** dans le top 10 de « coloriage licorne ». Les requêtes de personas les trouvent ; le gap les confirme par recoupement avec les concurrents.

## 5. Industrialiser pour chaque client

- **Recettes** par niche et par langue (personas, gabarits de requêtes, filtres de page), générées une fois, mises en cache, améliorées par les mesures.
- **Budget d'audit** décomposé par phase et affiché avant lancement (comme MA.6) ; plafond de sécurité en bêta.
- **Cache partagé** des lectures de pages et des signaux par domaine entre clients (DataForSEO déjà en cache) ; un domaine déjà qualifié n'est pas requalifié.
- **Idempotence et reprise** : chaque phase peut être relancée sans repayer ce qui est fait.
- **Évaluation continue** : jeu annoté (types de sites, vendeurs de liens, adéquation) rejoué à chaque changement de prompt ou de règle.

## 6. Coût : exhaustif, mais raisonnable (règle de construction, 15/11/2026)

Décision de Jonathan : l'audit est le cœur du produit et sera réservé aux plans payants, mais **son coût doit rester raisonnable**. Chaque phase est donc conçue avec un budget, pas seulement une fonction.

**Trois niveaux de budget par audit** (valeurs proposées, à confirmer)

- **Budget cible : environ 1 USD** pour un audit complet. C'est ce que la conception doit viser et ce qui est annoncé à l'utilisateur.
- **Plafond d'audit : 2 USD.** Aucune phase ne démarre si le cumul prévisible le dépasse (même mécanisme que MA.6 : contrôle avant chaque appel payant).
- **Plafond de sécurité bêta : 5 USD par audit et 25 USD par jour**, uniquement contre les bugs (une boucle qui s'emballe).

**Budget alloué par phase** (part du budget cible)

| Phase                                                                           | Part  | Remarque                                                                 |
| ------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| 0. Profil de marque                                                             | ~1 %  | lecture gratuite + un appel LLM court                                    |
| 1. Requêtes de personas                                                         | ~2 %  | LLM, mis en cache par recette                                            |
| 2. Concurrents (SERP, tailles)                                                  | ~15 % | requêtes limitées, mesure groupée                                        |
| 3. Collecte (recoupement, SERP de personas, Content Analysis, pages qui citent) | ~74 % | la plus chère ; MC.6a : +19 % (pages qui citent), la marge est consommée |
| 4. Qualification (LLM sur les survivants)                                       | ~10 % | modèle économique, après filtres gratuits                                |
| Marge                                                                           | ~17 % | imprévus, relances                                                       |

**Cinq mécanismes pour tenir le budget sans perdre en exhaustivité**

1. **Entonnoir du moins cher au plus cher** : tout ce qui est gratuit (déduplication, exclusions, lecture de page) passe avant tout appel payant ; le LLM ne voit que les survivants, jamais les 3 000 candidats bruts.
2. **Arrêt par rendement décroissant** : la collecte s'arrête quand les nouvelles requêtes n'apportent presque plus de cibles qualifiées par dollar (seuil réglable), et non quand les requêtes prévues sont épuisées.
3. **Priorité aux requêtes les plus rentables** : les requêtes de personas sont classées par rendement attendu (déduit du profil, puis des audits passés sur la même niche) ; on dépense d'abord sur les meilleures.
4. **Caches réels** : réponses DataForSEO par requête et par domaine, lectures de pages, qualifications de domaines partagées entre clients, recettes par niche. Le coût d'un audit **baisse avec le nombre de clients de la même niche**.
5. **Appels groupés et bornés** : mesure de taille et recoupement en une requête, une ligne par domaine, nombre de lignes plafonné, profondeur SERP adaptée (le top 30 seulement quand le top 10 ne suffit pas).

**Transparence** : le coût attendu et le pire cas sont affichés avant le lancement (une seule confirmation) ; le coût réel par phase est consigné dans `cost_ledger` et visible dans un tableau de bord interne par audit et par utilisateur (obligation de CLAUDE.md 4.5), avec le coût par cible livrée et par lien obtenu une fois les envois en place.

**Économie du produit** : ce coût par audit servira à fixer le nombre d'audits inclus dans chaque plan payant (Médium, Total) et le prix des audits supplémentaires ; les limites par palier se calculent sur le coût mesuré, jamais sur l'estimation.

**Estimation de départ (hypothèse à mesurer)** : grille mesurée : SERP live ~0,006 USD par requête (top 30), backlinks ~0,0277 par 100 lignes, LLM ~0,00012 par appel court. Profil ~0,005 ; 20 à 30 requêtes ~0,15 ; recoupement ~0,10 ; Content Analysis 8 à 12 appels ~0,2 (exemple de la doc : 0,0203 USD pour 10 résultats, **tarif non confirmé**) ; qualification de ~300 pages ~0,05 ; soit **~0,5 à 1 USD**. Un run réel borné sur le site de test fixe les vraies valeurs.

## 7. À vérifier avant de construire

- Content Analysis : filtres de langue et de pays (français) non confirmés par la documentation lue ; tarif réel par résultat.
- Domain Intersection : coût par appel et nombre maximal de cibles (20 par appel dans notre client) ; les liens cassés n'apparaissent que comme compteur dans les réponses, pas comme endpoint dédié (le chasseur 404 reste notre crawl).
- Qualité réelle des cibles sur le site de test (jugée par Jonathan) : seuil d'acceptation avant d'étendre.
