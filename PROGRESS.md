# PROGRESS.md

## État

| Sous-jalon  | Statut  | PR                                                           | Date       |
| ----------- | ------- | ------------------------------------------------------------ | ---------- |
| M0.1        | fait    | [#1](https://github.com/jonathan-enca/outreach-links/pull/1) | 2026-11-14 |
| M0.2 à M7.3 | à faire |                                                              |            |

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

## Commandes (dev, tests, migrations, Inngest)

`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build` (voir README). Migrations et Inngest : à venir (M0.2, M0.3).

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

## Backlog (idées hors périmètre)

(à remplir)

## Prochain sous-jalon recommandé

M0.2 Supabase : auth, schéma de base, RLS
