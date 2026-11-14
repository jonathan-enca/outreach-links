# PROGRESS.md

## État

| Sous-jalon  | Statut                                                                                                         | PR                                                           | Date       |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| M0.1        | fait                                                                                                           | [#1](https://github.com/jonathan-enca/outreach-links/pull/1) | 2026-11-14 |
| M0.2        | partiel : code, migrations et tests de RLS faits ; projet Supabase et parcours réel non vérifiés (voir Dettes) | PR M0.2                                                      | 2026-11-14 |
| M0.3 à M7.3 | à faire                                                                                                        |                                                              |            |

## Décisions prises

- Produit : outreach IA de backlinks gratuits, audit d'abord, français d'abord (voir CLAUDE.md).
- Pas de mention de l'IA dans les emails d'outreach ; le site vend l'automatisation par IA.
- Plafonds d'envoi intégrés au pricing ; audit gratuit à coût plafonné.
- Règle de travail : utiliser au maximum les MCP et CLI disponibles pour toutes les tâches techniques (voir CLAUDE.md section 15).
- Dépôt GitHub : `jonathan-enca/outreach-links` (nom provisoire du produit, pas de domaine défini).

## Fichiers et modules clés

- `src/env.ts` : validation zod des variables (`parseEnv`, `env`) ; importé par `next.config.ts` (build) et `layout.tsx` (runtime). Toute variable nouvelle s'ajoute ici et dans `.env.example`.
- `messages/fr.ts` + `src/lib/messages.ts` (`t`) : toutes les chaînes de l'interface.
- `src/{app,lib,server,features}` : structure de base.
- `.github/workflows/ci.yml` : lint, typecheck, format, test, build.

- `supabase/migrations/20261114000100_core_schema.sql` : `workspaces`, `memberships`, `sites`, `events`, RLS, trigger `handle_new_user` (workspace + membership owner à l'inscription). Écriture client sur `workspaces`/`memberships` interdite (pas d'insert) ; `events` en ajout seul.
- `supabase/tests/bootstrap.sql` (imite rôles et `auth.uid()` de Supabase) et `supabase/tests/rls.test.ts` (11 tests de RLS sur un vrai Postgres).
- `src/lib/supabase/{client,server,database.types}.ts`, `src/proxy.ts` (session + protection de `/app`), `src/app/connexion`, `src/app/auth/callback`, `src/app/app`.

## Commandes (dev, tests, migrations, Inngest)

`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build` (voir README). Tests de RLS : `TEST_DATABASE_URL=postgres://user@host:port/postgres pnpm test` (Postgres 16 avec un superutilisateur ; une base temporaire est créée puis supprimée ; ignorés si la variable manque en local, obligatoires en CI). Migrations : fichiers dans `supabase/migrations`, appliqués par la CLI Supabase (`supabase db push`). Types : `pnpm db:types`. Inngest : à venir (M0.3).

## Mesures (coût par audit, taux de contact, etc.)

(à remplir)

## Dettes et pièges

- Next 16 : lire `node_modules/next/dist/docs/` avant d'utiliser une API (voir `AGENTS.md`). `LayoutProps` est généré par `next build`/`dev` : ne pas l'utiliser, le typecheck CI tourne avant le build.
- Tailwind v4 passe par `@tailwindcss/postcss` (`postcss.config.mjs`). Le chargeur `@tailwindcss/turbopack` livré par create-next-app ne traitait pas `@theme`.
- `.env.example` est dé-ignoré dans `.gitignore` ; `.env*` reste ignoré sinon.
- Vitest en `vitest.config.mts` (évite l'avertissement ESM).
- `NEXT_PUBLIC_APP_URL` doit être définie sur Vercel (Preview et Production) ; valeur provisoire à remplacer quand le domaine est choisi.
- En session Claude, `gh pr create` échoue (GraphQL bloqué) : ouvrir les PR via `gh api repos/{owner}/{repo}/pulls --input fichier.json`.
- Après `prettier --write .`, vérifier que les modifications de documents par script ont bien été appliquées.

- M0.2 non vérifié de bout en bout : aucun projet Supabase n'existe encore (pas d'accès ici). À faire par Jonathan : créer le projet, y appliquer les migrations, renseigner `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (local, Preview, Production), ajouter `/auth/callback` aux URL de redirection autorisées, puis tester inscription, connexion et déconnexion.
- `database.types.ts` écrit à la main au format de `supabase gen types` (CLI et Docker indisponibles ici) : le régénérer avec `pnpm db:types`.
- Next 16 : `middleware` devient `src/proxy.ts`. Avec `cacheComponents`, tout accès à `cookies()` doit être sous `<Suspense>`.
- `src/env.ts` valide `process.env` à l'import : `vitest.config.mts` fournit des valeurs fictives.
- Les tests de RLS utilisent un faux schéma `auth` ; les vraies fonctions Supabase (`auth.uid`) sont censées se comporter pareil, à revalider sur le vrai projet.

## Backlog (idées hors périmètre)

(à remplir)

## Prochain sous-jalon recommandé

M0.3 Inngest, journal des coûts, logs (après vérification du projet Supabase, voir Dettes)
