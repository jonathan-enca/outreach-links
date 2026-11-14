# PROGRESS.md

## État

| Sous-jalon  | Statut                                                                                                                                                            | PR                                                             | Date       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| M0.1        | fait                                                                                                                                                              | [#1](https://github.com/jonathan-enca/outreach-links/pull/1)   | 2026-11-14 |
| M0.2        | fait (connexion par lien magique testée avec succès par Jonathan sur le site en ligne)                                                                            | PR M0.2, M0.2b, M0.2c                                          | 2026-11-14 |
| M0.3        | code fait et fusionné ; production Inngest bloquée (clés manquantes, voir « À fournir par Jonathan »)                                                             | [#7](https://github.com/jonathan-enca/outreach-links/pull/7)   | 2026-11-14 |
| M0.4        | fait (Lighthouse mobile 98/100/100/100 sur `/` et `/connexion`)                                                                                                   | [#6](https://github.com/jonathan-enca/outreach-links/pull/6)   | 2026-11-14 |
| M1.1        | fait (client DataForSEO testé sur fixtures synthétiques ; appel réel non fait, voir « À fournir »)                                                                | [#12](https://github.com/jonathan-enca/outreach-links/pull/12) | 2026-11-14 |
| M1.2        | fait (onboarding du site et vérification de propriété ; pas de test Playwright)                                                                                   | [#11](https://github.com/jonathan-enca/outreach-links/pull/11) | 2026-11-14 |
| M1.3        | fait (migration appliquée sur le vrai projet ; run réel DataForSEO non fait, voir « À fournir »)                                                                  | [#14](https://github.com/jonathan-enca/outreach-links/pull/14) | 2026-11-14 |
| M1.4        | fait (pipeline testé sur fixtures ; run réel DataForSEO Backlinks non fait, voir « À fournir »)                                                                   | [#16](https://github.com/jonathan-enca/outreach-links/pull/16) | 2026-11-14 |
| M1.5        | fait (pipeline testé sur fixtures ; run réel DataForSEO non fait ; client LLM créé)                                                                               | [#18](https://github.com/jonathan-enca/outreach-links/pull/18) | 2026-11-14 |
| M1.6        | fait (migration appliquée sur la vraie base le 14/11 via l'API de gestion Supabase ; formulaire sans effet réel tant que les clés Inngest et DataForSEO manquent) | [#20](https://github.com/jonathan-enca/outreach-links/pull/20) | 2026-11-14 |
| M2.1        | fait (génération testée sur fixtures ; aucun run réel DataForSEO ; migration appliquée sur la vraie base)                                                         | PR M2.1                                                        | 2026-11-14 |
| M2.2 à M7.3 | à faire                                                                                                                                                           |                                                                |            |

## Décisions prises

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

## Commandes (dev, tests, migrations, Inngest)

`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build` (voir README). Résumé LLM réel (jeu d'évaluation, plafond 0,10 USD) : `NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:llm`. Démo DataForSEO : `pnpm demo:dataforseo` (clés requises). Audit réel : `pnpm demo:audit` (crée un vrai audit en base ; exige `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`). Build local : exige `NEXT_PUBLIC_APP_URL` et les variables Supabase publiques. Tests de RLS : `TEST_DATABASE_URL=postgres://user@host:port/postgres pnpm test` (Postgres 16 avec un superutilisateur ; une base temporaire est créée puis supprimée ; ignorés si la variable manque en local, obligatoires en CI). Migrations : fichiers dans `supabase/migrations`, appliqués par la CLI Supabase (`supabase db push`). Types : `pnpm db:types`. Inngest en local : `pnpm dev`, puis dans un autre terminal `pnpm inngest:dev` (dev server Inngest, doit rester sur le port 8288) ; enregistrer l'app : `curl -X PUT http://localhost:3000/api/inngest` ; événement d'essai : `curl -X POST http://localhost:8288/e/dev -H 'content-type: application/json' -d '{"name":"app/health.ping","data":{}}'`.

## Mesures (coût par audit, taux de contact, etc.)

- M0.3 : essai local de la fonction `health` = 0 USD (fournisseur `internal`, appel factice). Aucune dépense DataForSEO ni LLM à ce jour.
- M0.4 : Lighthouse mobile (Chrome headless sur `next start`) : `/` et `/connexion` = performance 98, accessibilité 100, bonnes pratiques 100, SEO 100. Pages `/app/*` non mesurées (derrière la connexion).

- M1.1 : aucun coût réel mesuré (appel impossible, 40100), dépense 0 USD. Estimations : SERP top 30 = 0,006 USD ; Labs limit 100 = 0,02 USD ; Backlinks limit 1000 = 0,05 USD ; Backlinks summary = 0,02 USD.
- M1.2 : 0 USD ; 65 tests Vitest verts dont 22 de RLS sur Postgres réel.
- M1.3 : coût estimé d'un audit gratuit = 0,018 USD (3 requêtes x 0,006 USD, SERP live top 30), plafond gratuit 0,25 USD. Coût réel non mesuré (DataForSEO 40100), dépense 0 USD ; sur fixtures réel = estimé. 156 tests verts dont 8 de RLS pour les audits ; lint, typecheck, format et build verts (build vérifié en CI).
- M1.4 : fixture synthétique de 28 liens : 11 conservés, 17 écartés (interne 2, plateforme 2, spam 5, images réutilisées 3, étranger 4, doublon 1). Coût réel non mesuré (40100), dépense 0 USD.
- M1.5 : évaluation réelle du résumé sur OpenAI `gpt-4o-mini` : 6 cas, 6 appels, 0 promesse de classement, 0,00089 USD le dernier passage. Dépense de la session : ~0,0017 USD OpenAI, 0 USD DataForSEO. Coût réel du profil non mesuré (estimé gratuit ~0,143 USD).

## Dettes et pièges

- Vercel : le projet avait `framework: null` (tout en 404). Corrigé en `nextjs` via l'API le 14/11/2026 ; production redéployée et vérifiée (`/` 200, `/connexion` 200, `/app` redirige vers `/connexion`).
- Reste : confirmer que `NEXT_PUBLIC_APP_URL` vaut `https://outreach-links.vercel.app` (valeur masquée dans Vercel).

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

## Backlog (idées hors périmètre)

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

M2.2 (chasseur 404, voir PLAN.md) puis M2.3 (écran Plan de liens). En parallèle, finir la mise en production d'Inngest (clés `INNGEST_EVENT_KEY` et `INNGEST_SIGNING_KEY`) et le run réel DataForSEO (retester d'abord avec `NODE_USE_ENV_PROXY=1` dans l'environnement agent) dès que Jonathan fournit les identifiants.
