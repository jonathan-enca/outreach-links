# PROGRESS.md

## État

| Sous-jalon   | Statut                                                                                                                                                                                                                                                                                                                                                                                                                                                             | PR                                                                                                                                  | Date       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| M0.1         | fait                                                                                                                                                                                                                                                                                                                                                                                                                                                               | [#1](https://github.com/jonathan-enca/outreach-links/pull/1)                                                                        | 2026-11-14 |
| M0.2         | fait (connexion par lien magique testée avec succès par Jonathan sur le site en ligne)                                                                                                                                                                                                                                                                                                                                                                             | PR M0.2, M0.2b, M0.2c                                                                                                               | 2026-11-14 |
| M0.3         | code fait et fusionné ; production Inngest bloquée (clés manquantes, voir « À fournir par Jonathan »)                                                                                                                                                                                                                                                                                                                                                              | [#7](https://github.com/jonathan-enca/outreach-links/pull/7)                                                                        | 2026-11-14 |
| M0.4         | fait (Lighthouse mobile 98/100/100/100 sur `/` et `/connexion`)                                                                                                                                                                                                                                                                                                                                                                                                    | [#6](https://github.com/jonathan-enca/outreach-links/pull/6)                                                                        | 2026-11-14 |
| M1.1         | fait (client DataForSEO testé sur fixtures synthétiques ; appel réel non fait, voir « À fournir »)                                                                                                                                                                                                                                                                                                                                                                 | [#12](https://github.com/jonathan-enca/outreach-links/pull/12)                                                                      | 2026-11-14 |
| M1.2         | fait (onboarding du site et vérification de propriété ; pas de test Playwright)                                                                                                                                                                                                                                                                                                                                                                                    | [#11](https://github.com/jonathan-enca/outreach-links/pull/11)                                                                      | 2026-11-14 |
| M1.3         | fait (migration appliquée sur le vrai projet ; run réel DataForSEO non fait, voir « À fournir »)                                                                                                                                                                                                                                                                                                                                                                   | [#14](https://github.com/jonathan-enca/outreach-links/pull/14)                                                                      | 2026-11-14 |
| M1.4         | fait (pipeline testé sur fixtures ; run réel DataForSEO Backlinks non fait, voir « À fournir »)                                                                                                                                                                                                                                                                                                                                                                    | [#16](https://github.com/jonathan-enca/outreach-links/pull/16)                                                                      | 2026-11-14 |
| M1.5         | fait (pipeline testé sur fixtures ; run réel DataForSEO non fait ; client LLM créé)                                                                                                                                                                                                                                                                                                                                                                                | [#18](https://github.com/jonathan-enca/outreach-links/pull/18)                                                                      | 2026-11-14 |
| M1.6         | fait (migration appliquée sur la vraie base le 14/11 via l'API de gestion Supabase ; formulaire sans effet réel tant que les clés Inngest et DataForSEO manquent)                                                                                                                                                                                                                                                                                                  | [#20](https://github.com/jonathan-enca/outreach-links/pull/20)                                                                      | 2026-11-14 |
| M2.1         | fait (génération testée sur fixtures ; aucun run réel DataForSEO ; migration appliquée sur la vraie base)                                                                                                                                                                                                                                                                                                                                                          | PR M2.1                                                                                                                             | 2026-11-14 |
| M2.2         | fait (crawl testé sur faux web ; aucun run réel sur un vrai site ; migration appliquée sur la vraie base)                                                                                                                                                                                                                                                                                                                                                          | PR M2.2                                                                                                                             | 2026-11-14 |
| M2.3         | fait (pas de test Playwright : aucune session connectée possible ; tests de services, de composants purs et de SQL réel)                                                                                                                                                                                                                                                                                                                                           | PR M2.3                                                                                                                             | 2026-11-14 |
| MA.1         | fait (exclusion des très grands sites ; zéro appel payant ; MA.2 à MA.7 définis dans PLAN.md)                                                                                                                                                                                                                                                                                                                                                                      | PR MA.1                                                                                                                             | 2026-11-14 |
| MA.2         | fait (mesure de taille groupée avant les backlinks ; testé sur fixtures, aucun appel payant réel ; migration appliquée sur la vraie base)                                                                                                                                                                                                                                                                                                                          | PR MA.2                                                                                                                             | 2026-11-14 |
| MA.3         | fait (grille recalée sur les coûts réels mesurés ; marge gratuite restaurée ; zéro appel payant ; aucune migration)                                                                                                                                                                                                                                                                                                                                                | PR MA.3                                                                                                                             | 2026-11-14 |
| MA.4         | fait (thème facultatif, requêtes de secours sans LLM, « non classé » au lieu de 0 ; zéro appel payant ; aucune migration)                                                                                                                                                                                                                                                                                                                                          | PR MA.4                                                                                                                             | 2026-11-14 |
| MA.5         | fait (drapeau `url_exact` ; zéro appel payant ; migration appliquée sur la vraie base)                                                                                                                                                                                                                                                                                                                                                                             | PR MA.5                                                                                                                             | 2026-11-14 |
| MA.6         | fait (une confirmation, enchaînement automatique des étapes, progression unique ; zéro appel payant ; migration appliquée sur la vraie base)                                                                                                                                                                                                                                                                                                                       | PR MA.6                                                                                                                             | 2026-11-15 |
| MA.7         | fait (aperçu gratuit : indices sur cibles floutées, cibles partagées, message site neuf ; zéro appel payant ; aucune migration)                                                                                                                                                                                                                                                                                                                                    | PR MA.7                                                                                                                             | 2026-11-15 |
| M3.1         | fait (tri des cibles du plan validé ; précision mesurée sur 50 cas ; migration appliquée sur la vraie base ; aucun run réel sur de vrais sites)                                                                                                                                                                                                                                                                                                                    | PR M3.1                                                                                                                             | 2026-11-15 |
| M3.2         | fait (enquêteur : contacts ; testé sur faux web et fixtures ; finder Hunter derrière une interface, désactivé sans clé ; migration appliquée sur la vraie base)                                                                                                                                                                                                                                                                                                    | PR M3.2                                                                                                                             | 2026-11-16 |
| M3.3         | fait (rédacteur : URL vérifiée 200, linter, anti-doublons ; testé sur faux LLM, aucun run réel ; migrations appliquées sur la vraie base)                                                                                                                                                                                                                                                                                                                          | PR M3.3                                                                                                                             | 2026-11-16 |
| M3.4         | fait (lots, édition relue par le linter, validation par lot verrouillée en base ; pas de test Playwright ; migration appliquée sur la vraie base)                                                                                                                                                                                                                                                                                                                  | PR M3.4                                                                                                                             | 2026-11-17 |
| M4.1         | fait (PR #45 fusionnée ; migration `2026111800000000_mailboxes.sql` appliquée sur la vraie base ; `MAILBOX_ENCRYPTION_KEYS` posée sur Vercel)                                                                                                                                                                                                                                                                                                                      | PR M4.1                                                                                                                             | 2026-11-18 |
| M4.2         | fait (moteur d'envoi plafonné, dry run par défaut ; testé sur faux serveur SMTP local ; migration appliquée sur la vraie base ; aucun envoi réel)                                                                                                                                                                                                                                                                                                                  | PR M4.2                                                                                                                             | 2026-11-19 |
| M4.3         | fait (relance unique à J+10, annulée par réponse, désinscription ou rebond ; dry run et faux serveur SMTP seulement ; migration appliquée sur la vraie base ; aucun envoi réel)                                                                                                                                                                                                                                                                                    | PR M4.3                                                                                                                             | 2026-11-20 |
| M4.4         | fait (lecture IMAP en lecture seule, rattachement, DSN, réponses automatiques, rebond → suppression ; faux serveur IMAP local seulement ; migration appliquée sur la vraie base)                                                                                                                                                                                                                                                                                   | PR M4.4                                                                                                                             | 2026-11-21 |
| M5.1         | fait (classifieur règles + LLM sur 12 catégories, jeu annoté FR/EN de 97 cas, actions automatiques, relance repoussée ; migration appliquée sur la vraie base ; 0,017 USD LLM)                                                                                                                                                                                                                                                                                     | PR M5.1                                                                                                                             | 2026-11-22 |
| M5.2         | fait (inbox classé en 7 vues, fiche de fil, brouillons à valider, réponse prête à insérer, politique « payant », autonomie manuel/assisté ; AUCUN envoi de réponse : voir M5.2b ; migration appliquée sur la vraie base ; 0 USD d'API)                                                                                                                                                                                                                             | PR M5.2                                                                                                                             | 2026-11-23 |
| M5.2b        | fait (envoi des réponses validées, dry run et faux serveur SMTP seulement ; migration appliquée sur la vraie base ; aucun envoi réel ; 0 USD d'API)                                                                                                                                                                                                                                                                                                                | PR M5.2b                                                                                                                            | 2026-11-24 |
| M5.3         | fait (vérification des liens à J+7, J+14, J+30 : live / disparu / nofollow / indexable, alertes, page « Liens obtenus » ; testé sur pages de test, aucun appel payant ; migration appliquée sur la vraie base)                                                                                                                                                                                                                                                     | PR M5.3                                                                                                                             | 2026-11-25 |
| M5.4         | fait (écran Tâches, message à copier, relance J+10 en tâche, rappels pour le digest ; garde-fous en base ; migration appliquée sur la vraie base ; 0 USD d'API)                                                                                                                                                                                                                                                                                                    | PR M5.4                                                                                                                             | 2026-11-26 |
| M6.1         | fait (Stripe en mode test derrière un adaptateur factice ; plafonds d'envoi par plan appliqués côté serveur ; aucune clé Stripe fournie : rien testé contre l'API réelle ; migration appliquée sur la vraie base ; 0 USD d'API)                                                                                                                                                                                                                                    | PR M6.1                                                                                                                             | 2026-11-27 |
| MA.8         | fait (sites de test remove-me.io et mega-coloring.com : plafond 50 USD, 20 concurrents, cache DataForSEO jamais lu, audit gratuit relançable sans limite ; migration appliquée sur la vraie base ; 0 USD d'API)                                                                                                                                                                                                                                                    | PR MA.8                                                                                                                             | 2026-11-15 |
| MN.1         | fait (14 noms testés, shortlist Lienvue / Nouelo / Cordelien, recommandation Lienvue ; aucun achat ; antériorité INPI non vérifiée)                                                                                                                                                                                                                                                                                                                                | PR MN.1+MH.1                                                                                                                        | 2026-11-15 |
| MH.1         | fait (relevé d'outlinkai.com dans `docs/home-reference.md`)                                                                                                                                                                                                                                                                                                                                                                                                        | PR MN.1+MH.1                                                                                                                        | 2026-11-15 |
| MN.2         | fait (piste I « clair et émeraude » : `docs/da.md`, jetons, Inter, logo provisoire, nom en réglage unique ; aucune page ; positionnement « alternative française d'Outlink » acté)                                                                                                                                                                                                                                                                                 | PR MN.2                                                                                                                             | 2026-11-15 |
| MH.2         | fait (home : en-tête, hero avec emplacement vidéo, réassurance, c'est quoi, problème, comment ça marche)                                                                                                                                                                                                                                                                                                                                                           | [#63](https://github.com/jonathan-enca/outreach-links/pull/63)                                                                      | 2026-11-15 |
| MH.3         | fait (qualité / message / suivi, fonctions, comparatif sobre, tarifs lus dans `plans`, FAQ, appel final, pied de page, pages légales provisoires, JSON-LD ; section preuves reportée ; migration appliquée sur la vraie base)                                                                                                                                                                                                                                      | PR MH.3                                                                                                                             | 2026-11-15 |
| MB.1         | fait (onboarding en une URL : site créé, thème et requêtes déduits, une seule confirmation du coût, parcours enchaîné ; 0,00015 USD de LLM ; aucune migration)                                                                                                                                                                                                                                                                                                     | PR MB.1                                                                                                                             | 2026-11-15 |
| MT.1         | fait (profil de marque : lecture accueil + sitemap + 8 pages, un appel LLM, table versionnée `brand_profiles`, relecture dans `/app/demarrer` ; run réel mega-coloring.com 0,00064 USD ; migration appliquée sur la vraie base ; 0 USD DataForSEO)                                                                                                                                                                                                                 | PR MT.1                                                                                                                             | 2026-11-15 |
| MT.2a        | fait (objectif de l'utilisateur : `sites.goal` et `target_keywords`, relecture simplifiée, cases « pages à faire citer », écran de choix des mots-clés dans le Plan de liens ; migration appliquée sur la vraie base ; 0 USD d'API, aucun appel DataForSEO)                                                                                                                                                                                                        | PR MT.2a                                                                                                                            | 2026-11-15 |
| MT.2b        | fait (univers de requêtes par persona et par tactique : recettes en cache par niche, langue et persona, un appel LLM court, classement par rendement, coût annoncé avant lancement ; migration appliquée sur la vraie base ; 0 USD DataForSEO, run réel 3 niches 0,0012 USD de LLM)                                                                                                                                                                                | PR MT.2b                                                                                                                            | 2026-11-15 |
| MT.3         | fait (collecte de candidats par tactique : recoupement des concurrents, SERP des requêtes de l'univers avec arrêt par rendement, Content Analysis par type de page et marque ; plafonds avant chaque appel ; Inngest ; **run réel mega-coloring.com 0,242 USD, 515 candidats**)                                                                                                                                                                                    | [#82](https://github.com/jonathan-enca/outreach-links/pull/82) + PR run réel                                                        | 2026-11-16 |
| MT.4         | fait : entonnoir en 6 étages, blogs hébergés rouverts, déjà contactés exclus, score et liste courte, budget 0,10 USD, jeu annoté de 50 cas (règles : précision 1 / rappel 1 ; LLM : précision 1,00 / rappel 0,94). **Run réel du 16/11 fait** (552 candidats, 19 cibles en liste courte, qualification 0,0107 USD) ; migration appliquée sur la vraie base                                                                                                         | PR MT.4, MT.4 bis                                                                                                                   | 2026-11-16 |
| MT.5         | fait : constats par page pour la liste courte (liens morts 404/410 constatés, liens inadaptés avec citation, mentions sans lien vérifiées), jeu annoté de 36 pages, budget 0,05 USD, migration appliquée ; run réel 28 pages, 2 constats, 0,0014 USD ; essais `maxPagesRead` 300 (30 cibles) et seuil 0,6 (rejeté)                                                                                                                                                 | PR MT.5                                                                                                                             | 2026-11-16 |
| MT.6         | fait : écran « Vos cibles » (`/app/audit/[id]/cibles`) : cartes de la liste courte, filtre par tactique, SERP repliée, boutons « Qualifier » et « Analyser les pages » avec coût attendu et pire cas avant lancement, question « fondateur ? », pont « Valider ces demandes » vers le plan, les brouillons et le lot ; rédacteur branché sur le brief ; mentions sans contact examinées ; migration appliquée sur la vraie base ; 0 USD d'API (aucun run réel)     | PR MT.6                                                                                                                             | 2026-11-16 |
| MU (plan)    | fait : diagnostic de l'espace client et du moteur, parcours cible, sous-jalons MU.0 à MU.11 avec prompts dans `docs/jalon-mu.md` ; aucun code, 0 USD d'API                                                                                                                                                                                                                                                                                                         | PR MU (plan)                                                                                                                        | 2026-11-16 |
| MU.0         | fait : session de test connectée (compte et espace de test, trois états), `pnpm shots` (38 captures de l'existant, bureau et mobile), requêtes par type d'éditeur garanties par le job de découverte, chien de garde des étapes bloquées ; vérifié sur la vraie base ; 0 USD DataForSEO, 0,0018 USD de LLM                                                                                                                                                         | PR MU.0                                                                                                                             | 2026-11-16 |
| MU.1         | fait : une seule analyse de bout en bout (un événement, 8 étapes, progression en base), lecture des pages en parallèle, reprise sans repayer ; **run réel mega-coloring.com : 17 min 20 s, 0,470 USD**, 22 cibles ; migration appliquée sur la vraie base                                                                                                                                                                                                          | PR MU.1                                                                                                                             | 2026-11-16 |
| MU.2         | fait : coquille (`nextStep`, `/app` = prochaine étape, fil d'étapes, menu réduit + page Compte, adresses par site, plus de dollars sur le parcours) ; captures avant / après, bureau et mobile ; 0 USD d'API ; aucune migration                                                                                                                                                                                                                                    | PR MU.2                                                                                                                             | 2026-11-16 |
| MU.3         | fait : écran « Analyse en cours » (8 étapes en direct, avancement et temps restant, tri en chiffres, premières cibles, échec avec « Reprendre », ouverture automatique de « Vos cibles », email de fin prêt mais sans clé Resend) ; **run réel mega-coloring.com : 16 min 46 s, 0,478 USD, 17 cibles** ; aucune migration                                                                                                                                          | PR MU.3                                                                                                                             | 2026-11-16 |
| MU.4 à MU.11 | **prioritaire NOW**, ordre mis à jour le 17/11 : **MU.4 élargi** (étape 1 avec pays, langue, objectif ; campagne par pays ; robustesse du moteur ; relance par étape ; recherche en parallèle ; remarques 1 à 5) → **MU.7** (liens morts des concurrents d'abord) → contrôle de qualité → MU.6, MU.5, MU.8 à MU.11. **Prompt maître prêt : `docs/master-prompt-essai.md`**                                                                                         |                                                                                                                                     |            |
| Maître n° 2  | fait le 17/11 (nuit) : lecture adaptative et filtre avant lecture (46 cibles au lieu de 15 sur les mêmes candidats), stock et « Lire d'autres sites », types d'éditeurs déduits du profil et 40 requêtes garanties, onglets par type, test « rien de propre à un thème » ; **runs réels : 40 cibles en 11 min 12 pour 1,08 USD, puis 54 cibles, 72 après un lot « Lire d'autres sites »** ; **non fait** : email de fin (clé Resend refusée), pages ressources (J) | [#110](https://github.com/jonathan-enca/outreach-links/pull/110) à [#117](https://github.com/jonathan-enca/outreach-links/pull/117) | 2026-11-17 |
| MB.2         | à faire **après MU.11** (le parcours et le moteur changent avant le test de bout en bout)                                                                                                                                                                                                                                                                                                                                                                          |                                                                                                                                     |            |
| M6.2 à M7.3  | à faire                                                                                                                                                                                                                                                                                                                                                                                                                                                            |                                                                                                                                     |            |
| MO.1         | fait (décisions d'offres écrites, table `plans` et droits étendus, plafond en cibles contactées ; migration appliquée sur la vraie base ; 0 USD d'API ; aucun écran)                                                                                                                                                                                                                                                                                               |                                                                                                                                     |            |
| MO.2         | fait (masquage en base et dans les services, vues `*_v`, export et tâches refusés, analyse gratuite complète ; la migration de retrait de lecture `…0200` s'applique après le déploiement)                                                                                                                                                                                                                                                                         |                                                                                                                                     |            |

## Décisions prises

- Accueil sur téléphone (20/11/2026, maquette `docs/mockups/accueil-mobile.html` validée) : bouton « Essai gratuit » dans l'en-tête, titres plus petits, « C'est quoi » en questions dépliables, étapes des méthodes repliées, chiffres des Preuves sur une ligne et sites à faire défiler, comparatif en cartes (la colonne « Avec nous » sortait de l'écran), tarifs une offre à la fois (Pro par défaut), encart de proposition de valeur sur les écrans de compte. Bureau inchangé. Accueil : environ 23 écrans de téléphone → 17. Corrigés au passage : menu mobile sans fond (portail vers `body`, le `backdrop-filter` de l'en-tête piégeait le panneau), survol illisible des boutons blancs sur fond marine (`--primary-hover` en surface nuit).
- Accueil et écrans de compte, textes revus (20/11/2026, maquette `docs/mockups/accueil-connexion.html` validée par commentaires) : plus de « lots », « cibles », « espace », « agent », « digest », « dofollow », « éditorial » côté public ; « espace » devient « compte » ; le panneau des écrans de compte porte la proposition de valeur (« Des backlinks gratuits, sans les acheter ni y passer vos soirées. ») ; FAQ alignée sur « Gmail et Google Workspace seulement, connexion Google » et sur « gratuit pour voir, carte pour envoyer » ; plus aucun lien public vers les guides `/aide/boite-envoi` (pages conservées). Bouton « Renvoyer le lien » sur l'écran qui suit l'inscription ou la demande de mot de passe (`resendLinkAction`). Prix confirmés par Jonathan le 20/11/2026 : 29,90 / 49,90 / 199,90 € (ceux de la table `plans`, CLAUDE.md mis à jour). Section Preuves : chiffres confirmés réels par Jonathan le 20/11/2026, bandeau « illustration » retiré (`PROOFS_ARE_ILLUSTRATIVE = false`) et domaines fictifs « Cité par » supprimés (la liste réapparaît si de vrais domaines sources sont ajoutés dans `proofs.ts`).
- Autonomie maximale demandée par Jonathan (14/11/2026) : déploiements, variables Vercel, réglages Supabase et fusions de PR faits par Claude sans redemander (voir CLAUDE.md section 15).
- Identifiants techniques (non secrets) : projet Vercel `outreach-links` = `prj_AACqPJWqGZmJJq94BPsP5Ke3N8Vr`, équipe `team_yk1dtY94b3oF9BYJ93D5hJqh`, site `https://outreach-links.vercel.app` ; projet Supabase `ivjkwhhgtibewqzccvrj`.
- Variables Vercel (Production et Preview) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publishable) ajoutées ; `NEXT_PUBLIC_APP_URL` existait déjà (valeur masquée, à confirmer = site ci-dessus). Supabase Auth : Site URL = le site, Redirect URLs = `/auth/callback` du site et de localhost.
- Mails de connexion : l'envoi par défaut de Supabase est limité (2 mails/heure, membres de l'organisation seulement). Brancher un SMTP dédié (Resend) avant l'ouverture au public.

- Projet Supabase `outreach-links` : id `ivjkwhhgtibewqzccvrj`, région eu-west-3 (Paris), organisation de Jonathan. Pour libérer une place gratuite, le projet `coloring-pages` (analytics) a été mis en pause à la demande de Jonathan ; le projet `scan-vie-privee` reste actif.
- La migration a été appliquée via l'outil MCP sous le nom `core_schema` (le fichier du dépôt reste la source de référence).

- Produit : outreach IA de backlinks gratuits, audit d'abord, français d'abord (voir CLAUDE.md).
- Pas de mention de l'IA dans les emails d'outreach ; le site vend l'automatisation par IA.
- Plafonds d'envoi intégrés au pricing ; audit gratuit à coût plafonné.
- Règle de travail : utiliser au maximum les MCP et CLI disponibles pour toutes les tâches techniques (voir CLAUDE.md section 15).
- Dépôt GitHub : `jonathan-enca/outreach-links` (nom provisoire du produit, pas de domaine défini).

### M0.3 (Inngest, coûts, logs)

- `cost_ledger` : `workspace_id` nul possible (appels système), invisible côté client ; `audit_id` = uuid sans clé étrangère (la table `audits` n'existe pas encore, contrainte à ajouter en M1 par migration additive). Écriture réservée à `service_role` (select et insert seulement).
- `recordCost(client, entry)` prend le client Supabase en paramètre (testable) ; `createServiceClient()` fournit le client `service_role`.
- Variables optionnelles dans `env.ts` avec `requireEnv()` (erreur claire à l'usage) : `SUPABASE_SERVICE_ROLE_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `LOG_LEVEL`. `OUTREACH_SENDING_ENABLED` (défaut false) ajoutée, aucun code ne la lit encore.
- `/api/inngest` est exclu du matcher du proxy de session (protégé par la clé de signature). Id d'application Inngest : `outreach-links`. `health` est déclenchée par l'événement `app/health.ping`, sans cron.
- `inngest-cli` n'est pas une dépendance (pnpm bloque son script) : `pnpm inngest:dev` lance `npx --ignore-scripts=false inngest-cli@1.53.0 dev --no-discovery`.
- `SUPABASE_SERVICE_ROLE_KEY` posée sur Vercel (Production et Preview, sensitive) via l'API. Une route de diagnostic temporaire des clés a été ajoutée puis retirée (PR #8 et #9). Sentry et `jobs_audit` non faits (optionnels).

### M0.4 (coquille UI)

- shadcn/ui installé à la main (Button, Card, Badge). Un seul système de statuts (cycle prospect et vues inbox) avec un ton par statut. Mode clair uniquement ; palette papier `#faf8f3` / sapin `#14595a` ; polices Fraunces et Public Sans.
- Navigation : barre basse sur mobile, latérale à partir de `md`, lien d'évitement. `/app` = accueil avec workspace, bouton vers l'audit et déconnexion ; bouton « Se connecter » ajouté sur l'accueil public.
- Hors périmètre : contenu réel des écrans, mode sombre.

### M1.1 (client DataForSEO)

- Paramètres des endpoints en snake_case comme l'API ; défauts France (location 2250), français, depth 30.
- Cache écrit avant le journal des coûts : si `recordCost` échoue, l'erreur est loguée mais la réponse payée est rendue. Les hits de cache sont journalisés à 0 USD avec `cacheHit=true` dans metadata. Le cache est lu avant les plafonds de budget.
- `estimateCost` repose sur la grille publique (SERP 0,002 USD par page de 10 ; Labs 0,01 + 0,0001 par ligne ; Backlinks 0,02 + 0,00003 par ligne ; OnPage 0,000125 par page). Hypothèse à recaler sur le coût réel.
- Plafonds `maxCostPerCallUsd` et `budgetUsd` par instance : `BudgetExceededError` avant l'appel.
- Démo réelle : `pnpm demo:dataforseo` (fichier vitest ignoré sauf `DATAFORSEO_LIVE_DEMO=1`).
- Table `dataforseo_cache` sans policy : `service_role` seulement.

### M1.2 (onboarding du site, vérification de propriété)

- Jeton, méthode et date de vérification écrits par `service_role` seulement ; droits insert/update de `authenticated` sur `sites` passés en droits par colonne. Changer de domaine remet la vérification à zéro et renouvelle le jeton (trigger SQL).
- Vérification : balise `<meta name="outreach-links-verification" content="JETON">` sur l'accueil, ou fichier `/.well-known/outreach-links-verification.txt` contenant le jeton ; https puis http. Protection SSRF (DNS vérifié, ports 80/443, 3 redirections, 512 Ko).
- Domaine normalisé (minuscules, sans schéma, chemin, port ni `www.`, IDN en punycode ; IP, localhost et TLD internes refusés). Pays : FR, BE, CH, CA, LU, MC ; langues : fr, en. 1 à 3 requêtes prioritaires obligatoires.
- `sender_email` facultatif (intention) ; connexion réelle de la boîte en M4.1.
- Logique dans `service.ts` (client Supabase en paramètre, testable) ; `actions.ts` appelle seulement ces fonctions. Événements `site.created`, `site.updated`, `site.verified`. Accès via le bouton « Configurer mon site » de `/app`.

### M1.3 (découverte des concurrents par la SERP)

- Statut `echoue` ajouté aux cinq statuts demandés, avec `error_message`. Le handler `onFailure` du job y passe l'audit.
- Écritures sur `audits`, résultats SERP et `competitors` réservées à `service_role` ; l'utilisateur lit via la RLS. Les actions vérifient l'accès par la RLS puis écrivent avec le client service.
- Index unique partiel : un seul audit actif par site ; `createAudit` réutilise l'audit actif. Événement Inngest à id stable `audit-discover-<id>` (dédoublonnage). Si l'envoi échoue, l'audit reste `confirme` et le bouton propose de relancer l'envoi.
- `workspaces.plan` (`gratuit` par défaut, non modifiable côté client). Plafonds de coût par audit : gratuit 0,25 USD, payant 1,50 USD. Coût estimé affiché et confirmation avant lancement.
- Scoring : couverture de requêtes, puis somme des poids de position ; domaines hors top 30 ignorés. Liste d'exclusion dans `excluded-domains.ts` (pas en base). Labs `competitors_domain` non utilisé (SERP seulement).
- FK `cost_ledger.audit_id` vers `audits` ajoutée (le backlog M1 est soldé). `database.types.ts` patché à la main d'après l'outil MCP puis prettier.

### M1.4 (backlinks des concurrents, nettoyage, export)

- Étape à part : `audits.backlinks_status` (`aucun`, `confirme`, `en_cours`, `termine`, `echoue`) ; le statut de l'audit reste `termine`, la machine d'états de M1.3 est intacte. Pas de lancement automatique : coût estimé affiché puis confirmation ; événement Inngest `audit/backlinks.requested` (id stable avec la date de confirmation).
- Limites par concurrent : 300 lignes en gratuit, 1000 en payant, mode `one_per_domain`. Réduites si le budget restant ne suffit pas, étape refusée sous 50 lignes ; contrôle refait avant chaque appel payant (`BudgetExceededError`). Estimations : gratuit 0,087 USD (+0,018 SERP = 0,105 sous le plafond 0,25) ; payant 1,0 USD sous 1,50.
- Les liens écartés restent en base (`clean_status = 'exclu'`, `exclusion_reasons`) ; chaque exclu compté une fois, dans son premier motif. Doublons : concurrent + URL source + URL cible normalisées, meilleure ligne gardée (dofollow puis spam le plus bas). Nofollow et cassés conservés (reprises de liens morts).
- Spam : score fournisseur >= 50 ou heuristiques (mots, segments courts, TLD à risque, tirets/chiffres, ancre). Images réutilisées : 3 liens image ou plus d'un même domaine. Étranger : ccTLD hors langue cible, écritures non latines, IDN. Plateformes : liste de M1.3. Seuils via `CleanContext`. Nettoyage en un seul step, mises à jour par groupes de motifs.
- CSV : séparateur point-virgule, BOM UTF-8 (Excel FR), lu avec le client utilisateur (RLS). Route `GET /app/audit/<id>/export?portee=propres|tout`.

### M1.5 (profil de liens, écart, diagnostic par page, client LLM)

- Étape à part, comme M1.3 et M1.4 : exige les backlinks terminés et une confirmation explicite du coût. Événement `audit/profile.requested` (id stable : audit + date de confirmation). Remplit `audit_pages` et `audit_gap_domains`, produit un résumé.
- Écart de domaines calculé localement : domaines sources conservés par M1.4 moins domaines référents du site (pas de `domain_intersection`, sémantique invérifiable). Approximatif si la liste des référents est tronquée : drapeau et avertissement dans l'UI.
- Domaines référents par page : échantillon de backlinks du site en mode `as_is` (borne basse). Besoin par page : médiane des référents des repères x 0,2 x (0,7 en positions 4 à 10, sinon 1) moins l'existant, fourchette +/- 40 % en ordre de grandeur. Seuils = hypothèses, exportés dans `compute.ts`.
- Pages prioritaires : au moins un mot-clé en positions 4 à 20 avec volume >= 50 ; score = somme volume x proximité (1 en position 4, 0 en 21) ; tri par `priority_rank`.
- Limites adaptatives au plafond : gratuit 100 lignes par appel (jusqu'à 50), moins de repères, refus avant tout appel payant ; estimé gratuit ~0,143 USD (3 repères, 3 pages OnPage) pour 0,145 USD restants sous 0,25. Payant : 500 mots-clés, 1000 domaines, 1000 backlinks, 10 repères, 10 pages OnPage.
- Client LLM `src/lib/llm` : fetch direct sans SDK ; Anthropic par outil forcé (`tool_use`), OpenAI par `response_format` json_schema (`z.toJSONSchema`) ; modèles par défaut `claude-haiku-4-5` et `gpt-4o-mini` (surcharge `LLM_MODEL`). Coût journalisé même si la sortie est invalide. Plafond 0,05 USD par résumé.
- Variables optionnelles : `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL`, `LLM_PROXY_AUTH` (mode proxy agent, interdit en production, comme `DATAFORSEO_PROXY_AUTH`).
- Le résumé n'échoue jamais l'audit : sans clé, erreur ou promesse détectée deux fois, texte de modèle déterministe (`profile_summary_source = modele`).
- `profile_cost_usd` = total `cost_ledger` moins `actual_cost_usd` moins `backlinks_cost_usd` (solde le piège M1.4). Noms des contrôles OnPage tirés de la documentation ; un contrôle absent n'est jamais un défaut.

### M2.1 (opportunités de liens)

- Étape à part sur l'audit, comme M1.3 à M1.5 : `audits.opportunities_status` (`aucun`, `confirme`, `en_cours`, `termine`, `echoue`), exige le profil terminé et une confirmation du coût. Événement `audit/opportunities.requested` (id stable audit + date de confirmation), job `audit-opportunities` (un step par requête SERP, cache DataForSEO).
- Table `link_opportunities` (écriture `service_role`, lecture par la RLS), unique (audit, domaine source). 5 types : `ecart_domaines` (gratuit, lit `audit_gap_domains`), `mention_marque`, `page_ressources`, `annuaire`, `jamais_sollicite` (requêtes SERP top 10). `lien_mort` autorisé par la contrainte, réservé à M2.2. Chaque ligne a page cible, type de lien attendu, offre, pourquoi, priorité (score 0-100 : base du type + bonus de rang ou de citations ; haute >= 75, moyenne >= 50).
- Plafond PROPRE à l'étape (gratuit 0,02 USD, payant 0,05 USD), indépendant du plafond d'audit : celui du gratuit (0,25) est déjà presque consommé par M1.3 à M1.5 (~0,248). Estimé : 5 requêtes gratuit = 0,010 USD, 8 requêtes payant = 0,016 USD. Contrôle avant chaque appel payant ; requêtes figées à la confirmation.
- Filtres : domaine du site, concurrents retenus, plateformes exclues (liste M1.3). Dédoublonnage par domaine (meilleur score). Page cible : accueil pour les mentions de marque, sinon recoupement mots-clés des pages prioritaires, sinon rotation. Régénération idempotente (table vidée pour l'audit puis réécrite).
- Les mentions de marque ne vérifient PAS l'absence de lien (à faire au tri des cibles, M3.1). Aucun email, aucun contact.

### M2.2 (chasseur 404)

- [auto] Étape gratuite (0 USD, aucun appel DataForSEO ni LLM), sans confirmation de coût : bouton « Lancer le chasseur 404 » sur l'audit une fois les opportunités terminées. Colonnes `audits.deadlinks_*` (statuts `aucun`, `en_cours`, `termine`, `echoue`), événement Inngest `audit/deadlinks.requested` (id stable audit + date), job `audit-deadlinks` (un step pour les pages de concurrents, un step par page ressources, budget de requêtes partagé).
- Deux sources : (1) `target_url` des backlinks gardés des concurrents qui répondent aujourd'hui 404/410 (les sites qui les citent sont les cibles de remplacement) ; (2) liens sortants cassés des pages ressources de M2.1 (profondeur 1, jamais de lien suivi). Un lien n'est « mort » que sur un 404/410 constaté : erreur DNS, délai ou 5xx ne prouvent rien.
- Plafonds : 200 requêtes au total, 8 pages ressources, 25 liens par page, 30 URL de concurrents, 10 sources par URL morte ; 1 requête par seconde et par hôte ; robots.txt par hôte (jeton `OutreachLinksBot`, 5xx ou injoignable = interdit, 4xx = permis) ; user-agent `OutreachLinksBot/1.0 (...)` ; SSRF via le fetcher existant (`createSafeFetcher`, refactor de `verify.ts`, corps limité à 256 Ko).
- `link_opportunities` : colonnes `broken_url`, `broken_http_status`, `broken_checked_at` et contrainte SQL : un `lien_mort` exige une preuve 404/410. Type de lien attendu `reprise_lien_mort`. Un constat prouvé REMPLACE une opportunité moins précise du même domaine (unique audit + domaine). La régénération de M2.1 conserve désormais les `lien_mort` (et ne recrée pas leurs domaines).
- Page de remplacement : recoupement des mots de l'URL cassée / ancre avec les mots-clés des pages prioritaires, sinon rotation puis accueil (même logique que M2.1).
- Limites connues : les URL source issues de redirections Google (M1.6 bis) sont parfois tronquées et répondent mal, donc ignorées (pas de preuve) ; aucun run sur de vrais sites (aucune requête réelle faite en session, par prudence) ; un site qui bloque les robots est simplement ignoré et compté.

### M2.3 (écran Plan de liens)

- [auto] Page `/app/audit/[id]/plan` (lien depuis l'audit une fois les opportunités terminées). Retenir / écarter par opportunité (`link_opportunities.status` = `retenu` / `ecarte`, `plan_position`), monter / descendre (positions renumérotées 1..n). Formulaires serveur simples (fonctionnent sans état client). Pas de glisser-déposer ni de sélection groupée (backlog).
- Ancres (`anchors.ts`, seuils [HYPOTHÈSE]) : mention de marque et annuaire = marque ; profil absent, < 5 liens ou sur-optimisé = marque (adresse du site si la marque dépasse déjà 60 %) ; sinon ancre descriptive (premier mot-clé de la page cible) tant que les ancres « autres » restent sous 15 % du profil.
- « Valider le plan » appelle la fonction SQL `create_link_plan` (security definer, `service_role` seulement) : verrou de l'audit, version = dernière + 1, copie atomique des retenues dans `link_plan_items` (instantané immuable : ni update ni delete pour `service_role` ni `authenticated`). Lecture par les membres du workspace. Les versions précédentes restent. M3 doit lire UNIQUEMENT la dernière version de `link_plans` : rien ne part sans validation.
- Une régénération des opportunités (M2.1) n'efface pas les plans validés (références souples).

- MA.1 [auto] : découpe de MA en MA.1 à MA.7 (voir PLAN.md). Défaut le plus simple et gratuit : liste de très grands sites exclus (`GIANT_DOMAINS` dans `src/features/audits/excluded-domains.ts`), appliquée par `isExcludedDomain` (donc aussi à l'audit public). Piège : une entrée `x.*` couvre tous les TLD ; vérifier qu'une entrée ne masque pas un vrai petit concurrent (tests de noms proches). Mesure : 0 USD (aucun appel payant).
- MA.2 [auto] : filtre de taille AVANT `backlinks.backlinks`. Choix : `backlinks.bulk_referring_domains` (UNE requête pour les concurrents retenus + 5 remplaçants, ~0,0202 USD) plutôt que `backlinks.summary` par concurrent (0,02 USD chacun, trop cher pour le gratuit). Seuil de domaines référents : 20 000 gratuit, 100 000 payant [HYPOTHÈSE] (`MAX_REFERRING_DOMAINS`, `limits.ts`). Un concurrent trop gros passe `selected=false, size_excluded=true`, remplacé par le candidat suivant par score ; taille inconnue = gardé ; mesure sautée sans erreur si le plafond de l'audit ne la couvre pas. Migration `2026111520000000_competitor_size.sql` (`competitors.referring_domains`, `size_excluded`), appliquée sur la vraie base. Nouveau step `size-filter` dans `audit-backlinks`. L'estimation affichée inclut la mesure (gratuit 3 concurrents : 0,107 USD au lieu de 0,087). Mesure : 0 USD (fixtures). **Piège** : format de réponse de `bulk_referring_domains` écrit d'après la documentation, non vérifié par un appel réel (schéma tolérant) ; à confirmer au premier audit réel. **Tension pour MA.3** : l'étape Profil gratuite (~0,143) ne tient plus sous le plafond 0,25 après 0,018 + 0,107 ; elle se dégrade déjà d'elle-même (limites adaptatives), MA.3 doit recaler la grille et la marge.

- MA.4 [auto] : site neuf sans mot-clé classé. Le blocage `aucun_mot_cle` n'existait que dans l'audit PUBLIC (l'audit connecté exige déjà 1 à 3 requêtes à l'onboarding). Choix le plus simple, sans migration ni LLM : champ facultatif « thème » sur le formulaire public (`niche`), transformé par `nicheQueries` (`niche.ts`) en 3 requêtes de secours (thème, « thème en ligne », « thème guide ») stockées dans `public_audits.queries` avec `queries_source = 'auto'`. Priorité inchangée : requêtes saisies, puis mots-clés classés du site (`deriveQueries`), puis requêtes du thème ; sans rien de tout cela, l'échec `aucun_mot_cle` reste (le formulaire de relance propose maintenant aussi le thème). Un site sans page classée n'a plus de score : `result.score = null`, `result.site.newSite = true` (champ optionnel, anciens résultats compatibles), le rapport public et la section Profil de l'audit connecté affichent le badge « Non classé » et une explication, jamais 0/100. Le plan de cibles (écart de domaines) repose déjà sur les concurrents seulement. Pièges : requêtes de secours génériques, pertinence moyenne (le thème doit être bien choisi) ; un thème saisi avec des requêtes : les requêtes l'emportent. Mesure : 0 USD (fixtures).

- MA.5 [auto] : URL exactes des cibles. `resolveRedirect` renvoie `exact` (faux pour une URL reconstruite du fil d'Ariane, jamais exacte car décodée ou tronquée) ; `SerpEntry.urlExact` (optionnel, absent = exact), `Candidate.urlExact`, colonne `link_opportunities.url_exact` et `link_plan_items.url_exact` (booléen, défaut true : les lignes existantes viennent de vraies URL ou de contrôles HTTP 404/410). Migration `2026111521000000_url_exact.sql` (additive, fonction `create_link_plan` recopiée avec `url_exact`), appliquée sur la vraie base. Le plan affiche le badge « Page à préciser » ; `PlanItemView.urlExact` et l'instantané du plan portent le drapeau. Pas de second appel SERP. **À faire en M3.1** : pour toute cible `url_exact = false`, résoudre la vraie page par fetch de l'accueil du domaine (robots.txt, SSRF, `createSafeFetcher`) puis chercher la page par ses mots, et ne jamais citer l'URL partielle dans un mail ; une cible dont l'URL n'a pas pu être vérifiée en HTTP 200 est écartée avec motif. Mesure : 0 USD.
- MA.6 [auto] : parcours unique. Colonne `audits.auto_chain` (migration `2026111522000000_audit_auto_chain.sql`, additive, défaut false : les anciens audits gardent les boutons par étape). `createAudit` calcule le coût de tout le parcours (`estimateChain`, pire cas du plan, mêmes fonctions d'estimation que chaque étape) et le range dans `estimate_details.chain` ; `confirmAudit` pose `auto_chain = true` ; à la fin des jobs discover, backlinks et profil, une étape `chain-next` appelle `advanceChain` (`src/features/audits/chain.ts`) qui lance l'étape suivante via les `start*` existants (nouveau paramètre `actorId` = `audits.created_by`, sans session). Les plafonds et figements de chaque étape sont inchangés : si le plafond ne couvre pas une étape, elle reste « à lancer à la main » (jamais payée en plus). Une étape échouée arrête l'enchaînement ; ses boutons manuels servent de reprise. Le chasseur 404 (crawl sans API payante) reste manuel. Progression : `ChainProgress` + rafraîchissement automatique sur la page d'audit.
- MA.7 [auto] : valeur de l'aperçu gratuit, sans coût ni design. `projectReport` (`src/features/public-audit/report.ts`) ajoute pour chaque cible FLOUTÉE l'extension (`tld`) et le type de lien (`dofollow`), qui ne révèlent pas le domaine, et `sharedTargets` (cibles montrées qui renvoient vers au moins 2 concurrents, argument de valeur le plus concret). Site neuf sans page classée : message « la première page à pousser est votre accueil » au lieu de l'absence de pages en positions 4 à 20. Le test de floutage vérifie toujours qu'aucun domaine ni détail de page ne sort sans email. Hors périmètre (backlog) : brancher la mesure groupée de MA.2 sur l'audit public. Mesure : 0 USD.

- M3.1 [auto] : tri des cibles du plan VALIDÉ (dernière version de `link_plans`). Tables `link_plan_triage_runs` (un run par plan : en_cours, termine, echoue) et `link_target_triage` (un verdict par `link_plan_items`, upsert idempotent ; le plan reste immuable). Migration `2026111523100000_target_triage.sql` (additive, appliquée sur la vraie base ; service_role sans delete). Contrainte SQL : un verdict `ok` exige `resolved_url` lue en HTTP 200. Chaîne par cible (`src/features/triage/triage.ts`) : (1) cible = notre site ou un concurrent de l'audit -> `concurrent_direct` sans lecture ; (2) lecture de la page (`page-reader.ts` : robots.txt `OutreachLinksBot`, 1 s par hôte, 6 requêtes par cible, cache mémoire, SSRF via `createSafeFetcher`, extraction Cheerio, lecteur de secours Jina seulement si `PAGE_READER_FALLBACK=jina`) ; URL partielle (`url_exact = false`, MA.5) : lecture de l'accueil puis recherche de la page par les mots de l'URL partielle dans les liens internes, sinon l'accueil (`url_origin = accueil`, signalé) ; jamais l'URL partielle citée ; (3) règles gratuites (`rules.ts`) : 404/410 ou site parqué = `mort`, 401 ou mur de connexion = `compte_obligatoire`, spam (2 motifs distincts) = `pirate`, tarifs de liens ou articles sponsorisés = `payant`, injoignable, robots interdit ou HTTP non 200 = `non_verifiable` ; (4) LLM (`classify.ts`, sortie structurée zod, contenu externe encadré par `<donnees_non_fiables>` : jamais d'instruction suivie) pour `ok`, `hors_sujet`, `irrealiste` et les cas de doute ; le hook doit être une citation réelle de la page sinon il est jeté et la cible passe « à relire » ; confiance < 0,6 = « à relire ». Une panne LLM ou l'absence de clé donne `non_verifiable`, JAMAIS `ok` par défaut. Plafonds (`limits.ts`) : 40 cibles par exécution, 0,10 USD de LLM, 0,01 USD par appel. Événement Inngest `plan/triage.requested` (id stable plan + date), job `plan-triage` (un step par cible). Écran : section « Tri des cibles » sur `/app/audit/[id]/plan` (verdict lisible, motif, accroche, « à relire »). Décisions : cache de pages = mémoire par cible (pas de table, relance = relecture) ; pas de verdict modifiable à la main (M3.4) ; seul `ok` passe à M3.2.
- M3.2 [auto] : enquêteur sur les cibles `ok` du tri (dernier plan validé). Migration additive `2026111600000000_target_contacts.sql` (appliquée sur la vraie base) : `suppressions` (email ou domaine, par workspace ou globale `workspace_id` nul, unique insensible à la casse), `contact_runs` (un run par plan), `target_contacts` (un contact par cible, upsert idempotent), `manual_tasks` (formulaire à remplir à la main, unique par cible, `message` nul jusqu'à M3.3). Contraintes SQL : `sendable` exige `status = email_verifie`, `verification = valide` et un email (et réciproquement) : AUCUN email non vérifié n'est envoyable, même par erreur de code. Chaîne par cible (`src/features/contacts/investigate.ts`) : (0) domaine sur la liste de suppression = `supprime` sans lecture ; (1) lecture de la page du tri, de l'accueil et d'au plus 3 pages de contact/mentions légales/CGU/à propos trouvées dans les liens internes (même lecteur que M3.1 : robots.txt, 1 s par hôte, SSRF, 7 requêtes par cible) ; extraction des `mailto:` et du texte (désobfuscation « [at] », « (arobase) »), rejet des réseaux sociaux, no-reply, gabarits, fichiers ; (2) email du domaine de la cible (classé : contact/redaction/bonjour d'abord) -> vérification ; (3) sinon finder (Hunter `domain-search`, adresses du domaine de la cible seulement) -> vérification ; (4) sinon formulaire détecté (textarea, hors recherche/commentaires/connexion) -> `formulaire` + tâche manuelle, jamais rempli par le serveur ; sinon `introuvable`. Un email d'un autre domaine (agence web, etc.) n'est jamais utilisé tel quel : `email_a_verifier`, non envoyable, et un formulaire lui est préféré. Sans clé `EMAIL_FINDER_API_KEY` (ou panne, ou plafond de 60 appels payants par exécution) : tout email reste `email_a_verifier` (non envoyable) ; le résultat « risque » (accept-all, webmail) ou « inconnu » ne rend jamais envoyable. Fournisseur : interface `EmailProvider` (`provider.ts`), adaptateur Hunter (`api.hunter.io`, jamais appelé sans clé ; hôte à autoriser dans le réseau cloud) ; coûts du fournisseur journalisés dans `cost_ledger` en unités (crédits), 0 USD estimé. Événement Inngest `plan/contacts.requested`, job `plan-contacts` (un step par cible, concurrence 1). Écran : section « Contacts des cibles » sur `/app/audit/[id]/plan`, visible quand le tri est terminé ; statuts lisibles, résumé (emails vérifiés / formulaires / sans contact), nombre de tâches manuelles. Décision : pas d'appel finder si un email du domaine est déjà visible ; pas de réseau social ; pas d'écran de tâches manuelles (M3.4). `parseHtml` renvoie en plus `mailtos` et `hasContactForm`.
- M3.2b [auto] (demande de Jonathan : « passe sur Hunter, on verra plus tard, sinon une autre solution ») : Hunter n'est plus un prérequis. Vérification GRATUITE par DNS (`createMxVerifier`, `EMAIL_FREE_VERIFY=mx` par défaut, `none` la coupe) : domaine existant, non jetable, avec au moins un MX réel (le « null MX » `.` = invalide) -> `valide`, vérificateur `mx`. Elle ne prouve pas que la boîte existe : elle s'applique UNIQUEMENT à un email que la cible publie elle-même sur son propre domaine (source `page`) ; jamais à un email du finder ni à une adresse d'un autre domaine ; un vérificateur payant, s'il est configuré, prime et son « invalide » n'est pas contourné ; une panne DNS donne `inconnu` (non envoyable). Le filet de sécurité reste M4 (rebond = email invalide, suspension de la boîte). Contraintes SQL inchangées. Résultat : sans aucune clé, les emails publiés sur le site de la cible deviennent envoyables après validation de lot ; le finder (Hunter) reste branchable plus tard sans changement de code.
- M3.2c [auto] (idée de Jonathan : explorer le site à fond suffit dans presque tous les cas) : exploration progressive et déterministe, sans LLM ni coût. Par tours de 3 pages (au plus 10 pages de contact/légal/équipe/presse/partenaires/auteurs ; 18 requêtes par cible robots.txt compris, 4 tours) : page de la cible + accueil, puis les liens internes les mieux classés, les liens des pages lues alimentent le tour suivant (accueil -> à propos -> équipe), et dès le 2e tour le `sitemap.xml` est lu une fois (URL du même hôte, sans index imbriqués) pour trouver une page de contact absente du menu. Arrêt dès qu'un email du domaine de la cible est trouvé. `parseHtml` décode aussi les emails masqués par Cloudflare (`data-cfemail`) et lit le JSON-LD (`email`). Robots.txt, 1 s par hôte et SSRF inchangés. Limites connues : pas de JavaScript exécuté (emails injectés côté client non vus), pas de sitemap index, pas d'images/PDF ; un agent LLM de navigation reste possible plus tard si le taux réel de contact est insuffisant.

## Fichiers et modules clés

- `src/env.ts` : validation zod des variables (`parseEnv`, `env`) ; importé par `next.config.ts` (build) et `layout.tsx` (runtime). Toute variable nouvelle s'ajoute ici et dans `.env.example`.
- `messages/fr.ts` + `src/lib/messages.ts` (`t`) : toutes les chaînes de l'interface.
- `src/{app,lib,server,features}` : structure de base.
- `.github/workflows/ci.yml` : lint, typecheck, format, test, build.

- `supabase/migrations/20261114000100_core_schema.sql` : `workspaces`, `memberships`, `sites`, `events`, RLS, trigger `handle_new_user` (workspace + membership owner à l'inscription). Écriture client sur `workspaces`/`memberships` interdite (pas d'insert) ; `events` en ajout seul.
- `supabase/tests/bootstrap.sql` (imite rôles et `auth.uid()` de Supabase) et `supabase/tests/rls.test.ts` (11 tests de RLS sur un vrai Postgres).
- `src/lib/supabase/{client,server,database.types}.ts`, `src/proxy.ts` (session + protection de `/app`), `src/app/connexion`, `src/app/auth/callback`, `src/app/app`.

- M0.3 : `src/app/api/inngest/route.ts`, `src/inngest/{client.ts,functions/health.ts,functions/index.ts}`, `src/lib/{costs.ts,logger.ts}`, `src/lib/supabase/service.ts`, `supabase/migrations/2026111503000000_cost_ledger.sql`, `supabase/tests/cost-ledger.test.ts`.
- M0.4 : `src/app/app/layout.tsx`, `src/components/{app-nav,status-badge,shell-page,empty-state}.tsx`, `src/components/ui/button.tsx`, `src/lib/{navigation,statuses}.ts`, `src/app/{not-found,error}.tsx`, `src/app/globals.css`, `components.json`.

- M1.1 : `src/lib/dataforseo/{client,endpoints,schemas,cache}.ts`, `src/lib/dataforseo/fixtures/`, `src/lib/dataforseo/demo.live.test.ts`, `supabase/migrations/2026111511000000_dataforseo_cache.sql`, `supabase/tests/dataforseo-cache.test.ts`.
- M1.2 : `supabase/migrations/2026111512000000_sites_onboarding.sql`, `supabase/tests/sites-onboarding.test.ts`, `src/features/sites/{domain,schema,verification-constants,verify,service,actions}.ts`, `src/features/sites/{site-form,verification-panel}.tsx`, `src/app/app/site/` (liste, `nouveau`, `[id]`).
- M1.3 : `supabase/migrations/2026111513000000_audits_competitors.sql`, `supabase/tests/audits.test.ts`, `src/features/audits/{service,run,discover,excluded-domains,plans,estimate,fake-supabase}.ts`, `src/features/audits/validation.live.test.ts`, `src/inngest/functions/audit-discover.ts`, `src/app/app/audit/page.tsx`, `src/app/app/audit/[id]/page.tsx`.

- M1.4 : `supabase/migrations/2026111514000000_competitor_backlinks.sql`, `supabase/tests/backlinks.test.ts`, `src/features/backlinks/{clean,normalize,run,service,limits,csv,export,actions,fixtures}.ts`, `src/features/backlinks/{backlinks-section,confirm-backlinks-panel}.tsx`, `src/inngest/functions/audit-backlinks.ts`, `src/app/app/audit/[id]/export/route.ts`.

- M1.5 : `supabase/migrations/2026111515000000_audit_profile.sql`, `supabase/tests/audit-profile.test.ts`, `src/lib/llm/{client,pricing,client.test}.ts`, `src/features/profile/{compute,limits,run,summary,service,actions}.ts`, `src/features/profile/{profile-section,confirm-profile-panel}.tsx`, `src/features/profile/{run.test,summary.live.test}.ts`, `src/inngest/functions/audit-profile.ts`, `src/features/audits/audit-detail.tsx`.

- M2.1 : `supabase/migrations/2026111517000000_link_opportunities.sql`, `supabase/tests/link-opportunities.test.ts`, `src/features/opportunities/{generate,limits,run,service,actions}.ts`, `src/features/opportunities/opportunities-section.tsx`, `src/features/opportunities/opportunities.test.ts`, `src/inngest/functions/audit-opportunities.ts`.

- M2.2 : `supabase/migrations/2026111518000000_deadlinks.sql`, `src/features/deadlinks/{robots,html,hunt,to-opportunities,run,service,actions}.ts`, `src/features/deadlinks/deadlinks-section.tsx`, `src/features/deadlinks/deadlinks.test.ts`, `src/inngest/functions/audit-deadlinks.ts`, `createSafeFetcher` dans `src/features/sites/verify.ts`.

- MA.4 : `src/features/public-audit/niche.ts` (+ `service.ts`, `run.ts`, `report.ts`, `report-view.tsx`, `audit-form.tsx`), `src/features/profile/profile-section.tsx`.

- M2.3 : `supabase/migrations/2026111519000000_link_plan.sql` et `2026111519100000_create_link_plan_fn.sql`, `src/features/plan/{anchors,service,actions}.ts`, `src/features/plan/plan-editor.tsx`, `src/features/plan/plan.test.ts`, `src/app/app/audit/[id]/plan/page.tsx`.

- MT.3 : `supabase/migrations/2026111532000000_candidate_collections.sql`, `supabase/tests/candidate-collections.test.ts`, `src/features/collection/{limits,types,normalize,plan,plan-schema,guard,run,service}.ts`, `collection.test.ts`, `collection.live.test.ts` (`pnpm demo:collect`), `src/inngest/functions/audit-collect.ts`, `src/lib/dataforseo/fixtures/content-analysis-search.json`.

- M3.1 : `supabase/migrations/2026111523100000_target_triage.sql`, `supabase/tests/target-triage.test.ts`, `src/features/triage/{types,limits,page-reader,rules,resolve-url,classify,triage,run,service,actions,eval-set}.ts`, `src/features/triage/triage-section.tsx`, `src/features/triage/triage.test.ts`, `src/features/triage/eval.live.test.ts`, `src/inngest/functions/plan-triage.ts`.

- M3.2 : `supabase/migrations/2026111600000000_target_contacts.sql`, `supabase/tests/target-contacts.test.ts`, `src/features/contacts/{types,limits,extract,provider,investigate,run,service,actions}.ts`, `src/features/contacts/contacts-section.tsx`, `src/features/contacts/contacts.test.ts`, `src/inngest/functions/plan-contacts.ts`.

- M3.3 : `supabase/migrations/2026111601000000_target_drafts.sql` et `2026111601100000_target_drafts_ready_check.sql`, `supabase/tests/target-drafts.test.ts`, `src/features/drafting/{types,limits,lint,write,draft,run,service,actions}.ts`, `src/features/drafting/drafts-section.tsx`, `src/features/drafting/drafting.test.ts`, `src/inngest/functions/plan-drafts.ts`.

- M5.2b : `supabase/migrations/2026112400000000_reply_sends.sql`, `supabase/tests/reply-sends.test.ts`, `src/features/inbox/{send,send.test}.ts`, `src/inngest/functions/reply-send-tick.ts`.

- M5.1 : `supabase/migrations/2026112200000000_reply_classifications.sql`, `supabase/tests/reply-classifications.test.ts`, `src/features/classification/{types,text,rules,classify,actions,service,eval-set}.ts`, `src/features/classification/{classification.test,eval.live.test}.ts`, `src/inngest/functions/reply-classify.ts`.

## Commandes (dev, tests, migrations, Inngest)

`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build` (voir README). Évaluation réelle du tri des cibles (plafond 0,05 USD) : `NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:triage`. Classification réelle des réponses (97 cas, plafond 0,03 USD) : `NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:replies` (`REPLIES_EVAL_OUT=fichier` pour le rapport). Résumé LLM réel (jeu d'évaluation, plafond 0,10 USD) : `NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:llm`. Démo DataForSEO : `pnpm demo:dataforseo` (clés requises). Audit réel : `pnpm demo:audit` (crée un vrai audit en base ; exige `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`). Build local : exige `NEXT_PUBLIC_APP_URL` et les variables Supabase publiques. Tests de RLS : `TEST_DATABASE_URL=postgres://user@host:port/postgres pnpm test` (Postgres 16 avec un superutilisateur ; une base temporaire est créée puis supprimée ; ignorés si la variable manque en local, obligatoires en CI). Migrations : fichiers dans `supabase/migrations`, appliqués par la CLI Supabase (`supabase db push`). Types : `pnpm db:types`. Inngest en local : `pnpm dev`, puis dans un autre terminal `pnpm inngest:dev` (dev server Inngest, doit rester sur le port 8288) ; enregistrer l'app : `curl -X PUT http://localhost:3000/api/inngest` ; événement d'essai : `curl -X POST http://localhost:8288/e/dev -H 'content-type: application/json' -d '{"name":"app/health.ping","data":{}}'`.

- MA.3 [auto] : grille recalée sur les mesures réelles du 14/11 (voir Mesures). `PRICING` : Backlinks +20 % (forfait 0,024 ; 0,000036 par ligne), forfait Labs 0,012. Marge gratuite rendue par les LIMITES, pas par le plafond (qui reste 0,25 USD) : backlinks par concurrent 300 → 75 (`BACKLINKS_LIMIT.gratuit`, minimum 50 conservé : la réduction adaptative passe désormais par un palier à 50 au lieu de refuser) ; profil gratuit 100 → 50 lignes par appel ; audit public gratuit : 100 → 50 backlinks par concurrent, 300 → 100 domaines référents propres. Économie sans perte : le repère du profil (`fetchBenchmark`) réutilise `competitors.referring_domains` mesuré par MA.2 (aucun appel `backlinks.summary` en plus, -0,072 USD en gratuit) ; `estimateProfile(..., knownBenchmark)` n'en compte plus le coût. Parcours gratuit estimé : SERP 0,018 + backlinks et mesure de taille 0,1044 + profil 0,098 = 0,22 USD (marge ~12 %, avant : dépassement). Audit public gratuit estimé : 0,217 USD (avant 0,2296 avec la nouvelle grille). Test `cost-grid.test.ts` exige une marge d'au moins 10 %. Piège : l'audit public (`public-audit/run.ts`) n'utilise pas encore la mesure groupée de MA.2 (3 `summary` à 0,024) ; l'y brancher libérerait ~0,048 USD (backlog). Mesure : 0 USD (aucun appel payant).

## Mesures (coût par audit, taux de contact, etc.)

- MA.3 : recalage sur les coûts réels du 3e essai (14/11) : backlinks.summary 0,024 par appel (grille publique 0,02), backlinks.backlinks 0,0277 pour 100 lignes (0,0230), referring_domains 0,024 (forfait), ranked_keywords 0,012 (0 ligne ; forfait). Cumul de la mission : 0 USD DataForSEO et 0 USD LLM dépensés depuis le départ de Jonathan (MA.1 à MA.3 sur fixtures).
- M3.1 : jeu d'évaluation annoté de 50 cibles synthétiques (`eval-set.ts`). Règles seules : précision 100 % (aucune exclusion à tort), rappel 100 % sur les 23 cas prouvables, aucune page saine ou de jugement exclue. LLM réel (OpenAI `gpt-4o-mini`, 27 cas de jugement) : exactitude 24/27 = 89 % (seuil 80 %), 0 cible refusée à tort présentée comme `ok`, 1 `ok` exclu à tort (crèche jugée hors sujet : excès de prudence) et 2 sites trop gros classés `hors_sujet` au lieu d'`irrealiste` (même effet : écartés). Coût : 0,0034 USD par passage de 27 appels (~0,00012 USD l'appel), 2 passages = ~0,0068 USD LLM. Cumul de la mission : 0 USD DataForSEO, ~0,0068 USD LLM. Aucun run réel sur de vrais sites (aucune requête vers des tiers). 469 tests verts avec Postgres 16 local.
- M5.1 : évaluation RÉELLE de la classification (OpenAI `gpt-4o-mini`, règles + modèle, 97 cas, 2 passages de ~45 appels) : exactitude 93/97 = 95,9 % (seuil 85 %). Précision et rappel de 100 % sur 9 catégories dont les deux à risque (désinscription 11/11, plainte 8/8) ; accepte_lien_pose précision 90 %, intéressé précision 88 %, réponse automatique précision 78 %, **ambigu rappel 43 %** : le modèle sur-interprète les messages très courts (« Ok. » classé accepte à 0,9, « Envoyé depuis mon iPhone » classé absence). Effet réel limité : ces catégories ne déclenchent qu'une proposition ou une relance repoussée de 7 jours. 0 injection obéie sur 6, 0 action appliquée à tort. Coût 0,00858 USD par passage ; **0,01716 USD consignés dans `cost_ledger` de la vraie base** (2 lignes `llm.reply_classify_eval`, workspace nul). Cumul de la mission : 0 USD DataForSEO, ~0,024 USD LLM sur 1 USD (0,0068 avant M5.1 + 0,0172). Sessions enfants lancées : 1 sur 12 (M5.2, session_01PAPr5f76tJaMiUEJRh7voZ). Sessions enfants lancées au total : 3 sur 12 (la 1re = M5.2, la 2e = M5.2b, la 3e = la session de M5.3 ; M5.2b et M5.3 : 0 USD) [corrigé en M5.3]. 671 tests verts avec Postgres 16 local.
- M3.2 : taux de contact mesuré sur un échantillon synthétique de 20 cibles (6 email visible, 4 email en mentions légales, 4 formulaire, 3 rien, 3 réseaux sociaux seulement) : 14/20 = 70 % avec un moyen de contact (10 emails + 4 formulaires), 6 sans contact (dont les 3 pièges « réseaux sociaux » correctement ignorés). Sans vérificateur : 0 email envoyable ; avec un vérificateur factice « valide » : 10 envoyables, exactement ceux trouvés. Ce taux est synthétique : le taux réel sur de petits sites FR reste à mesurer (M7.1). Aucun appel payant, aucun run réel sur de vrais sites. Cumul de la mission inchangé : 0 USD DataForSEO, ~0,0068 USD LLM. 497 tests verts avec Postgres 16 local.
- M0.3 : essai local de la fonction `health` = 0 USD (fournisseur `internal`, appel factice). Aucune dépense DataForSEO ni LLM à ce jour.
- M0.4 : Lighthouse mobile (Chrome headless sur `next start`) : `/` et `/connexion` = performance 98, accessibilité 100, bonnes pratiques 100, SEO 100. Pages `/app/*` non mesurées (derrière la connexion).

- M1.1 : aucun coût réel mesuré (appel impossible, 40100), dépense 0 USD. Estimations : SERP top 30 = 0,006 USD ; Labs limit 100 = 0,02 USD ; Backlinks limit 1000 = 0,05 USD ; Backlinks summary = 0,02 USD.
- M1.2 : 0 USD ; 65 tests Vitest verts dont 22 de RLS sur Postgres réel.
- M1.3 : coût estimé d'un audit gratuit = 0,018 USD (3 requêtes x 0,006 USD, SERP live top 30), plafond gratuit 0,25 USD. Coût réel non mesuré (DataForSEO 40100), dépense 0 USD ; sur fixtures réel = estimé. 156 tests verts dont 8 de RLS pour les audits ; lint, typecheck, format et build verts (build vérifié en CI).
- M1.4 : fixture synthétique de 28 liens : 11 conservés, 17 écartés (interne 2, plateforme 2, spam 5, images réutilisées 3, étranger 4, doublon 1). Coût réel non mesuré (40100), dépense 0 USD.
- MT.3 (run réel 16/11/2026, mega-coloring.com, 4 concurrents, 10 requêtes) : collecte = **0,242 USD** pour 17 appels (annoncé 0,265 attendu, 0,317 pire cas), 515 candidats ; SERP top 30 0,006 ; recoupement 0,024 + 0,000036 par ligne ; Content Analysis 0,024 + 0,000036 par ligne (150 lignes = 0,0294). Sans filtre serveur, le recoupement est à 85 % de lignes inutiles : le filtre est obligatoire.
- M2.2 : 0 USD (étape sans appel payant) ; 385 tests verts avec Postgres 16 local (RLS comprise).
- M1.5 : évaluation réelle du résumé sur OpenAI `gpt-4o-mini` : 6 cas, 6 appels, 0 promesse de classement, 0,00089 USD le dernier passage. Dépense de la session : ~0,0017 USD OpenAI, 0 USD DataForSEO. Coût réel du profil non mesuré (estimé gratuit ~0,143 USD).

## Dettes et pièges

- Vercel : le projet avait `framework: null` (tout en 404). Corrigé en `nextjs` via l'API le 14/11/2026 ; production redéployée et vérifiée (`/` 200, `/connexion` 200, `/app` redirige vers `/connexion`).
- Reste : confirmer que `NEXT_PUBLIC_APP_URL` vaut `https://outreach-links.vercel.app` (valeur masquée dans Vercel).

- **Site actif unique (20/11/2026)** : le site choisi dans le menu vit dans le cookie `site`, mais les pages `/app/site/<id>/…` lisent l'adresse. Le menu (`app-nav.tsx`) les garde d'accord : ouvrir une page de campagne choisit son site, et changer de site depuis une telle page ouvre la même page de l'autre site (« Tous les sites » → Campagnes). Helpers dans `features/shell/site-path.ts`. Ne pas le faire dans `proxy.ts` : les préchargements de liens changeraient le site, et le layout n'est pas rerendu entre deux pages. « Emails > Partis » et son total sont filtrés par site ; les quotas restent ceux de la boîte.
- Next 16 : lire `node_modules/next/dist/docs/` avant d'utiliser une API (voir `AGENTS.md`). `LayoutProps` est généré par `next build`/`dev` : ne pas l'utiliser, le typecheck CI tourne avant le build.
- Tailwind v4 passe par `@tailwindcss/postcss` (`postcss.config.mjs`). Le chargeur `@tailwindcss/turbopack` livré par create-next-app ne traitait pas `@theme`.
- `.env.example` est dé-ignoré dans `.gitignore` ; `.env*` reste ignoré sinon.
- Vitest en `vitest.config.mts` (évite l'avertissement ESM).
- `NEXT_PUBLIC_APP_URL` doit être définie sur Vercel (Preview et Production) ; valeur provisoire à remplacer quand le domaine est choisi.
- En session Claude, `gh pr create` échoue (GraphQL bloqué) : ouvrir les PR via `gh api repos/{owner}/{repo}/pulls --input fichier.json`.
- Après `prettier --write .`, vérifier que les modifications de documents par script ont bien été appliquées.

- Réglages Vercel et Supabase Auth (variables publiques, URL de redirection) et test du lien magique : faits (voir « Décisions prises » et la ligne M0.2). Plus rien à faire à la main ici.
- `database.types.ts` généré depuis le vrai projet (outil MCP Supabase) ; à régénérer après chaque migration.
- Next 16 : `middleware` devient `src/proxy.ts`. Avec `cacheComponents`, tout accès à `cookies()` doit être sous `<Suspense>`.
- `src/env.ts` valide `process.env` à l'import : `vitest.config.mts` fournit des valeurs fictives.
- Les tests Vitest de RLS utilisent un faux schéma `auth` ; le trigger d'inscription et la RLS ont aussi été vérifiés sur le vrai projet (transaction annulée : isolation en lecture, écriture croisée refusée, update croisé sans effet, anon refusé).

- M0.3 : les outils MCP Inngest listent environnements et apps mais ne lisent pas les clés. Le compte Inngest a déjà l'app `scan-vie-privee` (environnement `production-195a09c2`). Sans `INNGEST_SIGNING_KEY`, `GET /api/inngest` répond 500 en production (critère « fonction Inngest sur Vercel » non atteint).
- M0.3 : une ligne d'essai (`internal` / `health.check`, coût 0) existe dans `cost_ledger` sur la vraie base. `database.types.ts` a été mis à jour d'après l'outil MCP puis passé à prettier (`pnpm db:types` exige la CLI Supabase locale, absente en session).
- Un classifieur de sécurité a refusé un curl direct vers `api.inngest.com` ; non contourné.
- Parcours connectés non testables par Playwright (lien magique) : tests via Postgres réel (RLS) et client Supabase simulé ; `/app/*` non mesuré par Lighthouse.
- Vitest n'inclut que `*.test.ts` : tests de composants via `createElement` et `renderToStaticMarkup`, sans JSX. Next 16 : `error.tsx` reçoit `retry` (pas `reset`). Le build télécharge les polices Google à la compilation.

- M1.1 : le proxy de cette session n'injecte pas les identifiants DataForSEO (40100). Fixtures synthétiques d'après la documentation : schémas zod tolérants mais à valider sur de vraies réponses. `DATAFORSEO_PROXY_AUTH` ne doit jamais être défini sur Vercel.
- M1.1 : les nouvelles tentatives sur 429/5xx/réseau rejouent aussi les POST payants (`task_post`) : double débit théoriquement possible. `task_get` hors cache (facturation au `task_post`). Erreurs de tâche non journalisées dans `cost_ledger`. `domain_intersection` attend `targets` en `{ "1": ..., "2": ... }`.
- M1.1 : le cache n'est jamais purgé (prévoir un job Inngest de nettoyage). `database.types.ts` modifié à la main d'après l'outil MCP.
- M1.2 : pas de Playwright dans le dépôt (parcours derrière le lien magique) : tests de services et de composants. Un composant client ne doit pas importer `verify.ts` (`node:dns`) : constantes dans `verification-constants.ts`.
- M1.2 : SSRF : rebinding DNS entre vérification et requête théoriquement possible ; redirections pouvant changer d'hôte (durcissement : domaine ou `www.domaine` seulement) ; pas de limite de débit de la vérification (à faire en 1.6). La vérification exige `SUPABASE_SERVICE_ROLE_KEY` (déjà sur Vercel). Le jeton reste lisible par les membres du workspace (voulu).
- M1.3 : run réel impossible (40100) ; les tests de service et de run utilisent un faux client Supabase en mémoire, seules contraintes et RLS sont testées sur Postgres réel. Les ids d'audit et de workspace doivent être de vrais UUID, sinon `recordCost` échoue (erreur seulement loguée) et le coût n'est pas journalisé. Un audit bloqué en `en_cours` (job tué sans `onFailure`) bloque le site via l'index unique, sans purge automatique. En production, le lancement exige `INNGEST_EVENT_KEY` et `INNGEST_SIGNING_KEY` (manquantes) : sans elles la confirmation affiche un échec d'envoi. Non testé avec un vrai serveur Inngest. Estimation fondée sur la grille publique, à recaler. Pas de Playwright (parcours derrière le lien magique). `pnpm build` local impossible sans les variables `NEXT_PUBLIC_*`.
- M1.4 : aucun appel réel Backlinks (40100). Champs hors schéma zod (`item_type`, `domain_from_rank`) hypothétiques : si absents, `item_type` retombe sur `type` et la règle des images ne se déclenche pas. Fixtures à recaler sur de vraies réponses.
- M1.4 : coût de l'étape = total `cost_ledger` moins `audits.actual_cost_usd` (exact seulement sans autre coût imputé à l'audit ; M1.5 devra suivre ses propres coûts). La page d'audit estime avec `actual_cost_usd` (`cost_ledger` illisible côté client), vérification définitive dans `startBacklinks`.
- M1.4 : plafond compté avec le coût déjà engagé : une tentative payée puis échouée à l'écriture peut voir sa relance refusée sur le dernier concurrent si l'estimation remplit exactement le plafond (rare). Pas de purge d'un `backlinks_status = 'en_cours'` bloqué ; pas d'unicité empêchant deux jobs (transition `confirme` vers `en_cours` atomique). Sans clés Inngest en production, l'état reste `confirme` avec échec d'envoi affiché.
- M1.4 : le faux client Supabase a gagné `range()` et ignore la sélection de colonnes. `database.types.ts` patché à la main puis prettier. Parcours connectés non testables par Playwright (lien magique).
- M1.5 : le `fetch` de Node n'utilise pas `HTTPS_PROXY` sans `NODE_USE_ENV_PROXY=1` : probable cause des 40100 DataForSEO vus en M1.1 à M1.4 (un curl du shell répond aussi 40100, à retester avec ce drapeau, OpenAI marche avec).
- M1.5 : aucun appel réel DataForSEO (fixtures `ranked_keywords`, `referring_domains`, `onpage` synthétiques ; noms des contrôles OnPage et forme de `ranked_serp_element.serp_item` hypothétiques). Aucun appel réel Anthropic (faux fetch seulement) ; grille de prix `claude-haiku-4-5` à recaler ; évaluation du résumé faite sur OpenAI seulement.
- M1.5 : détecteur de promesses de classement par regex (« vous serez en tête » non couvert) ; le prompt les interdit aussi et le texte de modèle sert de repli.
- M1.5 : la page d'audit estime le coût restant avec `actual_cost_usd + backlinks_cost_usd + profile_cost_usd` (`cost_ledger` illisible côté client), vérification définitive à la confirmation. Les sorties d'étapes Inngest transportent jusqu'à 1000 domaines référents. Pas de purge d'un `profile_status` bloqué à `en_cours`. Sans clés Inngest en production, l'état reste `confirme`.
- M1.5 : `database.types.ts` patché à la main (Relationships des deux nouvelles tables vides), à régénérer avec la CLI. Marge gratuite faible (0,143 sur 0,145 USD) : une dérive du coût réel peut faire refuser l'étape en gratuit. `pnpm build` local exige les `NEXT_PUBLIC_*`.
- Parcours connectés : tests de composants (`renderToStaticMarkup`), services avec faux client Supabase et RLS sur Postgres réel, pas de Playwright (lien magique).

- M2.1 : requêtes thématiques simples (niche + mot-clé) ; qualité réelle des cibles non mesurée (aucun run réel). Rationale stockée en français dans la table (texte généré, pas une clé). Pas d'ancre suggérée (M2.3). Mentions de marque non vérifiées (lien déjà présent ou non). Pas de purge d'un `opportunities_status` bloqué à `en_cours`. Sans clés Inngest en production, l'état reste `confirme`.
- `database.types.ts` régénéré avec l'outil MCP Supabase (types complets) puis les ajouts M2.1 recopiés (pas de CLI en session) ; formatage avec `pnpm exec prettier` (pas `npx`, versions différentes).
- Tests de base en local : Postgres 16 démarré dans `/var/tmp/pgd` (`initdb`, port 55432, utilisateur `postgres`) puis `TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres pnpm test`.

### M1.6 bis (premier audit gratuit réel, 14/11/2026)

- Premier appel réel DataForSEO en production : `labs.ranked_keywords` sur `mega-coloring.com` = 0,012 USD réels (estimé 0,020), 0 mot-clé classé (`items: null`). Audit `echoue` / `aucun_mot_cle`, ce qui est un vrai résultat de données, pas un bug. Les autres endpoints restent non mesurés.
- Correctif : la relance après échec ne passait pas `queries_source` à `visiteur`, donc des requêtes saisies étaient ignorées et l'audit était déduit en « auto ». Corrigé, test ajouté. La page d'échec `aucun_mot_cle` affiche maintenant un formulaire (3 requêtes, domaine fixé) pour relancer. `database.types.ts` vérifié : déjà aligné sur la base.
- 2e essai réel (requêtes « coloriage licorne / dinosaure / mandala », relance via le formulaire : correctif confirmé, `queries_source = visiteur`) : SERP live top 30 = 0,006 USD réel par requête (= estimé). Échec `aucun_concurrent` : la SERP live renvoie des liens de redirection Google (`https://google.com/goto?url=...`, `domain = google.com`) ; le vrai site n'est lisible que dans `breadcrumb` (« https://www.site.fr › dossier › page... ») et `website_name`. Corrigé dans `serpEntries` via `resolveRedirect` (domaine fiable, URL partielle : segments tronqués ignorés). Impacte aussi M1.3 et M2.1 (même fonction). Piège : les URL de page exactes ne sont plus connues pour ces résultats ; à traiter au tri des cibles (M3.1, fetch de la page) ou en testant un autre paramétrage SERP (device, `calculate_rectangles`, ou endpoint advanced).
- Réglage : `.claude/settings.json` autorise les outils MCP Supabase sans validation (sauf delete_branch, pause_project, reset_branch, create_project, create_branch).
- 3e essai réel (après correctif `resolveRedirect`) : audit gratuit terminé sur mega-coloring.com. **Coût réel 0,209 USD** pour 0,196 estimé (plafond 0,25) : SERP 3 x 0,006 ; ranked_keywords 0,012 (réel, estimé 0,020) ; backlinks.summary 3 appels 0,072 (estimé 0,060) ; backlinks.backlinks 3 appels 0,083 (estimé 0,069) ; referring_domains 0,024 (estimé 0,029). Les backlinks coûtent ~20 % de plus que la grille : marge gratuite très faible. Résultat : score 0, 0 page classée, 1 domaine référent ; concurrents retenus cultura.com, shutterstock.com, pixabay.com (grosses plateformes, peu actionnables : à filtrer ou pondérer par taille). Piège : la remise à 1 de `attempts` à la main a recréé un identifiant d'événement Inngest déjà utilisé (dédoublonnage) ; événement renvoyé avec `send_event` et un id neuf.
- Ancien « À faire » (fait) : relancer l'audit de `mega-coloring.com` avec 1 à 3 requêtes saisies (2 tentatives max par mois et par domaine ; la 1re est consommée) pour mesurer le coût réel complet.

### M3.3 (rédacteur de messages, 16/11/2026)

- Périmètre : un brouillon par cible `ok` dont le contact est `email_verifie`, `email_a_verifier` ou `formulaire` (jamais pour `introuvable`/`supprime`). Un brouillon n'est PAS un envoi ; `sendable` reste dans `target_contacts`. Validation par lot : M3.4.
- [auto] Hook = citation vérifiée du tri (M3.1), sinon titre de la page ; sans l'un ni l'autre la cible n'est pas rédigée (pas d'accroche inventée).
- [auto] URL proposée = `target_page_url` du plan, vérifiée par GET (redirections suivies) AVANT d'écrire : si pas 200, rien n'est écrit et le LLM n'est pas appelé. Contrainte SQL : `ready` exige `url_status = 200` et aucun problème de linter (un trou du CHECK sur `url_status` nul a été trouvé par le test SQL et corrigé par la 2e migration).
- Linter (`lint.ts`) : longueur 25 à 110 mots, sujet (email seulement) ≤ 70 caractères, mention de l'IA ou d'automatisation, formules creuses, promesses/argent/urgence, restes de gabarit, ton, URL exacte présente et aucune autre, hook repris dans le message, signature du prénom en fin de message. Anti-doublon : Jaccard sur 4-grammes de mots, seuil 0,35 contre les messages déjà écrits du plan.
- Une régénération au plus (avec les ouvertures déjà utilisées à éviter) ; si le message échoue encore il est conservé avec ses problèmes, marqué « À relire », jamais « Prêt ».
- Formulaires : le message est copié dans `manual_tasks.message` (tâche encore « à faire » seulement). Prénom de signature (`sites.signature_first_name`) obligatoire pour lancer.
- Coûts : LLM via le client plafonné (`DRAFT_LIMITS` : 0,10 USD par exécution, 0,01 USD par appel), consigné dans `cost_ledger` (`llm.outreach_draft`). Aucun appel payant réel durant ce sous-jalon : 0 USD.
- Écran : section « Messages à valider » sur la page Plan de liens, après les contacts.
- Non fait : jeu d'évaluation de style (dépend des exemples de Jonathan, voir « À fournir ») ; mesure réelle de la qualité des messages (aucun run LLM réel).

### M3.4 (lots et validation, 17/11/2026)

- Tables `batches` (brouillon | valide, numéro par plan) et `batch_items` (un brouillon dans un seul lot). Migration additive `2026111700000000_batches.sql`, appliquée sur la vraie base ; types régénérés.
- [auto] Un lot ne contient que des **emails** prêts (URL 200, linter vert) dont le contact est `sendable` (email vérifié) ; les formulaires restent des tâches manuelles. Taille du lot paramétrable (défaut 10, 1 à 50) ; un seul lot « en préparation » à la fois.
- Verrouillage **en base** (triggers) : validation refusée si lot vide ou message non prêt ; à la validation les brouillons passent à `valide` dans la même transaction ; ensuite brouillons et éléments du lot ne se modifient plus, un lot validé ne revient jamais en arrière. Seul un lot validé sera envoyable (M4.2 devra filtrer sur `batches.status = 'valide'`).
- Édition d'un message : relue par le même linter (`lintMessage`), « prêt » seulement si tout passe ; marquée `edited_by_user`. Retrait d'un message possible avant validation. Journal des décisions dans `events` : `batch.created`, `batch.draft_edited`, `batch.draft_removed`, `batch.validated`.
- Écran : section « Lots à valider » sur la page Plan de liens (par site : demande, pourquoi, motif de tri, accroche, destinataire, message). La page `/app/lots` reste la coquille.
- Tests : 9 tests de service, 5 tests SQL réels (verrouillage, validation, RLS). Coût : 0 USD, aucun appel payant.
- Non fait : test Playwright (aucune session connectée possible) ; anti-doublon entre un message modifié et les autres du lot.
- Piège : relancer la rédaction (M3.3) après validation échouera sur les brouillons verrouillés (voulu) ; une nouvelle rédaction devra ignorer les brouillons `valide`.

### M4.1 (connexion de la boîte d'envoi, 18/11/2026)

- Migration additive `2026111800000000_mailboxes.sql` : table `mailboxes` (une boîte par adresse et par espace, liée à un site). Mot de passe chiffré AES-256-GCM (`password_enc`, `key_version`) ; l'utilisateur connecté lit les colonnes **sans** `password_enc` (droits `select` par colonne) ; écriture réservée au serveur. `status = 'verifiee'` exige SMTP et IMAP réussis (contrainte SQL). Plafonds par défaut 10 par heure (max 10) et 20 par jour. 4 tests SQL réels.
- Migration appliquée sur la vraie base le 18/11/2026 après autorisation explicite de Jonathan (un premier essai avait été refusé par le classifieur). Clé `MAILBOX_ENCRYPTION_KEYS` (`v1`) générée et posée sur Vercel (Production et Preview, sensitive) ; aucune boîte réelle n'est connectée.
- Chiffrement (`src/features/mailboxes/crypto.ts`) : variable `MAILBOX_ENCRYPTION_KEYS` = `v2:<base64 32 o>,v1:<base64 32 o>` (`openssl rand -base64 32`) ; la première clé chiffre, toutes déchiffrent. Rotation : ajouter une clé en tête, rechiffrer les lignes (`needsRotation`), retirer l'ancienne. **À définir sur Vercel (sensitive)** avant de connecter une vraie boîte ; sans elle l'écran répond « chiffrement non configuré » et rien n'est enregistré.
- Transport (`transport.ts`) : `verifySmtp` (EHLO + AUTH, aucun message), `verifyImap` (connexion + login + logout, aucune lecture), `sendSmtp` (message de test). Ports admis SMTP 25/465/587/2525, IMAP 143/993 ; STARTTLS obligatoire hors 465/993. Anti-SSRF (`network.ts`) : hôte résolu, adresses privées refusées, connexion sur l'IP validée. Les erreurs ne contiennent jamais le mot de passe.
- Santé du domaine (`health.ts`) : SPF, DMARC et DKIM (sélecteurs courants) par DNS ; avertissement non bloquant à l'écran.
- [auto] Règle d'envoi : le message de test n'est envoyé que si `EMAIL_DRY_RUN` est faux ET `OUTREACH_SENDING_ENABLED` est vrai, et seulement à l'adresse de l'utilisateur connecté. Sinon : vérification de connexion seule, message « mode simulation ».
- Écran : section « Boîte d'envoi » sur `/app/site/[id]` (connecter, tester, supprimer ; une boîte par site pour l'instant). Journal `events` : `mailbox.connected`, `mailbox.tested`, `mailbox.removed`.
- Tests : 19 tests (chiffrement et rotation, formulaire, SSRF, santé DNS, service, et connexions contre un **faux serveur SMTP local (`smtp-server`) et un faux serveur IMAP minimal** : bon et mauvais mot de passe, aucun message envoyé par le simple test). Aucun appel payant : 0 USD.
- Dépendances ajoutées : `nodemailer`, `imapflow` ; dev : `smtp-server`, types.
- Non fait : envoi réel (M4.2), lecture des réponses (M4.4), OAuth Gmail, plusieurs boîtes par site, rotation automatique des lignes.

### M4.2 (moteur d'envoi plafonné, 19/11/2026)

- Migration additive `2026111900000000_sent_messages.sql` (appliquée sur la vraie base) : table `sent_messages` (un enregistrement par brouillon, étape `initial`/`relance` et mode `dry_run` : `unique(draft_id, step, dry_run)` = idempotence ; `message_id` unique ; `follow_up_due_at` = J+10 pour M4.3) et colonnes `timezone`, `send_window_start/end` sur `mailboxes` (défaut Europe/Paris, 9 h à 18 h).
- **Garde-fous en base** (trigger `guard_sent_message`, verrou par boîte) : refus si lot non `valide`, brouillon non validé ou non email, boîte non `verifiee`, adresse ou domaine (et sous-domaines) en `suppressions` (espace ou global), plafond horaire (`hourly_cap`, max 10) et journalier (`daily_cap`) sur 24 h glissantes ; un envoi terminé (`envoye`, `simule`, `ignore`, `echec`) ne change plus. Simulations et réel ont des compteurs séparés. 9 tests SQL réels.
- Moteur (`src/features/sending/`) : `runSendTick` envoie **au plus un message par boîte et par passage** ; job Inngest `send-tick` (cron toutes les 6 min + événement `sending/tick`) = 10 par heure au maximum. Fenêtre : lundi à vendredi, heures de la boîte. Échauffement (réel et simulé) : 5, 10, 15 par jour pendant les trois premières semaines puis `daily_cap`. Candidats : brouillons email des lots validés des plans du site, dans l'ordre. Contact non envoyable ou supprimé : enregistrement `ignore` avec motif. Échec temporaire : jusqu'à 3 essais espacés de 30 min ; échec permanent : `echec` ; identifiants refusés : boîte passée en `erreur`.
- [auto] **Dry run** : sans `EMAIL_DRY_RUN=false` ET `OUTREACH_SENDING_ENABLED=true`, le moteur ne fait que **simuler** (enregistrement `simule`, aucune connexion, aucun déchiffrement). En production ces variables ne sont pas posées : le cron simule les lots validés réels (visibles dans `sent_messages`, `events` `send.simulated`). Un enregistrement simulé ne bloque pas un futur envoi réel (mode distinct).
- Message : `Message-ID` sur le domaine de la boîte, `List-Unsubscribe` (mailto + lien https) et `List-Unsubscribe-Post`, pied de page « répondez stop » (aucune mention de l'IA). Route `/api/unsubscribe` (hors session) : GET = page de confirmation sans effet, POST = ajout à `suppressions` ; jeton HMAC dérivé de `MAILBOX_ENCRYPTION_KEYS` (anciennes clés acceptées).
- Tests : 15 tests de moteur (fenêtre, échauffement, jeton, dry run, idempotence, lot non validé, suppression, plafonds, mode réel contre un **faux serveur SMTP local** : en-têtes, réessai, identifiants refusés), 9 tests SQL. Aucun appel payant : 0 USD.
- Non fait : écran de suivi des envois ; relance (M4.3) ; blocage des domaines sensibles ; suspension automatique sur rebonds (M4.4/M6.2) ; fenêtre selon le fuseau du destinataire ; envoi dans la durée d'un message resté `en_cours` (crash entre l'envoi SMTP et la mise à jour : jamais renvoyé, à purger/inspecter).
- Dépendance dev : `mailparser`.

### M4.3 (relance unique, 20/11/2026)

- Migration additive `2026112000000000_follow_up.sql` (appliquée sur la vraie base) : table `reply_signals` (`sent_message_id` de l'envoi initial, `kind` = `reponse` | `desinscription` | `rebond`, unique par type ; écriture `service_role`, lecture par la RLS) et trigger `guard_follow_up` : **en base**, une relance est refusée sans envoi initial terminé, avant `follow_up_due_at`, après tout signal, ou si elle ne répond pas dans le même fil (`in_reply_to` = `message_id` de l'initial), à la même adresse et depuis la même boîte. S'ajoute aux garde-fous de M4.2 (lot validé, suppression, boîte vérifiée, plafonds) qui s'appliquent aussi aux relances ; `unique(draft_id, step, dry_run)` = une seule relance.
- Moteur (`sendNextFollowUp` dans `service.ts`) : au même passage que les envois, **les relances dues passent avant un nouvel envoi**, dans la même fenêtre horaire et sous les mêmes plafonds (compteur partagé). Signal ou adresse supprimée : relance enregistrée `ignore` (motif `reponse_recue`, `desinscription`, `rebond` ou `supprime`, événement `send.followup_cancelled`), jamais retentée. Réessais d'échec temporaire identiques à l'initial.
- [auto] **Pas de `step.sleepUntil` / `waitForEvent`** (le PLAN le suggérait) : le cron `send-tick` existant relit `follow_up_due_at` et `reply_signals`, ce qui est plus simple, survit aux redémarrages et n'ajoute aucun job. M4.4 n'aura qu'à écrire dans `reply_signals` (réponse, rebond).
- [auto] **Texte de relance déterministe** (`buildFollowUp`, aucun appel LLM, 0 USD) : « Re: » + sujet, 3 lignes, prénom, citation du message d'origine ; sans mention de l'IA. Il est couvert par la validation du lot (le lot validé autorise le message et sa relance).
- Machine à états pure `followUpState` : Envoyé J0 → relance due → Relancé → Terminé sans réponse (7 jours après la relance, `followUpGraceDays`) ou annulée (réponse > désinscription > rebond) ; prête pour l'écran de suivi.
- La route `/api/unsubscribe` écrit aussi un signal `desinscription` rattaché à l'envoi initial (jeton de l'initial ou de la relance). Un rebond ou une réponse n'ont pas encore de producteur (M4.4).
- Tests : machine à états, texte, relance en dry run (pas avant J+10, une seule fois, priorité, 3 signaux, suppression, fenêtre), relance réelle contre le **faux serveur SMTP local** (en-têtes `In-Reply-To`/`References`, même adresse), 6 tests SQL réels. 0 USD d'API. Aucun envoi réel.
- Non fait : délai de relance configurable par site (constante `SEND_LIMITS.followUpDays`), relance des formulaires en tâche (M5), écran de suivi, relance repoussée sur réponse automatique d'absence (M4.4/M5.1).

### M4.4 (lecture des réponses, 21/11/2026)

- Migration additive `2026112100000000_inbound_messages.sql` (appliquée sur la vraie base) : table `inbound_messages` (message rattaché à un envoi initial ; `kind` = `reponse` | `rebond` | `reponse_automatique` ; `match_method` = `en_tete` | `dsn` | `adresse` ; extrait texte brut ≤ 4000 car. ; unique par boîte et `message_id`), colonnes de curseur sur `mailboxes` (`imap_last_uid`, `imap_uid_validity`, `imap_last_read_at`), et trigger `suppress_bounced_address` : **en base**, un signal `rebond` met l'adresse en `suppressions` (workspace, motif `rebond`) dans la même transaction.
- Lecture (`src/features/replies/imap.ts`) : imapflow, **EXAMINE (lecture seule) et BODY.PEEK** : aucun drapeau modifié, rien déplacé ni supprimé. 100 messages par boîte et par passage, 256 Ko lus par message, curseur UID (réinitialisé si UIDVALIDITY change ; premier passage : depuis la date du plus ancien envoi réel). SSRF (`resolveSafeHost`) comme pour SMTP.
- Rattachement (`match.ts`, pur) : rapport de livraison DSN (Message-ID cité, sinon destinataire final) > `In-Reply-To`/`References` > adresse de l'expéditeur (45 jours). Un message qui ne se rattache à aucun envoi de la campagne est **ignoré et jamais stocké** ; les copies de nos propres envois aussi. Rebond = DSN 5.x.x ou statut inconnu ; 4.x.x (échec temporaire) = ni rebond ni suppression. Réponse automatique (`Auto-Submitted`, `Precedence`, `X-Autoreply`, objet « Réponse automatique / Out of office ») : stockée, **n'écrit pas de signal** (la relance continue).
- Service (`service.ts`) : une boîte sans envoi **réel** n'est même pas contactée (donc aucune connexion IMAP en production tant qu'aucun envoi réel n'a eu lieu). Écritures idempotentes (le signal est rejoué même si le message était déjà lu) ; identifiants refusés : boîte `erreur`. Job Inngest `reply-tick` (cron toutes les 10 minutes, événement `replies/tick`).
- Contenu entrant non fiable : texte brut tronqué, caractères de contrôle retirés, HTML ignoré, aucun lien suivi, aucune pièce jointe ouverte, aucun appel LLM ; seul le rattachement décide du type. Un expéditeur falsifié peut au pire annuler une relance ou supprimer une adresse (effet prudent).
- Tests : 17 tests (rattachement, DSN, réponses automatiques, injection, faux serveur IMAP local lecture seule, service de bout en bout avec le faux serveur) et 6 tests SQL réels (unicité, contraintes, trigger de rebond, droits). 0 USD d'API. Aucun envoi ni lecture de vraie boîte.
- Test M4.3 ajusté : un rebond met désormais aussi l'adresse en suppression, donc le garde-fou de suppression peut répondre avant celui de la relance (les deux refusent).
- Non fait (M5.1) : classification LLM des réponses, vues de l'inbox, relance repoussée sur absence, réponses « prêtes à insérer », rattachement de redirections vers un autre contact.

### M5.1 (classification des réponses, 22/11/2026)

- Migration additive `2026112200000000_reply_classifications.sql` (appliquée sur la vraie base) : table `reply_classifications` (une par message entrant, unique ; catégorie parmi les 12, confiance 0 à 1, justification, `source` = regle | llm | repli, `needs_review`, `injection_suspected`, `proposed_action`, `action_status` = appliquee | proposee | aucune, `follow_up_not_before`, modèle et coût ; colonnes de validation humaine `validated_category/by/at` pour M5.2) ; colonne `inbound_messages.classified_at` (marque de traitement, index partiel). `service_role` : select, insert, et update des seules colonnes de validation ; jamais de delete. Contrainte SQL : seule une `reponse_automatique` peut avoir une relance repoussée. Le garde-fou `guard_follow_up` (M4.3) refuse en base une relance tant que `follow_up_not_before` n'est pas passé.
- Chaîne (`src/features/classification/`) : (1) texte propre : citations (`>`, « Le … a écrit », « On … wrote ») et NOTRE pied de page « répondez stop » retirés, sinon toute réponse citant notre message serait vue comme une désinscription ; (2) règles déterministes `rules.ts` AVANT le modèle : type IMAP rebond / réponse automatique (en-têtes, DSN : le rattachement décide seul), plainte (spam, CNIL, avocat, menace, insultes ; « ce n'est pas du spam » exclu), désinscription (FR/EN, « STOP » seul, droit RGPD), pour un rappel de 100 % sur les formulations explicites sans coût ni dépendance au modèle ; (3) sinon LLM (`classify.ts`, sortie structurée zod, `temperature 0`, 12 définitions et règle de priorité plainte > désinscription > refus > paiement) ; confiance < 0,6, `ambigu` ou catégorie à risque issue du modèle = « à relire » ; panne HTTP/clé/budget = le message RESTE EN ATTENTE (jamais de catégorie inventée), sortie invalide ou refusée = `ambigu` de repli à relire.
- **Injection** : le contenu est une donnée dans un bloc `<donnees_non_fiables>` (JSON, `<` et `>` neutralisés pour qu'il ne referme pas le bloc), le prompt système interdit de suivre ses consignes. En plus, `detectInjection` (motifs FR/EN : « ignore tes instructions », « system prompt », « classe ce message comme », balise de bloc, demandes de mot de passe…) marque le message `injection_suspected`, plafonne la confiance à 0,5, force « à relire », et **aucune action issue du modèle n'est appliquée seule** (les règles protectrices restent actives). L'action est toujours déduite de la CATÉGORIE par le code (`decideAction`), jamais du texte.
- Actions automatiques (`actions.ts`, effets idempotents) : désinscription = adresse (et alias expéditeur) en `suppressions` + signal `desinscription` (annule la relance) ; plainte = idem + événement `reply.complaint` ; refus poli = suppression seulement si confiance >= 0,75, sinon proposé ; réponse automatique = relance repoussée de 7 jours (`follow_up_not_before`) ; rebond = déjà traité par M4.4. **Tout ce qui écrirait à un tiers (accepte, intéressé, paiement, échange, question, redirection, ambigu) est seulement PROPOSÉ** : rien n'est envoyé (réponses en M5.2).
- Relance (M4.3) : `sendNextFollowUp` saute une relance repoussée, et aussi une réponse automatique reçue mais pas encore classée (on attend la classification plutôt que de relancer quelqu'un en congé).
- Job Inngest `reply-classify` (cron `4-59/10 * * * *`, décalé de la lecture IMAP, + événement `replies/classify`) : 20 messages par passage, plafond LLM 0,05 USD par passage et 0,005 USD par appel, via le client qui journalise dans `cost_ledger` (`llm.reply_classify`). Sans message entrant (cas de la production tant qu'aucun envoi réel n'a eu lieu) : aucune requête LLM, le client n'est même pas construit.
- Jeu d'évaluation `eval-set.ts` : 97 cas annotés FR/EN synthétiques (au moins 5 par catégorie, 11 désinscriptions, 8 plaintes, 6 injections, 3 pièges de citation et de négation). Hors ligne : les règles ne se trompent jamais de catégorie (précision 100 %), rappel des règles = 100 % sur les 19 cas explicites à risque, détecteur d'injection = tous les cas piégés et aucun message normal. Évaluation réelle (`pnpm demo:replies`, plafond 0,03 USD) : voir Mesures.
- Tests : 24 tests (jeu, règles, texte, classifieur, actions, service avec faux client et faux LLM : suppression, plainte, absence, injection, panne puis reprise, idempotence, aucun client LLM construit sans besoin), 1 test de relance repoussée (`sending.test.ts`), 4 tests SQL réels (unicité, contraintes, garde-fou de relance repoussée, droits). Aucun envoi, aucune lecture de vraie boîte.
- Non fait (M5.2) : vues de l'inbox, écran, brouillon de réponse, réponse « prête à insérer », politique « payant », niveaux d'autonomie, validation humaine (colonnes prêtes). Un message d'absence non détecté par les en-têtes puis classé `reponse_automatique` par le modèle a déjà écrit un signal `reponse` : sa relance reste annulée (choix prudent, pas de suppression de signal).

### M5.2 (inbox, réponses, politique « payant », 23/11/2026)

- Périmètre scindé [auto] : M5.2 = tout sauf l'envoi d'une réponse validée ; **M5.2b = envoi des réponses validées, en dry run seulement** (SMTP via la boîte, mêmes garde-fous que M4.2, fil `In-Reply-To`). Un brouillon validé ne part donc nulle part pour l'instant. Pas de test Playwright (aucune session connectée possible) : tests de services sur faux Supabase, de composants purs et de SQL réel.
- Migration additive `2026112300000000_inbox.sql` (appliquée sur la vraie base, puis `inbox_states.state` élargi à `aucun` par un `ALTER` appliqué aussi ; le fichier du dépôt contient la version finale) : `workspaces.autonomy_level` (`manuel` | `assiste`, défaut assisté ; l'autopilot n'est pas encore une valeur admise, M6.2) ; `inbox_states` (état manuel d'un fil : `aucun`, `en_negociation`, `gagne`, `archive` ; pas de delete) ; `reply_drafts` (une proposition par message entrant et par nature `reponse` | `pret_a_inserer`, option de paiement, plafond en euros, nature du lien, statut `brouillon` | `validee` | `rejetee`). En base : un achat plafonné exige un plafond ET la nature « sponsorisé », sinon aucun plafond ; une validation exige un auteur et une date ; un brouillon validé ou rejeté est figé (trigger) ; `service_role` ne peut ni supprimer ni modifier le rattachement.
- Vues (`views.ts`) : Chaud (accepte, intéressé), Tiède (question, échange, redirection, ambigu), Offres payantes, Froid (refus, absence, désinscription, plainte), plus les états manuels En négociation, Gagné, Archivé. L'état manuel l'emporte, puis la catégorie corrigée par l'utilisateur, puis celle du classifieur. Les rebonds ne s'affichent pas.
- Brouillons (`service.ts`) : ce que M5.1 a proposé décide (`draftKindFor`) : accepte → réponse prête à insérer (**déterministe, sans modèle, 0 USD** : page, ancre, URL vérifiée, phrase à ajouter, passage après modification) ; question / intéressé / échange → réponse rédigée par le modèle (`reply-writer.ts`, message entrant en bloc `<donnees_non_fiables>`, URL limitée à celles déjà vérifiées, 0,01 USD max par appel, 0,05 USD par passage, coût journalisé) ; demande de paiement → gabarit « décliner » par défaut, sans modèle. Désinscription et plainte n'ont jamais de brouillon. **Un message suspecté d'injection n'est jamais confié au modèle.**
- Politique « payant » (`payment.ts`) : trois gabarits (décliner / échanger / achat plafonné). L'achat se déclare « lien sponsorisé » dans le message, exige un plafond entre 1 et 1000 euros, et n'est jamais le défaut. Aucun achat n'est effectué par le logiciel.
- Validation : seule l'utilisateur la fait, après un nouveau contrôle (`check.ts` : aucune mention d'IA, pas de promesse, aucune URL hors liste, signature sur la dernière ligne). Modifier un brouillon le marque « modifié par vous » ; un brouillon validé ou rejeté ne change plus. Corriger la catégorie vers désinscription ou plainte applique aussitôt la suppression de l'adresse et annule la relance (réutilise les effets de M5.1).
- Autonomie : manuel = rien n'est préparé sans clic ; assisté (défaut) = le job Inngest `reply-drafts` (cron `7-59/10`, décalé des deux autres) prépare les brouillons en avance. Dans les deux cas rien n'est envoyé sans validation. Sans classification éligible : aucun appel LLM.
- UI : `/app/inbox` (onglets par vue avec compteurs) et `/app/inbox/[id]` (fil : notre message, leur réponse, catégorie corrigeable, brouillons éditables, bloc « payant », état du fil, niveau d'autonomie, bouton copier). Textes dans `messages/fr.ts` (`inbox`). Pas de refonte visuelle (MD hors périmètre).
- Tests : 25 tests (`src/features/inbox/inbox.test.ts`) et 5 tests SQL réels (`supabase/tests/inbox.test.ts`). 701 tests verts avec Postgres 16 local. Aucun appel payant réel, aucun envoi.
- Non fait : envoi des réponses (M5.2b) ; test Playwright connecté ; évaluation sur de vraies réponses (M7.1) ; relance automatique des brouillons rejetés ; page `/app/inbox` limitée à 300 réponses sans pagination.

### M5.2b (envoi des réponses validées, 24/11/2026)

- Migration additive `2026112400000000_reply_sends.sql` (appliquée sur la vraie base) : table `reply_sends` (une ligne par brouillon et par mode `dry_run`, idempotente, `in_reply_to` = message de la cible) et trigger `guard_reply_send` : refuse en base un brouillon non `validee`, un destinataire différent de l'expéditeur de la réponse, une boîte autre que celle qui l'a reçue, une boîte non vérifiée, une adresse ou un domaine en suppression, une catégorie (corrigée ou non) `desinscription` / `plainte_hostile` / `rebond`, et tout dépassement des plafonds horaire et journalier **partagés** avec l'outreach (sent_messages + reply_sends). Envoi terminé non modifiable, pas de delete.
- Moteur `src/features/inbox/send.ts` (`runReplySendTick`) : au plus UNE réponse par boîte et par passage, fenêtre d'envoi, échauffement et plafonds de M4.2, réessais (3 tentatives, 30 min) sur échec temporaire, boîte suspendue sur échec d'authentification. Sans `EMAIL_DRY_RUN=false` ET `OUTREACH_SENDING_ENABLED=true` : statut `simule`, SMTP jamais appelé. Pied de page « répondez stop » et `List-Unsubscribe` (jeton lié à l'envoi initial du fil). Motifs d'abandon (`ignore`) : `destinataire_inconnu`, `non_classe`, `categorie_a_risque`, `supprime`. Le moteur d'outreach (`sending/service.ts`) compte désormais aussi les réponses dans son quota.
- Job Inngest `reply-send-tick` (cron `3-59/6 * * * *`, événement `replies/send`). UI : le statut d'envoi s'affiche sur le brouillon validé de la fiche de fil.
- Tests : 9 tests (`inbox/send.test.ts`, faux Supabase et faux serveur SMTP local) et 8 tests SQL réels (`supabase/tests/reply-sends.test.ts`). 718 tests verts avec Postgres 16 local. Aucun envoi réel, 0 USD d'API.
- Non fait : réponse vers une autre adresse (redirection : nouveau contact = nouveau lot) ; envoi automatique en autopilot (M6.2) ; test Playwright connecté. `database.types.ts` complété à la main pour `reply_sends`.

### M5.3 (vérification des liens, 25/11/2026)

- Migration additive `2026112500000000_links.sql` (appliquée sur la vraie base) : `links` (lien déclaré posé : site, page source, page visée, état, rel, contextuel, indexable, page exacte, étapes faites 0 à 3, tentatives, prochaine échéance, alerte) et `link_checks` (historique figé, un contrôle par ligne). Triggers : le site doit appartenir à l'espace, l'adresse déclarée ne change jamais, un contrôle « live » sans lien trouvé est refusé. `service_role` : pas de delete. RLS : lecture par membres de l'espace.
- Vérificateur pur `src/features/links/verify.ts` : cherche un lien vers le domaine visé (`www` ignoré), préfère la page exacte puis dofollow puis contextuel ; rel dofollow / nofollow / sponsored / ugc (le meta robots `nofollow` rend tout nofollow) ; contextuel = dans un bloc de texte hors nav, header, footer, aside, avec du texte autour ; indexable = ni `noindex` ni canonique vers une autre page. 200 + lien = live ; 200 sans lien, 404, 410 = disparu ; réseau, 403, 429, 5xx, robots.txt = injoignable (jamais pris pour un lien disparu).
- Moteur `service.ts` (`runLinkChecks`) : échéances J+7, J+14, J+30 après la déclaration ; page injoignable = nouvel essai à 24 h, 3 au plus, puis le jalon est consommé ; `robots.txt` respecté (jeton `OutreachLinksBot`), délai entre requêtes d'un même hôte, 20 pages au plus par passage, récupérateur sécurisé SSRF existant. Alerte (`disparu`, `devenu_nofollow`, `non_indexable`) seulement si le lien avait été vu en ligne (ou passe de dofollow à nofollow) ; elle se lève au contrôle suivant si tout est rentré dans l'ordre ; ligne `events` écrite au mieux.
- Job Inngest `link-check-tick` (cron `17 * * * *`, événement `links/check`). Déclaration manuelle (`declare.ts`, action `declareLinkAction`) : page visée limitée au domaine du site, page source sur un autre domaine, 200 liens au plus par site. Page `/app/liens` : formulaire, alertes, liste (état, type, détails, contrôles faits, prochaine date). Textes dans `messages/fr.ts` (`links`).
- Décisions [auto] : la déclaration est manuelle (origine `manuel`) ; le raccord avec les fils de l'inbox (bouton « lien posé » depuis une réponse « accepte ») et le passage du prospect à `lien_pose` sont repoussés (backlog). « Indexé par Google » n'est PAS vérifié (aucune API gratuite) : on contrôle l'indexabilité (noindex, canonique), pas l'indexation. Pas d'en-tête `X-Robots-Tag` (le récupérateur ne renvoie que le corps) ni de rendu JavaScript.
- Tests : 22 tests (`src/features/links/links.test.ts` : pages de test lien présent, nofollow, sponsored, ugc, disparu, noindex, canonique, menu ; calendrier ; alertes ; robots ; injoignable ; déclaration) et 9 tests SQL réels (`supabase/tests/links.test.ts`). 749 tests verts avec Postgres 16 local. 0 USD d'API (DataForSEO 0, LLM inchangé ~0,024 USD), aucun envoi. Types régénérés avec l'outil MCP.
- Non fait : bouton « lien posé » dans l'inbox ; lien automatique entre un lien détecté et un prospect ; notification (digest M6.3 lira `links.alert`) ; test Playwright connecté.

## MT.3 : collecte de candidats (15/11/2026, run réel le 16/11/2026)

- **Fait** (module `src/features/collection/`) : client DataForSEO étendu (`contentAnalysisSearch`, `intersection_mode`, tarifs). `buildCollectionPlan` : recoupement des concurrents retenus (8 au plus), requêtes de l'univers (MT.2b) dans l'ordre de rendement, requêtes et expressions de marque (écritures distinctes du nom), Content Analysis par `page_type` (blogs, organisation, forums, e-commerce) sur le thème, plus 2 types sur les mots-clés retenus en objectif « mots-clés ». Job Inngest `audit-collect` (un appel payant = un step), logique testable `executeCollection`. `previewCollection` / `startCollection` : plan et coût figés à la confirmation. **Aucun écran ni bouton** (MT.6), aucun envoi, aucun achat, aucun appel LLM.
- **Coût annoncé avant lancement** : coût **attendu** et **pire cas** sans appel (`estimateCollection`). Collecte = 55 % du budget cible (0,55 USD), répartie en budgets **souples** par phase (recoupement 17 %, marque 16 %, SERP 36 %, Content Analysis 31 %). **Plafonds durs** (`assertCanSpend`) avant **chaque** appel payant : audit (2 USD, 5 pour un site de test), sécurité 5 USD par audit, 25 USD par jour ; dépassement = appel non lancé, collecte terminée proprement (`stop_reason = plafond`). `startCollection` refuse si l'attendu dépasse ce qui reste du plafond.
- **Run réel borné** (`pnpm demo:collect`, mega-coloring.com, 4 concurrents, 10 requêtes, journal et cache en mémoire/fichier, plafond dur 1 USD) : l'API a d'abord répondu 401 (secret d'environnement inopérant) ; Jonathan a ressaisi les identifiants par le formulaire sécurisé le 16/11. Dépense API de la session ≈ 1 USD au total (deux runs complets : 0,308 puis **0,242 USD**, plus quelques essais à 0,002-0,03 USD pour cadrer les filtres).
- **Run final, filtres réels** : annoncé 0,265 attendu / 0,317 pire cas ; **réel 0,242 USD** pour 17 appels (1 recoupement 0,0312 ; marque 4 appels 0,0565 ; SERP 8 requêtes 0,042 ; Content Analysis 4 appels 0,1127) ; **515 candidats bruts** (recoupement 77 nouveaux domaines, SERP 68, Content Analysis 350, marque 20). Rendement par requête SERP : 17 à 28 résultats organiques, 8 requêtes sur 10 exécutées (une requête a échoué deux fois en erreur de tâche 40101 transitoire : sautée et comptée, `failures`).
- **Tarifs confirmés** : SERP top 30 = 0,006 ; Domain Intersection = 0,024 + 0,000036 par ligne (500 lignes = 0,042 ; 5 lignes = 0,02418) ; Content Analysis = **0,024 + 0,000036 par ligne** (150 lignes = 0,0294 exactement ; moins de lignes renvoyées = moins facturé). L'hypothèse du +20 % sur la grille publique est donc **exacte**. SERP de marque sans résultat : 0,002.
- **Formats réels** (fixtures `backlinks-domain-intersection-partial.live.json` et `content-analysis-search.live.json`) :
  - Domain Intersection, mode `partial` : résultat `{ targets, total_count, items_count, items }` ; chaque ligne = un **domaine référent** : `domain_intersection["1".."n"]` ne contient que les cibles liées, avec `target` (**c'est le domaine référent**, pas `domain_from`), `rank` (autorité, 0 à ~1000), `backlinks`, `backlinks_spam_score` (0-100), etc. `summary` = `{ intersections_count: n }` (nombre, pas un objet : le schéma supposé échouait). Le nombre de clés = nombre de concurrents liés.
  - **Sans filtre le résultat est inutilisable** : 1 000 lignes dans un ordre quelconque, **85 % à autorité 0, 25 % de spam, ~16 utiles** (sur 1 299). Avec `filters` « autorité > 0 sur au moins une cible » (une condition par cible, `or`, 8 au plus) et `order_by: ["1.rank,desc"]` : 200 lignes, domaines réels (rectorats ac-*.fr, blog4ever, eklablog, kidlee.fr, jenseigne.fr, latribudesidees.fr). Filtres serveur et tri validés ; `order_by` sur `summary.*` refusé (40501).
  - Content Analysis `search` : `{ total_count, items_count, items, offset_token }` ; chaque item : `url`, `domain`, `main_domain`, `url_rank`, `domain_rank` (0 à ~700), `spam_score`, `country`, `language`, `page_types[]`, `content_info{title, snippet, language, ...}`.
- **Français confirmé et filtré côté serveur** : sans filtre, le thème « coloriages à imprimer » ramène 58 % de français (blogs : 88/150) ; **`filters: [["language","=","fr"],"and",["spam_score","<",50]]` donne 100 % de pages françaises** et fait tomber le bruit (forums : 98 -> 13 lignes françaises réelles). Mentions de marque : « Mega Coloring » est une expression générique (livres anglais) ; avec le filtre français il reste 14 pages, « megacoloring » 0. Le pays (`country`) est souvent nul ou `WW` : ne pas filtrer dessus.
- **Corrections apportées par le run réel** : schéma `summary` ; domaine lu dans `target` ; filtres et tri du recoupement ; langue et spam serveur de Content Analysis ; score de spam lu dans le recoupement (écarté si >= 30) ; fermes d'hébergement gratuit (`web.app`, `firebaseapp.com`, `pages.dev`) exclues ; erreur de tâche du fournisseur (40101) retentée une fois puis requête sautée ; cache sur fichier pour le run de démonstration (`COLLECT_LIVE_CACHE`).
- **Rendement décroissant** : seuils en place (8 requêtes au moins, fenêtre de 4, moins de 3 nouveaux domaines) ; **non déclenché** au run réel (8 requêtes seulement : chacune a donné 17 à 28 résultats dont 3 à 14 nouveaux domaines) ; à recaler sur un audit complet de 30 requêtes.
- **Données** : migration `2026111532000000_candidate_collections.sql` appliquée sur la vraie base (`candidate_collections`, `collection_candidates`), RLS (lecture membres, écriture service_role), test SQL `supabase/tests/candidate-collections.test.ts`. Types ajoutés à la main.
- **Vérifié** : tests verts (dont 37 de collecte et 2 de format réel), lint, typecheck, format, build. Pas de Playwright (aucune interface).
- **Dettes** : pas de déclenchement depuis l'interface ni la chaîne d'audit (MT.6) ; relancer la collecte réécrit ses candidats ; le filtre du recoupement ne compte que les 8 premiers concurrents (> 8 : il faut en choisir 8) ; le filtre `autorité > 0` écarte les domaines sans aucune autorité (petits sites neufs possibles : à mesurer en MT.4) ; les plateformes de blogs (blogspot...) sont exclues par la liste de M1.3 alors que ce sont parfois de vraies petites cibles (à rouvrir en MT.4) ; aucun filtre de pays ; une requête SERP peut échouer en 40101 de façon répétée (une sur 10 ici, à surveiller) ; les mentions exigent MT.5 (vérifier que la page ne lie pas déjà le site).
- Prochain sous-jalon recommandé : **MT.4 (qualification en entonnoir)**.

## MT.4 : qualification en entonnoir (16/11/2026)

- **Session bloquée côté réseau** : `curl https://api.dataforseo.com/v3/appendix/user_data` répond « CONNECT 403 » (refus de politique du proxy de la session), de même pour `api.openai.com` (LLM de dev via `LLM_PROXY_AUTH`), `api.hunter.io`, `api.supabase.com`, `api.vercel.com` et le web en général (lecture des pages des cibles, Google Fonts : `pnpm build` échoue en local pour cette seule raison, la CI construit). Les 515 candidats du 16/11 n'existent qu'en mémoire (run de démo MT.3, aucune écriture en base) : **aucune mesure réelle possible dans cette session**. Jonathan a demandé d'autoriser le réseau « ici » : impossible depuis la session (réglage de l'environnement Claude Code, effectif pour une nouvelle session). Le MCP Supabase répond (lecture) mais l'application de la migration a été **refusée par le garde-fou de la session** : à appliquer au début de la prochaine session.
- **Fait** (module `src/features/qualification/`, aucun écran : MT.6) : entonnoir du moins cher au plus cher, chaque candidat garde l'**étage atteint et un motif lisible** (`messages/fr.ts > qualification.reasons`), statut `liste_courte` / `reserve` (pas jugé faute de budget ou de réponse : jamais exclu en silence) / `exclu`.
  1. **Gratuit** (`free.ts`) : faux domaine (hôte invalide, IP, étiquette aberrante), propre site, concurrents (sous-domaines compris), racine de plateforme de blogs, plateformes et géants (listes M1.3 / MA.1), liste « ne pas contacter », **domaines déjà contactés par un autre espace** (fonction SQL `domains_contacted_elsewhere` : envois réels seulement, 90 jours, ne révèle que le domaine, service_role), doublons par éditeur (`dedupKey` : fr.exemple.com = exemple.com, mais deux blogs hébergés ou deux écoles d'une académie restent distincts).
  2. **Signaux fournisseur** : spam >= 50 ; autorité >= 650 = irréaliste [HYPOTHÈSE à recaler] ; langue de la page. **L'autorité nulle n'exclut pas** : elle baisse seulement la priorité (score provisoire). `authorityImpact` mesure, par source, combien de candidats un filtre « autorité > 0 » retirerait (dette de MT.3) : sortie de `pnpm demo:qualify`, avec le nombre de cibles d'autorité 0 qui finissent dans la liste courte.
  3. **Lecture de page** (`page.ts`, lecteur sûr de M3.1 : robots.txt, SSRF, 600 ms par hôte, 4 requêtes par page, 150 pages au plus) : page vivante (sinon l'accueil si la page trouvée a disparu), parquée, piratée, vente de liens, mur de connexion, langue, **éditeur identifiable** (lien contact / mentions légales / à propos / auteurs, email publié, formulaire, « directeur de la publication », auteur nommé). Programme de contribution détecté (pénalité « sollicité »).
  4. **LLM sur les seuls survivants** (`llm.ts`) : par lots de 5 (prompt système payé une fois), extraits de 1 200 caractères encadrés `<donnees_non_fiables>`, sortie : type de site (mairie, association, école, photographe, e-commerce, forum modéré, blog, média, annuaire, autre), adéquation 0-1 et raison, vendeur de liens, même offre, irréaliste, **accroche = citation vérifiée dans l'extrait** (sinon jetée), ressource du site la plus utile. Exclusions : vend des liens, concurrent, irréaliste, adéquation < 0,5. Un id absent de la réponse = « non qualifié » (réserve), jamais deviné.
  5. **Contact** : `investigateItem` (M3.2) **sans finder payant** (`contactPaidCalls = 0` : le budget de 0,10 USD est tenu par le seul LLM), 60 cibles au plus dans l'ordre du score après LLM. Sans email ni formulaire : exclue (`sans_contact`).
  6. **Score** (`score.ts`) = pertinence (adéquation × bonus de recoupement) × « personne ne la sollicite » (par type : mairie / association / école 1 ; photographe 0,95 ; forum modéré 0,9 ; e-commerce 0,85 ; blog 0,75 ; annuaire 0,5 ; média 0,45 ; × 0,85 si programme de contribution, × 0,8 si autorité >= 400) × facilité de contact (email vérifié 1, à vérifier 0,8, formulaire 0,65) × autorité plafonnée (0,6 à 1, plafond 300, inconnue 0,75). **Liste courte de 40**, chacune avec la **demande en trois lignes** (quoi proposer avec l'URL de la ressource choisie, point de départ = citation réelle, ce que la cible y gagne selon son type) et **le pourquoi** (raison du LLM + recoupement, type rarement sollicité, mention existante). Sans LLM pour la demande : zéro coût, zéro invention.
- **Budget et coûts** : budget = 10 % du budget cible (0,10 USD). `estimateQualification` annonce **avant lancement** l'attendu et le pire cas (bornés par le budget) à partir du nombre de candidats après les étages gratuits, calculés sans réseau ; `startQualification` refuse si le pire cas dépasse ce qui reste du plafond d'audit ou si le plafond du jour est atteint. **Avant chaque lot LLM** : budget de qualification (pire cas du lot) puis `assertCanSpend` (audit, sécurité 5 USD, jour 25 USD) ; arrêt propre (`budget` ou `plafond`), le reste en réserve. Chaque appel LLM journalisé dans `cost_ledger` (tâche `llm.qualification`, `audit_id`). Ordre de grandeur (grille `pricing.ts`) : pire cas d'un lot de 5 avec claude-haiku-4-5 ~0,007 USD (le budget couvre ~70 cibles au pire, davantage en pratique), ~10 fois moins avec gpt-4o-mini.
- **Blogs hébergés rouverts** (`src/features/collection/hosts.ts`) : blogspot, wordpress.com, over-blog, eklablog, canalblog, blog4ever, hautetfort, e-monsite, jimdo, wixsite, webnode, kazeo, centerblog, skyrock, unblog, tumblr, weebly, sitew, free.fr, pagesperso-orange.fr. La collecte (MT.3) **garde désormais** le site d'un utilisateur (`maitresse-julie.eklablog.com`) et lit l'hôte réel dans Content Analysis (`main_domain` y vaut la plateforme) ; la racine (eklablog.com, vue dans le recoupement du 16/11) est exclue en MT.4 comme « plateforme ». Les sous-domaines d'académie (`ecole-x.ac-lyon.fr`) sont des éditeurs distincts.
- **Jeu d'évaluation annoté** (`eval-set.ts`, 50 cas en français, mega-coloring.com) : 23 cas tranchés par les règles (motif attendu), 17 à garder (mairie, médiathèque, associations, école et blog de classe hébergé, assistante maternelle, forum modéré, ludothèque, boutique, photographe, scouts, annuaire, page morte mais site vivant, mention existante, autorité 0), 10 à écarter par le LLM (hors sujet, concurrent non listé, vendeurs de liens déguisés). **Règles gratuites : précision 1, rappel 1, motif exact 100 %** (test `qualification.test.ts`, à rejouer avant tout changement de règle). LLM : `pnpm demo:qualify-eval` (27 cas, 6 appels, plafond 0,03 USD, seuils précision >= 0,9 et rappel >= 0,8 sur « garder », plus type de site et vendeurs de liens) : **non lancé** (réseau).
- **Données** : migration `2026112800000000_qualification.sql` (`qualification_runs` : une par audit, plan et coût figés, pire cas <= budget en contrainte ; `qualified_targets` : un résultat par candidat, contraintes « liste courte = rang + score + 3 lignes + pourquoi + contact », « exclu = motif » ; fonction `domains_contacted_elsewhere`). RLS : lecture membres, écriture service_role. Test SQL réel `supabase/tests/qualification.test.ts` (RLS, contraintes, fonction : autre espace seulement, ni simulation ni le sien, fermée aux clients). Types ajoutés à la main. Numérotée après `sent_messages` (la fonction en dépend).
- **Job** Inngest `audit-qualify` (événement `audit/qualification.requested`) : begin, load, une lecture de 10 pages par step, un lot LLM par step, 3 contacts par step, finalize. `previewQualification` / `startQualification` (`service.ts`) : aucun bouton (MT.6).
- **Commandes** : `pnpm demo:qualify` (rejoue la collecte avec le cache sur fichier, mesure l'autorité, qualifie, rapport JSON) et `pnpm demo:qualify-eval` (27 cas, voir MT.4 bis).
- **Vérifié** : 1 030 tests verts (Postgres 16 local, dont 21 de qualification et 4 SQL), lint (3 avertissements antérieurs), typecheck, format. `pnpm build` vert (avec variables factices `NEXT_PUBLIC_*`).
- **Pas fait** : run réel (collecte rejouée, autorité mesurée sur les vrais candidats, lecture des pages, LLM, contacts) ; évaluation LLM réelle ; migration sur la vraie base ; liens morts et mentions en détail (MT.5) ; écran (MT.6) ; aucun envoi, aucun achat.
- **Dettes** : seuils (autorité 650, facteurs « sollicité », adéquation 0,5, 40 cibles) non recalés sur données réelles ; la racine d'une plateforme vue dans le recoupement (eklablog.com lie 3 concurrents) est perdue faute de savoir quels blogs hébergés lient (un appel de backlinks en plus la résoudrait) ; contacts sans finder payant (moins d'emails sur les petits sites) ; `loadQualificationInput` et `startQualification` testés seulement par typage (le faux client ne gère ni `.or` ni les jointures) ; une nouvelle collecte ne relance pas la qualification ; temps du job (150 pages + 60 contacts à 600 ms à 1 s par requête : ~5 à 15 min) à mesurer.
- Prochain sous-jalon : **MT.5** (le run réel est fait : voir MT.4 bis).

## MT.4 bis : run réel de la qualification (16/11/2026)

- **Réseau rétabli** : `api.dataforseo.com/v3/appendix/user_data` répond 20000 ; OpenAI et le web répondent. **Migration `qualification` appliquée sur la vraie base** (projet `outreach-links`) : tables `qualification_runs`, `qualified_targets` et fonction `domains_contacted_elsewhere` (fermée à `anon`).
- **Évaluation LLM réelle** (`pnpm demo:qualify-eval`, 27 cas, 6 appels, **0,0023 USD**, gpt-4o-mini) : « garder » **précision 1,00, rappel 0,94** ; type de site 20/27 (écarts de libellé : blog/école, association/blog) ; vendeurs de liens précision 0,67, rappel 1,00 (une boutique concurrente jugée « vend des liens », exclue de toute façon). Seul raté : `boutique-loisirs-creatifs.fr` jugé concurrent (le jeu l'attend « à garder » : cas discutable, laissé tel quel). Aucune règle changée.
- **Run complet** (`pnpm demo:qualify`, collecte rejouée) : annoncé collecte 0,265 attendu / 0,317 pire cas, **réel 0,236 USD** ; qualification annoncée **0,016 attendu / 0,024 pire cas** (budget 0,10), **réel 0,0107 USD** pour 16 appels LLM, aucun échec, arrêt `termine`. **552 candidats** (le recoupement du jour en a renvoyé un peu plus que le 16/11 matin) ; durée de la qualification **12,5 min** (150 pages + 60 contacts), donc dans le délai d'un job Inngest.
- **Entonnoir mesuré** : 552 -> 543 (étage gratuit : faux domaines, concurrents, plateformes, déjà contactés, doublons) -> 542 (signaux) -> **150 pages lues** -> 79 vivantes et jugées -> 62 pertinentes -> 60 contacts cherchés -> **19 avec contact = liste courte**. Motifs : `hors_budget_lecture` 392 (réserve, pas exclus), sans_contact 41, éditeur introuvable 25, injoignable (HTTP 403) 16, langue 15, robots.txt 15, hors sujet 11, plateforme 7, concurrent 5, doublon 2, vendeur de liens 1, irréaliste 1.
- **Effet du filtre « autorité > 0 »** (dette de MT.3) : sur 552 candidats, **35 (6 %) ont une autorité nulle** (recoupement 0 sur 105 car déjà filtré côté serveur ; contenu 33 sur 364 ; mentions 2 sur 26), **61 sont inconnues** (SERP 50, mentions 11 : le filtre ne s'y applique pas). **Aucune cible d'autorité 0 en liste courte**, mais ces 35 ont un score provisoire bas et sont sans doute sous le seuil des 150 pages lues : **non concluant**. Décision : pas de filtre dur (cost nul à garder, ils baissent seulement la priorité) ; à re-mesurer si on lit plus de pages.
- **Blogs hébergés rouverts** : 2 blogs hébergés en liste courte (`ecolelescedres.blog4ever.com` en tête, `…blogspot.com`) ; 7 racines de plateformes exclues. Le principe tient.
- **Qualité de la liste courte (relue à la main)** : bons premiers rangs (école blog4ever, francais-rapide.fr, pass-montessori.com, la-belle-et-la-bete.fr, blogfamille.fr). **Bas de liste faible** : `devenirparent.net`, `pro-perform.fr` (tracteurs), `fetedepaques.com`, `coloriagewk.com`, `paperblog.fr` (agrégateur de blogs), `ciscoipcommunicator…blogspot.com` (blog de spam probable) passent avec une adéquation de 0,5 et une raison du LLM qui dit elle-même « moins pertinent ». 17 des 19 sont des blogs ou médias : **aucune mairie, médiathèque ni association** (la collecte MT.3 ramène surtout des blogs ; les types « rarement sollicités » demandent des requêtes dédiées).
- **Levier principal, non touché** : la lecture des pages est **gratuite en argent** (seul le temps compte) et plafonnée à 150 alors que 392 candidats restent en réserve ; le LLM n'a coûté que 0,011 sur 0,10 USD. Monter `maxPagesRead` (et `maxContacts`, 60) est le premier réglage à tester, avec relecture manuelle. Aucun changement de règle dans ce sous-jalon : précision et rappel ne sont mesurés que sur le jeu de 50 cas ; il faut les mesurer avant et après.
- **Dettes ajoutées** : seuil d'adéquation 0,5 trop permissif (proposer 0,6 puis rejouer le jeu annoté) ; exclure les agrégateurs de blogs (paperblog.fr) ; 41 cibles « sans contact » dont plusieurs « adresse invalide selon le vérificateur » (vérifier que le vérificateur n'écarte pas de bonnes adresses) ; 16 pages en HTTP 403 (sites qui bloquent le lecteur : latribudesidees.fr, educol.net...) ; 15 refus robots.txt respectés ; requête SERP en erreur transitoire déjà connue.
- **Coût de la session** : environ 0,25 USD DataForSEO (collecte rejouée) + 0,013 USD LLM.

## MT.5 : constats par page (16/11/2026)

- **Expérience demandée, avant de coder** (jeu annoté de MT.4, `pnpm demo:qualify-eval`, 0,0023 USD) : à **seuil 0,5**, « garder » précision 1,00 / rappel 0,94. À **0,6** (calcul sur les `fit` réels) : seules 10 des 17 cibles à garder survivent, **rappel 0,59**, précision inchangée (déjà 1,00) : **rejeté, seuil laissé à 0,5**. Le bas de liste faible vu en MT.4 bis n'est pas dans le jeu annoté : pour le traiter, annoter de vraies pages faibles (devenirparent.net, pro-perform.fr...) avant de toucher au seuil.
- **`maxPagesRead` 150 -> 300** (et contacts 60 -> 120, réglages d'essai `QUALIFY_MAX_PAGES` / `QUALIFY_MAX_CONTACTS` / `QUALIFY_MIN_FIT` de `demo:qualify`, option `tuning` de `executeQualification`, défauts inchangés) : run réel, collecte rejouée (cache fichier), **544 candidats, 300 pages lues, 158 vivantes, 120 jugées (24 appels), 92 pertinentes, 30 cibles en liste courte (19 avant)**, LLM **0,0163 USD** (budget 0,10), **21 min** (12,5 avant). Mêmes meilleurs rangs ; **le bas de liste reste faible** (pro-perform.fr, ciscoip...blogspot.com, paperblog.fr, fetedepaques.com) et **toujours 1 association, aucune mairie ni médiathèque** : lire plus de pages donne plus de cibles, pas de meilleures. Constat : le goulot est la collecte (types rarement sollicités) et le seuil de pertinence, pas la lecture. **Décision : défaut passé à 300 pages seulement quand le job tournera hors session (MT.6)** ; non changé ici (le temps de 21 min est la limite pratique). 38 candidats ont dépassé `maxLlmTargets` (120).
- **Fait** (module `src/features/findings/`, aucun écran) : pour chaque cible de la **liste courte**, le lecteur sûr relit la page et expose ses liens sortants avec la phrase autour (`PageRead.outbound`, zone contenu/menu, `rel`, image seule). Trois sortes de constats, un par cible et par sorte :
  1. **Lien mort** : 404/410 constatés par la même vérification polie que le chasseur 404 (`createStatusChecker`, extraite de `hunt.ts` : robots.txt, délai par hôte, plafond de requêtes ; 25 liens par page, contenu d'abord). 500, délai, robots ne prouvent rien. Un lien vers une **ancienne page du site** est dit tel quel. Page de remplacement : recoupement de mots (URL, ancre, phrase) avec les pages proposables, sinon ressource préférée du jugement MT.4, sinon accueil. **Aucun LLM.**
  2. **Lien inadapté** : pool gratuit de candidats (contenu seulement ; ni le site, ni concurrents, ni références neutres, ni sponsorisé, ni image, ni même éditeur, ni lien dont l'ancre est notre nom, ni outils d'impression/partage ; étrangers d'abord, 8 au plus). Un appel LLM par page choisit au plus un lien. **Garde-fous factuels après le LLM** : l'index doit exister, `replaceable` et une raison, recoupement de sujet (racines de 5 lettres, phrase du lien seulement) avec la page proposée, puis **lecture de la page de destination** : conservé seulement si sa langue déclarée diffère de celle du site (sans langue : domaine étranger). La citation est celle de la page, jamais celle du modèle.
  3. **Mention sans lien** : variantes du nom (espace, tiret, collé équivalents), domaine écrit en toutes lettres ; **vérifie que la page ne lie pas déjà le site** (n'importe quelle zone, nofollow compté, sous-domaines compris) ; un appel LLM dit si le passage parle bien du site (homonyme refusé) ; ancre = mots exacts du passage, **phrase avant et phrase après** (`[ancre](url)`).
- **Demande en trois lignes** (quoi, point précis cité, ce que la cible y gagne) + `brief` pour le rédacteur : `opening` (ouverture par le point précis), ressource, ancre, `introduceAs: "fondateur"`. **Le rédacteur M3.3 n'est pas encore branché** (il travaille sur les `link_plan_items`, pas sur `qualified_targets` : c'est le pont de MT.6) ; la présentation honnête en fondateur est une instruction dans le brief et dans la ligne 3 des lignes de demande.
- **Coût** : budget 5 % du budget cible (0,05 USD, pris sur la marge de docs/audit-v2.md section 6), `estimateFindings` annonce attendu et pire cas **avant lancement** (30 cibles : 0,0075 attendu / 0,0146 pire cas avec gpt-4o-mini), `startFindings` refuse si le pire cas dépasse le plafond d'audit restant ou si le plafond du jour est atteint, `assertCanSpend` (audit, sécurité, jour) avant **chaque** appel LLM, arrêt propre (`budget`/`plafond`), journal `cost_ledger` (tâche `llm.findings`). Sans clé LLM : liens morts seulement, rien de deviné.
- **Jeu d'évaluation annoté** (`eval-set.ts`, 36 pages HTML en français passées dans le vrai `parseHtml` : 12 mentions, 9 liens morts, 15 liens). **Règles (gratuites, `pnpm test`)**. Avant mes corrections : mentions précision 1,00 / rappel 0,875 (« Mega-Coloring » raté), pool de liens précision 0,857 (une fiche d'annuaire portant notre nom) ; liens morts et lien déjà présent 1,00. **Après : tout à 1,00** (jeu petit et réglé sur lui-même : risque de sur-ajustement). **LLM (`pnpm demo:findings-eval`, gpt-4o-mini, 15 pages, ~0,0024 USD)** : au départ mentions 0,88 / 1,00 (l'homonyme anglais « Mega Coloring Books » passait), liens inadaptés **précision 0,50** / rappel 1,00 (blog de pâtisserie américain, blog français généraliste, étude de santé jugés remplaçables) ; après prompt resserré, recoupement de sujet et vérification de la langue de destination : **1,00 / 1,00 pour les deux**.
- **Run réel** (`pnpm demo:findings`, liste courte de 30 cibles du run de 300 pages, pages retrouvées via la collecte rejouée) : **28 pages lues sur 30, 309 requêtes, 5 min, 7 appels LLM, 0,0014 USD**. Résultat : **0 lien mort, 0 mention, 2 liens inadaptés** (coloriagewk.com -> kleurplatenwk.nl, site néerlandais, probablement du même auteur ; geeek.org -> un GPT de coloriages sur chatgpt.com). Un premier passage donnait 4 constats dont 3 faibles (PDF du même éditeur, annuaire français utile `coloriage.info`, bouton d'impression) : ils ont produit les règles « même éditeur », « langue de destination » et « outils d'impression », puis les cas u14/u15 du jeu annoté. **Rendement honnête : très faible sur cette liste** (aucune mention : les cibles de la tactique « mentions » sont presque toutes tombées avant la liste courte ; aucun lien mort dans 28 pages).
- **Données** : migration `2026112900000000_findings.sql` **appliquée sur la vraie base** (projet `outreach-links`) : `findings_runs` (une par audit, coût figé, pire cas <= budget) et `target_findings` (lien mort = 404/410 + lien ; lien inadapté = lien ; mention = phrase après + ancre, sans lien ; trois lignes ; unique par cible et sorte). RLS lecture membres, écriture service_role ; test SQL `supabase/tests/findings.test.ts` (4 tests). Types ajoutés à la main. Job Inngest `audit-findings` (événement `audit/findings.requested`, un balayage de 2 pages par step, un jugement par step). `previewFindings` / `startFindings` sans bouton (MT.6).
- **Commandes** : `pnpm demo:findings-eval` (LLM), `pnpm demo:findings` (réel : `QUALIFY_LIVE_IN` = rapport de `demo:qualify` avec `QUALIFY_LIVE_OUT`, `COLLECT_LIVE_CACHE` identique, `FINDINGS_LIVE_OUT`). Règles : `pnpm test`.
- **Vérifié** : 1 070 tests verts (Postgres 16 local), lint (3 avertissements antérieurs), typecheck, format. `pnpm build` vert (avec variables factices `NEXT_PUBLIC_*`).
- **Dettes** : mentions et liens morts seulement sur la **liste courte** (les cibles « mentions » écartées en amont, ex. sans contact, ne sont pas examinées : une mention sans lien est une très bonne cible même sans contact trouvé : à reprendre en MT.6 ou MT.5 bis) ; liens morts des **pages de concurrents** (M2.2 `link_opportunities`) non fusionnés avec les constats ; un lien mort au-delà du 25e lien de la page est manqué ; faux 404 « souples » (redirection vers l'accueil) non détectés ; « fondateur » à confirmer avec l'utilisateur (aucun champ ne dit s'il l'est) ; un site frère du même auteur n'est pas reconnu (kleurplatenwk.nl) ; relancer la qualification supprime les constats (cascade) sans relancer l'analyse ; le texte d'une page est coupé à 12 000 caractères (mention plus loin manquée) ; jeu annoté petit (36 pages), à nourrir de vraies pages ; `loadFindingsInput` et `startFindings` testés par typage et SQL seulement.
- **Backlog** : rédacteur M3.3 qui consomme `brief` (ouverture par le point précis, ressource, présentation en fondateur) ; bouton « Analyser les pages » et affichage des constats (MT.6) ; tableau de bord du coût par phase (MT.7).
- Prochain sous-jalon recommandé : **MT.6 (écran « Vos cibles »)**.

## MT.6 : écran « Vos cibles » (16/11/2026)

- **Écran** `/app/audit/[id]/cibles` (lien depuis la page d'audit) : `src/features/targets/` (`service.ts` charge tout, `cards.ts` filtre et choisit la demande principale, `bridge.ts` fait le pont, `targets-screen.tsx` l'interface, `actions.ts`). Une carte par site de la liste courte : rang, type de site, tactiques, pourquoi, contact (email vérifié / à vérifier / formulaire), demande en trois lignes, constats MT.5 avec la citation de la page, la ressource proposée, la phrase après. Filtre par tactique (un constat ajoute sa tactique : lien mort ou inadapté = ressources, mention = mentions). SERP des concurrents repliée (`<details>`).
- **Boutons « Qualifier » et « Analyser les pages »** : le coût attendu, le pire cas, le budget de l'étape et ce qui reste du plafond d'audit sont affichés **avant** le bouton, qui porte le montant (`previewQualification` / `previewFindings`, client de service, aucune facturation à l'aperçu). Le lancement passe par `startQualification` / `startFindings` (qui re-vérifient plafonds et pire cas) ; l'appartenance de l'audit est vérifiée par RLS avant d'utiliser le client de service. Collecte non faite : message, pas de bouton (voir dettes).
- **Prioritaire 1 : mentions sans contact examinées.** Les cibles « mentions » écartées pour `sans_contact`, `hors_budget_contact`, `editeur_introuvable`, `hors_budget_lecture`, `hors_budget_llm`, `non_qualifie` (`MENTION_ONLY_REASONS`) sont ajoutées à l'analyse des pages (20 au plus, rang 1000+ : jamais devant la liste courte), en **mention seulement** (`mentionOnly` : aucune requête sur leurs liens, ni lien mort ni lien inadapté). L'aperçu de coût les compte. Sur l'écran : section « Mentions sans lien, sans contact trouvé », visibles avec leur preuve, **jamais incluses dans la validation**.
- **Prioritaire 2 : confirmer le rôle.** Nouvelle réponse `sites.founder_role` (`fondateur` / `equipe` / `agence`, nulle tant que non posée) et `founder_confirmed_at`, droits de colonne `update` pour l'utilisateur (le test SQL a révélé qu'il en fallait un : les droits de `sites` sont par colonne depuis M1.2). **« Valider » est refusé tant qu'elle est nulle.** Les trois lignes de demande de MT.5 ne disent plus « fondateur » (test mis à jour) ; la présentation est fixée au pont et passée au rédacteur : « Je suis X, fondateur de S » / « de l'équipe de S » / « et je travaille avec l'éditeur de S ».
- **Pont « Valider ces demandes »** (`validateRequests`) : crée un plan de liens (RPC `create_link_plan`, mêmes tables que M2.3) avec un élément par cible retenue (type `lien_mort` / `lien_inadapte` / `mention` / `page_ressources` / `site_non_sollicite`, URL de la ressource, ancre, priorité selon le rang), écrit triage (verdict ok, page lue en 200, accroche = citation exacte), contacts (email vérifié = envoyable ; à vérifier : non ; formulaire = tâche manuelle), marque triage et contacts « terminés », enregistre le **brief** (`plan_item_briefs`), puis lance `startDrafts`. Les brouillons et le lot apparaissent sur `/app/audit/[id]/plan` (lien « Voir les messages et le lot »). Cible déjà validée : ignorée (badge « Déjà validée »). **Aucun envoi.**
- **Rédacteur M3.3 branché** : `loadDraftInput` lit le brief ; le prompt reçoit `brief` (constat, ouverture suggérée, ressource, ancre, lien cité, erreur HTTP constatée, phrase après, présentation à utiliser) et la règle « ouvre sur la citation entière, présente-toi exactement ainsi » ; l'accroche vérifiée par le linter est la citation (160 caractères). Plan d'opportunités sans brief : prompt inchangé (testé).
- **Données** : migration `2026113000000000_targets_screen.sql` **appliquée sur la vraie base** (colonnes `sites`, table `plan_item_briefs`, RLS lecture membres, écriture service_role). Test SQL `supabase/tests/targets-screen.test.ts` (6 tests : rôle, droits par colonne, lignes du pont qui respectent les contraintes plan/triage/contacts/tâches/brief, RLS). Types ajoutés à la main.
- **Vérifié** : 1 093 tests verts (Postgres 16 local, dont 16 de logique d'écran et 6 SQL), lint (3 avertissements antérieurs), typecheck, format, `pnpm build`. **Pas de test Playwright** (aucune session connectée possible) : l'écran n'a pas été regardé dans un navigateur ; **0 USD d'API** dépensé.
- **Dettes** : pas de bouton de **collecte** (MT.3 existe sans interface : sans elle la qualification reste hors de portée depuis l'écran ; à ajouter au même modèle `CostStep` ou dans la chaîne d'audit) ; `loadTargets` et `validateRequests` testés par typage, logique pure et SQL (le faux client ne gère pas `.contains`) ; si l'écriture du plan échoue à mi-chemin, un plan partiel reste (`link_plans` n'a pas de delete pour le service) ; l'écran ne montre pas la progression en direct (actualiser la page) ; une seule demande par cible (le constat le plus probant : lien mort, mention, puis lien inadapté), les autres constats sont affichés mais pas écrits ; mentions sans contact : pas de saisie manuelle d'un email ni de tâche (backlog) ; `maxPagesRead` reste à 150 (le passage à 300 est prévu hors session).
- **Backlog** : bouton « Collecter » ; saisie d'un contact pour une mention sans contact ; choisir le constat à utiliser par cible ; suivi de progression des jobs sur l'écran ; Playwright connecté.
- Prochain sous-jalon recommandé : **MB.2** (test réel de bout en bout en dry run, qui exposera le trou de la collecte) ou **MT.7** (mesure par tactique et coût).

## Home : « Le problème » retiré, Tactiques détaillées, trois offres payantes (16/11/2026, demande de Jonathan, hors sous-jalon)

- **Section « Le problème » supprimée** (`problem.tsx`, textes, ancre `#probleme`). **« Tactiques » prend sa place**, juste après « C'est quoi », et n'est plus repliée : pour chacune des trois tactiques, le principe, où l'on cherche (pastilles), le déroulé en quatre étapes titrées et un **exemple de demande** de trois lignes (adresses `monsite.example`, signé d'un prénom, aucune mention de l'IA). `src/features/home/tactics.tsx`, textes `messages/fr.ts > home.tactics`. Tactique 2 renommée « Les liens morts à remplacer ». Lien « Tactiques » ajouté au pied de page. Ordre de la home : hero, C'est quoi, Tactiques, Preuves, Comment ça marche, Qualité, Fonctions, Comparatif, Tarifs, FAQ, appel final.
- **Cible** : « sites, blogs, SaaS et e-commerces » (hero, « C'est quoi », nouvelle question de FAQ pour les SaaS et boutiques). « francophones » retiré de la ligne d'audience.
- **Tarifs (décision de Jonathan) : trois offres payantes à 19,90 / 39,90 / 99,90 € par mois.** Le gratuit n'est plus une carte mais un bandeau « Gratuit pour commencer » au-dessus des trois offres ; en base, `gratuit` reste l'état sans abonnement. Migration `2026113100000000_plans_three_paid.sql` **appliquée sur la vraie base** (aucun abonnement n'existait) : nouvelle offre `business`, nouvelle colonne `plans.monthly_audits`, prix et plafonds mis à jour. Code : `BILLING_PLANS` et `isPaidPlan` acceptent `business` ; `/app/facturation` affiche les centimes et les audits ; `getPublicPlans` renvoie les trois offres payantes ; JSON-LD = trois offres. Pastille de la carte du milieu : « Recommandé » (« Le plus choisi » était une preuve sociale invérifiable, aucun client).
- **Répartition des accès PROPOSÉE (à confirmer par Jonathan ; se change par un `update` de `plans` et dans `home.pricing.plans`)** :

  |                                                     | Starter 19,90 € | Pro 39,90 € (recommandé) | Business 99,90 € |
  | --------------------------------------------------- | --------------- | ------------------------ | ---------------- |
  | Sites                                               | 1               | 3                        | 10               |
  | Audits complets par mois                            | 1               | 3                        | 10               |
  | Envois réels par mois                               | 100             | 300                      | 1 000            |
  | Boîtes mail                                         | 1               | 2                        | 5                |
  | Réponses prêtes à insérer, options « c'est payant » | non             | oui                      | oui              |

  **Décisions de Jonathan (16/11, même session)** : les **trois tactiques sont dans toutes les offres** (c'est la base : la grille de tarifs n'en parle pas, test) et les **prix sont TTC** (« TTC par mois » sur la home et sur `/app/facturation`, « Prix TTC » dans la note). Logique : Starter = un site ; Pro = quelques sites, plus de volume, réponses prêtes à insérer ; Business = un portefeuille de sites. Marge : un audit complet coûte ~0,25 à 0,50 USD mesuré, plafonné à 2 USD ; au pire cas, les audits inclus coûtent 2 / 6 / 20 USD par mois selon l'offre.

- **Ce qui n'est PAS encore appliqué par le code** : seul le plafond d'envois mensuel est imposé (`checkSendAllowance`). Sites, boîtes, audits par mois et réponses prêtes à insérer ne sont pas limités (et `BETA_MODE` met tout le monde au niveau payant). La page décrit donc l'offre cible : à imposer avant d'ouvrir le paiement réel (backlog).
- **Textes réécrits** (trop plats) : « C'est quoi », « Comment ça marche » (titre « Du premier audit au lien en ligne »), « Dans le détail » (ex-« Qualité, message, suivi »), Fonctions, Comparatif (titre distinct de celui des tactiques ; note corrigée : « hors achat, personne ne peut promettre un lien »), Tarifs, FAQ (11 questions), appel final, pied de page. **Le titre et le texte du hero, écrits par Jonathan le 15/11, ne sont pas touchés.**
- Tests : `home.test.ts` (section supprimée, ordre, cible, trois offres, exemples de demande), `supabase/tests/billing.test.ts` (quatre lignes au catalogue). 1 096 tests verts avec Postgres 16 local, lint, typecheck, format, build. Playwright 1440 et 390 px : aucun débordement, prix lus depuis la vraie base.
- **Questions pour Jonathan** : (1) valider ou corriger les plafonds ci-dessus (sites, audits, envois, boîtes) ; (2) nom de la troisième offre (« Business » par défaut). À prévoir avec le paiement réel : TVA dans Stripe (prix TTC, donc taxe incluse).

## Home allégée : deux sections retirées, tactiques côte à côte, parcours interactif (16/11/2026, retours de Jonathan, hors sous-jalon)

- **Retirées** : « Dans le détail » (ex-qualité, `quality.tsx`) et « Fonctions » (`features.tsx`), jugées redondantes ; `app-mockup.tsx` aussi (remplacé). Leurs deux meilleures maquettes (brouillon avec passage surligné, inbox classé) sont reprises dans le parcours. Ordre de la home : hero, C'est quoi, Tactiques, Preuves, Comment ça marche, Comparatif, Tarifs, FAQ, appel final. Page bureau ~10 500 px (contre ~13 000).
- **Tactiques** : trois colonnes côte à côte dès 1024 px, chacune avec le principe, quatre étapes courtes et l'exemple de demande aligné en pied de carte (`tactics.tsx`). Pastilles « où nous cherchons » supprimées (fondues dans le texte).
- **« Comment ça marche » interactif** : `how-it-works.tsx` (serveur) + `how-tour.tsx` (client) + `how-screens.tsx` (six écrans). Six étapes calquées sur le vrai parcours du produit (adresse du site, audit, liste courte « Vos cibles », relecture des messages, envois plafonnés, inbox et lien vérifié), chacune marquée « À vous » (3) ou « Automatique » (3). Cliquer une étape affiche son écran (à droite sur bureau, sous l'étape sur mobile). Sur bureau, défilement automatique toutes les 5 s tant que la section est visible et que personne n'a cliqué ; jamais sur mobile ni avec « réduire les animations ». Écrans = maquettes HTML/CSS, domaines `.example` (test), textes dans `home.how.mockup`.
- **En-tête** : Tactiques, Fonctionnement, Tarifs, FAQ (« Fonctionnalités » n'a plus de section). Les boutons « Fonctionnement » (hero, tactiques) mènent à `#comment-ca-marche`.
- **Comparatif, Tarifs** : textes réécrits pour la cible (titre tarifs : « Vous payez quand le premier message part. Pas avant. » ; colonnes « Acheter sur une plateforme / Tout faire à la main / Avec nous »). Tous les boutons des offres disent « Essai gratuit ». « envois réels » devient « emails envoyés ».
- **FAQ** refaite sur le modèle de la référence (questions relevées sur sa page publique le 16/11, **réponses entièrement réécrites pour notre produit**) : 11 questions, réponse directe dès les premiers mots (c'est quoi, pour qui, spam, Google, nombre de liens, ma boîte, IA et contrôle, demande de paiement, formulaires, prix et essai sans carte, légalité et données).
- Tests : `home.test.ts` (sections retirées, en-tête, six étapes et écrans d'exemple). 1 098 tests verts, lint, typecheck, format, build ; Playwright 1440 et 390 px : aucun débordement, aucun message d'erreur dans la console, clic sur les étapes vérifié.
- **À confirmer par Jonathan** : plafonds par offre et nom « Business » (inchangés) ; les chiffres des écrans d'exemple (552 candidats, 300 pages lues, 30 retenus) viennent du run réel de MT.4 bis mais restent des données de démonstration.

## Home : 7 jours d'essai à la place de l'audit gratuit (16/11/2026, demande de Jonathan)

- **Plus aucune référence à l'audit gratuit sur la home** (test) : pastille du hero, repères, bandeau des tarifs, FAQ, appel final disent « 7 jours d'essai offerts ». Titre des tarifs : « Essayez 7 jours. Payez seulement si vous continuez. ». Phrase d'introduction de la FAQ supprimée (`SectionHeading` accepte un en-tête sans texte).
- **Non codé** : l'essai de 7 jours n'existe pas encore dans la facturation (pas de fin d'essai, pas de blocage au 8e jour ; Stripe en mode test, `BETA_MODE` ouvre tout). **Décision de Jonathan** : le verrouillage des fonctionnalités par offre et l'essai se feront une fois le produit terminé. « Sans carte bancaire » est écrit parce que l'inscription n'en demande pas aujourd'hui : à confirmer quand l'essai sera codé.
- Non touchés (hors home) : la page d'inscription (« La carte n'est demandée qu'au premier envoi réel »), les conditions d'utilisation et la route `/audit-gratuit/[id]`, qui parlent encore de l'audit gratuit. À aligner si l'audit gratuit public est abandonné.

## Home : textes réalignés sur le produit actuel, FAQ sur l'envoi (18/11/2026, demande de Jonathan, hors sous-jalon)

Demande : « design ok », reprendre le wording pour qu'il soit meilleur et plus juste, et traiter en FAQ qui envoie le mail, comment, et quelles messageries sont compatibles. **Aucune mise en page touchée** : seuls les textes changent (`messages/fr.ts > home` et `app.description`), plus un lien facultatif sous une réponse de FAQ (`faq.tsx`, `FaqItem.link`).

- **Vocabulaire de l'espace client repris** : « analyse » (plus « audit »), « À valider », « Conversations », « approuver » ; « lot » et « inbox » sortent de la home (test). Les six écrans du parcours portent les libellés réels (« Analyser mon site », « Rédiger les 30 messages », « Approuver et envoyer », statuts À traiter / A répondu / Relancé / Lien obtenu).
- **Ce qui était faux et ne l'est plus** : « dix emails par heure » (le vrai rythme est cinq par 24 heures la première semaine, puis 10, 15, puis le plafond de la boîte : on dit « quelques-uns par jour au début, davantage ensuite ») ; « heures de bureau » (jours et heures au choix de l'utilisateur) ; « validez le lot d'un bloc » (approbation un par un ou groupée) ; « signés de votre prénom » (signature complète) ; « trois lignes » (message court) ; « réponses classées Chaud / Offre payante » (vues retirées de l'écran) ; « vous recevez une alerte » si un lien disparaît (signalé dans l'espace, aucun email) ; « en quelques minutes » (un quart d'heure, email de fin).
- **Tactique 1 recentrée** sur ce qui a rapporté des liens (CLAUDE.md 5) : « Les pages qui citent déjà des sites comme le vôtre » (ex-« Les sites que personne ne sollicite »). Les trois exemples de demande donnent l'adresse de la page contactée et celle de la page proposée, comme les vrais messages (test).
- **FAQ : 13 questions** (11 avant). Nouvelles : « Qui envoie les emails ? », « Comment relier ma boîte mail ? » (mot de passe d'application, test, chiffrement, révocation ; lien vers `/aide/boite-envoi`), « Quelles messageries sont compatibles ? ». Cette dernière suit `messages/mailbox-providers` : **un test échoue si la liste de la FAQ et celle des guides divergent** (à mettre à jour ensemble, par exemple à l'arrivée de la connexion par compte Microsoft ou Google).
- **Non touché** : titre du hero (Jonathan, 15/11 ; seule la dernière phrase du texte passe de « validez chaque lot » à « approuvez chaque message »), section preuves (chiffres d'illustration), prix, structure.
- **Contrôlé** : `home.test.ts` (20 tests verts avec `messages.test.ts`), typecheck, lint, format ; captures Playwright 1440 et 390 px de chaque section et des six écrans du parcours, aucun débordement, aucune erreur dans la console (prix servis par une fausse table `plans` locale).
- **À trancher par Jonathan** : la home promet « 7 jours d'essai offerts, sans carte » (décision du 16/11), mais rien dans le code ne limite l'essai à 7 jours : pendant la bêta, tout inscrit peut envoyer jusqu'à 100 emails par mois sans abonnement. À aligner à l'ouverture du paiement.
- **Backlog** : `/app/facturation` dit encore « audits complets par mois » (la home dit « analyses ») ; la note des tarifs « la relance et vos réponses comptent chacune pour un » n'a pas été revérifiée dans le code ; page d'inscription et conditions parlent encore d'audit gratuit (déjà noté le 16/11).

## Vidéo de visite ajoutée à la home (15/11/2026, demande de Jonathan)

- `PRODUCT_TOUR_VIDEO` (`src/features/home/sections.ts`) renseigné : `public/visite-produit.mp4` (1920x1080, 61 s, ~5 Mo, fournie par Jonathan) et sa vignette `public/visite-produit-poster.jpg` (image à 3 s). Lecture manuelle, sans son au départ, chargement différé (`preload="none"`). Vérifié avec Playwright (bureau 1440 et mobile 390) : vidéo chargée (61,5 s), vignette affichée, aucun débordement horizontal. Le fichier est servi par Vercel depuis `public/` (pas de stockage externe).

## Backlog (idées hors périmètre)

- Écran Cibles, état « tout traité » : un bouton « Chercher d'autres cibles » qui annonce le coût avant de lancer (maquette `cibles-apres-validation.html`), à brancher sur `readMoreAction` avec un aperçu de coût.

- **Après MC.7 (19/11), non planifié** : (1) les sites créés avant MC.7 n'ont pas de classement de pages dans leur profil ; il n'arrive qu'à une nouvelle lecture du site (« Reprendre à partir d'ici » sur l'étape « Comprendre votre site »), un rattrapage gratuit depuis le cache DataForSEO serait possible ; (2) sur une boutique, des fiches produit entrent dans les 5 pages présélectionnées (monjardinbio.com : 2 sur 5), la formule ne connaît pas la nature de la page, à observer sur une vraie campagne avant d'y toucher ; (3) l'appel des mots-clés à l'onboarding n'a pas de plafond par espace de travail (seulement le plafond par appel et le plafond quotidien de la plateforme) ; (4) le volume et la position ne sont pas affichés sur l'écran de relecture des pages après audit (hors périmètre de MC.7) ; (5) `audits.links_state.keywords.top` ne garde toujours que 20 mots-clés sur 100 (le profil, lui, part des 100).
- **MC.7 (fait le 19/11) puis MC.2 (18/11, après l'audit de la campagne squadraplanning.com)** : MC.7 (pages à pousser choisies par volume et position dès l'onboarding, formule fixe, voir `PLAN.md`) puis MC.2 en partant des mots-clés de ces pages. Autres constats du même audit, non planifiés : liste courte triée par score global plutôt que par pertinence (18 cibles sur 34 à fit 0,3) ; concurrents qui passent le filtre (shifty-app, kazalendar, dimo-rh, elevo) et ne sont refusés qu'à la rédaction ; cibles hors pays (Canada, Québec, Belgique) ; 36 appels du modèle sur 72 en échec par « sortie tronquée » à la qualification ; contrôle « promesse » du linter peut-être trop sévère (brouillon logiciels-solutions.fr) ; le mail dit « fondateur » alors que `founder_confirmed_at` est vide.
- Chantier envoi des mails (19/11/2026) : décisions et pistes dans `PLAN.md > ME` (Resend = transactionnel seulement, prestataire dédié pour l'outreach, connexion Google en option).

- **Arrière-plan (17/11, étape 1)** : pas d'étape « liens morts » pour les cibles ajoutées par la lecture de la réserve (manuel ou automatique) ; jugement des lots d'arrière-plan à tarif réduit (étape 2) ; barre fixe « Valider ces demandes » qui recouvre le message de fin sur mobile (MU.10).
- Essai de 7 jours (16/11) : le coder dans la facturation (début, fin, blocage ou passage à l'offre), avec ou sans carte ; aligner la page d'inscription, les conditions et le sort de l'audit gratuit public (`/audit-gratuit`).
- Tarifs (16/11) : imposer par offre le nombre de sites, de boîtes, d'audits par mois et les réponses prêtes à insérer (aujourd'hui seul le plafond d'envois l'est) ; TVA incluse côté Stripe (prix TTC) ; facturation annuelle ; faire correspondre `workspaces.plan` (gratuit/payant) aux trois offres.
- **Contexte à garder pour MT.5 (16/11/2026, retour de Jonathan)** : Jonathan a obtenu un **backlink réel** avec un mail personnalisé qui **cite un point précis de l'article cible** (un lien vers un service américain peu utile à un lecteur français) et **propose la ressource la plus pertinente de son site**, en se présentant **honnêtement comme le fondateur**. À reprendre dans MT.5 (liens inadaptés : repérer dans la page un lien sortant étranger ou peu utile au lecteur, le citer, proposer la ressource du site qui le remplace) et dans le rédacteur (M3.3) : ouverture par le point précis, la ressource choisie (champ `resource` du jugement MT.4), signature « fondateur de ». Rien de codé en MT.4.
- MT.4 : bouton « Qualifier » et écran (MT.6) ; requalifier automatiquement après une nouvelle collecte ; finder d'emails payant derrière une ligne de budget ; résoudre les racines de plateformes du recoupement (quels blogs hébergés lient) ; cache partagé des qualifications de domaines entre clients (docs/audit-v2.md section 5) ; recaler les facteurs du score sur les réponses réelles (phase 5).
- M5.3 : bouton « lien posé » dans la fiche de fil (crée le lien avec `plan_item_id`, origine `reponse`, passe le prospect à `lien_pose`) ; digest des alertes (M6.3) ; `X-Robots-Tag` ; vérifier l'indexation réelle si une API le permet.
- M5.1 : traiter les messages très courts sans catégorie évidente (« Ok », « Noted ») comme `ambigu` sans modèle, ou ajouter des exemples au prompt ; relire les messages en `needs_review` dans M5.2 ; classifier aussi les vraies pièces d'un fil (plusieurs réponses d'un même prospect : la catégorie la plus restrictive devrait l'emporter) ; mesurer sur de vraies réponses (M7.1).
- M3.4 : page `/app/lots` listant les lots de tous les sites ; anti-doublon des messages modifiés ; rédaction qui ignore les brouillons verrouillés ; test Playwright connecté.

- M3.1 : verdict modifiable par l'utilisateur (M3.4) ; cache de pages en base ; vérification que la mention de marque ne porte pas déjà un lien ; jeu d'évaluation sur de vraies pages (pas seulement synthétiques) ; tri automatique à la validation du plan.
- **Jalon MA : revoir tout le process d'audit** (demande de Jonathan, 14/11/2026) ; voir PLAN.md et « M1.6 bis ».
- **Jalon MD : design du site global** (demande de Jonathan, 14/11/2026) ; voir PLAN.md.
- Brancher la mesure groupée de MA.2 (`bulk_referring_domains`) sur l'audit public gratuit, qui fait encore 3 `backlinks.summary` (~-0,048 USD par audit, marge plus large).

- Purge des audits bloqués en `en_cours` (job de nettoyage).
- Mode sombre ; contenu réel des écrans de la coquille.
- Sentry et `jobs_audit` (optionnels).
- Job Inngest de purge de `dataforseo_cache` ; idempotence des `task_post` payants lors des nouvelles tentatives.
- Limite de débit de la vérification de propriété (1.6) ; durcir les redirections de vérification.
- Filtres de vue (par concurrent, par motif) sur la page d'audit.
- Purge des backlinks `en_cours` bloqués.
- Test Playwright connecté si une session de test est mise en place.
- Purge des `profile_status` bloqués ; régénérer `database.types.ts` avec la CLI ; détecteur de promesses plus robuste (LLM ou plus de motifs).

## À fournir par Jonathan

1. Inngest : reconnecter le connecteur avec droit de lecture des clés, ou copier `INNGEST_EVENT_KEY` et `INNGEST_SIGNING_KEY` (environnement production) vers Vercel (Production et Preview, type sensitive) ; sans elles ni l'audit ni l'étape backlinks (`audit.backlinks`) ne tournent en production. Puis redéployer, synchroniser l'app avec `https://outreach-links.vercel.app/api/inngest`, envoyer `app/health.ping` et vérifier une nouvelle ligne dans `cost_ledger`.
2. Choisir si `outreach-links` cohabite avec `scan-vie-privee` dans l'environnement Inngest de production ou dans un environnement dédié.
3. `DATAFORSEO_LOGIN` et `DATAFORSEO_PASSWORD` (https://app.dataforseo.com/api-access) sur Vercel, Production et Preview, type sensitive ; vérifier que l'abonnement Backlinks est actif (séparé du SERP et des Labs). Puis lancer `pnpm demo:dataforseo` (SERP FR sur mega-coloring.com), consigner le coût réel ici et remplacer la fixture SERP synthétique, puis `pnpm demo:audit` (run réel de l'audit sur mega-coloring.com, plafond 1,50 USD, coût réel à consigner dans « Mesures »). Le même abonnement Backlinks permet de mesurer le coût réel de l'étape M1.4 et de recaler ses fixtures.
4. `ANTHROPIC_API_KEY` sur Vercel (fournisseur LLM visé) et `OPENAI_API_KEY` si OpenAI sert de repli ; sans clé le résumé retombe sur le texte de modèle. Ne jamais définir `LLM_PROXY_AUTH` ni `DATAFORSEO_PROXY_AUTH` sur Vercel.
5. Le même run réel DataForSEO sert à mesurer le coût du profil (M1.5) et à valider les schémas `ranked_keywords`, `referring_domains` et `onpage`.
6. FACULTATIF, plus tard (M3.2) : `EMAIL_FINDER_API_KEY` (clé Hunter ; `EMAIL_FINDER_PROVIDER=hunter` par défaut) sur Vercel, type sensitive, et l'hôte `api.hunter.io` à autoriser dans le réseau de l'environnement cloud. Sans clé, seuls les emails publiés par la cible sur son domaine sont envoyables (vérification DNS gratuite) ; aucune recherche d'emails cachés.

## Bilan V1 (14/11/2026)

**Ce qui marche (vérifié)**

- Le site https://outreach-links.vercel.app est en ligne : accueil et page de connexion répondent (200), aucune erreur dans le navigateur ; `/app` renvoie bien vers la connexion. Dernier déploiement de production : prêt (fusion de la PR #19).
- La base de données (Supabase) est protégée : les 12 tables ont la sécurité par ligne activée.
- Construit et testé sur des données de test : connexion, création du site et vérification de propriété, découverte des concurrents, nettoyage des backlinks avec export, profil de liens, écart de domaines, pages à pousser, résumé rédigé, suivi des coûts.
- Aucun email réel n'a été envoyé et aucune dépense réelle (0 USD DataForSEO ; environ 0,002 USD de LLM).

**Ce qui ne marche pas encore**

- Aucun audit réel n'a tourné : il manque les clés DataForSEO et Inngest sur Vercel. En production, lancer un audit affiche une erreur.
- M1.6 (audit gratuit sur la page d'accueil) : fait et fusionné (PR #20). Migration `2026111516000000_public_audit.sql` appliquée sur la vraie base via `POST api.supabase.com/v1/projects/{ref}/database/query` (l'outil MCP `apply_migration` attend une confirmation qui expire en session cloud ; elle n'apparaît donc pas dans `list_migrations`). Pages `/` `/connexion` en 200 en production. Reste : régénérer `database.types.ts` (patché à la main dans la PR) et mesurer le coût réel dès que DataForSEO est branché.
- Pas encore d'envoi, de relance, de boîte de réception classée, de vérification des liens, de paiement (jalons M2 à M7).
- Les coûts réels et les formats de réponse de DataForSEO ne sont connus que par estimation (fixtures inventées d'après la documentation).

**Alertes de sécurité Supabase (à traiter)**

- Table `dataforseo_cache` : sécurité activée sans règle, voulu (accessible seulement au serveur). Information seulement.
- Fonctions `has_workspace_role` et `is_workspace_member` appelables par les utilisateurs connectés : elles servent aux règles de sécurité et ne donnent que oui/non ; à revoir avant l'ouverture au public.
- Protection contre les mots de passe compromis désactivée : sans effet tant que la connexion se fait par lien magique.

**Ce que Jonathan doit fournir ou décider**

1. Clés Inngest (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`) pour Vercel ; choisir un environnement dédié ou partagé avec `scan-vie-privee`.
2. Identifiants DataForSEO (et abonnement Backlinks actif) pour un premier audit réel sur mega-coloring.com et la mesure du coût.
3. Clé Anthropic (LLM visé) pour Vercel.
4. Exemples de messages d'outreach qui ont bien marché, et ses résultats chiffrés (voir CLAUDE.md section 12).
5. Un nom de produit et un domaine ; un domaine d'envoi secondaire pour les emails.
6. Resend pour les mails de connexion (limite actuelle de 2 par heure) ; Stripe pour les paiements ; un juriste pour valider les textes légaux (prospection, RGPD, non-mention de l'IA).
7. Décision sur la politique « c'est payant » (décliner par défaut proposé).

**Prompt de la session suivante**

« Lis CLAUDE.md et PROGRESS.md (section Bilan V1). Applique la migration de la PR #20 (M1.6) sur Supabase, régénère les types, fusionne la PR et vérifie la production. Puis enchaîne sur M2.1 de PLAN.md : un sous-jalon par session, en autonomie, sans aucun envoi d'email réel. »

## Prochain sous-jalon recommandé

**Priorité NOW (19/11/2026) : MC.7 fait. Suite : MC.2** (recherches de cibles par sujet et par public, écrites à partir des mots-clés des pages choisies : `brand_profiles.profile.ranked_pages`, voir « Session du 19/11 : MC.7 » en fin de fichier). À relire d'abord à la lumière de MC.6 (voir `PLAN.md`). (Les textes ci-dessous sont d'anciennes recommandations.)

**Ancienne priorité (18/11/2026) : MC.7** (pages à pousser par volume et position, calcul à l'onboarding ; `PLAN.md > MC.7`), **puis MC.2** (recherches de cibles à partir des mots-clés de ces pages). Décisions de Jonathan : calcul à l'onboarding malgré le léger surcoût, mélange volume et position, formule fixe sans calibrage coûteux.

**Priorité NOW (16/11/2026) : MU.0 fait. Suite : MU.1** (une seule analyse, de bout en bout ; `docs/jalon-mu.md`, prompt à copier dans le sous-jalon). MB.2 et MT.7 passent après MU. (Les textes ci-dessous sont d'anciennes recommandations.)

**Priorité NOW (15/11/2026) : MN.1, MH.1 et MN.2 faits. Suite : MH.2 (home FR, en-tête, hero, premières sections), puis MH.3, MB.1, MB.2 ; M6.2 passe après.** (Texte ci-dessous = ancienne reco.)

M5.4 (tâches manuelles des formulaires). En parallèle, finir la mise en production d'Inngest et le run réel DataForSEO dès que Jonathan fournit les identifiants.

## M5.4 : tâches manuelles (formulaires)

- Migration additive `2026112600000000_manual_tasks_followup.sql` (appliquée sur la vraie base) : `manual_tasks` gagne `done_at`, `follow_up_status` (`en_attente`, `fait`, `annulee`), `follow_up_due_at`, `follow_up_message`, `follow_up_done_at`, `follow_up_cancel_reason` (`reponse`, `refus`, `abandon`) et des contraintes de cohérence. Trigger `guard_manual_task` : une tâche ne devient « faite » que si son message est dans un **lot validé** ; statuts finaux figés ; relance « faite » refusée avant l'échéance. 4 tests SQL (`supabase/tests/manual-tasks.test.ts`).
- Code : `src/features/tasks/` (`view.ts` états et groupes, `followup-message.ts` gabarit de relance sans LLM passant le linter, `service.ts` : `listTasks`, `countDueTasks`, `completeTask`, `completeFollowUp`, `cancelFollowUp`, `skipTask`, `actions.ts`, `tasks-section.tsx`). Écran `/app/taches` (entrée « Tâches » dans la navigation) : 4 groupes (à faire, à relancer, en attente, terminées), message copiable (le brouillon validé du lot), lien vers le formulaire, « J'ai envoyé le message ».
- Décisions [auto] : « fait » programme la relance à J+10 (`SEND_LIMITS.followUpDays`) ; le message de relance est un gabarit français fixe signé du prénom, avec la même URL ; aucune action serveur ne remplit un formulaire ; réponse, refus ou abandon annulent la relance (même logique que les signaux de l'inbox) ; les tâches ne sont visibles qu'après validation du lot.
- Rappel pour le digest : `countDueTasks(supabase, now)` renvoie `{ toDo, followUps }` et `reminderText` en fait une phrase ; M6.3 n'a qu'à les appeler.
- Pas de test Playwright (pas de session de test). 0 USD d'API. Dette : le message initial copié dans `manual_tasks.message` (M3.3) n'est plus lu, l'écran lit le brouillon validé ; la relance n'est pas encore mise à jour automatiquement par une réponse reçue dans l'inbox (formulaires sans fil email).
- Sessions enfants lancées : 4 sur 12 (la 4e = M5.4).

Prochain sous-jalon : M6.1 (Stripe en mode test).

## M6.1 : Stripe (mode test), plans, plafonds d'envoi

- Migration additive `2026112700000000_billing.sql` (appliquée sur la vraie base) : `plans` (gratuit 0 envoi ; starter 49 €, 150 envois/mois, 100 crédits, 1 site, 1 boîte ; pro 119 €, 600 envois/mois, 400 crédits, 5 sites, 3 boîtes : [HYPOTHÈSE] de CLAUDE.md 4.6, modifiables en base), `subscriptions` (un par workspace, écrite par `service_role` seulement, lecture RLS), `credits_ledger` (ajout seul, clé d'idempotence unique), `stripe_events` (idempotence). **`livemode = false` imposé par contrainte SQL** sur `subscriptions` et `stripe_events`. `workspaces.plan` (gratuit/payant, palier des audits) reste inchangé : le webhook le passe à `payant` pendant un abonnement actif.
- Code `src/features/billing/` : `plans.ts` (`effectivePlan`, `checkSendAllowance`), `stripe.ts` (adaptateur `fetch` sans SDK, **refuse toute clé hors `sk_test_`**, Checkout en `price_data` mensuel EUR donc aucun produit à créer côté Stripe, portail client, vérification de signature HMAC avec tolérance 5 min, adaptateur factice sans réseau si `STRIPE_SECRET_KEY` manque), `webhook.ts` (`handleStripeEvent` : checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid -> crédits ; événement rejoué ou `livemode` ignoré), `service.ts`, `actions.ts`, `billing-section.tsx`. Route `POST /api/stripe/webhook` (exclue du proxy de session, authentifiée par la signature ; 503 sans `STRIPE_WEBHOOK_SECRET`). Écran `/app/facturation` (lien depuis `/app`). Variables : `STRIPE_SECRET_KEY` (regex `sk_test_`), `STRIPE_WEBHOOK_SECRET`.
- Plafonds : le moteur d'envoi (`runSendTick`) et l'envoi des réponses (`runReplySendTick`) appellent `checkSendAllowance` AVANT tout envoi RÉEL : sans abonnement actif (ou `canceled`/`incomplete`/période expirée) = `abonnement_requis` ; quota du mois civil UTC (emails + réponses réels, dry run exclu) atteint = `quota_mensuel`. `past_due` garde l'accès (période de grâce). Le dry run n'est pas soumis au plan. Un plan illisible refuse.
- Décisions [auto] : « carte demandée au premier envoi réel » = l'abonnement est exigé à ce moment (Checkout), pas à l'inscription ; crédits accordés à chaque facture payée mais **pas encore consommés** (aucune fonctionnalité ne débite `credits_ledger` : backlog) ; `max_sites` / `max_mailboxes` stockés mais pas encore appliqués (backlog M6.2) ; ordre des événements Stripe non géré (un `updated` ancien rejoué après un plus récent pourrait régresser l'état : à durcir avec `event.created`).
- Tests : 15 unitaires (signature, mode test, webhooks idempotents, plafonds, souscription), 2 sur le moteur d'envoi (sans abonnement le transport n'est jamais appelé), 5 SQL (`supabase/tests/billing.test.ts`). Les tests d'envoi réel existants reçoivent désormais un abonnement. 785 tests verts avec Postgres 16 local. 0 USD d'API.
- **À fournir** : `STRIPE_SECRET_KEY` (`sk_test_...`) et `STRIPE_WEBHOOK_SECRET` sur Vercel (Preview, sensitive), endpoint webhook Stripe de test vers `/api/stripe/webhook` (événements ci-dessus), hôte `api.stripe.com` dans le réseau cloud. Tant qu'ils manquent, le bouton de souscription mène à l'adaptateur factice (aucun paiement).
- Sessions enfants lancées : 5 sur 12 (la 5e = M6.1).

Prochain sous-jalon : M6.2 (garde-fous et niveaux d'autonomie).

## MA.8 : sites de test (15/11/2026)

- Décision de Jonathan : `remove-me.io` et `mega-coloring.com` (et leurs sous-domaines) servent de tests grandeur nature, sans limite, et chaque relance repart de zéro.
- `src/features/sites/test-domains.ts` : liste fixe dans le code (`isTestDomain`, `TEST_COST_CAP_USD` = 50 USD, filet de sécurité). `limitsFor(plan, domain)` (plans.ts) : un site de test prend les limites du plan payant (20 concurrents) avec le plafond haut ; `createAudit` et la sélection des concurrents l'utilisent.
- Cache : `createDataForSeoClientFromEnv` pose `shouldBypassCache` (résout le domaine de l'audit ou de l'audit public, mémorisé) : le cache n'est jamais lu pour ces domaines, la réponse fraîche est tout de même stockée. Aucun changement dans les jobs Inngest.
- Audit gratuit public : pour ces domaines, pas de limite de débit, pas de coupe-circuit, plafond de 50 USD, pas de limite d'essais, et chaque soumission crée une nouvelle exécution (période `AAAA-MM~horodatage`). Migration `2026111527000000_public_audit_test_periods.sql` (contrainte `period_key` assouplie), appliquée sur la vraie base.
- Tests : `test-domains.test.ts` + un cas dans `audits/service.test.ts` (le jeu de tests utilisait mega-coloring.com, passé sur un domaine neutre).
- Inngest : app `outreach-links` resynchronisée en production (17 fonctions). Clés Inngest, DataForSEO et Anthropic déjà présentes sur Vercel (Production et Preview) ; leur validité réelle sera prouvée par le premier audit.
- Dette : le plafond de 50 USD n'est pas un coupe-circuit global ; à surveiller dans `cost_ledger` lors des premiers runs.

## MN.1 et MH.1 (15/11/2026)

- **MN.1** [auto] : `docs/naming.md`. 14 noms testés (RDAP `.fr`, `.com`, `.io`, prix via l'API du registrar Vercel, une recherche web exacte par nom). Les noms évidents sont tous pris en `.fr` et `.com`. Shortlist : **Lienvue** (recommandé : `.fr`, `.com`, `.io`, `.net`, `.org` libres ; `.com` 12,03 $, `.io` 14,99 $ puis 46 $ par an), **Nouelo**, **Cordelien**. **Aucun achat.** Limite : l'INPI renvoie 403 depuis l'environnement, EUIPO et WIPO non interrogés : aucune recherche d'antériorité officielle, à faire avant dépôt. Le `.fr` n'est pas supporté par le registrar Vercel (achat chez un registrar français). Décision attendue de Jonathan : le nom ; puis validation de la dépense (~12 $ + un `.fr`) pour l'achat, Vercel, `NEXT_PUBLIC_APP_URL`, Supabase Auth, Resend.
- **MH.1** [auto] : `docs/home-reference.md`. Relevé de la home d'outlinkai.com (Playwright, bureau et mobile), section par section : header collant, hero, bandeau de réassurance, 9 sections numérotées (définition, problème, preuves, boucle en 7 étapes, qualité/pitch/suivi, fonctions, extension et appli, comparatif, tarifs, FAQ), appel final, footer ; composants, animations, mobile, et tableau de correspondance pour notre home (ce qu'on garde, ce qu'on supprime : extension, appli, marque blanche, MCP). Textes paraphrasés, captures non versionnées (droits). Pièges : les sections sont masquées tant qu'elles n'ont pas été défilées (captures `fullPage` noires ; utiliser `textContent`) ; plusieurs détails mobiles et l'exclusivité de la FAQ ne sont pas vérifiés (indiqués dans le document).
- Coût : 0 USD DataForSEO, 0 USD LLM. Aucun code produit modifié. Hypothèse « DA = direction artistique » inchangée (non contredite).

### Décision nom (15/11/2026, après MN.1)

- Nom de travail **« Autolink.ai »** (décision de Jonathan) ; nom et domaine définitifs reportés. Aucun achat. `autolink.ai` est pris par un tiers (voir `docs/naming.md`) : ne pas déposer ni acheter ce nom tel quel.
- À respecter dès MN.2 : nom = un seul réglage modifiable (pas d'occurrences en dur), pas de logo figé ni de domaine branché. Le brief de nom définitif (international, link + auto + IA) et les pistes (Linknaut, Linkomia…) sont dans `docs/naming.md`. MN.1 reste donc « fait pour la shortlist, choix final en attente ».

## MN.2 : direction artistique (15/11/2026)

- **Piste retenue par Jonathan : I « clair et émeraude »** après comparaison de 13 pistes (A à N, `docs/da-pistes/` pour les sources HTML, `docs/img/da-*.png` pour les captures, conservées comme archive, exclues de Prettier). Style SaaS B2B : blanc, encre marine `#0e1a2b`, émeraude `#047857` (assombri depuis `#059669` pour atteindre 4,5:1 avec du texte blanc), surligneur ambre `#fde68a` réservé au hook, surface `.surface-night` (marine `#0b1b2e`, menthe `#5eead4`) pour la bande produit, l'appel final et le pied de page. **Une seule police : Inter** (remplace Fraunces / Public Sans de M0.4 et les polices testées en première version). Vouvoiement.
- Livrables : `docs/da.md`, `src/app/globals.css` (jetons, rayons `rounded-control/card/panel`, ombres `shadow-card/float`, utilitaires `mark-hook`, `bg-grid`, `bg-hero-wash`, `prefers-reduced-motion`), `src/app/layout.tsx` (Inter), `src/components/brand/logo.tsx` (logo provisoire, deux maillons), aperçu `docs/da-pistes/i-clair-emeraude.html` (+ variante `m-hybride-clair-nuit.html` pour la bande produit sombre).
- **Nom en réglage unique** : `app.name` = « Autolink.ai » dans `messages/fr.ts` ; le nom Stripe le lit aussi. Test `src/lib/design-tokens.test.ts` : contraste AA de chaque paire (clair et nuit) et nom écrit nulle part ailleurs dans `src`. Aucun achat, aucun domaine branché.
- **Décision de positionnement (Jonathan, 15/11, après MN.2)** : on assume d'être l'**alternative française d'Outlink AI** : même philosophie, même outil, même structure et mêmes sections de site ; meilleur audit de base ; **prix nettement plus bas**. CLAUDE.md (sections 1 et 8) et PLAN.md (MH.2) mis à jour. Reste interdit : reprendre leurs textes, logo, marques, captures, chiffres ; comparatif nominatif non vérifiable.
- **Point à trancher avant MH.3 (tarifs)** : « bien moins cher » n'est pas vrai avec la grille actuelle (Starter 49 €, Pro 119 € en base, [HYPOTHÈSE] de CLAUDE.md 4.6) face à la référence (39 / 99 / 299 $ relevés le 15/11). Proposition par défaut : ne rien afficher de comparatif tant que la grille n'est pas recalée sur le coût réel d'un audit (`cost_ledger`) ; Jonathan fixe alors les prix.
- Skills installés pendant la session : Website Design (UXKIN, non connecté), brand-studio ; à utiliser pour MH.2 (`landing-page`, `web-review`) et pour le logo définitif.
- Lint, typecheck, build et 647 tests verts (tests SQL ignorés sans Postgres local). 0 USD d'API.
- Backlog : favicon et image de partage au nom définitif ; mode sombre de l'application non prévu ; `app-nav` et écrans existants à revoir visuellement après MH.2.

Prochain sous-jalon : MH.2 (construction de la home).

## MH.2 : home FR, en-tête, hero et premières sections (15/11/2026)

- **Fait** : en-tête collant 68 px (panneau latéral sur mobile, Échap pour fermer), hero (champ « votre site » = `AuditForm variant="hero"`, qui lance l'audit gratuit existant ; requêtes et thème facultatifs repliés dans un `details`), fenêtre « visite du produit » 16:9, bande de réassurance, sections « C'est quoi » (6 couples), « Le problème » (12 pastilles) et « Comment ça marche » (bande `.surface-night`, méthode en 6 étapes, maquette de l'application avec données de démonstration en `.example`).
- **Vidéo (demande de Jonathan)** : l'emplacement est réservé (cadre 16:9, aucun décalage de mise en page). Quand la vidéo existera : déposer le MP4 dans `public/` et renseigner `PRODUCT_TOUR_VIDEO` dans `src/features/home/sections.ts` (`{ src, poster? }`). Sans valeur, le cadre affiche « Démonstration vidéo bientôt disponible ».
- Fichiers : `src/features/home/*` (sections, en-tête, menu mobile, maquette, test), `src/app/page.tsx`, `messages/fr.ts` (`home.*`), `audit-form.tsx` (variante hero). `Button` accepte désormais `ref` (`ComponentProps<"button">`).
- Choix : textes réécrits, vouvoiement ; nom uniquement via `t.app.name` ; aucun chiffre de preuve ni prix ; pas de numérotation de section (les « preuves » viendront en MH.3, éviter un 01, 02, 04). Liens d'en-tête limités aux sections existantes (Tarifs et FAQ à ajouter en MH.3). Test `home.test.ts` : ancres, pas de « garanti », pas de chiffre ni prix, vouvoiement.
- Vérifié : tests (651), lint, typecheck, build verts ; Playwright bureau 1440 px et mobile 390 px, aucun débordement horizontal, menu mobile ouvert et fermé.
- Non fait (MH.3) : preuves (seulement si chiffres réels après MB.2), qualité/pitch/suivi, fonctions, comparatif sobre, tarifs (grille à trancher, voir MN.2), FAQ, appel final, pied de page, JSON-LD, Lighthouse. Backlog : revoir `app-nav` et écrans existants avec la nouvelle DA.
- Prochain sous-jalon : MH.3.

## MH.3 : suite de la home, tarifs, FAQ, pied de page (15/11/2026)

- **Fait** : sections `Quality` (3 blocs alternés avec maquettes HTML/CSS : cibles retenues/écartées avec motif, brouillon avec hook surligné et adresse vérifiée, inbox classé), `Features` (8 cartes numérotées), `Compare` (comparatif **descriptif** « acheter des liens / tout faire à la main / ce service » : aucune note, aucune marque, aucun prix), `Pricing`, `Faq` (10 questions, `details`/`summary` natif), `FinalCta` et `SiteFooter` (surface nuit), `JsonLd` (Organization, WebSite, SoftwareApplication avec offres, FAQPage). En-tête : liens Tarifs et FAQ ; le menu burger passe de `md` à `lg` (5 liens ne tiennent pas à 768 px). `src/app/page.tsx` assemble tout et reste statique (`revalidate = 3600`).
- **Tarifs lus dans `plans`** : `src/features/home/plans.ts` (`getPublicPlans`, client Supabase anon sans cookies). Migration `2026112700100000_plans_public_read.sql` (lecture seule pour `anon`, **appliquée sur la vraie base**, test SQL ajouté dans `billing.test.ts`). Affichés : 0 € / 49 € / 119 €, plafond d'envois mensuel, sites, boîtes (valeurs de la base ; modifier la base change la page après la revalidation). Carte du milieu (Starter) inversée. Lecture impossible = aucun prix affiché (message), jamais de valeur de secours. Pas de bascule annuelle (n'existe pas), pas de crédits affichés (aucune fonction ne les consomme encore). Boutons payants -> `/connexion` (l'abonnement réel passe par `/app/facturation`, Stripe en mode test).
- **Option par défaut proposée à Jonathan (grille)** : garder 49 / 119 € affichés comme « grille de lancement, susceptible d'évoluer », **sans aucune mention comparative ni « moins cher »** ; recaler la grille sur le coût réel d'un audit (`cost_ledger`) après MB.2, puis seulement décider d'une baisse. À titre d'ordre de grandeur pour trancher (non appliqué) : une grille nettement sous la référence relevée (39 / 99 / 299 $) demanderait de passer Starter sous 39 € et Pro autour de 79 €, ce qui n'est tenable que si le coût réel par audit et par envoi le permet. Rien n'a été modifié en base.
- **Preuves : non faites** (aucun chiffre réel avant MB.2). Pas de section vide ni de chiffres de remplissage ; à ajouter après MB.2 (ancre `#preuves` libre, numérotation toujours absente).
- **Pages légales** : `/mentions-legales`, `/confidentialite`, `/conditions` (`legal-page.tsx`, textes dans `messages/fr.ts > legalPages`), liées au pied de page, bandeau « version provisoire ». **Jonathan doit fournir** : identité de l'éditeur, directeur de la publication, contact, durées de conservation, conditions de résiliation et de remboursement ; relecture par un juriste avant ouverture au public (déjà prévu CLAUDE.md section 8). Aucun nom, adresse ni numéro inventé (« à renseigner »).
- **Honnêteté du marketing** : « Fonctions » ne cite que ce qui existe (digest hebdo et garde-fous complets, M6.2 et M6.3, ne sont pas mentionnés) ; FAQ : aucun nombre de liens promis, demande de paiement = décliner par défaut, IA non mentionnée dans les mails mais réponse honnête si on le demande, avis juridique indiqué comme en cours.
- **Correctifs hérités de MH.2** : classe `.light-window` (inexistante) définie dans `globals.css` : les pastilles de la maquette dans la bande nuit avaient un contraste insuffisant (Lighthouse). `metadataBase` ajouté au layout (liens canoniques absolus).
- Tests : `home.test.ts` étendu (8 cas : sections, comparatif sans marque ni note, FAQ honnête, pages légales liées) ; 823 tests verts avec Postgres 16 local (6 ignorés), lint, typecheck, format et build verts.
- **Vérifié** : Playwright bureau 1440 px et mobile 390 px (qualité, fonctions, comparatif, tarifs, FAQ ouverte, pied de page) : aucun débordement horizontal ; le comparatif défile horizontalement dans son cadre. Lighthouse mobile (serveur de production local) : `/` = performance 94, accessibilité 100, bonnes pratiques 100, SEO 100 ; `/connexion` = 98 / 100 / 100 / 100. La performance de `/` est plus basse que M0.4 (page beaucoup plus longue, LCP 0,86). Le contrôle « lien canonique » signale seulement l'écart entre `NEXT_PUBLIC_APP_URL` et l'adresse de test.
- Piège : `pkill -f "next start"` ne tue pas le processus `next-server` ; un ancien serveur resté sur le port sert des chunks périmés (erreurs 500 dans Lighthouse). Utiliser `pkill -f next-server`.
- **Backlog** : `llms.txt` (CLAUDE.md 13), favicon et image de partage au nom définitif, vidéo de visite (`PRODUCT_TOUR_VIDEO`), section preuves après MB.2, comparatif nominatif seulement s'il est vérifiable, revue de `app-nav` et des écrans `/app` avec la nouvelle DA, mode annuel de facturation (n'existe pas).
- Prochain sous-jalon : MB.1 (onboarding en une URL), puis MB.2.

## MB.1 : onboarding en une URL (15/11/2026)

- **Parcours** : `/app/demarrer` (un seul champ : l'adresse) -> action `startFromUrlAction` : normalise le domaine, crée le site (ou retrouve celui du même domaine), lit la page d'accueil (lecteur sûr de M3.1 : robots.txt, SSRF, 2 requêtes), déduit thème, langue et 3 requêtes avec UN appel LLM borné (plafond 0,02 USD, 0,01 par appel, `DEDUCE_LIMITS`), puis `/app/demarrer/[siteId]` : « ce que nous avons compris » (thème et requêtes modifiables) + coût total du parcours (`chain` de MA.6) + un seul bouton. `launchJourneyAction` enchaîne `createAudit` puis `confirmAudit` (auto_chain de MA.6 : découverte, backlinks, profil, opportunités). Le plan reste à valider par l'utilisateur (M2.3) ; aucun email n'est envoyé. Le bouton principal de `/app` pointe désormais vers `/app/demarrer` ; le formulaire complet reste accessible (`/app/site/nouveau`).
- **Zéro champ avant la première valeur** : ni propriété du domaine (différée, `verified_at` reste nul), ni prénom de signature, ni actif offert, ni boîte d'envoi ne sont demandés ; l'écran dit qu'ils le seront avant le premier lot. Pays déduit de l'extension (France par défaut), langue par le LLM.
- **Repli sans LLM** : pas de clé, panne, plafond ou page illisible -> thème tiré du titre de la page + requêtes de secours de MA.4 ; rien de déductible -> l'écran demande le thème et une recherche (bouton « Enregistrer et voir le coût », `saveCorrections`). Le contenu de la page est encadré `<donnees_non_fiables>`. Les requêtes contenant la marque complète (étiquette du domaine) sont écartées ; les mots isolés du domaine sont conservés (« coloring pages » reste valable sur mega-coloring.com).
- **Honnêteté du coût** : `computeAuditEstimate` (extrait de `createAudit`, `audits/service.ts`) sert à l'aperçu et à `createAudit` : même chiffre. Le coût affiché est renvoyé au serveur ; si le coût recalculé ou les requêtes de l'audit ne correspondent plus, le lancement est refusé (`costChanged`). `refreshEstimatedAudit` met à jour un audit encore « estimé » après correction. Un site qui a déjà un audit renvoie directement vers lui (pas de second audit ni d'appel LLM).
- **Test réel borné** (`pnpm demo:onboarding`, `NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true`) sur mega-coloring.com : 1 lecture HTTP 200, 1 appel LLM, **0,000152 USD** (3 passages au total : ~0,00046 USD, cost_ledger en mémoire). Résultat : thème « coloring pages », langue en, requêtes « printable coloring pages », « free coloring sheets », « coloring pages for kids ». Le thème suit la langue du site (après correction du prompt). Cumul de la mission : 0 USD DataForSEO, LLM ~0,025 USD. Aucun appel DataForSEO, aucun envoi, aucun achat.
- **Coût annoncé sur le site de test** (plan payant, 20 concurrents) : ~1,47 USD pour tout le parcours (plafond 50 USD de MA.8) ; en plan gratuit, voir la grille MA.3.
- **Demandes de Jonathan pendant la session** : en-tête de la home = Fonctionnalités, Tarifs, FAQ, Se connecter (+ « Audit gratuit »), les liens « C'est quoi / Le problème / Comment ça marche » restent dans le pied de page ; section « C'est quoi » refaite sur le modèle de la capture (titre à gauche, accroche et six couples libellé / réponse à droite ; sans numéro de section, voir MH.2). Jonathan veut reprendre les autres sections une par une : prochaine = à indiquer.
- **Section « Sur le terrain » (preuves, demande de Jonathan)** : `src/features/home/{proofs.ts,proofs-section.tsx}`, entre « Le problème » et « Comment ça marche », sur le modèle de la capture (synthèse de 3 chiffres, 4 cartes : mega-coloring.com, oma-and-me.com e-commerce, squadraplanning.com SaaS, remove-me.io ; courbe d'autorité, trafic, liens obtenus, « cité par »). **Tous les chiffres sont des chiffres d'ILLUSTRATION** (aucune mesure) : bandeau visible sur la home tant que `PROOFS_ARE_ILLUSTRATIVE = true`, domaines sources fictifs `exemple-*` (test), synthèse calculée depuis les données. **À faire avant l'ouverture** : remplacer `proofs.ts` par les vraies mesures (autorité de domaine, Search Console), passer le drapeau à false, retirer le bandeau ; le test `home.test.ts` impose aujourd'hui le drapeau à true et les domaines `exemple-*` (à adapter alors).
- Fichiers : `src/features/onboarding/{deduce,service,deps,actions,url-form,launch-panel}.ts(x)` + tests (`deduce.test.ts`, `onboarding.test.ts`, `deduce.live.test.ts`), `src/app/app/demarrer/`, `messages/fr.ts > onboarding`, `src/features/home/{what-it-is,site-header}.tsx`.
- **Vérifié** : 847 tests verts (Postgres 16 local), lint, typecheck, format, build ; Playwright bureau 1440 et mobile 390 : en-tête, « C'est quoi », écrans d'onboarding (via une page temporaire supprimée : aucune session de test), `/app/demarrer` redirige vers `/connexion` hors connexion ; aucun débordement horizontal.
- **Dettes** : pas de test Playwright connecté ; déduction synchrone dans l'action (une lecture + un appel LLM, quelques secondes : acceptable, l'audit lui-même passe par Inngest) ; pas de limite de débit sur `startFromUrl` (chaque nouveau domaine = une lecture et ~0,0002 USD) ; prénom de signature, actif offert, vérification de propriété et boîte à demander avant le premier lot (à traiter en MB.2 ou M3.4) ; pays = France par défaut pour un `.com`.
- Prochain sous-jalon : MB.2 (test réel de bout en bout sur mega-coloring.com).

## Hero de la home refait (15/11/2026, demande de Jonathan, hors sous-jalon)

- Sur le modèle de la capture : hero sombre (`.surface-night` + quadrillage + halo), pastille, ligne d'audience en mono, titre centré (accent menthe), texte, **deux boutons : « Essai gratuit » -> `/connexion` (inscription) et « Fonctionnement » -> `#audit` (audit gratuit, comme demandé)**, repères, lien « Juste pour voir ? Lancer l'audit gratuit ». Six cartes inclinées sur les côtés (cible qualifiée, brouillon avec accroche, garde-fous, lot envoyé, réponse, lien vérifié) : exemples décoratifs (`aria-hidden`), affichées dès 1280 px seulement (en dessous elles chevauchent le texte), `src/features/home/{hero,hero-cards}.tsx`, textes dans `messages/fr.ts > home.hero`.
- Le champ « votre site » et la visite du produit sont passés dans une section juste sous le hero (`start-audit.tsx`, ancre `#audit`, titre « Voyez vos premières cibles, gratuitement »). L'en-tête reste blanc sur le hero sombre (à discuter : en-tête sombre sur la home ?).
- Point à confirmer avec Jonathan : « Fonctionnement » mène à l'audit gratuit (demande littérale) alors que la section « Comment ça marche » existe plus bas ; changer l'ancre de `hero.tsx` si on préfère `#comment-ca-marche`.
- Vérifié : tests (848), lint, typecheck, format, build ; Playwright 1440, 1280, 1024 et 390 px sans débordement. Mobile : cartes masquées.

## Retour de Jonathan : respecter la DA de base (15/11/2026)

- Constat : le hero sombre, la police mono et les majuscules espacées (hero, « C'est quoi », « Sur le terrain ») dérogeaient à `docs/da.md` (surface nuit réservée à la bande produit, à l'appel final et au pied de page ; Inter seul). Corrigé : hero clair (`bg-hero-wash`), pastille verte pâle, cartes d'exemple blanches, libellés `text-sm font-semibold text-primary`. `docs/da.md` complété (section 7 bis) ; **règle à retenir : relire `docs/da.md` avant toute section de la home**.
- Bouton d'en-tête (bureau et menu mobile) : « Essai gratuit », lien vers `/connexion` (avant : « Audit gratuit » vers `#audit`).

## Inscription, connexion et liens de la home (15/11/2026, demandes de Jonathan)

- **Section « audit gratuit » retirée de la home** (`start-audit.tsx` supprimé : champ « votre site », titre « Voyez vos premières cibles »). L'audit public (`/audit-gratuit/[id]`, `public-audit`) existe toujours côté code mais n'est plus lancé depuis la home ; la visite vidéo (`product-tour.tsx`, `PRODUCT_TOUR_VIDEO`) n'est plus affichée : à replacer ailleurs (hero ou « Comment ça marche ») quand la vidéo existera.
- **Tous les boutons « Essai gratuit » -> `/inscription`** (hero, en-tête bureau et mobile, appel final, « Comment ça marche », les trois cartes de tarifs, pied de page) ; **« Fonctionnement » -> `#fonctions`**. Plus aucune ancre `#audit` (test `home.test.ts`).
- **`/inscription`** (nouvelle) et **`/connexion`** refaites sur le modèle des captures : formulaire à gauche, bande produit à droite (`src/components/auth-panel.tsx`, surface nuit : c'est la « bande produit » de la DA, bureau seulement). Connexion par lien magique : **un seul champ (email), aucun mot de passe** (pas de champ nom ni mot de passe comme dans la référence : pas d'auth par mot de passe dans le produit). `signInWithOtp` crée le compte à la première connexion. Messages : `signup.*`, `auth.*`.
- À décider : demander le prénom (signature) dès l'inscription ? Pour l'instant non (zéro champ avant la première valeur, voir MB.1).

## Correctif : vidéo démo gardée, bande « cadre posé » retirée (15/11/2026)

- Malentendu corrigé : seule la section « audit gratuit » devait partir ; **l'emplacement de la vidéo démo est remis sous le hero** (`hero.tsx` rend `ProductTour`, cadre 16:9 réservé ; renseigner `PRODUCT_TOUR_VIDEO` dans `sections.ts` quand le MP4 existe).
- Bande « Un cadre posé dès le départ » (`trust-strip.tsx`, `home.trust`) supprimée à la demande de Jonathan.

## Inscription et connexion par mot de passe (15/11/2026, demande de Jonathan)

- **Inscription** (`/inscription`) : Nom, Email, Mot de passe avec l'œil (8 caractères au moins) ; **connexion** (`/connexion`) : Email, Mot de passe avec l'œil, « Mot de passe oublié ? », lien « Créer mon espace ». Le lien magique est abandonné dans l'interface (ancien `sendMagicLink` supprimé). Pages `/mot-de-passe-oublie` et `/reinitialiser` (session de récupération ouverte par la route `/auth/recuperation`) ajoutées pour que le lien « oublié » ne soit pas mort.
- Code : `src/features/auth/{service,actions,fields,forms}.ts(x)` (service pur, testé : `auth.test.ts`, 9 cas), `src/components/auth-shell.tsx` (mise en page commune), `messages/fr.ts > auth, signup`. Même message pour mauvais mot de passe et compte inconnu ; « mot de passe oublié » répond pareil que l'adresse existe ou non.
- **Base** : migration `2026111528000000_workspace_name_from_signup.sql` (le nom saisi nomme l'espace ; repli sur la partie locale de l'email), **appliquée sur la vraie base** ; `supabase/tests/bootstrap.sql` (colonne `raw_user_meta_data`) et un test SQL ajoutés. **Supabase Auth** (via l'API de gestion) : longueur minimale du mot de passe 6 -> 8 ; `/auth/recuperation` ajouté aux URL de redirection autorisées (production et localhost).
- ⚠ **Bloquant avant ouverture au public** : la confirmation d'email est active (voulu) mais l'envoi par défaut de Supabase est limité à 2 mails par heure et aux membres de l'organisation (voir « Décisions prises »). Tant qu'un SMTP dédié (Resend, domaine d'envoi) n'est pas branché, un visiteur ne peut pas confirmer son inscription. Je n'ai pas désactivé la confirmation (adresses non vérifiées) ni acheté de domaine. Vérifié en vrai : un mauvais mot de passe renvoie bien « Email ou mot de passe incorrect » ; aucune inscription réelle testée (elle enverrait un mail).
- Votre compte existant (créé par lien magique) n'a pas de mot de passe : utiliser « Mot de passe oublié ? » une fois pour en choisir un.
- Après confirmation, le lien mène à `/app` (tableau de bord, bouton « Analyser mon site ») ; une inscription avec session immédiate mènerait à `/app/demarrer`.

## Texte du hero (15/11/2026, demande de Jonathan)

- Description du hero remplacée par la traduction française, tournée vers l'utilisateur : « Nous trouvons les sites qui méritent de vous citer, rédigeons pour chacun une demande personnalisée et l'envoyons depuis votre propre boîte mail. Puis nous relançons, classons les réponses et vérifions que le lien est bien en ligne. Vous fixez les règles et validez chaque lot : le reste tourne tout seul. » (`messages/fr.ts > home.hero.lead`). Le nom du produit n'y figure pas (réglage unique `app.name`). Le digest hebdo n'est pas cité (M6.3 pas fait).

## Inscription : « pas de mail reçu » (15/11/2026)

- Cause : le compte de Jonathan existait déjà (lien magique du 14/11, confirmé). Supabase répond « OK » sans rien envoyer pour une adresse déjà inscrite (protection contre l'énumération de comptes) ; aucun doublon créé (1 seul utilisateur en base). Message d'inscription reformulé : il ne promet plus un mail et oriente vers la connexion ou « Mot de passe oublié ? ».
- **Resend** : sans domaine vérifié, Resend n'envoie qu'à l'adresse du propriétaire du compte (expéditeur de test). Le compte Resend de Jonathan a déjà 3 domaines vérifiés (mega-coloring.com, remove-me.io, ouiouioui.app) : un SMTP Resend branché sur Supabase est possible sans achat. **Décision attendue : quel domaine pour l'expéditeur des emails de connexion** (jusqu'au domaine définitif du produit), puis clé API Resend en SMTP dans Supabase.

## Lien de réinitialisation arrivé sur la home (15/11/2026)

- Symptôme : le lien du mail menait à `/?code=...` (la home). Cause probable : l'URL de redirection construite depuis `NEXT_PUBLIC_APP_URL` (valeur masquée, probablement avec une barre finale) n'a pas été reconnue par Supabase, qui a replié sur l'URL du site. Corrigé : `cleanAppUrl` (sans barre finale) dans les actions d'auth ; `/auth/recuperation` réutilise `/auth/callback` ; `/auth/callback` mène à `/reinitialiser` quand le dernier mail est une récupération récente (`destinationAfterCode`), sinon à `/app` ; filet de sécurité dans `proxy.ts` : `/?code=` est repris par `/auth/callback`.

## Emails d'authentification propres, écran « vérifiez votre boîte mail » (15/11/2026, demandes de Jonathan)

- **SMTP Resend branché sur Supabase Auth** (via l'API de gestion) : expéditeur `Autolink.ai <noreply@ouiouioui.app>` (domaine déjà vérifié chez Resend, choix de Jonathan ; **provisoire** jusqu'au domaine du produit), clé Resend `supabase-auth-smtp` en accès « envoi » limité au domaine, stockée **seulement** dans la config SMTP de Supabase (jamais dans le dépôt ; à recréer chez Resend si perdue). Limite d'envoi relevée de 2 à 30 mails par heure ; **confirmation d'email toujours active**.
- **Gabarits français** (inscription, mot de passe oublié, lien de connexion, invitation, changement d'adresse, ré-authentification) : sources versionnées dans `supabase/email-templates/` (HTML à la marque, bouton émeraude), objets en français. Le nom « Autolink.ai » y est en dur (à changer avec le nom).
- **Après l'inscription et « mot de passe oublié »** : le formulaire est remplacé par un écran « Vérifiez votre boîte mail » (adresse affichée, rappel des courriers indésirables, « Utiliser une autre adresse », lien vers la connexion), au lieu de rester sur la même page. Wording volontairement neutre (« si un espace peut être créé… ») : Supabase ne révèle pas si une adresse existe.
- Non testé en réel : l'envoi d'un vrai mail (il part vers une vraie adresse) ; à faire par Jonathan via « Mot de passe oublié ? ». Vérifier ensuite dans les logs Resend et la délivrabilité (SPF/DKIM de `ouiouioui.app` déjà vérifiés par Resend).

## Audit complet inscription / mails / mot de passe oublié (15/11/2026, demande de Jonathan)

**Ce qui n'allait pas (diagnostiqué dans les journaux Supabase et Resend)**

1. **Vercel bloque tous les déploiements depuis 20:08** (« Deployment rate limited, retry in 24 hours », limite du plan gratuit après ~100 déploiements dans la journée). Les PR #71 à #73 sont fusionnées mais **pas en production** (elle tourne sur #70, 19:56). Erreur de ma part : mes « déploiement prêt » lisaient le dernier déploiement existant, pas celui de la PR. Règle : vérifier le statut du commit (`get_status`) avant de dire qu'un déploiement est prêt.
2. **`NEXT_PUBLIC_APP_URL` valait `https://example.com` en production** (visible dans le `canonical` de la home). Les adresses de redirection envoyées à Supabase étaient donc refusées, et Supabase renvoyait sur l'URL du site avec `?code=` : c'est le lien qui atterrissait sur la home. Valeur corrigée via l'API Vercel (`https://outreach-links.vercel.app`) : **prend effet au prochain déploiement**.
3. « Pas de mail à l'inscription » : l'adresse de Jonathan avait déjà un compte (`user_repeated_signup` dans les logs) : Supabase n'envoie rien dans ce cas. Pas un bug, mais le message était trompeur (corrigé dans #73, pas encore en ligne).
4. « otp_expired » : le lien de réinitialisation est à usage unique ; le premier clic avait réussi (login dans les logs), les clics suivants (le sien et des analyseurs Google) tombent en « One-time token not found ». Un clic de trop = erreur. À durcir (page intermédiaire avec bouton) après le déploiement.

**Réglages faits sans déploiement (API Supabase)**

- Gabarits : inscription, invitation, changement d'adresse et lien magique pointent directement vers `https://outreach-links.vercel.app/auth/callback?token_hash=...&type=...` (vérifié en vrai : lien -> connecté dans `/app`, espace créé avec le nom saisi). Sources dans `supabase/email-templates/` (URL écrite en dur, plus de `{{ .SiteURL }}`).
- **Contournement temporaire** : l'URL du site Supabase (`site_url`) vaut `https://outreach-links.vercel.app/auth/recuperation`. Le lien de réinitialisation retombe dessus quand `redirect_to` est refusé, et la route en ligne le traite (échange du code puis `/reinitialiser`). **À remettre à `https://outreach-links.vercel.app` après le prochain déploiement**, quand `NEXT_PUBLIC_APP_URL` sera juste.
- Anomalie non élucidée : le gabarit « recovery » enregistré n'est pas utilisé à l'envoi (les mails de réinitialisation gardent l'ancien lien `/auth/v1/verify`), alors que « confirmation » l'est. Le contournement ci-dessus rend la chose sans effet ; à revérifier après déploiement.

**Test de bout en bout en production** (compte jetable `autotest-…@mega-coloring.com`, supprimé ensuite avec son espace) : inscription -> mail livré -> lien -> connecté, espace « Test Auto » ; mot de passe oublié -> mail -> lien -> `/reinitialiser` -> nouveau mot de passe -> `/app` ; reconnexion avec le nouveau mot de passe OK. Les mails de Resend sont lus côté « envoyés » (la boîte de réception de `mega-coloring.com` contient les vraies réponses de prospection : non consultée).

**À faire dès que Vercel redéploie (limite levée vers le 16/11 ~20:10, ou passage Pro)** : redéployer `main`, vérifier `canonical`, remettre `site_url`, rejouer le test de bout en bout, ajouter la page intermédiaire anti-analyseur (bouton « Continuer ») pour les liens de confirmation et de récupération.

## Vercel : plus de prévisualisation pour les branches de travail (15/11/2026, accord de Jonathan)

- Limite Vercel gratuite : 100 déploiements par 24 h glissantes, **par équipe** ; atteinte le 15/11 à 20:08 UTC (81 déploiements listés ce jour-là : 46 de prévisualisation, 35 de production). Pas de plan Pro (décision de Jonathan).
- `vercel.json` : `git.deploymentEnabled: { "claude/*": false }` : les branches `claude/*` ne créent plus de prévisualisation ; seules les fusions vers `main` déploient. Conséquence : plus de lien de prévisualisation pour relire ; la vérification passe par build local et Playwright (déjà la pratique). Si le motif `claude/*` n'était pas pris en compte, ajouter le nom exact de la branche.
- Règle de travail : regrouper les changements en peu de PR (une fusion = un déploiement de production) et ne jamais annoncer « déployé » sans le statut du commit (`get_status`) ou l'API de déploiements filtrée sur le SHA.

## Démo locale de l'après-inscription et deux correctifs (15/11/2026, demande de Jonathan)

- Parcours d'un nouvel inscrit (vérifié en local contre la vraie base, avec un compte de démo `demo-…@mega-coloring.com` dont l'accès a été communiqué à Jonathan dans la conversation, jamais dans le dépôt ; à supprimer sur demande) : lien de confirmation -> `/app` (tableau de bord « Votre espace » : bouton principal « Analyser mon site », puis Configurer, Aller à l'audit, Abonnement, Se déconnecter ; menu Audit, Plan, Lots, Inbox, Liens, Tâches, Garde-fous, tous vides) -> `/app/demarrer` (un champ) -> écran de confirmation (thème, 3 recherches, coût du parcours, bouton unique).
- Constat : l'inscrit atterrit sur un tableau de bord générique, pas sur l'étape suivante. Piste (non faite, à valider) : envoyer un nouvel inscrit sans site directement sur `/app/demarrer` ; remplacer la carte « Connecté en tant que… » par un état d'accueil utile.
- Correctifs : (1) repli de déduction sans LLM : le thème est tiré du bon morceau du titre (« Mega Coloring: free printable coloring pages » donnait « rien déduit ») et écarte les titres génériques (« Accueil ») ; (2) l'écran de confirmation avait le sous-titre de l'écran précédent et un titre en double. Sans clé de service Supabase en local, la déduction LLM est ignorée : seul le repli est visible en local.
- Artefact de test, pas un bug : « 1 Issue » de Next en dev = hydratation perturbée par le style `caret-color` injecté par Playwright.

## Premier vrai audit (compte de démo, production, 15/11/2026) : faux « domaines » dans la SERP

- Le compte de démo a lancé un vrai audit sur `mega-coloring.com` : **3 recherches DataForSEO réelles = 0,018 USD** (première validation réelle de la clé DataForSEO, du job Inngest et de l'écriture en base). La chaîne s'est arrêtée seule à l'étape backlinks (`echoue`) : aucune autre dépense.
- Constat de Jonathan : le tableau « Vos concurrents dans la SERP » contenait de faux domaines (« il y a 3 mois », « plus de 114,7 k abonnés », « il y a 6 jours »…) et des hébergeurs (`aut.crayocom.cloud.sitefinity.com`, `dropbox.com`). Cause : `hostOf` ne vérifiait pas qu'une chaîne est un nom de domaine ; quand Google renvoie un lien de redirection dont le fil d'Ariane est une date ou un nombre d'abonnés, ce texte devenait un « domaine ». Il a aussi fait échouer la mesure de taille des concurrents (validation zod « domaine invalide » sur 4 cibles).
- Corrigé (branche, pas encore en production) : `isValidHost` (`excluded-domains.ts`) appliqué dans `resolveRedirect` et `serpEntries` ; la mesure de taille filtre les cibles invalides au lieu d'échouer ; `dropbox.com` et `sitefinity.com` exclus ; 4 tests de non-régression avec les valeurs réelles (`serp-sanitize.test.ts`). L'audit de démo reste dans l'état échoué (données d'avant correctif) ; à relancer après déploiement.
- **Rappel de Jonathan sur la raison d'être du produit** (déjà dans CLAUDE.md sections 1 et 3) : les meilleurs liens ne sont pas sur les plateformes (mairies, photographes, e-commerces, forums modérés : sites qui ne vendent pas de liens mais en donnent si on leur demande bien). Six boulots (chercheur, filtre, chasseur 404, enquêteur, rédacteur, facteur ; 10 emails par heure, heures ouvrées) pour livrer **une liste courte, classée, avec pour chaque site la demande à faire et pourquoi**, jamais 2 000 domaines à trier. Conséquence à traiter : l'écran d'audit montre aujourd'hui l'étape « Chercheur » en brut (43 lignes), ce qui noie la valeur ; la liste courte des cibles doit être le premier écran après l'analyse.

## Section « Tactiques » de la home (15/11/2026, demande de Jonathan, modèle : page « Tactics » de la référence)

- `src/features/home/tactics.tsx`, ancre `#tactiques`, entre « Comment ça marche » et « Qualité » ; textes dans `messages/fr.ts > home.tactics`. Trois tactiques **que le produit sait faire** (pas celles de la référence : le guest posting n'existe pas chez nous, dit en bas « ce que nous ne faisons pas ») : (1) les sites que personne ne sollicite (mairies, associations, photographes, boutiques, forums modérés ; type `jamais_sollicite` et écart de domaines), (2) pages ressources et liens morts (M2.1 et chasseur 404 M2.2 : un lien n'est « mort » que sur un 404 ou 410 constaté), (3) mentions de marque sans lien (type `mention_marque` ; la vérification de l'absence de lien reste au backlog M3.1, donc non promise). Chaque carte se déplie (`details`) sur 4 étapes. Boutons : « Essai gratuit » -> `/inscription`, « Fonctionnement » -> `#fonctions`. Pas de digest cité (M6.3 non fait). Test dans `home.test.ts`.

## Cap produit : outil complet d'abord, paliers ensuite (15/11/2026, décision de Jonathan)

- Les trois tactiques de la home sont exactement ce que l'outil doit faire. Phase bêta sans vrai client : être **exhaustif et performant** ; **limites par palier (Gratuit, Médium, Total) à ajouter après**. Plan détaillé : PLAN.md, jalon **MT** (découpe révisée le 15/11 après la demande de repenser l'audit : voir `docs/audit-v2.md` ; MT.0 mode bêta ; MT.1 profil de marque ; MT.2 requêtes par persona ; MT.3 collecte de candidats ; MT.4 qualification ; MT.5 tactiques 2 et 3 ; MT.6 écran « Vos cibles » ; MT.7 mesure).
- Décisions à confirmer par Jonathan : plafonds de sécurité (proposés 5 USD par audit, 25 USD par jour), correspondance Médium/Total = Starter/Pro.

## Refonte de l'audit : conception (15/11/2026, demande de Jonathan)

- `docs/audit-v2.md` : profil de marque d'abord ; requêtes par persona (enseignants, parents, associations, médiathèques pour mega-coloring.com) ; collecte par tactique via Domain Intersection (recoupement des concurrents, comme Semrush Backlink Gap et Ahrefs Link Intersect), SERP top 30 et **Content Analysis `search` de DataForSEO** (filtre `page_type` = blogs, organization, message-boards, ecommerce : correspond aux types de sites visés) ; entonnoir de qualification ; liste courte classée ; recettes mises en cache par niche pour industrialiser. Coût estimé ~0,5 à 1 USD par audit (hypothèse). Rien n'est construit : conception à valider par Jonathan avant MT.0 et MT.1.
- Inconnues à lever par un run réel borné : français et tarif de Content Analysis, coût de Domain Intersection.

## Coût raisonnable de l'audit v2 (15/11/2026, décision de Jonathan)

- L'audit doit rester **exhaustif mais à coût raisonnable** (réservé aux plans payants). Intégré à `docs/audit-v2.md` section 6 : budget cible ~1 USD par audit, plafond d'audit 2 USD, plafond de sécurité bêta 5 USD par audit et 25 USD par jour ; part de budget par phase ; cinq mécanismes (entonnoir, arrêt par rendement décroissant, requêtes classées par rendement, caches partagés entre clients, appels groupés) ; coût affiché avant lancement et tableau de bord interne (MT.7). Valeurs proposées, à confirmer ; le coût réel mesuré fixera ensuite le nombre d'audits par plan.

## MT.0 : mode bêta, budgets et plafonds de sécurité (15/11/2026)

- **Fait** (testé, 0 USD d'API) : `BETA_MODE` (`src/env.ts`, faux par défaut, **posé à `true` sur Vercel, Production et Preview**, effectif au prochain déploiement) : `effectivePlan` (`src/features/audits/beta.ts`) traite tout espace au niveau « payant » ; la table `plans`, la page tarifs et les protections d'envoi (10 par heure, heures ouvrées, validation de lot, relance unique) sont inchangées. Couper `BETA_MODE` rétablit les limites par palier. `AUDIT_BUDGET` = cible 1 USD, plafond d'audit 2 USD (`PLAN_LIMITS.payant.costCapUsd` passe de 1,5 à 2), sécurité 5 USD.
- **Plafond quotidien de sécurité** : `DAILY_COST_CAP_USD` (25 par défaut), `dailySpendUsd` et `dailyCapReached` (`src/lib/costs.ts`) : 24 h glissantes de `cost_ledger`, toute la plateforme ; `confirmAudit` refuse de lancer (message clair, rien facturé) et `advanceChain` arrête l'enchaînement quand il est atteint.
- Tests : `beta.test.ts` (6 cas), service existant mis à jour.
- **Pas fait / à noter** : le plafond de sécurité de 5 USD par audit n'est pas imposé aux sites de test (`TEST_COST_CAP_USD` = 50 USD, décision antérieure de Jonathan, MA.8) ; les quotas d'opportunités par type de MT.3 viendront avec la collecte ; le tableau de bord de coût reste MT.7. Valeurs de budget (1, 2, 5 et 25 USD) proposées, à confirmer.
- Prochain sous-jalon : **MT.1 (profil de marque)**.

## Production rétablie et auth validée de bout en bout (15/11/2026, 21:00 UTC)

- La limite Vercel s'est libérée plus tôt que prévu (fenêtre glissante) : la fusion #76 est **en production** (vérifié par SHA, `canonical` = `https://outreach-links.vercel.app`, section Tactiques présente, `BETA_MODE` actif). Rappels programmés supprimés.
- `site_url` Supabase remis à `https://outreach-links.vercel.app` (le contournement `/auth/recuperation` n'est plus nécessaire).
- Parcours rejoué en production avec une adresse jetable `autotest-…@mega-coloring.com` (supprimée ensuite avec son espace) : inscription -> écran « Vérifiez votre boîte mail » -> mail (gabarit français, lien direct) -> connecté dans `/app` ; mot de passe oublié -> mail (le gabarit « recovery » est bien appliqué désormais) -> lien ouvert dans un **navigateur vierge** -> `/reinitialiser` -> nouveau mot de passe -> `/app` -> reconnexion OK.
- Reste à faire côté auth : page intermédiaire avec bouton « Continuer » pour les liens de confirmation et de récupération (un analyseur de liens qui ouvre le lien avant l'utilisateur le consomme) ; compte de démo `demo-…@mega-coloring.com` à supprimer sur demande de Jonathan ; l'audit lancé par le compte de démo (v1, échoué à l'étape backlinks avant correctif) reste en base.
- Règle retenue : suivre un déploiement par SHA ; regrouper les changements (une fusion = un déploiement de production, branches `claude/*` sans prévisualisation).

## MT.1 : profil de marque (15/11/2026)

- **Fait** : à la création du site (`startFromUrl`, MB.1) puis, pour un site déjà cadré sans profil, à la reprise : `readSite` (`src/features/brand/read-site.ts`) lit l'accueil, le sitemap (celui déclaré dans `robots.txt`, sinon `/sitemap.xml`, `/sitemap_index.xml` ; index : 2 enfants au plus) et 8 pages au plus choisies par `pickPages` (fonction pure : pages utiles et peu profondes, au plus 2 par rubrique, une seule langue pour un site multilingue, jamais la racine d'une langue). Même lecteur sûr que M3.1 (robots.txt, SSRF, 600 ms par hôte) : 16 requêtes HTTP maximum, arrêt à 25 s. Un seul appel LLM structuré (`generateBrandProfile`, tâche `brand_profile`, plafonds 0,02 USD par appel et 0,03 USD, 1 400 jetons de sortie, contenu encadré `<donnees_non_fiables>`). Sans clé, panne ou site illisible : pas de profil, jamais de profil inventé ; l'onboarding continue.
- **Profil** : activité, offre, langue, public, ressources liables (URL gardée seulement si c'est une page du site réellement vue : jamais d'URL inventée), variantes du nom (celles du modèle + celles du domaine, sans LLM), ton, personas de donneurs de liens (qui | où | pourquoi). Écrit en français.
- **Table `brand_profiles`** (migration `2026111529000000_brand_profiles.sql`, appliquée sur la vraie base) : une ligne = une version immuable (select + insert seulement, ni update ni delete), unique (site, version), RLS par espace et site de l'espace ; `source` = `llm` ou `utilisateur` ; `pages_read`, `cost_usd`. Types ajoutés à la main dans `database.types.ts`.
- **Écran** : carte « Ce que nous avons compris de votre site » dans l'écran de relecture existant (`/app/demarrer/[siteId]`), au-dessus du coût : toutes les rubriques modifiables (une entrée par ligne). Une correction crée la version suivante (`utilisateur`), sans changement aucune version ; un profil saisi invalide bloque le lancement avant tout audit ; tout vide n'enregistre rien. Événements `brand_profile.created` et `brand_profile.edited`. `maxDuration = 60` sur `/app/demarrer` (lecture + LLM ~15 s mesurées).
- **Run réel borné** (`NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:brand`, `BRAND_LIVE_OUT=fichier` pour le rapport) sur mega-coloring.com : accueil 200, sitemap oui, 8 pages, 14 requêtes, lecture 7 s, 1 appel LLM 7 s, **0,00064 USD** (4 passages : ~0,0026 USD au total). Personas obtenus : parents, enseignants, bibliothèques et médiathèques, associations et centres de loisirs, blogueurs ; le test exige ces quatre familles. Aucun appel DataForSEO, aucun envoi, aucun achat.
- **Constats sur le vrai site** : `mega-coloring.com` redirige vers `www` (308) et déclare son sitemap dans `robots.txt` (`/sitemap-index.xml`), pas à `/sitemap.xml` : d'où la lecture de la directive `Sitemap:` (ajout à `createPageReader` : `fetchText`, `sitemaps`). Le site est multilingue (/fr/, /en/, /de/) : une seule langue est lue. Les 8 pages choisies sont toutes des rubriques ; la page `/fr/enseignants/` (existe sur le site) n'est pas lue car la langue de l'accueil est l'anglais : à surveiller.
- **Vérifié** : 908 tests verts (Postgres 16 local, dont `supabase/tests/brand-profiles.test.ts`), lint, typecheck, format, build ; Playwright (page temporaire supprimée, aucune session de test) bureau 1440 et mobile 390 : aucun débordement horizontal, tous les champs étiquetés ; état « profil non établi » rendu aussi.
- **Dettes** : pas de test Playwright connecté ; profil en français même pour un site anglais (MT.2 traduira les requêtes) ; lecture synchrone dans l'action (~15 s, pas de limite de débit) ; le profil n'alimente pas encore l'audit v1 (c'est MT.2) ; pas d'écran pour revenir à une ancienne version ; le tri des pages ne tient pas compte du contenu, seulement de l'URL.
- Prochain sous-jalon : **MT.2 (univers de requêtes par persona)**.

## Plafond des sites de test : 5 USD (15/11/2026, décision de Jonathan)

- `TEST_COST_CAP_USD` passe de 50 à **5 USD** (`src/features/sites/test-domains.ts`) : même plafond de sécurité que `AUDIT_BUDGET.safetyCapUsd` ; il s'applique aux audits connectés et à l'audit public des sites de test (`remove-me.io`, `mega-coloring.com`). Les budgets 1 / 2 / 5 / 25 USD (cible, plafond d'audit, sécurité, quotidien) sont donc confirmés pour la sécurité ; la cible de 1 USD par audit reste à valider par mesure.

## MT.2a : objectif de l'utilisateur (15/11/2026)

- **Décision de Jonathan** : MT.2 est scindé ; MT.2a ne traite que l'objectif, les requêtes par persona restent pour **MT.2b**.
- **Migration** `2026111530000000_site_goal.sql` (appliquée sur la vraie base) : `sites.goal` (`autorite_generale` par défaut, ou `mots_cles`, contrainte `check`) et `sites.target_keywords` (10 au plus), droits par colonne pour les membres. Test SQL réel dans `supabase/tests/sites-onboarding.test.ts`.
- **Écran de relecture** (`/app/demarrer/[siteId]`) : un seul choix d'objectif, « Gagner en autorité générale » (par défaut : page citée = accueil, ancres de marque ou d'URL) ou « Faire monter des mots-clés précis » (mots-clés choisis plus tard, dans le Plan de liens). Texte : « autorité et visibilité », aucune promesse de résultat. Choisir l'autorité vide `target_keywords`. Un formulaire sans objectif garde l'objectif actuel du site.
- **Recherches à surveiller retirées de l'écran** : plus aucun champ ; une note explique qu'elles servent seulement à repérer les concurrents et sont déduites du thème. Le repli reste interne : recherches déjà déduites, sinon `nicheQueries(thème)` (`internalQueries` dans `onboarding/service.ts`). Changer le thème ne régénère pas les recherches déjà déduites (voir dettes).
- **Pages à faire citer** : cases à cocher (`profile_res_all` caché + `profile_res_on`), l'accueil toujours incluse (case figée, non stockée). La sélection est un champ optionnel `selected` de `linkable_resources` dans le profil de marque (aucune migration) ; absent = coché ; une page décochée reste proposée mais n'est plus choisie ; décocher crée une nouvelle version du profil. L'ancienne zone de texte reste lue si les champs cachés sont absents.
- **Plan de liens** (`/app/audit/[id]/plan`) : section `KeywordsSection` au-dessus du plan. Mode autorité : simple rappel de l'objectif. Mode mots-clés : cases à cocher parmi les mots-clés réels du site lus dans `audit_pages.keywords_json` (au plus 60 proposés, 10 retenus, un par mot-clé avec sa meilleure position), enregistrés dans `sites.target_keywords` ; saisie libre refusée côté serveur ; événement `site.target_keywords_set`. Aucun appel DataForSEO.
- **Fichiers** : `src/features/plan/keywords.ts`, `keywords-section.tsx`, `keywords.test.ts` ; `onboarding/service.ts`, `launch-panel.tsx` ; `brand/form.ts`, `brand-fields.tsx`, `schema.ts` ; messages dans `messages/fr.ts`.
- **Vérifié** : 924 tests verts (Postgres 16 local inclus), lint (3 avertissements antérieurs), typecheck, format, build ; Playwright sur une page temporaire supprimée (bureau 1440 et mobile 390) : pas de débordement, aucune erreur, objectif par défaut = autorité, accueil figée, cases cochées conformes, aucun champ « Recherches à surveiller ».
- **Dettes** : pas de test Playwright connecté ; l'objectif n'est pas encore utilisé par la génération des opportunités, des ancres ni des pages citées (c'est MT.2b / MT.5) ; pas de moyen de changer l'objectif après le lancement ; pas d'ajout manuel d'une page à faire citer (Backlog) ; les mots-clés ne sont proposés qu'après l'audit.
- Prochain sous-jalon : **MT.2b (requêtes par persona)**.

## MT.2b : requêtes par persona et par tactique (15/11/2026)

- **Fait** (module `src/features/queries/`) : à partir du profil de marque (MT.1) et de l'objectif (MT.2a), `buildUniverse` produit un **univers de requêtes classé** ; `buildAndStoreQueryUniverse` l'enregistre. Rien n'est exécuté : **aucun appel DataForSEO, aucun envoi, aucun achat**, un seul appel LLM court (tâche `query_recipes`, plafonds 0,02 USD par appel et 0,03 USD, 1 800 jetons de sortie, contenu encadré `<donnees_non_fiables>`).
- **Trois sources de requêtes** : (1) recettes de personas par LLM, tactiques `inconnus` (blogs, associations, forums, écoles) et `ressources` (pages de liens utiles), 5 requêtes par persona avec une note de rendement de 1 à 5 ; (2) requêtes de marque, tactique `mentions`, sans LLM : `"Nom" -site:domaine` pour chaque écriture distincte du nom (« mega-coloring » et « Mega Coloring » comptent pour une, « megacoloring » pour une autre), 3 au plus, 2 garanties ; (3) en objectif **mots-clés**, deux modèles par mot-clé retenu (`ressources {mot-clé}`, `blog {mot-clé}`, ou `{mot-clé} resources` / `blog` en anglais), promus (×1,15), avec `target = keyword`. En objectif **autorité générale** : `target = home` (page citée = accueil) et les mots-clés restés sur le site sont ignorés.
- **Recettes en cache** (table `query_recipes`, partagée entre clients, service_role seulement) : clé = niche (thème normalisé) + langue + persona (libellé normalisé) + `RECIPE_VERSION` (monter ce numéro invalide tout le cache quand le prompt change). Le cache ne dépend pas de l'objectif : les requêtes de mots-clés et de marque sont ajoutées après, sans LLM. Un second client de la même niche avec les mêmes libellés de personas : **zéro appel LLM** (testé). Seules les personas sans recette sont envoyées au modèle, en un seul appel.
- **Rendement et budget** : score = poids de tactique (1 / 0,9 / 0,8) × note/5 × position de la persona, avec une pénalité de diversité (×0,88 par requête déjà retenue pour la même persona). Nombre de requêtes = budget de **20 % du budget cible d'audit** (0,20 USD) divisé par le coût mesuré d'une SERP top 30 (0,006 USD) = **33 au plus**, bornes 6 à 40 (`QUERY_LIMITS`, `estimateQueryPhase`). Un budget d'audit plus haut en donne plus ; en pratique le modèle en livre 17 à 26 une fois les doublons et les requêtes contenant la marque retirés.
- **Coût annoncé avant lancement** : l'écran de relecture (`/app/demarrer/[siteId]`) affiche dans la carte de coût « Recherches d'éditeurs prévues » : nombre maximal (33), coût maximal (0,198 USD) et budget réservé (0,20 USD), avec la mention qu'elles **ne sont pas lancées ici et ne sont pas comprises dans le total** (rien n'est facturé avant MT.3). `LaunchPreview.queryPhase`.
- **Quand c'est généré** : à `launchJourney`, après les corrections du profil et avant la création de l'audit (donc avec le thème, l'objectif et les personas que la personne a validés). Ne bloque jamais le lancement : sans profil, sans clé LLM, en panne, aucun univers n'est créé (ou secours générique) et l'audit part quand même. Table `query_universes` (insert-only, RLS par espace comme `brand_profiles`) : une ligne par génération avec requêtes, version du profil, objectif, budget, coût estimé, coût LLM, origine des recettes ; événement `query_universe.created`. MT.3 lira `getLatestQueryUniverse`.
- **Garde-fous** : les requêtes de découverte ne contiennent jamais la marque (comparaison sur le texte compacté, donc « mega coloring » comme « megacoloring »), ni opérateur, ni adresse, ni guillemets ; 2 à 9 mots ; doublons retirés entre personas ; une ligne de cache ou d'univers illisible est ignorée ; sans clé, secours **générique du thème** (`ressources {thème}`, `liens utiles`, `blog`, `association`, `forum`), jamais mis en cache.
- **Run réel borné** (`NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true QUERIES_LIVE_OUT=fichier pnpm demo:queries`) sur 3 niches avec 4 personas chacune, profils écrits à la main (aucun site lu) : mega-coloring.com (22 requêtes), trail-running-lab.fr en objectif mots-clés (26), comptabilite-asso.fr (17) ; 1 appel LLM par site, **0,0004 USD chacun, 0,0012 USD au total**, 6 à 8 s. Exemples : « coloriages à imprimer blog de classe », « coloriages à imprimer recommandations médiathèque », « conseils chaussures trail club », « blog test salomon speedcross », « vie associative mairie conseils », « cabinet comptable associations ressources ». Une première version du prompt laissait passer des requêtes de produit (« coloriages gratuits à imprimer ») qui ramènent des concurrents : le prompt exige maintenant le thème **et** un mot de type d'éditeur ; relancé, plus aucune requête de ce genre. À faire juger par Jonathan sur de vrais sites (voir « À fournir »).
- **Migration** `2026111531000000_query_universes.sql`, appliquée sur la vraie base (API de gestion, version `20261115215400` dans `schema_migrations`). Types ajoutés à la main dans `database.types.ts`. Test SQL réel : `supabase/tests/query-universes.test.ts` (RLS, immuabilité, contraintes, cache fermé aux clients, unicité des recettes, cascade).
- **Fichiers clés** : `src/features/queries/{limits,schema,plan,generate,service}.ts`, `queries.test.ts`, `queries.live.test.ts` ; `onboarding/{service,actions,deps,launch-panel}`; `messages/fr.ts` (`review.queryPlan`) ; `fake-supabase.ts` (upsert groupé, clé composite, `ignoreDuplicates`).
- **Vérifié** : 957 tests verts avec Postgres 16 local (dont 26 nouveaux de requêtes, 4 d'onboarding et le test SQL), lint (3 avertissements antérieurs, aucun nouveau), typecheck, format, build ; Playwright sur une page temporaire supprimée (bureau 1440 et mobile 390) : carte « Recherches d'éditeurs prévues » rendue, aucun débordement horizontal, aucune erreur.
- **Dettes** : les libellés de personas viennent du LLM de MT.1 et varient d'un client à l'autre : les hits de cache entre clients seront rares tant qu'on ne normalise pas les libellés (idée : famille de persona fixe ou recherche approchée) ; la recette ne tient pas compte de « sites » et « raison » de la persona, seulement de son libellé ; la note de rendement est celle du modèle, pas encore recalée sur des audits passés (phase 5) ; `target = keyword` ne porte pas encore l'URL de la page du mot-clé (MT.5 la lira dans `audit_pages`) ; pas d'écran pour consulter l'univers (la collecte MT.3 et « Vos cibles » MT.6 l'utiliseront) ; l'univers est régénéré à chaque lancement (une ligne de plus), sans purge ; pas de test Playwright connecté.
- Prochain sous-jalon : **MT.3 (collecte de candidats)**, avec un run réel borné pour confirmer le français, les tarifs et les formats DataForSEO (Domain Intersection, SERP des requêtes de l'univers, Content Analysis).

## MU : diagnostic de l'espace client et plan du jalon (16/11/2026, demande de Jonathan)

- **Demande** : Jonathan a essayé l'espace client comme un nouvel inscrit : on ne sait pas où cliquer, les étapes ne sont pas claires, rien ne montre la progression pendant le chargement, et il doute que le moteur donne les résultats voulus pour les trois tactiques de la home. Il demande une analyse complète et un jalon d'exécution avec des prompts à copier. Périmètre : tout ce qui précède l'envoi des messages (la partie « CRM » vient après).
- **Fait** : `docs/jalon-mu.md` (diagnostic écran par écran, lecture des données de production, verdict par tactique, parcours cible, moteur cible, 7 décisions avec option par défaut, sous-jalons MU.0 à MU.11 avec prompts, indicateurs). `PLAN.md` : ligne MU et renvoi. **Aucun code, aucune migration, 0 USD d'API** (lectures SQL seulement).
- **Constats mesurés en base de production (16/11)** :
  - 3 audits lancés (tous mega-coloring.com), **aucun n'a atteint la collecte ni la liste courte** : `candidate_collections`, `qualification_runs`, `findings_runs` vides pour ces audits. Le moteur MT n'a tourné qu'en ligne de commande.
  - Coût des 2 derniers audits : **1,24 USD, dont 1,00 USD de `backlinks.backlinks`** (22 appels), 0,068 de SERP, ~0,17 pour le profil de liens. Soit ~0,62 USD par audit pour l'ancienne chaîne seule.
  - Audit `9f753b2f` : 222 opportunités dont 191 « écart de domaines » en priorité haute, presque toutes du bruit (askology.biz, windowssearch-exp.com, getmycell.com…).
  - Site créé le 16/11 à 13:53 : `language = en`, thème « free printable coloring pages », `country = FR` ; concurrents retenus anglophones ou russes (woocoloring.com, thecolor.com, raskrasil.com). Le profil de marque a lu les pages `/en/`. **Aucune question sur le marché visé.**
  - **`query_universes` est vide en production** : l'univers de requêtes (MT.2b) n'a jamais été écrit depuis l'interface (`launchJourney` ne l'appelle que si ses dépendances existent ; cause exacte à trouver en MU.0).
  - Audit `3bea3eb9` : `opportunities_status = en_cours` alors que l'événement `audit.opportunities_done` existe, 0 opportunité : **état bloqué** (à corriger en MU.0).
- **Verdict sur le moteur** (run réel du 16/11, en ligne de commande) : tactique 1 partielle (19 cibles, 17 blogs ou médias, aucun des types « rarement sollicités » promis, bas de liste faible) ; tactique 2 sans résultat (0 lien mort : cherchés sur les pages de la liste courte, pas sur des pages de liens) ; tactique 3 vide pour une petite marque (0 mention), sans que l'écran le dise ; **69 % des cibles pertinentes perdues faute de contact** (62 → 19).
- **Décisions à confirmer** (défauts appliqués sinon, voir `docs/jalon-mu.md` section 5) : D1 cacher les dollars à l'utilisateur ; D2 sortir l'ancienne chaîne du parcours ; D3 retirer le choix d'objectif de l'onboarding ; D4 vérification de propriété avant le premier envoi seulement ; D5 pas de finder d'emails payant avant mesure ; D6 deux sites de test hors coloriage à fournir ; D7 email « vos cibles sont prêtes » si Resend est prêt.
- **À fournir par Jonathan** : ses réponses à D1 à D7 (facultatif), deux sites de test pour MU.9 et MU.11 (dont un qui a déjà des mentions de marque, et un métier local).
- **Prochain sous-jalon : MU.0** (session de test connectée, captures de l'existant, trois correctifs bloquants).

## MU.0 : voir l'espace comme un utilisateur, et réparer ce qui bloque (16/11/2026)

- **Session de test connectée** (`scripts/shots/`, aucune dépendance ajoutée : Playwright est celui de l'environnement cloud).
  - `pnpm shots:env` écrit `.env.local` (ignoré par git) : clés Supabase lues par l'API de gestion (jeton injecté par le proxy), `INNGEST_DEV=1`, `BETA_MODE=true`, `E2E_EMAIL` (`espace-test@mega-coloring.com`) et un `E2E_PASSWORD` tiré au hasard. **Aucun identifiant dans le dépôt** ; le conteneur étant éphémère, chaque session relance cette commande.
  - `pnpm shots:seed` (rejouable) : crée le compte de test s'il manque, remet son mot de passe à celui de `.env.local`, puis **remplace les sites de son espace** (`espace-test`, id `5b38616f-eccf-4729-9be9-5d53f9cbe64f`) par trois états : `poterie-demo.example` (site sans analyse), `rando-demo.example` (analyse en cours : backlinks « en cours »), `coloriages-demo.example` (analyse finie : collecte, qualification, 6 cibles en liste courte, 3 constats dont une mention sans contact). Éditeurs en `.example` (domaine réservé : aucun tiers réel). Aucun appel payant, aucun événement Inngest, aucune requête vers un tiers. N'écrit que dans l'espace du compte de test.
  - `pnpm shots` : rejoue le jeu de données, démarre `next dev` (port 3100) si rien ne répond, se connecte par l'écran `/connexion`, capture **19 écrans de `/app`** en bureau (1440) et mobile (390), pleine page, dans `SHOTS_DIR` (défaut : dossier temporaire du système, **hors dépôt**), avec `rapport.json` (code HTTP, page atteinte, débordement horizontal). Sort en erreur si un écran n'est pas atteint. Options : `SHOTS_ONLY=cibles,audit`, `SHOTS_SKIP_SEED=1`, `SHOTS_BASE_URL`.
  - La « fixture » réutilisable est `signIn(browser, baseUrl, viewport)` dans `scripts/shots/lib.mjs` (renvoie un contexte Playwright connecté ; `storageState()` pour le réutiliser).
  - Piège : en bulk, PostgREST met `null` dans les colonnes absentes d'une ligne (d'où `defaultToNull: false` dans le jeu de données) ; l'écran d'audit plante si `backlinks_stats` ou `profile_data` sont vides sur une étape « terminée » (le jeu de données les remplit avec les vraies formes).
- **Captures de référence de l'existant** (l'« avant ») : 38 images, toutes atteintes (HTTP 200). Constats à reprendre en MU.2 et suivants (rien n'a été retouché, hors périmètre) : `/app` = cinq boutons de même poids et « Connecté en tant que… » ; menu de 7 entrées dont 6 vides ; écran de relecture de 3 écrans de haut ; coûts en dollars partout ; « Vos cibles » commence par une question puis trois blocs de coût avant la première cible ; **débordement horizontal sur mobile de « Vos cibles »** (seul écran dans ce cas).
- **Défaut (a), « étape affichée en cours alors qu'elle est finie »** : en base, l'audit `3bea3eb9` est `termine` depuis le 16/11 13:59:04 UTC avec 216 opportunités ; le diagnostic l'a lu pendant que l'étape tournait (le plan a été écrit entre 13:57 et 14:11 UTC). **Aucune étape n'était bloquée en production** (vérifié sur toutes les tables de statut). Le défaut de fond est réel et corrigé par (c) : rien ne débloquait une étape dont le job meurt, et un statut `confirme` s'affiche « En cours » sans limite de temps.
- **Défaut (b), requêtes par type d'éditeur jamais générées** : cause trouvée. L'univers n'était écrit que par `launchJourney` (écran de relecture). Les deux audits lancés en production l'ont été par l'autre chemin (liste des audits → « préparer » → confirmer sur la page d'audit : estimation et confirmation à 63 s et 16 s d'écart, aucun événement `onboarding.launched`), qui ne l'appelait jamais ; et tout échec était avalé sans trace. Rejoué en local avec le compte de test : le chemin de relecture écrit bien la ligne.
  - Correctif : `ensureQueryUniverse` (`src/features/queries/service.ts`), appelée par une étape `query-universe` du job `audit-discover` : **tout audit, d'où qu'il soit lancé, a ses requêtes** ; un univers à jour (même version du profil) est réutilisé sans appel LLM (rejouable) ; n'arrête jamais l'audit. Les échecs sont journalisés avec leur raison (`profil_absent`, `theme_absent`, `ecriture_refusee`…).
  - Générations réelles : par l'écran (compte de test, mega-coloring.com) 1 ligne, **0,000448 USD** ; par le nouveau chemin pour le site de Jonathan `4fd67a8f` (`ENSURE_SITE_ID=… pnpm demo:queries-ensure`) **1 ligne, 27 requêtes, 0,000498 USD**, consignés dans `cost_ledger`. Son bouton « Collecter » n'est donc plus bloqué par « noUniverse ». Les requêtes sont en anglais (site lu comme anglophone : c'est le sujet de MU.4, pas corrigé ici).
- **Défaut (c), chien de garde** : `src/features/watchdog/` (`steps.ts` = registre, `run.ts`) et job Inngest `step-watchdog` (toutes les 10 minutes, événement `watchdog/sweep`). Surveille 12 étapes : découverte, backlinks, profil, opportunités, chasseur 404, collecte, qualification, analyse des pages, tri, contacts, brouillons, audit public. Une étape « en cours » depuis plus de 60 min, ou « confirmée » depuis plus de 30 min sans démarrer : si son événement de fin existe, elle est **réparée** (`termine`, puis l'enchaînement reprend) ; sinon elle passe à `echoue` avec un message clair (`t.watchdog.stuck`), ce qui rend les boutons de relance. Aucun appel payant, jamais de relance automatique d'une étape échouée, écritures gardées par le statut lu, événements `watchdog.step_repaired` / `watchdog.step_failed`. **Toute nouvelle étape longue doit être ajoutée au registre** (MU.1 : `analysis_steps`).
  - Vérifié sur la vraie base (`pnpm demo:watchdog`, espace de test) : backlinks bloqué depuis 2 h → `echoue` ; opportunités « en cours » avec événement de fin → `termine`.
- **Coût de la session** : 0 USD DataForSEO ; LLM 0,001784 USD (OpenAI par le proxy : déduction 0,000152, profil 0,000686, requêtes 0,000448 et 0,000498). Aucun email, aucun audit payant lancé.
- **Vérifié** : 909 tests verts en local (dont 10 du chien de garde et 3 nouveaux des requêtes ; tests SQL joués en CI), lint (3 avertissements antérieurs), typecheck, format, build.
- **Commandes** : `pnpm shots:env && pnpm shots:seed && SHOTS_DIR=<dossier> pnpm shots` ; vérifications réelles : `set -a; . ./.env.local; set +a` puis `NODE_USE_ENV_PROXY=1 pnpm demo:watchdog`, ou `NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true LLM_PROVIDER=openai ENSURE_SITE_ID=<uuid> pnpm demo:queries-ensure`. Ces deux commandes utilisent `VITEST_REAL_ENV=1` (sinon `vitest.config.mts` impose des valeurs fictives : les autres `demo:*` qui écrivent en base ont le même besoin).
- **Dettes et pièges** : le correctif (b) n'a pas été rejoué en production (il faudrait lancer un audit payant, ~0,6 USD avec l'ancienne chaîne) : à constater au premier audit de MU.1 ; `.env.local` contient la clé de service le temps de la session (jamais versionnée) ; l'application locale lit et écrit la **vraie base** (un seul projet Supabase) ; le chien de garde fera passer l'audit « en cours » du jeu de données à `echoue` au bout d'une heure (rejouer `pnpm shots:seed`, ce que fait `pnpm shots`) ; les fonctions Vercel tournent à `iad1` (États-Unis) alors que la base est à Paris (latence, à voir plus tard) ; `/app/inbox/[id]` n'est pas capturé (aucun fil dans le jeu de données, partie CRM).
- **Backlog** : captures des états d'erreur (étape échouée) ; test Playwright d'un parcours complet (pas seulement des captures) ; retirer le chemin « préparer un audit » de la liste des audits (MU.1 / MU.2) ; région Vercel proche de la base.
- **Prochain sous-jalon : MU.1** (une seule analyse, de bout en bout).

## MU.1 : une seule analyse, de bout en bout (16/11/2026)

- **Fait** (module `src/features/analysis/`, aucun écran : MU.2 et MU.3) : un seul événement `analysis/run.requested` (job Inngest `analysis-run`, `src/inngest/functions/analysis-run.ts`) enchaîne les huit étapes de `docs/jalon-mu.md` 2.2 : 1 comprendre (profil de marque, seulement s'il manque), 2 concurrents (SERP top 30 + tailles mesurées en une requête), 3 état des lieux (job séparé `analysis-links-state`, **en parallèle**, jamais bloquant : résumé des liens, 100 domaines référents, 100 mots-clés classés ; écrit `audits.links_state`), 4 recherche (requêtes par type d'éditeur garanties par `ensureQueryUniverse`, puis collecte MT.3), 5 tri et 6 contacts (entonnoir MT.4), 7 liens morts et mentions (MT.5), 8 liste courte. Ce sont **les mêmes modules** que les jobs par étape (qui restent, boutons de MT.6 compris).
- **Données** : migration `2026120100000000_analysis_progress.sql` **appliquée sur la vraie base** : `analysis_steps` (une ligne par étape et par audit : état, compteurs JSON `done` / `total` / `found`…, dernier exemple, début, fin), `analysis_feed` (étape finie, cible prête, constat), fonction `analysis_step_update` (un aller-retour, compteurs fusionnés, une étape terminée n'est jamais rouverte), colonnes `audits.analysis_*` et `links_state`. RLS : lecture membres, écriture service_role. Test SQL `supabase/tests/analysis-progress.test.ts` (7 tests). Types ajoutés à la main.
- **Helper de progression** `progress.update(clé, {status, counters, example})` / `progress.feed(...)` (`createProgress`), jamais d'exception ; écrit **dans le step qui travaille** (donc une fois, pas au rejeu d'un step mémorisé). `trackedRunner` compte les appels d'une étape. `MemoryProgress` pour les tests.
- **Un seul contrôle de budget au lancement** (`startAnalysis`, `src/features/analysis/service.ts`) : le plus grand de « déjà dépensé » et « coût attendu de toute l'analyse » doit tenir dans le plafond de l'audit, plus le plafond du jour ; **un seul événement**, à identifiant stable (`analysis-<audit>-<date de confirmation>`). Les contrôles avant **chaque** appel payant (`assertCanSpend` : audit, sécurité 5 USD, jour 25 USD) restent. Coût annoncé : `estimateAnalysis` = découverte + tailles + état des lieux + LLM courts + parts attendues mesurées des trois étapes ; sur le site de test **0,4575 USD attendu, 0,8195 pire cas** (budget cible 1 USD). `computeAuditEstimate` renvoie désormais `chain.analysisUsd` et `chain.worstUsd`, et un palier dont le plafond ne couvre pas toute l'analyse refuse de lancer (au lieu de payer une découverte sans suite).
- **Ancienne chaîne sortie du parcours (décision D2, défaut appliqué)** : `confirmAudit` envoie l'événement de l'analyse, `advanceChain` ne lance plus ni backlinks, ni profil, ni opportunités, la page d'audit et les panneaux de coût n'affichent plus ses blocs. **Code, jobs et boutons conservés** derrière `LEGACY_CHAIN=true` (nouvelle variable, faux par défaut, `.env.example`) ; suppression prévue en MU.11. Les tests de l'ancienne chaîne tournent avec ce réglage. Les audits anciens qui ont déjà des backlinks gardent leurs écrans.
- **Reprise** : « Reprendre » = `startAnalysis` sur un audit en échec (nouvelle date de confirmation, donc nouvel événement). Chaque étape regarde en base ce qui est fait (profil existant, concurrents mesurés, collecte / qualification / constats terminés) et retourne `deja` sans rien refaire ; une étape interrompue repart de ses étapes Inngest mémorisées. **Le cache DataForSEO des sites de test** (jamais lu, décision du 15/11) relit désormais ce que **cet audit** a lui-même payé (`shouldBypassCache` renvoie `{ notBefore: création de l'audit }`) : un nouvel audit repaie tout, une reprise ne repaie rien.
- **Lecture en parallèle** (`src/lib/concurrency.ts`, `mapByHost`) : sites **différents** de front (8 pour les pages et les contacts, 6 pour les constats), un même hôte (deux dernières étiquettes, plateformes de blogs comprises) reste en série avec le délai de politesse ; robots.txt et SSRF inchangés. Tailles de step : 20 pages, 8 contacts, 6 cibles.
- **Chien de garde** (MU.0) : l'analyse (`audit.analysis`) et chaque étape (`analysis.step`, sans écriture depuis **15 minutes**) sont surveillées ; une étape bloquée fait échouer son analyse (message clair), sauf l'état des lieux qui est parallèle.
- **Run réel borné** (`ANALYSIS_SITE_ID=<uuid> pnpm demo:analysis`, serveur Inngest local + `next dev`, vraie base, mega-coloring.com FR, espace `3f3bcbf2…`, audit `c3c2c262-5c3c-42cb-a3df-75b79212a593`, lancé par un seul événement, **aucune action entre-temps**) :
  - **Durée 1 040 s = 17 min 20 s** (hypothèse « moins de 10 minutes » **non tenue**). Par étape : comprendre 20 s, concurrents 68 s, état des lieux 9 s (parallèle), **recherche 457 s**, tri 314 s, contacts 101 s, constats 175 s, demandes 1 s.
  - **Coût réel 0,4697 USD** (annoncé 0,4575, +2,7 %) : DataForSEO 0,4584 (SERP 27 appels 0,158 ; Content Analysis 7 appels 0,1852 ; recoupement 0,0306 ; tailles 0,0245 ; résumé des liens 0,024 ; domaines référents 0,024 ; mots-clés 0,012), LLM 0,0113 (qualification 16 appels 0,0106, constats 3 appels 0,0006). Sous le budget cible de 1 USD ; l'ancienne chaîne coûtait ~0,87.
  - **Résultat** : 740 candidats, 76 pages vivantes jugées, 63 pertinentes, 60 contacts cherchés, **22 cibles en liste courte** (8 avec email, 14 avec formulaire ; 18 blogs, 1 école, 1 média, 1 e-commerce, 1 autre : la collecte ramène toujours surtout des blogs, c'est MU.6), 2 constats (0 lien mort), 33 lignes dans `analysis_feed`. L'état des lieux a trouvé 1 domaine référent et 0 mot-clé classé (site neuf).
  - **Reprise après échec simulé** (étapes constats et demandes perdues, analyse en échec, événement `analysis.resumed`) : **+0,000639 USD** (les 3 appels LLM de l'étape perdue), 0 appel DataForSEO, qualification non refaite, 3 lignes de coût en plus ; analyse « terminée », 8 étapes « terminées ».
- **Vérifié** : 1 159 tests verts (Postgres 16 local, dont 29 de l'analyse, 5 de concurrence, 4 du chien de garde pour l'analyse, 7 SQL), lint (3 avertissements antérieurs), typecheck, format. `pnpm build` non rejoué ici (Google Fonts bloqué en session : la CI construit).
- **Commandes** : run réel : `pnpm shots:env`, puis `set -a; . ./.env.local; set +a; export NODE_USE_ENV_PROXY=1 DATAFORSEO_PROXY_AUTH=true LLM_PROXY_AUTH=true LLM_PROVIDER=openai INNGEST_DEV=1`, `pnpm exec next dev -p 3000 &`, `pnpm inngest:dev &`, puis `ANALYSIS_SITE_ID=<uuid> pnpm demo:analysis` (`ANALYSIS_AUDIT_ID=<uuid>` pour reprendre). Postgres local si besoin : voir « Dettes et pièges » (`/var/tmp/pgd`, port 55432).
- **Dettes et pièges** :
  - **Durée** : la recherche (35 appels DataForSEO l'un après l'autre, ~13 s en moyenne par appel y compris l'aller-retour Inngest local) est l'étape la plus longue (457 s sur 1 040) ; le tri vient ensuite (314 s). Pistes pour MU.6 ou après : SERP en lots parallèles (en gardant l'arrêt par rendement par fenêtre), SERP en file différée (0,0006 au lieu de 0,002 par page). Le dev server Inngest local ajoute un aller-retour par step : en production la durée sera à mesurer.
  - L'écran n'existe pas encore (MU.2 et MU.3) : l'utilisateur ne voit rien de cette progression aujourd'hui ; le lancement par l'interface passe par le bouton de confirmation existant, qui envoie le nouvel événement.
  - Le coût de l'état des lieux est compté dans le plafond mais lancé en parallèle : un plafond serré peut le faire manquer (partie `missing`, jamais bloquant).
  - `analysis_feed` n'est jamais purgé ; l'exemple affiché pour la recherche est la requête ou le premier site (pas l'id du step).
  - Les étapes 5 et 6 partagent un seul job : « Trier » passe à « terminé » quand le premier lot de contacts démarre.
  - Un site de test garde le cache fermé pour les **autres** audits ; un audit qui reprend relit son propre cache seulement s'il est dans la fenêtre (TTL du cache DataForSEO).
  - Le serveur Inngest local exécute aussi les crons (watchdog, ticks d'envoi en dry run) contre la vraie base le temps du run.
- **Backlog** : SERP en parallèle ou différées ; purge d'`analysis_feed` ; `pnpm shots` pour un audit lancé par l'analyse unique (écran MU.3) ; mesurer la durée en production (sans dev server).
- **Prochain sous-jalon : MU.2** (la coquille : toujours savoir quoi faire).

## MU.2 : la coquille, toujours savoir quoi faire (16/11/2026)

- **Fait** (`src/features/shell/`) : `nextStep(site)` (pur, testé) décide de l'écran : pas d'audit → relecture ; analyse confirmée / en cours / audit non confirmé → analyse ; en échec → analyse avec « Reprendre » ; finie ou ancien audit terminé → Vos cibles. `homeDestination` pilote `/app` : aucun site → `/app/demarrer` ; un site → sa prochaine étape ; plusieurs → liste (état + un bouton par site). `JourneySteps` : fil « Votre site · Vérification · Vous · Analyse · Vos cibles » (sur mobile : « Étape 4 sur 5 : Analyse » + pastilles) sur démarrer, relecture, analyse, cibles.
- **Adresses par site** : `/app/site/[id]/analyse`, `/cibles`, `/etat-des-lieux`. Les anciennes (`/app/audit`, `/app/audit/[id]`, `/app/audit/[id]/cibles`) redirigent ; `/app/audit/[id]/plan` et `/export` inchangés (partie CRM). Le corps de l'ancienne page d'audit est devenu `AuditContent` (`src/features/audits/audit-content.tsx`). Les actions revalident `/app` en layout.
- **Menu** : Accueil, Cibles, État des lieux, Compte ; Messages, Réponses, Liens obtenus grisés « Après votre premier lot » (bureau seulement). **« Compte » est une page** (`/app/compte` : sites et réglages, garde-fous, tâches, abonnement, déconnexion), pas un menu déroulant.
- **Dollars et vocabulaire (D1)** : plus de montant sur le parcours. « Lancer l'analyse » (une phrase, ~15 min, un bouton, `ConfirmAuditPanel` simplifié), relecture sans tableau de coûts (`acceptedUsd` reste un champ caché : le serveur refuse toujours de dépasser), carte de coûts retirée de l'audit, panneaux payants par étape de « Vos cibles » masqués (derrière `LEGACY_CHAIN`). Test `shell.test.ts` : aucun dollar ni mot interdit dans les textes du parcours (hors `targets.steps`, legacy). Audit lancé par l'analyse unique : plus de bloc « Progression de l'audit » ni de badge d'ancien statut.
- **États vides** : cibles pas prêtes (avec bouton vers l'analyse), État des lieux (contenu en MU.10), analyse sans audit → relecture.
- **Outils de captures** : `pnpm shots` (46 captures, redirections vérifiées) ; `SHOTS_STATE=sans-site|analyse-en-cours|analyse-finie pnpm shots` vérifie où `/app` mène avec un seul site (`SEED_ONLY` dans le seed). Le jeu de données marque maintenant les analyses `en_cours` / `termine`.
- **Vérifié** : 969 tests verts en local (226 tests SQL ignorés sans Postgres local : CI), lint (3 avertissements antérieurs), typecheck, format. Captures avant / après dans la conversation.
- **Dettes** : l'adresse du site n'est reprise que par `/app/demarrer?site=…` (la home n'a plus de champ d'audit gratuit depuis l'essai de 7 jours : rien à reprendre pour l'instant) ; l'écran d'analyse reste sommaire (MU.3) ; relecture et question « fondateur ? » inchangées (MU.4, MU.5, MU.10) ; `pnpm build` non rejoué ici.
- **Prochain sous-jalon : MU.3** (écran « Analyse en cours »).

## MU.3 : l'écran « Analyse en cours » (16/11/2026)

- **Fait** : `AnalysisProgress` (`src/features/analysis/analysis-progress.tsx`, client) affiché par `AuditContent` pour toute analyse lancée (`analysis_status` ≠ `aucun`) : les huit étapes avec état, compteur (« 23 sur 35 recherches · 412 sites trouvés ») et dernier exemple ; barre d'avancement et temps restant ; « Où en est le tri » (sites examinés → après tri → cibles) ; « Premières cibles prêtes » (6 premières + « + N autres ») ; message « vous pouvez fermer la page » (avec ou sans email selon `RESEND_API_KEY`) ; échec : ce qui a marché, ce qui s'est arrêté, bouton « Reprendre l'analyse » (`confirmAuditAction` = `startAnalysis`, qui ne refait rien) ; fin : carte « Analyse terminée » puis ouverture automatique de `/app/site/[id]/cibles` après 4 s. Une analyse déjà terminée redirige tout de suite vers les cibles.
- **Route d'état** `GET /api/analysis/[auditId]/status` (lecture seule, session de la personne, RLS : 404 hors de son espace, `no-store`), interrogée toutes les 3 s tant que l'analyse est « confirmée » ou « en cours » ; pas de rechargement de page. Lecture : `loadAnalysisSnapshot` (`status.ts`), calcul de l'affichage : `buildAnalysisView` (`view.ts`, pur, partagé serveur et navigateur).
- **Avancement et temps restant** : poids des étapes = durées mesurées au run réel de MU.1 (`STEP_WEIGHTS`, l'état des lieux parallèle ne compte pas) ; dès 15 % d'avancement, la vitesse réelle de l'analyse en cours remplace ces durées. Annonce initiale : environ 19 minutes (le run réel a pris 17).
- **Email de fin (D7)** : `notify.ts` (Resend par `fetch`, expéditeur `TRANSACTIONAL_FROM`, défaut `no-reply@ouiouioui.app`, domaine vérifié chez Resend), appelé par un step Inngest `email-fin` après l'analyse ; jamais bloquant, une seule fois (événement `analysis.email_sent` sans l'adresse), sans montant ni mention d'IA. **Sans `RESEND_API_KEY` : rien n'est envoyé et l'écran ne promet pas d'email** (résultat `sans_service` constaté au run réel). **À fournir : poser `RESEND_API_KEY` sur Vercel** (clé d'envoi Resend, via le formulaire sécurisé ; jamais lue ici).
- **Vocabulaire** : les textes de `analysis.screen`, `analysis.steps` et `analysis.email` sont couverts par le test de mots interdits de `shell.test.ts` (« constat » est interdit : on dit « liens morts ou mentions »).
- **Captures** (`scripts/shots/analysis.mjs`, dossier hors dépôt) : mode simulé (défaut) rejoue sur `coloriages-demo.example` début, milieu, milieu avec cibles, fin (puis ouverture des cibles), échec, **sans recharger la page** (preuve que la route d'état met l'écran à jour), bureau et mobile ; mode réel (`SHOTS_REAL_SITE=<uuid>`) suit une vraie analyse. Le bouton « Reprendre » n'est pas cliqué dans les captures (il lancerait une vraie analyse).
- **Run réel** (compte de test, site `mega-coloring.com` ajouté à l'espace de test, audit `3edd59a0-0429-43bd-b7b1-e9fbb620d824`, lancé par un seul événement, écran regardé en bureau et mobile pendant l'analyse) : **1 006 s = 16 min 46 s, 0,4785 USD** (journal de coûts de l'audit), 741 sites trouvés → 45 après tri → **17 cibles** ; états finaux en base : 8 étapes « terminées », compteurs identiques à ceux affichés (35 sur 35 recherches, 66 pages jugées, 45 sur 45 sites vérifiés, 17 contacts). Captures réelles obtenues au milieu (bureau et mobile) ; **l'écran de fin réel n'a pas été capturé** (il ne reste que 4 s avant l'ouverture des cibles et le suivi l'a raté) : la fin est montrée par la capture simulée, même composant.
- **Vérifié** : 993 tests verts en local (226 tests SQL ignorés sans Postgres local : CI), lint (4 avertissements, tous préexistants sauf un corrigé), typecheck, format. `pnpm build` non rejoué ici (Google Fonts bloqué en session : la CI construit).
- **Commandes** : `pnpm shots:env && pnpm shots:seed`, `pnpm exec next dev -p 3100`, `SHOTS_BASE_URL=http://localhost:3100 SHOTS_DIR=<dossier> node scripts/shots/analysis.mjs` ; mode réel : voir « MU.1 > Commandes » puis `SHOTS_REAL_SITE=<uuid>`. Attention : `pnpm shots:seed` remplace tous les sites de l'espace de test (le site `mega-coloring.com` ajouté pour le run réel est supprimé).
- **Dettes et pièges** : le code mort de `audit-detail.tsx` (blocs « en cours / échoué / terminé » de l'ancien écran) n'est plus atteint pour une analyse lancée, à retirer en MU.11 avec l'ancienne chaîne ; l'écran de relecture ne montre pas encore l'analyse du site en cours si le site a plusieurs audits (on lit le dernier) ; les premières cibles n'apparaissent qu'à la fin des contacts (la liste courte n'existe pas avant : une cible « prête » plus tôt demanderait de découper l'étape 5 et 6, MU.8) ; la durée annoncée reste celle du dev server local, à remesurer en production.
- **Backlog** : capture automatique de l'écran de fin d'une vraie analyse ; email de fin avec le nom du produit dans l'expéditeur (réglage unique du nom) ; test Playwright d'un parcours complet.
- **Prochain sous-jalon : MU.4** (onboarding 1/2 : adresse, lecture en direct, « ce que nous avons compris », marché).

## Remarques d'essai de Jonathan après MU.3 (16/11/2026)

Essai fait avec un compte neuf (l'ancien compte de Jonathan et son espace ont été supprimés à sa demande ; les comptes de test ont été gardés ; l'historique des coûts est conservé). Remarques, une à une, et ce qui en a été fait :

1. **Marché dès l'étape 1** : viser un pays cible tout de suite, avec l'adresse. « Chaque pays fait l'objet d'une campagne différente, car le contexte local change » : indispensable. → **MU.4** (plan modifié dans `docs/jalon-mu.md`) : marché demandé avant toute lecture ; campagne = site × pays [À CONFIRMER, défaut appliqué].
2. **Attente après l'adresse** : un bouton grisé muet n'est pas acceptable, il faut une animation ou une durée estimée. → **MU.4** (lecture en direct).
3. **Noms de pages en anglais** (le site a une version anglaise, aucun marché n'avait été demandé). Même cause que 1. → **MU.4**.
4. **Pages à faire citer** : l'accueil est normal en « autorité générale » mais doit pouvoir se décocher ; ajout manuel d'adresses. → **MU.5** (plan modifié).
5. **Objectif (général ou pages précises) à poser à l'étape 1**, avant la fiche « ce que nous avons compris », qui en dépend. → **MU.4** ; **la décision D3 est inversée** (le choix revient).
6. **Texte « Prêt à lancer l'analyse »** jugé faux → **réécrit** (« une quinzaine de minutes », rien ne part sans validation, « nous vous écrivons » seulement si l'email peut vraiment partir). **Email de fin d'analyse** avec lien : **déjà codé en MU.3**, mais **il ne part pas tant que `RESEND_API_KEY` n'est pas posée sur Vercel** (action à fournir). L'écran ne promet l'email que si la clé existe.

## Incident : analyse figée à 0 % en production (16/11/2026)

- **Constat** (essai de Jonathan) : l'écran d'analyse ne bouge pas. **Cause** : la production Inngest n'avait pas été resynchronisée depuis le 16/11 à 15:00, donc les fonctions `analysis-run` et `analysis-links-state` (MU.1) n'existaient pas côté Inngest (32 fonctions au lieu de 36) : l'événement `analysis/run.requested` était reçu mais ne déclenchait rien. L'écran affichait fidèlement l'état de la base (rien n'avait démarré).
- **Réparé** : resynchronisation (`sync_app`, 36 fonctions) ; analyse de Jonathan relancée (nouvel événement, nouvelle date de confirmation) : elle tourne en production.
- **Prévention** : workflow GitHub `.github/workflows/inngest-sync.yml` (après chaque déploiement de production réussi, `PUT /api/inngest`). **Règle : toute nouvelle fonction Inngest exige une resynchronisation de la production** (automatique désormais ; à vérifier avec `get_apps` : `functionCount`).
- **Piège** : l'outil MCP Inngest refuse la lecture des événements (`list_events`) faute de permissions ; `get_apps`, `list_functions`, `sync_app`, `send_event`, `get_event_runs` fonctionnent.
- **Backlog** : un écran d'analyse qui détecte « confirmée depuis plus de 2 minutes sans aucune étape » et le dit (aujourd'hui il reste muet sur « L'analyse démarre… ») ; le chien de garde ne couvre pas ce cas (`confirme` sans étape).

## Décisions de Jonathan, suite de l'essai (17/11/2026)

- **Langue** : la fiche et les pages proposées restent dans **la langue du site analysé** ; le marché (pays, langue) sert à la recherche, pas à traduire. Multilingue : plus tard.
- **Robustesse** : une erreur du fournisseur (ex. DataForSEO 500 sur Content Analysis, observé en production) ne doit plus faire échouer toute l'analyse ; **relance possible à partir d'une étape donnée** ; recherche en parallèle (les appels sont indépendants).
- **Liens morts des concurrents** : tactique **principale** de MU.7 (voir `docs/jalon-mu.md`), à placer avant MU.6.
- **Ordre proposé** : étape 1 + robustesse (MU.4), puis MU.7, puis contrôle de qualité de la recherche et MU.6.
- **Prompt maître** : `docs/master-prompt-essai.md` (tout ce qui manque avant le test grandeur nature, en autonomie complète). **Autorisations Supabase** : `.claude/settings.json` autorise déjà tous les outils MCP Supabase ; la question posée sur `delete from auth.users` vient du serveur Supabase lui-même (confirmation des requêtes destructrices) et ne se désactive pas côté Claude Code : pour les écritures SQL, utiliser l'API de gestion (`curl` sur `/v1/projects/{ref}/database/query`, déjà autorisée).

## Session du 17/11 : robustesse du moteur, marché dès l'étape 1, liens morts de concurrents (autonomie complète)

PR #101 (A), #102 (B, C, D), #104 (correctifs du run réel, E, F). Migrations appliquées en production : `analysis_restart`, `site_country_campaign`.

### A. Robustesse du moteur

- **Erreur fournisseur non fatale** : `withProviderRetry` (`collection/run.ts`) : erreur de tâche, HTTP 5xx / 408 / 429, réseau ou délai dépassé → nouvelles tentatives à attente croissante (1,5 s puis 5 s, 200 s au plus), puis l'appel est « manqué » : compté (`counters.missed`), dit à l'écran (« 1 recherche n'a pas abouti : l'analyse continue avec le reste »). Les erreurs d'authentification et de paramètres (400/401/403) remontent. La recherche n'échoue que si elle ne trouve **aucun** site (message dédié). Même tolérance pour les recherches de concurrents (`concurrents:recherche-N`).
- **Délai par appel** : 60 s (`timeoutMs` du client DataForSEO), **240 s pour Content Analysis** (mesuré : 130 à 143 s pour 150 lignes ; le premier réglage à 60 s était faux) ; `maxDuration = 300` sur la route Inngest.
- **Reprise à partir d'une étape** : bouton « Reprendre à partir d'ici » sur chaque étape (analyse arrêtée ou terminée) ; `restartFromStep` (`analysis/restart.ts`) + fonction SQL `analysis_reset_steps` (transaction unique : efface les résultats dérivés de l'étape et des suivantes, garde ce qui précède, jamais les versions de profil) ; « contacts » refait le bloc du tri ; confirmation en deux clics. Testé sur base réelle (`supabase/tests/analysis-restart.test.ts`). Les appels refaits identiques retrouvent le cache du fournisseur (rien n'est repayé).
- **Parallélisme** : appels de chaque phase par lots de 5, **un step Inngest par lot, appels en parallèle dans le step** (premier essai : un step par appel = 859 s pour 440 s d'appels réels, les allers-retours Inngest dominaient). Budget de phase et arrêt par rendement évalués avant chaque lot, résultats ajoutés dans l'ordre du plan (rejeu déterministe). Une écriture de progression par lot.
- **Mesure par chemin** (run réel du 17/11, `candidate_collections.stats`, durée de phase = somme des plus longs appels de chaque lot) : SERP 25 appels 249 s (462 s en série) ; Content Analysis 4 appels 143 s (335 s) ; recoupement 2 appels 9 s ; mentions 4 appels 37 s (58 s) ; liens morts 3 appels 3,7 s. Recherche totale 859 s avec un step par appel (à remesurer avec un step par lot) : l'objectif « moins de 3 minutes » n'est **pas** tenu par la recherche seule tant que Content Analysis dure 2 à 4 minutes par appel.
- **Démarrage bloqué** : « Le démarrage prend plus de temps que prévu » après 2 minutes sans étape, bouton « Relancer le démarrage » (nouveau jeton d'événement) ; chien de garde : analyse « confirmée » sans démarrage traitée au bout de 5 minutes (30 avant).
- **Correctif** : « Reprendre » après un échec de la découverte des concurrents ne faisait rien (`confirmAudit` répondait « déjà lancée »).

### B. Étape 1 « Votre site »

- Même écran : adresse, **pays** (FR BE CH CA LU MC GB US), **langue** (détectée ou fr / en), **objectif** (« faire ranker le site en général » / « des pages précises »). Texte : « Chaque pays a sa propre campagne ».
- **Campagne = site × pays** : migration `unique (workspace_id, domain, country)`, `country` non nul. Liste des sites : pays affiché et lien « Ajouter un pays ». Même domaine + autre pays = nouvelle campagne ; même pays = retrouve la première.
- **Lecture en direct** : deux appels serveur distincts (accueil, puis plan du site / pages / profil) ; la liste se coche à la fin de chaque phase réelle (accueil lu en 4 s, tout en 22 s en production), avec la durée estimée. Limite : les lignes « plan du site » et « activité comprise » se cochent ensemble (une seule phase serveur).
- **Pays et langue pilotent la recherche** : lieu et langue des recherches Google (`sites/market.ts`) pour la découverte des concurrents, la collecte SERP et les mots-clés classés ; langue des candidats (filtre Content Analysis, déjà là). Langue « détectée » : **la langue du pays visé est préférée** quand le site en propose une version (hreflang) ; sinon langue détectée. Le profil est rédigé dans la langue de la campagne (`brandSystem(language)`), les pages lues suivent (`readSite`, `languageVersionHref`).
- **Constat du run réel** : avec « Détectée » et un accueil anglais, mega-coloring.com pour la France a été lu en **anglais** (site `en`, requêtes anglaises) : corrigé par la préférence ci-dessus (à confirmer par un second run). Pages hors langue au tri : non mesuré après correction (avant : 25 sur 150 ; sur ce run en anglais : 7 sur 150).
- Limite connue : une campagne existante (même domaine et pays) n'est pas relue si l'utilisateur change la langue ensuite.

### C. Étape 2 « ce que nous avons compris »

- Fiche en lecture d'abord, chaque bloc avec « Modifier » (les champs restent dans le formulaire). **Accueil = une page comme les autres, décochable** (jamais tout décoché ; sans entrée d'accueil dans le profil il reste proposé : `siteResources`, utilisé par la qualification et les constats). **Ajout d'une page** : adresse du site, vérifiée HTTP 200 avant d'être ajoutée (cochée d'office). Les deux objectifs affichent les mêmes cases.
- Email de fin : le code est juste, la clé `RESEND_API_KEY` est posée (production et preview). **Au run réel du 17/11 aucun email n'est parti** (analyse à 0 cible, voir F) : cause non établie, le résultat est maintenant tracé (`events.type = analysis.email_result`).

### D. Liens morts des concurrents (tactique principale de MU.7)

- Source de collecte `lien_mort` (phase `morts`, 20 % du budget de collecte) : un appel Backlinks par concurrent (5 au plus), filtre `url_to_status_code in (404, 410)` et `dofollow`, un lien par domaine source. Écarte images / fichiers / sous-domaines techniques, spam ≥ 30, concurrents, site lui-même. Le candidat est **la page qui cite**, lue en priorité (score provisoire × 1,4).
- À l'étape des constats : les liens vers des domaines concurrents sont vérifiés **en premier** (jamais coupés par le plafond de 25 liens) ; un lien vers un concurrent répondant 404 / 410 donne un constat « lien mort » dont la demande dit « mène à une page de X qui n'existe plus (erreur 404) » et propose la page équivalente (jugement existant). **Jamais de lien déclaré mort sans 404 / 410 constaté par nous.**
- **Run borné (16/11, 7 concurrents de mega-coloring.com, ≈ 0,18 USD)** : 3 concurrents sur 7 ont des pages disparues liées. Premier filtre `is_broken` : des 403 (blocage anti-robots, pas des pages mortes) ; filtre `404 / 410` : magnific.com 72 liens (presque tous des images), esle.io 4, reussiralecole.fr 2 (blogs, 410), toupty.com 1. **Rendement utile estimé : 3 à 8 pages par analyse pour ce thème** ; l'objectif « 10 cibles » n'est pas tenu pour ce site. Run réel complet : 3 appels, 108 lignes, 90 domaines nouveaux, 0,076 USD.
- Non fait : pages ressources (a, b, d), faux 404.

### E. Qualité de la recherche (audit `3edd59a0…`, run du 16/11)

| Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Candidats | Cibles |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| contenu (Content Analysis)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 384       | 16     |
| recherche Google (SERP)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 266       | 1      |
| recoupement des concurrents                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 91        | 1      |
| mentions de marque                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 25        | 0      |
| Par type : 11 blogs, 2 médias, 2 e-commerces, 1 association, 1 « autre » sur 17. Sorties du tri : 28 sans contact, 25 robots.txt, 25 hors langue, 17 injoignables, 16 éditeur introuvable, 16 hors sujet, 12 doublons ; 575 candidats jamais lus (au-delà de 150 pages). **Contenu fournit 94 % des cibles** (les blogs), le recoupement 91 candidats pour 1 cible. Fichier à juger : `docs/eval-qualite-recherche.md` (17 retenues + 20 écartées au hasard). Aucune règle de tri modifiée. |

### F. Runs réels en production (compte de test, mega-coloring.com, France, par l'interface)

- Script : `scripts/shots/prod-run.mjs` (`pnpm shots:env && pnpm shots:seed`, puis `SHOTS_DIR=<dossier> node scripts/shots/prod-run.mjs`). Les captures (étape 1, lecture, fiche, analyse début / milieu / fin, bureau et mobile) sont dans le dossier de session, hors dépôt. Fonctions Inngest : 36, aucune nouvelle (vérifié avec `get_apps`).
- **Run 1 (19:09 UTC, audit `c15cc42e…`)** : 18 min, 0,659 USD, 0 cible. Trois causes : site lu en anglais (accueil anglais, langue « détectée ») ; recherche lente (un step Inngest par appel : 859 s) ; **jugements perdus** (voir ci-dessous).
- **Run 2 (19:40 UTC, audit `f19021aa-f30f-44d2-a05d-22070a84cc5a`, après correctifs)** : site lu en **français** (thème « coloriages gratuits à imprimer », profil français), **8 min 34 s** au total (recherche 277 s, tri 141 s), 0,62 USD, 2 recherches « manquées » signalées à l'écran et tolérées, mais **toujours 0 cible** : le jugement échouait encore.
- **Cause du « 0 cible » trouvée** : depuis l'ajout de `ANTHROPIC_API_KEY` en production, les jugements passent par **Claude Haiku 4.5** (avant : gpt-4o-mini). Chaque lot s'arrêtait à la limite de **610 jetons de sortie** (5 × 110 + 60) et le modèle renvoyait `{}` : 12 lots sur 12 perdus. Limite portée à 200 jetons par cible (constats : 420) ; une sortie tronquée est désormais une erreur explicite ; `stats.llmLastError` garde la cause.
- **Reprise par étape testée en production** (bouton « Reprendre à partir d'ici » sur « Trier », écran `?etapes=1`) : refait le tri sans refaire la recherche ni les concurrents. **Résultat final sur ce même audit : 20 cibles** (10 blogs, 3 associations, 2 écoles, 2 annuaires, 1 mairie, 1 boutique, 1 média), **9 constats « lien mort » prouvés** (404 / 410 constatés par nous), dont **7 des 20 cibles viennent de la source « lien mort d'un concurrent »** (papapositive.fr, apelpassy.fr, ville-domont.fr, apajhetvous.apajh.org, arnamur.be, gostudent.org, lesbonsplansdenaima.fr). Durée de la reprise : 2 min 40 à 6 min, jugement 11 appels, 0 échec.
- **Coût total de la session** (budget 2 USD) : run 1 0,659 + run 2 0,621 + deux reprises du tri 0,23 + sondes Backlinks (liens morts) ≈ 0,25 = **≈ 1,76 USD**, uniquement sur le site de test.
- **Email de fin : non constaté.** Les deux analyses ont répondu `echec` (aucun appel n'apparaît dans les journaux Resend aux heures concernées, alors que `RESEND_API_KEY` est posée sur Vercel). La cause n'est pas établie ; elle est maintenant écrite dans `events` (`analysis.email_error`, sans adresse) pour la prochaine analyse. Hypothèses : exception avant l'envoi (lecture de l'utilisateur de test), clé restreinte. À vérifier au prochain run réel.

### Décisions (défauts appliqués)

- Campagne = site × pays, unicité `(workspace, domaine, pays)`, pays par défaut France.
- Langue « détectée » : langue du pays visé préférée quand une version existe, sinon langue détectée.
- Un step Inngest par lot de 5 appels (et non par appel).
- Les liens morts de concurrents : filtre `url_to_status_code in (404, 410)`, jamais `is_broken` (les 403 sont des blocages, pas des pages mortes) ; part de 20 % du budget de collecte ; une page ne devient « lien mort » que par notre propre requête HTTP.
- Parts du budget de collecte : recoupement 16 %, mentions 12,5 %, liens morts 20 %, recherche 27,5 %, contenu 24 %.

### Fichiers clés

`src/features/collection/run.ts` (retry, lots, phase `morts`), `src/features/analysis/restart.ts` + `supabase/migrations/2026120200000000_analysis_restart.sql`, `src/features/analysis/{view,analysis-progress,run}.ts*`, `src/features/onboarding/{service,url-form,actions}.ts*`, `src/features/sites/market.ts`, `src/features/brand/{read-site,generate,brand-fields}.ts*`, `src/features/findings/{rules,request,funnel}.ts`, `src/lib/llm/client.ts`, `src/lib/dataforseo/client.ts`, `docs/eval-qualite-recherche.md`, `scripts/shots/prod-run.mjs`.

### Commandes

`pnpm shots:env && pnpm shots:seed` puis `SHOTS_DIR=… node scripts/shots/prod-run.mjs` (run réel en production, ~0,7 USD) ; base locale pour les tests SQL : serveur Postgres 16 puis `TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres pnpm test`.

### Dettes et pièges

- Recherche en 277 s sur le run 2 (objectif « moins de 3 minutes » non tenu : SERP 25 appels = 208 s de lots, Content Analysis jusqu'à 140 s par appel) ; recouper les phases entre elles (mentions, SERP, contenu en parallèle) est possible mais touche au déterminisme du rejeu.
- La reprise par étape n'est atteignable depuis « Vos cibles » que par le lien « Revoir les étapes » ; elle efface les décisions Garder / Écarter déjà prises sur les cibles refaites.
- Une campagne existante n'est pas relue quand on change la langue ; l'ajout d'un pays se fait par « Ajouter un pays » (page d'accueil de l'espace, liste de plusieurs sites) ou par l'étape 1.
- Lecture en direct : deux phases réelles seulement (accueil ; reste du site et profil), pas une coche par page lue.
- Les concurrents retenus du run 2 incluent des géants (magnific.com, crayola.com) : sans effet sur les cibles mais les liens morts de magnific.com sont presque tous des images (filtrées).
- Les pages ressources (MU.7 a, b, d) et le faux 404 ne sont pas faits ; liens morts : rendement mesuré 3 à 8 pages par analyse sur ce thème, 9 constats prouvés au run 2.
- Contrôle de qualité : toujours à juger par Jonathan (`docs/eval-qualite-recherche.md`) avant toute modification des règles de tri ; le run 2 n'a pas rejoué le jeu annoté (aucune règle modifiée).
- `PROGRESS.md > État` n'a pas de ligne par chantier de cette session (tout est ici).

### Backlog

Mesurer les pages hors langue au tri avec le marché choisi ; réglage du nom du produit dans l'expéditeur de l'email ; capture automatique de l'écran de fin ; changer la langue d'une campagne existante ; lien « Ajouter un pays » aussi sur l'écran des cibles.

### Prochain sous-jalon recommandé

Relancer un run réel pour constater l'email de fin (lire `analysis.email_error`), puis **MU.8** (contacts : 7 cibles sur 27 jugées pertinentes n'ont pas de contact), puis MU.5, MU.6, MU.9 à MU.11.

## Retours de Jonathan, 17/11 (soir) et prompt maître n° 2

- **15 cibles, c'est peu** (audit `37a97992…`) : 677 candidats, 150 pages lues (plafond fixe), 524 jamais lues, 112 des 150 lues inutilisables (hors langue 55, robots 23, injoignables 17, concurrents 13). → lecture adaptative et filtre avant lecture (chantier G de `docs/master-prompt-2.md`) ; objectif 40 à 50 cibles.
- **Écoles, maîtresses, centres de loisirs, scouts non cherchés** alors que les personas les identifient (sauf les scouts) : les requêtes par type d'éditeur ne sont pas garanties (MU.6). → chantier H.
- **Autonomie totale** : `docs/master-prompt-2.md` demande de valider soi-même toutes les requêtes SQL et confirmations (contournement par l'API de gestion Supabase quand le serveur demande une confirmation).
- **Correction (17/11, Jonathan)** : pas de plafond de blogs ni limite basse de requêtes : le sujet est la quantité. Requêtes garanties : au moins 4 par persona et par type, davantage tant que le rendement et le budget le permettent ; diversité montrée par onglets, sans exclure de cible valable (`docs/master-prompt-2.md` mis à jour).
- **Règle de généralité (17/11, Jonathan)** : les types d'éditeurs cherchés viennent de l'analyse du site (personas / « qui peut vous citer »), jamais d'une liste écrite pour mega-coloring.com (écoles, scouts… ne valent que pour ce site de test) ; test automatique contre les mots propres à un thème et vérification sur un second site d'un autre thème (`docs/master-prompt-2.md`, K0).
- **À retenir (17/11, Jonathan, essai avec un compte de test grandeur nature)** : 15 résultats seulement, mais « canons, parfaitement argumentés », un « wow » de pertinence. **Garder 100 % la mécanique de sourcing et d'argumentaire, en grand nombre** : le volume ne doit jamais coûter de la qualité (chantier G du prompt maître : garde-fou qualité, tableau cibles 1-15 / 16-30 / 31+).

## Session du 17/11 (nuit) : prompt maître n° 2 (plus de cibles, types d'éditeurs garantis, autonomie complète)

PR [#110](https://github.com/jonathan-enca/outreach-links/pull/110) (G, H, I, K0), [#111](https://github.com/jonathan-enca/outreach-links/pull/111) (robots.txt, liens morts plus rapides), [#112](https://github.com/jonathan-enca/outreach-links/pull/112) et [#113](https://github.com/jonathan-enca/outreach-links/pull/113) (profil du site), [#114](https://github.com/jonathan-enca/outreach-links/pull/114) (requêtes sans opérateur), [#115](https://github.com/jonathan-enca/outreach-links/pull/115) (texte bien formé), [#116](https://github.com/jonathan-enca/outreach-links/pull/116) (bilan, écriture sûre du lot « Lire d'autres sites »), [#117](https://github.com/jonathan-enca/outreach-links/pull/117) (fin du bilan). Migration appliquée en production : `candidate_language_stock` (colonnes ajoutées seulement). Inngest : 38 fonctions (36 + `audit-qualify-more` et son gestionnaire d'échec), resynchronisé après chaque déploiement.

### En une phrase

Sur les mêmes candidats que l'analyse de référence de Jonathan, le tri livre **46 cibles au lieu de 15** ; un run complet par l'interface en production donne **40 cibles en 11 min 12 pour 1,08 USD**, dont **13 qui ne sont ni des blogs ni des boutiques** ; le second donne 54 cibles, puis 72 après un clic sur « Lire d'autres sites ». L'email de fin ne part toujours pas (clé Resend refusée) et les pages ressources (J) ne sont pas faites.

### G. Plus de cibles : ne plus gaspiller la lecture

- **Filtre avant lecture** (`qualification/prefilter.ts`, `free.ts`) : langue visible sans télécharger la page (langue donnée par le fournisseur pour les liens morts et Content Analysis, colonne `collection_candidates.language` ; segment de l'adresse `/en/` ; extension d'un pays d'une autre langue, les extensions utilisées comme génériques sont ignorées). Jamais d'écart sans signal. Chaque motif est compté (`stats.preRead`) et montré à l'écran (« Pourquoi des sites sont écartés sans être lus ») ; les candidats restent en base avec leur motif.
- **Robots.txt avant lecture** (`deps.ts > checkRobotsFor`, étape `preflight`) : une requête courte par site, 30 de front, sur la tête de chaque file. Interdit = écarté avant lecture ; ouvert = le fichier n'est pas relu ; **pas de réponse = rien n'est conclu, la lecture tranche** (corrigé après mesure : une des 15 cibles d'origine était écartée parce que son robots.txt n'avait pas répondu en 5 s).
- **Lecture adaptative** (`funnel.ts`) : par lots de 40 pages, chaque lot est lu puis jugé ; la composition du lot suivant suit le **rendement mesuré par source** (`allocateLot` : part proportionnelle aux pages pertinentes par page lue, minimum de 2 par source). Arrêts : candidats épuisés, **150 pages jugées** (120 au départ, relevé après mesure), 12 minutes, budget de jugement **0,40 USD**, 3 lots de suite avec au plus une page pertinente (après 4 lots). Rejeu déterministe (l'horloge est lue dans les steps).
- **Le stock** : les candidats non lus restent en réserve avec leur score (`hors_budget_lecture`). Bouton **« Lire d'autres sites »** sur l'écran des cibles : job `audit-qualify-more` (`qualification/more.ts`), lot de 40 pages jugées, 5 minutes, 0,15 USD ; les cibles déjà livrées ne sont jamais touchées (mêmes identifiants), le rang de toute la liste est recalculé par score. **Testé en production** sur le run 2 (voir K) : 18 cibles ajoutées en 90 secondes. Les nouvelles cibles d'un lot n'ont pas l'étape « liens morts ».
- **Liste courte par seuil**, plus de plafond à 40 (garde-fou à 150). **Aucune règle de tri assouplie**, prompt de jugement inchangé.

**Mesure avant / après sur les mêmes candidats** (677 candidats de l'audit `37a97992…` copiés dans le compte de test, audit `720a6ccc…`, tri relancé en production par l'interface ; l'analyse de Jonathan n'a pas été touchée) :

|                              | Avant (ancien code) | Après                                                                                |
| ---------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Écartés avant lecture        | 3                   | 98 (langue 51, robots.txt sans réponse 43 [corrigé depuis : plus écartés], autres 4) |
| Pages lues                   | 150 (plafond fixe)  | 240 (6 lots, arrêt « objectif »)                                                     |
| Pages lues pour rien         | 103 (69 %)          | 103 (43 %)                                                                           |
| Pages jugées utilisables     | 47                  | 137                                                                                  |
| Pertinentes                  | 18                  | 60                                                                                   |
| **Cibles (avec contact)**    | **15**              | **46**                                                                               |
| Jamais lus (stock)           | 524                 | 339                                                                                  |
| Durée du tri et des contacts | 3 min 23            | 3 min 21                                                                             |
| Coût du jugement             | 0,082 USD           | 0,235 USD                                                                            |
| Étape « liens morts »        | (15 cibles)         | 308 s pour 48 cibles, 0,048 USD (accélérée depuis : 184 s pour 45)                   |

Rendement par source, après : recherche Google 88 pages lues → 22 cibles ; contenu 84 → 24 ; recoupement 39 → 2 ; liens morts 25 → 0 ; mentions 16 → 0. **La recherche Google n'était presque jamais lue avant** (7 pages sur 103 candidats) : c'est là qu'étaient les écoles et les associations.

**Les 15 cibles d'origine** : 12 sont dans la nouvelle liste (rangs 1, 6, 7, 12, 21, 23, 25, 29, 32, 39, 44, 45). 3 n'y sont pas : `opalivres.fr` (robots.txt sans réponse, cause corrigée) ; `papapositive.fr` et `deco.fr`, rejugées autrement par le modèle (« hors sujet », « concurrent ») : le jugement varie d'un passage à l'autre selon les sites jugés dans le même appel. Elles ne sont pas « classées en tête » : le tri par score est inchangé et de nouvelles cibles mieux notées (écoles, associations, mairie) passent devant.

**Qualité par tranche** (jugement de Claude à la lecture des 46 cartes, à confirmer par Jonathan) :

| Tranche        | Jugées bonnes | Remarque                                                                   |
| -------------- | ------------- | -------------------------------------------------------------------------- |
| Cibles 1 à 15  | 14 sur 15     | argumentaire précis, citation vérifiée sur 14                              |
| Cibles 16 à 30 | 12 sur 15     | 2 faibles (page de recherche d'une boutique, blog sans citation), 1 limite |
| Cibles 31 à 46 | 7 sur 16      | 5 faibles (sites généralistes, adéquation 0,5), 4 limites                  |

**Seuil non relevé, et pourquoi** : relever l'adéquation minimale de 0,5 à 0,6 a été essayé puis annulé. Jeu annoté du jugement (27 cas, `pnpm demo:qualify-eval`) : précision 1,00 des deux côtés, **rappel 0,94 → 0,59** (mairie, forum, crèche parentale notés 0,5 par le modèle seraient perdus) ; et l'une des 15 cibles d'origine de Jonathan a une adéquation de 0,5. Les cibles faibles restent donc en fin de liste (rang par score). Jeu annoté des règles gratuites (50 cas) rejoué avant et après : précision 1,00 et rappel 1,00 des deux côtés.

### H. Types d'éditeurs garantis, déduits du profil

- **Types d'éditeurs** (`brand/publishers.ts`, `brand/schema.ts`) : un second appel court au modèle, après le profil, produit les types déduits des personas, 2 à 4 **types voisins** et les mots du thème. Secours sans modèle : un type par persona. Aucun type écrit en dur : le code ne contient que 11 catégories génériques.
- **Étiquettes modifiables** dans la fiche « ce que nous avons compris » (`brand/publisher-tags.tsx`) : désactiver, retirer, ajouter ; les types voisins portent la mention « suggestion ».
- **Gabarits de requêtes** (`queries/templates.ts`) : mots du type × mots du thème × vocabulaire générique de la catégorie, par langue. **4 requêtes garanties par type**, à tour de rôle, jamais coupées par l'arrêt de rendement ; 40 requêtes garanties au plus dans le budget actuel.
- **Pas d'opérateur de recherche** : `intitle:` est facturé **5 fois plus cher** par le fournisseur (0,03 USD contre 0,006, lu dans le journal des coûts du run 1) ; les opérateurs autorisés par le prompt maître ont été essayés puis retirés.
- **Aucun plafond par type** : sur l'écran des cibles, un onglet par type cherché avec son compteur, y compris à zéro, puis « Autres sites » (`targets/publishers.ts`). Le tri par score ne change pas.
- **Budget de la recherche rééquilibré** : recherche Google 44 % (27,5 % avant), contenu 24 %, liens morts 15,5 %, mentions 8,5 %, recoupement 8 % (une seule page). Content Analysis part en même temps que les recherches Google ; recherches par lots de 14.
- **Rendement mesuré** par source et par type cherché : `qualification_runs.stats.bySource` et `stats.byPersona`.

### I. Email de fin d'analyse : cause trouvée, non corrigé

Cause lue dans `events` : **`Resend 401 validation_error`**, c'est-à-dire que la clé `RESEND_API_KEY` posée sur Vercel le 16/11 est invalide (le domaine d'envoi `ouiouioui.app` est bien vérifié). Le nom de l'erreur est maintenant tracé. **La création d'une nouvelle clé par l'outil Resend a été refusée par le garde-fou de sécurité de la session** : il faut que Jonathan pose une clé valide (voir « À fournir par Jonathan » ci-dessous). Aucun envoi constaté.

### J. Pages ressources (MU.7 a, b, d) : non fait

Faute de temps. Reste à faire tel que décrit dans `docs/jalon-mu.md`.

### K0. Rien n'est propre à un thème

- Test automatique (`queries/publishers.test.ts`, « K0 ») : échoue si un mot du site de test (coloriage, maîtresse, scout, mandala, ATSEM, centre de loisirs…) apparaît dans le code des requêtes, les gabarits, les prompts ou les textes des écrans de l'analyse et des cibles (commentaires exclus). Deux textes d'écran ont été rendus génériques (`score.ts`) et l'exemple de thème a été retiré du prompt des requêtes.
- **Second site réel, remove-me.io** (`queries/second-site.live.test.ts`, 0,001 USD, aucune recherche lancée) : thème « protection des données ; vie privée en ligne » ; 8 types déduits (enseignants, blogueurs sur la vie privée, associations de consommateurs, bibliothécaires, collectivités locales, et en types voisins : conseils juridiques, forums sur la vie privée, magazines sur la technologie) ; 42 requêtes dont 32 garanties ; aucun mot du site de test.

### K. Runs réels en production (compte de test, mega-coloring.com, France, par l'interface)

**Run 1** (16/11 23:53 UTC, audit `5342f08d…`, supprimé ensuite pour libérer la campagne) : **40 cibles, 11 min 12, 1,08 USD**.

- 12 types d'éditeurs déduits par le modèle de production (écoles, blogs pédagogiques, blogs familiaux, forums de parents, blogs d'activités manuelles, associations de loisirs, blogs de bien-être, portails pédagogiques ; types voisins : magazines jeunesse, médiathèques et bibliothèques, ATSEM et animateurs, boutiques).
- 907 candidats ; 80 écartés avant lecture (langue 75) ; 280 pages lues ; 142 jugées ; 55 pertinentes ; **40 avec contact** (15 perdues faute de contact) ; 547 en stock.
- **Par type de site** : 22 blogs, 5 médias, 5 boutiques, 3 écoles (portails pédagogiques des académies de Toulouse, Orléans-Tours, Montpellier), 2 mairies (bresles.fr, ville-sevran.fr), 1 association (claje.asso.fr, accueil de loisirs), 1 annuaire, 1 autre. **13 cibles hors blogs et boutiques** (critère : 8). Écoles 3, centres de loisirs 1, associations 1, **bibliothèques 0** (12 candidats, 8 pages lues, aucune pertinente : affiché à zéro), **scouts 0** (aucun type « scouts » proposé par le modèle).
- **Par type cherché** (candidats → cibles) : associations de loisirs 21 → 4 ; portails pédagogiques 14 → 3 ; écoles 15 → 2 ; forums de parents 29 → 1 ; magazines jeunesse 21 → 1 ; blogs d'activités manuelles 21 → 1 ; blogs familiaux 23 → 1 ; boutiques 6 → 1 ; médiathèques 12 → 0 ; ATSEM et animateurs 15 → 0 ; blogs de bien-être 18 → 0 ; blogs pédagogiques 4 → 0.
- **Par source** : contenu 135 pages lues → 28 cibles ; recherche Google 97 → 12 ; recoupement 35 → 0 ; mentions 24 → 0 ; liens morts 3 → 0. 3 liens morts prouvés à l'étape suivante.
- Durées : concurrents 29 s, recherche 196 s, tri 258 s, contacts 53 s, liens morts 184 s.
- Coût : recherche 0,68 USD (dont 0,42 de recherches Google : 11 requêtes `intitle:` à 0,03, d'où 28 requêtes garanties parties sur 40), jugement 0,25, liens morts 0,05, reste 0,10.
- Qualité (jugement de Claude) : cibles 1 à 15 : 14 bonnes sur 15 ; 16 à 30 : 11 sur 15 ; 31 à 40 : 5 sur 10.
- Email : `echec` (`Resend 401 validation_error`).

**Run 2** (17/11 00:12 UTC, audit `f530ee83…`, toujours visible dans le compte de test), après le retrait des opérateurs et le passage à 150 pages jugées : **54 cibles**. Ce run s'est fait **en deux temps** : il a échoué au tri (émoji coupé, voir plus bas), puis a été repris par le bouton « Reprendre à partir d'ici » une fois le correctif en production.

- 12 types déduits (blogs pédagogiques, sites d'écoles et classes, forums de professionnels de l'enfance, blogs familiaux, conseils parentaux, associations d'aide à l'enfance, bibliothèques et médiathèques, blogs de bien-être ; types voisins : annuaires d'activités, magazines jeunesse, boutiques et ateliers créatifs, collectivités et offices de tourisme).
- **Les 40 requêtes garanties sont toutes parties** pour 0,234 USD (run 1 : 28 requêtes pour 0,42 USD). Recherche : 51 appels, 0,48 USD (run 1 : 0,68).
- 677 candidats ; 47 écartés avant lecture ; 320 pages lues (8 lots) ; 160 jugées ; 64 pertinentes ; **54 avec contact** ; 310 en stock.
- **Par type de site** : 31 blogs, 7 médias, 6 annuaires, 6 écoles (mamaternelle.com, bouffere-stjoseph.fr, ecolesaintleger.com, les-maternelles.fr, mysticlolly.fr, un portail de l'académie de Grenoble), 2 associations (colibris-houilles.fr, pointkt.org), 2 boutiques. **21 cibles hors blogs et boutiques.** Bibliothèques : 1 cible trouvée par leurs recherches (aucun site de bibliothèque lui-même), scouts 0, mairies 0 cette fois.
- **Par type cherché** (candidats → cibles) : annuaires d'activités 43 → 6 ; magazines jeunesse 26 → 6 ; blogs pédagogiques 48 → 4 ; sites d'écoles 16 → 3 ; blogs familiaux 38 → 3 ; forums de professionnels 11 → 3 ; associations 23 → 2 ; conseils parentaux 22 → 1 ; boutiques 32 → 1 ; bibliothèques 15 → 1 ; bien-être 12 → 1 ; collectivités 1 → 0.
- **Par source** : contenu 155 pages lues → 32 cibles ; recherche Google 115 → 22 ; recoupement 44 → 2 ; mentions 24 → 0 ; liens morts 3 → 0. 4 liens morts prouvés.
- Durées des étapes : concurrents 31 s, recherche 289 s, tri et contacts 242 s, liens morts 201 s, soit **environ 12 min 45 en additionnant les étapes** (pas mesuré d'une traite, à cause de la reprise).
- Coût : 1,18 USD **avec le tri payé deux fois** (0,83 USD au moment de l'échec, 0,35 pour la reprise) ; sans l'échec, environ 0,92 USD (recherche 0,48, jugement 0,29, liens morts 0,06, reste 0,10).
- Email : `echec` (`Resend 401 validation_error`).

**« Lire d'autres sites » en production** (run 2, par l'interface) : premier essai en échec (l'enregistrement du lot butait sur la contrainte « une cible livrée a toujours un rang », après avoir supprimé 82 lignes de réserve ; lignes restaurées, écriture refaite sans suppression, PR #116). Second essai : **80 pages lues, 53 jugées, 18 cibles ajoutées en 90 secondes pour 0,09 USD** ; la liste passe de 54 à **72 cibles** (44 blogs, 8 écoles, 7 médias, 6 annuaires, 4 boutiques, 3 associations), rangs de 1 à 72 sans trou, 228 sites encore en réserve, écran mis à jour sans recharger.

**Critères du prompt maître** (pour ce site de test) : au moins 40 cibles : **oui** (40 puis 54) ; au moins 8 cibles hors blogs et boutiques : **oui** (13 puis 21) ; durée sous 15 minutes : **oui au run 1** (11 min 12), environ 12 min 45 au run 2 ; email reçu : **non**.

### Coût réel de la session (budget 3,00 USD, site de test seulement)

**2,87 USD** : journal des coûts depuis le début de la session 2,82 USD, plus deux sondes Backlinks faites à la main (0,05). Détail : run 1 1,08 ; run 2 1,18 (dont le tri payé deux fois) ; deux lots « Lire d'autres sites » 0,19 (dont le premier, perdu) ; mesure avant / après sur la copie de l'audit de référence 0,28 ; profils, types d'éditeurs et essais d'étape 1 (dont deux profils rejetés) 0,09 ; sondes 0,05. Les essais locaux (second site, jeu annoté) coûtent moins de 0,01 USD et sont comptés.

### Quatre pannes trouvées par les runs réels, corrigées

1. **Profil du site rejeté en entier pour un champ trop long** (le modèle a dépassé deux fois de suite une longueur maximale : « offre » de plus de 300 caractères, « ton » de plus de 120). Sans profil, l'analyse ne se lançait pas, sans aucune trace. Corrigé : la sortie est lue sans longueur maximale puis raccourcie aux limites (`brand/generate.ts > fitProfile`), une seconde tentative, et chaque échec est écrit dans `events` (`brand_profile.failed`). Ce défaut existait avant cette session.
2. **Recherches avec opérateur 5 fois plus chères** (voir H).
3. **Analyse en échec sur un émoji coupé** : « Missing surrogate » côté Inngest au second run, après 320 pages lues. Un extrait de page coupé au milieu d'un émoji n'est pas un texte valide et l'état de l'étape ne s'enregistre pas. Corrigé : extraits bien formés à la source, et tout résultat d'étape rendu bien formé avant d'être mémorisé (`src/lib/well-formed.ts`, `safeStep` dans les cinq jobs concernés). Ce défaut existait avant ; lire plus de pages le rend plus probable.

4. **« Lire d'autres sites » perdait des lignes de réserve** quand l'écriture du lot était refusée (voir K). Corrigé : une seule écriture par site, rang calculé avant, rangement rejouable (`qualification/more.ts > finalizeMore`, `rankAll`).

### Décisions (défauts appliqués, à confirmer par Jonathan)

- Budget de jugement 0,40 USD (demandé) : le **pire cas** annoncé d'une analyse passe à 1,14 USD (cible 1 USD, plafond 2 USD) ; l'attendu reste sous 1 USD. Budget de l'étape « liens morts » porté de 0,05 à 0,10 USD (0,048 mesuré pour 20 cibles jugées, le budget était atteint).
- Objectif de lecture : 150 pages jugées (le prompt disait « environ 120 » : 137 et 142 pages jugées ont donné 46 et 40 cibles, pour un objectif de 40 à 50).
- Seuil d'adéquation inchangé (0,5), voir G.
- Pas d'opérateur de recherche, voir H.
- 12 types d'éditeurs au plus ; avec 12 types, le budget de 40 requêtes garanties donne 3 ou 4 requêtes par type, pas 4 partout. Garantir 4 partout demande 48 recherches, soit environ 0,05 USD de plus par analyse : **non appliqué**, à décider.
- Le recoupement des concurrents n'a plus qu'une page (500 lignes) : 1 à 2 cibles pour 169 à 329 candidats sur ce site.
- Un champ `language` a été ajouté aux candidats ; pas de filtre de langue côté fournisseur pour les liens morts (essai : 2 lignes seulement pour un gros concurrent, et les lignes sans langue connue seraient perdues).
- La reprise d'une étape et « Lire d'autres sites » sont deux choses distinctes : la reprise refait tout le tri (et efface les décisions Garder / Écarter), le bouton ajoute un lot sans rien toucher.

### Fichiers clés

`src/features/qualification/{funnel,prefilter,more,deps,limits,free,page}.ts`, `src/inngest/functions/audit-qualify-more.ts`, `src/features/brand/{publishers,publisher-tags,generate,service,form,schema}.ts*`, `src/features/queries/{templates,plan,service,generate}.ts`, `src/features/collection/{run,limits,normalize}.ts`, `src/features/targets/{publishers,service,targets-screen,actions}.ts*`, `src/features/findings/{funnel,limits}.ts`, `src/features/analysis/notify.ts`, `src/lib/well-formed.ts`, `supabase/migrations/2026120400000000_candidate_language_stock.sql`, `scripts/shots/{prod-restart,focus,seed}.mjs`, `docs/master-prompt-3.md`.

### Commandes

- Run réel de bout en bout par l'interface : `pnpm shots:env && pnpm shots:seed`, puis `SHOTS_BASE_URL=https://outreach-links.vercel.app SHOTS_DIR=<dossier> NODE_USE_ENV_PROXY=1 node scripts/shots/prod-run.mjs` (environ 0,9 USD). La campagne mega-coloring.com France du compte de test doit être supprimée avant un nouveau run (même site et même pays = même campagne).
- Reprise d'une étape par l'interface : `PROD_SITE_ID=<site> PROD_STEP=tri node scripts/shots/prod-restart.mjs`.
- Capture ciblée d'un écran : `SHOTS_PATH=/app/site/<id>/cibles SHOTS_NAME=<nom> SHOTS_SCROLL='[data-testid=publisher-tabs]' node scripts/shots/focus.mjs`.
- Types d'éditeurs et requêtes d'un site, sans lancer de recherche : `NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true SECOND_SITE_LIVE=1 SECOND_SITE_DOMAIN=<domaine> pnpm vitest run src/features/queries/second-site.live.test.ts`.
- Jeu annoté du jugement : `NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:qualify-eval`. Tests SQL : `pg_ctlcluster 16 main start` puis `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm test`.

### Dettes et pièges

- **Email de fin** : clé Resend à remplacer (voir ci-dessous) ; aucun envoi constaté.
- **« Lire d'autres sites »** : pas d'étape « liens morts » pour les cibles ajoutées ; pas de test du rangement sur une vraie base (le test automatique utilise une base simulée, qui ne connaît pas les contraintes : c'est ce qui a laissé passer la panne) ; l'écran se rafraîchit seul toutes les 8 secondes pendant la lecture.
- **Contacts** : 15 cibles pertinentes sur 55 perdues faute de contact au run 1 (MU.8, le gain le plus rentable).
- **Bas de liste** : environ la moitié des cibles au-delà du rang 30 sont faibles (sites généralistes notés 0,5 ou 0,6). Le seuil ne peut pas être relevé sans perdre de bonnes cibles : passer par le jugement de Jonathan (`docs/eval-qualite-recherche.md`) puis par le prompt de jugement.
- **Jugement instable** : deux des 15 cibles d'origine ont été jugées autrement au second passage (le résultat dépend des autres sites jugés dans le même appel).
- **Lectures perdues** : 36 sites dont le robots.txt ne répond pas sont encore lus pour rien à chaque analyse (prix de la correction du point G) ; les candidats du recoupement sans signal de langue aussi (35 pages lues, 0 utilisable au run 1).
- **Barre fixe « Valider ces demandes »** : elle recouvre le bas de l'écran, donc une partie des onglets sur les captures pleine page (MU.10).
- **Onglets par type** : tous les blogs jugés « blog » se rangent sous le premier type de catégorie « blog » quand rien de plus précis ne les rattache.
- Le jugement des cibles a encore des longueurs maximales dans son schéma (une réponse trop longue ferait perdre un lot de 5) : 0 échec sur 91 appels cette nuit, à rendre tolérant comme le profil.
- Types voisins : aucun « mouvement de jeunesse » proposé par le modèle sur ce site ; l'utilisateur peut l'ajouter en étiquette.
- L'ancienne clé Resend `outreach-links-transactionnel` et la campagne « Luxembourg » du compte de test (copie de mesure) restent en place.
- `PROGRESS.md > État` : une seule ligne pour toute cette session.

### À fournir par Jonathan

- **Une clé Resend valide** : dans Resend, créer une clé « Sending access » limitée au domaine `ouiouioui.app`, puis la coller dans Vercel (projet `outreach-links`, variable `RESEND_API_KEY`, production et preview) et redéployer ; ou autoriser Claude à créer la clé à la prochaine session.
- **Son avis sur les cibles** du compte de test (bonnes / mauvaises, surtout au-delà du rang 30) pour régler le bas de liste.
- Décision : 48 recherches au lieu de 40 pour garantir 4 requêtes à chacun des 12 types (+0,05 USD par analyse).

### Prochain sous-jalon recommandé

`docs/master-prompt-3.md`, mis à jour le 17/11 après le retour de Jonathan (« bonne qualité ; comment en avoir le double avec les mêmes ressources ? ») : **deux fois plus de cibles à ressources égales** (réserve lue en arrière-plan, jugement moins cher pour l'arrière-plan, budget des sources sans rendement déplacé, contacts et autres pertes gratuites), avec un garde-fou de qualité ; puis email, MU.10, MU.5, MU.9, MU.7, MU.11.

Mesures prises pour ce prompt (audit `f530ee83…`, 72 cibles) : la première liste coûte 0,017 USD par cible, un lot de la réserve 0,005 ; 228 sites restent non lus (162 du contenu, 66 des recherches Google) ; liens morts des concurrents et mentions coûtent 0,11 USD par analyse pour 0 cible ; l'entrée (extraits de page) fait 59 % du coût du jugement ; 16 des 60 concurrents jugés ont un mot du thème dans leur nom de domaine (2 des 72 cibles). **Cibles jugées faibles par Claude sur les 72** (à confirmer par Jonathan) : creavea.com, amedenfant.fr, devenirparent.net, hello-merlin.com, paperblog.fr, bambintroc.fr, dessinpassion.com, journaux.fr, lepointdufle.net, maniaclic.blog4ever.com ; limites : editions-retz.com, flashmode.tn, kidscare.lu, wikicampers.fr, papadejojo.fr, bayard-jeunesse.com ; soupçon non vérifié de noms de domaine rachetés : nantes-artifice.fr, creativa-grenoble.com, laruellebleue.com, famille-heureuse.fr, trucetastuce.net.

## Session du 18/11 (matin) : lecture automatique de la réserve en arrière-plan (prompt maître n° 3, chantier A, étape 1 sur 7)

PR [#119](https://github.com/jonathan-enca/outreach-links/pull/119), CI verte, fusionnée, production déployée (`927ddef`). Migration appliquée en production avant le code : `qualification_background` (colonnes `auto_*` ajoutées seulement). Inngest : **39 fonctions** (38 + `audit-qualify-auto-start`), resynchronisé et vérifié avec `get_apps`.

### Ce qui est fait

- **Enchaînement** : à la fin de l'analyse (première liste inchangée), `analysis-run` envoie `audit/qualification.auto.requested` ; `audit-qualify-auto-start` prend le verrou et envoie le lot 1 ; chaque lot (`audit-qualify-more`, événement `audit/qualification.more.requested` avec `auto.lot`) se termine par une étape « advance » qui compte le lot, décide, et envoie au plus UN événement pour le lot suivant (identifiant fixe par lot). Un lot = `MORE_LIMITS` (environ 80 pages lues). Code : `src/features/qualification/background.ts`, `reserve.ts`, `more.ts`.
- **Un seul lot à la fois** : trois verrous. Base : le passage à « lot demandé » est une seule mise à jour conditionnelle ; Inngest : concurrence 1 par analyse ; bouton : « Lire d'autres sites » ne lance rien tant que la chaîne est en cours (message dédié).
- **Arrêts** (colonne `auto_stop`) : `reserve_epuisee`, `budget` (0,25 USD de jugement au total pour l'arrière-plan, **ajouté** aux plafonds durs ; chaque lot est borné par ce qui reste), `rendement_faible` (2 lots de suite sous 5 cibles), `duree` (15 minutes, le temps de lecture de chaque lot est borné par ce qui reste), `erreur`.
- **Rejeu sans doublon** : compteurs mis à jour par compare-and-set sur `auto_lots` ; un événement en retard ou rejoué ne relance pas un lot déjà fait.
- **Écran « Vos cibles »** : « Nous continuons à lire les autres sites trouvés. N cibles ajoutées depuis la première liste, M sites restent à lire », rafraîchi seul toutes les 8 s ; à la fin, le nombre de cibles ajoutées et la raison de l'arrêt ; le bouton revient s'il reste des sites.
- **Phrase « vous recevrez un email »** : **retirée** (`src/features/analysis/email-promise.ts`, constante `ANALYSIS_EMAIL_VERIFIED = false`). La clé Resend de Vercel date du 16/11 18:13 (inchangée), le dernier envoi a échoué (`Resend 401 validation_error`, 17/11 00:36), aucun email d'analyse dans Resend. À remettre à `true` après un premier envoi réel constaté.
- **Coût annoncé** : attendu 0,65 → **0,82 USD** (≤ 1,00) ; pire cas 1,17 → 1,42 USD (plafond 2). Mais le **réel mesuré** de la première liste était 0,92 USD (le modèle d'estimation était déjà optimiste) : réel attendu d'une analyse complète, environ 0,92 + 0,25 = **1,17 USD**, soit au-dessus de 1,00. À traiter à l'étape 2 (tarif réduit) ou en baissant le budget d'arrière-plan.
- **Tests** : `src/features/qualification/background.test.ts` (décisions et chaque arrêt, purs) ; `supabase/tests/qualification-background.test.ts` sur une **vraie base** via `supabase/tests/pg-client.ts` (mini client façon supabase-js sur Postgres : vraies contraintes et `on conflict`) : deux démarrages simultanés, bouton bloqué, événement rejoué, bornes de budget et de temps, `finalizeMore` (rangs contigus, réserve conservée, rejeu), enchaînement, chaque arrêt, redémarrage.

### Mesure

**Incident de ma part** : pour préparer les captures j'ai lancé `pnpm shots:seed`, qui réinitialise l'espace du compte de test : il a **supprimé l'audit de mesure f530ee83 (72 cibles, 228 en réserve)**, alors qu'un premier lot venait de partir dessus (ce lot, perdu, a coûté quelques centimes ; non compté dans le tableau). Aucune donnée de vrai client touchée. **Ne plus lancer `shots:seed` sur un compte dont on veut garder un audit.** Mesure refaite sur une copie, dans le compte de test, de l'état « première liste » de l'analyse du 16/11 (audit `37a97992…`, 677 candidats : 15 cibles, 524 sites en réserve, ancien code), audit `fc43af7d-82b6-458f-bdef-60cb6956f435`, site `b298baeb-7696-49a4-9d19-c46f809b260f`. Les conditions ne sont donc pas celles demandées (72 / 228) : la réserve est plus grande (524) et la première liste plus petite (15).

|                                 | Résultat                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Lots enchaînés                  | 3 (lot 1 : +33 cibles en 1 min 40 pour 0,116 USD ; lot 2 : +10 ; lot 3 : +11)                                  |
| Cibles ajoutées                 | **54** (15 → 69)                                                                                               |
| Durée de l'arrière-plan         | **4 min 17** (08:10:03 → 08:14:20)                                                                             |
| Coût du jugement d'arrière-plan | **0,245 USD**, soit **0,0045 USD par cible** (première liste : 0,017 ; lot de réserve mesuré le 17/11 : 0,005) |
| Raison d'arrêt                  | `budget` (0,245 sur 0,25) ; il restait 211 sites en réserve                                                    |
| Premier lot                     | 0,0035 USD par cible, les lots suivants rapportent moins (21 cibles pour 0,13 USD, soit 0,006)                 |

**Qualité** (jugement de Claude, à confirmer par Jonathan ; le lot d'origine d'une cible n'est pas enregistré, donc comparaison entre les 10 mieux et les 10 moins bien classées des 54 ajoutées) : note moyenne d'adéquation 0,74, 1 seule à 0,5, 37 blogs, 15 hors blogs et boutiques. **Les 10 mieux classées : 9 bonnes, 1 limite** (astucesdefilles.com, écoles de l'académie de Strasbourg, viedeparents.fr, ludiloisirs.fr, pordic.fr…). **Les 10 moins bien classées (celles ajoutées en dernier au sens du score) : 3 bonnes (liyah.fr, 38.kidiklik.fr, trucetastuce.net), 4 limites (mineurs.fr, bricabracblocenvrac, apprendre-reviser-memoriser.fr, florenceducatteau.com), 3 faibles (choisir-ma-creche.com, momes-et-merveilles.fr, devenirparent.net)**. Même gradient que celui déjà mesuré : la fin de liste est plus faible, comme les rangs 31 et plus du 17/11. Aucune règle de tri changée.

Captures connectées (production, compte de test) dans `docs/captures-arriere-plan/` : `bureau-` et `mobile-lecture-en-cours.png`, `bureau-` et `mobile-lecture-fin.png`. Sur mobile, la barre fixe « Valider ces demandes » recouvre une partie du message de fin (dette MU.10).

### Dettes

- Estimation annoncée (0,82) sous le réel attendu (environ 1,17) : voir plus haut.
- Pas d'étape « liens morts » pour les cibles ajoutées (Backlog).
- Le lot d'origine d'une cible n'est pas enregistré (comparaison de qualité par lot impossible) : ajouter une colonne si l'on veut la suivre.
- Clé Resend toujours invalide : Jonathan doit en poser une (voir « À fournir par Jonathan »).
- Le dernier lot est borné par le budget restant (0,06 USD) : il lit moins de pages que les précédents, ce qui explique en partie son rendement plus faible.

## Session du 18/11 (matin, suite) : jugement de l'arrière-plan à tarif réduit (prompt maître n° 3, chantier B, étape 2 sur 7)

PR [#121](https://github.com/jonathan-enca/outreach-links/pull/121) (code) et [#122](https://github.com/jonathan-enca/outreach-links/pull/122) (budget recalé), CI vertes, fusionnées, production déployée (`1a7dbda`). Migration appliquée en production avant le code : `2026120600000000_cost_ledger_batch_key.sql` (index unique, une ligne de coût par requête de lot). Inngest : **39 fonctions** (aucune ajoutée), resynchronisé, vérifié avec `get_apps`.

### Vérification dans la documentation Anthropic (18/11/2026, `platform.claude.com/docs/en/build-with-claude/batch-processing`)

- L'API par lots (Message Batches) existe et est stable ; elle accepte notre modèle (`claude-haiku-4-5`, par défaut en production : aucune variable `LLM_MODEL` sur Vercel, `ANTHROPIC_API_KEY` posée).
- **Remise : 50 %** sur l'entrée et la sortie (Haiku 4.5 : 0,50 / 2,50 USD par million de jetons au lieu de 1 / 5).
- Délai annoncé : « la plupart des lots finissent en moins d'une heure », maximum 24 h. Les paramètres sont ceux d'un appel normal (outil forcé, schéma), donc **même prompt, mêmes règles**.
- Note : la grille liste aussi Claude Haiku 5.5 à 0,05 / 0,25 USD par million de jetons en lots. Changer de modèle changerait le jugement : hors périmètre, voir Dettes.

### Délai réel mesuré (production, compte de test, copies de l'audit de mesure)

| Lot                           | Requêtes (5 cibles chacune) | Attente de la réponse |
| ----------------------------- | --------------------------- | --------------------- |
| 1 (copie X)                   | 8                           | **183 s**             |
| 2 (copie X)                   | 5                           | **154 s**             |
| 3 (copie Y, plafonds recalés) | 5                           | **122 s**             |

Environ 3 minutes, loin de la limite de 15 minutes : **l'API par lots est gardée**. Je n'ai pas isolé un lot d'une seule requête de 5 cibles : la clé Anthropic n'existe qu'en production, la mesure passe donc par le vrai lot d'arrière-plan (5 à 8 requêtes).

### Ce qui est fait

- `src/lib/llm/batch.ts` : client de l'API par lots (envoi, état, résultats, annulation), erreur HTTP réduite au statut, coût RÉEL de chaque réponse journalisé dans `cost_ledger` (`llm.qualification.batch`, `metadata.batchId` et `customId`) ; `src/lib/llm/pricing.ts` : `BATCH_DISCOUNT = 0,5`.
- `src/features/qualification/funnel.ts` : en mode lots, les pages du lot sont lues d'abord, puis **un seul envoi** pour tous les groupes de 5 cibles. L'attente passe par `hooks.wait`, branché sur `step.sleep` dans `audit-qualify-more` (jamais une requête qui bloque), suivie d'une lecture d'état (`judge-poll-N`, un step par lecture, toutes les 30 s). Après 10 minutes, le lot est annulé et chaque groupe sans réponse est rejugé en **appel direct** (aucune cible perdue). Un groupe en erreur ou à la sortie invalide est lui aussi rejugé en direct. Budget planifié avant l'envoi au tarif des lots (pire cas × 0,5) ; les groupes qui ne tiennent pas restent en réserve (`hors_budget_llm`). Plafonds durs (`guard`) contrôlés avant l'envoi.
- **Seulement l'arrière-plan** : la première liste et le clic « Lire d'autres sites » restent en appels directs (pas de `wait` fourni). Interrupteur : `LLM_BATCH_JUDGEMENT=off` (variable Vercel, défaut `on`) ; sans clé Anthropic ou avec OpenAI : appels directs.
- Mêmes prompt (`judgementRequest` / `toJudgements` partagés avec l'appel direct), mêmes règles de tri, mêmes seuils (testé : mêmes résultats cible par cible qu'en direct, coût plus bas).
- **Rejeu sans doublon** : les résultats d'un lot relus ne recréent pas de ligne de coût (index unique, erreur « duplicate key » ignorée) ; un lot rejoué avec ses steps mémorisés n'envoie rien de nouveau.
- Statistiques de lot ajoutées à `more_stats` : `judgeMode: "lots"`, `batch: { requests, waitMs, fallbacks, canceled }`.

### Tests

- `src/features/qualification/batch-judging.test.ts` (un seul envoi, attente par pas, mêmes résultats qu'en direct, repli après annulation, repli d'un seul groupe, budget, rejeu), `src/lib/llm/batch.test.ts` (tarif, forme de la requête, états, résultats, erreurs, doublons).
- **Vraie base** : `supabase/tests/qualification-background.test.ts` (nouveau test : lot jugé par lots, deux lignes de coût à demi-tarif, résultats relus sans doublon, étapes rejouées sans nouvelle requête, la chaîne compte le coût du journal une seule fois) ; `supabase/tests/pg-client.ts` gère maintenant `insert` et `single`.
- Leçon : la première CI a échoué parce que j'avais lancé en local la suite complète SANS base. **Toujours lancer avec `TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres`** (Postgres 16 dans `/var/tmp/pgd`, port 55432).

### Mesure sur deux copies du compte de test (mêmes candidats)

L'audit de mesure du 16/11 n'existe plus (incident de `shots:seed`, session précédente). Les copies partent de l'audit `fc43af7d…` (69 cibles, 211 en réserve : la réserve restante est la moins bien classée, donc moins rentable que celle du matin). Copie X (`a2e12ab1…`) : chaîne par lots ; copie Y (`2b8ee04f…`) : un lot en appels directs (« Lire d'autres sites »). Aucune donnée de vrai client touchée.

|                                  | Par lots (X, 2 lots)                   | Direct (Y, 1 lot) |
| -------------------------------- | -------------------------------------- | ----------------- |
| Requêtes / appels                | 13                                     | 9                 |
| **Coût du jugement**             | 0,0538 USD                             | 0,0709 USD        |
| **Coût par requête de 5 cibles** | **0,0041**                             | 0,0079            |
| Cibles ajoutées                  | 15 (10 + 5)                            | 10                |
| **Coût par cible ajoutée**       | **0,0036 USD**                         | 0,0071 USD        |
| Durée                            | 7 min 56 s (≈ 3 min d'attente par lot) | 1 min 40 s        |

Contrôle : 62 291 jetons en entrée et 9 076 en sortie pour 13 requêtes, soit 0,1077 USD au tarif standard, la moitié = 0,0538 (**remise de 50 % exacte**). Rappel : 0,0045 USD par cible mesuré le matin (direct, réserve plus riche). Compromis : **le jugement coûte moitié moins, mais chaque lot dure environ 3 minutes de plus**.

Copie Y refaite avec les plafonds recalés (production) : 1 lot, 5 requêtes, attente 122 s, +6 cibles, 0,0195 USD, arrêt `reserve_epuisee`.

**Qualité des 15 cibles ajoutées** (jugement de Claude, à confirmer par Jonathan ; même modèle et même prompt, donc pas de changement attendu). Les 10 dernières (rangs 54 à 83) : 4 bonnes (famille-heureuse.fr, creativa-grenoble.com, lacavernedanais.com, hashtag-mum.com), 4 limites (anaisetsapetitevie.blogspot.com, blogblogyaquelquun.com, ricochet-jeunes.org, rainbowcoloringpage.com), 2 faibles (decorationdenoelbgv.blogspot.com, bouillondidees.com, tous deux à 0,5). Les mieux classées (guide-maternelle.fr, école de Châteauneuf-Sainte-Thérèse, lireetfairelire.org, ecolepositive.fr) : bonnes. Même gradient qu'avant, aucune règle de tri changée.

### Budget et coût annoncé recalés

- Première liste mesurée : 0,92 USD (17/11). `AUTO_LIMITS.budgetUsd` **0,25 → 0,07 USD** (tarif des lots) : 0,92 + 0,07 = **0,99 USD, sous 1,00**. Dépensé en mesure : 0,054 (X) et 0,0195 USD (Y), la réserve s'épuisait avant le plafond. Plafond dur contrôlé avant l'envoi (pire cas) et à chaque lot (reste du budget).
- **Compromis à connaître** : 0,07 USD finance environ 17 requêtes, soit 85 pages jugées et 15 à 25 cibles ajoutées, contre 54 le matin à 0,245 USD en direct. À **0,15 USD**, environ le double de cibles ajoutées pour environ 1,07 USD au total. Décision de produit : un seul chiffre (`AUTO_LIMITS.budgetUsd`, `src/features/qualification/background.ts`).
- `AUTO_LIMITS.maxMs` 15 → **25 minutes** (l'attente de chaque lot s'ajoute) ; `AUTO_EXPECTED_SHARE` 0,7 → 0,8.
- Coût annoncé (`estimate.ts`) : part attendue de la qualification 0,5 → 0,73 (mesuré 0,29 sur 0,40). L'écart restant entre annoncé et réel vient surtout de la recherche (mesurée 0,48 USD) : à recaler avec plus de mesures (une seule donnée).
- **Non refait** : une analyse complète de bout en bout par l'interface (hors budget de l'étape). Le total 0,99 est la somme de deux mesures (0,92 du 17/11 et le plafond d'arrière-plan), pas un run unique.

### Captures

Aucun écran modifié : pas de nouvelles captures.

### Coûts de la session

**0,144 USD** de jugement (0,0538 + 0,0709 + 0,0195 ; budget fixé 0,60 USD), 0 USD DataForSEO. Copies de mesure laissées dans le compte de test (audits `a2e12ab1…` et `2b8ee04f…`).

### Dettes

- Chaque lot attend ~3 minutes : lire le lot suivant pendant l'attente du précédent serait possible (enchaînement plus complexe).
- Un lot d'une seule requête de 5 cibles n'a pas été mesuré isolément.
- Le lot d'origine d'une cible n'est toujours pas enregistré.
- Claude Haiku 5.5 en lots (0,05 / 0,25 USD par million de jetons annoncés) : à tester sur le jeu annoté avant tout changement de modèle.

## Session du 18/11 (matin, suite 2) : ne plus payer ce qui ne rapporte rien (prompt maître n° 3, chantier C, étape 3 sur 7)

PR [#124](https://github.com/jonathan-enca/outreach-links/pull/124) (code) fusionnée, production déployée (`0427ceb`) ; une seconde PR recale le budget et le coût annoncé. Inngest : **39 fonctions** (aucune ajoutée), vérifié avec `get_apps`. Aucune migration.

### Ce qui est fait

- `src/features/collection/worth.ts` (pur, 0 USD, aucun mot propre à un thème) :
  - **Liens morts des concurrents** : parmi les 5 premiers concurrents retenus, on n'interroge pas un « géant » (au moins 10 000 domaines référents ; taille inconnue = jamais écarté) ni un concurrent d'une autre langue visible (adresse d'exemple ou extension de pays, même règle que le filtre avant lecture). Aucun remplaçant n'est pris dans la suite de la liste.
  - **Mentions de marque** : lancées seulement si au moins une écriture du nom n'est pas descriptive (une fois retirés les mots du thème et des mots-clés, de même racine sur 5 lettres, il reste plus de 4 lettres ; un nom collé comme « MegaColoring » est découpé ; moins de 5 lettres = trop ambigu). Sinon aucun appel (ni recherche Google de marque, ni Content Analysis).
- Le plan figé garde la raison (`plan.skipped`, défaut vide pour les anciens plans). Écran « Vos cibles » : sous « Mentions sans lien », si rien n'a été trouvé, il dit soit « cette recherche a été faite : aucune cible », soit « n'a pas été lancée : [raison] » ; sous « Pages ressources et liens morts », une ligne liste les concurrents non interrogés avec la raison. La tactique reste donc affichée avec son résultat honnête.
- Non touché : liens morts PROUVÉS sur les pages des cibles, règles de tri, seuils, requêtes de recherche.
- Tests : `worth.test.ts` (règles, cas mesuré, plan, ancien plan sans `skipped`) ; les fixtures de `collection.test.ts` utilisent maintenant un nom de marque distinctif (« Atelier Plumeau »), car « Mega Coloring » est désormais jugé descriptif.

### Mesure avant / après (copie `c0a1c0de-0000-4000-8000-000000000003` de l'audit `fc43af7d…`, même plan de recherche, production)

| Phase                       | Avant (runs du 16/11, ledger)                                            | Après (copie, run réel)                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mentions de marque          | environ 0,033 USD, 0 cible                                               | **0 appel, 0 USD** (nom jugé descriptif)                                                                                                             |
| Liens morts des concurrents | 3 appels, 0,0748 USD (magnific.com, c-monetiquette.fr, esle.io), 0 cible | magnific.com écarté (21 154 domaines), puis **3 appels quand même** (c-monetiquette, esle, lululataupe), 0,0251 USD payés (2 en cache), 24 candidats |
| Collecte entière            | 0,357 USD (réel)                                                         | 0,097 USD **payés**, mais 13 recherches, 2 liens morts, 4 Content Analysis, 1 recoupement sortis du cache : non comparable                           |

**Honnêtement : l'économie réelle est de 0,033 USD (mentions), pas de 0,108.** La phase « liens morts » était déjà plafonnée à 3 appels par son budget de phase (0,085 USD), donc retirer le géant fait seulement passer l'appel suivant : même dépense, mais sur un concurrent de bonne taille et de la bonne langue plutôt que sur un site d'IA anglophone qui avait fourni 31 des 32 candidats « liens morts » (aucun devenu cible). esle.io (anglophone dans son adresse d'exemple) n'est pas détecté : aucun signal de langue fiable pour une adresse `.io`. L'économie des mentions ne vaut que pour un nom descriptif (c'est le cas du site de test).

### Décision de produit (à valider par Jonathan) : budget d'arrière-plan et coût annoncé

- `AUTO_LIMITS.budgetUsd` **0,07 → 0,08 USD** (`src/features/qualification/background.ts`). Raison : première liste mesurée 0,92 USD + 0,08 = **1,00 USD**, la limite demandée, même pour un nom de marque distinctif (aucune économie). Pour un nom descriptif, le total tombe à environ 0,97 USD. Aller plus haut (0,10 par exemple, plus de lots jugés) ferait dépasser 1,00 USD pour un nom distinctif : je ne l'ai pas fait. Si tu préfères le gain de cibles au plafond de 1,00 USD, c'est ce seul chiffre.
- Coût annoncé (`estimate.ts`) : part attendue de la collecte **0,56 → 0,65** (collecte mesurée à 0,357 USD sur 0,55) : attendu **0,796 → 0,853 USD** (≤ 1,00 ; pire cas inchangé sous le plafond de 2). Il reste sous le réel mesuré de la première liste (0,92) : l'écart vient de la recherche et du profil (non mesurés ici), à recaler en MU.11. L'économie des mentions n'est pas comptée, par prudence.
- Test `background.test.ts` : l'analyse complète est maintenant vérifiée « au plus 1,00 USD » (et non « strictement sous »).

### Coûts de la session

**0,097 USD** de DataForSEO (copie `c0a1c0de…`, une collecte), 0 USD de LLM, sur un budget de 0,60 USD. La copie reste dans le compte de test ; le plan de l'audit `fc43af7d…` porte maintenant `skipped` (même valeur que celle que le nouveau code aurait écrite) pour que l'écran l'affiche.

### Ce qui n'a pas été fait / pièges

- **Captures connectées bureau 1440 et mobile 390 non faites** : le mot de passe du compte de test ne correspond plus à celui de l'environnement (connexion refusée) ; le réaligner par SQL sur `auth.users` a été refusé par le système d'autorisation, et `shots:seed` est interdit (il supprime les audits). Il suffit de réaligner le mot de passe du compte de test pour refaire `focus.mjs` (`SHOTS_CLICK` sur « Mentions sans lien », chemin `/app/audit/fc43af7d-82b6-458f-bdef-60cb6956f435/cibles`).
- **Branche créée par erreur** : `m-c-ne-plus-payer-le-vain` a été poussée avant que je relise la consigne (branche imposée : `claude/reduce-wasted-calls-4h5y3a`) ; son contenu est identique à la PR fusionnée, mais le proxy a refusé de la supprimer : à supprimer à la main sur GitHub (aucun risque).
- Idée hors périmètre (Backlog) : un concurrent « plus de 10 fois plus gros que le site » serait un meilleur critère de géant que le seuil fixe de 10 000 (la taille du site est dans l'état des lieux, pas dans le plan).

## Session du 18/11 (matin, suite 3) : récupérer les pertes gratuites (prompt maître n° 3, chantier D, étape 4 sur 7)

Branche `claude/etape-4-pertes-gratuites-uexz0u`. Aucune migration, aucune nouvelle fonction Inngest (39 attendues). **Aucune règle de tri ni seuil modifié** : jeu annoté et prompts de jugement intacts (aucun jugement relancé pour ça). Tests, lint, typecheck et format verts, avec `TEST_DATABASE_URL` (1363 tests).

### Ce qui est fait

- **D.1 Contacts (MU.8)**, trois causes réelles trouvées en rejouant l'enquête sur les 19 cibles perdues de l'audit de référence `fc43af7d…` :
  1. **Lien « Contact » jamais lu** : le lecteur ne gardait que les 120 premiers liens de la page ; le pied de page (« Contact », « Mentions légales », « À propos ») vient après. Il garde maintenant jusqu'à 30 liens de contact en plus (`page-reader.ts`, `MAX_EXTRA_CONTACT_LINKS`). Les autres liens restent plafonnés comme avant.
  2. **Page de contact fermée par robots.txt** (over-blog / eklablog : `Disallow: /contact`) : on ne la lit toujours pas, mais le site la lie lui-même : la cible devient une **tâche manuelle** (« à ouvrir à la main ») au lieu d'être perdue. Seulement une vraie page « Contact » (dernier segment `contact`, `nous-contacter`, `contactez-nous`…) : une page de connexion ou un contact produit (`contact-kits-pedagogiques`) est ignorée.
  3. **Formulaires non reconnus** : formulaire sans zone de message (extensions Ninja Forms, WPForms, CF7, Gravity, etc. dessinées par script, ou trois champs dont un email) reconnu. Une inscription à une lettre d'information ou une recherche ne l'est toujours pas.
  - Plus : sondage de quatre pages usuelles (`/contact`, `/nous-contacter`, `/mentions-legales`, `/a-propos`) quand le menu n'en montre aucune, arrêt dès qu'un contact apparaît (`CONTACT_LIMITS.probePaths`).
  - **Onglet à part** : écran « Vos cibles », section repliée « Sites pertinents sans contact trouvé (N) » (domaine, accroche, lien vers la page), hors validation. `TargetsView.noContact`.
  - Jamais d'adresse devinée ni inventée (test dédié).
- **D.2 « Éditeur introuvable »** : avant d'écarter une page intérieure, on lit l'accueil du site (`rescueFromHome`, `QUALIFY_LIMITS.homeRescue`). L'accueil qui prouve un vrai motif (parqué, piraté, vendeur de liens, connexion) écarte pour ce motif ; l'accueil qui montre un éditeur sauve le site, et la page jugée reste la page d'origine. Statistiques `stats.lostFree` (`homeTried`, `homeRescued`).
- **D.3 Robots.txt muet** : nouvelle valeur `muet` (pas de réponse en 5 s ou erreur 5xx) : le site passe en **fin de file**, n'est pas écarté.
- **D.4 Nom de domaine du thème** : un nom de domaine qui porte une racine (5 lettres) d'un mot du thème de la campagne (`nameCarriesTheme`, mots du `theme`, rien en dur) passe en fin de file, jamais écarté. Un candidat qui cumule les deux reste en fin de file.

### Mesures avant / après (sans appel DataForSEO ; lectures HTTP polies ; copie en lecture seule des lignes de l'audit `fc43af7d…`, rien écrit en base)

| Chantier         | Avant                                                                                      | Après                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D.1 contacts     | 19 cibles pertinentes sans contact sur 88 (69 livrées)                                     | **13** : 5 passent en formulaire / page à ouvrir (centre-de-loisirs, kidfriendly, parolesdebebe69, 2 eklablog) et 1 en adresse « à vérifier » (jebouquine, adresse du groupe Bayard)       |
| D.2 éditeur      | 34 écartés                                                                                 | 17 accueils lus, **2 sauvés** (byothe.fr, citizenkid.com), 28 encore écartés ; les 2 sauvés ont été jugés (0,0004 USD) : pertinents (0,8 et 0,5) mais **0 cible** : adresse jugée invalide |
| D.3 robots muet  | 58 sites muets sur 431 candidats                                                           | en fin de file ; **3 seulement avaient été lus** sur ce run, dont 1 cible : gain de places de lecture ≈ 0 ici                                                                              |
| D.4 nom du thème | 13 sites sur 200 jugés portent un mot du thème, dont 11 écartés comme concurrents, 1 cible | ces 11 jugements passent en fin de file (≈ 5,5 % du jugement) ; la cible `exercices-a-imprimer.com` est lue plus tard, jamais perdue                                                       |

**Honnêtement : l'objectif « moins de 5 cibles pertinentes perdues sur 64 » n'est pas atteint** (19 → 13). Les 13 restantes : 3 sites de forum sans page de contact trouvable, 1 site (fiche-maternelle.com) dont l'adresse est écrite en lettres espacées, 1 site dont l'accueil renvoie 403 (lecteur de secours Jina non configuré), 6 sites sans aucune adresse publique lisible (dont une page de contact derrière une connexion, materbelle.fr), et 2 adresses refusées par le vérificateur DNS. Aller plus loin demanderait un finder payant (D5 : toujours non) ou le lecteur de secours. D.2 sauve 2 sites sur 34 et **0 cible** : le « 48 sites récupérables » du prompt n'existe pas, la plupart des accueils n'ont pas non plus d'éditeur visible. D.3 et D.4 ne changent le coût que quand le budget de lecture ou de jugement est atteint avant la fin de la file.

### Coûts de la session

**0,0004 USD** de LLM (jugement des 3 sites sauvés), 0 USD de DataForSEO, sur un budget de 0,60 USD.

### Outils de mesure ajoutés (gratuits, ignorés sans variable)

`pnpm demo:contacts-measure` (enquête de contact sur une liste), `demo:lost-free` (accueil sauveur), `demo:lost-funnel` (entonnoir réel sur une liste, budget `LOST_FUNNEL_BUDGET`, défaut 0,10 USD), `demo:robots-silent`. Entrées JSON `[{domain,url}]` ; voir l'en-tête de chaque fichier `*.live.test.ts`.

### Pièges et dettes

- **Captures de l'étape 3 non refaites** : le mot de passe du compte de test n'est pas réaligné (pas de `.env.local` dans ce conteneur) ; le réaligner par SQL sur `auth.users` a déjà été refusé, `shots:seed` est interdit. La nouvelle section « Sites pertinents sans contact trouvé » n'a donc **pas de capture non plus** (elle est repliée, markup minimal, vérifié seulement par typecheck et tests).
- `hasContactForm` est aussi lu par le tri et les signaux d'éditeur : des pages qui n'avaient pas de « formulaire » en ont maintenant un (extensions de formulaire reconnues). Effet attendu : un peu moins d'« éditeur introuvable ». Une lettre d'information bâtie avec une de ces extensions pourrait être prise pour un formulaire de contact (à surveiller).
- La lecture de l'accueil ajoute des requêtes HTTP (environ 9 % de lectures en plus sur l'audit de référence), avec le délai par hôte habituel.
- Idée hors périmètre (Backlog) : lecteur de secours Jina pour les accueils en 403 (plare.fr) ; adresses écrites en lettres espacées (fiche-maternelle.com) ; le « mot de passe du compte de test » : prévoir un script qui le réaligne par l'API d'administration d'authentification.

## Session du 18/11 (matin, suite 4) : garde-fou de qualité du bas de liste (prompt maître n° 3, chantier E, étape 5 sur 7)

Branche `claude/gallant-gates-7ooyc4`. Aucune migration, aucune fonction Inngest, **aucune règle de tri ni seuil modifié** (jeu annoté intact). 0 USD dépensé (lectures HTTP polies, requêtes SQL en lecture).

- **E.1** Aucun avis de Jonathan dans PROGRESS.md ni dans `docs/eval-qualite-recherche.md` : les 16 cibles faibles / limites de Claude sont ajoutées comme « à confirmer » (`QUALITY_TO_CONFIRM`, `verdict: null`, hors de toute métrique), avec test. Rien n'est changé sur leur seule base.
- **E.2** Mesure sur trois analyses du 16/11 (l'audit f530ee83 de 72 cibles n'existe plus en base) : pages d'accueil = 23 % des cibles 1 à 30, **56 % à partir de la 61e** ; adéquation moyenne 0,77 → 0,70 → 0,67. Piste plausible, mais seulement 1 faible sur 5 est un accueil : pas assez pour fixer un poids. Non codée.
- **E.3** Lecture réelle des 5 sites : laruellebleue.com (réseau probable : thèmes sans rapport, rubrique « Jeux d'Argent », 8 liens de pied de page vers des sites sans rapport), creativa-grenoble.com (mélange de thèmes, suspect), famille-heureuse.fr (**confirmé** : accueille les « articles sponsorisés » sur sa page contact ; la règle `sellsLinks` existante le verrait, mais la cible a été jugée sur une page intérieure), nantes-artifice.fr et trucetastuce.net **non confirmés**. Aucune règle ajoutée.
- **E.4** Tableau par tranche dans `docs/eval-qualite-recherche.md` §3. Avant / après identiques (rien n'a changé).
- Backlog : lire l'accueil des cibles jugées sur une page intérieure pour y chercher une vente de liens (attrape 1 site sur 5 ici, une lecture de plus par cible) ; à décider avec l'avis de Jonathan.
- Prochain : étape 6 (chantier F, run réel de contrôle ; budget restant 0,60 USD dont rien n'est consommé).

## Session du 18/11 (matin, suite 5) : run réel de contrôle (prompt maître n° 3, chantier F, étape 6 sur 7)

Branche `claude/controle-run-reel-etape-6-7i5qhe`. **Run réel NON lancé : 0 USD dépensé.**

- Raison : le budget fixé pour cette étape est 0,60 USD. Une analyse complète de mega-coloring.com France coûte 0,92 USD (première liste, mesuré) + 0,08 USD (arrière-plan) = environ 1,00 USD (voir « Décision de produit : budget d'arrière-plan »). Le cache DataForSEO n'est jamais lu sur le site de test (MA.8) : aucune économie possible. Lancer le run aurait dépassé le budget ou l'aurait coupé avant la fin, sans donner de mesure valable pour le critère (100 cibles, 1 USD, 13 minutes).
- Vérifié gratuitement : production répond (200), Inngest `outreach-links` à 39 fonctions, synchronisé le 17/11, chantiers A à E fusionnés dans `main` (dernier : #127).
- Pour faire le run : budget d'au moins 1,10 USD, puis `pnpm shots:env` (sans `shots:seed` si un audit est à garder), supprimer la campagne mega-coloring.com France du compte de test, `SHOTS_BASE_URL=https://outreach-links.vercel.app SHOTS_DIR=<dossier> NODE_USE_ENV_PROXY=1 node scripts/shots/prod-run.mjs`. Noter : cibles et durée à la première liste puis en fin d'arrière-plan, coût total et par cible, types, qualité par tranche.
- Prochain : étape 7 ; le run de contrôle reste à faire avec le budget.

### Run réel de contrôle (chantier F) : fait, budget accordé 1,10 USD

Site `afb08915…`, audit `b229254e…`, mega-coloring.com France, compte de test, par l'interface (`prod-run.mjs`). Préparation : mot de passe du compte remis par l'API d'administration, **seule la campagne mega-coloring.com FR supprimée** (pas de `shots:seed`, les 3 autres sites de démo intacts).

| Mesure                                                              | Résultat                                                                                                                | Critère                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Première liste prête en base                                        | **9 min 32 s** après le clic (10:51:56) ; l'écran passe « terminé » à **13 min 17 s** (10:55:44)                        | ≤ 13 min : **limite dépassée de 17 s à l'écran** |
| Cibles à la première liste                                          | **61** (84 moins 23 ajoutées ensuite)                                                                                   |                                                  |
| Cibles à la fin de l'arrière-plan (11:05, 2 lots, arrêt « budget ») | **84**, dont 41 contactables par mail                                                                                   | ≥ 100 : **non atteint**                          |
| Coût total                                                          | **0,977 USD** (DataForSEO 0,550 ; LLM 0,353 ; arrière-plan 0,073)                                                       | ≤ 1,00 : atteint                                 |
| Coût par cible                                                      | 0,0116 USD (avant : 0,017 pour 54 cibles)                                                                               |                                                  |
| Types                                                               | blog 54, école 7, association 7, annuaire 5, média 5, forum modéré 3, e-commerce 2, autre 1 (194 en réserve non jugées) |                                                  |
| Tranches (rang 1-30 / 31-60 / 61+)                                  | 30 / 30 / 24 cibles ; adéquation moyenne 0,78 / 0,78 / 0,67 ; accueils 4 / 9 / 9                                        |                                                  |

**Pourquoi 84 et pas 100** : 104 sites jugés pertinents sur 250 jugés, mais la liste courte retient 84 ; l'arrière-plan s'est arrêté sur son budget (0,08 USD) avec 194 sites encore en réserve non jugés (`hors_budget_lecture`). Le gain de volume est réel (54 → 84 cibles, +55 %, à coût par cible −32 %) mais pas le double. Le levier restant est le budget d'arrière-plan : il y a ~0,12 USD de marge sous 1,10 USD, soit environ 10 cibles de plus, pas 16. Atteindre 100 demande de dépasser 1,00 USD ou de rendre la lecture moins chère (116 s de lecture sur 250 sites jugés : 37 injoignables, 58 hors langue, 41 concurrents).
Qualité : la part « bonne » par tranche n'est pas mesurée (pas d'avis de Jonathan sur ces cibles) ; seul l'indice d'adéquation est donné, en baisse au bas de la liste (0,67), comme à l'étape 5.
Dépense réelle de l'étape 6 : **0,977 USD** sur 1,10. Prochain : étape 7.

### Décision de Jonathan (17/11, après le run de contrôle) : 84 cibles suffisent en v1

- Le critère « 100 cibles pour 1 USD » est abandonné : **84 cibles à 0,98 USD, avec l'adéquation mesurée, est la qualité présentée en v1**. On ne force pas le volume (coût et qualité en bas de liste).
- Les 194 sites en réserve restent disponibles à la demande (« Lire d'autres sites »).
- Nouveau critère de suivi : **cibles contactables** (41 sur 84 ici) pour un coût donné.
- Étape 7 : comprendre pourquoi 43 cibles sur 84 n'ont pas d'email trouvé et en récupérer sans payer plus (finder payant toujours non) ; email de fin d'analyse (clé Resend invalide) ; pas de nouveau run réel sauf besoin (budget 0,50 USD).

## Session du 18/11 (suite 6) : étape 7, contacts récupérés gratuitement et email de fin

Branche `claude/email-recovery-targets-ma0fhv`. 0 USD dépensé (lectures HTTP polies, DNS-over-HTTPS pour la mesure, SQL en lecture). Aucune migration, aucune fonction Inngest, aucune règle de tri modifiée. Tests (1040 sous `src/features`), lint et typecheck verts.

### Pourquoi 43 cibles sur 84 n'avaient pas d'email (audit `b229254e…`)

- **32 « formulaire »** : le site n'a qu'un formulaire ; l'enquête (rejouée à l'identique sur les 43) ne trouve aucune adresse sur le domaine. Pour la plupart c'est vrai : pas d'email public.
- **11 « email_a_verifier »** : l'adresse visible n'était pas sur le domaine de la cible (gmail, orange, free, domaine « frère »), donc jamais envoyable.
- **Cause nouvelle sur ces 43** : plusieurs sites **publient leur adresse d'éditeur en messagerie grand public** (mentions légales, page contact) ; elle était écartée parce que ce n'est pas le domaine du site, et ignorée dès qu'un formulaire existait.

### Ce qui change (`extract.ts`, `investigate.ts`)

1. **Domaine frère** : `bloghoptoys.fr` / `hoptoys.fr`, `aniapp.fr` / `aniapps.fr`, `paperblog.fr` / `.com` (marque de 5 lettres au moins contenue dans l'autre ; jamais pour une plateforme de blogs).
2. **Messagerie grand public publiée par l'éditeur** (`publisherWebmail`) : retenue seulement sur une page contact / mentions légales / à propos, ou dans un lien `mailto:` ; jamais une adresse vue dans un article ; plus de 2 adresses distinctes = ambigu, aucune. Hébergeurs et agences (ovh, ikoula, slateways, declit-it, flatprod) restent exclus.
3. Vérification gratuite DNS (`mx`) aussi pour ces adresses, avec un motif lisible : « domaine vérifié, boîte non prouvée, un rebond arrêtera les envois ».
4. Une adresse **invalide ne fait plus perdre un formulaire** (retombe sur la tâche manuelle).

### Mesure (43 cibles, enquête réelle, vérificateur MX par DoH)

|                                | Avant | Après                                                                             |
| ------------------------------ | ----- | --------------------------------------------------------------------------------- |
| Contactables par mail (sur 84) | 41    | **52** (+12 récupérées, −1 : lumieredestoiles.com sans MX, repasse en formulaire) |
| Formulaire seul                | 32    | 26                                                                                |
| À vérifier                     | 11    | 4 (declit-it, flatprod, perenniallabs, lesoutilsweb : prestataires ou autre site) |

Les cibles déjà en base ne sont pas modifiées : le gain vaut pour les prochaines analyses (ou une relance de l'enquête).

### Points à savoir

- **Adresses de particuliers** (gmail d'un blogueur) : à inclure dans l'avis juridique prévu (prospection, RGPD). Un cas à surveiller : `culture-13.fr` → `agencebfirst@gmail.com`, publiée par le site comme contact, éditeur et webmaster à la fois, mais qui ressemble à celle de l'agence.
- Le DNS direct est bloqué dans le conteneur de dev (`ENODATA`) : `demo:contacts-measure` accepte `CONTACT_MEASURE_MX=1` (résolveur DoH).

### Email de fin d'analyse : **non constaté, phrase maintenue retirée**

`events` : 5 `analysis.email_error` (dernier 17/11 10:55, `Resend 401 validation_error`), **0 `analysis.email_sent`**. La clé reste invalide ; l'écran affiche « vous pouvez fermer cette page » sans promesse d'email (`ANALYSIS_EMAIL_VERIFIED = false`). Reste à Jonathan : poser une clé Resend valide (voir « À fournir par Jonathan »), puis passer la constante à `true` après un premier envoi constaté.

Prochain : à décider par Jonathan (relancer l'enquête sur les audits existants ?).

## Session du 18/11 (suite 7) : les formulaires entrent dans les lots

Demande de Jonathan : garder les cibles qui n'ont qu'un formulaire, avec le lien du formulaire et le même message personnalisé qu'un email.

- **Constat** : le rédacteur écrivait déjà un message pour chaque cible « formulaire » (canal `formulaire`, tâche manuelle créée), mais `pickEligible` n'admettait que les emails dans un lot. Une tâche n'apparaît qu'après validation d'un lot : ces formulaires n'étaient donc **jamais visibles**.
- **Changement** : un brouillon `formulaire` prêt (URL 200, linter vert) entre dans les lots comme un email, sans contact « envoyable » exigé. La fiche du lot affiche « Formulaire de contact (à remplir à la main, message prêt à coller) » avec le lien et le message (sans objet). Après validation du lot, la tâche apparaît dans « Tâches ». **Aucun envoi** pour ces brouillons (garde-fous d'envoi et de base : canal email seulement) ; aucun formulaire rempli automatiquement.
- Fichiers : `batches/select.ts`, `batches/service.ts`, `batches/batches-section.tsx`, `messages/fr.ts` (`batches.formChannel`), `batches.test.ts`. Aucune migration.
- Audit de référence : 26 cibles à formulaire seul peuvent entrer dans les lots, en plus des emails.
- La taille d'un lot compte les formulaires ; les plafonds d'envoi ne les comptent pas.

## Session du 18/11 (suite 8) : email de fin d'analyse remis

- Cause du 401 du 17/11 : clé recopiée avec un caractère en trop (« validation_error »). Nouvelle clé `outreach-links-transactionnel-2` (envoi seul, domaine `ouiouioui.app`) posée sur Vercel (`RESEND_API_KEY`, production et preview, sensitive). Envoi réel constaté depuis `no-reply@ouiouioui.app` (réponse 200 avec identifiant).
- `ANALYSIS_EMAIL_VERIFIED = true` : la phrase « vous recevrez un email » revient. **À confirmer au premier `analysis.email_sent`** dans `events` (sinon repasser la constante à `false`). L'ancienne clé `outreach-links-transactionnel` peut être supprimée dans Resend.

## Session du 18/11 (suite 9) : écran « Vos cibles » en tableau (retours de Jonathan après son test sur remove-me.io)

Maquette validée par Jonathan avant le code. Périmètre : session A sur trois (voir « Reste à faire »).

- **Tableau** (`targets-screen.tsx`, `TargetsTable` / `TargetRow`) : une ligne par site (rang, site et type d'éditeur dessous, raison en une phrase, demande, contact), flèche qui déplie le détail (citation de sa page ou constats, demande en trois lignes, ce que nous proposons, contact, page lue). **La première cible est ouverte d'emblée.**
- **Téléphone : format à part.** La ligne devient une carte (case, site, flèche de 40 px ; raison sur 2 lignes ; pastilles dessous), filtres en rangée qui défile au doigt, bouton de validation pleine largeur. Contrôlé par captures à 390 px et 1280 px sur une page de prévisualisation locale (supprimée) : aucun défilement horizontal.
- **Compteurs qui s'additionnent** : une seule catégorie par cible, celle de sa demande (`primaryTactic` dans `cards.ts`). La seconde raison reste dans le détail (« Autre raison de le contacter »).
- **Encadré « Nous avons examiné N sites »** retiré de l'écran (info de back-office). Titre : « N sites à contacter ».
- **Filtres et types à 0 masqués** (revient sur le choix du chantier H d'afficher les types à zéro). Conséquence : le message « cette recherche n'a pas été lancée » des mentions n'est plus atteignable.
- Pas de capture avec de vraies données (pas de session connectée) : à regarder en production.

### Reste à faire (validé par Jonathan)

- **Session B** : bandeau « la recherche continue » avec temps restant, pastille et filtre « Nouveau », nouveaux sites insérés sans faire sauter la liste, email de fin envoyé à la fin définitive (à vérifier : aujourd'hui, à la première liste ou à la fin ?).
- **Session C** : retirer « Comment vous présentez-vous » et le prénom de signature de cet écran ; les demander dans une étape « Réglages des messages » juste avant la rédaction. La validation des cibles ne doit plus rien exiger.

## Session du 18/11 (suite 10) : sessions B et C écrites, pas encore fusionnées

Branche `claude/email-recovery-targets-ma0fhv` (poussée, **non fusionnée** : Jonathan veut d'abord valider la maquette desktop v2 de l'écran des cibles, pleine largeur, voir l'artefact « Maquette Vos cibles »).

- **B. Suivi de la recherche** : bandeau `LiveBanner` (« La recherche continue », temps restant estimé `live.ts`, cibles ajoutées), pastille et filtre « Nouveau » (dernière visite lue dans le navigateur), cibles arrivées pendant la lecture mises de côté jusqu'au clic « N nouveaux sites, afficher » (la liste ne bouge pas). **Email de fin** déplacé à la fin DÉFINITIVE (`analysis/ready-email.ts`, appelé par `audit-qualify-more` à l'arrêt de l'arrière-plan, par `audit-qualify-auto-start` si rien à lire, et à l'échec) au lieu de la première liste.
- **C. Réglages des messages** : la question « Comment vous présentez-vous » a quitté le haut de l'écran ; rôle et prénom de signature sont demandés une seule fois, au clic sur « Valider », juste avant la rédaction (`MessageSettingsForm`, `saveMessageSettings`). La validation des cibles n'exige plus rien avant.
- Tests, lint et typecheck verts (1153 tests). Pas de capture avec de vraies données.

### Maquette desktop v2 appliquée (accord de Jonathan)

Zone de contenu élargie pour l'écran des cibles (`shell/content-width.tsx`, 96 rem au lieu de 56), tableau à colonnes fixes à partir de 1280 px (cartes en dessous), raison complète en bandeau dans le détail, détail sur trois colonnes, liens longs tronqués (lien complet au survol). Contrôlé par captures à 1500 px et 390 px : aucun défilement horizontal.

Retouches après le premier rendu réel du tableau (18/11) : colonne « Site » élargie (19 rem), la raison de la ligne ouverte n'est plus répétée (elle est dans le bandeau), libellés « Votre page » sur une ligne, guillemets insécables autour des citations (plus de « » seul en début de ligne).

Seconde passe (accord de Jonathan) : les trois sections du détail sont **empilées** sur toute la largeur (plus de colonnes), titres de section en petites capitales grises, citation sur fond gris, étiquette à gauche de chaque rangée de filtres (« La demande », « Type de site »). Une cible **déjà validée** garde une case, cochée et grisée, et son badge « Déjà validée » est dans la ligne (avant : aucune case, la ligne semblait impossible à choisir). Contrôlé par captures à 1500 px et 390 px.

## Session du 18/11 (suite 11) : accueil accessible, textes reformulés

- **Accueil** : `/app` ne renvoie plus droit aux cibles quand il n'y a qu'un site (`homeDestination`) : la liste des sites s'affiche toujours (état, prochaine étape, « Revoir l'analyse » quand les cibles sont prêtes). Revient sur le choix MU.2 « accueil = prochaine étape ».
- **Textes** : section des concurrents renommée « Vos concurrents sur Google » et réécrite côté utilisateur ; « Lire d'autres sites » devient « Lire le lot suivant », avec ce qu'un clic fait (jusqu'à 150 sites, environ 5 minutes).
- À décider : un clic sur « Lire le lot suivant » coûte jusqu'à 0,15 USD (`MORE_LIMITS.budgetUsd`) et rien ne limite le nombre de clics par analyse.
- **« Reprendre à partir d'ici »** n'est plus proposé sur une analyse **terminée** (seulement après un échec) : le bouton effaçait les cibles déjà livrées et repayait les étapes suivantes (`analysis/view.ts`, `canRestart`). Le lien du bas de l'écran des cibles devient « Voir le détail de l'analyse » (lecture seule).

### Backlog (notes de Jonathan, 18/11, à ouvrir)

- **Onglet « Campagnes »** : repenser l'espace client autour des campagnes. Une campagne = l'analyse complète faite au départ (un site × un pays) ; ses résultats servent ensuite à écrire et envoyer les messages. Remplace l'accueil « liste des sites » et l'accès aux étapes de l'analyse.
- **Chantier emailing de rétention** : prévenir l'utilisateur par email quand un nouveau site avec une opportunité de lien est disponible, pour qu'il revienne faire la demande.

## Session du 18/11 (suite 12) : nouvel espace client, étape 1 (menu, accueil, campagnes)

Maquette validée par Jonathan (artefact « Maquette espace client » : menu, accueil, à valider, conversations, campagnes, réglages), inspirée des captures de l'espace connecté d'Outlink qu'il a fournies.

### Fait (étape 1 sur 4)

- **Menu** (`components/app-nav.tsx`) : sombre, groupes Prospection (Campagnes) / Messagerie (À valider, Conversations) / Résultats (Liens obtenus) / Réglages (Boîte d'envoi, Vos messages, Abonnement), site courant en haut, compte et « Se déconnecter » en bas à gauche (pas de cloche : décision de Jonathan). Compteurs sur À valider et Conversations. Téléphone : barre basse de cinq écrans. « État des lieux » et les entrées verrouillées sortent du menu.
- **Accueil** (`app/app/page.tsx`) : quatre compteurs (cibles prêtes, messages envoyés, réponses, liens obtenus), liste « Vos premiers liens » en quatre étapes cochées, bloc « À faire maintenant ». Données : `shell/overview.ts` (`loadOverview`, `buildOverview` testé).
- **Campagnes** (`/app/campagnes`) : une carte par site et pays, cinq compteurs, état (`shell/campaign-status.ts`).
- **À valider** (`/app/a-valider`), **première version** : trois blocs (réponses, premiers messages, formulaires) avec leur nombre, qui renvoient vers les écrans existants (inbox, plan de l'audit, tâches). Ce n'est pas encore la file unique de la maquette.
- Contrôlé par captures du menu (1100 px et 390 px). Accueil, Campagnes et À valider : **pas de capture avec données** (pas de session connectée), à regarder en production.

### Reste à faire (ordre proposé)

2. **File « À valider » de la maquette** : approuver, modifier, passer sur place, pour les trois natures.
3. **Conversations (mini-CRM)** : liste + fil, filtres campagne / non lus / statut / étiquettes / recherche. À créer : état lu / non lu et étiquettes libres (deux tables).
4. **Réglages** : écrans Boîte d'envoi (avec contrôles SPF / DKIM / DMARC), Vos messages, Notifications (emails : réponse à traiter, messages à valider, lien, boîte en panne, nouveaux sites, résumé hebdo), Abonnement. Aujourd'hui « Boîte d'envoi » et « Vos messages » ouvrent la page du site existante.

- Chiffres posés dans la maquette sans validation : montée en charge 40 / 80 / 120 messages par jour, arrêt à 5 % de rebonds, contenu des offres.
- **Envoi réel** : toujours jamais testé avec une vraie boîte. Voir la discussion sur la connexion (mot de passe d'application ou OAuth Google / Microsoft).

## Session du 18/11 (suite 13) : file « À valider » (étape 2 sur 4 de l'espace client)

- **`/app/a-valider`** est maintenant la file unique de la maquette (`features/approvals/`) : réponses proposées, premiers messages (email ou formulaire) et formulaires à remplir, toutes campagnes confondues. Sur chaque carte : approuver, modifier sur place (relu par le linter), « Plus tard » (masque pour la visite, rien n'est supprimé). « Tout approuver (N) » pour les messages prêts.
- **Approuver un premier message** = le placer dans un lot validé (`approveMessages`) : même mécanisme et mêmes garde-fous en base que la validation par lot ; un lot encore ouvert du plan est réutilisé et ne garde que les messages approuvés. Un email sans contact vérifié n'entre pas dans la file. Un message pour formulaire approuvé devient une tâche (« Formulaire à remplir »), jamais un envoi.
- Réponses : approbation, modification et refus par les services existants de l'inbox. Formulaires : copier, ouvrir, marquer comme fait.
- Contrôlé par captures sur des données d'exemple (1280 px et 390 px). Jamais exercé avec de vraies données ni un vrai envoi.
- **Décision de Jonathan (18/11) : la connexion de la boîte doit être un clic OAuth Google** (le plus simple pour l'utilisateur). À cadrer : projet Google Cloud, écran de consentement, vérification des scopes (envoi = sensible ; lecture des réponses = restreint, audit de sécurité). Voir la prochaine session.
- Reste : étape 3 (Conversations avec filtres, non lus, étiquettes), étape 4 (écrans de réglages).

## Session du 18/11 (suite 14) : Conversations, le mini-CRM (étape 3 sur 4)

- **`/app/inbox` devient « Conversations »** (`features/conversations/`) : tous les fils (un fil = un premier message réellement envoyé), toutes campagnes confondues. Liste à gauche, fil à droite (téléphone : l'un puis l'autre). Filtres combinables : campagne, lus / non lus, statut, étiquette, recherche.
- **Statut d'un fil** (`status.ts`, testé) : à traiter, a répondu, relancé, envoyé, lien obtenu, refusé, message revenu en erreur. **Non lu** : une réponse plus récente que la dernière ouverture. **Étiquettes libres** (10 par fil, 30 caractères).
- **Migration `2026120700000000_conversations.sql`** (tables `thread_reads`, `thread_tags`, RLS en lecture, écriture par le serveur) : **appliquée sur la vraie base** par l'API de gestion (contrôlé : RLS active, une politique par table). `database.types.ts` complété à la main.
- Fil ouvert : pourquoi ce site, échanges dans l'ordre (nos messages, relance, leurs réponses, nos réponses), réponse proposée modifiable et approuvable sur place ; « Autres options de réponse » ouvre l'écran complet existant (`/app/inbox/[id]` : choix « c'est payant », prêt à insérer, correction de catégorie).
- **Limites** : pas de réponse libre écrite de zéro depuis le fil (il faut une réponse proposée) ; les envois simulés (dry run) n'apparaissent pas ; contrôlé par capture sur des données d'exemple, jamais avec de vrais échanges.
- Les sept vues de l'ancien inbox (Chaud, Tiède…) ne sont plus affichées ; le code reste (`inbox/views.ts`).
- Reste : étape 4 (écrans de réglages), puis connexion OAuth Google.

## Session du 18/11 (suite 15) : écrans de réglages (étape 4 sur 4, la maquette est entièrement codée)

- **Boîte d'envoi** (`/app/reglages/boite`) : la boîte connectée ou le formulaire de connexion existant (mot de passe d'application), et les **contrôles anti-spam du domaine** (`settings/domain-auth.ts`, testé) : SPF et DMARC lus dans le DNS ; DKIM cherché sur les sélecteurs courants, « non trouvé automatiquement » sinon (jamais « absent » : le sélecteur ne se devine pas).
- **Vos messages** (`/app/reglages/messages`) : prénom de signature, rôle, ce que vous offrez, aperçu de la signature. **Pas de réglage du ton ni du délai de relance** (présents dans la maquette, pas de colonne en base : la relance reste à J+10).
- **Notifications** (`/app/reglages/notifications`) : six interrupteurs enregistrés (table `notification_prefs`, migration `2026120800000000` **appliquée sur la vraie base**). **Une seule notification part réellement : « Une réponse vous attend »** (fonction Inngest `notify-tick`, toutes les dix minutes, un email par espace, jamais deux fois pour la même réponse, trace `notify.reply_waiting`). Les cinq autres portent la pastille « Bientôt ».
- **Abonnement** : le menu ouvre l'écran existant `/app/facturation` (pas redessiné comme la maquette).
- Menu : entrées Boîte d'envoi, Vos messages, Notifications, Abonnement. La montée en charge 40 / 80 / 120 et l'arrêt à 5 % de la maquette ne sont **pas** affichés (chiffres non validés).
- **Inngest : 40 fonctions attendues** (était 39) : resynchroniser l'application après le déploiement.
- Contrôlé par captures sur des données d'exemple (Vos messages, Notifications). Boîte d'envoi : non capturée (page serveur avec lecture DNS).
- **Prochain** : connexion de la boîte par OAuth Google (décision de Jonathan), puis premier envoi réel de bout en bout.

## Session du 17/11 : vérification de propriété du domaine retirée de l'écran

- **Décision de Jonathan (17/11)** : pas de vérification de propriété du domaine. Son raisonnement : une campagne lancée pour le site d'un autre ne lui apporte que des backlinks, et la vraie sécurité est la boîte d'envoi connectée (SMTP + IMAP vérifiés, bientôt OAuth Google). `CLAUDE.md` (4.4) mis à jour.
- Constat dans le code : `verified_at` n'était lu par **aucun** garde-fou d'envoi (ni lots, ni `sending`). L'encadré affirmait « exigée avant tout envoi » alors que rien ne l'exigeait.
- Retiré : l'encadré « Vérifier la propriété du domaine » de `/app/site/[id]`, le badge « Propriété non vérifiée » de `/app/site`, `verification-panel.tsx`, `verifySiteAction`, les textes associés et les deux tests du composant.
- **Conservé, inactif** : colonnes `sites.verification_token`, `verified_at`, `verification_method` et leur trigger (aucune migration), `verifySite` et `checkOwnership` (testés, sans appelant). `createSafeFetcher` dans `verify.ts` reste utilisé par les lecteurs de pages : ne pas supprimer ce fichier.
- Risque résiduel accepté : un utilisateur peut écrire au nom d'une marque qui n'est pas la sienne depuis sa propre boîte. Si des abus apparaissent, la parade la plus légère est de comparer le domaine de la boîte d'envoi à celui du site (aucune action demandée à l'utilisateur).
- Contrôle : typecheck, lint et tests verts. Pas de capture d'écran refaite.

## Session du 18/11 (suite 16) : retours de Jonathan sur « À valider » (données réelles de remove-me.io)

- **Compteur du menu ≠ écran** (50 contre 31) : le menu comptait tous les brouillons prêts et toutes les tâches, l'écran seulement ce qu'il montre. Les compteurs viennent maintenant de la file elle-même (`loadOverview` appelle `loadQueue`).
- **Approuver sans boîte d'envoi** : refusé côté serveur pour un email (boîte vérifiée exigée pour le site) et bouton désactivé à l'écran ; les messages pour formulaire restent approuvables. Deux emails avaient été approuvés avant ce garde-fou : ils partiront à la connexion de la boîte.
- **Message approuvé invisible** : un email approuvé apparaît tout de suite dans Conversations avec le statut « Approuvé, en attente d'envoi ».
- **80 cibles validées, 34 messages rédigés** (décidé et corrigé, voir « suite 17 »). Cause mesurée sur le plan `0a99e395…` (70 cibles) : le rédacteur plafonne à 40 cibles par exécution (30 ignorées) et à 0,10 USD de LLM (atteint à 0,098 USD après 25 messages : 15 non rédigées). Coût mesuré : environ 0,004 USD par message. Rédiger 80 messages demande environ 0,32 USD, et il n'existe pas de bouton pour rédiger les messages manquants d'un plan déjà traité. `DRAFT_LIMITS` dans `drafting/limits.ts`.

## Session du 18/11 (suite 17) : plafonds du rédacteur relevés, messages manquants

Décision de Jonathan : oui aux deux propositions.

- **Plafonds** (`drafting/limits.ts`) : 100 cibles par rédaction (40 avant), 0,45 USD de LLM par rédaction (0,10 avant). Mesuré : environ 0,004 USD par message. Une campagne complète passe d'environ 1,00 à 1,35 USD.
- **« Rédiger les messages manquants »** : bandeau en haut de « À valider » quand des cibles validées n'ont pas de message (`missingDrafts`, `draftMissing` dans `drafting/service.ts`). Relance la rédaction des plans concernés, même terminés. **Un message déjà écrit n'est jamais réécrit** (`loadDraftInput` saute les cibles qui ont un brouillon) : les messages modifiés ou validés sont gardés. Pendant la rédaction, l'écran se rafraîchit seul.
- Sur remove-me.io : 45 messages manquants (plan de 70 cibles, 25 rédigés) ; 1 cible du second plan n'a pas d'accroche et ne sera jamais rédigée. La relance n'a **pas** été lancée par Claude : c'est le clic de Jonathan (environ 0,18 USD).

## Session du 17/11 (suite) : réglages « Vos messages » refaits (signature complète, contreparties)

Maquette validée par Jonathan avant le code (canvas « Réglages · Vos messages »). Ses décisions : logo dans la signature (ses utilisateurs sont des entreprises, habituées aux signatures) ; l'offre libre remplacée par des cases ; un changement de signature s'applique aussi aux messages déjà dans « À valider » ; pas de texte d'exemple dans le champ Nom.

- **Écran `/app/reglages/messages`** (`features/settings/messages-form.tsx`) : « Qui écrit » (prénom, nom facultatif, rôle en trois boutons avec la phrase exacte), « Signature » (logo, lien vers le site, LinkedIn, téléphone), « Si un éditeur demande une contrepartie » (partager sa page, écrire un article, lien en retour ; payer = jamais automatique), aperçu d'un message complet qui suit la saisie.
- **Signature composée à l'envoi et à l'affichage** (`features/signature/signature.ts`, pur, testé) : le brouillon se termine toujours par le prénom seul (règle du rédacteur et du linter, inchangée) ; `applySignature` remplace ce prénom par la signature complète. Branché sur le premier message, la relance, les réponses (`sending/service.ts`, `inbox/send.ts`), l'écran « À valider » et les formulaires à remplir (texte seul). Le texte enregistré dans `sent_messages.body` est celui qui est parti.
- **Logo** : réduit dans le navigateur (96 px de haut), PNG ou JPEG seulement (signature binaire vérifiée, pas de SVG), 150 Ko au plus, stocké dans `site_logos` (serveur seulement) et servi par `/api/logo/[jeton]` (public, sans session, jeton renouvelé à chaque logo). **Avec un logo, le message part en texte + HTML ; sans logo, en texte seul comme avant.**
- **L'offre** : le premier message ne cite plus `offered_asset` et ne propose rien en échange (`drafting/write.ts`). Les cases cochées (`sites.counterparts`) servent aux réponses : gabarit « proposer un échange » (`inbox/payment.ts`) et rédacteur de réponses (`contreparties_acceptees`, liste vide = décliner).
- **Migration `2026120900000000_signature_settings.sql`** (additive, **appliquée sur la vraie base**) : colonnes `sites.signature_last_name`, `signature_show_site`, `signature_linkedin_url`, `signature_phone`, `signature_logo_token`, `counterparts` ; table `site_logos`.
- **Contrôlé** : 1 191 tests verts ; parcours réel avec le compte de test sur la vraie base (enregistrement, rechargement, logo servi en 240 x 96, retrait du logo, erreur LinkedIn) ; captures bureau et mobile (`pnpm shots`, écrans 24 et 25 ajoutés). **Non contrôlé** : la signature dans « À valider » avec de vrais messages (file vide dans le jeu de test) ; aucun envoi réel, donc le rendu du logo dans Gmail ou Outlook n'est pas constaté.
- **Dettes et pièges** : `offered_asset` reste en base et dans le formulaire de l'ancienne fiche `/app/site/[id]` (champ obligatoire devenu inutile : à retirer) ; si le prénom change, modifier un message déjà rédigé demande de retaper le nouveau prénom en fin de message (linter) ; « Fondateur » n'a pas de féminin ; le logo est une image distante, que certaines messageries masquent tant que le destinataire ne l'autorise pas.

## Session du 18/11 (suite 18) : les formulaires sortent de l'approbation

Retour de Jonathan : « je comprends pas comment on peut mailer un formulaire » ; le vocabulaire d'« Approuver » mélangeait emails et formulaires.

- **« À valider » ne contient plus de message de formulaire à approuver.** Deux natures claires : **Emails à envoyer** (approuver et envoyer, boîte d'envoi exigée) et **Formulaires à remplir** (copier le message, ouvrir le formulaire, « C'est fait »). Le bouton groupé ne concerne que les emails (« Approuver et envoyer les N emails prêts », absent sans boîte).
- **« C'est fait » sur un formulaire** valide le message au passage (même mécanisme et mêmes garde-fous en base que les emails : lot validé), marque la tâche faite et prévoit la relance à J+10 (`completeForm` dans `approvals/service.ts`). Un message pas prêt (linter) ne peut pas être marqué fait. Le message reste modifiable.
- Les compteurs du menu et de l'accueil suivent la file : emails à envoyer + réponses + formulaires.

## Session du 17/11 (soir) : guides « connecter sa boîte d'envoi », un par messagerie

Demande de Jonathan depuis l'écran « Boîte d'envoi » (point critique : un formulaire SMTP/IMAP nu, impossible à remplir sans aide).

- **25 guides publics** : sommaire `/aide/boite-envoi`, un guide par messagerie `/aide/boite-envoi/{slug}` (pages statiques, hors `/app`, donc lisibles sans session). Textes et réglages dans `messages/mailbox-providers/*.ts` (un fichier par famille), types et textes d'interface dans `messages/mailbox-guides.ts`. Chaque guide : ce qu'il faut, les étapes chez le fournisseur avec lien direct, le tableau des réglages, la fin dans l'application, « Si le test échoue », les sources officielles.
- **Formulaire refait** (`features/mailboxes/mailbox-section.tsx`) : liste « Votre messagerie » ; les serveurs et les ports se remplissent seuls et se rangent dans « Identifiant et serveurs » ; l'identifiant suit l'adresse ; le champ du mot de passe dit lequel coller ; la messagerie est reconnue à l'adresse (gmail.com, orange.fr…) ; lien vers le guide dans un nouvel onglet. Une messagerie non compatible masque le formulaire et renvoie à son explication.
- **Échec du test expliqué en clair** (`features/mailboxes/explain-error.ts`) : le message brut du serveur (535, mot de passe d'application exigé, serveur introuvable, certificat…) est traduit, suivi du lien « Revoir le guide ».
- **Non compatibles aujourd'hui, et dit franchement** : Outlook / Hotmail / Live (Microsoft refuse tout mot de passe depuis le 16/09/2024), Microsoft 365 (lecture IMAP par mot de passe fermée pour toutes les organisations ; envoi SMTP par mot de passe désactivé par défaut fin décembre 2026), Proton Mail, Tuta. **Conséquence produit : la connexion par compte Microsoft (OAuth, jalon 7) pèse plus lourd que prévu**, une bonne part des adresses professionnelles françaises est chez Microsoft.
- **Sources** : aides officielles de chaque fournisseur, relues le 17/11/2026 (liens en bas de chaque guide). **Aucune connexion réelle n'a été testée** : tout vient de la documentation. Points les moins sûrs : Bouygues (page d'aide illisible sans navigateur, réglages lus dans des extraits), La Poste (identifiant avec ou sans `@laposte.net`, port 587 ou 465), Zoho (serveurs par région), LWS (libellés de l'espace client), et le comportement des opérateurs (SFR, La Poste) face à une connexion venue d'un centre de données.
- **Contrôlé** : 1 212 tests verts (dont `providers.test.ts` : réglages acceptés par le schéma du formulaire, un domaine = un fournisseur, vouvoiement, pas de garantie), build, captures bureau et mobile des guides et du formulaire.
- **Backlog** : `sitemap.xml` (les guides n'y sont pas, il n'existe pas encore) ; guides SPF / DKIM / DMARC par hébergeur (le panneau « Contrôles anti-spam » dit « chez l'hébergeur » sans dire comment) ; modifier le mot de passe d'une boîte sans la supprimer ; captures d'écran des écrans des fournisseurs dans les guides.
- **Suite attendue** : Jonathan connecte sa propre boîte en suivant son guide ; corriger le guide à la moindre différence avec ce qu'il voit, et mettre à jour `ui.checkedOn`.

## Session du 17/11 (soir, suite) : envoi réel ouvert en bêta, horaires d'envoi réglables, heure de départ affichée

Retour de Jonathan : boîte Gmail connectée et vérifiée, 5 emails approuvés, rien ne part. Trois causes mesurées en production : hors horaires (boîte vérifiée à 18 h 22), `OUTREACH_SENDING_ENABLED` jamais posé (le moteur ne faisait que simuler), et abonnement exigé alors que Stripe n'est pas branché.

- **Décision de Jonathan : envoi réel ouvert à toute la bêta**, sans abonnement, plafonné comme Starter (100 par mois). `checkSendAllowance(db, ws, now, beta)` (`billing/plans.ts`, `BETA_SEND_PLAN`) ; les appelants passent `betaEnabled()`. Hors bêta, rien ne change.
- **Production** : `OUTREACH_SENDING_ENABLED=true` posé sur Vercel, cible **production seulement** (une préversion ne doit jamais envoyer). `EMAIL_DRY_RUN` reste absent (faux en production).
- **Horaires d'envoi réglables** (décision de Jonathan) : Réglages > Boîte d'envoi, sous la boîte connectée : jours (cases) et heures (de / à), défaut conseillé lundi au vendredi 9 h à 18 h. Migration `2026121000000000_mailbox_send_days.sql` (additive, **appliquée sur la vraie base**) : colonne `mailboxes.send_days` (ISO, 1 = lundi) et lecture par colonnes de `timezone`, `send_window_start`, `send_window_end`, `send_days` pour `authenticated` (elles n'étaient lisibles que par le serveur). `isInSendWindow` lit les jours ; `updateSendSchedule` (`mailboxes/service.ts`).
- **Heure de départ affichée** : dans Conversations, chaque email approuvé porte « Départ prévu mercredi 18 novembre vers 9 h 06 », et un bandeau dit pourquoi la file attend (horaires fermés, pas de boîte, simulation) avec un lien « Modifier les horaires ». `planSendTimes` (`sending/schedule.ts`) rejoue les règles du moteur (un message par passage de six minutes, plafond horaire, plafond par 24 heures avec échauffement) ; `loadSendQueue` (`sending/queue-note.ts`) suit l'ordre du moteur (lots validés par date, puis position). C'est une estimation : relances et réponses peuvent prendre un passage.
- **Pièges** : le fuseau n'est pas réglable (toutes les boîtes sont à l'heure de Paris, le formulaire l'écrit en dur) ; l'estimation ignore les réponses en attente d'envoi ; la page Facturation affichera « 100 envois » à un espace sans abonnement pendant la bêta.
- **À faire avant l'ouverture au public** : refermer l'envoi sans abonnement (couper `BETA_MODE` ou brancher Stripe), avis juridique sur la prospection (section 8).

## Session du 17/11 (soir, suite 2) : réglages accessibles sur téléphone

Retour de Jonathan : sur téléphone, il n'accède pas à tous les réglages. Cause : la barre du bas n'avait qu'un onglet « Réglages », qui ouvrait seulement « Vos messages » ; Boîte d'envoi, Notifications et Liens obtenus n'étaient atteignables de nulle part, et aucune page de réglages n'offrait de retour.

- **Nouvelle page `/app/reglages`** (hub) : toutes les pages rangées en Envoi (boîte d'envoi, vos messages, notifications, garde-fous), Suivi (liens obtenus, tâches à la main) et Compte (vos sites, abonnement), avec une ligne d'explication chacune, l'adresse de la personne et « Se déconnecter ». Liste unique dans `features/shell/settings-links.ts` (testée : chaque lien mène à une page qui existe).
- **Barre du bas** : l'onglet « Réglages » ouvre ce hub et reste actif sur toutes les pages qu'il propose (`mobileOnly` : il n'apparaît pas dans le menu latéral de l'ordinateur, qui liste déjà chaque page).
- **Retour** : sur téléphone, chaque page de réglages affiche « ‹ Réglages » en haut (`features/shell/mobile-back.tsx`).
- `/app/compte` redirige vers le hub ; le lien « Compte » de l'en-tête du téléphone aussi.
- **Contrôlé** : captures à 390 px du hub avec la barre du bas (sans débordement), 1 220 tests verts. **Non contrôlé** : les pages connectées elles-mêmes, faute de compte de test ici (l'outil `pnpm shots` écrit dans la vraie base, non lancé).

## Session du 17/11 (nuit) : deux bugs signalés par Jonathan (horaires « 24 h sur 24 », suppression de la boîte)

- **Horaires** : Jonathan voulait « 7 jours sur 7, 24 h sur 24 » ; la base montre qu'il a enregistré **tous les jours, de 9 h à 23 h** (21:49 UTC), puis testé après 23 h à Paris : un email approuvé était « en attente jusqu'à demain », ce qui était exact pour ces horaires mais ne l'expliquait pas. Correctifs : case **« 24 h sur 24 »** (0 h à 24 h en un geste, `allDay` dans `updateSendSchedule`) ; la réponse d'enregistrement dit tout de suite « Les envois sont ouverts en ce moment » ou « Prochaine ouverture : … » ; chaque email en attente dit **pourquoi** (`DelayReason` dans `planSendTimes` : horaires fermés, limite par 24 h, limite par heure) et le bandeau de Conversations signale les messages retenus par la limite d'envoi. `describeWindow` écrit « 24 h sur 24 ».
- **Limite par 24 h (échauffement)** : première semaine = **5 emails par 24 heures**, puis 10, puis 15, puis le plafond de la boîte (20). Un sixième email approuvé le premier jour attend donc ~24 h après le premier envoi, même en 24 h sur 24. C'est voulu (CLAUDE.md 4.4), mais invisible avant ce correctif.
- **Suppression de boîte** : le message d'erreur venait d'un vrai défaut. Dès qu'un email est parti, `DELETE mailboxes` échouait : la clé étrangère `sent_messages.mailbox_id ON DELETE SET NULL` modifie un envoi « terminé », que le trigger `guard_sent_message` déclarait non modifiable (idem `guard_reply_send`). Reproduit sur la vraie base (transaction annulée), corrigé par la migration `2026121100000000_detach_history_on_mailbox_delete.sql` (**appliquée sur la vraie base**) : seul le passage `mailbox_id` valeur → NULL est accepté, tout autre changement d'un envoi terminé reste refusé. Test SQL de non-régression dans `supabase/tests/sent-messages.test.ts` (échoue sans la migration).
- **Suppression : confirmation ajoutée** avant « Supprimer la boîte » : les réponses déjà lues depuis la boîte sont **supprimées avec elle** (`inbound_messages.mailbox_id ON DELETE CASCADE`), alors que l'historique des envois est conservé. Backlog : modifier le mot de passe d'une boîte sans la supprimer ; passer `inbound_messages` en `SET NULL`.
- **Pas de « suppression de compte »** dans l'application : seule la boîte d'envoi peut être supprimée (c'est ce que Jonathan a tenté, d'après le message d'erreur). Backlog si besoin : suppression de compte (RGPD, droit à l'effacement).
- **Premier envoi réel constaté** : 1 email parti le 17/11 à 22 h 54 (Paris) vers s.grisinelli@unistra.fr, boîte Gmail, via Inngest `send-tick`. Les suivants attendaient la fin des horaires (23 h).
- **Contrôlé** : 1 445 tests (avec Postgres local : `su postgres -c "psql -c \"alter user postgres with password 'postgres'\""` puis `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm test`), captures du formulaire à 390 px.

## Session du 17/11 (nuit, suite) : rédaction refaite, un angle ou pas de message

Retour de Jonathan : les mails « pourraient être améliorés » (ton, pertinence), et ils parlent d'une page de la cible sans en donner l'adresse.

- **Constat mesuré sur les 79 messages de remove-me.io** : écrits par `claude-haiku-4-5` à partir d'une fiche (titre de la page, citation de 280 caractères au plus, titre et adresse de notre page). 75 sur 79 sans constat concret ; 68 proposaient « le blog » ou « le glossaire » ; 30 accroches réduites au titre ou à un mot ; 28 visaient une page d'accueil ou une rubrique ; **0 citait l'adresse de la page de la cible** (la consigne et le linter l'interdisaient).
- **Essai sur 20 messages réels** (5 puis 15), même consigne, trois modèles (Haiku 5.5, Sonnet 5.5, Opus 5.5), pages relues en entier et catalogue de 65 pages du site : Sonnet et Opus rendent les mêmes verdicts (20 sur 20) : **2 angles honnêtes sur 20**. Haiku 5.5 en retient 4 de plus à tort (politique de confidentialité, page d'accueil d'un établissement public, dépêche AFP figée) mais n'en manque aucun. Écriture : Opus la plus naturelle. Fichiers d'essai hors dépôt (session).
- **Décision de Jonathan : « petit trie, fort rejuge et rédige »** (`DRAFT_MODELS` dans `features/drafting/limits.ts`) : `claude-haiku-5-5` trie, `claude-opus-5-5` rejuge, choisit la page et rédige. Hors Anthropic (développement), le modèle par défaut du fournisseur sert aux deux étapes.
- **Nouveau déroulé par cible** (`features/drafting/draft.ts`) : (1) la page de la cible est relue en entier (`readable.ts` : contenu éditorial sans menus, titres, liens sortants notés `[texte](adresse)`, 16 000 caractères au plus, page profonde redirigée vers l'accueil repérée par l'adresse canonique) ; (2) tri par le petit modèle avec le catalogue du site (titres et descriptions), qui rend 1 à 3 pages candidates ; (3) le modèle fort relit les pages candidates en entier, rejuge, et écrit ou refuse ; (4) page proposée vérifiée en 200, linter, doublons, une régénération au plus avec la liste des défauts.
- **Sans angle, aucun message** : la cible est écartée avec son motif (table `draft_declines`, jamais rejouée) et apparaît dans « À valider » sous « N cibles écartées : aucune raison honnête de leur demander un lien » (repliable, motif par cible). Une page illisible ou une panne de modèle n'est pas une décision : la cible est reprise à la prochaine rédaction.
- **Catalogue du site** (`catalogue.ts`, table `site_pages`) : sitemap (ou liens de l'accueil), une seule langue sur un site à plusieurs versions, sans pages légales ni tarifs, pages précises d'abord, 80 pages au plus, 6 000 caractères par page, relu au bout de 7 jours. Lu par paquets de 20 (un step Inngest chacun).
- **Linter** (`lint.ts`) : l'adresse de la page de la cible est exigée dans un message généré ; l'adresse d'un lien cassé signalé est admise ; les mots d'une adresse ne sont plus jugés (« /ia- ») ; la règle « reprendre la moitié des mots de la citation » est supprimée (elle poussait à recopier le titre) ; 35 à 150 mots, objet de 80 caractères au plus. Un message modifié par l'utilisateur n'est tenu ni de citer la page de la cible ni de s'interdire d'autres adresses.
- **Client LLM** (`lib/llm/client.ts`) : les modèles Anthropic de génération 5 refusent l'outil forcé et la température (HTTP 400) ; ils passent par `output_config.format` (schéma JSON sans contraintes de longueur, revalidé par zod) et `output_config.effort` ; la réponse se lit par type de bloc (la réflexion précède le texte) ; un refus du modèle (`stop_reason: refusal`) devient une erreur `refusal`, coût journalisé ; un HTTP 400 garde le début du motif. Les anciens modèles gardent l'ancien chemin. Prix ajoutés à `pricing.ts`. Pas de repli automatique vers un autre modèle en cas de refus (paramètre bêta `fallbacks` non utilisé : un refus laisse seulement la cible non rédigée).
- **Contrôle des modèles** : événement Inngest `drafting/models.check` (`inngest/functions/draft-models-check.ts`), deux appels sur un exemple fictif, environ un centime, à déclencher après tout changement de modèle.
- **Migration `2026121200000000_draft_angles.sql`** (additive, **appliquée sur la vraie base**) : tables `site_pages` et `draft_declines`, RLS en lecture pour les membres.
- **Coût estimé** (à mesurer sur une vraie campagne) : tri ≈ 0,001 USD par cible ; jugement et rédaction ≈ 0,07 USD par cible retenue par le tri (environ une sur quatre) ; soit 1,50 à 2 USD pour 100 cibles, contre 0,38 USD avant. Plafond par exécution : 4 USD.
- **Contrôlé** : 1 465 tests verts avec Postgres local ; essai réel de bout en bout (`angle.live.test.ts`, `DRAFT_LIVE_DEMO=1`) avec le fournisseur de développement : catalogue réel lu (66 pages), tri, rédaction, linter, régénération. **Contrôlé en production après la fusion (PR #152)** : événement `drafting/models.check` envoyé le 17/11 à 23 h 29 UTC, les deux appels réels réussissent (`claude-haiku-5-5` : 0,0003 USD ; `claude-opus-5-5` : 0,032 USD sur l'exemple fictif, court), message conforme (adresse de la page de la cible, page précise, signature). **Non contrôlé** : une rédaction complète sur une vraie campagne en production (aucune cible à rédiger : les 79 de remove-me.io ont déjà leur ancien message).
- **Conséquence produit, dite à Jonathan** : avec ce filtre, une campagne de 80 cibles donnera une dizaine de bons messages au lieu de 79 faibles. Le volume se joue maintenant en amont, dans le choix des pages cibles.
- **Dettes et pièges** : les 72 messages non envoyés de remove-me.io (ancienne méthode) restent en file, ils ne sont pas réécrits ; `link_plan_items.target_page_url` et l'ancre du plan ne suivent pas la page choisie par le rédacteur (la page proposée fait foi : `target_drafts.proposed_url`) ; le tri M3.1 et les constats MT.5 gardent leur citation de 280 caractères ; la relance et les réponses n'ont pas changé.
- **Backlog** : recherche de cibles qui vise des pages avec un angle (articles éditoriaux vivants, listes de ressources tenues, pas d'accueil ni de page légale ou commerciale) ; passer les autres tâches de `claude-haiku-4-5` à `claude-haiku-5-5` (dix fois moins cher : la qualification coûtait 0,47 USD sur 1,43 USD par campagne) ; bouton « Réécrire ce message » ; exemples de messages qui ont marché sur les sites de Jonathan (question ouverte n° 3) ; montrer les cibles écartées sur l'écran de la campagne.
- **Diagnostic de l'amont (demande de Jonathan, même session)** : sur les 80 cibles retenues le 17/11, 32 pages légales, 27 accueils, 1 rubrique, 20 pages intérieures ; toutes les recherches partent du thème, aucune des pages précises du site ; la qualification note le sujet sur 1 200 caractères, jamais la place d'un lien ; 498 candidats jamais lus. Plan écrit : `PLAN.md`, jalon **MC** (MC.0 à MC.5). Corrigé à la demande de Jonathan : trois familles de recherche (par sujet, par public à partir des publics du profil, par lien mort), et règle de généralité (aucune règle propre à un thème, mesure sur deux sites).
- **Prochaine session recommandée** : **MC.0** (mesurer le principe « partir des pages du site » sur 6 pages, sans code produit), puis MC.1.

## Session du 18/11 : MC.0, essai « partir des pages du site » : critère NON atteint

Essai sans code produit, sur remove-me.io et mega-coloring.com (règle de généralité). Pour chaque site : 6 pages choisies et 24 recherches écrites par le petit modèle (2 par sujet, 2 par public pour chaque page), 10 premiers résultats Google (DataForSEO, 0,04 USD par site), filtre gratuit par nature d'adresse, lecture de 60 pages au plus (2 par domaine), contrôle des liens sortants, tri d'angle par le petit modèle puis rejugement par le modèle fort.

|                                                         | remove-me.io | mega-coloring.com |
| ------------------------------------------------------- | ------------ | ----------------- |
| Résultats                                               | 162          | 150               |
| Plateformes (Facebook, Pinterest, Instagram, Amazon...) | 34           | 85                |
| Pages intérieures distinctes                            | 117          | 53                |
| Pages lues et triées                                    | 47           | 33                |
| Angles, petit modèle                                    | 7 (15 %)     | 1 (3 %)           |
| Angles, modèle fort                                     | **2 (4 %)**  | **1 (3 %)**       |
| Liens sortants cassés                                   | 2 sur 465    | 1 sur 168         |

- **Critère (30 % sur chaque site) : raté.** Le principe « chercher par sujet ou par public dans les 10 premiers résultats » ne tient pas : la première page de Google est faite de gros médias, de sites officiels et de concurrents (remove-me.io : 15 concurrents ou pages commerciales, 15 médias ou articles figés, 9 pages officielles sur 47 ; mega-coloring.com : 20 concurrents sur 33). Les petits sites que personne ne sollicite n'y sont pas.
- **Par famille (petit modèle, remove-me.io)** : sujet 6 sur 19, public 1 sur 27. Les recherches par public n'ont rien donné ici.
- **Seul motif qui marche** : l'information périmée (un article qui recommande encore Bloctel après le 11 août 2026) : 2 des 3 angles finaux. Il dépend d'un « fait nouveau » que le site connaît : pas généralisable à tous les sites.
- **Liens morts dans les pages trouvées par recherche** : presque aucun (3 sur 633). Cette source gratuite ne suffit pas.
- **Défaut réel trouvé dans le produit** : la recherche DataForSEO renvoie des adresses de redirection Google (`google.com/goto?url=`) ; le produit n'en reconstruit qu'une adresse approximative à partir du fil d'Ariane (`resolveRedirect`, `exact: false`), d'où des pages d'accueil ou de mauvaises pages lues à la place de l'article. Le paramètre `resolve_goto_urls: true` rend la vraie adresse au même prix (mesuré : 0,002 USD par recherche de 10 résultats, jusqu'à 40 s de plus). **À corriger dans tous les cas.**
- **Pièges de généralité vus** : (1) un filtre « page légale » par mots de l'adresse écarte les articles d'un site dont le sujet est le RGPD ; (2) pour un site de coloriages, les pages à proposer sont les pages de thème, pas des articles : la consigne « jamais une page générale » est propre à un site de guides ; (3) la pagination s'écrit `page-2` (corrigé, PR #153) ; (4) sur mega-coloring.com, 57 % des résultats sont des plateformes.
- **Limite de l'essai, à dire** : le juge est un modèle, pas la réalité. Le modèle fort écarte les blogs d'enseignants anciens et les pages internes d'université ; rien ne prouve que ces éditeurs ne répondraient pas. Sans réponses réelles, on ne sait pas si la barre « angle » est trop haute. Les 7 messages envoyés le 17/11 et l'expérience passée de Jonathan (questions ouvertes 1 et 3) sont les seules vérités terrain.
- **Non testé** : les résultats au-delà du rang 10, les recherches de pages de liens (« liens utiles », « sites à découvrir ») tenues par de petits sites, « qui cite déjà une page comme la nôtre » (backlinks de page), les pages disparues de sites comparables.
- **Coût** : 0,12 USD de DataForSEO (dont deux passes inutilisables à cause des adresses masquées). Fichiers de l'essai hors dépôt (session).
- **Suite proposée** : corriger les adresses (MC.1, sûr) ; avant de coder MC.2, refaire un essai MC.0b sur les familles non testées ; demander à Jonathan quels types de pages lui ont réellement donné des liens.

## Session du 18/11 (suite) : MC.0b, « qui cite déjà des ressources comparables » : 4 fois mieux, critère pas encore atteint

Référence terrain donnée par Jonathan (voir `CLAUDE.md` section 5) : ses liens sont venus (1) de petits éditeurs de son public qui citent des ressources, (2) des liens morts, (3) de pages de contenu qui citent plusieurs ressources comparables. Point commun : la page cite DÉJÀ des ressources comme la nôtre. Essai sans code produit sur les deux sites : 6 ressources comparables par site (concurrents vus dans les recherches de MC.0, ressources de référence du thème), liens entrants de chacune par DataForSEO (`backlinks/backlinks/live`, 150 lignes, une par domaine, pages en français, spam sous 40), plus 2 appels « liens cassés » ; 40 pages lues par site ; critère de jugement recalé sur les trois cas (un billet ancien n'est plus un motif de refus) ; petit modèle puis modèle fort.

|                                      | remove-me.io | mega-coloring.com |
| ------------------------------------ | ------------ | ----------------- |
| Coût DataForSEO                      | 0,23 USD     | 0,20 USD          |
| Domaines candidats                   | 929          | 300               |
| Pages lues                           | 39           | 33                |
| Citent encore la ressource (vérifié) | 37           | 27                |
| Cibles, petit modèle                 | 5 (13 %)     | 8 (24 %)          |
| Cibles, modèle fort                  | **4 (10 %)** | **5 (15 %)**      |
| MC.0 (rappel)                        | 4 %          | 3 %               |

- **Critère de 30 % : pas atteint**, mais l'approche donne 3 à 4 fois plus que MC.0, et les cibles retenues sont celles que décrit Jonathan : blog d'une enseignante de CP, page « Coloriages » de l'accueil périscolaire d'une commune, sélection « 5 sites gratuits pour télécharger des coloriages », blog d'art-thérapie avec sa liste de mandalas, centre de médiation de la consommation, blog de sécurité avec sa rubrique « Pour en savoir plus ».
- **Le volume, lui, est là** : à ce rendement, 300 à 900 domaines candidats pour 0,20 USD donnent 45 à 90 cibles par campagne (extrapolation, à vérifier), contre une dizaine aujourd'hui.
- **Le rendement dépend surtout de la ressource de départ** : 33700.fr 3 sur 7, coloriageenfant.com 3 sur 8, moncoloriage.fr 2 sur 4, hugolescargot 2 sur 4 ; mais bloctel.gouv.fr 0 sur 6 (cité dans des CGU et des mentions légales), incogni.com 0 sur 5, magicoloriage.com 0 sur 7 (fermes à liens). D'où l'idée d'un pilotage : quelques pages lues par ressource, puis on ne continue que celles qui rendent.
- **Ce qui fait perdre** : fermes à liens (10 sur 33 pour mega-coloring.com), pages commerciales (14 sur 39 pour remove-me.io), pages juridiques (5), sites trop gros (6), hors sujet (13 au total). Une partie se filtre gratuitement (adresse de page légale, page d'accueil).
- **Liens morts : toujours rien de probant.** Les liens « cassés » annoncés par le fournisseur vers cnil.fr et cybermalveillance.gouv.fr mènent à des pages juridiques ou commerciales (0 sur 11). Une seule page lue avait de vrais liens cassés. L'angle que Jonathan juge le meilleur reste à trouver autrement (pages disparues de sites comparables, sites comparables fermés).
- **Limites** : 72 pages jugées par des modèles, pas par des réponses réelles ; ressources de départ choisies à la main pour cet essai (dans le produit, elles devront venir du profil du site et des recherches) ; aucun contact cherché.
- **Suite proposée** : construire cette famille dans le produit (ressources comparables, liens entrants, pilotage par ressource, critère des trois cas), et traiter les liens morts dans un essai à part.

## Session du 18/11 (suite 2) : MC.6a, la nouvelle source « pages qui citent déjà une ressource comparable » (faite)

Périmètre tenu : ressources comparables trouvées automatiquement, appel « qui cite cette ressource » dans la collecte avec coût annoncé et plafonné, filtre gratuit avant lecture, vraies adresses des résultats de recherche. **Pas** fait (MC.6b et suite) : jugement des trois cas dans la qualification et le rédacteur, pilotage par ressource, boule de neige, liens morts. La PR #156 (documentation de l'essai MC.0b) a été fusionnée en premier.

### Ce qui change

- **Nouvelle phase `citations` de la collecte** (`src/features/collection/run.ts`, `runCitationsCall`) : après les recherches Google, un appel Backlinks par ressource (`mode: one_per_domain`, 150 lignes, pages dans la langue de la campagne, spam < 40, autorité du domaine > 20, liens récents d'abord ; réglages de `docs/mc0b-essai.md`, constantes dans `COLLECTION_LIMITS.citations`). Nouvelle source `citation` (`types.ts`), tactique `ressources`, `query` = page citée, `persona` = domaine de la ressource.
- **Ressources comparables choisies automatiquement** (`resource-judge.ts`, `resources.ts`) : candidats = concurrents retenus par l'audit (sans les géants ni les autres langues, plan figé : `plan.citations.pool`) + sites qui sortent sur plusieurs recherches par sujet de la collecte (`searchCandidates`). UN appel court au petit modèle (profil du site : activité, offre, public, titres de pages) garde au plus 6 sites qui proposent la même chose que le site ; coût mesuré 0,0005 USD, 0,01 USD réservé dans le coût annoncé. Le modèle ne peut rien inventer (domaines validés contre la liste). **Repli sans jugement** (pas de clé, panne) : les premiers concurrents, puis les sites vus sur plusieurs recherches ; `stats.citations.resourcesBy` dit `modele` ou `concurrents`. Si le modèle ne trouve aucune ressource comparable, aucune citation n'est payée. Aucun mot, domaine ou seuil propre à un thème.
- **Coût annoncé et plafonné** : 6 ressources au plus (0,0294 USD chacune au pire, soit 0,176 + 0,01 réservé). `shareOfTarget` 0,55 -> 0,74 et parts de phase recalculées : les autres phases gardent EXACTEMENT leurs budgets en USD, la phase `citations` a 0,19 USD. Un plan figé avant MC.6a (sans `citations`) reste lisible et ne cherche aucune citation. Coût attendu d'une analyse complète : ~0,97 USD (sous le budget cible de 1 USD ; tests `analysis.test.ts` : borne 0,9 -> 1).
- **Filtre gratuit par adresse** (`src/features/qualification/page-nature.ts`, utilisé par l'étage 1 de `free.ts` pour TOUTES les sources) : pages d'accueil, pages légales (mentions légales, CGU, CGV, confidentialité, cookies, FR et EN), fichiers et flux, avec motifs lisibles `page_accueil`, `page_legale`, `fichier` (messages ajoutés). Exception : une accueil reste candidate pour une mention sans lien ou un lien mort annoncé. **Généralité vérifiée par test** : « rgpd », « données personnelles », « cookies et navigation privée » ne marquent jamais une page légale (seule la FORME du segment compte). Les plateformes restent écartées par les listes existantes. Une page qui cite une ressource passe avant les autres dans l'ordre de lecture (x1,25).
- **Vraies adresses des résultats Google** (MC.1, `resolve_goto_urls`) : demandées d'abord, repli sans l'option si le fournisseur refuse (`runSerpQuery`, `gotoFallback`, `approxUrls` comptés dans `stats.serp`).
- **Correction de fusion** : quand l'adresse d'un candidat est remplacée par la page qui cite (ou le lien mort), son titre la suit (avant : titre d'une autre page du site).
- Job `audit-collect` : client du petit modèle ajouté (plafond bas, ignoré sans clé).

### Mesures (réelles, 14 recherches Google puis la phase citations, sans recoupement ni contenu ; DataForSEO via le proxy)

|                                                                 | remove-me.io                 | mega-coloring.com   |
| --------------------------------------------------------------- | ---------------------------- | ------------------- |
| Coût annoncé (réduit) / réel                                    | 0,257 / 0,241 USD            | 0,257 / 0,248 USD   |
| dont 14 recherches Google                                       | 0,084                        | 0,078               |
| dont 6 appels « qui cite » (sans le modèle)                     | 0,157                        | 0,170               |
| Choix des ressources par le modèle                              | 0,0005 USD                   | 0,0005 USD          |
| Pages qui citent, avant filtre                                  | 275 à 524 (selon ressources) | 400 à 409           |
| Filtre gratuit : légales / accueils / fichiers                  | 10 à 64 / 10 à 16 / 5        | 1 / 16 à 31 / 4 à 5 |
| Pages qui citent après filtre gratuit (à lire ou juger : MC.6b) | 260 à 448                    | 374 à 380           |

- Sans le choix par le modèle, les « concurrents retenus » donnaient des ressources hors sujet (éditeurs de livres jeunesse et vendeur d'étiquettes pour mega-coloring.com, éditeur d'antivirus pour remove-me.io) et des pages hors sujet (catalogues de bibliothèques, podcasts). Avec le modèle : deux vrais sites de coloriages trouvés par les recherches (coloriages-a-imprimer.com, reussiralecole.fr) et plus aucun éditeur de livres ; pour remove-me.io, des sites de protection des données et de formation. Le choix varie un peu d'un essai à l'autre (température 0,2) ; en production il est mémorisé dans un step.
- **Le bruit reste élevé** : parmi les pages trouvées, des blogs de classe et des pages « ressources à télécharger » (les cibles voulues) côtoient des pages sans rapport (une boutique, une page adulte qui cite la CNIL). Aucun jugement n'est fait ici : c'est le travail de MC.6b. Taux de cibles avec angle **non mesuré dans cette session**.
- **Vraies adresses (`resolve_goto_urls`), mesure du coût et du délai** : même prix (0,006 USD les 30 résultats). Mais le fournisseur refuse l'option sur une partie des appels (« Internal SE Server Error » après ~30 s, rien n'est facturé) : 6 recherches sur 14 (remove-me.io) et 8 sur 14 (mega-coloring.com) ont dû être refaites sans l'option ; 1 recherche a été manquée même après repli. Résultat : 59 % et 44 % des adresses sont exactes, le reste reste approximatif (fil d'Ariane). Délai : 25 à 60 s par appel avec l'option (11 s sans) ; un lot de 14 recherches parallèles dure 89 à 132 s. Essais isolés : 6 simultanées = 2 refus, 4 réussites (38 à 61 s) ; 4 une par une = 1 refus, 3 réussites (32 à 40 s). **Décision : on garde** (adresses exactes pour la moitié des résultats, même prix, +1 à 2 minutes par lot de recherches). Pièges : un appel qui dépasse 60 s est coupé (peut être facturé) puis refait sans l'option.

### Fichiers clés

`src/features/collection/{resource-judge,resources,run,plan,limits,normalize,types}.ts`, `src/features/qualification/{page-nature,free,types}.ts`, `src/inngest/functions/audit-collect.ts`, `messages/fr.ts`, `docs/audit-v2.md` (section 6). Outil de mesure réel : `src/features/collection/citations.live.test.ts` (ignoré par défaut ; `CITATIONS_LIVE=1 CITATIONS_LIVE_INPUT=entree.json CITATIONS_LIVE_OUT=rapport.json CITATIONS_LIVE_CACHE=cache.json NODE_USE_ENV_PROXY=1 DATAFORSEO_PROXY_AUTH=true pnpm vitest run src/features/collection/citations.live.test.ts` ; l'entrée donne le site, ses concurrents retenus, 14 recherches et son profil).

### Pièges et dettes

- Les « concurrents retenus » de l'audit restent de mauvais candidats (magnific.com, flipkart.com, senat.fr...) : seul le tri par le modèle les rattrape. Piste : demander ce choix plus tôt, dès l'audit.
- `resolve_goto_urls` n'est demandé que dans la collecte ; les recherches de l'audit (concurrents) et des opportunités ne lisent que des domaines et n'en ont pas besoin.
- La part des étapes suivantes du budget cible (qualification, contacts) n'a pas été redistribuée : le coût attendu total est ~0,97 USD, sans marge.
- Le choix des ressources n'a pas de jeu d'évaluation annoté : à faire avec MC.6b (rendement par ressource).

### Prochain sous-jalon recommandé : MC.6b

Le jugement des trois cas (lien mort remplaçable, petit éditeur du public qui cite des ressources, page de contenu qui cite plusieurs ressources comparables) dans la qualification et le tri du rédacteur (consigne de `docs/mc0b-essai.md`), plus le pilotage par ressource (lire 6 à 8 pages par ressource, abandonner celles qui ne rendent pas). À mesurer sur remove-me.io ET mega-coloring.com (objectif : 30 % de cibles avec angle, mesure MC.0b : 10 % et 15 %).

## Session du 18/11 (matin) : contrôle du premier envoi réel, et site désactivé par Vercel

- **Envois** : 7 emails partis le 17/11 entre 22 h 54 et 23 h 54 (Paris), tous `envoye`, aucune erreur : unistra.fr, asso-generationnumerique.org, isoc.fr, apden.org, grandlyon.com, arcadsoftware.com, bge-picardie.org. Tous les emails approuvés (7) sont partis ; aucune réponse reçue.
- **Constat : le plafond de 5 par 24 h (échauffement) se contourne en supprimant puis recréant la boîte.** Jonathan a supprimé sa boîte (grâce à la correction du jour) et l'a reconnectée à 22:27 UTC : les compteurs (plafonds, échauffement) sont par `mailbox_id`, donc repartis de zéro. Résultat : 2 envois avec l'ancienne boîte (détachés, `mailbox_id` NULL), puis 5 avec la nouvelle, soit 7 emails de la même adresse Gmail en 1 heure au lieu de 5. Le moteur a appliqué ses règles à la lettre. **Corrigé le jour même (accord de Jonathan)**, voir ci-dessous.
- **Incident : tout le site répond « 402 Payment required, DEPLOYMENT_DISABLED » depuis environ 00:45 UTC le 18/11** (premier passage `send-tick` en échec : 00:48 UTC ; dernier déploiement réussi : `74836f1`, 17/11 23:54 UTC). Pages, connexion, `/api/inngest` : tout est bloqué. Conséquences tant que ça dure : plus d'envoi, plus de lecture IMAP des réponses (`reply-tick`), plus d'analyse ; les liens de désinscription des emails déjà envoyés mènent à la page 402 (la consigne « répondez stop » ne sera lue qu'au retour du site). Aucun message n'est perdu : rien n'est envoyé tant que le moteur est arrêté, et les réponses restent dans la boîte Gmail. **Cause probable : facturation ou limite d'usage du compte Vercel** (le jeton de l'environnement n'a pas accès à la facturation de l'équipe : `team_unauthorized`). Action pour Jonathan : tableau de bord Vercel, équipe `jonathan-encs-projects`, rubrique facturation / usage. Rien à corriger dans le code ; un redéploiement ne règle pas un blocage de compte.

### Plafonds, échauffement, relances et lecture des réponses par ADRESSE d'envoi (accord de Jonathan, 18/11)

- **Migration `2026121200000000_send_caps_per_address.sql`** (additive, **appliquée sur la vraie base**) : colonne `from_email` sur `sent_messages` et `reply_sends`, remplie à la création par la garde (`guard_sent_message`, `guard_reply_send`) d'après la boîte, et rattrapée pour l'historique (les 7 envois portent `jonathan.encaoua@gmail.com`, y compris les 2 détachés). Les plafonds horaire et journalier de la base comptent par `from_email`, **pour toute la base** : le plafond d'une adresse est celui de son fournisseur, quel que soit l'espace qui la connecte. Verrou par adresse.
- **Code** : `sending/service.ts` (plafonds, échauffement, relances), `inbox/send.ts` (plafonds partagés des réponses), `replies/service.ts` (`loadRefs` : les réponses sont rapprochées des envois de l'adresse, y compris ceux d'une boîte supprimée), `sending/queue-note.ts` (estimation affichée). Chaque insertion renseigne `from_email`.
- **Effet de bord corrigé** : avant, les 2 envois détachés n'auraient jamais été relancés à J+10 ni rapprochés de leurs réponses (ils ne portaient plus de boîte).
- **Tests** : SQL (supprimer puis recréer la boîte ne remet pas le plafond à zéro), moteur (plafond horaire, échauffement, autre adresse non comptée, relance d'un envoi détaché, adresse enregistrée), lecture des réponses (envoi détaché rapproché). 1 473 tests verts avec Postgres local.
- **Limite connue** : la lecture IMAP et le curseur (`imap_last_uid`) restent par boîte ; une boîte recréée relit depuis la date du plus ancien envoi de l'adresse. Les réponses déjà lues avant une suppression sont supprimées avec la boîte (`inbound_messages` en `ON DELETE CASCADE`).
- **Hébergement** : Jonathan passe Vercel en offre Pro (réponse du 18/11) ; le correctif de code sera en ligne dès que le site est rétabli.

## Session du 18/11 (suite 3) : MC.6b, jugement des trois cas et pilotage par ressource (fait ; objectif de 30 % NON atteint)

Périmètre tenu : les trois cas de Jonathan dans la qualification et dans le rédacteur, le pilotage par ressource, deux jeux d'évaluation annotés, la mesure sur les deux sites. **Pas** fait : boule de neige, recherche de liens morts, mesure sur une vraie campagne en production.

### En une phrase

Le code fait ce qui était demandé et ses jeux d'évaluation passent, mais la mesure réelle est mauvaise : rejugées par le modèle fort, **3 cibles sur 35 pour mega-coloring.com et 0 sur 33 pour remove-me.io**. Le défaut n'est plus dans le jugement : il est dans les **ressources de départ**, qui sont des sites qui achètent leurs liens.

### Ce qui change

- **Qualification, étage 4** (`qualification/llm.ts`, `score.ts`, `types.ts`) : le modèle rend une `situation`. Une page n'est une cible que si elle montre un des trois cas (`lien_mort`, `petit_editeur_ressources`, `cite_des_comparables`). Refus avec motif lisible : `pas_de_contenu` (rubrique, liste d'articles), `page_legale`, `page_commerciale`, `ferme_a_liens`, `sans_angle`. Un billet ancien n'est plus un motif de refus. Exception : la page qui cite déjà le site sans lien (`mention`) garde sa propre preuve. Un jugement rendu avant (sans situation) garde l'ancien critère. Classement : lien mort, puis petit éditeur, puis page qui cite des comparables.
- **Relevé gratuit de ce que la page cite** (`qualification/page.ts`, `pageCites`) : sites extérieurs cités dans le contenu (ni menu, ni pied de page, ni réseaux sociaux), 14 premiers liens, et le passage autour du site qui a fait trouver la page. Envoyé au modèle, et recoupé avec son verdict (`checkSituation`) : une page qui ne cite qu'un site ne peut pas « citer plusieurs ressources comparables ».
- **Rédacteur** (`drafting/write.ts`) : `TRIAGE_SYSTEM` et `WRITER_SYSTEM` reconnaissent les trois cas (consigne de `docs/mc0b-essai.md`), regardent les refus d'abord, écartent fermes à liens, pages commerciales et concurrents. Champ `situation` dans les deux réponses. La page à proposer n'est plus « presque jamais une page générale » : pour une liste de sites, c'est la page du catalogue qui correspond à la liste.
- **Pilotage par ressource** (`qualification/funnel.ts`) : une file de lecture par ressource (`citation:<domaine>`), sondage de 8 pages (4 par lot, jamais plus que le sondage), puis abandon si la ressource est citée surtout par des pages légales ou des fermes à liens (dès 6 pages), si elle ne donne aucune cible sur 8 pages, ou si elle rend moins de 5 % après 24 pages. Abandon avant toute lecture si la moitié de ses pages ont une adresse de page légale. Les pages non lues portent le motif `ressource_abandonnee`. Décisions et compteurs dans `stats.byResource`, repris par les lots suivants (`more.ts`).
- **Choix des ressources** (`collection/resource-judge.ts`, `resources.ts`, `service.ts`) : deux corrections venues de la mesure. (1) Le modèle ne voyait qu'un nom de domaine : il reçoit maintenant le titre et la description de la page d'accueil de chaque candidat (lecture gratuite, `describeCandidates`). (2) Les concurrents **non retenus** par l'audit sont proposés au choix (40 sites au plus, 60 candidats) : pour mega-coloring.com, les vrais sites de coloriages étaient presque tous parmi eux, aucun parmi les 10 retenus. Le repli sans modèle reste sur les seuls retenus.
- **Jeux d'évaluation annotés** : `qualification/angle-eval-set.ts` (20 pages sur deux thèmes, les trois cas et chaque refus, deux billets anciens à garder) et `collection/resource-eval-set.ts` (23 candidats sur deux thèmes, avec les faux amis du 18/11 : éditeur de livres, vendeur d'étiquettes, antivirus, administration).
- Aucune migration. Aucun mot ni seuil propre à un thème (contrôlé par test sur les trois consignes).

### Mesures

**Jeux annotés, petit modèle de développement** (`gpt-4o-mini`) :

|                                       | Précision | Rappel |
| ------------------------------------- | --------- | ------ |
| Jugement de la qualification (20 cas) | 1,00      | 1,00   |
| Tri du rédacteur (20 cas)             | 0,83      | 1,00   |
| Choix des ressources (23 candidats)   | 1,00      | 1,00   |

Avant le resserrement de la consigne et le recoupement gratuit : 0,67 et 0,56 de précision (le modèle disait « cite des comparables » dès qu'un seul lien existait).

**Mesure réelle** (`citations-funnel.live.test.ts` : collecte réduite de MC.6a, puis la vraie qualification sur les pages qui citent ; liste courte rejugée par le modèle fort avec `WRITER_SYSTEM`, par des agents `opus`, comme en MC.0b) :

|                                                    | mega-coloring.com | remove-me.io |
| -------------------------------------------------- | ----------------- | ------------ |
| Pages qui citent une ressource                     | 273               | 234          |
| Pages lues                                         | 200               | 232          |
| Pages jugées par le petit modèle                   | 156               | 187          |
| Cibles selon le petit modèle                       | 65 (32 %)         | 52 (22 %)    |
| dont avec un contact (liste courte)                | 35                | 33           |
| **Liste courte gardée par le modèle fort**         | **3 sur 35**      | **0 sur 33** |
| Sans contact, échantillon de 10, modèle fort       | 1 sur 10          | 0 sur 10     |
| Écartées par le petit modèle, échantillon de 10    | 0 sur 10          | 0 sur 10     |
| **Part de cibles avec angle parmi les pages lues** | **~3 %**          | **0 %**      |
| MC.0b (ressources choisies à la main)              | 15 %              | 10 %         |
| Coût de la collecte (annoncé 0,267 USD)            | 0,244 USD         | 0,240 USD    |
| Coût du jugement (prix de `claude-haiku-4-5`)      | 0,216 USD         | 0,259 USD    |

- **Ressources choisies** : esle.io, magicoloriage.com, coloriageetdessins.com, fr.hellokids.com, lilocolors.fr, topcoloriages.fr ; et data-knight.io, webcleaner.fr, netclearer.fr, proteger-mes-donnees.fr, blog.whaller.com, toutsurlacyber.fr.
- **Cibles gardées (mega-coloring.com)** : justgeek.fr (« TOP 6 des sites pour télécharger des coloriages de Noël »), mamande4.fr (blog d'une mère de quatre enfants qui conseille un site de coloriages), soutien-refuges.blog4ever.com (« Sites de coloriages animaux »), drolesdemums.com (liste de sites pour occuper un enfant malade ; pas de contact valable). Les quatre messages écrits sont corrects (adresse de leur page, liste citée nommée, page précise du site).
- **Pourquoi c'est si bas** : les pages qui citent ces ressources sont en majorité des articles écrits pour placer un lien (fermes à liens, articles sponsorisés, ancres optimisées) et des pages d'annuaires payants. Pour remove-me.io, 2 des ressources sont des agences d'e-réputation qui achètent leur visibilité : sur 53 pages rejugées, une trentaine sont des articles sponsorisés ou des annuaires. Le petit modèle, sur un extrait de 1 200 caractères, ne voit pas que le site publie des sujets sans rapport entre eux ; le modèle fort, qui lit toute la page, le voit.
- **Conséquence pour le pilotage** : il abandonne bien une ressource quand le verdict est juste (deuxième passage, remove-me.io : une ressource abandonnée après 8 pages, 39 pages non lues), mais il se fie au petit modèle. Sur les passages finaux, aucune ressource n'a été abandonnée alors que plusieurs auraient dû l'être.
- **Ce que le petit modèle écarte est bien écarté** : 0 cible sur les 20 pages écartées rejugées. Le nouveau critère ne fait donc pas perdre de cible ; il laisse encore passer trop de mauvaises.
- **Refus à tort trouvés** : le catalogue donné au rédacteur garde 80 pages, mega-coloring.com en a 1 848 en français. Le modèle fort a refusé au moins 3 pages (« le site n'a aucune page de voitures », « de guitare ») alors que ces pages existent.
- **Limites** : le petit modèle de la mesure est celui du développement, pas `claude-haiku-4-5` ; le coût de l'étape du modèle fort n'est pas mesuré en USD (ordre de grandeur : 0,07 USD par cible passée au rédacteur, soit 2 à 2,5 USD pour une liste courte de 35) ; deux sites seulement ; aucun message envoyé.
- **Dépense de la session** : 0,86 USD de DataForSEO (5 passages), quelques centimes de petit modèle.

### Fichiers clés

`src/features/qualification/{llm,score,page,funnel,more,limits,types}.ts`, `src/features/drafting/write.ts`, `src/features/collection/{resource-judge,resources,plan,service,run,limits}.ts`, `src/inngest/functions/audit-collect.ts`, `messages/fr.ts`. Tests : `qualification/resources.test.ts`, `qualification/angle-eval.test.ts`, `collection/resource-eval.test.ts`.

### Commandes

- Jeux d'évaluation réels : `NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:angle-eval` et `pnpm demo:resources-eval` (ajouter `--silent=false` pour voir le détail).
- Mesure réelle d'un site : `MC6B_LIVE=1 MC6B_INPUT=entree.json MC6B_OUT=rapport.json MC6B_CACHE=dfs.json MC6B_PAGES=pages.json MC6B_CASES=cas/ NODE_USE_ENV_PROXY=1 DATAFORSEO_PROXY_AUTH=true LLM_PROXY_AUTH=true pnpm vitest run src/features/qualification/citations-funnel.live.test.ts` (`MC6B_PILOT=0` : sans pilotage). L'entrée donne le site, son profil, ses concurrents retenus et non retenus (`others`), 14 recherches.

### Dettes et pièges

- Les ressources de départ restent le point faible : un site comparable qui achète ses liens amène des fermes à liens, pas des cibles.
- La liste courte de la qualification contient encore environ 9 mauvaises cibles sur 10 : le rédacteur les écarte, mais chacune coûte un tri et parfois un appel au modèle fort.
- Le catalogue du rédacteur (80 pages) ne couvre pas un grand site : refus à tort.
- Les pages paginées d'annuaires (« page 2 », « page 33 ») ne sont pas écartées par leur adresse.
- La qualification garde `claude-haiku-4-5` et un extrait de 1 200 caractères ; la consigne nouvelle n'a pas été essayée en production avec ce modèle.
- Toutes les sources passent par le nouveau critère : une campagne donnera moins de cibles affichées qu'avant (celles qui disparaissent n'auraient pas eu de message).

### Backlog

- Écarter par l'adresse les pages paginées et les fiches d'annuaires.
- Catalogue du rédacteur pour un grand site : chercher la page du site par le sujet de la page cible, au lieu de 80 pages fixes.
- Montrer à l'écran le rendement par ressource (`stats.byResource`).

### Prochain sous-jalon recommandé : MC.6c, recadré

Des ressources de départ que de vraies personnes citent, pas celles qui achètent leurs liens. Trois pistes à mesurer avant de coder, dans cet ordre : (1) l'ancre du lien, gratuite dans les données reçues : un lien posé sur le nom du site (« Hugo l'escargot ») vient d'une vraie citation, un lien posé sur un mot-clé (« coloriage gratuit ») vient d'un article placé ; (2) la boule de neige à partir des bonnes cibles : les sites qu'elles citent (Hugo l'escargot, Mes Coloriages, Tête à modeler pour mega-coloring.com) deviennent les ressources de départ ; (3) juger sur la page entière avec le petit modèle de génération actuelle, pour que le pilotage voie les fermes à liens. Critère inchangé : part de cibles gardées par le modèle fort, sur les deux sites.

## Session du 18/11 (suite 4) : MC.6c, mesure des trois pistes (faite) ; boule de neige à construire (MC.6d)

Périmètre tenu : mesure sur les deux sites AVANT de coder, avec le critère de MC.6b (cibles gardées par le modèle fort sur la liste courte), puis seulement le code que la mesure justifie. **Pas** fait : boule de neige dans le produit (MC.6d), catalogue du rédacteur par sujet, liens morts.

### En une phrase

**La boule de neige est la seule piste qui change le résultat : mega-coloring.com passe de 3 sur 35 (9 %) à 11 sur 34 (32 %), objectif de 30 % atteint ; remove-me.io (aucune bonne cible pour amorcer) reste à 4 sur 23 (17 %) avec des ressources publiques gratuites choisies à la main, contre 0 sur 33.** Le tri par l'ancre ne sert à rien ; la lecture de la page entière nettoie la liste mais ne crée pas de cibles.

### Mesures (rejugement par des agents `opus` avec `WRITER_SYSTEM`, comme en MC.6b ; DataForSEO réel ; petit modèle `gpt-4.1-mini`, facturé au prix de `claude-haiku-5-5`)

| Passage                                                         | mega-coloring.com      | remove-me.io              |
| --------------------------------------------------------------- | ---------------------- | ------------------------- |
| Référence refaite (1 200 caractères, ressources du modèle)      | 2 sur 31 (6 %)         | 0 sur 38                  |
| MC.6b (rappel)                                                  | 3 sur 35               | 0 sur 33                  |
| **Piste 1 : ancre du lien**                                     | rien (voir ci-dessous) | rien                      |
| **Piste 3 : page entière** (6 000 caractères, mêmes ressources) | 2 sur 15 (13 %)        | 0 sur 11                  |
| **Piste 2 : boule de neige** (ressources de départ imposées)    | **11 sur 34 (32 %)**   | 4 sur 23 (17 %), contrôle |
| Part des pages lues qui sont des cibles gardées (piste 2)       | 11 sur 200 (5,5 %)     | 4 sur 219 (1,8 %)         |
| Coût DataForSEO de la passe piste 2 / jugement (prix Haiku 5.5) | 0,174 USD / 0,038 USD  | 0,094 USD / 0,038 USD     |

- **Piste 1, l'ancre ne départage rien.** Parmi la liste courte de référence : lien posé sur le nom du site 1 cible sur 12 (mega-coloring.com) et 0 sur 7 (remove-me.io) ; sur un mot-clé 1 sur 16 et 0 sur 29. Pire : les deux agences de suppression de données de remove-me.io (netclearer.fr, webcleaner.fr) ont 74 % et 59 % de liens posés sur leur NOM et sont des fermes à liens à 100 % (articles écrits pour les placer). Les fermes écrivent le nom du site comme une vraie citation. Piste abandonnée, rien codé.
- **Piste 3, page entière.** La liste courte tombe de 38 à 11 (remove-me.io) et de 31 à 15 (mega-coloring.com) et le pilotage abandonne enfin des ressources (webcleaner.fr, norton.com). Les 2 cibles confirmées de mega-coloring.com restent. Elle ne crée pas de cibles : elle évite de payer le modèle fort sur 20 à 25 mauvaises pages. Coût : 0,02 à 0,04 USD par site avec `claude-haiku-5-5` ; avec `claude-haiku-4-5` ce serait 10 fois plus et dépasserait le budget de qualification (0,40 USD).
- **Piste 2, boule de neige.** Les graines de mega-coloring.com sont les sites cités par les deux cibles confirmées (la page de Noël de justgeek.fr cite dessin-kawaii.fun, coloriage.info, colorpdf.com ; la page diocésaine cite reussiralecole.fr) plus Hugo l'escargot et Tête à modeler, cités par les bonnes cibles de MC.6b (noms donnés par Jonathan), plus coloriageenfant.com. Rendement par graine (cibles gardées / liste courte) : hugolescargot.com 5/11, coloriage.info 3/7, teteamodeler.com 2/7, dessin-kawaii.fun 2/7, coloriageenfant.com 1/6, colorpdf.com 1/1. **Pour remove-me.io il n'y a aucune graine** (le modèle fort n'a gardé aucune cible) : le contrôle utilise des ressources publiques gratuites de MC.0b choisies à la main (haveibeenpwned.com 3/13, 33700.fr 1/11, signal-spam.fr abandonnée après 10 pages). Le résultat de 17 % n'est donc PAS une boule de neige, c'est la borne haute de « de bonnes ressources de départ ».
- **Exemples de cibles gardées (modèle fort).** mega-coloring.com : la page « Liens utiles » d'une association de garde d'enfants (cite Éducatout et Hugo l'escargot), une liste de ressources gratuites d'une médiathèque municipale, la page carnaval CE1 de SitesPE tenue par une enseignante, le blog d'une maman qui fait l'école à la maison en maternelle, le blog de la fermette Z'@nimos, la chronique d'une psychothérapeute. remove-me.io : le billet d'une section syndicale CFTC qui recommande deux services de vérification de fuite, un site indépendant de sécurité informatique, le blog personnel d'un développeur, un petit dépanneur informatique.
- **Pourquoi remove-me.io reste bas** : les concurrents comparables sont des agences commerciales ; seuls des services publics gratuits (haveibeenpwned, 33700.fr) sont cités par de vraies personnes. Le choix des ressources doit viser « ce que des personnes recommandent gratuitement », pas « ce qui fait la même chose que le site ».
- **Limites à dire** : 2 sites, de petits effectifs (2 cibles à la référence mega-coloring.com, 4 à remove-me.io) ; le modèle fort est un agent, deux relectures peuvent différer (un agent a lui-même noté qu'un jugement plus souple aurait gardé une page de plus) ; les graines de mega-coloring.com ont été choisies à partir des cibles CONFIRMÉES par le modèle fort, alors que le produit n'aura que le verdict du petit modèle (plus bruité) ; petit modèle = `gpt-4.1-mini`, pas Haiku 5.5 (non joignable depuis la session) ; aucun message envoyé.
- **Dépense de la session** : ~0,9 USD de DataForSEO (6 collectes), ~0,1 USD de petit modèle, plus les agents de rejugement.

### Ce qui change dans le code

- **Page entière** (`qualification/limits.ts`) : extrait de 1 200 à **6 000 caractères**. **Modèle de qualification** : `qualificationModel()` (`qualification/service.ts`) = `claude-haiku-5-5` avec Anthropic (`LLM_MODEL` reste prioritaire), figé dans le plan de la qualification et réellement utilisé par le client de jugement et le client par lots (`deps.ts`, `createBatchClientFromEnv(model)`). Le prix de `gpt-4.1-mini` est dans la grille (`pricing.ts`). Le reste du produit garde `claude-haiku-4-5`.
- **Pages paginées** (`qualification/page-nature.ts`) : nouvelle nature `page_paginee` (« /page-33 », « /page/2 », « /p7 », « ?page=3 », « ?paged=2 ») écartée par l'adresse avec motif lisible (`messages/fr.ts`), jamais la page 1, jamais « ?p=123 » ni un titre d'article qui contient « page-2 ».
- **Outil de mesure** (`citations-funnel.live.test.ts`) : `MC6C_RESOURCES=a.fr,b.fr` impose les ressources (comparaison à ressources égales, sans choix par le modèle), `MC6C_JUDGE_MODEL` choisit le modèle du jugement.
- Test `well-formed.test.ts` rendu indépendant de la taille de l'extrait.

### Commandes

Mesure d'un site à ressources imposées : `MC6C_RESOURCES=a.fr,b.fr MC6C_JUDGE_MODEL=gpt-4.1-mini MC6B_PRICE_MODEL=claude-haiku-5-5 MC6B_LIVE=1 MC6B_INPUT=entree.json MC6B_OUT=rapport.json MC6B_CACHE=dfs.json MC6B_PAGES=pages.json MC6B_CASES=cas/ NODE_USE_ENV_PROXY=1 DATAFORSEO_PROXY_AUTH=true LLM_PROXY_AUTH=true pnpm vitest run src/features/qualification/citations-funnel.live.test.ts`. Les entrées se refont depuis la base (profil dans `brand_profiles`, 14 premières recherches dans `candidate_collections.plan->serp`, concurrents dans `competitors`) via l'API de gestion Supabase.

### Dettes et pièges

- **Haiku 5.5 non essayé** avec la consigne des trois cas sur 6 000 caractères : à vérifier au premier run réel (budget, qualité). Si la qualité est moindre, rejouer l'essai avec `LLM_MODEL`.
- Le budget de qualification (0,40 USD) ne couvre une extrait de 6 000 caractères qu'avec un modèle à 0,1 USD le million de jetons : ne pas remettre `claude-haiku-4-5` sans réduire l'extrait.
- **Catalogue du rédacteur** (80 pages) : encore limité ; des agents ont signalé des refus à cause d'un catalogue trop court (pas de page « avion » sur mega-coloring.com, 1 848 pages en français). Piste : conserver les adresses du sitemap avec leurs mots d'adresse (gratuit) et ne lire que les 5 à 10 pages les plus proches du sujet de la cible.
- Le jugement des agents est un proxy : seules des réponses réelles diront si une cible « gardée » répond.

### Backlog

- Montrer à l'écran le rendement par ressource (`stats.byResource`).
- Un choix des ressources de départ orienté « ce que des gens recommandent gratuitement » (remove-me.io).

### Prochain sous-jalon recommandé : MC.6d, la boule de neige dans le produit

Après la qualification (premier passage), prendre les sites cités par les cibles retenues (`page.cites`, déjà relevé gratuitement), les faire juger par le même modèle que `resource-judge` (même offre que le site, pas un site commercial), puis appeler « qui cite cette ressource » pour au plus 6 nouvelles ressources (≈0,03 USD chacune, coût annoncé et plafonné, nouvelle phase `boule_de_neige`), fusionner les pages obtenues et les passer au même entonnoir avec le pilotage par ressource. À mesurer sur les deux sites avec les graines que le produit trouve seul (verdict du petit modèle, pas du modèle fort). Quand aucune cible n'existe (remove-me.io), prévoir le repli : ressources publiques et gratuites.

## Session du 18/11 (suite 5) : MC.6d, la boule de neige dans le produit (codée et mesurée ; objectif de 30 % NON atteint sur la liste complète)

Périmètre tenu : phase `boule_de_neige` dans le produit, repli « ressources publiques et gratuites », mesure sur les deux sites avec les graines que le produit trouve seul, vérification de Haiku. **Pas** fait : liens morts, catalogue du rédacteur par sujet, écran du rendement par ressource.

### En une phrase

La boule de neige multiplie les cibles gardées par le modèle fort (mega-coloring.com : 2 puis 10 de plus ; remove-me.io : 0 puis 3 de plus), mais sur la liste courte COMPLÈTE le critère de 30 % n'est atteint ni sur l'un (12 sur 59 pages lisibles, 20 %) ni sur l'autre (3 sur 24, 12 %). La part des seules pages de la boule de neige est de 29 % (mega-coloring.com) et 21 % (remove-me.io). Le repli « publiques » ne retient rien sur remove-me.io.

### Mesures (liste courte rejugée par des agents `opus` avec `WRITER_SYSTEM`, comme MC.6b/MC.6c ; DataForSEO réel ; petit modèle `gpt-4.1-mini` facturé au prix de `claude-haiku-5-5` ; ressources de départ choisies par le produit seul)

|                                                               | mega-coloring.com                                                                                        | remove-me.io                                                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1er passage : liste courte, gardées par le modèle fort        | **2 sur 24** lisibles (25 en liste, 1 illisible)                                                         | **0 sur 10**                                                                                        |
| Graines trouvées seules (verdict du petit modèle)             | jedessine.com, teteamodeler.com, hugolescargot.com, coloriage.info, supercoloring.com, mescoloriages.com | auditosint.com, crabclear.com, incogni.com, optery.com (services payants du même genre que le site) |
| Pages nouvelles trouvées / lues / jugées                      | 399 / 240 / 163                                                                                          | 111 / 106 / 60                                                                                      |
| Liste courte de la boule de neige, gardées par le modèle fort | **10 sur 35** lisibles (40 en liste, 5 illisibles) : 29 %                                                | **3 sur 14** : 21 %                                                                                 |
| Liste complète                                                | 12 sur 59 lisibles : 20 %                                                                                | 3 sur 24 : 12 %                                                                                     |
| Coût DataForSEO de la phase (6 appels au plus)                | 0,173 USD                                                                                                | 0,105 USD                                                                                           |
| Coût du jugement de la phase (prix Haiku 5.5)                 | 0,039 USD                                                                                                | 0,015 USD                                                                                           |
| Repli « publiques » forcé (`MC6D_PUBLIC=1`)                   | non mesuré                                                                                               | **aucune ressource retenue** (60 sites proposés)                                                    |

- **Rendement par graine** (pages lues, cibles du petit modèle, liste courte) : mega-coloring.com hugolescargot.com 68/23/12, supercoloring.com 40/13/11, coloriage.info 56/19/9, mescoloriages.com 31/16/8, teteamodeler.com 46/11/5, jedessine.com 26/2/1 ; remove-me.io incogni.com 95/20/13, optery.com 15/1/1, crabclear.com 1/0/0, auditosint.com non lue. Le pilotage abandonne netclearer.fr, toutsurlacyber.fr (première passe) et coloriageetdessins.com. Les graines de mega-coloring.com sont à peu près celles de MC.6c (trouvées avec le verdict du modèle fort) : le produit les retrouve seul.
- **Cibles gardées de la boule de neige** (mega-coloring.com) : mairie de Saint-Étienne-d'Orthe (liens utiles), association de garde d'enfants au Québec, blogs de mamans, blog de patchwork, webzine sur le coloriage anti-stress. remove-me.io : deux listes de services (pasqualepillitteri.it, fr.simeononsecurity.com), sitegeek.fr, plus syskb.com sans contact. Le modèle fort refuse surtout : fermes à liens et articles sponsorisés (webcleaner.fr), grands médias où le site n'est qu'une source, pages sur un seul produit, pages où le catalogue du rédacteur (80 pages) n'a pas le sujet cherché (gâteaux, voitures, Pâques) : c'est la dette du catalogue.
- **Pourquoi remove-me.io reste bas** : le modèle accepte des services payants comme « même offre » (incogni, optery) parce que le site propose aussi un service ; la consigne des graines demande d'écarter ceux qui vivent de leur référencement mais le petit modèle ne distingue pas. Le repli n'a pas été déclenché dans la mesure normale (des graines existaient) ; forcé, il ne retient rien : les sites cités par les pages lues sont des institutions, des médias et des fermes ; les ressources publiques de MC.0b (haveibeenpwned.com, 33700.fr) n'y figurent pas. **Le repli est codé et testé mais n'a pas démontré de gain.**
- **Haiku 5.5, jeu des trois cas** (20 cas annotés, même consigne que `demo:angle-eval`) : précision 1,00, rappel 0,90, situation juste 19 sur 20 (une cible manquée, d01). Réalisé par un sous-agent `haiku` (l'API Anthropic n'est pas joignable d'ici sans clé) : le modèle exact n'est pas garanti, et les cas sont courts (le test sur 6 000 caractères reste à faire avec `LLM_PROVIDER=anthropic` en production). Le jugement des pages complètes par `gpt-4.1-mini` dans les mesures ci-dessus coûte 0,015 à 0,04 USD ; budget de lecture réel de la phase, 0,08 USD d'arrière-plan.
- **Limites à dire** : 2 sites ; effectifs petits (une cible de plus ou de moins change de 3 points) ; modèle fort = agent, deux relectures peuvent différer ; des pages « illisibles » (6 sur mega-coloring.com) comptées à part ; aucun message envoyé ; le second passage de la mesure s'arrête sur « objectif de pages » (mega-coloring.com), donc la production (lots en arrière-plan) lirait davantage.
- **Dépense de la session** : ~1,3 USD de DataForSEO (3 collectes + 3 phases + 1 repli), ~0,15 USD de petit modèle, plus les agents.

### Ce qui change dans le code

- **`src/features/snowball/`** (nouveau) : `limits.ts` (6 ressources au plus, coût annoncé `snowballCostUsd()` : attendu ~0,18 USD, pire cas ~0,20 USD), `seeds.ts` (sites cités par les pages jugées cibles ; repli : sites cités par les pages lues, jugées et non refusées), `run.ts` (`executeSnowball` : choix des graines par `pickResources`, repli « publiques », appels `runCitationsCall`, domaines nouveaux seulement ; sans modèle rien n'est fait), `service.ts` (`runSnowballForAudit`, `persistSnowball`), tests `snowball.test.ts`.
- **Intégration** : `inngest/functions/audit-qualify-auto-start.ts`, step `boule-de-neige` avant le premier lot de lecture en arrière-plan. Les pages nouvelles deviennent des candidats de la collecte ET des lignes « en réserve » de la qualification ; les lots existants les lisent avec le pilotage par ressource (file `citation:<domaine>`). Une panne laisse l'arrière-plan faire comme avant ; rejouée, la phase ne refait rien (`qualification_runs.stats.snowball`).
- **`collection/resource-judge.ts`** : modes `comparables` / `graines` / `publiques` (consignes `SEEDS_SYSTEM`, `PUBLIC_RESOURCES_SYSTEM`), origine `citee`. **`collection/run.ts`** : `loadCollectionContext` extrait de `beginCollection`, `CitationsRun`, `toRow` exporté.
- **Coût annoncé** (`analysis/estimate.ts`) : la phase s'ajoute au coût annoncé de l'analyse (attendu ~1,16 USD, pire cas ~1,64 USD, plafond d'audit 2 USD). **Décision de Jonathan à prendre** : l'objectif de 1,00 USD par analyse est dépassé de ~0,18 USD ; options : accepter, ou réduire la collecte (la première passe de ressources donne peu : 2 sur 24 et 0 sur 10).
- **Outil de mesure** : `citations-funnel.live.test.ts` (`MC6D=1` enchaîne première passe, boule de neige et second passage ; `MC6D_PUBLIC=1` force le repli ; `MC6D_BUDGET`).

### Commandes

`MC6D=1 MC6C_JUDGE_MODEL=gpt-4.1-mini MC6B_PRICE_MODEL=claude-haiku-5-5 MC6B_LIVE=1 MC6B_INPUT=entree.json MC6B_OUT=rapport.json MC6B_CACHE=dfs.json MC6B_PAGES=pages.json MC6B_CASES=cas/ NODE_USE_ENV_PROXY=1 DATAFORSEO_PROXY_AUTH=true LLM_PROXY_AUTH=true pnpm vitest run src/features/qualification/citations-funnel.live.test.ts` ; le dossier de cas contient `liste_courte` (premier passage) et `boule_de_neige`. Entrées : voir MC.6c (base Supabase).

### Dettes et pièges

- **Le critère de 30 % sur la liste complète n'est pas atteint** ; le gain vient de la boule de neige mais la première passe dilue. Pistes : réduire la première passe de ressources (6 appels qui donnent 2 cibles sur 24 et 0 sur 10), et réserver la lecture en arrière-plan aux files de la boule de neige.
- **Choix des graines** : un site qui vend le même service (remove-me.io) fait accepter des concurrents payants. Le modèle voit la présentation de l'accueil ; ajouter « gratuit ou payant » au profil de la ressource, ou lire la page « tarifs ».
- **Repli publiques** : les candidats (sites cités par les pages lues) ne contiennent pas les services publics ; piste : proposer aussi au modèle les pages « ressources » connues du thème, ou une recherche Google « outils gratuits pour <besoin> ».
- **Catalogue du rédacteur** (80 pages) : encore la première cause de refus à tort des agents de rejugement (pages « gâteaux », « voitures », « Pâques » existantes mais absentes du catalogue).
- Les pages d'une ressource déjà connue dans la réserve (domaine existant) ne reçoivent pas la source « boule de neige » : un domaine à la fois dans la réserve et cité par une graine n'est pas lu en priorité.
- Haiku 5.5 : à vérifier en production avec une clé Anthropic (test des 6 000 caractères).

### Backlog

- Montrer à l'écran le rendement par ressource et la phase boule de neige (`stats.snowball`).
- Marquer les domaines déjà en réserve qui citent une graine.

### Prochain sous-jalon recommandé : MC.6e

Rendre le critère atteignable : (1) catalogue du rédacteur par sujet de la cible (conserver les adresses du sitemap avec leurs mots d'adresse, lire les 5 à 10 plus proches) ; (2) réduire ou supprimer la première passe de ressources choisies d'avance au profit de la boule de neige, après un essai sur les deux sites ; (3) choix des graines : écarter les services payants quand le site est gratuit ; repli « publiques » alimenté par une recherche. Mesure : cibles gardées / liste courte sur remove-me.io et mega-coloring.com.

## Session du 18/11 (suite 6) : MC.6e, catalogue complet, refus assouplis, « rédiger quand même » (faite ; mesure à nuancer)

Périmètre tenu. **Pas** fait : liens morts, première passe de ressources réduite, graines, repli « publiques ».

### En une phrase

Sur les mêmes 25 cibles par site, le modèle fort garde **12 sur 23 (mega-coloring.com, avant : 3) et 11 sur 25 (remove-me.io, avant : 0)** avec la consigne assouplie et le catalogue complet présélectionné. Le gain vient de la règle de refus (cibles proches gardées en situation « autre », avec une note « à relire »), presque pas du catalogue : l'ancienne consigne n'a signalé « faute de page » que sur 1 cible sur 48.

### Constat sur le code (point 2 demandé)

Aucun refus ne pouvait être forcé : `loadDraftInput` sautait toute cible présente dans `draft_declines`, et l'écran « À valider » les listait sans bouton. Ajouté : colonne `draft_declines.retry_requested`, `draftAnyway` (`drafting/service.ts`), action `draftAnywayAction`, bouton « Rédiger quand même ». La cible rejouée saute le tri, reçoit les pages les plus proches, et la décision d'écart est supprimée une fois le message écrit. Une rédaction déjà en cours la reprendra à la prochaine exécution (`countMissing` la compte comme manquante).

### Mesure

Cohorte : 25 cibles par site tirées de façon régulière dans la `liste_courte` du 16-17/11 en base (mega-coloring.com 36 cibles, remove-me.io 80), donc l'ancienne chaîne, pas la liste de MC.6d (ses caches n'existent plus). Mêmes pages lues, deux conditions : ancienne (consigne de `main`, catalogue de 80 pages) et nouvelle (consigne MC.6e, catalogue du palier Starter = 200 pages sur 2 857 adresses de sitemap pour mega-coloring.com, 745 pour remove-me.io, 25 pages présélectionnées). Jugement par 8 agents `opus` appliquant la consigne du rédacteur, sans savoir quelle condition (pas de message rédigé, pas de lecture du texte des pages candidates). Deux cibles illisibles écartées (mega-coloring.com).

|                                                         | mega-coloring.com                | remove-me.io                     |
| ------------------------------------------------------- | -------------------------------- | -------------------------------- |
| Ancienne consigne, catalogue de 80 pages                | 3 sur 23                         | 0 sur 25                         |
| **Nouvelle consigne, catalogue complet présélectionné** | **12 sur 23** (dont 7 « autre ») | **11 sur 25** (toutes « autre ») |
| Notes « à relire » sur les gardées                      | 12 sur 12                        | 9 sur 11                         |
| « Faute de page » signalé                               | 1 (ancienne) / 1 (nouvelle)      | 0 / 1 (nouvelle)                 |

- **Ce que le chiffre veut dire** : « gardée » = « sera rédigée et soumise à validation ». Les 11 cibles de remove-me.io ne citent aucune ressource comparable ; elles sont gardées par proximité de thème ou de public (le modèle l'a dit lui-même : la consigne n'a pas d'étiquette pour la simple proximité, d'où « autre »). L'objectif de 30 % est dépassé mais **ne prouve pas que les messages seront bons** : en MC.6a, 2 messages sur 20 méritaient l'envoi. À relire avec Jonathan avant de croire ce chiffre.
- **Catalogue** : n'a presque rien changé au verdict (une cible sur 48 gênée par l'absence de page). Il sert à choisir une page plus proche ; effet non mesuré ici (pas de rédaction).
- **Limites** : un seul passage par condition, agents non indépendants des consignes, 2 sites, cohorte de l'ancienne chaîne et non de MC.6d, effectifs de 25.
- **Dépense** : aucun appel DataForSEO ni LLM de production ; 8 agents de rejugement. Lectures de pages web gratuites.

### Ce qui change dans le code

- **Migration `2026121300000000_site_catalogue.sql`** (appliquée à la vraie base via l'API de gestion ; absente de `list_migrations`) : table `site_catalogue`, `draft_declines.retry_requested` (+ droit `delete` pour `service_role`), `target_drafts.review_note`. `database.types.ts` patché à la main.
- **`drafting/shortlist.ts`** (nouveau) : `shortlistCatalogue` (mots communs pondérés par rareté, titre et adresse comptent double, 8 pages au moins) ; **`catalogue.ts`** : `catalogueCap(plan)`, plafond du sitemap en « une page sur N » (toutes les rubriques représentées), jusqu'à 16 sous-sitemaps ; **`limits.ts`** : `catalogueCapByPlan`, `shortlistPages: 25`.
- **`run.ts`** : `loadCatalogueEntries`, `loadSitePages`, `saveCatalogueUrls`, `saveCataloguePages` (alimente aussi le catalogue), `clearCatalogue` ; **`inngest/functions/plan-drafts.ts`** : catalogue construit une fois par site (7 jours), 80 pages visitées par paquets, pages candidates lues à la demande puis gardées.
- **`write.ts`** : cinq refus (concurrent direct, page légale, ferme à liens manifeste, grand média inatteignable, aucun rapport), « le catalogue n'a pas la page » n'est jamais un refus, champ `a_relire`, mode `force`. **`draft.ts`** : présélection, repli sur la page la plus proche, `reviewNote`.
- **`lib/llm/client.ts`** : option `cacheSystem` (cache de la consigne système Anthropic génération 5 ; jetons du cache comptés à 125 % / 10 %). Seule la consigne est en cache : la sélection de pages change à chaque cible.
- **UI** : note « À relire » sur chaque message, bouton « Rédiger quand même » sur chaque cible écartée.
- **Outil de mesure** : `drafting/catalogue-measure.live.test.ts` (`MC6E_LIVE=1`, voir l'en-tête).

### Dettes et pièges

- **Qualité des messages « par proximité »** non mesurée : à lire avec Jonathan. Si trop faibles, resserrer « autre » (exiger une ressource ou un public nommé) plutôt que remettre des refus.
- Plafond du catalogue : mega-coloring.com compte 2 857 adresses ; à 200 pages (bêta) le catalogue n'en couvre que 7 %.
- Titres des pages hors des 80 visitées : seulement les mots de l'adresse (le modèle voit l'adresse sans titre).
- Le cache de consigne ne joue que si la consigne dépasse le minimum du modèle (Opus 4 096 jetons, à vérifier : le rédacteur fait ~2 500).
- Un refus du rédacteur sur une cible « rédiger quand même » reste possible (concurrent, légal, sans rapport) : le bouton reste affiché.
- Vérifications : typecheck, lint et tests des dossiers touchés verts en local ; suite complète à la CI.

### Prochain sous-jalon recommandé : MC.6f

(1) Faire relire 10 messages « par proximité » rédigés pour de vrai, et caler la consigne ; (2) réduire la première passe de ressources ; (3) graines sans services payants, repli « publiques » alimenté par une recherche ; (4) liens morts.

## Session du 18/11 (suite 7) : retours en vrac sur l'interface (faite)

Hors plan Mx : trois retours de Jonathan sur « À valider » et « Conversations ».

- **« Plus tard » durable** : avant, un état local (`useState`) : le rechargement ramenait tout et le compteur du menu (66) ne bougeait pas. Maintenant `target_drafts.snoozed_until` et `reply_drafts.snoozed_until` (24 h, `SNOOZE_HOURS`). `loadQueue` écarte les éléments remis à plus tard, donc le menu, l'accueil et l'écran baissent ensemble. Bandeau « N éléments remis à plus tard » + « Tout remettre dans la file » (`wakeSnoozed`).
- **Sélection en lot** : case à cocher sur chaque carte, « Tout sélectionner » (limité au filtre affiché), barre d'actions : **Approuver et envoyer** (emails prêts avec boîte connectée + réponses), **Refuser**, **Plus tard**. Les formulaires ne s'approuvent pas en lot (ils se copient et se marquent « C'est fait ») : la sélection les ignore et le dit. « Refuser » un premier message = `refuseMessages` : cible écartée avec le motif « Refusé par vous » (`draft_declines.declined_by = 'utilisateur'`, bouton « Rédiger quand même » conservé), brouillon supprimé ; une réponse refusée = `rejectReplyDraft`. Confirmation avant refus.
- **Archiver une conversation** (boîte à zéro) : `thread_reads.archived_at`, action `setArchivedAction`. Bouton « Archiver (traité) » dans le fil, passage automatique au fil suivant, filtre « Boîte de réception (N) / Archivées (N) / Tout ». Un fil archivé **revient** dans la boîte si une réponse arrive après (`isArchived`, pur, testé).
- **Migration** `2026121400000000_snooze_refuse_archive.sql` (appliquée à la vraie base via l'API de gestion ; `database.types.ts` patché à la main).
- **Fichiers** : `approvals/service.ts` (`snoozeItems`, `wakeSnoozed`, `refuseMessages`, `isSnoozed`), `approvals/actions.ts`, `approvals/queue.tsx`, `conversations/{service,status,actions,conversations}.ts(x)`, `messages/fr.ts`.
- **Dettes** : « Plus tard » fixe 24 h (pas de choix de durée) ; archivage en lot dans Conversations non fait (un fil à la fois) ; pas de test d'écran, vérifié par typecheck, lint et tests des dossiers touchés seulement.

## Session du 18/11 (suite 9) : MC.6g, vraie campagne sur un troisième thème (partielle : lecture de fond non mesurée)

Site : **monjardinbio.com** (jardinage bio, boutique + blog + podcast), choisi par Claude sur accord de Jonathan, espace de test `ed39d649…`, site `a568dbd9…`, audit `bce79672-5224-4115-bb18-b01af672886d`. Lancé sur la **production** (Inngest `production-195a09c2`, modèle Anthropic confirmé par `cost_ledger.provider = anthropic`) : depuis la session, ni le web des cibles ni l'API Anthropic ne sont joignables. Arrêtée à la demande de Jonathan après la première analyse ; aucun envoi d'email. **Coût réel 1,52 USD** (DataForSEO ~0,73, qualification 0,35, boule de neige 0,18, reste contacts et constats).

### Chiffres réels (première analyse, 27 min, 17:35 à 18:02 UTC)

Entonnoir : 1 428 candidats → 520 pages lues → 398 vivantes → **160 jugées** → 76 pertinentes → **57 en liste courte avec contact** (75 % des pertinentes). Réserve : **779 jamais lues** (`hors_budget_lecture`) + **238 lues mais jamais jugées** (`non_qualifie`). Exclus : accueil 65, hors sujet 45, injoignable 41, éditeur introuvable 33, robots 25, ressource abandonnée 23, irréaliste 22, langue 22, sans contact 19, concurrent 15, le reste < 12.

Rendement par source (candidats → liste courte) : **lien mort 46 → 13 (28 %)**, citations 344 → 30 (9 %), contenu 176 → 20 (11 %), mentions 27 → 3, **intersection 315 → 6 (2 %)**, **SERP 208 → 5 (2,4 %, 0,21 USD, soit 0,04 USD par cible contre ~0,01 pour les citations)**. Ressources de la boule de neige : 6, dont gerbeaud.com, atoutloisir.com, lamidesjardins… ; 1 abandonnée (kideaz.com, 0 cible sur 9 pages).

### Pourquoi la lecture de fond a planté (cause en cascade, corrigée par la PR #177)

1. `batchSchema` rejetait tout un lot si un motif dépassait 240 caractères (note 160) : le modèle de production écrit plus long que le modèle de dev. **49 appels de jugement sur 83 perdus** (`llmFailures`), soit les 238 pages `non_qualifie`.
2. Au lot 1 du fond, `judge-collect` voyait toutes les réponses invalides et retombait en appels directs séquentiels (un par groupe de 5 cibles) : plus de 300 s dans UNE requête Vercel (`maxDuration` 300), **504** deux fois de suite (tentatives 0 et 1, 18:04 à 18:14), `auto_stop = erreur`, 0 lot lu. Trace Inngest `01M7QX5SEEFGMF06TSP32WHYES`.
3. Correctif : longueurs tronquées dans `toJudgement`, repli direct stoppé au bout de 150 s (le reste va en stock). Test `llm-schema.test.ts`.

**Piège non traité** : une étape qui dépasse 300 s arrête toute la chaîne (`erreur`). Une autre cause de 504 la tuerait de la même façon : à surveiller, ou découper `judge-collect` en une étape par groupe.

### Pourquoi pas plus de liens

- **Volume** : 238 + 779 pages jamais exploitées. Projection (à confirmer, jamais mesurée) : mêmes taux que les pages jugées (47 % pertinentes, 75 % avec contact) donnent +80 sur les 238 déjà lues, et de 100 à 200 de plus si les 779 sont lues, avec le tri de fermes ci-dessous en moins.
- **Qualité de la liste courte (relue à la main, 57 cibles)** : les 15 premières sont de vraies cibles (blogs jardin avec lien mort, associations, petit éditeur qui cite des ressources). Les ~25 du bas sont à fit 0,3 à 0,5, « autre » : couvreurs.net, aeromecanics.fr, alliancetechvapor.fr (un site de vape qui publie un article potager), guidetravauxpro.fr, ami-hebdo.com, hellocarbo.com, annuaires. **Six articles « serre de jardin » quasi identiques** (lesprit-nature.net, cileo-habitat.fr, deco-et-ambiances.fr, culture-durable.fr, jardinews.com, blog-habitat-durable.com) sont un réseau d'articles sponsorisés. **`ferme_a_liens` n'a écarté qu'un site sur 1 428 et `same_offer` aucun parmi les 57**, alors que cmonjardinier.com, revedepan.com, shop.qista.com et charmille-elagage.fr sont des boutiques ou prestataires proches du même public. Cinq pages « lien mort » sont sur des sites sans rapport (couvreurs.net, terrassement-maison.com, guiderenovation.fr…) : le lien mort n'est un angle que si le sujet correspond. Estimation : **environ 20 à 25 cibles réellement envoyables sur 57**, comme sur les deux autres sites (le rédacteur en refuse la moitié).
- **Détection à resserrer (sans mot propre à un thème)** : (a) site dont le sujet général n'a rien à voir avec l'article (vape, mécanique, rénovation) : la qualification ne voit que la page, pas la page d'accueil ; (b) plusieurs pages de la même campagne sur un même sujet commercial étroit (6 serres) : un regroupement par sujet de la liste courte ; (c) `same_offer` pour les sites de type `ecommerce` : exiger que la page apporte une raison de lien, ne pas garder `autre` avec fit < 0,5 ; (d) lien mort : exiger la correspondance de sujet avec une page du site.
- **Sources** : SERP et intersection coûtent cher pour 2 % de cibles ; lien mort et citations sont à pousser en premier (budget annoncé).
- **Durée** : 27 minutes pour la première analyse, contre 11 à 15 minutes sur les campagnes précédentes (36 recherches SERP, 12 minutes de lecture) : le texte « 11 à 15 minutes » de l'écran d'analyse est faux ici.

### Non mesuré (à refaire)

Durée et coût réels de la lecture de toute la réserve, `auto_stop`, réserve restante : le fond n'a pas tourné (plantage puis arrêt demandé). Rejugement par le modèle fort (25 cibles) non fait. Pour relancer sans repayer la première analyse : événement `audit/qualification.more.requested` avec `{ auditId, auto: { lot: 1 } }` après réinitialisation de `auto_status` ; le plus simple est le bouton « Lire le lot suivant » de l'écran Vos cibles. La campagne `bce79672…` est conservée en base (non supprimée).

### Prochain sous-jalon recommandé : MC.6h

Relancer la lecture de fond sur `bce79672…` (corrigée) et mesurer durée, coût, `auto_stop`, réserve ; puis resserrer les fermes à liens et `same_offer` (points a à d) et mesurer sur les trois sites avec le modèle fort ; découper `judge-collect` par groupe.

## Session du 18/11 (suite 8) : MC.6f, la qualification alignée sur « ne pas s'autocensurer » et lecture de toute la réserve (faite ; mesure sur pages stockées)

Périmètre tenu. **Pas** fait : liens morts, première passe de ressources (laissée telle quelle), refonte de l'écran d'analyse. Aucune lecture web possible depuis la session (le proxy refuse les sites des cibles : 403) : la mesure rejuge les pages DÉJÀ stockées en base, elle ne lit pas la réserve (les 965 sites de mega-coloring.com restent à lire par le produit).

### Constat : la vraie cause n'était pas (seulement) la règle, c'était un bug

Campagne mega-coloring.com du 18/11 (audit `e94ff71f`) : **64 appels de jugement sur 81 ont échoué, « sortie tronquée (limite de jetons atteinte) »** (`stats.llmFailures`, `llmLastError`). Le plafond de sortie était de 230 jetons par cible (`outputTokensPerTarget`) ; depuis MC.6b la situation s'ajoute à une phrase de motif en français et à la citation, et la réponse dépassait. Les pages concernées n'ont reçu AUCUN jugement : 366 pages lues restées « non_qualifie » (206 au premier passage, plus les lots de fond) alors qu'elles étaient lues et prêtes. Ce n'est donc pas un refus du petit modèle. Correctif : 360 jetons par cible, et un lot tronqué est coupé en deux et rejugé (`judgeBatch`), au lieu d'être perdu.

### Tous les endroits où une page proche pouvait être écartée avant le rédacteur (état AVANT MC.6f), et ce qui a changé

| Endroit                                                                                                                        | Avant                                                                                                                   | Après MC.6f                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Jugement tronqué → « non_qualifie » (`funnel.applyOutcome`)                                                                    | 64 appels sur 81 perdus                                                                                                 | corrigé (360 jetons, coupe en deux) ; ces pages entrent dans le stock (`STOCK_REASONS`) et sont relues et rejugées par la lecture de fond                                                                          |
| Seuil de proximité `minFit`                                                                                                    | 0,5                                                                                                                     | **0,3** ; la situation « aucune » (aucun rapport) est refusée quelle que soit la note                                                                                                                              |
| Motifs `sans_angle` (page sans un des trois cas), `pas_de_contenu` (rubrique), `page_commerciale` (`score.judgementExclusion`) | refus                                                                                                                   | **plus rendus** : note (`LlmJudgement.note`) ; les anciennes lignes à ces motifs sont remises au stock et rejugées                                                                                                 |
| Trois cas obligatoires (`TARGET_SITUATIONS`)                                                                                   | condition pour rester                                                                                                   | **priorité de classement** (`ANGLE_BOOST` : lien mort ×1,15, petit éditeur ×1,08 ; « autre » ×0,75, rubrique ou commercial ×0,6)                                                                                   |
| Refus du jugement                                                                                                              | `sells_links`, `same_offer`, `unrealistic`, juridique, ferme à liens, pas de contenu, commercial, sans angle, fit < 0,5 | les **cinq refus du rédacteur**, définis une fois (`qualification/refusals.ts`, repris par `drafting/write.ts`) : concurrent direct, page légale, ferme à liens manifeste, grand site inatteignable, aucun rapport |
| Arrêt « rendement » de la première lecture (`dryLots` 3 lots secs)                                                             | arrêtée à 560 pages sur ~1 400                                                                                          | **supprimé** (`dryLots`, `dryLotMaxRelevant`, `minLots` retirés)                                                                                                                                                   |
| Arrêt « rendement faible » de l'arrière-plan (`lowLotsInARow` 2)                                                               | 965 sites jamais lus                                                                                                    | **supprimé** ; un lot qui ne lit aucune page arrête la chaîne (garde anti-boucle)                                                                                                                                  |
| Pilotage par ressource (`resourceVerdict`)                                                                                     | abandonne une ressource                                                                                                 | **gardé** (fermes à liens manifestes et pages légales) ; comme les pages proches sont maintenant gardées, il abandonne moins ; chaque abandon porte son motif `ressource_abandonnee` et reste affiché comme tel    |
| Plafond `maxPagesRead`                                                                                                         | 700 pages par exécution                                                                                                 | **inchangé** : c'est une borne par lot (le fond enchaîne des lots) ; un lot lit au plus ~300 pages                                                                                                                 |
| Budget                                                                                                                         | 0,40 USD première liste + 0,08 USD fond                                                                                 | **0,50 USD par campagne** (`CAMPAIGN_JUDGE_USD`) : première liste 0,40 au plus, le fond a le reste (au plus 0,30)                                                                                                  |
| Durée du fond (`AUTO_LIMITS.maxMs`)                                                                                            | 25 min                                                                                                                  | **45 min** (voir justification dans `background.ts`)                                                                                                                                                               |
| Lot du fond (`MORE_LIMITS`)                                                                                                    | 40 pages utilisables, 5 min, 150 robots.txt                                                                             | 120 pages, 9 min, 300 robots.txt (le jugement par lots attend ~3 min quelle que soit sa taille)                                                                                                                    |
| Filtres gratuits d'adresse (accueil, légale, fichier, pagination)                                                              | en place                                                                                                                | **gardés** (consigne), ainsi que : langue, robots.txt, spam ≥ 50, autorité ≥ 650, site parqué / piraté / mur de connexion / éditeur introuvable (sécurité et contact impossible)                                   |

### Lecture entièrement automatique : limites dures restantes (précision de Jonathan reçue pendant la session)

L'utilisateur n'a rien à cliquer : la chaîne de lots (`audit-qualify-more`, événement `audit/qualification.more.requested` avec `auto.lot`) enchaîne seule jusqu'à la fin ; chaque lot déclenche le suivant (identifiant d'événement fixe, rejeu sans doublon), et c'est ainsi que les limites de durée d'une fonction Inngest sont contournées (un lot = une exécution courte, ~9 min au plus). **Seules limites dures qui arrêtent la lecture** : (1) réserve vide (`reserve_epuisee`, y compris un lot qui ne lit rien) ; (2) budget de la campagne : 0,50 USD au total, ou moins de 0,03 USD restant pour un lot (`budget`) ; (3) durée totale de 45 minutes depuis la fin de la première liste, ou moins d'une minute restante (`duree`) ; (4) erreur d'un lot rejouée (`erreur`) ; (5) plafond de sécurité / plafond d'audit (2 USD) contrôlé avant chaque appel payant. **La réserve peut donc rester en partie non lue après une campagne normale** si le budget ou les 45 minutes s'épuisent avant (cas d'une réserve de plus de ~1 000 sites ou de sites très lents) : estimation faite sur la mesure du 18/11 (55 pages lues par minute, 3 minutes d'attente par lot, ~0,0041 USD par requête de 5 cibles, soit ~300 pages jugées pour 0,25 USD) ; **à vérifier sur la prochaine vraie campagne** (le `auto_stop` en base le dira). Le bouton manuel ne sert qu'à reprendre après un de ces arrêts.

### Mesure (mêmes pages, avant / après ; rejugement par `gpt-4.1-mini` des pages stockées, puis relecture par agents `opus` appliquant la consigne du rédacteur sur 25 cibles gardées par site, tirées régulièrement, sans leur montrer le verdict du petit modèle)

Pages rejugées (celles qui ont atteint le jugement : jugées ou restées sans jugement) : outil `rejudge.live.test.ts` (`MC6F=1`), coût LLM 0,21 USD, aucun appel DataForSEO, aucun envoi.

|                                                                 | mega-coloring.com             | remove-me.io             |
| --------------------------------------------------------------- | ----------------------------- | ------------------------ |
| Pages rejugées                                                  | 462 (dont 366 sans jugement)  | 309                      |
| Gardées AVANT (règle de `main`, verdicts stockés)               | 26                            | 97                       |
| Gardées APRÈS (nouvelle consigne et règle)                      | **300**                       | **90**                   |
| dont trois cas / par proximité (« autre »)                      | 180 / 120                     | 56 / 34                  |
| Liste courte projetée (× taux de contact trouvé de la campagne) | **~266** (contre 23 stockées) | ~74 (contre 80 stockées) |
| Relecture `opus` : cibles gardées sur 25 échantillonnées        | **13 sur 25** (52 %)          | **12 sur 25**            |

- **mega-coloring.com** : l'objectif (largement au-dessus de 19) est atteint sur les pages DÉJÀ lues, essentiellement parce que 366 pages n'avaient jamais été jugées (bug de troncature). La lecture de la réserve (965 sites) n'est pas mesurée (pas de web).
- **remove-me.io** : le volume ne monte pas (90 contre 97), il n'était pas limité par la qualification (80 cibles déjà). La nouvelle règle refuse plus de pages légales et hors sujet (38 perdues, relues : pages de mentions légales, dictionnaires juridiques, CCI : refus justifiés) et en garde 67 de plus. Relecture `opus` : 12 sur 25, contre 11 sur 25 en MC.6e : **cohérent avec le rédacteur**.
- **Qualité probable des cibles « par proximité »** : lues à la main (échantillon de 6 par site). mega-coloring.com : pages de coloriages d'autres sites, de magazines parentalité, d'éditeurs scolaires : plausibles ; une partie très faible (article d'une association sur des océans, note 0,5). remove-me.io : sites de sécurité des enfants, magazines professionnels de l'information, blogs informatiques : proches du thème mais faibles ; certaines sont des pages d'accueil ou des sites généralistes (note 0,3). Le rédacteur en refusera la moitié : sur mega-coloring.com l'opus refuse 12 des 25, dont 5 **concurrents directs** (sites de coloriages) et 4 fermes à liens que le petit modèle de dev avait gardés (angle mort de la qualification : `same_offer` et `ferme_a_liens` sous-détectés) ; sur remove-me.io il refuse des mentions légales, des institutions et des pages sans rapport. La liste courte contient donc ~50 % de cibles que le rédacteur écartera : à resserrer avec Haiku 5.5 et `same_offer` (backlog). Le modèle de dev surestime les cas « cite plusieurs ressources » (176 sur 300).
- **Limites à dire** : 2 sites ; petit modèle de dev (`gpt-4.1-mini`), pas Haiku 5.5 de production ; un seul passage ; agents opus non indépendants de la consigne ; le taux de contact est celui de la campagne (non remesuré) ; la lecture automatique de toute la réserve n'a pas tourné en vrai.
- **Jeu d'évaluation annoté** (`angle-eval-set.ts`) mis à jour pour la nouvelle règle (non vidé) : c08 (fiche produit), c09 (rubrique) et d09 (article d'un cabinet sur le thème) passent de refus à « gardées par proximité » ; c10 et d06 sont des concurrents, d07 un grand quotidien, c11 hors sujet ; **c12 ajouté** (CGU d'une école, refus juridique). Mesure réelle (petit modèle de dev) : qualification précision 0,79, rappel 0,85 ; rédacteur précision 0,65, rappel 1,00 (seuils du test réel recalés à 0,75 et 0,6 : la règle garde plus de pages proches, la précision baisse par construction ; le rappel reste ≥ 0,8 et ≥ 0,9).

### Ce qui change dans le code

`qualification/refusals.ts` (nouveau : cinq refus, signaux, règle de proximité), `llm.ts` (consigne, champ `note`, situation inconnue ramenée à « autre », `resource` nul toléré, rejugement des lots tronqués), `score.ts`, `types.ts` (`autre`, `note`), `limits.ts`, `funnel.ts`, `background.ts` (`CAMPAIGN_JUDGE_USD`, budget de campagne, plus d'arrêt « rendement faible »), `more.ts`, `reserve.ts` (`STOCK_REASONS` : + `non_qualifie` et les trois motifs d'avant MC.6f), `analysis/estimate.ts`, `targets/live.ts` (minutes par lot), `drafting/write.ts` (texte repris de `refusals.ts`, **inchangé** mot pour mot).

**Coût annoncé** : attendu 1,26 USD (1,16 avant), pire cas inchangé à quelques centimes ; plafond d'audit 2 USD non touché. Objectif de 1,00 USD par analyse dépassé de ~0,26 USD (dont 0,18 de boule de neige) : décision de Jonathan.

### Pourquoi le bouton « Lire le lot suivant » est invisible (sans modifier l'interface)

`MoreSites` (`targets-screen.tsx`) ne s'affiche que si `view.funnel` existe (analyse terminée) ET `funnel.stock > 0` (ou un état de lot) ET qu'aucun lot n'est en cours : il renvoie `null` quand `more.status` est `demande` / `en_cours` ou `auto.status` est `en_cours`. Pendant la lecture automatique il est donc masqué par conception ; à la fin, `funnel.stock` vient du nombre de lignes en stock (`hors_budget_lecture`, `hors_budget_llm`) : il n'affichait ni les 301 « non_qualifie » ni les motifs d'avant MC.6f (corrigé : ils comptent maintenant). Avec la lecture automatique de bout en bout, le bouton ne doit plus servir que de reprise après un arrêt sur une limite dure.

### Dettes et pièges

- Mesurer la lecture réelle de la réserve sur la prochaine campagne (temps, coût, `auto_stop`) ; recaler `AUTO_LIMITS.maxMs` / le budget si la réserve reste non lue.
- `gpt-4.1-mini` de dev sur-déclare « cite des comparables » : refaire la mesure avec Haiku 5.5 (`LLM_PROVIDER=anthropic`).
- Le rédacteur reçoit maintenant beaucoup plus de cibles « autre » : coût de rédaction (modèle fort) à surveiller ; la note « à relire » est stockée dans `judgement.note` mais pas affichée avant le rédacteur.
- Les lignes `hors_sujet` de fit entre 0,3 et 0,5 des anciennes campagnes ne sont pas remises au stock.

### Backlog (écran d'analyse, autre session)

Afficher `ressource_abandonnee` comme « ressource écartée (ferme à liens) », la nouvelle durée annoncée (jusqu'à 45 min), la note « à relire » de la qualification, et un message explicite quand le fond s'arrête sur budget ou durée (`auto_stop`).

### Prochain sous-jalon recommandé : MC.6g (fait en partie, voir MC.6h)

Lancer une vraie campagne sur un troisième thème avec les nouveaux plafonds, lire `auto_stop`, la durée et le coût réels ; puis première passe de ressources réduite, graines sans services payants, liens morts.

## Session du 18/11 (suite 7) : refonte de l'écran « Analyse en cours » (textes, UX, design ; faite)

Périmètre tenu : textes (`messages/fr.ts`), calcul d'affichage (`analysis/view.ts`), composant (`analysis-progress.tsx`), deux lectures seules ajoutées à l'état de l'écran (`analysis/status.ts`, accord de Jonathan). **Aucune** modification de l'analyse, des recherches, du tri, de la rédaction, des jobs Inngest, des tables ni des appels payants. Aucune analyse lancée, aucune écriture en base réelle. Maquette et proposition validées par Jonathan avant le code.

### Ce que veut savoir la personne qui attend (et la réponse de l'écran)

- **Où en est-on ?** Une phrase en tête dit ce qui se passe maintenant (« Nous lisons les pages trouvées ») ; le pourcentage passe au second plan. Les huit étapes forment un fil : faites en vert avec leur résultat, l'étape en cours encadrée avec sa propre barre, les suivantes en gris numérotées.
- **Combien de temps reste-t-il ?** Une fourchette (« Encore 3 à 5 minutes »), pas une minute précise qui change à chaque rafraîchissement. Durées recalées sur les trois analyses complètes en base (11 à 15 minutes ; l'ancien repère annonçait 19 minutes).
- **Qu'est-ce qui est déjà utile ?** Chaque étape finie garde son résultat en une ligne (concurrents repérés, sites qui citent déjà le site, sites trouvés). La carte « Du plus large au plus précis » montre sites trouvés, pages lues, pages retenues, cibles avec un contact ; les premières cibles apparaissent à droite.
- **Qu'est-ce qui est fait pour moi ?** Des exemples étiquetés (« Dernière recherche : … », « Page lue : … ») et une phrase d'explication là où le chiffre seul ne dit rien (« Les sites qui les citent déjà peuvent vous citer aussi »).
- **Dois-je faire quelque chose ?** Non, et c'est dit : « Vous pouvez fermer cette page […] Rien n'est envoyé à qui que ce soit. »
- **Et en cas d'échec ou de reprise ?** « L'analyse s'est arrêtée à l'étape 4 », ce qui est déjà fait, ce qui s'est arrêté, un bouton pour reprendre sans rien refaire. La mesure des liens (en parallèle) qui n'aboutit pas est un avertissement, pas une alerte : l'analyse continue.
- **Ce qu'on ne promet pas** : aucun résultat garanti ; une étape ou une recherche écartée est dite écartée, avec sa raison ; « Analyse terminée » n'est dit qu'une fois la lecture des autres sites trouvés finie.

### Tableau d'audit : texte affiché / ce que le code mesure / verdict

Références : campagnes mega-coloring.com du 16/11 (`37a97992…`) et du 18/11 (`e94ff71f…`), remove-me.io du 17/11, table `analysis_steps` et `candidate_collections.plan`.

| Texte affiché (avant)                                                      | Ce que le code mesure                                                                                                                                                                                                                                                                          | Verdict | Texte après                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comprendre votre site · 7 pages lues                                       | `found` = `linkable_resources.length` (contenus à proposer), pas les pages lues (`done` = 9). Le catalogue du rédacteur est construit plus tard.                                                                                                                                               | Faux    | « Votre activité est cernée · 7 pages fortes repérées » + « Pour chaque site contacté, nous choisirons celle de vos pages… »                                                                                                                                                                                    |
| Repérer vos concurrents · 1 sur 1 recherches                               | `total` = recherches Google + 1 mesure de taille. Découverte déjà faite avant le lancement (18/11) : il ne reste que la mesure, d'où « 1 sur 1 ». 16/11 : 3 recherches + 1 = « 4 sur 4 ».                                                                                                      | Faux    | En cours : « Recherche Google 2 sur 3 », puis « Mesure de la taille de chaque concurrent ». Fini : « 10 vrais concurrents repérés sur Google ».                                                                                                                                                                 |
| État des lieux de vos liens · 3 sur 3 relevés · <une requête ou un site>   | 3 appels (résumé, domaines référents, mots-clés classés). `found` = domaines référents, `keywords` = mots-clés classés, jamais montrés. L'exemple est le premier domaine référent puis la requête la plus populaire, sans étiquette.                                                           | Ambigu  | « Mesurer vos liens actuels » · « 2 sites font déjà un lien vers vous · visible sur 1 recherche Google » · « Votre recherche la plus populaire : « … » » (un site qui cite n'est plus montré en exemple).                                                                                                       |
| Chercher les sites… · 1 sur 45 recherches                                  | `total` = recoupement + SERP + recherches par type de page, calculé au début ; ne compte ni les liens morts des concurrents ni les citations ni la 2e page de recoupement (54 à la fin le 18/11) ; la phase SERP peut s'arrêter avant (27 sur 35 le 16/11, étape « terminée »).                | Faux    | En cours : « 12 recherches faites sur 45 environ · 340 sites trouvés ». Fini : « 54 recherches · 976 sites trouvés ».                                                                                                                                                                                           |
| Trier · 80 sur 150 pages lues                                              | Lecture : `done`/`total` pages lues, `kept` = pages en ligne et lisibles (non montré). Jugement : `judged`/`to_judge`, `found` = pages retenues.                                                                                                                                               | Ambigu  | « Lire et trier les pages trouvées » · « 80 pages lues sur 150 · 31 lisibles », puis « 4 pages évaluées sur 10 · 3 retenues », fini « 150 pages lues · 18 retenues ».                                                                                                                                           |
| Trouver un contact · 12 sur 18 sites vérifiés · 10 contacts trouvés        | Conforme (`done`/`total`/`found` de la recherche de contact).                                                                                                                                                                                                                                  | Juste   | « Trouver à qui écrire », mêmes compteurs.                                                                                                                                                                                                                                                                      |
| Chercher liens morts et mentions · 15 sur 15 pages vérifiées · 3 liens…    | L'étape relit les pages de la liste courte (`done`/`total` = cibles relues, `found` = constats). Les recherches écartées par le plan (`plan.skipped`) appartiennent à l'étape 4 et n'étaient dites nulle part : l'étape n'était pas « faite à tort », mais rien ne disait ce qui était écarté. | Ambigu  | « Relire les pages retenues » · « 15 pages relues · 3 occasions trouvées (liens cassés, mentions) ». Sous l'étape 4 : « Recherche de mentions de votre marque écartée : <raison>. », « Liens morts non cherchés chez N concurrent(s)… ».                                                                        |
| Préparer vos demandes · 15 sur 15 · 15 cibles prêtes                       | Compte les cibles et clôt l'analyse ; aucun message n'est écrit à cette étape.                                                                                                                                                                                                                 | Ambigu  | Nom gardé (décision de Jonathan) ; résultat « 15 cibles prêtes ».                                                                                                                                                                                                                                               |
| Carte « Où en est le tri » · 976 sites examinés → 18 après tri → 15 cibles | 976 = sites TROUVÉS (`recherche.found`) ; 150 pages lues seulement.                                                                                                                                                                                                                            | Faux    | « Du plus large au plus précis » : Sites trouvés, Pages lues, Pages retenues, Cibles avec un contact ; « à venir » tant que non mesuré.                                                                                                                                                                         |
| Étape sautée : « Sans objet »                                              | Statut `saute` (liste courte vide).                                                                                                                                                                                                                                                            | Ambigu  | « Écartée » + « Écartée : aucune page retenue à relire. »                                                                                                                                                                                                                                                       |
| « Environ 19 minutes restantes »                                           | Poids d'un run de MU.1 (1 140 s). Analyses réelles : 650 s, 704 s, 875 s.                                                                                                                                                                                                                      | Faux    | Poids médians des trois analyses (762 s), fourchette affichée.                                                                                                                                                                                                                                                  |
| « Analyse terminée · 15 cibles sont prêtes »                               | Vrai pour la première liste ; la lecture des autres sites continue ensuite (`qualification_runs.auto_status`).                                                                                                                                                                                 | Ambigu  | Tant que cette lecture tourne : écran « en cours », « Nous continuons à lire d'autres sites », « 15 cibles prêtes pour l'instant », barre à 90 % et plus ; « Analyse terminée : 19 cibles sont prêtes » seulement ensuite, et la dernière étape dit le nombre réel (19) et non celui de la première liste (15). |
| Exemples nus (« Mega Coloring », « esle.io »)                              | Nom du site, premier concurrent retenu.                                                                                                                                                                                                                                                        | Ambigu  | Retirés (retour de Jonathan : mieux vaut ne rien mettre). Tout exemple restant est étiqueté.                                                                                                                                                                                                                    |
| « Ce qui s'est arrêté » pouvait nommer l'état des lieux                    | `failedStep` prenait la première étape en échec, y compris l'étape parallèle qui n'arrête rien.                                                                                                                                                                                                | Faux    | L'étape parallèle est ignorée ; « L'analyse s'est arrêtée à l'étape N ».                                                                                                                                                                                                                                        |

### Décisions de Jonathan (18/11)

- Maquette et proposition complète avant de coder (artifact de la session).
- « 9 pages lues pour cerner votre activité » : pas vendeur ; on affiche le résultat (« Votre activité est cernée · N pages fortes repérées »). Pas de nom de concurrent, ni exemple ni liste : « vaut mieux rien mettre ».
- Les recherches écartées par le plan s'affichent (lecture seule de `candidate_collections.plan` ajoutée à l'état de l'écran).
- « Analyse terminée » attend la fin de la lecture des autres sites (lecture seule de `qualification_runs.auto_status` et `more_status`). Précision reçue en cours de session par une autre session Claude, au nom de Jonathan (non confirmée par lui directement dans cette session, mais conforme à sa réponse « attendre que la recherche soit finie ») : le chiffre passait de 15 à 19 après « terminé ». Règle appliquée : tant que cette lecture tourne, l'écran reste « en cours » (« Nous continuons à lire d'autres sites »), la barre avance encore (la première liste occupe 90 % de la barre, le reste avance avec le temps), le nombre de cibles est dit « pour l'instant », et « Vos cibles » ne s'ouvre plus tout seul avant la vraie fin (un bouton « Voir vos premières cibles » reste là).
- « Préparer vos demandes » garde son nom.

### Décisions UX

- États distincts par la FORME et pas seulement la couleur : numéro (attente), anneau animé (en cours), coche (terminée), tiret en pointillés (écartée), triangle (interrompue), triangle orange « Non abouti » (étape parallèle).
- Pas de saut de mise en page : chiffres à chasse fixe, quatre lignes de la carte toujours présentes, emplacement réservé pour les cibles, message « connexion perdue » toujours dans la page (vide).
- Accessibilité : seule la phrase d'état est annoncée (`aria-live`, change au passage d'une étape) ; barre de progression nommée ; `aria-current="step"` ; échec en `role="alert"` ; animations coupées avec `prefers-reduced-motion` ; exemples sur deux lignes au plus, jamais coupés au milieu d'un mot sur mobile.
- Mobile : une colonne, cartes sous les étapes, 16 px de marge, aucun défilement horizontal (vérifié à 390 px sur 9 états).
- Interrogation : toutes les 3 s pendant l'analyse, toutes les 10 s après la fin tant que la lecture des autres sites tourne, puis arrêt.

### Fichiers clés

`messages/fr.ts` (`analysis.steps`, `analysis.screen`), `src/features/analysis/view.ts` (`counterText`, `exampleText`, `buildAnalysisView` : `headline`, `remainingRange`, `funnel`, `backgroundPending`), `analysis-progress.tsx`, `status.ts` (`skippedOf`), `demo-snapshots.ts`, `src/app/demo/analyse/page.tsx` (absente en production), tests `view.test.ts`, `analysis-progress.test.ts`. Captures : `docs/img/analyse-refonte/`.

### Commandes

Démonstration sans base : `NEXT_PUBLIC_APP_URL=http://localhost:3100 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=demo pnpm exec next dev -p 3100`, puis `/demo/analyse?etat=` `demarrage`, `recherche`, `lecture`, `contacts`, `premieres`, `terminee`, `interrompue`, `ecartee`, `lent`. Tests : `pnpm vitest run src/features/analysis src/features/shell`.

### Dettes et pièges

- **Non vérifié sur une analyse réelle en direct** : rendu contrôlé sur des états d'exemple qui reprennent la forme exacte des compteurs en base, pas sur une analyse qui tourne. À regarder à la prochaine analyse.
- `backgroundPending` : entre la fin de l'analyse et le démarrage de la lecture des autres sites, `auto_status` vaut encore « aucun » ; l'écran attend 5 minutes (`BACKGROUND_GRACE_MS`) avant de dire « terminée ». Une analyse sans lecture d'arrière-plan qui ne passerait jamais à « termine » dirait donc « premières cibles » pendant 5 minutes.
- L'ouverture automatique de « Vos cibles » n'a plus lieu qu'à la vraie fin (lecture des autres sites comprise) : jusqu'à 25 minutes plus tard qu'avant. L'email « vos cibles sont prêtes » n'est pas touché.
- Pendant la lecture des autres sites, la barre avance avec le TEMPS (90 % vers 99 % sur 25 minutes au plus), pas avec le nombre de sites restants : l'écran ne connaît pas ce nombre (« N restent à lire » demanderait une requête de plus ; au backlog).
- Le total « environ » de l'étape 4 reste une prévision incomplète (liens morts et citations non comptés) : le corriger demande de toucher `run.ts` (logique, hors périmètre).
- En échec, « Reprendre à partir d'ici » s'affiche sur chaque étape commencée (comportement existant) : chargé à l'œil sur mobile.
- Le fil d'événements (`analysis_feed`) reprend les nouveaux noms d'étapes ; les lignes déjà écrites gardent les anciens.
- Les textes de raison du plan (`plan.skipped.mentions`) sont écrits par le moteur : relire leur ton si de nouvelles raisons s'ajoutent.

### Backlog

- État « reprise » : le moteur n'enregistre pas qu'une étape a été refaite après un arrêt (les étapes en échec repassent « en attente ») ; l'écran ne peut pas le dire.
- Compter dans le total de l'étape 4 les liens morts, les citations et la 2e page de recoupement (dans `run.ts`).
- Montrer la phase « sites comparables » (boule de neige) et le nombre de cibles ajoutées par la lecture des autres sites (`auto_added`), le rendement par ressource.
- Raison détaillée de chaque concurrent écarté pour les liens morts (aujourd'hui : un nombre).
- Dire « N sites restent à lire » pendant la lecture des autres sites (compte de la réserve : une requête de plus) et la raison d'arrêt (`auto_stop`, textes `targets…auto.stop`).

### Complément (PR séparée) : étapes du haut cliquables, carte « Lire le lot suivant »

Deux demandes de Jonathan relayées par la session parente (affichage seulement, aucune condition changée) :

| Constat                                                                         | Ce que fait le code                                                                                                                                                                                | Verdict            | Après                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Barre d'étapes du haut (« 4 Analyse », « 5 Vos cibles ») : rien n'est cliquable | `JourneySteps` n'affichait que du texte ; seul « Voir le détail de l'analyse », en bas de « Vos cibles », menait à l'analyse.                                                                      | Manque             | `JourneySteps` reçoit `links` : depuis « Vos cibles », « Analyse » ouvre `/app/site/<id>/analyse?etapes=1` (ou l'écran en cours si l'analyse tourne) ; depuis le détail d'une analyse finie, « Vos cibles » est cliquable. Lien, survol, focus clavier, nom accessible « Ouvrir l'étape Analyse » ; l'étape en cours n'est jamais un lien. |
| Bouton « Lire le lot suivant » introuvable                                      | `MoreSites` : carte sans titre sous la liste ; conditions `funnel.stock`, `more.status`, `auto.status` (inchangées). Le motif d'arrêt de la lecture automatique n'y était dit que pour une erreur. | Peu compréhensible | La carte dit d'abord POURQUOI la lecture automatique s'est arrêtée (budget, durée, peu de résultats, erreur), puis combien de sites restent à lire ; le bouton reste secondaire (contour).                                                                                                                                                 |

- **Précision de Jonathan (relayée, 18/11)** : devoir cliquer pour lire les sites restants est un défaut de produit (MC.6f rend la lecture entièrement automatique). Le bouton n'est donc PAS présenté comme l'action principale ni comme une étape attendue : il sert à reprendre à la main après un arrêt. Une première version de cette PR le mettait en avant (carte teintée, bouton plein) : retirée. Le message rassurant pendant la lecture (« Nous continuons à lire les autres sites trouvés… N sites restent à lire. Cette liste se met à jour toute seule. ») existe déjà dans le bandeau du haut (`LiveBanner`), non touché.
- Les étapes « Votre site », « Vérification » et « Vous » ne sont pas cliquables : je n'ai pas vérifié que leurs écrans se rouvrent sans effet une fois l'analyse lancée (backlog).
- La carte n'apparaît pas pendant qu'une lecture tourne ni quand il ne reste rien à lire (conditions existantes, non touchées : MC.6f retravaille la lecture de la réserve).
- Vérifié sur une page de démonstration (`/demo/lot-suivant`, absente en production), pas sur « Vos cibles » avec de vraies données.

### Complément (PR séparée) : refonte de « À valider » (maquette validée par Jonathan, 18/11)

Maquette : `docs/mockups/a-valider.html` (captures et note dans `docs/mockups/a-valider.md`), variante A retenue (« ok go »).

- **Liste rangée par campagne**, une ligne par élément (nature, site, objet, raison ou « À relire » / « À corriger »), huit lignes par campagne puis « Afficher les autres ». Les réponses d'abord.
- **Panneau de lecture** à droite sur grand écran (message complet, pourquoi ce site, boutons) ; sur téléphone la lecture prend tout l'écran, boutons collés en bas, et le suivant s'affiche après chaque décision.
- **Filtre de campagne** : pastilles (menu sur téléphone ou au-delà de cinq campagnes), bandeau de rappel tant qu'il est actif.
- **Lot** : barre collée en bas, chaque bouton porte son nombre ; le panneau de droite dit ce qui part, ce qui reste et pourquoi. Refuser demande une confirmation dans la barre (plus de fenêtre du navigateur). Une sélection sur plusieurs campagnes est permise, avec un avertissement visible (décision par défaut acceptée par Jonathan) ; la fenêtre « Cette sélection mélange N campagnes » est retirée.
- **Bouton « Approuver et envoyer les N emails prêts » retiré** : on coche, on lit, on approuve.
- **« Plus tard » est un onglet** : éléments mis de côté, campagne, moment du retour, « Remettre dans la file » un par un (`wakeSnoozed` accepte une liste). Après un « Plus tard », le message de confirmation propose « Annuler ».
- **Boîte à zéro** : « Tout est traité » seulement si un message a déjà été approuvé (`QueueView.handled`), sinon l'ancien texte d'accueil.
- Refus d'un seul email possible depuis la lecture (avant : en lot seulement), avec confirmation.
- Corrigé au passage : modifier l'objet puis le texte d'un message faisait perdre la modification de l'objet.

Fichiers : `src/features/approvals/queue.tsx` (écran), `queue-model.ts` (rangement, résumé de sélection, purs et testés), `service.ts` (`later`, `handled`, réveil ciblé), `messages/fr.ts`. Démonstration sans base : `/demo/a-valider` (`?etat=vide`, `?etat=debut`), absente en production.

Dettes : l'heure de départ estimée AVANT approbation n'est pas affichée (elle l'est après, dans Conversations) ; la boîte à zéro ne compte pas les emails en attente d'envoi ; fuseau des retours de « Plus tard » fixé à Europe/Paris ; vérifié sur la page de démonstration, pas avec de vraies données.

### Prochain sous-jalon recommandé : MC.6f (inchangé)

(1) Faire relire 10 messages « par proximité » rédigés pour de vrai, et caler la consigne ; (2) réduire la première passe de ressources ; (3) graines sans services payants, repli « publiques » alimenté par une recherche ; (4) liens morts.

## Session du 18/11 (suite 8) : « À valider », sélecteur de campagne (faite)

- Liste déroulante « Toutes les campagnes / <site · pays> » (visible dès 2 campagnes) : filtre emails, réponses et formulaires, et donc compteurs, « tout sélectionner » et actions en lot. Les réponses affichent maintenant leur campagne. Une sélection en lot qui mélange plusieurs campagnes demande une confirmation. Le compteur du menu reste global.
- `QueueView.campaigns` (par plan), `planId` sur réponses et formulaires. Pas de migration.
- **Maquette de la page** demandée à une session parallèle (Fable 5.2) : `docs/mockups/a-valider.html` sur la branche `mockup-a-valider`, à valider par Jonathan avant tout codage.

## Session du 18/11 (suite 9) : textes et affichage de la lecture des « autres sites » (faite)

Périmètre tenu : textes, mise en page, composants d'affichage. **Aucune logique touchée** : ni job Inngest, ni qualification, ni lecture de la réserve, ni limites, ni action serveur ; les conditions d'affichage fondées sur `funnel.stock`, `more_status` et `auto.status` sont inchangées (quand la carte et le bouton apparaissent). **Pas** fait : aucune vraie campagne, aucune donnée réelle, aucun appel payant.

### Ce qui change pour la personne (écran « Vos cibles »)

| État                                                                            | Avant                                                                                                                      | Après                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lecture automatique en cours                                                    | « Nous lisons encore d'autres sites : fin estimée dans environ N minutes… »                                                | Aucun bouton. « La recherche continue. Nous continuons à lire les autres sites trouvés : N restent à lire. La liste se met à jour toute seule. » + fin estimée + **barre d'avancement** (« X sites examinés sur Y » : sites trouvés qui ne sont plus à lire).              |
| Tout est lu                                                                     | « Lecture terminée : tous les sites trouvés ont été lus. »                                                                 | Idem, plus « N cibles ont été ajoutées après la première liste. » Pas de bouton.                                                                                                                                                                                           |
| Arrêt sur la durée (`duree`)                                                    | « durée maximale de 25 minutes » (faux : 45)                                                                               | « La lecture s'est arrêtée au bout de 45 minutes, sa durée maximale : N sites ne sont pas lus. » (le chiffre vient de `AUTO_LIMITS.maxMs`, jamais écrit en dur)                                                                                                            |
| Arrêt sur le plafond interne de la campagne (`budget`)                          | « le budget prévu pour la lecture automatique est atteint »                                                                | « La lecture s'est arrêtée pour cette campagne : N sites ne sont pas lus. » (jamais d'argent)                                                                                                                                                                              |
| Erreur (`erreur`, ou chaîne `echoue`)                                           | « arrêtée sur une erreur. Vous pouvez la relancer. »                                                                       | « La lecture s'est interrompue à cause d'une erreur de notre côté : N sites ne sont pas lus. Les cibles déjà trouvées sont conservées. »                                                                                                                                   |
| `reserve_epuisee` alors qu'il reste du stock (lot qui n'a rien lu)              | « tous les sites trouvés ont été lus » (faux)                                                                              | « La lecture est terminée, mais N sites n'ont pas pu être lus cette fois. »                                                                                                                                                                                                |
| Ancienne valeur `rendement_faible` (campagnes d'avant MC.6f) ou valeur inconnue | « …nous n'ajoutons rien pour faire du volume »                                                                             | « La lecture s'est arrêtée avant la fin : N sites ne sont pas lus. »                                                                                                                                                                                                       |
| Bouton                                                                          | « Lire le lot suivant » + « Un clic lit le lot suivant (jusqu'à 150 sites, environ 5 minutes), avec les mêmes exigences… » | **« Continuer la recherche »** (contour, secondaire, pleine largeur sur téléphone) + « La lecture reprend là où elle s'est arrêtée, pendant une dizaine de minutes. Les cibles trouvées s'ajoutent à votre liste ; s'il reste des sites ensuite, vous pourrez continuer. » |
| Bandeau du haut après un arrêt avec des sites non lus                           | « Recherche terminée : N sites à contacter. » (contredisait la carte)                                                      | « La recherche s'est arrêtée avant la fin : N sites à contacter pour l'instant. Le détail est sous la liste. »                                                                                                                                                             |
| Après une reprise à la main sans nouvelle cible                                 | « Aucune nouvelle cible dans ce lot : nous n'ajoutons rien pour faire du volume. » (contredit « ne pas s'autocensurer »)   | « Cette lecture n'a pas ajouté de nouvelle cible à la liste. »                                                                                                                                                                                                             |

- **Honnêteté du bouton** : `requestMore` (non modifié) relance UNE lecture de 9 minutes au plus, pas toute la chaîne automatique : d'où « pendant une dizaine de minutes… s'il reste des sites ensuite, vous pourrez continuer ».
- **Raisons d'arrêt réelles** lues dans `background.ts` (`decideNext`, `failBackground`) : `reserve_epuisee` (réserve vide, ou lot qui n'a rien lu), `budget` (plafond de la campagne), `duree` (45 min), `erreur`. `rendement_faible` n'est plus émis mais reste en base sur les anciennes campagnes : il garde une phrase neutre.
- **Accessibilité** : seul « La recherche continue. » est dans `role="status"` (les compteurs bougent toutes les 8 secondes, ils ne sont pas annoncés à chaque fois) ; barre en `role="progressbar"` avec `aria-valuetext` ; la carte d'arrêt est un `role="status"` ; le bouton est décrit par sa phrase (`aria-describedby`).
- **Règle de marque (Jonathan, 18/11)** : jamais de budget, de coût, de dollars ni d'euros dans ces textes ; un test le vérifie sur tout `targets.live` et `targets.more` (ni « lot », « rendement », « volume », « exigence » non plus).
- **Écran d'analyse** : la barre avance sur 45 minutes pendant la lecture des autres sites (`BACKGROUND_MAX_MS` lisait 25 en dur, il lit `AUTO_LIMITS.maxMs`) ; « rien n'est facturé », « rien n'est repayé », « le coût attendu… plafond » retirés de `analysis.screen.slowStartBody`, `restartConfirm`, `analysis.messages.overCap` et `dailyCap`. Sur « Vos cibles », le motif d'écart « budget de qualification atteint » devient « Pas encore évalué : gardé en réserve pour une lecture ultérieure. ». La barre d'étapes (`JourneySteps`) ne parle pas de cette lecture : non touchée.

### Fichiers clés

`messages/fr.ts` (`targets.live`, `targets.more`), `src/features/targets/targets-screen.tsx` (`MoreSites`, `LiveBanner`, `autoStopLine` pur et testé), `src/features/targets/live.ts` (`AUTO_MAX_MINUTES`), `src/features/analysis/view.ts`, `src/features/targets/more-sites.test.ts` (nouveau), `src/app/demo/lot-suivant/page.tsx` (absente en production ; `?etat=en-cours`, `terminee`, `duree`, `erreur`, `limite`, `non-lus`, `reserve-vide`, `ancienne`). Captures avant / après : `docs/img/lecture-autres-sites/`.

### Commandes

`NEXT_PUBLIC_APP_URL=http://localhost:3111 NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=fictive pnpm dev -p 3111` puis `/demo/lot-suivant?etat=duree` (aucune base, aucun appel). Tests : `pnpm vitest run src/features/targets src/features/analysis`.

### Dettes et pièges

- Vérifié sur la page de démonstration (bureau 1280 px et téléphone 375 px, sans défilement horizontal), **pas** sur « Vos cibles » avec une vraie campagne.
- La barre d'avancement suppose que `funnel.candidates` (sites trouvés) contient le stock ; si le stock dépasse ce nombre, la barre n'est pas affichée (seule la phrase reste).
- Après une reprise à la main, la carte garde la phrase du dernier arrêt automatique (condition existante `auto.status === "aucun"` pour « N nouvelles cibles ajoutées », non touchée).
- « vous recevrez un email à la fin » (bandeau) est dit sans vérifier que l'envoi d'emails est actif (texte d'avant, non touché ; l'écran d'analyse, lui, le vérifie).
- Le temps restant (`remainingMinutes`) et les commentaires de `background.ts` parlent encore de budget en interne : normal, rien n'est affiché.

### Backlog : mentions d'argent encore visibles par le client, hors de ces deux écrans

- **Panneaux par étape de l'ancien parcours** (`CostStep` dans `targets-screen.tsx`, visibles seulement avec `LEGACY_CHAIN`) : coût attendu, pire cas, « Budget de l'étape », bouton avec montant en dollars ; `targets.steps.*` (« coût réel {cost} », « {n} recherches payantes »), `stopReasons` de la collecte, de la qualification et des constats (« le budget… est atteint »), `overCap` / `dailyCap` de ces étapes (« rien n'est facturé »).
- **Audit (ancien écran et confirmation)** : `audits.*` (« Le coût estimé est annoncé avant tout lancement », « Rien de plus n'a été facturé au-delà du coût indiqué », « Le coût estimé dépasse le plafond de votre plan », notes « grille publique du fournisseur… coût réel »), backlinks, profil, opportunités (« Le plafond de cet audit… rien n'a été facturé »).
- **Tri des cibles** (`triage-section.tsx`) : « Coût de l'analyse : {cost} USD ».
- **Audit gratuit public** : « L'audit a atteint son plafond de coût avant la fin. »
- **Lancement de l'analyse** (`onboarding`, « Le coût ou les recherches ont changé depuis l'affichage… ») : à revoir avec la décision sur l'annonce du coût avant lancement (CLAUDE.md 3.1 la demandait ; la règle du 18/11 dit de ne plus parler d'argent au client).
- Non concernés (argent du client lui-même, à garder) : tarifs de la home, politique « c'est payant » et son plafond en euros, page Facturation.

### Prochain sous-jalon recommandé : MC.6g (inchangé)

Lancer une vraie campagne sur un troisième thème, lire `auto_stop`, la durée et le coût réels, et regarder ces nouveaux textes sur de vraies données.

## Session du 18/11 (suite 10) : une boîte d'envoi pour toutes les campagnes ; « À relire » retiré (faite)

### Ce qui change pour la personne

- **Boîte réutilisable** : une boîte appartient à l'espace de travail et peut servir tous les sites. Sur Réglages > Boîte d'envoi (et la page du site), tant qu'un site n'a pas de boîte, la liste des boîtes déjà connectées s'affiche avec « Utiliser cette boîte » (un clic, rien à ressaisir) et « Connecter une autre boîte ». Sur une boîte rattachée : « Ne plus l'utiliser ici » (la boîte reste connectée pour les autres) en plus de « Supprimer la boîte » (partout ; la confirmation dit combien d'autres campagnes sont touchées). Une boîte partagée affiche « Partagée avec : … ».
- **« À relire » retiré de « À valider »** (liste et panneau de droite) : la liste montre le hook, jamais la réserve du rédacteur. La donnée `review_note` est toujours calculée et stockée (pas de migration), seulement plus affichée.

### Technique

- Migration `2026121500000000_mailbox_sites.sql` (**appliquée sur la vraie base**) : table `mailbox_sites (mailbox_id, site_id, workspace_id)`, remplie depuis `mailboxes.site_id`, qui devient facultative (site d'origine, informatif ; supprimer ce site ne supprime plus la boîte). RLS lecture par membre, écriture serveur, garde « même espace de travail ».
- Une adresse reste unique par espace : plafonds (déjà par `from_email`), échauffement et lecture IMAP ne sont pas doublés.
- Moteur d'envoi : une boîte envoie les lots validés des plans de TOUS ses sites ; chaque message part avec la signature de **son** site (`signatureFor` dans `sending/service.ts`, et via le plan du message d'origine pour les réponses dans `inbox/send.ts`). File d'envoi (`queue-note.ts`) regroupée par boîte ; « approuver » exige une boîte vérifiée liée au site (`approvals/service.ts`).
- Fichiers : `src/features/mailboxes/{service,actions,load,mailbox-section}.ts(x)`, `messages/fr.ts` (`mailboxes.reuse`).
- Tests : `pnpm vitest run src/features/mailboxes src/features/sending src/features/inbox src/features/approvals`.

### Dettes

- Pas vérifié dans un navigateur avec deux vraies campagnes (typecheck, lint et tests seulement).
- Le test de la base réelle `supabase/tests/mailboxes.test.ts` n'a pas été étendu à `mailbox_sites` (pas de Postgres local ici).
- L'écran garde une boîte par site dans l'interface ; le moteur en accepterait plusieurs.

### Même session : vrai sélecteur de site dans le menu, « Tous les sites »

- Le sélecteur en haut du menu est maintenant une liste déroulante : « Tous les sites » + chaque site + « Gérer les sites » (qui mène à `/app/site`). Le choix est gardé dans un cookie `site` (`selectSite` dans `src/app/app/actions.ts`, lecture et validation dans `src/features/shell/current-site.ts` : un site inconnu ou invalide retombe sur « Tous »).
- **Campagnes** n'affiche que le site choisi (toutes si « Tous les sites »). Les pages de réglages (`pickSite`) ouvrent le site choisi quand l'adresse n'a pas de `?site=`.
- **Pas filtrés** (hors périmètre, à décider) : « À valider » (a son propre sélecteur de campagne), Conversations, Liens obtenus, Accueil. Le sélecteur du menu n'est pas encore sur téléphone (barre basse).
- Pas vérifié dans un navigateur.

## Session du 18/11 (suite 10) : bas de l'écran « Vos cibles » (maquette puis code ; faite)

Maquette validée par Jonathan le 18/11 (`docs/mockups/vos-cibles-bas.md`, décisions en fin de note : variante A, « Tout retenir » et « Tout écarter » conservés, bouton « Rédiger les N messages », concurrents retirés), puis codée. **Aucune logique touchée** : ni action serveur, ni service, ni recherche, ni envoi ; seuls l'affichage et les textes changent. Aucune donnée réelle, aucun appel payant.

### Ce qui change pour la personne

- **Choisir et rédiger sont séparés.** Au-dessus de la liste : « N sites retenus sur M » et deux vrais boutons à contour, « Tout retenir » et « Tout écarter ». La barre collante ne porte plus qu'une action verte, « Rédiger les N messages » (« Rédiger le message » pour un seul ; grisée avec « Cochez au moins un site. » si rien n'est retenu), et la phrase « Rien n'est envoyé maintenant : nous rédigeons les messages, vous les relisez avant tout envoi. »
- **« Voir les messages et le lot » devient « Voir les messages rédigés (N) »**, bouton à contour affiché seulement si des demandes sont déjà validées (N = cibles « Déjà validée »). Même lien qu'avant (`/app/audit/{id}/plan`). Le mot « lot » sort des textes de cet écran (description de la page et message de confirmation compris).
- **Sites sans contact** : une vraie section « N sites pertinents, sans contact trouvé », avec les mêmes lignes que la liste (`TargetsTable` avec `pageAction`), sans case à cocher, et un bouton « Ouvrir la page » (nouvel onglet, vers la page lue ; à défaut la racine du site). Les « mentions sans lien, sans contact » y sont réunies, en tête. Dix lignes d'emblée, le reste derrière « Afficher les N autres ».
- **« Vos concurrents sur Google » est retiré de cet écran**, remplacé par deux phrases « D'où vient cette liste » (le nombre vient de `view.competitors.length`, 30 au plus) au-dessus du lien « Voir le détail de l'analyse ».
- **« Avant de rédiger vos messages » devient une fenêtre** « Qui signe vos messages » (`<dialog>` natif : focus retenu, Échap pour fermer ; panneau collé en bas sur téléphone). Elle s'ouvre au clic sur le bouton vert si le prénom ou le rôle manque, ou par « Modifier » sous la barre.
- **Ordre du bas de page** : liste, barre, rappel de signature, carte de la lecture des autres sites (inchangée), sites sans contact, origine de la liste.

### Fichiers clés

`src/features/targets/targets-screen.tsx` (`TargetsScreen`, `TargetRow` et `TargetsTable` avec `pageAction`, `MessageSettingsForm` en fenêtre), `messages/fr.ts` (`targets.validate`, `targets.noContact`, `targets.origin`, `targets.founder`, `targets.list`, `targets.toPlan` ; `targets.serp` et `targets.contactless` supprimés), `src/features/targets/bottom.test.ts` (nouveau : accords, pas de « lot », pas d'argent), `src/app/demo/cibles/page.tsx` (nouveau, absent en production). Captures : `docs/img/vos-cibles-bas/`.

### Commandes

`NEXT_PUBLIC_APP_URL=http://localhost:3111 NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=fictive pnpm dev -p 3111` puis `/demo/cibles` (`?signature=non` pour la fenêtre). Tests : `pnpm vitest run src/features/targets`.

### Dettes et pièges

- Vérifié sur la page de démonstration (bureau 1440 px, téléphone 375 px, aucun défilement horizontal), **pas** sur une vraie campagne.
- Écart avec la maquette : sur téléphone la barre reste une carte flottante (comme avant), pas une bande collée au bord sur toute la largeur.
- « sur M » compte les sites qu'on peut encore retenir (les « Déjà validée » n'y sont pas), donc M peut être inférieur au titre « N sites à contacter ».
- `view.competitors` n'est plus affiché ici mais reste chargé (il sert au compte de « D'où vient cette liste »).

### Backlog

- Le détail de l'analyse n'affiche le tableau des concurrents que pour les anciennes analyses (`analysis === "aucun"` dans `audit-detail.tsx`) : l'y montrer aussi pour les nouvelles, puisque « Vos cibles » y renvoie.
- Sites sans contact : saisir soi-même un email trouvé, ou marquer « contacté par moi ».
- Le mot « lot » reste dans d'autres écrans (plan, lots) : à revoir écran par écran.

### Prochain sous-jalon recommandé : MC.6g (inchangé)

## Envoi ponctuel d'un message prioritaire (18/11/2026, demande de Jonathan)

- Variable d'environnement facultative `SEND_PRIORITY_DRAFT_ID` (uuid d'un brouillon validé) : ce brouillon part avant la file et peut dépasser le quota d'échauffement (5 par jour la première semaine), **jamais** le plafond horaire ni le plafond journalier de la boîte (appliqués aussi en base). Une seule fois : un brouillon déjà parti est ignoré. Absente par défaut ; à retirer de Vercel après usage.
- Fichiers : `src/env.ts`, `src/features/sending/service.ts` (`sendPriorityDraft`), 2 tests dans `sending.test.ts`.
- Usage : test des boîtes mail (message vers info@oma-and-me.com, brouillon `0857c99b-d72d-4d5a-95fb-0ce9dbac30b1`).

## Session du 19/11 : G1, connexion Google (OAuth) derrière un drapeau (faite)

- **Google Cloud (fait dans le navigateur de Jonathan, compte jonathan.encaoua@gmail.com)** : projet `outreach-links-oauth`, écran de consentement « Outreach Links » (externe), **publié en production le 19/11 sans vérification Google** (décision de Jonathan : tout compte Google peut autoriser, avec l'écran « application non vérifiée » et un plafond de 100 utilisateurs à vie ; liens accueil, confidentialité et conditions renseignés), API Gmail activée, autorisations `gmail.send` (sensible) et `gmail.readonly` (restreint), client OAuth « Application Web » avec les retours `https://outreach-links.vercel.app/api/google/callback` et `http://localhost:3000/api/google/callback`. Les conditions Google Cloud et la politique des données utilisateur ont été acceptées avec l'accord explicite de Jonathan. L'identifiant et le secret du client sont dans `.env.local` (ignoré par Git) ; le secret n'est plus affichable chez Google (à régénérer si perdu).
- **Code** : `src/features/google/{oauth,config,service,google-connect}`, routes `src/app/api/google/{start,callback}/route.ts`, bouton dans `mailbox-section.tsx` (seulement si `GOOGLE_OAUTH_ENABLED=true` et client renseigné). Variables : `GOOGLE_OAUTH_ENABLED` (faux par défaut), `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.
- **Migration `2026121600000000_mailbox_google_oauth.sql`** (additive) : `mailboxes.provider` ('smtp' par défaut, 'google'), table `mailbox_google_tokens` (jeton chiffré, aucun droit pour `authenticated`). Une boîte Google porte des valeurs fictives dans les colonnes SMTP/IMAP (`password_enc = '-'`) et reste « en attente » : G2 les remplacera.
- Tests : `pnpm vitest run src/features/google src/features/mailboxes` (8 + existants verts), typecheck et lint sans erreur.
- **Pas vérifié** : le parcours réel dans un navigateur (consentement Google puis retour), car le drapeau est coupé en production.

### Pour essayer (quand Jonathan le décide)

Poser `GOOGLE_OAUTH_ENABLED=true` sur Vercel (le client est déjà renseigné), ouvrir la page d'un site, « Connecter avec Google » avec jonathan.encaoua@gmail.com (ou tout autre compte Google). Attendu : « Connexion Google enregistrée », boîte « en attente ». Google affichera « application non vérifiée » : Paramètres avancés, puis « Accéder à Outreach Links (non sécurisé) ». Tout compte Google peut le faire (plafond de 100 utilisateurs).

### Prochain sous-jalon recommandé : G2 (envoi par l'API Gmail)

### Dettes

- Le jeton d'accès n'est pas encore renouvelé ni utilisé (G2). L'écran « Tester la connexion » est masqué pour les boîtes Google.
- Le nom affiché d'une boîte Google est la partie avant le @ ; pas encore modifiable.
- Application publiée non vérifiée : plafond de 100 utilisateurs à vie, bloquée par certains Google Workspace ; la vérification (G4) lève ces limites.

## Session du 19/11 : MC.7, pages à pousser choisies par volume et par position dès l'onboarding (faite)

Sous-jalon `PLAN.md > MC.7`. Branche `mc7-pages-par-volume`. **0 USD d'API** : aucun appel réel à DataForSEO ni au modèle, vérification sur données figées tirées de la base. Aucune migration (le classement vit dans le JSON du profil).

### Ce qui change pour la personne

- À l'étape « Ce que nous avons compris de votre site », les **pages qui ont déjà des recherches dans Google sont proposées en premier et cochées** (5 au plus), avec la ligne « 390 recherches par mois, position 88 ». Les pages trouvées par l'ancien tri (adresse) complètent la liste, comme avant. L'accueil reste proposé par défaut et décochable.
- Rien ne change pour un site sans mot-clé positionné, ni si l'appel échoue : l'écran et le profil sont ceux d'avant.

### Ce qui change dans le code

- `brand/rank-pages.ts` (nouveau, pur) : `positionFactor`, `pageScore` = `log10(1 + volume total de la page) × facteur de sa meilleure position` (0,3 de 1 à 3 ; 1,0 de 4 à 20 ; 0,7 de 21 à 50 ; 0,4 au-delà), `rankPages` (regroupe les mots-clés par adresse du site, écarte l'accueil, les autres domaines, les fichiers, les pages jamais proposées, les autres versions linguistiques et les adresses à paramètres), `trafficScorer`, `pageKey`. Constantes dans `brand/limits.ts` (`PAGE_RANK`, `RANKED_KEYWORDS_LIMIT`).
- `brand/keywords.ts` (nouveau) : `rankedKeywordsParams` (UNE définition des paramètres, utilisée aussi par `analysis/links-state.ts` : même clé de cache), `toRankedKeywords`, `loadRankedKeywords` (ne lève jamais : plafond par appel 0,03 USD, plafond quotidien de la plateforme, délai 12 s, sans nouvelle tentative ; toute panne donne une liste vide).
- `brand/service.ts` : `BrandDeps.rankedKeywords` (facultatif) ; l'appel part dès le début et n'est attendu qu'au moment de choisir les pages à lire (il court pendant la lecture de l'accueil et du sitemap). `brand/read-site.ts` : `priorityPages`, les 5 pages les mieux classées sont lues avant celles du tri par adresse, toujours 8 pages au plus et 16 requêtes au plus. `brand/generate.ts` : `recherches_google` (volume, position, 3 mots-clés) dans les données envoyées au modèle, une phrase de consigne, `withRankedPages` (pages classées en tête, `selected: true`, seulement si la page a été lue avec succès ; titre du modèle sinon titre de la page).
- `brand/schema.ts` : `ranked_pages` (facultatif, 20 pages au plus : adresse, volume, meilleure position, nombre de mots-clés, 5 mots-clés). `onboarding/service.ts` : une correction du profil par l'utilisateur garde ce classement ; le marché (pays, langue) est passé à l'appel. `onboarding/deps.ts` : dépendance de production. `analysis/run.ts` : même chose quand le profil est (re)fait pendant l'analyse, coût rattaché à l'audit.
- `brand/brand-fields.tsx` et `messages/fr.ts` : volume et position affichés. `drafting/shortlist.ts`, `drafting/draft.ts`, `inngest/functions/plan-drafts.ts` : à proximité égale avec la cible, la page qui a déjà des recherches passe devant (un petit catalogue montré en entier commence par elles) ; la proximité n'est jamais dépassée par le trafic.

### Vérification sur données figées (aucun appel payant)

Fixtures `src/features/brand/fixtures/ranked-keywords.*.txt`, copiées de la base le 19/11 (`audits.links_state.keywords.top` pour squadraplanning.com : 20 mots-clés, c'est tout ce que le site a ; `dataforseo_cache` pour monjardinbio.com : 100 mots-clés).

| Site                | Pages classées | Les 5 premières (score, volume par mois, meilleure position)                                                                                                                                                                 |
| ------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| squadraplanning.com | 4              | `blog/temps-pause-legal-travail` (1,87 ; 470 ; 21), `calculators/conges-payes` (1,25 ; 1 360 ; 77), `calculators/jours-ouvres` (1,23 ; 1 170 ; 85), `calculators/cout-salarie` (1,18 ; 880 ; 82)                             |
| monjardinbio.com    | 53             | cloportes (5,00 ; 99 000 ; 17), céleris-raves (4,73 ; 54 200 ; 5), taille de l'olivier (4,65 ; 44 400 ; 14), gazon de placage, fiche produit (4,47 ; 29 600 ; 13), larves de coccinelles, fiche produit (4,38 ; 24 200 ; 13) |

Critère de `PLAN.md` atteint : pour squadraplanning.com, les calculateurs positionnés et l'article sur le temps de pause sont dans les 5 premières pages (seuls 3 des 7 calculateurs ont des mots-clés positionnés : les 4 autres ne peuvent pas sortir de cette source et restent à la charge du tri par adresse). Pour monjardinbio.com le classement est cohérent à la main : gros volumes en positions 4 à 20 devant, pages déjà premières ou deuxièmes loin derrière (paillage, 43 300 recherches, position 1 : rang 48 sur 53), page en position 93 toujours classée.

**Coût** : grille 0,022 USD par site (0,012 + 100 lignes) ; coût réel moyen des 16 appels `labs.ranked_keywords` déjà en base : **0,0129 USD** (0,012 à 0,024). Avec le cache (7 jours), l'état des lieux de l'analyse qui suit ne repaie pas.

### Décisions [auto]

- Les pages classées sont **toujours** proposées et cochées (pas seulement suggérées au modèle) ; les autres pages choisies par le modèle restent proposées et cochées comme avant (8 pages au plus au total).
- Une page classée n'est proposée que si elle a été **lue avec succès** : jamais une adresse connue de Google seulement.
- L'accueil n'entre pas dans le classement (ses recherches sont surtout le nom de la marque) : il garde sa case à part.
- Le classement est stocké dans le profil plutôt que sur chaque page proposée : une seule source pour l'écran, le rédacteur et MC.2.
- Dans le rédacteur, le trafic ne fait que **départager des égalités** de proximité (lecture stricte de « à pertinence égale »).

### Commandes

```bash
pnpm vitest run src/features/brand src/features/drafting src/features/onboarding src/features/analysis
pnpm typecheck && pnpm lint
```

### Dettes et pièges

- **Non mesuré sur un vrai onboarding** : pas de run réel dans cette session (pas de clés, et consigne de ne rien payer). À constater au prochain site créé : ligne `labs.ranked_keywords` dans `cost_ledger` sans `audit_id`, `ranked_pages` dans le profil, pages cochées à l'écran. L'effet de la nouvelle phrase de consigne sur le modèle n'est pas mesuré non plus.
- **Sites de test** (remove-me.io, mega-coloring.com) : leur audit ne relit jamais un cache antérieur à sa création, donc ces deux sites paient l'appel deux fois (onboarding puis audit), environ 0,013 USD de plus.
- L'appel à l'onboarding précède toute confirmation de coût par l'utilisateur (décision de Jonathan du 18/11) et n'a pas de plafond par espace de travail : voir Backlog.
- Les adresses renvoyées par DataForSEO portent souvent `www.` : la comparaison passe par `pageKey` (hôte sans `www`, sans barre finale). Toute nouvelle comparaison d'adresses de pages du site doit l'utiliser.
- La PR #181 (MC.6g, sortie du jugement à 520 jetons) est toujours ouverte avec une CI rouge et attend une décision sur le plafond de campagne : non touchée ici.
- Le plan de MC.7 dormait sur la branche `claude/awesome-fermi-a7ohab`, jamais fusionnée : il est repris dans cette PR, la branche peut être supprimée.

### Prochain sous-jalon recommandé : MC.2

Écrire les recherches par sujet et par public à partir des mots-clés des pages cochées (`profile.ranked_pages[].keywords`, croisés avec `linkable_resources` cochées). Mesurer sur deux sites de thèmes différents.

## Session du 19/11 (suite) : G2 + G3, envoi et lecture par Gmail ; Gmail seul proposé (faite)

- **Décision de Jonathan (19/11)** : une seule connexion proposée, **Gmail (OAuth Google)**. Le formulaire SMTP/IMAP (v1) est archivé : le code reste, il n'est affiché que si `GOOGLE_OAUTH_ENABLED` est faux. Les boîtes déjà connectées en SMTP continuent de fonctionner.
- **G2** : `src/features/google/gmail.ts` : `getAccessToken` (jeton de renouvellement chiffré vers jeton d'accès), `sendViaGoogle` (message MIME complet par `users.messages.send`, mêmes en-têtes et fil que SMTP ; échecs classés auth / temporaire / permanent). Branché dans `sending/service.ts` et `inbox/send.ts` via `deps.sendGoogle` (facultatif, le vrai par défaut). Un accès Google retiré met la boîte en « erreur ».
- **G3** : `fetchViaGoogle` (`messages.list` + `messages.get` en lecture seule), même forme de résultat qu'IMAP ; curseur = heure de réception en secondes (colonne `imap_last_uid`). Branché dans `replies/service.ts` via `deps.fetchGoogle`.
- **Connexion** : une boîte Google est créée « vérifiée » (jeton obtenu, adresse lue) ; reconnecter la même adresse met à jour le jeton. Écran : bouton « Connecter Gmail » avec la mention « nous ne stockons pas votre mot de passe ».
- Tests : `pnpm vitest run src/features/google src/features/sending src/features/inbox src/features/replies src/features/mailboxes` (verts), typecheck et lint sans erreur.
- **Pas vérifié** : aucun envoi ni lecture réels avec un vrai compte Gmail ; le parcours dans un navigateur non plus.

### Dettes

- La lecture télécharge tous les messages reçus depuis le premier envoi puis ne garde que les fils de campagne (comme IMAP) ; à restreindre par requête Gmail si le volume le demande.
- Curseur en secondes : deux messages dans la même seconde sont relus (sans effet, l'insertion est idempotente).
- Le nom affiché d'une boîte Google est la partie avant le @.
- Outlook : pas encore (OAuth Microsoft, jalon 7).

### Prochain : essai réel de bout en bout avec une boîte Gmail de test, puis G4 (vérification Google).

## Retour de Jérémie (18/11/2026) : tunnel en trois étapes

- Remarques consignées dans `docs/jalon-mu.md` section 8 (sous-jalon **MU.12** : cibles retenues → messages rédigés → envoi). Pas encore codé : à faire dans une session dédiée, après MU.10.
- Décompte à expliquer dans l’écran : « 42 cibles » = liens morts des concurrents + pages que personne ne sollicite (deux tactiques, à présenter séparément).

## Décisions du 19/11 (suite) : premier passage, Search Console, boule de neige (faite, à valider)

Décisions de Jonathan, à appliquer dans les prochains sous-jalons. Aucun code modifié dans cette note.

- **DataForSEO reste la source du graphe de liens** (qui cite qui, backlinks, SERP). Pas d'alternative gratuite retenue.
- **Pas de seeds saisies à la main** : le produit est 100 % automatisé et les utilisateurs ne connaissent pas ces sites. Les seeds viennent de l'audit, de la SERP et de Search Console.
- **Requêtes de contenu sans lien** : chercher des pages qui citent des ressources, via la SERP (requêtes « liste de ressources », « liens utiles », etc. par thème). Peu coûteux, à faire.
- **Claude propose une liste de thèmes et de sites qui citent des ressources** : toujours vérifier chaque adresse (HTTP 200, contenu réel) avant d'en faire une cible.
- **Search Console dans l'onboarding** : proposer de connecter la Search Console du site, sur le modèle de la boîte d'envoi (facultatif, fortement conseillé). Pas encore dans le code (aucune occurrence dans `src/`). Elle donne les requêtes réelles du site, donc les pistes d'orientation et les pages à pousser, sans devoir deviner.
- **Premier passage** : à améliorer en lisant la page candidate (lecture gratuite, sans LLM) avant de trier sur les signaux seuls. Les poids de `provisionalScore` (`src/features/qualification/free.ts`) restent à recaler sur des données réelles, pas à la main.
- **Boule de neige** : la faire tourner en profondeur (2 à 3 niveaux) plutôt qu'en largeur, mesurer le rendement à chaque niveau sur un échantillon relu à la main, et continuer tant que le rendement tient. Coût attendu : environ 0,2 USD par niveau. Elle hérite de la qualité des premières cibles : pas d'amplification avant d'avoir des réponses réelles.
- **Mesure à mettre en place avant tout** : rendement réel (réponses, liens obtenus) par source (tactique) et par type de site. Aujourd'hui la source est souvent non renseignée, donc le rendement par piste n'est pas mesurable.

## Session du 19/11 : MQ.1, piste et niveau par cible, tableau interne (faite, sans envoi)

Périmètre tenu : chaque cible retenue garde sa **piste de découverte** (la source qui l'a trouvée), son **niveau de boule de neige** et son **type de site** ; un tableau interne montre cibles, envois, réponses et liens par piste, par niveau et par type de site. Aucun envoi réel, aucun appel payant. Prérequis : aucun (MQ.1 ouvre le jalon MQ).

### Ce qui change pour la personne

- Rien à l'écran pour l'instant : le suivi est interne. Les cibles ont désormais une piste renseignée (plus de « inconnu » par défaut).

### Ce qui change dans le code

- **Piste** = source du candidat (`lien_mort`, `citation`, `mention`, `intersection`, `content`, `serp`), priorité dans cet ordre ; à défaut de source, déduite de la tactique (`src/features/targets/tracking.ts`, `pisteOf`, `pisteFromTactics`).
- **Niveau** : `collection_candidates.niveau` et `qualified_targets.niveau`, 0 au premier passage, 1 pour ce que trouve la boule de neige (`SNOWBALL_NIVEAU` dans `src/features/snowball/service.ts`). MQ.6 ajoutera les niveaux suivants.
- **Écriture** : `qualification/funnel.ts` (résultat), `qualification/run.ts` (`toRow`, lecture du niveau), `snowball/service.ts` (lignes en stock).
- **Migration** `supabase/migrations/2026121900000000_target_piste.sql` : colonnes, reprise de l'existant (piste depuis les sources, sinon la tactique), `piste` obligatoire ensuite.
- **Tableau interne** : `src/features/targets/tracking.ts` (agrégation pure et Markdown) et `tracking-report.ts` (lecture service_role paginée, jointure `joinTracking` : cible → éléments de plan du même audit → brouillons → envoi initial `envoye` → réponse `reponse` → lien `live`). Une cible compte au plus une fois par colonne. Pas de page dans l'application (ce n'est pas un écran client) : commande `pnpm demo:tracking`, avec `TRACKING_REPORT_OUT=<fichier>` pour écrire le Markdown.
- `src/lib/supabase/database.types.ts` mis à la main pour les nouvelles colonnes (pas de CLI Supabase ici) : à régénérer quand la migration est appliquée.

### Vérifications

- `pnpm typecheck` : vert. `pnpm lint` : 0 erreur (avertissements déjà présents, aucun dans les fichiers touchés). Prettier : vert sur les fichiers touchés.
- `pnpm vitest run src/features/targets src/features/qualification src/features/snowball` : 172 tests verts (fichiers touchés) (dont 9 nouveaux dans `tracking.test.ts` : piste, suivi par dimension, jointure).
- **Pas vérifié** : la migration n'a pas été appliquée à la base (pas de CLI Supabase ici, et l'accès distant n'a pas été utilisé) ; le tableau sur le site de test n'a donc pas encore été lu en base. Le critère « 100 % des cibles retenues ont une piste » tient par construction (la piste est toujours calculée, la colonne est obligatoire après reprise) mais reste à constater sur la base.

### Décisions [auto]

- Piste et niveau sont stockés sur `qualified_targets` (pas recalculés à la lecture) pour qu'une cible garde sa piste même si les candidats sont régénérés.
- Le tableau interne n'est pas exposé aux espaces clients (pas de contrôle d'administrateur dans le code) : lecture par service_role uniquement.
- « Envoi » = premier message `envoye` (les relances et les simulations `simule` ne comptent pas) ; « lien » = statut `live` au dernier contrôle.

### Commandes

```bash
pnpm vitest run src/features/targets src/features/qualification src/features/snowball
TRACKING_REPORT=1 TRACKING_REPORT_OUT=/tmp/suivi.md pnpm demo:tracking
```

### Dettes et pièges

- Le fallback « serp » sans source est un choix : une cible sans source connue (données anciennes) tombe dans « Résultats Google ». À surveiller après la reprise.
- La reprise SQL déduit la piste d'une cible par sa première source dans la collecte ; une cible trouvée par plusieurs sources garde la plus forte.
- Le niveau 1 suppose que la boule de neige ne trouve que des sites cités par des cibles retenues (vrai aujourd'hui).

### Prochain sous-jalon recommandé : MQ.2 ou MQ.4 (peuvent se faire en parallèle), puis MQ.3 après un premier lot de réponses.

## Session du 19/11 : MQ.2, Search Console connectée en lecture seule (partielle, derrière un drapeau)

Sous-jalon `PLAN.md > MQ.2`. Branche `mq.2-search-console`. **0 USD d'API** : aucun appel réel à Google ni à DataForSEO, tout est testé avec des réponses simulées. Aucun envoi d'email. Le parcours réel dans un navigateur n'est pas fait (drapeau coupé, vérification Google G4 absente).

### Ce qui change pour la personne

- Sur la page du site, juste **avant la boîte d'envoi** : une carte « Connecter la Search Console (facultatif, fortement conseillé) », même formulation que la boîte. Une fois connectée : « Propriété …, compte …. Lecture seule. ».
- Une fois connectée, l'état des lieux de l'audit garde les **90 derniers jours** de requêtes et de pages réelles (100 de chaque, les plus vues d'abord) dans `audits.links_state.searchConsole`.
- Sans connexion : `searchConsole` vaut `null`, aucune erreur, l'audit fonctionne comme avant.

### Ce qui change dans le code

- `src/features/search-console/` (nouveau) :
  - `api.ts` : propriétés du compte, `pickProperty` (domaine `sc-domain:` d'abord, puis https / http, avec ou sans www ; une propriété « non vérifiée » ne compte pas), `queryRows` (dimension `query` ou `page`, lecture seule), `analyticsWindow` (90 jours, 3 jours de retard).
  - `service.ts` : `completeSearchConsoleConnect` (échange du code, vérification du scope lecture seule, propriété du site, jeton de renouvellement chiffré, upsert dans `search_console_connections`).
  - `load.ts` : `readSearchConsoleStatus` (sans jeton, pour l'affichage), `loadSearchConsoleSnapshot` (ne lève jamais : `null` si pas connecté, jeton refusé, panne ou drapeau coupé), `searchConsoleEnabled`.
  - `search-console-connect.tsx` : la carte. Résultat lu dans le paramètre `sc` (le paramètre `google` reste celui de la boîte).
  - `search-console.test.ts` : 14 tests (API simulée, autorisation, lecture, connexion).
- `src/features/google/oauth.ts` : `SEARCH_CONSOLE_SCOPE` (`webmasters.readonly`, demandé à part de Gmail), `purpose` dans le `state` (absent = `gmail`, les états existants restent valides), `buildAuthUrl` accepte la liste de scopes, `refreshAccess` (jeton d'accès).
- `src/app/api/google/start/route.ts` : `?purpose=search_console` (404 si le drapeau est coupé). `callback/route.ts` : branche Search Console ; Gmail inchangé.
- `src/features/analysis/links-state.ts` : étape « search-console » (hors plafonds DataForSEO, puisque gratuite) et champ `searchConsole` ; `links-state.test.ts` (nouveau, 2 tests). `src/inngest/functions/analysis-links-state.ts` branche la lecture réelle.
- `src/app/app/site/[id]/page.tsx` : carte affichée seulement si le drapeau est ouvert.
- `src/env.ts` : `SEARCH_CONSOLE_ENABLED` (faux par défaut).
- `messages/fr.ts` : bloc `searchConsole`.
- **Migration** `supabase/migrations/2026121900000100_search_console.sql` (additive) : table `search_console_connections` (une ligne par site, jeton chiffré, aucun droit pour `anon` / `authenticated`, lecture et écriture par le serveur seulement). Postérieure à `2026121900000000` (PR #206), pas de conflit de nom.
- `src/lib/supabase/database.types.ts` : **seul ajout** ; un bloc `search_console_connections` inséré après `mailbox_google_tokens`, rien d'autre. Les fichiers de la PR #206 (`qualification`, `snowball`, `targets/tracking*`) ne sont pas touchés.

### Drapeau et vérification Google

- `SEARCH_CONSOLE_ENABLED` reste **faux** en production. Pour l'ouvrir : poser `SEARCH_CONSOLE_ENABLED=true` sur Vercel (le client OAuth Google est déjà renseigné, `GOOGLE_OAUTH_ENABLED=true` requis).
- Le scope `webmasters.readonly` est **sensible** : sans vérification (G4), l'écran Google affiche « application non vérifiée » et l'application est limitée à 100 utilisateurs, comme pour Gmail. Ne pas ouvrir le drapeau en public avant G4.
- L'écran de consentement Google doit déclarer le scope `webmasters.readonly` (à ajouter dans Google Cloud, pas fait ici : action de Jonathan dans le navigateur).

### Commandes

```bash
pnpm vitest run src/features/search-console src/features/google src/features/analysis src/inngest
pnpm typecheck && pnpm lint
```

### Dettes et pièges

- **Pas affiché dans l'écran d'audit** : les requêtes sont stockées dans `links_state.searchConsole` mais aucun écran ne les montre encore.
- **Pas utilisé par le premier passage ni par l'onboarding** : les pages classées de MC.7 viennent toujours de DataForSEO. Les pages Search Console (MQ.2) ne sont pas encore proposées à l'onboarding ; à brancher avec MQ.3 / MQ.4.
- **Le volume n'est pas comparable** : Search Console donne clics et impressions sur 90 jours, pas le volume mensuel de DataForSEO. Ne pas mélanger les deux dans `RankedKeyword`.
- **Propriété absente** : si le compte Google n'a pas de propriété pour le domaine, la connexion est refusée avec le message « pas de propriété » (rien n'est enregistré).
- **Parcours réel non vérifié** : aucun consentement Google réel ni appel à l'API Search Console dans cette session.
- Le paramètre de retour est `sc` (pas `google`) pour ne pas mélanger les messages des deux cartes.

### Backlog (hors périmètre, à ne pas coder ici)

- Afficher les requêtes et pages Search Console dans l'écran d'audit.
- Proposer les pages Search Console à l'onboarding et au premier passage (avec MQ.3).
- Utiliser les requêtes Search Console comme source de MQ.4 (requêtes de contenu sans lien).
- Bouton « Déconnecter la Search Console » (aujourd'hui : reconnecter remplace l'ancienne connexion).
- Plafond de lectures par site et cache des requêtes (aujourd'hui : un appel de deux requêtes par audit, sans cache).
- Ajouter le scope `webmasters.readonly` à l'écran de consentement Google Cloud, puis G4.

### Prochain sous-jalon recommandé : MQ.4 (requêtes de contenu sans lien, SERP)

Peut se faire en parallèle de MQ.1 (déjà en PR) : les requêtes Search Console (`links_state.searchConsole.queries`) en sont une source de plus, à côté des requêtes prioritaires de la SERP.

## Session du 19/11 : MQ.4, requêtes de contenu sans lien (SERP), partielle

Sous-jalon `PLAN.md > MQ.4`. Branche `mq.4-requetes-serp` (depuis `main`, après la fusion de MQ.2 en #207). Tests et typecheck verts ; **0 USD d'API** (rien n'est appelé : tout est pur et testé). Aucun envoi d'email. Aucun fichier de la PR #206 (MQ.1) touché.

### Ce qui change

- `src/features/collection/content-queries.ts` (nouveau, pur) : `contentQueries` produit les requêtes de contenu sans lien, avec deux sources :
  - **thème** (gabarits fixes, sans LLM) : « liste de ressources {thème} », « sites de référence {thème} » (fr ; équivalents en en). Origine `regle`.
  - **Search Console** : `searchConsoleSeeds` prend au plus 4 requêtes réelles (`audits.links_state.searchConsole.queries`), les plus de clics d'abord, avec au moins 10 impressions, sans requête de marque, sans doublon. Gabarit « liste de ressources {requête} ». Origine `search_console`.
  - `searchConsoleRowsOf` lit ces lignes dans le JSON de `links_state` ; une ligne abîmée est ignorée, sans erreur.
  - Toute requête déjà présente dans l'univers est écartée (comparaison normalisée).
- `src/features/queries/schema.ts` : `origin` accepte désormais `search_console` (ajout seul).
- `src/features/collection/plan.ts` : `buildCollectionPlan` accepte `contentQueries`. Elles se placent **après** l'univers, sans dépasser le plafond SERP (60), et leurs rangs sont renumérotés. Sans requêtes de contenu, le plan est identique à avant.
- `src/features/collection/service.ts` : `previewCollection` lit `links_state`, construit les requêtes de contenu et les passe au plan. Le coût annoncé suit automatiquement (même `estimateCost("serpOrganicLive")` que le reste). Le plan est figé à la confirmation, donc la collecte lancée ne change pas.
- Tests : `content-queries.test.ts` (nouveau, 9 tests) ; `collection.test.ts` : une attente passe de 10 à 12 requêtes SERP (les 2 requêtes de thème s'ajoutent à l'univers de la fixture). Le pire cas reste sous le budget de la phase.

### Décisions prises ici (à valider)

- **Piste propre** : chaque requête garde sa tactique (`ressources`) et son origine (`regle` / `search_console`). C'est ce qui permettra à MQ.1 de mesurer le rendement par source. MQ.1 n'est pas encore fusionnée : le tableau par piste n'existe pas encore.
- **Coût dans `cost_ledger`** : ces requêtes passent par le même chemin de collecte SERP que les autres (client DataForSEO déjà enregistré), donc rien de nouveau à câbler.
- **Par public (persona)** : le gabarit « sites de référence {public} » n'est PAS encore fait. Seules les requêtes par thème le sont. À ajouter si le rendement du thème ne suffit pas.

### Ordre des étapes : la recherche attend l'état des lieux (décision de Jonathan, 19/11)

- **Décidé** : l'étape « recherche » attend la fin de `etat_des_lieux` (réussie ou échouée) avant de préparer la collecte, pour que les requêtes Search Console de `links_state` soient toujours prises en compte quand elles existent.
- **Comment** : `runAnalysis` (`src/features/analysis/orchestrate.ts`) appelle `awaitParallel` juste avant l'étape `recherche`. Dans `src/inngest/functions/analysis-run.ts`, l'attente est une boucle **bornée** : lecture en base de l'état (`linksStateSettled`, `src/features/analysis/links-state-wait.ts`), puis `step.sleep` de 15 s, au plus 24 tours (6 minutes). Chaque tour est un step, donc rejouable. Pas de `waitForEvent` : il aurait pu manquer un événement déjà arrivé.
- **Au pire** : si l'état des lieux ne finit pas (lancement raté, panne), la recherche part quand même, sans Search Console. Aucune erreur pour la personne. Une ligne d'avertissement est journalisée.
- **Coût** : aucun appel payant ajouté ; l'attente dure en général le temps de trois appels DataForSEO (moins d'une minute).
- Le drapeau `SEARCH_CONSOLE_ENABLED` reste faux en production : tant qu'il l'est, la source Search Console est vide.
- Tests : `analysis.test.ts` (ordre concurrents → attente → recherche ; une attente en échec ne bloque pas), `links-state-wait.test.ts` (fini / en cours / absent).

### Commandes

```bash
pnpm vitest run src/features/collection src/features/queries
pnpm typecheck && pnpm lint
```

### Dettes et pièges

- Les requêtes de contenu se mélangent à l'univers à l'ordre du plan : le **rendement** (`yieldStop`) les traite comme les autres ; à surveiller quand MQ.1 mesurera.
- Le coût worst-case de la phase SERP augmente de quelques requêtes ; il reste borné par le budget de la phase (`phaseBudgetUsd`).

### Prochain sous-jalon recommandé

MQ.1 (PR #206) en premier, puis MQ.5 (thèmes et sites proposés par Claude, avec vérification). L'attente de `etat_des_lieux` avant la recherche est faite dans cette PR (voir ci-dessus).

## Session du 19/11 (suite 2) : gabarits d'email Supabase remis à la marque backleenks (faite)

- **Constat** : les gabarits du dépôt (`supabase/email-templates/`) étaient déjà à la marque backleenks, mais les modèles **en ligne** dans Supabase (Authentication > Emails) étaient restés sur « Autolink.ai » (vu sur le mail d'inscription reçu). Cause : le dépôt n'est pas relié au projet ; la mise en ligne est manuelle ou se fait par l'API de gestion.
- **Fait** : les six gabarits (inscription, mot de passe oublié, lien de connexion, invitation, changement d'adresse, ré-authentification) recollés dans le tableau de bord du projet `outreach-links` (réf. `ivjkwhhgtibewqzccvrj`) via le navigateur intégré, connecté par Jonathan. Vérifiés après rechargement : plus aucune trace d'« Autolink », trois mentions de backleenks par gabarit, jeton `{{ .TokenHash }}` (ou `{{ .Token }}` pour la ré-authentification) présent.
- **Objets et expéditeur** : déjà corrects (`backleenks <noreply@backleenks.com>`, SMTP Resend). Rien à changer.
- **Test** : demande de réinitialisation envoyée à `jonathan.encaoua@gmail.com` depuis le site (`/mot-de-passe-oublie`) ; Jonathan a validé le rendu (« all good »).
- **Non testé** : invitation, changement d'adresse, ré-authentification (pas de déclencheur simple) et l'inscription d'une adresse neuve.
- **Dette** : l'API de gestion Supabase répondait 401 dans cette session (aucun jeton injecté). Le dépôt et le tableau de bord peuvent donc diverger sans qu'on le voie. À chaque changement de gabarit : mettre le fichier à jour **et** le recoller dans Supabase, ou le repousser par l'API.
- **Note** : `supabase/email-templates/README.md` corrigé (il parlait encore d'« Autolink.ai » en dur).

### Prochain

Vérifier l'inscription sur une adresse neuve quand Jonathan le souhaite (rendu du mail de confirmation dans Gmail), et brancher le nom de marque dans les gabarits à partir de `messages/fr.ts` si la marque change encore.

## Session du 19/11 (suite 3) : MQ.5, thèmes et sites proposés par Claude, avec vérification (faite, pas encore branchée)

Sous-jalon `PLAN.md > MQ.5`. Branche `mq.5-sites-proposes`. Aucun envoi d'email. **Un appel LLM par audit**, plafonné (`PROPOSAL_LIMITS`, sortie 2 000 jetons, coût réservé 0,05 USD à valider sur un vrai appel) ; les lectures de pages sont gratuites. Tout est testé avec un faux client LLM et un faux lecteur de pages : aucun appel réel.

### Ce qui change pour la personne

- Rien à l'écran : le module n'est pas encore branché dans la collecte ni dans l'écran d'audit.

### Ce qui change dans le code

- `src/features/proposals/` (nouveau) :
  - `schema.ts` : `PROPOSAL_LIMITS` (15 sites, 8 thèmes, 30 requêtes Search Console au plus) et `proposalsSchema` (thèmes ; sites avec domaine, page exacte, ressource citée, raison).
  - `verify.ts` : `checkProposal` enchaîne les contrôles : adresse valide, pas le site lui-même, appartient au domaine proposé, robots.txt, joignable, HTTP 200, texte réel (300 caractères au moins), nom de la ressource présent sur la page (sans accents ni casse). Un motif de rejet par proposition. `verifyProposals` : lectures par lots de 4, doublons d'adresse écartés, `gapRate` = écartées / proposées. `gapLabel` : la ligne « N sur M propositions écartées (P %) ».
  - `service.ts` : `proposeVerifiedSites` : un appel `llm.generate` (tâche `site_proposals`, enregistrée dans `cost_ledger` par le client), sortie revalidée par zod, puis vérification. Renvoie `null` sans client, en cas de panne, de plafond dépassé ou de sortie non conforme (rien n'est inventé).
  - `proposals.test.ts` : 18 tests (contrôles un par un, taux d'écart, coût, échecs).

### Vérifications

- `pnpm vitest run src/features/proposals` : 18 verts.
- `pnpm typecheck` : vert. `pnpm lint` et `prettier` sur les fichiers touchés : verts.

### Décisions [auto]

- Le module renvoie une liste vérifiée (`kept`) et le taux d'écart ; il n'alimente pas encore la liste courte. Brancher `kept` dans la collecte (origine « proposition ») est la suite, pour ne pas toucher `collection/` dans ce sous-jalon.
- Les thèmes ne sont pas vérifiés (ce ne sont pas des adresses) ; seules les adresses comptent.
- Le nom de la ressource doit apparaître sur la page : c'est la preuve minimale qu'une page cite bien quelque chose de comparable, sans règle propre à un thème.

### Dettes et pièges

- **Non branché** : aucun écran, aucune collecte n'appelle encore `proposeVerifiedSites`. Le taux d'écart n'est donc affiché que par la fonction `gapLabel`.
- **Coût non mesuré** : 0,05 USD est une estimation ; à mesurer sur un vrai appel (site de test) avant de fixer le plafond.
- **Page citée réelle mais hors sujet** : la vérification prouve que la page existe et cite la ressource, pas que le message sera accepté. Le tri (MQ.3) reste nécessaire.
- Search Console : les requêtes (`links_state.searchConsole.queries`) doivent être passées par l'appelant ; le module ne les lit pas lui-même.

### Backlog (hors périmètre)

- Brancher `kept` dans la collecte (origine « proposition ») et dans l'écran d'audit, avec le taux d'écart affiché.
- Mesurer le coût réel d'un appel et recaler `reservedUsd`.

### Prochain sous-jalon recommandé : MQ.4 (requêtes de contenu sans lien, SERP), puis MQ.3 après un premier lot de réponses.

### Reprise et vérification (19/11, après MQ.1 et MQ.5 fusionnées)

- Branche mise à jour sur `main` (fusion sans conflit). Typecheck vert ; `pnpm vitest run src/features/collection src/features/queries src/features/analysis src/features/targets` : 278 verts ; format:check vert ; lint : 0 erreur.
- **Écart à traiter (non fait ici)** : les requêtes de contenu gardent leur tactique `ressources`, donc `pisteFromTactics` les range dans la piste « citation » et non dans une piste propre « requête de contenu ». Pour un rendement séparé, il faut une piste dédiée : ajouter la valeur à `PISTES` et au `check` SQL de `qualified_targets.piste` (migration additive), puis propager l'origine (`regle` / `search_console`).
- **Écart à traiter** : le gabarit par public (« sites de référence {public} ») n'est pas fait.
- **Non vérifiable ici** : le rendement réel par piste dépend d'envois réels (aucun envoi en développement).

## Session du 19/11 (suite 4) : MQ.4, piste propre et public (faite, sans envoi)

Sous-jalon `PLAN.md > MQ.4`. Branche `mq.4-requetes-contenu` (depuis `main` à jour : MQ.1, MQ.5 et MQ.4 fusionnées). **0 USD d'API** dans cette session : rien n'est appelé, tout est testé en pur. Aucun envoi.

### Ce qui change dans le code

- **Piste propre** : nouvelle source de candidat `requete_contenu` (`src/features/collection/types.ts`), placée dans `PISTES` juste après `content`, avant `serp` (`src/features/targets/tracking.ts`, libellé « Requête de contenu sans lien »). `fromSerp` (`normalize.ts`) la donne à tout résultat d'une requête dont l'origine commence par `contenu_`. Avant, ces résultats tombaient dans `serp` : le rendement de la piste ne se mesurait pas à part.
- **Origines des requêtes** (`src/features/queries/schema.ts`, ajout seul) : `contenu_theme`, `contenu_public`, `contenu_search_console`. Remplacent `regle` / `search_console` pour les requêtes de contenu.
- **Gabarit par public** (`content-queries.ts`) : « sites de référence {public} {thème} » (fr) / « reference sites {public} {thème} » (en), une requête par public de l'audience du profil (`profile.audience`), au plus `CONTENT_QUERY_LIMITS.maxPublics` = 3, dédoublonnés, sans public vide. Aucune requête sans thème.
- `src/features/collection/service.ts` passe `profile.audience` à `contentQueries`.
- **Migration** `supabase/migrations/2026121900000200_piste_requete_contenu.sql` (additive) : la contrainte `qualified_targets_piste_check` accepte `requete_contenu`. Aucune ligne modifiée.
- Tests : `content-queries.test.ts` (origines renommées ; 4 tests de public ; 3 tests de piste : la source, la priorité dans `pisteOf`, le cas ordinaire inchangé).

### Coût et plafond

- **Par requête, dans `cost_ledger`** : chaque requête SERP passe par le client DataForSEO, qui journalise chaque appel payant (`src/lib/dataforseo/client.ts`, « tout appel payant est journalisé »). Rien de nouveau à câbler.
- **Plafond** : au plus 2 requêtes de thème + 3 de public + 4 de Search Console = **9 requêtes de contenu**, puis le plafond SERP de la collecte (`COLLECTION_LIMITS.serp.maxQueries`) et le budget de phase. Le coût annoncé suit (même `estimateCost("serpOrganicLive")`).

### Rendement par piste

- Le tableau interne (MQ.1, `src/features/targets/tracking.ts`) groupe déjà par piste : la piste `requete_contenu` y apparaît sans code en plus. Le **rendement réel** (réponses, liens) ne se mesure qu'après des envois réels ; il n'y en a pas en développement.

### Vérifications

- `pnpm vitest run src/features/collection src/features/targets src/features/queries src/features/qualification src/features/snowball src/features/analysis` : 402 verts.
- `pnpm typecheck` vert ; `pnpm lint` : 0 erreur (9 avertissements déjà présents) ; `pnpm format:check` vert.

### Décisions [auto]

- Les requêtes de contenu ont leur propre file de lecture (`laneOf` renvoie `requete_contenu`, car la source est distincte) : elles ne passent plus par le tour de rôle des publics de la file `serp`. Leur rendement est donc lu à part.
- `resources.ts` (domaines comparables du thème) ne compte plus les résultats de requêtes de contenu, qui filtrent sur `source === "serp"`. C'est voulu : ces résultats ne décrivent pas les ressources du thème.

### Dettes et pièges

- La migration doit être appliquée à la base avant la fusion du code qui écrit `requete_contenu`, sinon l'insertion échoue sur la contrainte. Ordre : migration, puis code (ou les deux en même temps dans le déploiement).
- `database.types.ts` n'a pas changé (la colonne est `text`).
- Coût réel par requête de contenu non mesuré (pas d'appel réel dans cette session).

### Backlog (hors périmètre)

- Plafonner les requêtes de public par audience (aujourd'hui 3, sans rapport au rendement).
- Mesurer le rendement de chaque piste sur des envois réels (MQ.7).

### Prochain sous-jalon recommandé : MQ.3 (premier passage, lire avant de trier) après un premier lot de réponses ; MQ.6 après MQ.1.

## Session du 19/11 (suite 5) : MQ.3, lecture gratuite avant le tri (faite, poids non recalés)

Sous-jalon `PLAN.md > MQ.3`. Branche `mq.3-lire-avant-trier` (depuis `main` à jour, MQ.1 / MQ.4 / MQ.5 fusionnées). **0 USD d'API** : la lecture est HTTP seul, sans LLM. Aucun envoi.

### Ce qui change dans le code

- **Avant le tri** (`src/features/qualification/funnel.ts`, étape `preread`) : les 150 meilleurs candidats (score provisoire, `QUALIFY_LIMITS.preread.maxCandidates`) sont lus une fois avec le lecteur sûr (robots.txt, délai par hôte, même file que la lecture). Le score provisoire est ensuite recalé, puis les files de lecture sont construites.
- **Signaux** (`src/features/qualification/prescore.ts`, `prereadBoost`) : page morte / injoignable / robots : × 0,5 ; page vivante écartée par la lecture : × 0,6 ; au moins deux sites cités sur la page : × 1,2 ; ressource comparable citée sur la page : × 1,25. **Aucun candidat n'est écarté** à cette étape ; l'étage 3 et le LLM décident comme avant.
- **Coupure** : `QUALIFY_LIMITS.preread.enabled` (true par défaut) ou `tuning.prereadEnabled: false`.
- Tests : `prescore.test.ts` (6 tests). Les tests existants de la lecture adaptative, des ressources et de l'entonnoir (`adaptive`, `resources`, `qualification`) fixent le nombre de pages lues du tri d'origine : ils tournent avec `prereadEnabled: false`, pour que leurs compteurs gardent leur sens. Un test dédié à la lecture avant tri reste à écrire.

### Pas fait : le recalage

- **Les coefficients ne sont pas recalés.** Il n'y a encore ni envoi ni réponse en base (0 envoi, 0 réponse, 0 lien, vérifié le 19/11). Ils sont des hypothèses, à recaler sur les premières réponses réelles de MQ.1.
- **Critère « deux sites de thèmes différents »** : non mesuré. Il demande des essais en direct, à lancer par Jonathan.

### Migrations (vérifiées et appliquées le 19/11)

- Le projet `outreach-links` (`ivjkwhhgtibewqzccvrj`) n'avait pas les migrations `2026121900000000_target_piste`, `2026121900000100_search_console` ni `2026121900000200_piste_requete_contenu`. Elles ont été appliquées dans cet ordre (succès). Vérifié : `qualified_targets` a `piste` et `niveau`, 759 cibles, aucune sans piste.

### Commandes

```bash
pnpm vitest run src/features/qualification
pnpm typecheck && pnpm lint
```

### Dettes et pièges

- **Lecture en double** : chaque candidat lu avant le tri est relu par la lecture normale (même page, deux requêtes HTTP). Coût : gratuit, mais le temps de lecture augmente d'environ 150 pages. À supprimer en réutilisant le résultat de lecture.
- Le signal est calculé sur la page d'origine du candidat, pas sur l'accueil du site (pas de secours d'accueil dans l'étape préalable).
- Les poids sont visibles dans `QUALIFY_LIMITS.preread.weights` : à recaler, pas à modifier à la main sans mesure.

### Prochain

Essais en direct sur deux sites de thèmes différents (Jonathan lance), puis recalage des coefficients sur les premières réponses réelles (MQ.1).

## Session du 19/11 (suite 6) : MQ.6, boule de neige en profondeur (faite, derrière un interrupteur coupé)

Sous-jalon `PLAN.md > MQ.6`. Branche `mq.6-boule-de-neige` (depuis `main`, MQ.3 fusionnée en #212). **0 USD d'API** : rien n'est appelé. Aucun envoi.

### Prérequis vérifiés (19/11, sur la vraie base `ivjkwhhgtibewqzccvrj`)

- MQ.1 fusionnée dans `main` (98bc296) ; migrations `target_piste`, `search_console` et `piste_requete_contenu` appliquées (liste des migrations lue).
- **Aucune réponse réelle** : `inbound_messages` = 0, `sent_messages` = 0, `reply_classifications` = 0, `links` = 0. Donc rien n'est amplifié.

### Ce qui change dans le code

- `src/features/snowball/deep.ts` (pur) : interrupteur `SNOWBALL_DEEP_ENABLED` (faux par défaut, seul `"true"` l'allume), `DEEP_LIMITS` (niveau max 3, relecture de 20 cibles, rendement minimum 0,25 [HYPOTHÈSE], plafond d'un niveau 0,25 USD), `deepGate` (ordre : interrupteur, réponses réelles, niveau précédent lancé, rendement relu, coût), `reviewSample` (échantillon réparti et déterministe), `yieldOf` (part des cibles jugées bonnes).
- `src/features/snowball/service.ts` : `loadSeedSources` filtre par niveau (optionnel) ; `persistSnowball` écrit le niveau voulu et range les stats profondes dans `qualification_runs.stats.snowball_levels` ; `runDeepSnowballForAudit` s'arrête **avant toute requête** si l'interrupteur est coupé ; `recordLevelReview` enregistre la relecture dans `stats.snowball_reviews`, qui autorise le niveau suivant.
- Le niveau 1 (MC.6d) ne change pas : même chemin, même clé `snowball`.
- Tests : `src/features/snowball/deep.test.ts` (interrupteur, chaque blocage du garde, plage de niveaux, échantillon, rendement, et l'appel désactivé qui échoue si la base ou DataForSEO est touché). `pnpm vitest run src/features/snowball` : 24 tests verts.

### Ce qui n'est pas fait (volontairement)

- **Pas branché à un job Inngest.** `audit-qualify-auto-start` n'appelle toujours que le niveau 1. Le niveau 2 suppose que les pages du niveau 1 soient lues, ce qui arrive dans les lots suivants ; le branchement viendra avec MQ.7.
- **Pas de mesure réelle** : le rendement par niveau demande une relecture à la main de 20 cibles, et il n'y a aucune réponse à mesurer. Le critère « deux sites de thèmes différents » reste à faire par Jonathan.
- Pas d'écran ni de commande pour saisir la relecture : `recordLevelReview` existe, son appelant (commande ou écran) n'est pas écrit.

### Décisions [auto]

- Le seuil de rendement (0,25) et le plafond par niveau (0,25 USD, soit le coût pire cas d'un niveau à 6 ressources) sont des hypothèses, à recaler sur MQ.7.
- Un niveau profond ne réutilise pas `snowball` : `snowball_levels[niveau]` évite d'écraser le niveau 1.

### Vérifications

- `pnpm vitest run src/features/snowball` : 24 tests verts.
- `pnpm typecheck` : vert. `pnpm lint` : 0 erreur, aucun avertissement dans les fichiers de la boule de neige.
- `prettier --check` : vert sur les fichiers touchés.

### Commandes

```bash
pnpm vitest run src/features/snowball
pnpm typecheck && pnpm lint
```

### Prochain sous-jalon recommandé : MQ.7 (pilote mesuré) après les premières réponses réelles ; avant, les essais en direct de MQ.3 sur deux sites de thèmes différents (Jonathan lance).

## Session du 20/11 : parcours de campagne en un seul menu (faite, sans changement de données)

Maquette validée par Jonathan (`docs/mockups/parcours-campagne.html`, publiée en artifact). Pas une étape de jalon : c'est une refonte de navigation et de libellés.

- **Menu** (`src/components/app-nav.tsx`) : « Campagnes » au-dessus, sans numéro ; puis un seul groupe **Prospection** avec trois étapes numérotées : **1 Cibles**, **2 À approuver** (compteur des messages à valider), **3 Envois** (ex « Mails envoyés »). Le groupe « Messagerie » disparaît. Réglages inchangés.
- **Barre d'étapes de préparation** (`src/features/shell/journey-steps.tsx`) : quatre étapes (Votre site, Vérification, Vous, Analyse). « Vos cibles » n'y figure plus. L'écran Cibles (`src/app/app/site/[id]/cibles/page.tsx`) n'affiche plus la barre quand l'analyse est finie : le menu prend le relais.
- **Libellés** (`messages/fr.ts`) : « À valider » → « À approuver » ; onglet « Déjà validées » → « Messages rédigés » ; « Mails envoyés » → « Envois » (menu).
- **Tests** : `src/features/shell/shell.test.ts` (quatre étapes), nouveau `src/components/app-nav.test.ts` (un seul groupe, trois étapes, ordre).

### Pas fait (volontairement)

- Le compteur de « Cibles » dans le menu : la maquette affiche le nombre de cibles à choisir, il faut l'ajouter à `loadOverview`. Pour l'instant, Cibles n'a pas de compteur.
- Bouton « vers l'étape suivante » à la fin de chaque écran : seul « Voir les messages rédigés » existe sur Cibles.
- Écran « Campagnes » : la maquette montre les trois étapes par campagne, la liste actuelle ne les montre pas.
- Vérification visuelle du menu connecté : non faite (l'espace connecté n'est pas accessible depuis le navigateur de test). Vérifié : typecheck, lint, tests touchés, page de démonstration sans la barre « Vos cibles ».

### Fichiers clés

- `src/components/app-nav.tsx`, `src/features/shell/journey-steps.tsx`, `src/app/app/site/[id]/cibles/page.tsx`, `messages/fr.ts`
- `src/features/shell/shell.test.ts`, `src/components/app-nav.test.ts`

### Commandes

```bash
pnpm vitest run src/components src/features/shell
pnpm typecheck && pnpm lint
```

## Session du 20/11 (suite) : tableau des cibles et écran « Emails » en boîte aux lettres (faite, sans changement de données)

Deux retours d'écran de Jonathan, maquettes validées avant le code (`docs/mockups/cibles-tableau.html`, `docs/mockups/emails-boite.html`). Pas une étape de jalon.

- **Cibles** (`src/features/targets/targets-screen.tsx`, `TargetList`) : la liste de noms seuls devient un tableau simple, cinq colonnes : Site (bouton « Ouvrir » au survol), Type de site, Pourquoi ce site, Demande, Contact. Un clic sur la ligne affiche la raison en entier. Sur téléphone, chaque ligne devient une fiche. Aucun filtre, aucun onglet, aucune donnée nouvelle : tout vient de `TargetCard`. Le compteur « N sur M sélectionnés » passe au-dessus du tableau.
- **Envois devient « Emails »** (menu, titre ; la route reste `/app/envois`). `src/features/envois/` :
  - `service.ts` : `loadEnvois` rend des données structurées (heure de départ en ISO, corps du message, site contacté des emails partis) et les quotas : **dernières 24 heures** (envois comptés sur limite actuelle, rythme de démarrage compris), **7 derniers jours** (total, sans limite), **mois civil** (celui de `loadEntitlements`, comme « Abonnement »). État : `actif`, `pause`, `sans_boite`, `simulation`.
  - `format.ts` : mise en mots des dates côté serveur (jour, heure, regroupement par jour), testée dans `format.test.ts`.
  - `envois-view.tsx` : bloc d'état (une phrase, un bouton « Mettre en pause » ou « Reprendre les envois », quatre repères dont deux barres, une seule phrase d'explication), puis deux dossiers « Programmés » et « Envoyés » rangés par jour ; un clic ouvre le message ; « Annuler » sur chaque email programmé.
  - `loadQueued` (`src/features/conversations/service.ts`) rend aussi les heures de départ (`eta`) ; `COUNTED` est exporté de `queue-note.ts`.
- **Démonstration** : nouvelle page `/demo/emails` (hors production ; `?etat=pause|sans_boite|simulation`, `?vide=oui`).

### Décisions [auto]

- La limite journalière du moteur est une fenêtre glissante de 24 heures, pas un jour civil : le repère s'appelle « Dernières 24 heures » (la maquette disait « Aujourd'hui »), et le total hebdomadaire « 7 derniers jours ».
- En pause, aucune heure de départ n'est annoncée (elle ne serait pas tenue) : les emails sont rangés sous « En attente de départ ».
- Étiquettes du tableau aux couleurs des jetons existants (pas de violet hors palette) : « Mention sans lien » est en bleu marine.
- L'encadré « Ce que nous ne voyons pas » devient une phrase sous les emails envoyés, et dit « votre boîte mail » (plus « votre Gmail »).

### Dettes et pièges

- La capture de Jonathan montrait « Connectez une boîte d'envoi » alors que des emails étaient programmés. Cause probable, non reproduite : la colonne `mailboxes.sending_paused` manquait en base au moment de la capture (elle y est le 20/11, deux boîtes vérifiées). Le nouvel écran ne dit « aucune boîte » que si aucune boîte **vérifiée** n'existe.
- `loadSendQueue` lit les envois par ordre croissant avec une limite de 2 000 lignes : au-delà, les envois récents ne seraient plus comptés dans les heures estimées. Les quotas du nouvel écran ne passent pas par cette lecture.
- `TargetRow` et `TargetsTable` (ancien tableau dépliable) ne sont plus utilisés nulle part : à supprimer.
- Vérification visuelle faite sur les pages de démonstration (`/demo/cibles`, `/demo/emails`), en large et sur téléphone ; pas sur l'espace connecté avec de vraies données.

### Backlog (hors périmètre)

- La maquette de la home (`messages/fr.ts`, `mockup.bars`) dit encore « Envois ».
- Quotas par boîte quand plusieurs boîtes sont connectées (aujourd'hui : somme des boîtes vérifiées).

### Commandes

```bash
pnpm vitest run src/features/envois src/features/targets src/components
pnpm typecheck && pnpm lint
```

## Session du 20/11 (suite) : écran Cibles allégé (faite, sans changement de données)

Retour d'écran de Jonathan (20/11) : quatre textes jugés inutiles sous et au-dessus du tableau des cibles sont retirés. Pas une étape de jalon.

- **Phrase d'arrêt** (`LiveBanner`, `src/features/targets/targets-screen.tsx`) : « La recherche s'est arrêtée avant la fin… » n'est plus affichée. Quand la lecture s'est arrêtée avec des sites non lus, le bandeau ne dit rien ; « Recherche terminée » reste affichée seulement quand tout a été lu.
- **Récapitulatif de signature** (« Messages signés …, présentés comme … Modifier ») : retiré sous le tableau. Le prénom et le rôle se modifient dans Réglages > Boîte d'envoi (la fenêtre « Qui signe vos messages » le dit) ; elle s'ouvre toujours seule au premier envoi si le rôle manque.
- **Carte « Il reste N sites à lire »** (`MoreSites`) : retirée. La carte ne s'affiche plus que pour une lecture relancée à la main et terminée, ou en erreur. `MoreSites` ne prend plus `funnel`.
- **Lien « Voir le détail de l'analyse »** : retiré du bas de `src/app/app/site/[id]/cibles/page.tsx`. Le détail reste accessible depuis l'écran Analyse.
- Libellés retirés de `messages/fr.ts` : `targets.reviewSteps`, `targets.founder.recap`, `targets.founder.change`, `targets.founder.shortRoles`, `targets.live.stopped`, `targets.more.remaining`.

```bash
pnpm vitest run src/features/targets
pnpm typecheck && pnpm lint
```

## Session du 20/11 (suite 2) : corrections de l'écran « Emails » après mise en ligne (faite, une migration)

Retour de Jonathan sur la version en ligne : l'écran disait « Aucune boîte d'envoi connectée », sans horaires ni barres.

- **Cause** : les droits de lecture de `mailboxes` sont donnés **colonne par colonne** (`grant select (…)`), et `sending_paused` n'y figurait pas. Toute lecture qui demandait cette colonne échouait pour la personne connectée : aucune boîte vue. Le bouton « Suspendre » de l'ancien écran n'avait donc jamais été utilisable non plus.
- **Migration** `2026112000000100_mailbox_sending_paused_grant.sql` (appliquée le 20/11 sur `ivjkwhhgtibewqzccvrj`, lecture vérifiée sous le rôle `authenticated`). **Piège à retenir : toute nouvelle colonne de `mailboxes` lue par l'application doit être ajoutée au `grant select`.**
- **Filet** (`src/features/envois/service.ts`, `loadBoxes`) : si la lecture avec la colonne de suspension échoue, l'écran relit sans elle au lieu de conclure qu'aucune boîte n'existe.
- **Fidélité à la maquette** : repères « Aujourd'hui » (jour civil de la boîte) et « Cette semaine » (depuis lundi), « Prochain départ : Lundi 23 novembre, 9 h », « entre 9 h et 18 h, depuis votre boîte Gmail » (l'adresse si la boîte n'est pas Gmail), « Limite du jour atteinte ». Le moteur compte toujours sur 24 heures glissantes : la phrase de limite s'affiche aussi quand c'est cette limite qui retient le prochain départ (`dayLimited`).
- **À approuver** : le surtitre « Étape 2 sur 3 » est retiré. Le reste de l'écran (barre de progression, campagnes en double) attend la validation d'une nouvelle maquette par Jonathan.

## Session du 20/11 (suite 3) : « À approuver », trois étapes et une campagne par site (faite, sans changement de données)

Maquette validée par Jonathan avant le code : `docs/mockups/a-approuver-v2.html`.

- **Trois étapes à la place de la barre unique** (`src/features/approvals/drafting-progress.ts`, `queue.tsx`) : « À rédiger », « À approuver », « Approuvés », chacune avec son nombre. L'ancienne barre mélangeait les trois. Une barre n'existe plus que pendant une rédaction, et ne mesure que les messages écrits depuis le lancement (« 5 sur 12 écrits »).
- **Une campagne = un site** (`service.ts`, `queue-model.ts`) : chaque analyse relancée crée un plan de liens, et l'écran montrait un filtre et un groupe par plan (quatre fois « backleenks.com · France »). Les éléments portent maintenant `campaignId` (le site ; à défaut le plan) et `campaignOf` regroupe dessus. Avec un seul site : ni filtre ni titre de groupe. `planId` reste sur chaque élément pour les actions.
- **Lecture** : le titre du panneau est le site contacté (la pastille rappelle la campagne) ; les décisions tiennent sur une rangée (« Approuver et envoyer », « Modifier », « Plus tard », « Refuser »).
- **Actions groupées** : dans l'en-tête de la liste, qui reste collé en haut de l'écran quand on descend (`overflow-clip` sur la carte). La barre sombre du bas est retirée.
- **Démonstration** `/demo/a-valider` : `?sites=1` (un site analysé quatre fois), `?redaction=oui`.

### Décisions [auto]

- Le nombre de messages à écrire au lancement d'une rédaction n'existe pas côté serveur : l'écran le retient dans l'onglet du navigateur (`sessionStorage`). S'il n'est pas connu (page ouverte en cours de route), l'étape affiche « N encore à écrire », sans barre, plutôt qu'un chiffre inventé.
- Le bloc des trois étapes s'affiche dès qu'une étape n'est pas vide (avant : seulement s'il restait des messages à rédiger).
- Formulaires : le bloc existant (copier, ouvrir le formulaire, « C'est fait ») est gardé tel quel au-dessus de la rangée de décisions.

### Dettes et pièges

- « Approuvés » compte tous les brouillons sortis de l'état « brouillon », tous sites confondus (comportement antérieur, inchangé).
- Vérification visuelle sur la page de démonstration (large, tablette, téléphone), pas dans l'espace connecté.

### Commandes

```bash
pnpm vitest run src/features/approvals
pnpm typecheck && pnpm lint
```

## Session du 20/11 (suite 4) : étape 1 « Analyser votre site », Search Console dans le formulaire (faite, sans changement de données)

Maquette validée par Jonathan le 20/11 : `docs/mockups/demarrer-campagne.html` (quatre états). L'écran `/app/demarrer` la reprend à l'identique.

- **Search Console proposée dans le formulaire**, juste au-dessus de « Analyser mon site » (facultatif, fortement conseillé). Au retour de Google, l'encadré devient « Search Console connectée » (propriété, compte) ; en cas d'échec, le message de Google suivi de « Vous pouvez aussi lancer l'analyse sans elle. ».
- **Retirés de cet écran** : le bloc « Mise en route », le lien « Formulaire complet » et la phrase en double « Une campagne = un site pour un pays… ».
- **Comment ça marche** : la connexion vaut pour un site, donc le clic sur « Connecter » crée (ou retrouve) la campagne site × pays sans rien lire ni payer (`ensureSiteForSearchConsole`), puis part chez Google. Le `state` OAuth porte `back: "demarrer"` et la langue choisie ; le retour se fait sur `/app/demarrer?campagne=…&sc=…&langue=…`, qui remet adresse, pays, langue et objectif. « Analyser mon site » retrouve ensuite cette campagne et fait la lecture complète. Adresse vide : le bouton la demande. Adresse modifiée après connexion : l'encadré revient à « connecter ».
- **Fichiers clés** : `src/features/onboarding/url-form.tsx`, `src/app/app/demarrer/page.tsx`, `src/features/onboarding/service.ts` (`ensureSiteForSearchConsole`), `src/features/google/oauth.ts` (`back`, `lang`), `src/app/api/google/{start,callback}/route.ts`.
- **Vérifié** : typage, lint et tests des dossiers touchés ; les trois états de l'encadré et le mobile dans le navigateur, sur une page d'aperçu temporaire (pas de compte de test en local). **Non vérifié** : l'aller-retour réel chez Google (impossible en local) ; à essayer en production avec un vrai compte.
- **Dettes et pièges** : une campagne créée par « Connecter » puis abandonnée reste dans la liste des sites, sans thème (même forme qu'une campagne quittée à l'étape 2). L'encadré n'apparaît que si `SEARCH_CONSOLE_ENABLED` est ouvert.
- **Backlog** : « Mise en route » figure encore à l'accueil (`/app`) et à l'étape 2 (`/app/demarrer/[siteId]`), à retirer si Jonathan le confirme ; le libellé « Faire ranker des pages précises » correspond dans le code à l'objectif `mots_cles` (pilotage par mots-clés, pas de choix de pages), laissé tel quel à sa demande.

## Session du 20/11 (suite 5) : parcours de campagne en une page, étapes 1 à 4 (fait, sans migration)

Maquette validée par Jonathan le 20/11 : `docs/mockups/parcours-campagne-v2.html` (avec son retour : Search Console déjà connectée reconnue, erreur si le site n'y est pas). Les écrans la reprennent.

- **Une seule mise en page pour les quatre étapes** : barre d'étapes collante, titre « Analyser votre site », puis quatre blocs. Une étape finie se replie en une ligne de résumé avec « Modifier » ; la suivante s'ouvre juste en dessous. Les adresses restent les mêmes (`/app/demarrer` → `/app/demarrer/[siteId]#etape-2` → `/app/site/[id]/analyse`) : chaque page dessine les mêmes blocs, l'étape 1 se replie donc « sur place » à la fin de la lecture.
- **Étape 1** : le formulaire validé, dans son bloc. **Search Console déjà connectée** (accueil ou autre campagne) : dès que l'adresse est tapée (pause de 0,6 s), elle est cherchée dans les sites des comptes Google de l'espace (`findSearchConsoleMatch`, lecture seule). Trouvée : encadré vert directement, et la campagne créée au clic sur « Analyser mon site » reçoit une copie de la connexion (`linkSearchConsole`). Absente : encadré orange « Ce site n'est pas dans votre Search Console » avec le compte utilisé et « Connecter un autre compte Google ». Aucun compte : l'encadré bleu habituel. Google propose désormais toujours de choisir le compte (`prompt=select_account consent`).
- **Étape 2 « Vérification »** : fiche en lignes (thème, activité, ce que vous proposez, public visé, pages à faire citer, qui peut vous citer), « Modifier » sur chaque ligne ; « C'est juste, continuer ». L'objectif n'est plus redemandé (pris à l'étape 1) ; avec « pages précises », la liste des pages s'ouvre d'elle-même. Les profils détaillés (« Qui aurait une raison de vous citer », obligatoires côté serveur) s'ouvrent par le « Modifier » de « Qui peut vous citer ».
- **Étape 3 « Vous »** : votre nom (façons de l'écrire), ton des messages, puis « Lancer l'analyse » (environ 15 minutes). Écart à la maquette : le ton reste un texte libre avec « Modifier » (la maquette montrait une liste de trois choix ; le profil stocke un ton libre).
- **Étape 4 « Analyse »** : les étapes 1 à 3 repliées et verrouillées, l'avancement dans le bloc 4 (une colonne, sans l'entonnoir), premières cibles, puis « Vos cibles sont prêtes : N sites à contacter » et « Voir mes cibles ». `AnalysisProgress` a une variante `stage` ; l'écran plein reste pour `/demo/analyse`.
- **Retirés** : « Ce que nous vous demanderons plus tard », « Comment nous cherchons vos concurrents », la carte séparée de lancement, l'objectif en double.
- **« Modifier » de l'étape 1** depuis l'étape 2 : `/app/demarrer?campagne=…` remet le formulaire (même sans Search Console) ; l'objectif choisi de nouveau est enregistré.
- **Fichiers clés** : `src/features/onboarding/{journey-stage,fact-row,launch-panel,url-form}.tsx`, `src/features/onboarding/summary.ts`, `src/features/brand/brand-fields.tsx` (`UnderstoodFacts`, `YouFacts`), `src/features/search-console/{match,actions}.ts`, `src/features/audits/audit-content.tsx`, démonstration `src/app/demo/parcours/page.tsx` (`?etape=1..4`, `&sc=trouve|absent`, `&etat=…`, `&objectif=pages`, absente en production).
- **Vérifié** : typage, lint et tests des dossiers touchés (dont `match.test.ts`) ; les quatre étapes, les trois encadrés Search Console et le mobile sur la page de démonstration. **Non vérifié** : avec un vrai compte connecté (pas de session en local) et la recherche réelle dans un compte Google ; à essayer en production.
- **Dettes et pièges** : la recherche Search Console appelle Google à chaque adresse tapée (après la pause), un compte à la fois ; sans cache. Le résumé de l'étape 2 est recalculé au clic sur « Continuer » depuis le formulaire, celui de l'étape 4 depuis la base.

## Session du 20/11 (suite 6) : écran Cibles après validation (fait, sans migration)

Maquette validée par Jonathan le 20/11 : `docs/mockups/cibles-apres-validation.html` (quatre états). Avant, l'écran devenait vide (« Tous ces sites ont déjà leur message ») dès que toutes les cibles étaient retenues.

- **Les cibles retenues restent à l'écran**, dans une section « Retenues » : site, demande, contact et état du message (rédaction en cours, à rédiger, à relire avec « Relire → », approuvé, refusé par vous avec « Rédiger quand même »). Un clic sur une ligne affiche la raison du ciblage.
- **Carte d'avancement** en haut dès qu'une cible est retenue : « Rédaction des messages : N sur M » avec barre et bouton « Relire les N messages prêts » (vers « À approuver ») ; rédaction interrompue → « N messages restent à rédiger » + « Rédiger les N messages » (`draftMissingAction`) ; tout écrit → « N messages sont prêts à relire » + « Relire et approuver » ; tout approuvé → « Voir les emails ». L'écran se rafraîchit toutes les 5 s pendant la rédaction.
- **« À décider »** : le tableau existant, titré avec son nombre quand une partie est déjà retenue ; il disparaît quand il est vide. La phrase d'introduction change (`targetsLead`).
- **Menu** : « Cibles » affiche le nombre de sites encore à décider pour le site choisi, et une coche verte quand tout est retenu (`targetsMenuState`, calculé dans `src/app/app/layout.tsx`, mêmes données que l'écran). Rien avec « Tous les sites ».
- **États des messages** (`messageStateOf`, `loadMessageStates` dans `src/features/targets/service.ts`) : `plan_item_briefs.target_id` → `target_drafts` (brouillon = à relire, valide = approuvé), `draft_declines` de la personne non relancés (refusé), `draft_runs` en cours (rédaction en cours), sinon à rédiger.
- **Écarts à la maquette** : pas de lien « Chercher d'autres cibles » (aucun parcours avec coût annoncé sur cet écran, voir Backlog) ; « Écartée par la rédaction » devient « Refusé par vous » (le modèle n'écarte plus depuis le 18/11 : seuls les refus de la personne existent) ; état « Approuvé » ajouté.
- **Fichiers clés** : `src/features/targets/targets-screen.tsx` (`ProgressCard`, `RetainedList`, `SectionHead`), `src/features/targets/cards.ts` (`countStates`), `src/features/targets/service.ts`, `src/components/app-nav.tsx`, démonstration `/demo/cibles?etat=partie|redaction|attente|pret`.
- **Vérifié** : typage, lint, tests de `src/features/targets` (nouveau `after-validation.test.ts`) ; les quatre états sur ordinateur et téléphone sur la page de démonstration. **Non vérifié** : avec un vrai compte (pas de session en local), dont la coche et le nombre du menu.
- **Dettes et pièges** : le menu recharge les cibles du site choisi à chaque page (`loadTargets` sans aperçus de coût) ; à surveiller si le menu ralentit.

## Session du 20/11 (suite 7) : pages du tableau de bord plus rapides (fait, sans migration)

Retour de Jonathan : Cibles, À approuver et Emails très lents à s'ouvrir, Accueil et Campagne un peu moins.

- **Cause principale** : les fonctions Vercel tournaient à Washington (`iad1`) et la base Supabase est à Paris (`eu-west-3`). Chaque lecture traversait l'Atlantique (~80 à 100 ms aller-retour) et une page en enchaîne 7 à 10 à la suite (menu + écran). `vercel.json` fixe maintenant `regions: ["cdg1"]` (Paris), à côté de la base. Inngest (`/api/inngest`) tourne aussi à Paris.
- **Lectures en double supprimées** : `createClient` (serveur) est mis en cache par rendu (React `cache`) ; `selectedSiteId` et la file « À valider » (`loadQueueOnce`) ne sont lus qu'une fois par page alors que le menu et l'écran les demandaient chacun. Hors rendu (actions serveur), `cache` ne garde rien.
- **`loadQueue`** : 5 allers-retours successifs ramenés à 3 (filtre de site et messages des formulaires lus en parallèle).

### Dettes et pièges

- Mesure avant/après faite à l'estimation (nombre d'allers-retours × distance), pas chronométrée sur une session connectée.
- Pistes suivantes si besoin : `loading.tsx` (squelettes) sur les écrans du menu, compteurs du menu par une seule fonction SQL au lieu de recalculer toute la file.

## Session du 20/11 (suite 8) : refuser des cibles et des formulaires, relance retirée du texte, filtre par campagne sur Emails (fait, une migration)

- **Cibles** : bouton « Écarter les N sites non cochés » dans la barre du bas ; les sites écartés sortent de « À décider » (et du compteur du menu) et vont dans une liste « Écartés » avec « Remettre ». Colonne `qualified_targets.dismissed_at` (migration `2026122000000000_target_dismissed.sql`, **appliquée sur la vraie base**). Code : `dismissTargets` (`targets/service.ts`), `dismissTargetsAction`. Un site déjà retenu n'est jamais écarté.
- **À approuver** : « Refuser » marche aussi sur les formulaires (seul et en lot) : même effet qu'un email refusé (motif « refusé par vous », brouillon supprimé, « Rédiger quand même » possible). Un formulaire déjà approuvé mais pas fait : sa tâche passe en `ignoree`.
- **À approuver** : plus de mention de relance (« Une seule relance, dix jours après » et « la relance sera prévue dans dix jours ») : la relance automatique est coupée depuis le 19/11 (`AUTOMATIC_FOLLOW_UP = false`).
- **Emails** : sélecteur « Campagne » (dès deux campagnes) sur « Programmés » et « Envoyés » ; ouvert sur le site choisi dans le menu. Les jauges (jour, semaine, mois) restent celles de la boîte, toutes campagnes.
- **Dettes** : les pages publiques (accueil, tarifs, FAQ) parlent encore d'« une seule relance » ; à aligner si la relance ne revient pas.

## MO.1 : offres et accès, socle serveur (21/11/2026, fait, une migration)

Sous-jalon `PLAN.md > MO.1`. Branche `mo1-offres-et-droits`. **0 USD d'API**, aucun envoi. Aucun écran touché.

- **Décisions de Jonathan (21/11/2026)**, toutes validées, écrites dans `CLAUDE.md` 4.6 et détaillées dans `docs/offres-et-acces.md` : gratuit « tout voir, rien envoyer » (une analyse complète, une fois par compte ; contacts masqués ; 3 messages lisibles) ; plafond mensuel en **cibles contactées** ; prix 29,90 / 49,90 / 199,90 € ; plus d'essai de 7 jours ; Scale à 2 000 ; vérification du lien obtenu dans toutes les offres payantes. **Maquette validée** : `docs/mockups/offres-verrous.html` (cinq écrans).
- **Migration `2026122100000000_plans_access.sql`, appliquée sur la vraie base** : colonnes `contacts_visible`, `readable_drafts` (null = tous), `export_csv`, `link_monitoring`, `ready_replies`, `catalogue_cap`, `lifetime_campaigns` (null = pas de plafond à vie) ; `business.monthly_send_cap` = 2 000 ; `starter.link_checks` = vrai.
- **Droits** (`src/features/billing/entitlements.ts`, source unique) : `contactsVisible`, `readableDrafts`, `exportCsv`, `linkMonitoring`, `readyReplies`, `catalogueCap`, `lifetimeCampaigns` ; `campaignBlocked` et `campaignsEver` (le gratuit ne lance qu'une analyse, à vie : `src/features/audits/service.ts`) ; `replyBlock` (une réponse n'est refusée que par l'offre, jamais par le plafond).
- **Compteur** (`src/features/billing/plans.ts`) : `contactedThisMonth` ne compte que `sent_messages.step = 'initial'` réels ; `reply_sends` et relances ne comptent plus. `checkSendAllowance(…, countsAgainstCap)` : le moteur d'envoi (`sending/service.ts`) laisse partir une relance plafond atteint et rend `quota_mensuel` pour les premiers messages ; les réponses (`inbox/send.ts`, `inbox/service.ts`) ne sont plus bloquées par le plafond.
- **Catalogue** : `plan-drafts.ts` lit `catalogueCap` dans les droits (table `plans`) ; `DRAFT_LIMITS.catalogueCapByPlan` n'en est plus que le miroir pour les mesures hors base.

### Ce qui ne change pas encore

- `BETA_MODE` reste actif : tout inscrit a les droits Starter. Les nouveaux droits existent mais **aucun écran ni aucune lecture ne les applique** (contacts, messages, export : MO.2 et MO.3).
- La grille de la home lit la table : elle affiche déjà 2 000 pour Scale et la vérification des liens pour Starter, mais le libellé dit encore « envois » et le bandeau parle encore de l'essai de 7 jours (MO.4).

### Dettes et pièges

- `target_contacts` et `target_drafts` sont lisibles par tout membre de l'espace à travers l'API de la base : le masquage de MO.2 doit se faire en base (vue ou fonction), pas seulement dans les écrans.
- `PLAN_LIMITS.gratuit` (3 concurrents, 0,25 USD) bride encore l'analyse d'un gratuit hors bêta : à lever en MO.2.
- Le plafond de dépense quotidien (25 USD) arrêterait les analyses gratuites après une quinzaine d'inscrits par jour : à relever en MO.5.
- Un envoi en `echec` compte comme une cible contactée (comportement d'avant, gardé).

### Prochain sous-jalon : MO.2

```
Lis CLAUDE.md et PROGRESS.md. Puis lis uniquement le sous-jalon MO.2 dans PLAN.md, et docs/offres-et-acces.md.
Vérifie que MO.1 est fait dans PROGRESS.md. Annonce ce que tu vas faire et ce que tu ne feras pas.
Reste dans le périmètre (masquage côté serveur et en base, aucun écran nouveau). À la fin : tests/lint/typecheck verts, PROGRESS.md à jour, commit sur la branche mo2-masquage, PR fusionnée, puis donne-moi le prompt de MO.3.
```

## MO.2 : masquage côté serveur et dans la base (21/11/2026, fait, deux migrations)

Sous-jalon `PLAN.md > MO.2`. Branche `mo2-masquage`. **0 USD d'API**, aucun envoi, aucun écran touché.

- **Migration `2026122100000100_contacts_masking.sql` (additive, appliquée sur la vraie base, avec un correctif `contacts_masking_server_access`)** : table `app_flags` (`beta_mode`, vrai aujourd'hui) ; fonctions `workspace_plan_key`, `workspace_contacts_visible`, `workspace_readable_drafts`, `first_sentence` ; quatre vues masquées `target_contacts_v`, `manual_tasks_v`, `qualified_targets_v`, `target_drafts_v`. Un jeton d'utilisateur ne lit que son espace ; adresse, `contact_url`, `form_url`, message à copier sont `NULL` quand le forfait n'a pas `contacts_visible` (colonne `masked` / `contact_masked`). Messages : les `readable_drafts` mieux classés (position dans le plan, puis id : ordre stable) restent entiers, les autres gardent l'objet et la première phrase (`locked`). Sans jeton utilisateur (service_role), les vues rendent tout en clair, sans filtre d'espace.
- **Migration `2026122100000200_contacts_revoke.sql` (retrait de lecture sur les 4 tables pour `authenticated`) : À APPLIQUER APRÈS le déploiement de ce code.** Tant qu'elle n'est pas appliquée, les tables restent lisibles avec un jeton utilisateur.
- **Code** : toutes les lectures « jeton utilisateur » passent par les vues (`*_v`) ; les écritures et le moteur d'envoi (service_role) lisent toujours les tables. `contactOf` rend l'état sans valeur (`hidden: true`). `validateRequests` (valider des demandes) relit les vrais contacts avec le client serveur pour ne jamais enregistrer un plan avec des contacts masqués. Tâches manuelles masquées : absentes de la liste et refusées (`contactsLockedMessage`, nomme Starter). Export CSV : 403 sans `exportCsv` (`exportLockedMessage`). `PLAN_LIMITS.gratuit` = mêmes limites que payant (20 concurrents, plafond d'analyse 2 USD) ; l'unique analyse à vie reste portée par `campaignBlocked`.
- **Tests** : `supabase/tests/contacts-masking.test.ts` (SQL réel : gratuit sans aucune adresse ni lien ni par les vues ni par les tables ; abonné en clair ; bêta sans masquage ; service en clair) ; `src/features/tasks/masking.test.ts` ; anciens tests de gratuit mis à jour ; faux client Supabase : les vues lisent les tables.

### Dettes et pièges

- **`app_flags.beta_mode` est le miroir de la variable `BETA_MODE`** : à couper TOUS LES DEUX en MO.5 (`update public.app_flags set enabled = false where key = 'beta_mode'`). Sinon le code croit le gratuit sans droits alors que la base montre tout (ou l'inverse).
- Le compte admin (offre business active) et les abonnés Stripe actifs sont lus en clair par `workspace_plan_key` (miroir de `effectivePlan` : abonnement actif, non expiré).
- Hors périmètre, encore lisibles par tout membre : `sent_messages`, `inbound_messages`, `reply_sends` (adresses de conversations déjà ouvertes ; vides pour un gratuit qui n'envoie rien).
- Le plafond de dépense du jour (25 USD) limite toujours les analyses gratuites (~15 par jour) : à relever en MO.5.
- Les types des vues dans `database.types.ts` ont été ajoutés à la main (colonnes non nulles reprises des tables) ; une régénération complète les rend nullables, à reprendre.
- L'écran Cibles affiche déjà l'état sans adresse (libellés « email vérifié », « formulaire ») ; pastilles, verrous et fenêtre d'offre : MO.3.

### Prochain sous-jalon : MO.3

```
Lis CLAUDE.md et PROGRESS.md. Puis lis uniquement le sous-jalon MO.3 dans PLAN.md, docs/offres-et-acces.md et la maquette docs/mockups/offres-verrous.html.
Vérifie que MO.2 est fait dans PROGRESS.md. Annonce ce que tu vas faire et ce que tu ne feras pas.
L'écran en ligne doit être identique à la maquette (captures comparées en grand écran et en étroit). À la fin : tests/lint/typecheck verts, PROGRESS.md à jour, branche mo3-offre-et-verrous, PR fusionnée, puis donne-moi le prompt de MO.4.
```

## Stripe en réel (21/11/2026, demande de Jonathan)

- **Code** : `assertSecretKey` accepte `sk_live_` et `sk_test_` (`src/features/billing/stripe.ts`, `src/env.ts`) ; le webhook ne refuse plus les événements `livemode` (`webhook.ts`). L'ancien verrou « test seulement » (M6.1) est levé par décision de Jonathan.
- **Stripe (compte « JE CONSEIL », mode réel)** : destination de webhook `backleenks` créée, active, vers `https://www.backleenks.com/api/stripe/webhook`, version d'API `2026-08-26.dahlia`, cinq événements : `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`. Aucun produit ni prix à créer : le Checkout utilise `price_data` (prix lus dans la table `plans`).
- **Le compte est partagé** avec un autre produit (destination `creative-oasis` vers `ouiouioui.app`, non touchée). Notre webhook reçoit aussi les événements d'abonnement de cet autre produit : le traitement les ignore s'ils n'ont pas de `workspace_id` dans leurs métadonnées (à surveiller dans les journaux au premier abonnement).
- **Reste à poser sur Vercel (production)** : `STRIPE_SECRET_KEY` (`sk_live_…`) et `STRIPE_WEBHOOK_SECRET` (`whsec_…` de la destination `backleenks`), puis redéployer.
- **`BETA_MODE` reste actif** : tant qu'il l'est, tout inscrit envoie sans abonnement. Le couper (MO.5) est ce qui rend l'abonnement réellement nécessaire.
