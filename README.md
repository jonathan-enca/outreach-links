# Outreach backlinks

Mini-SaaS français : un audit SEO d'abord, puis une prospection par email pour obtenir des backlinks éditoriaux gratuits. Contexte produit dans `CLAUDE.md`, plan de code dans `PLAN.md`, avancement dans `PROGRESS.md`.

## Démarrage

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Commandes

| Commande            | Rôle                     |
| ------------------- | ------------------------ |
| `pnpm dev`          | serveur de développement |
| `pnpm build`        | build de production      |
| `pnpm lint`         | ESLint                   |
| `pnpm typecheck`    | `tsc --noEmit`           |
| `pnpm test`         | Vitest (une passe)       |
| `pnpm format:check` | vérification Prettier    |

## Inngest, coûts et logs

- Route `/api/inngest` (fonctions dans `src/inngest/functions`, à lister dans `index.ts`). Fonction de test `health` : événement `app/health.ping`, écrit une ligne dans `cost_ledger`.
- En local : mettre `INNGEST_DEV=1` et `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`, lancer `pnpm dev` puis `pnpm inngest:dev` (interface sur http://localhost:8288), enregistrer l'app avec `curl -X PUT localhost:3000/api/inngest`, puis envoyer l'événement depuis l'interface Inngest.
- Tout appel payant passe par `recordCost()` (`src/lib/costs.ts`) : une ligne par appel dans `cost_ledger` (écriture réservée à `service_role`).
- Logs : `src/lib/logger.ts` (JSON, une ligne par événement, champs sensibles masqués). Niveau via `LOG_LEVEL`.
- Production : `INNGEST_EVENT_KEY` et `INNGEST_SIGNING_KEY` (Vercel, sensibles), puis synchroniser l'app dans le tableau de bord Inngest avec l'URL `<site>/api/inngest`.

## Structure

- `src/app` : routes (App Router)
- `src/lib` : utilitaires partagés
- `src/server` : code serveur uniquement
- `src/features` : modules métier
- `src/env.ts` : validation zod des variables d'environnement (échec bruyant au démarrage et au build)
- `messages/fr.ts` : toutes les chaînes de l'interface

## Base de données (Supabase)

Migrations dans `supabase/migrations` (versionnées). Tests de RLS : `TEST_DATABASE_URL=postgres://user@host:port/postgres pnpm test`.

## Variables d'environnement

Toute nouvelle variable s'ajoute dans `src/env.ts` **et** `.env.example`. La CI fournit `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (valeurs fictives) et un Postgres pour les tests de RLS.

## Déploiement (Vercel)

1. Importer le dépôt GitHub dans Vercel (preset Next.js détecté, pnpm via `packageManager`).
2. Définir `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` pour les environnements Preview et Production. Sans elle, le build échoue volontairement.
3. Chaque PR obtient une preview ; `main` déploie en production.
