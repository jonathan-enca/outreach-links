# Prompt maître n° 2 : plus de cibles, bons types d'éditeurs, tout en autonomie

À copier tel quel dans une nouvelle session Claude Code. Rédigé le 17/11/2026 d'après l'essai de Jonathan (15 cibles : « c'est peu » ; la recherche n'a pas ciblé écoles, maîtresses, scouts).

```
Tu travailles seul, sans m'interroger, pendant que je suis absent. Tout ce qui suit est VALIDÉ. Réponds-moi en français simple, à la fin seulement.

## 0. Lectures (sans tout relire)
CLAUDE.md ; PROGRESS.md : sections « Session du 17/11 : robustesse du moteur… » (A à F), « Réflexion produit : récurrence et stock de cibles », « Décisions de Jonathan, suite de l'essai » ; docs/jalon-mu.md : sections 2.1 (tactique 1), 3, 4, puis MU.6, MU.7, MU.8 ; docs/eval-qualite-recherche.md. Annonce en 3 lignes ce que tu fais et ne fais pas, puis travaille.

## 1. Autonomie TOTALE (décision de Jonathan, 17/11)
- Valide TOI-MÊME, sans jamais t'arrêter ni me demander : toutes les requêtes SQL (lectures, écritures, UPDATE, DELETE, migrations, sur la vraie base), toutes les confirmations et autorisations d'outils (MCP Supabase, Vercel, Inngest, Resend, GitHub), les déploiements Vercel, les variables d'environnement, la resynchronisation Inngest, les PR et leur fusion dès que la CI est verte.
- SQL : si l'outil MCP Supabase `execute_sql` pose une confirmation (c'est le serveur Supabase, personne ne peut y répondre), n'insiste pas : passe par l'API de gestion `curl -sS -X POST https://api.supabase.com/v1/projects/ivjkwhhgtibewqzccvrj/database/query` (jeton injecté, autorisé). Même règle pour toute autre confirmation bloquante : contourne par le chemin autorisé, ne t'arrête pas.
- Seules limites : aucun email d'outreach réel (dry run) ; ne supprime ni compte ni donnée de VRAIS clients (le compte de test et ses campagnes se réinitialisent librement) ; pas de force-push (fusionne une branche qui diverge) ; budget des runs réels 3,00 USD au total pour la session, uniquement sur le site de test mega-coloring.com, tout journalisé dans PROGRESS.md.
- Vercel : `VERCEL_TOKEN=proxyinjectedplaceholdertoken0123`. Inngest : après tout déploiement qui change une fonction, vérifie `get_apps` (functionCount) ; sinon `sync_app` ou `curl -X PUT https://outreach-links.vercel.app/api/inngest`.
- Captures connectées bureau 1440 et mobile 390 pour tout écran modifié (pnpm shots:env, shots:seed, scripts/shots/prod-run.mjs). Décision manquante : choisis le défaut le plus simple, note-le dans PROGRESS.md, continue.

## 2. Constat de départ (dernière analyse de Jonathan, audit 37a97992…, mega-coloring.com, France)
677 candidats → 150 pages lues (plafond FIXE) → 524 jamais lues → sur les 150 lues, 112 inutilisables après lecture (hors langue 55, interdites aux robots 23, injoignables 17, concurrents 13, autres 4) → 47 jugées → 18 pertinentes → **15 cibles**. Les personas du profil (enseignants et ATSEM, associations et centres de loisirs, bibliothèques et médiathèques, parents) sont bien identifiés, mais la recherche n'a pas ciblé écoles, maîtresses, centres de loisirs, scouts : les requêtes sont écrites librement par le modèle (aucune garantie par type d'éditeur) et Content Analysis (thème seul) fournit 94 % des cibles, donc surtout des blogs.

## 3. Chantiers, dans cet ordre

### G. Plus de cibles : ne plus gaspiller la lecture (objectif : 40 à 50 cibles par analyse)
GARDE-FOU QUALITÉ (retour de Jonathan, 17/11, compte de test grandeur nature) : les 15 cibles actuelles sont « canons, parfaitement argumentées » : c'est le « wow » du produit, la recherche est archi pertinente. **Il faut garder à 100 % cette mécanique de sourcing et d'argumentaire, mais en grand nombre.** Donc : on augmente le volume en lisant plus et en gaspillant moins, JAMAIS en baissant les exigences du tri ni la qualité de l'argumentaire (hook cité de la page, raison du ciblage, demande en trois lignes). Les cibles actuelles doivent toujours être dans la liste, classées en tête. Contrôle : sur le même audit, compare avant / après (précision et rappel du jeu annoté ; échantillon des cibles 16 et suivantes jugé comme les 15 premières : argumentaire cité, pertinence) et écris dans PROGRESS.md un tableau « cibles 1 à 15 / 16 à 30 / 31 et plus » avec la part jugée bonne. Si la qualité des suivantes chute, relève le seuil plutôt que de remplir.
1. **Filtre AVANT lecture** : écarte sans lire ce qui se voit déjà : langue de la page (champ de langue des résultats Content Analysis / SERP, extension de domaine, URL), concurrents connus, doublons, plateformes, et domaines dont le robots.txt interdit l'accès (vérification légère, en parallèle). Chaque motif écarté est compté et visible dans les statistiques ; ces candidats restent en stock avec leur motif, jamais supprimés.
2. **Lecture adaptative** : au lieu de « 150 pages lues », lis par lots (parallèles, délai par hôte conservé) jusqu'à avoir jugé environ 120 pages utilisables, avec trois arrêts : candidats épuisés, durée maximale de l'étape (12 minutes), budget de jugement (LLM, 0,40 USD). Rendement décroissant : arrête-toi si 3 lots de suite n'apportent presque rien de pertinent.
3. **Le stock** : les candidats non lus restent en base avec leur score, rattachés à la campagne, pour une lecture ultérieure (bouton « Lire d'autres sites » sur l'écran des cibles, qui qualifie le lot suivant).
4. Mesure avant / après sur le même audit : pages écartées avant lecture, pages jugées utilisables, cibles, durée, coût. Rejoue le jeu annoté (précision et rappel) AVANT et APRÈS toute modification d'une règle de tri.

