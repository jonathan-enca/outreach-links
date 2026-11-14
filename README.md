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

## Structure

- `src/app` : routes (App Router)
- `src/lib` : utilitaires partagés
- `src/server` : code serveur uniquement
- `src/features` : modules métier
- `src/env.ts` : validation zod des variables d'environnement (échec bruyant au démarrage et au build)
- `messages/fr.ts` : toutes les chaînes de l'interface

## Variables d'environnement

Toute nouvelle variable s'ajoute dans `src/env.ts` **et** `.env.example`. La CI fournit `NEXT_PUBLIC_APP_URL`.

## Déploiement (Vercel)

1. Importer le dépôt GitHub dans Vercel (preset Next.js détecté, pnpm via `packageManager`).
2. Définir `NEXT_PUBLIC_APP_URL` pour les environnements Preview et Production. Sans elle, le build échoue volontairement.
3. Chaque PR obtient une preview ; `main` déploie en production.
