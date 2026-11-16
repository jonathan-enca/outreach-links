# Prompt maître : tout ce qui manque avant le vrai test grandeur nature

À copier tel quel dans une nouvelle session Claude Code. Rédigé le 17/11/2026 d'après l'essai de Jonathan après MU.3.

```
Tu travailles seul, sans m'interroger, pendant que je suis absent. Tout ce qui suit est VALIDÉ : ne demande aucune confirmation, ne propose pas d'options, applique les défauts écrits ici et avance jusqu'au bout. Réponds-moi en français simple, à la fin seulement.

## 0. Lectures (dans cet ordre, sans tout relire)
CLAUDE.md ; PROGRESS.md (sections « MU.3 », « Remarques d'essai de Jonathan après MU.3 », « Incident : analyse figée », « Décisions de Jonathan, suite de l'essai ») ; docs/jalon-mu.md sections 3, 4, 5 puis uniquement MU.4, MU.5 et MU.7. Vérifie que MU.3 est « fait » sur main. Annonce en 3 lignes ce que tu fais et ne fais pas, puis travaille.

## 1. Règles d'autonomie (décision de Jonathan, 17/11)
- Tout est validé : code, migrations Supabase, variables et déploiements Vercel, resynchronisation Inngest, PR, fusion dans main dès que la CI est verte. Aucun email d'outreach réel (dry run).
- SQL : n'utilise PAS l'outil MCP Supabase `execute_sql` pour des écritures (le serveur Supabase demande alors une confirmation que personne ne peut donner). Utilise l'API de gestion : `curl -sS -X POST https://api.supabase.com/v1/projects/ivjkwhhgtibewqzccvrj/database/query` (jeton injecté, déjà autorisé dans .claude/settings.json) ; l'outil MCP reste bon pour lire, lister les tables et appliquer les migrations. Ne supprime jamais de comptes ni de données d'utilisateurs réels sans que je l'aie demandé dans ce prompt.
- Vercel : `VERCEL_TOKEN=proxyinjectedplaceholdertoken0123`, teamId et projet dans PROGRESS.md. Inngest : après CHAQUE déploiement de production qui ajoute ou change une fonction, vérifie avec l'outil MCP Inngest `get_apps` que `functionCount` est à jour ; sinon `sync_app` (app `outreach-links`, URL https://outreach-links.vercel.app/api/inngest) ou `curl -X PUT` sur cette URL. (Un workflow GitHub le fait déjà ; vérifie qu'il s'est déclenché.)
- Budget des runs réels : 2,00 USD au total pour cette session, uniquement sur les sites de test (mega-coloring.com) ; journalise tout dans PROGRESS.md. Ne clique jamais « Reprendre » sur l'analyse d'un vrai client.
- Ne force-push jamais. Si une branche distante diverge, fusionne-la. Une PR par chantier ou groupe de chantiers, fusionnée dès que la CI est verte.
- Captures connectées (pnpm shots:env, shots:seed, scripts/shots/analysis.mjs), bureau 1440 et mobile 390, pour tout écran modifié.
- Si une décision de produit manque : choisis le défaut le plus simple, note-le dans PROGRESS.md (« Décisions »), continue.

## 2. Chantiers, dans cet ordre

### A. Robustesse du moteur (cause de l'échec de l'essai du 16/11)
Constat : en production, un appel DataForSEO `content_analysis.search` a répondu HTTP 500 (le même appel peut durer 46 s pour 3 résultats) et UNE erreur a fait échouer toute l'analyse (étape « recherche », 4 appels sur 35).
1. Une erreur d'un appel fournisseur (500, délai dépassé) ne fait plus échouer l'analyse : nouvelles tentatives avec attente croissante, puis l'appel est noté comme « manqué » (compteur et message lisible à l'écran : « 1 recherche n'a pas abouti ») et l'analyse continue avec ce qu'elle a. Elle n'échoue que si une étape n'a produit aucun résultat exploitable.
2. **Relance à partir d'une étape donnée** : bouton « Reprendre à partir d'ici » sur chaque étape de l'écran d'analyse ; remet cette étape et les suivantes à zéro (efface proprement leurs résultats dérivés, garde ce qui précède), ne repaie pas ce qui est gardé, relance l'analyse. Tests sur la base réelle de test (Postgres local ou CI).
3. **Recherche en parallèle** : les appels de la recherche (SERP, Content Analysis, recoupement, mentions) sont indépendants : exécute-les par lots de 5 en parallèle, en gardant l'arrêt par rendement décroissant évalué par lot. Mesure la durée par chemin (SERP, Content Analysis, recoupement, mentions) et note-la dans PROGRESS.md. Objectif : recherche sous 3 minutes (hypothèse).
4. Détection d'une analyse « confirmée » sans aucune étape depuis plus de 2 minutes : l'écran le dit (« Le démarrage prend plus de temps que prévu ») et propose de relancer ; le chien de garde la traite.
5. Chantier à ne pas faire : lecture des sites en flux pendant la recherche (trop risqué, voir PROGRESS).