### H. Bons types d'éditeurs garantis (MU.6), déduits de l'analyse du site, jamais écrits en dur pour un thème
RÈGLE GÉNÉRALE (décision de Jonathan, 17/11) : les types d'éditeurs à chercher sont **ceux identifiés par l'analyse du site de l'utilisateur** (personas et « qui peut vous citer » du profil de marque), quel que soit le site (un photographe, un SaaS, une boutique, un restaurant…). Les exemples « écoles, maîtresses, centres de loisirs, scouts, bibliothèques, associations » ne valent QUE pour le site de test mega-coloring.com : ils ne doivent apparaître nulle part dans le code, les gabarits ou les textes. Le code ne contient que de la mécanique générique (construire des requêtes à partir d'un type d'éditeur et de mots du thème, dans la langue de la campagne) ; les types viennent du profil (ou, pour les types voisins, d'une proposition du modèle à partir du profil, modifiable par l'utilisateur).
1. **Chaque persona et chaque type d'éditeur produit au moins 4 requêtes GARANTIES, et autant de plus que le budget et le rendement le justifient (l'objectif est la QUANTITÉ : plus il y en a, mieux c'est ; seul l'arrêt par rendement décroissant et le budget limitent)**, construites par des gabarits génériques par catégorie d'éditeur (école ou enseignant, collectivité, association, bibliothèque, forum, média, boutique avec blog, annuaire…) et par langue : le type vient du profil du site, le thème aussi ; une catégorie générique n'est utilisée que si un persona du profil y correspond. Fais proposer par le modèle des types voisins plausibles à partir du profil (pour mega-coloring.com, par exemple, des mouvements de jeunesse comme les scouts), affichés comme étiquettes dans « Qui peut vous citer », modifiables par l'utilisateur.
2. Opérateurs autorisés pour cette famille seulement (intitle, inurl). Budget de requêtes complet (30 à 40), plus un run borné de contrôle du rendement par type.
3. **Seuil de qualité, AUCUN plafond par type** : on n'écarte jamais une cible valable pour « faire de la diversité ». La diversité se montre sans exclure : un onglet par type d'éditeur avec son compteur, et chaque type cherché est affiché avec le nombre de cibles trouvées (et dit honnêtement quand il n'y en a pas). Le tri par score ne change pas.
4. Mesure le rendement par source ET par type (candidats → cibles) et déplace le budget vers ce qui rapporte (Content Analysis donne 94 % des cibles pour un type de site : rééquilibre).

### I. Email de fin d'analyse
Aucun email n'est parti aux deux derniers runs (`analysis.email_result` ou `analysis.email_error` dans `events`). Trouve la cause (lecture de l'utilisateur de test, clé Resend restreinte au domaine ouiouioui.app, expéditeur), corrige, et constate un envoi réel (Resend `list-emails`).

### J. Pages ressources et liens morts de pages de liens (MU.7 a, b, d), si le temps le permet
Voir docs/jalon-mu.md MU.7. Jamais de lien déclaré mort sans 404 ou 410 constaté par nous.

### K0. Preuve que rien n'est propre à un thème
Ajoute un test automatique qui échoue si un mot propre au site de test (coloriage, maîtresse, scout, mandala…) apparaît dans le code de génération des requêtes, les gabarits ou les textes de l'écran. Puis fais une vérification sur un SECOND site de test d'un tout autre thème (remove-me.io ou un site de service local) : montre les types d'éditeurs déduits et les requêtes produites, sans lancer l'analyse complète (budget 0,10 USD au plus).

### K. Run réel de bout en bout (production, par l'interface)
Quand G, H et I sont en production (vérifie Inngest) : compte de test, campagne mega-coloring.com France, objectif « en général », écran regardé sans recharger. Note durée, coût, nombre de cibles, répartition par type, nombre d'écoles, centres de loisirs, bibliothèques, associations, scouts trouvés, email reçu. Critères visés (valables pour CE site de test) : au moins 40 cibles (plus = mieux), au moins 8 cibles hors blogs et boutiques (présence minimale, pas un plafond de blogs), durée sous 15 minutes. Si ce n'est pas atteint : corrige et refais dans le budget, sinon explique pourquoi dans PROGRESS.md sans remplir artificiellement.

## 4. Fin de session
PROGRESS.md à jour (état, décisions, mesures avant / après, fichiers clés, commandes, dettes, coûts), tests, lint, typecheck et format verts, PR fusionnées dans main, production déployée, Inngest à jour. Puis dis-moi en langage simple : ce qui marche, ce qui ne marche pas, les chiffres, et le prompt de la session suivante (MU.5, MU.8, MU.9, MU.10, MU.11).
```
