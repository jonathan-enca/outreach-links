# Prompt maître n° 3 : contacts, onboarding 2/2, mentions, écran résultat, essai sur trois sites

À copier tel quel dans une nouvelle session Claude Code. Rédigé le 17/11/2026 à la fin de la session du prompt maître n° 2 (voir `PROGRESS.md`, section « Session du 17/11 (nuit) : prompt maître n° 2 »).

```
Tu travailles seul, sans m'interroger, pendant que je suis absent. Tout ce qui suit est VALIDÉ. Réponds-moi en français simple, à la fin seulement.

## 0. Lectures (sans tout relire)
CLAUDE.md ; PROGRESS.md : section « Session du 17/11 (nuit) : prompt maître n° 2 » en entier (mesures, décisions, dettes) ; docs/jalon-mu.md : sections 3, 4, 5 puis MU.5, MU.8, MU.9, MU.10, MU.11. Annonce en 3 lignes ce que tu fais et ne fais pas, puis travaille.

## 1. Autonomie (inchangée)
Mêmes règles que docs/master-prompt-2.md, section 1 : tu valides toi-même SQL, déploiements, variables, PR et fusions ; API de gestion Supabase si l'outil MCP demande une confirmation ; aucun email d'outreach réel ; aucune donnée de vrais clients supprimée ; pas de force-push ; budget des runs réels 3,00 USD pour la session, sur les sites de test seulement, journalisé dans PROGRESS.md. Captures connectées bureau 1440 et mobile 390 pour tout écran modifié.

## 2. À faire d'abord (restes de la session précédente)
1. **Email de fin d'analyse** : la clé `RESEND_API_KEY` posée sur Vercel est refusée par Resend (`Resend 401 validation_error` = clé invalide, lu dans `events`). Si une nouvelle clé a été posée par Jonathan : relance une analyse sur le compte de test et constate l'envoi (`analysis.email_sent`, puis Resend `list-emails`). Sinon : dis-le en une phrase à la fin, ne contourne pas.
2. **12 types d'éditeurs × 4 requêtes = 48 recherches**, le budget en couvre 40 : chiffre le passage à 48 (environ +0,05 USD par analyse) et applique-le si le coût total attendu reste sous 1 USD.

## 3. Chantiers, dans cet ordre
### MU.8 Contacts (le plus rentable : 15 cibles pertinentes sur 55 perdues faute de contact au dernier run)
Voir docs/jalon-mu.md MU.8. Mesure d'abord la perte par cause, puis lis plus de pages (contact, mentions légales, à propos), adresses déguisées, formulaires mieux reconnus ; les cibles sans contact restent visibles dans un onglet à part avec saisie manuelle. Objectif : au moins 50 % des cibles pertinentes avec un contact, aucune adresse devinée.

### MU.10 Écran « Vos cibles », version résultat
Garder / Écarter avec motif, onglet « Sans contact trouvé », lien « Voir les sites écartés et pourquoi », barre fixe « N cibles gardées · Préparer mes messages ». La barre fixe ne doit plus recouvrir les onglets ni les cartes (constaté sur les captures du 17/11).

### MU.5 Onboarding 2/2
Ce que vous proposez, qui peut vous citer (les étiquettes existent déjà : `publisher-tags.tsx`), vos concurrents modifiables, prénom et rôle.

### MU.9 Mentions sans lien, dites honnêtement
État vide honnête, autres noms de la marque, revérification mensuelle.

### MU.7 (a, b, d) Pages ressources, si le temps le permet
Non fait à la session précédente. Jamais de lien déclaré mort sans 404 ou 410 constaté par nous.

### MU.11 Essai complet sur trois sites
mega-coloring.com, remove-me.io et un site de service local : durée, coût, cibles, répartition par type, taux de contact. Tableau dans PROGRESS.md.

## 4. Points de vigilance mesurés (ne pas refaire les mêmes erreurs)
- Ne relève PAS le seuil d'adéquation (0,5) : essayé le 17/11, le jeu annoté passe de 0,94 à 0,59 de rappel. Pour le bas de liste faible (rangs 31 et plus : environ la moitié jugée bonne), passe par le jugement de Jonathan (docs/eval-qualite-recherche.md) avant toute règle.
- Pas d'opérateur de recherche (intitle:, inurl:) : facturé 5 fois plus cher par le fournisseur.
- Le robots.txt qui ne répond pas vite ne doit jamais écarter un site : la lecture tranche.
- Un champ trop long renvoyé par le modèle se raccourcit, il ne fait jamais rejeter toute la réponse (vérifie-le pour le jugement des cibles, qui a encore des longueurs maximales).
- Rejoue le jeu annoté (précision et rappel) avant et après toute modification d'une règle de tri.

## 5. Fin de session
PROGRESS.md à jour, tests, lint, typecheck et format verts, PR fusionnées dans main, production déployée, Inngest à jour (38 fonctions ou plus). Puis dis-moi en langage simple : ce qui marche, ce qui ne marche pas, les chiffres, et le prompt de la session suivante.
```