### B. Étape 1 « Votre site » (remarques 1, 2, 5 de Jonathan)
- Sur le même écran que l'adresse : **pays cible** et **langue du site** (détectée, modifiable), puis l'**objectif** : « faire ranker le site en général » ou « des pages précises » (décision D3 rétablie).
- **Une campagne = un site × un pays** : un même domaine peut avoir plusieurs campagnes (une par pays), chacune avec son analyse, ses cibles, son contexte local ; dis-le à l'écran (« chaque pays a sa propre campagne ») et permets d'en ajouter une depuis la liste des sites. Migration si nécessaire (unicité par domaine + pays).
- Après l'adresse : jamais de bouton grisé muet : animation et durée estimée, liste qui se coche en direct pendant la lecture du site.
- Le pays et la langue pilotent la recherche (location et langue DataForSEO, requêtes, filtre de langue dès la collecte). Mesure combien de pages « hors langue » ne sont plus lues au tri (avant : 25 sur 150).

### C. Étape 2 « ce que nous avons compris » (remarques 3, 4)
- La fiche, le profil de marque et les noms de pages sont **dans la langue du site analysé** (plus de noms de pages en anglais pour la version française d'un site bilingue) : pour un site à plusieurs langues, utilise la version correspondant à la langue de la campagne ; ne traduis rien ; multilingue plus tard.
- Pages à faire citer : en objectif « autorité générale », l'accueil est proposé **mais décochable** ; ajout manuel d'une adresse (vérifiée en HTTP 200). En objectif « pages précises » : cases et ajout manuel.
- Une seule fiche lisible sur un écran de bureau, blocs préremplis avec « Modifier ». Reprise de l'onboarding là où il s'est arrêté.
- Textes déjà réécrits (lancement, email de fin) : vérifie qu'ils sont toujours justes ; l'email part si RESEND_API_KEY est posée (elle l'est sur Vercel depuis le 16/11) : constate un envoi réel de l'email de fin à la fin du run du chantier G et note le résultat.

### D. Liens morts des concurrents (MU.7, décision de Jonathan : tactique principale)
Des pages de **sites concurrents** sont en 404 / 410 mais reçoivent encore des liens : chaque site qui les cite est une cible, avec la preuve du lien mort et la page équivalente de notre site à proposer. Construis-le en premier dans MU.7 (voir docs/jalon-mu.md, MU.7 et section 2.1 tactique 2 point (c)) : pages disparues des concurrents via DataForSEO Backlinks (champ `is_broken` déjà lu par le client), sites qui les citent, page la plus proche chez nous, vérification HTTP de la 404 / 410 et du lien entrant, filtre qualité habituel, deux types de demande (remplacement avec preuve ; ajout à la liste). Commence par un run borné qui mesure coût et rendement avant de le brancher dans l'analyse unique. Puis, si le temps le permet, les pages ressources (points (a), (b), (d)). Jamais un lien déclaré mort sans 404 / 410 constaté ; si le thème n'en fournit pas, dis-le à l'écran, ne remplis pas.

### E. Contrôle de qualité de la recherche
Sur le dernier run réel (audit 3edd59a0-0429-43bd-b7b1-e9fbb620d824 : 741 candidats, 150 pages lues, 17 cibles dont la plupart sont des blogs) : mesure candidats et cibles par source (recoupement, SERP, contenu, mentions) et par type de site, note-le dans PROGRESS.md, et prépare dans le dépôt un fichier d'évaluation (17 cibles retenues + 20 sites écartés pris au hasard, avec leur motif) que Jonathan pourra juger plus tard. Ne modifie pas les règles de tri sans rejouer le jeu annoté (précision et rappel avant / après).

### F. Run réel de bout en bout (production)
Quand A à D sont en production : vérifie `get_apps` (fonctions à jour), crée avec le compte de test une campagne mega-coloring.com (France, français, autorité générale), lance l'analyse par l'interface en production (pas en local), regarde l'écran évoluer sans recharger (captures début / milieu / fin, bureau et mobile), vérifie que l'email de fin arrive, note durée, coût, nombre de cibles et de liens morts de concurrents. Si ça échoue, corrige et recommence dans la limite du budget.

## 3. Fin de session
PROGRESS.md à jour (état, décisions, fichiers clés, commandes, dettes, backlog, coûts réels), tests / lint / typecheck / format verts, PRs fusionnées dans main, production déployée et Inngest à jour. Puis donne-moi : ce qui marche, ce qui ne marche pas, ce que tu as mesuré, ce qui reste (MU.5, MU.6, MU.8 à MU.11), et le prompt de la session suivante, en langage simple.
```
