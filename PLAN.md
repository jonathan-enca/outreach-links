# PLAN.md — Plan de code par jalons et sous-jalons

> Lié à `CLAUDE.md` (contexte produit, section 15 = méthode de travail). **Un sous-jalon = une conversation Claude Code.** Chaque sous-jalon liste : objectif, prérequis, tâches, livrables, critères d'acceptation, hors périmètre.
> Conventions techniques : Next.js (App Router) + TypeScript strict, pnpm, Supabase (migrations SQL versionnées, RLS partout), Inngest, zod pour toute entrée/sortie externe, Vitest, Playwright pour 2 ou 3 parcours clés, UI en français (chaînes dans un fichier `messages/fr.ts`), shadcn/ui + Tailwind.

## Vue d'ensemble

| Jalon | Sujet                  | Sous-jalons      | Résultat visible                                                              |
| ----- | ---------------------- | ---------------- | ----------------------------------------------------------------------------- |
| M0    | Fondations             | 0.1 à 0.4        | App déployée, auth, base, Inngest, suivi des coûts                            |
| M1    | Audit et concurrents   | 1.1 à 1.6        | Audit gratuit public avec capture d'email                                     |
| M2    | Plan de liens          | 2.1 à 2.3        | Plan validable (opportunités, liens morts)                                    |
| M3    | Tri des cibles et lots | 3.1 à 3.4        | Lots de messages prêts à valider                                              |
| M4    | Envoi et relance       | 4.1 à 4.4        | Envois plafonnés, relance unique, lecture des réponses                        |
| M5    | Inbox et liens         | 5.1 à 5.4        | Réponses classées, liens vérifiés, tâches formulaires                         |
| M6    | Produit et paiement    | 6.1 à 6.4        | Stripe, garde-fous, digest, landing, anti-abus                                |
| M7    | Bêta et lancement      | 7.1 à 7.3        | Dogfooding, avis juridique, ouverture                                         |
| MA    | Refonte de l'audit     | A.1 à A.6        | Audit repensé sur la base des mesures réelles                                 |
| MD    | Design du site global  | D.1 (à découper) | Identité visuelle et UX cohérentes, site entier                               |
| MN    | Nom, domaine, DA       | N.1, N.2         | **Prioritaire** : nom choisi, domaine, direction artistique                   |
| MH    | Home page FR           | H.1 à H.3        | **Prioritaire** : home proche d'outlinkai.com, en français                    |
| MB    | Onboarding + test réel | B.1, B.2         | **Prioritaire** : campagne lancée depuis une URL, test réel                   |
| MU    | Espace client repensé  | U.0 à U.11       | **Prioritaire NOW** : un seul parcours, de l'inscription à la liste de cibles |

Chemin critique pour un **premier test réel sur mega-coloring.com** : M0 → M1 → M2 → M3 → M4.1 à 4.3. Le reste peut suivre.

Un sous-jalon fait vaut quand : critères d'acceptation cochés, tests/lint/typecheck verts, `PROGRESS.md` à jour, PR ouverte.

### Jalons ajoutés le 14/11/2026 (décision de Jonathan, à découper avant de commencer)

- **MA. Refonte du process d'audit.** À reprendre à plat après le premier audit réel (voir PROGRESS.md, « M1.6 bis ») : concurrents retenus trop gros (cultura, shutterstock, pixabay), site sans mot-clé classé = score 0 et audit vide, URL de page inconnues quand la SERP renvoie des redirections Google, coût réel du Backlinks ~20 % au-dessus de la grille et marge gratuite quasi nulle, étapes M1.3 à M1.5 et M2.1 enchaînées avec confirmations séparées. À décider : audit pensé pour un site neuf, choix des concurrents par taille et pertinence, parcours unique et plus court, valeur de l'aperçu gratuit. Prérequis : M2 terminé (pour juger l'audit avec le plan de liens). À placer avant l'ouverture publique (M6/M7).
- **MD. Design du site global.** Identité visuelle et expérience du site entier (accueil, audit gratuit, connexion, écrans `/app`) : direction artistique, mode sombre, mobile, accessibilité, contenu réel des écrans de la coquille M0.4. Prérequis : MA (le design suit le nouveau parcours d'audit). Hors périmètre : nouvelles fonctionnalités.

### MA. Découpe en sous-jalons (14/11/2026, options par défaut les plus simples et les moins coûteuses)

Ordre : chaque sous-jalon est livrable seul, sans appel payant en CI, et réduit coût ou bruit.

- **MA.1 Concurrents actionnables (fait).** Liste `GIANT_DOMAINS` (banques d'images, grande distribution, médias, institutions) ajoutée aux exclusions de la découverte ; zéro coût d'API. Hors périmètre : filtre par taille réelle (MA.2).
- **MA.2 Filtre de taille avant l'étape coûteuse (fait, via `bulk_referring_domains` en une requête).** Utiliser `backlinks.summary` (déjà appelé) pour écarter les concurrents au-delà d'un seuil de domaines référents (défaut : 20 000 en gratuit, 100 000 en payant) **avant** `backlinks.backlinks`, et les remplacer par les candidats suivants ; économise le coût Backlinks. Tests sur fixtures.
- **MA.3 Grille de coûts recalée (fait).** Ajuster `estimate` sur les coûts réels mesurés (Backlinks ~ +20 %, `ranked_keywords` 0,012) ; marge gratuite restaurée (réduire `limit` des backlinks du gratuit plutôt que relever le plafond de 0,25 USD).
- **MA.4 Site neuf sans mot-clé classé (fait : audit gratuit par thème facultatif, « non classé » ; l'audit connecté exige déjà 1 à 3 requêtes).** Au lieu d'échouer (`aucun_mot_cle`), mode « site neuf » : requêtes issues de la niche saisie (3 requêtes par défaut, sans LLM), score affiché « non classé » (pas 0), plan fondé sur les concurrents seulement.
- **MA.5 URL exactes des cibles (fait : `url_exact` sur les opportunités et le plan ; la résolution par fetch reste à faire en M3.1).** Marquer les URL issues de redirections Google comme partielles (`url_exact = false`) ; résolution tardive par fetch (M3.1) ; pas de second appel SERP payant.
- **MA.6 Parcours unique (fait : colonne `auto_chain`, coût total annoncé, enchaînement par les jobs, progression unique ; le chasseur 404 reste manuel).** Une seule confirmation du coût total, puis enchaînement automatique concurrents → backlinks → profil → opportunités ; progression unique sur la page d'audit.
- **MA.7 Valeur de l'aperçu gratuit (fait : indices sur cibles floutées, cibles partagées, message site neuf).** Revoir ce que montre l'aperçu (en tenant compte de MA.2 à MA.5) ; hors design visuel (MD).

### Jalons prioritaires NOW (15/11/2026, décision de Jonathan)

Trois chantiers passent devant le reste (M6.2 et suivants). Hypothèse : « DA » = direction artistique (à corriger si c'est autre chose). Chaque sous-jalon = une session.

- **MN. Nom, domaine et direction artistique.** Prérequis de la home (le nom et l'ambiance visuelle y sont affichés).
  - **MN.1 Nom et domaine (fait le 15/11 : `docs/naming.md`, choix du nom par Jonathan en attente).** 10 à 15 noms candidats (FR, courts, prononçables, sans « backlink » ni « IA » dans le nom), vérification de disponibilité du `.fr` / `.com` / `.io`, et des noms existants (marques, INPI, résultats Google). Sortie : shortlist de 3 avec recommandation ; Jonathan choisit. Ensuite : achat du domaine (dépense nouvelle : à valider), branchement Vercel, `NEXT_PUBLIC_APP_URL`, Supabase Auth, expéditeur Resend.
  - **MN.2 Direction artistique (fait le 15/11 : piste I « clair et émeraude », `docs/da.md`, jetons dans `globals.css`).** Logo simple, palette, typographies, ton des textes, style des illustrations / captures, composants clés. Sortie : `docs/da.md` + jetons Tailwind (remplace la palette papier / sapin de M0.4 si changée). Hors périmètre : pages.
- **MH. Home page, structure proche d'outlinkai.com, en français.**
  - **MH.1 Relevé section par section (fait le 15/11 : `docs/home-reference.md`).** Lire outlinkai.com du header au footer (fetch + Playwright pour le rendu et les captures) et consigner dans `docs/home-reference.md` : ordre des sections, rôle de chacune, contenu (titres, sous-titres, étapes, chiffres, FAQ, tarifs, CTA), composants et comportements (sticky header, animations, mobile). Aucune modification du site.
  - **MH.2 Home FR, de l'en-tête au hero et aux premières sections.** Même architecture **et mêmes sections que la référence** (décision du 15/11 : alternative française assumée, voir CLAUDE.md section 1) ; textes **réécrits en français** pour notre produit (audit d'abord, tri des cibles, honnêteté sur les liens), jamais copiés mot à mot (CLAUDE.md section 8) ; aucune promesse de backlinks garantis (règles de messaging). Le champ « ton site » du hero lance l'audit gratuit existant.
  - **MH.3 Sections suivantes, tarifs, FAQ, footer (fait le 15/11 : section preuves reportée après MB.2, pages légales provisoires).** Tarifs alignés sur `plans` (Gratuit / Starter / Pro), FAQ, pied de page, pages légales liées ; mobile, accessibilité, Lighthouse.
- **MB. Onboarding et test grandeur nature sur une URL.**
  - **MB.1 Onboarding en une URL.** L'utilisateur colle son URL ; création du site, vérification de propriété différée, déduction du thème et des requêtes (LLM), une seule confirmation du coût, lancement de la campagne (audit → plan). Réutilise M1.2, MA.6 et MA.7 ; objectif : zéro champ inutile avant la première valeur.
  - **MB.2 Test réel de bout en bout.** Sur `mega-coloring.com` (site de test sans limite, MA.8) : audit réel, plan, tri, contacts, brouillons, lot validé, envoi en **dry run** puis, seulement sur accord explicite de Jonathan, une poignée d'envois réels depuis sa boîte. Consigner coûts réels, temps, erreurs et trous du parcours dans PROGRESS.md ; corriger les bloquants. Prérequis : MB.1 ; clés DataForSEO, Inngest et Anthropic déjà sur Vercel.

- **MT. Les trois tactiques, complètes, en mode bêta (décision de Jonathan, 15/11/2026).** Les trois tactiques de la home (sites que personne ne sollicite ; pages ressources et liens morts ; mentions de marque sans lien) sont **exactement ce que l'outil doit faire**. Phase bêta, aucun vrai client : on construit d'abord l'outil le plus performant et le plus exhaustif possible ; **les limites par palier (Gratuit / Médium / Total) viennent après**, une fois l'outil bon. Principe produit (CLAUDE.md sections 1 et 3) : jamais 2 000 domaines à trier, mais **une liste courte, classée, avec pour chaque site la demande à faire et pourquoi**. Chaque sous-jalon = une session ; test réel sur `mega-coloring.com` (site de test, MA.8). À confirmer : « Médium » et « Total » = Starter et Pro de la table `plans` (noms à aligner).
  - **MT.0 Mode bêta sans limites de volume.** Un réglage unique (`BETA_MODE`, variable d'environnement + test) : tout espace est traité au niveau le plus haut (concurrents, requêtes, profondeur SERP, quotas d'opportunités par type, volume de backlinks), sans changer la table `plans` ni la page tarifs. **Restent actifs** : un plafond de sécurité de coût par audit (proposé 5 USD par audit et 25 USD par jour : simple sécurité contre les bugs) **et un budget cible de coût par audit d'environ 1 USD avec plafond d'audit à 2 USD (règle de construction : chaque phase de `docs/audit-v2.md` a sa part du budget, entonnoir du moins cher au plus cher, arrêt par rendement décroissant, caches)** tracés dans `cost_ledger`, et toutes les protections de délivrabilité et d'éthique (10 emails par heure, heures ouvrées, validation de lot, relance unique, liste de suppression) : ce ne sont pas des limites de palier. Les limites par palier se rebranchent en retirant le réglage. Acceptation : un audit sur le site de test tourne avec les valeurs hautes ; test que le réglage levé rétablit les limites actuelles.
  - **Refonte de l'audit (conception : `docs/audit-v2.md`, 15/11/2026).** Profil de marque d'abord, puis requêtes par persona, puis collecte de candidats par tactique (Domain Intersection, SERP, Content Analysis de DataForSEO), puis entonnoir de qualification, puis liste courte classée. Les concurrents servent à exclure et à recouper, jamais à fournir les cibles.
  - **MT.1 Profil de marque (fait le 15/11/2026, voir PROGRESS.md).** Lecture de l'accueil, du sitemap et de 5 à 10 pages ; un appel LLM structuré produit le brand profile (activité, offre, langue, public, ressources liables, variantes du nom, personas de donneurs de liens) ; écran de relecture en une étape ; table versionnée. Acceptation : sur le site de test, les personas citent enseignants, parents, associations, médiathèques.
  - **MT.2 Univers de requêtes par persona (fait : MT.2a objectif de l'utilisateur et MT.2b requêtes, 15/11/2026, voir PROGRESS.md).** Génération de requêtes par persona et par tactique, recettes mises en cache (niche, langue), budget réglé par le plafond d'audit. Acceptation : requêtes pertinentes sur 3 sites de niches différentes, coût annoncé avant lancement.
  - **MT.3 Collecte de candidats (code fait le 15/11/2026 ; run réel borné encore à faire, DataForSEO 401 : voir PROGRESS.md).** Domain Intersection (recoupement des concurrents), SERP top 30 sur les requêtes de personas, Content Analysis par `page_type` (blogs, organisation, forums, e-commerce) et pour les mentions de marque. Run réel borné pour confirmer le français, les tarifs et les formats (consigner le coût).
  - **MT.4 Qualification en entonnoir (fait le 16/11/2026, run réel et migration sur la vraie base faits : voir PROGRESS.md > MT.4 bis).** Déduplication et exclusions (concurrents, plateformes, géants, faux domaines), signaux fournisseur, lecture de page, LLM (type de site, adéquation, vendeur de liens, accroche réelle), contact ; score final et jeu d'évaluation annoté FR (50 cas).
  - **MT.5 Tactiques 2 et 3 en détail (fait le 16/11/2026, voir PROGRESS.md).** Liens morts constatés (404 ou 410) et page de remplacement choisie dans le site de l'utilisateur ; **liens inadaptés** (lien sortant étranger ou peu utile cité, ressource du site qui le remplace, présentation honnête en fondateur) ; mentions de marque avec vérification que la page ne lie pas déjà le site, phrase à insérer et ancre. Jeu annoté FR, précision et rappel mesurés avant tout changement de règle.
  - **MT.6 Écran « Vos cibles » (fait le 16/11/2026, voir PROGRESS.md).** Liste courte classée (une carte par site : type, tactique, pourquoi, contact, demande en trois lignes), filtrable par tactique ; SERP des concurrents repliée ; bouton « Valider ces demandes » vers le lot.
  - **MT.7 Mesure par tactique et coût.** Tableau de bord interne du coût par audit, par phase et par utilisateur (obligation CLAUDE.md 4.5) ; coût par cible livrée. Contactés, réponses, liens posés, coût par lien, par tactique et par type de site.
  - Ordre : MT.0, puis MT.1 et MT.2, MT.3 (run réel borné pour valider les API), MT.4, relecture des cibles réelles par Jonathan, MT.5 et MT.6 ; MB.2 (envoi en dry run) peut s'intercaler dès MT.6. **Hors périmètre** : limites par palier, paiement (M6.x), vidéo, annuaires payants, guest posting.

- **MU. Espace client repensé, de l'inscription à la liste de cibles (16/11/2026, demande de Jonathan après son essai en utilisateur lambda).** Diagnostic, parcours cible, moteur cible, décisions à confirmer et sous-jalons **MU.0 à MU.11** avec leur prompt à copier : tout est dans **`docs/jalon-mu.md`** (une session ne lit que les sections indiquées par son prompt et son sous-jalon). Résumé : un seul parcours (inscription → site → vérification → vous → analyse en cours → vos cibles), un seul moteur (l'ancienne chaîne backlinks / opportunités / plan de liens sort du parcours), progression en direct, résultats par tactique avec états vides honnêtes. MU **passe devant MB.2, MT.7 et M6.2** : MB.2 (test de bout en bout avec envoi en dry run) se fera après MU.11 ; MT.7 (mesure) est repris dans MU.11. Hors périmètre de MU : brouillons, lots, envoi, réponses, liens (partie « CRM »).

Ordre conseillé : MN.1 (court, sans code) et MH.1 en parallèle, puis MN.2, MH.2, MH.3, et MB.1 puis MB.2 (le test réel peut démarrer avant la fin de la home).

---

## M0. Fondations

### 0.1 Scaffold du dépôt

- **Objectif** : dépôt propre, déployable.
- **Tâches** : `create-next-app` (TS strict, App Router), pnpm, ESLint, Prettier, Vitest, GitHub Actions (lint, typecheck, test), validation des variables d'environnement avec zod (`env.ts`), structure `src/{app,lib,server,features}`, `messages/fr.ts`, `.env.example`, déploiement Vercel (preview + prod).
- **Livrables** : `README`, `PROGRESS.md` (modèle ci-dessous), page d'accueil vide en FR.
- **Acceptation** : CI verte ; preview Vercel accessible ; aucune variable manquante ne passe silencieusement.
- **Hors périmètre** : base de données, auth.

### 0.2 Supabase : auth, schéma de base, RLS

- **Prérequis** : 0.1.
- **Tâches** : projet Supabase, migrations pour `workspaces`, `memberships`, `sites`, `events` ; auth par email (lien magique) ; création automatique d'un workspace à l'inscription ; RLS sur toutes les tables ; client serveur et client navigateur typés (types générés).
- **Acceptation** : tests de RLS (un utilisateur ne lit jamais les données d'un autre workspace) ; inscription, connexion, déconnexion fonctionnels.
- **Hors périmètre** : Stripe, boîtes mail.

### 0.3 Inngest, journal des coûts, logs

- **Prérequis** : 0.2.
- **Tâches** : Inngest (route `/api/inngest`, dev server local), fonction de test `health`, table `cost_ledger` (workspace_id, fournisseur, opération, unités, coût_estimé, coût_réel, audit_id) et helper `recordCost()` ; logger structuré ; Sentry optionnel ; table `jobs_audit` minimale si utile.
- **Acceptation** : une fonction Inngest tourne en local et sur Vercel ; un appel factice écrit une ligne dans `cost_ledger`.
- **Pourquoi tôt** : le coût par audit est le principal risque économique, il doit être mesuré dès le premier appel payant.

### 0.4 Coquille d'application et design system minimal

- **Prérequis** : 0.2.
- **Tâches** : layout app (navigation : Audit, Plan, Lots, Inbox, Liens, Garde-fous), shadcn/ui, composants de statut (badges avec **un seul système de statuts** : voir CLAUDE.md 4.2), états vides, page 404/erreur, dark mode non requis. Palette et typographie propres au produit (ne pas imiter les concurrents).
- **Acceptation** : toutes les pages de navigation existent en coquille ; Lighthouse mobile correct ; textes tous dans `messages/fr.ts`.

---

## M1. Audit et concurrents

### 1.1 Client DataForSEO

- **Prérequis** : 0.3.
- **Tâches** : client typé (zod) pour SERP (`organic/live`), Labs (`ranked_keywords`, `competitors_domain`), Backlinks (`summary`, `referring_domains`, `backlinks`, `domain_intersection`), OnPage ; mode différé quand disponible ; **table de cache** (clé = endpoint + paramètres normalisés, TTL configurable) ; chaque appel passe par `recordCost()` ; fixtures enregistrées pour les tests (jamais d'appel réel en CI) ; fonction `estimateCost()` avant lancement.
- **Acceptation** : tests sur fixtures ; un appel réel de démonstration documenté dans `PROGRESS.md` avec son coût mesuré sur un site français (mega-coloring.com).
- **Hors périmètre** : UI.

### 1.2 Onboarding et création du site

- **Prérequis** : 0.4.
- **Tâches** : formulaire des 5 champs de contexte (domaine, niche, pays + langue, boîte d'envoi _optionnelle à ce stade_ + prénom de signature, actif offert) ; normalisation du domaine ; **vérification de propriété** (balise meta ou fichier) avant tout envoi futur (pas bloquant pour l'audit) ; saisie de 3 requêtes prioritaires (suggestion automatique possible en 1.3) ; sauvegarde dans `sites`.
- **Acceptation** : un site peut être créé, modifié, vérifié ; validations zod ; test Playwright du parcours.

### 1.3 Découverte des concurrents via la SERP

- **Prérequis** : 1.1, 1.2.
- **Tâches** : job Inngest `audit.discover` : pour chaque requête prioritaire, top 30 SERP ; agrégation des domaines par fréquence ; exclusion des plateformes génériques (liste configurable : Wikipedia, YouTube, Amazon, réseaux sociaux…) ; sélection de 10 à 20 concurrents ; **écran « coût estimé + confirmer »** avant lancement ; plafonds par plan (gratuit : 3 concurrents).
- **Acceptation** : un audit passe `en_attente → estimé → confirmé → en_cours` ; le coût estimé est comparé au coût réel dans `cost_ledger`.

### 1.4 Backlinks des concurrents et nettoyage

- **Prérequis** : 1.3.
- **Tâches** : job `audit.backlinks` : récupération (batch/différé), stockage dans `competitor_backlinks` ; nettoyage : spam (scores et heuristiques), réutilisation automatique d'images, domaines étrangers hors langue cible, doublons ; exports CSV ; règles de nettoyage testées sur fixtures.
- **Acceptation** : jeu de données propre exportable ; compteurs avant/après nettoyage visibles.

### 1.5 Profil de liens, écart et diagnostic par page

- **Prérequis** : 1.4.
- **Tâches** : profil de liens du site (domaines référents, ancres, dofollow) ; `ranked_keywords` ; pages en positions 4 à 20 à fort volume ; écart de domaines référents (domain intersection) ; contrôle technique OnPage minimal ; calcul « cette page a besoin d'environ N domaines référents » (ordre de grandeur, jamais une promesse) ; résumé généré par LLM (court, factuel).
- **Acceptation** : table `audit_pages` remplie ; tests unitaires du calcul ; le résumé ne contient aucune promesse de classement.

### 1.6 Page d'audit, audit gratuit public, anti-abus

- **Prérequis** : 1.5.
- **Tâches** : page d'audit connectée (score, pages prioritaires, concurrents, écart) ; **version gratuite publique** : champ « ton site » → audit réduit (3 concurrents, 3 pages prioritaires, 10 cibles floutées « +N de plus ») → email demandé pour voir le rapport ; cache par domaine ; une exécution par domaine par période ; limitation de débit (Upstash Ratelimit ou équivalent) ; plafond de dépense global journalier avec coupe-circuit.
- **Acceptation** : coût moyen de l'audit gratuit mesuré et noté dans `PROGRESS.md` ; le coupe-circuit désactive l'audit gratuit au-delà du plafond ; test d'abus (même domaine répété ne coûte rien).

---

## M2. Plan de liens

### 2.1 Génération des opportunités

- **Prérequis** : M1.
- **Tâches** : table `link_opportunities` ; génération depuis l'écart de domaines référents, mentions de marque non liées (SERP sur le nom de marque), pages ressources de la niche, **cibles « jamais sollicitées »** (mairies, associations, photographes, e-commerces, forums modérés ; recherche par requêtes thématiques et filtres) ; dédoublonnage ; priorité et page cible associée ; type de lien attendu.
- **Acceptation** : au moins 5 types d'opportunités générés sur le site de test ; chaque opportunité a une page cible, un type et une priorité.

### 2.2 Chasseur 404 (liens morts)

- **Prérequis** : 2.1.
- **Tâches** : trouver des liens sortants cassés sur des pages ressources de la niche (crawl ciblé fetch + Cheerio, respect `robots.txt` et délais) ; trouver des pages mortes de concurrents qui avaient des backlinks (Backlinks API, statut 404) ; proposer comme remplacement une page du site de l'utilisateur ; créer des opportunités « lien mort ».
- **Acceptation** : crawl limité en profondeur et en volume ; user-agent identifiable ; pas de crawl au-delà des plafonds ; opportunités créées avec l'URL cassée prouvée (HTTP 404/410).

### 2.3 Écran Plan de liens

- **Prérequis** : 2.1 (2.2 recommandé).
- **Tâches** : liste par type avec volume, priorité, offre en échange ; cocher/décocher/réordonner ; ancres suggérées selon le profil existant (éviter la sur-optimisation) ; bouton « Valider le plan » → table `link_plan_items` ; rien ne part sans cette validation.
- **Acceptation** : le plan validé est figé et versionné ; test Playwright du parcours.

---

## M3. Tri des cibles et lots

### 3.1 Lecteur de pages et classification des cibles

- **Prérequis** : M2.
- **Tâches** : fetcher (fetch + Cheerio ; bascule Firecrawl/Jina sur blocage) avec cache ; classification LLM avec **sortie structurée** (zod) et **motif lisible** : payant / vend des liens, mort, piraté, hors sujet, compte obligatoire, concurrent direct, trop irréaliste, OK ; détection de « vendeur de liens » (mentions sponsorisé, tarifs, « write for us » payant) et de profils anormaux ; **jeu d'évaluation annoté** (50 cibles) avec seuil de précision à atteindre.
- **Acceptation** : précision mesurée sur le jeu d'éval ; chaque exclusion a un motif ; coût LLM enregistré.

### 3.2 Enquêteur : contacts

- **Prérequis** : 3.1.
- **Tâches** : recherche de l'email dans la page de contact, mentions légales, CGU, pied de page ; ordre de repli : email visible → finder (Hunter ou équivalent) → formulaire de contact ; vérification de l'email (ZeroBounce/Reoon ou équivalent) ; ignorer les réseaux sociaux ; détecter les **formulaires** et créer des `manual_tasks` ; respecter la liste de suppression.
- **Acceptation** : taux de contact trouvé mesuré sur un échantillon et noté dans `PROGRESS.md` ; aucun email non vérifié n'est marqué envoyable.

### 3.3 Rédacteur : messages

- **Prérequis** : 3.1, 3.2.
- **Tâches** : prompt de rédaction FR (3 lignes, naturel, signé du prénom, hook tiré de la page de la cible, demande concrète, **jamais de mention de l'IA**, jamais de template identique d'un destinataire à l'autre) ; vérification que l'**URL proposée répond 200** ; « linter » de messages (longueur, formules interdites, mention de l'IA, promesses) ; hook et justification de ciblage stockés ; jeu d'évaluation de style (calé sur les exemples de Jonathan, à fournir).
- **Acceptation** : 100 % des messages passent le linter ; l'URL est vérifiée au moment de la génération ; aucun doublon de formulation entre deux messages d'un même lot au-delà d'un seuil.

### 3.4 Lots et validation

- **Prérequis** : 3.3.
- **Tâches** : création d'un lot (N cibles, N paramétrable) ; écran « liste courte classée » : pour chaque site, la demande à faire et pourquoi, motif de tri, aperçu du message, édition ; validation **par lot** (pas mail par mail) ; statuts uniques ; journal des décisions ; verrouillage d'un lot validé.
- **Acceptation** : un lot validé passe à `Validé` et seul un lot validé est envoyable ; test Playwright.

---

## M4. Envoi et relance

### 4.1 Connexion de la boîte d'envoi

- **Prérequis** : M3 (peut démarrer plus tôt).
- **Tâches** : formulaire SMTP/IMAP avec mot de passe d'application ; **chiffrement AES** (clé en variable d'environnement, rotation documentée) ; test de connexion et envoi de test vers l'utilisateur ; score de santé simple (SPF/DKIM/DMARC du domaine d'envoi détectés avec avertissement) ; pas de stockage de mot de passe en clair, jamais de log des identifiants.
- **Acceptation** : test d'envoi réussi ; identifiants illisibles en base ; avertissement si domaine sans SPF/DKIM.

### 4.2 Moteur d'envoi plafonné

- **Prérequis** : 4.1, 3.4.
- **Tâches** : job Inngest d'envoi : **10 emails/heure max par boîte, heures ouvrées** (fuseau du destinataire ou de l'utilisateur, configurable) ; plafond journalier et échauffement progressif ; liste de suppression vérifiée avant chaque envoi ; en-têtes `List-Unsubscribe` ; `Message-ID` propres ; enregistrement du fil ; mode `dry_run` par défaut hors production ; reprise propre après échec (idempotence).
- **Acceptation** : test d'intégration avec boîte de test ; jamais plus que le plafond ; impossible d'envoyer à une adresse en suppression ; aucun envoi sans lot validé.

### 4.3 Relance unique

- **Prérequis** : 4.2.
- **Tâches** : séquence configurable (défaut : une relance à J+10) via `step.sleepUntil` ; même fil (In-Reply-To / References) ; arrêt immédiat à réponse, désinscription ou rebond (`step.waitForEvent("reply.received")`) ; texte de relance généré, court, validé dans le lot (la relance est validée avec le lot).
- **Acceptation** : tests de la machine à états (Envoyé J0 → Relancé → Terminé sans réponse) ; une réponse reçue annule la relance planifiée.

### 4.4 Lecture des réponses (IMAP)

- **Prérequis** : 4.1.
- **Tâches** : job périodique IMAP (imapflow) ; lecture **limitée aux fils de campagne** ; rattachement par `In-Reply-To`/`References`/adresse ; détection des rebonds (DSN) et réponses automatiques ; stockage en `messages` ; **contenu entrant traité comme non fiable** (jamais exécuté, isolé des prompts système).
- **Acceptation** : réponses de test correctement rattachées ; un rebond marque l'adresse invalide et la place en suppression.

---

## M5. Inbox et liens

### 5.1 Classification des réponses

- **Prérequis** : 4.4.
- **Tâches** : classifieur LLM (sortie structurée : catégorie, confiance, justification) sur les 12 catégories de CLAUDE.md 4.2 ; **jeu d'évaluation FR/EN annoté** (≥ 80 réponses) et seuil à atteindre ; actions automatiques par catégorie (désinscription → suppression, rebond, absence → relance repoussée) ; protection contre l'injection de prompt (le texte entrant est une donnée).
- **Acceptation** : précision par catégorie mesurée ; les catégories à risque (plainte, désinscription) ont un rappel élevé ; tests d'injection.

### 5.2 Inbox, réponses prêtes à insérer, politique « payant »

- **Prérequis** : 5.1.
- **Tâches** : vues Chaud, Tiède, Offres payantes, Froid, En négociation, Gagné, Archivé ; fiche prospect avec fil ; génération de brouillon de réponse à valider ; réponse **« prête à insérer »** (page, ancre, phrase à ajouter, phrase « après ») ; **politique « c'est payant »** : décliner / échanger / achat plafonné (défaut : décliner), libellé honnête de la nature du lien ; niveaux d'autonomie (manuel, assisté ; autopilot en 6.2).
- **Acceptation** : aucune réponse envoyée sans validation en mode assisté ; test Playwright du traitement d'une réponse.

### 5.2b Envoi des réponses validées (scindé de 5.2)

- **Prérequis** : 5.2.
- **Tâches** : envoyer les brouillons `reply_drafts` au statut `validee` (dry run par défaut, faux serveur SMTP en test) dans le fil d'origine (`In-Reply-To`), avec les garde-fous d'envoi de 4.2 (suppression, plafonds, boîte vérifiée, `OUTREACH_SENDING_ENABLED` faux) ; enregistrement de l'envoi ; aucun envoi d'un brouillon non validé.
- **Acceptation** : un brouillon non validé ne part jamais (garde-fou en base) ; une adresse supprimée refuse l'envoi ; test sur faux serveur SMTP.

### 5.3 Vérification des liens (fait)

- **Prérequis** : 5.2.
- **Tâches** : job de crawl à J+7, J+14, J+30 : le lien est-il en ligne, dofollow/nofollow, contextuel, page indexable ; table `links` ; statut « Live » ; alerte si le lien disparaît ; page « Liens obtenus ».
- **Acceptation** : détection correcte sur pages de test (lien présent, nofollow, disparu).

### 5.4 Tâches manuelles (formulaires) (fait)

- **Prérequis** : 3.2, 3.4.
- **Tâches** : écran des `manual_tasks` : lien vers la page de contact, message pré-rédigé, bouton copier, marquer comme fait ; intégration au suivi (même statuts) ; rappel dans le digest.
- **Acceptation** : une tâche faite met à jour le prospect ; la relance J+10 s'applique aussi aux formulaires (en tâche).

---

## M6. Produit et paiement

### 6.1 Stripe : plans, crédits, plafonds d'envoi

- **Prérequis** : M4.
- **Tâches** : produits et prix Stripe (gratuit, Starter, Pro ; voir CLAUDE.md 4.6) ; Checkout + portail client ; webhooks idempotents ; `plans`, `subscriptions`, `credits_ledger` ; **plafonds d'envoi et de crédits appliqués côté serveur** ; carte demandée au premier envoi réel ; mode test.
- **Acceptation** : un utilisateur gratuit ne peut pas envoyer ; un abonné est plafonné selon son plan ; tests des webhooks.

### 6.2 Écran Garde-fous et niveaux d'autonomie

- **Prérequis** : 6.1, 5.2.
- **Tâches** : compteur du jour, plafonds, seuil de qualité, règles de validation, pause/reprise ; autopilot sur catégories à faible risque, débloqué après N réponses validées sans modification ; **suspension automatique** sur seuils de rebonds/plaintes ; blocage de domaines sensibles ; journal.
- **Acceptation** : dépasser un seuil suspend bien la boîte ; reprise manuelle nécessaire.

### 6.3 Digest et emails transactionnels

- **Prérequis** : 5.3.
- **Tâches** : Resend (transactionnel uniquement) ; digest hebdo (liens obtenus, réponses, cibles qualifiées, tâches manuelles, prochaine action) ; confirmation d'audit ; alertes (lien disparu, boîte suspendue) ; SPF/DKIM/DMARC du domaine transactionnel.
- **Acceptation** : digest généré à partir de données de test ; aucun email d'outreach ne passe par Resend (test).

### 6.4 Landing FR, pages légales, anti-abus

- **Prérequis** : 1.6.
- **Tâches** : landing en français (hero avec champ « ton site », preuve par dogfooding, ce qu'on ne fait pas, FAQ, tarifs) ; pages mentions légales, CGU, confidentialité, politique anti-spam ; page de désinscription publique ; formulaire de signalement d'abus ; llms.txt ; SEO de base.
- **Acceptation** : parcours complet visiteur → audit gratuit → inscription ; pages légales présentes (rédaction juridique validée en 7.2).

---

## M7. Bêta et lancement

### 7.1 Dogfooding sur mega-coloring.com

- **Tâches** : audit complet, plan, 1 à 2 lots réels, envois plafonnés, suivi des réponses, mesure : cibles contactées, taux de réponse, liens obtenus, coût par lien, coût API par audit.
- **Acceptation** : chiffres consignés dans `PROGRESS.md`, comparés à ta méthode manuelle actuelle ; ajustements listés.

### 7.2 Avis juridique et conformité

- **Tâches** : revue par un juriste de la prospection B2B, du RGPD (base légale, information, opposition), de la non-mention de l'IA dans les emails, des CGU ; registre de traitement ; durée de conservation des données des cibles.
- **Acceptation** : avis écrit ; corrections intégrées.

### 7.3 Bêta fermée puis ouverture

- **Tâches** : 5 à 10 utilisateurs ; suivi des abus et de la délivrabilité ; seuils ajustés ; ouverture progressive ; tableau de bord interne (coût par audit, plaintes, santé des boîtes).
- **Acceptation** : critères d'ouverture définis à l'avance (plaintes < seuil, marge positive par audit gratuit et par plan).

---

## MC. Recherche de cibles « avec angle » (ajouté le 17/11/2026)

**Pourquoi.** Depuis que le rédacteur refuse d'écrire sans raison honnête, 2 messages sur 20 relus méritaient d'être envoyés. Le problème est en amont. Mesuré sur la campagne remove-me.io du 17/11 (1 366 candidats, 80 cibles retenues) :

- Les 80 pages retenues sont 32 pages légales (politiques de confidentialité), 27 pages d'accueil, 1 rubrique et seulement 20 pages intérieures. Les 2 seuls angles honnêtes étaient 2 de ces 20 articles.
- Toutes les recherches partent du THÈME du site (« école protection des données personnelles », un seul mot-clé de contenu, « protection données personnelles », qui a fourni 39 des 80 cibles). Une page qui contient ces mots est le plus souvent une politique de confidentialité.
- Aucune recherche ne part des 65 articles précis du site (fuite de données Free, démarchage téléphonique après le 11 août 2026, supprimer son compte LinkedIn...).
- La qualification note la proximité du sujet sur un extrait de 1 200 caractères. Elle ne demande jamais si un lien aurait sa place sur la page ni si quelqu'un la modifiera.
- 498 candidats n'ont jamais été lus (budget de lecture), dont 150 sites qui lient déjà des concurrents.
- Les « concurrents » recoupés étaient fr.norton.com, senat.fr, studyrama.com... : des sites qui parlent du thème, pas des pages comparables aux nôtres.
- Constats concrets (lien mort, mention sans lien) : 4 sur 80.

**Principe.** Trois familles de recherche, toutes à partir de ce que le site possède vraiment (son profil, ses publics, ses pages précises), puis une seule question avant de dépenser en contact et en rédaction : un lien a-t-il sa place sur cette page, et quelqu'un la modifiera-t-il ?

1. **Par sujet** : pour chaque page précise du site, les pages d'autres sites qui traitent exactement ce point.
2. **Par public** : pour chaque page précise, les éditeurs dont les lecteurs en ont besoin. Les publics viennent de l'analyse du site déjà faite (`brand_profiles.personas`) ; on les croise avec le sujet de la page, plus avec le thème général. Le meilleur angle du 17/11 (les professeurs documentalistes) venait d'une recherche par public.
3. **Par lien mort** : les pages qui citent une ressource disparue que le site peut remplacer. C'est l'angle le plus solide : la personne a un problème, on lui apporte la solution.

**Règle de généralité (décision de Jonathan, 17/11/2026).** remove-me.io n'est qu'un site de test. Aucun mot, aucune règle, aucun seuil propre à un thème dans le code : tout vient du profil et des pages du site. Chaque sous-jalon se mesure sur au moins deux sites de thèmes différents (remove-me.io et mega-coloring.com) et n'est validé que si le gain tient sur les deux.

Un sous-jalon = une session. Chaque sous-jalon se termine par une mesure comparée à la référence (10 % de cibles avec angle).

### MC.0 Mesurer avant de construire (essai sans code produit)

- Sur les deux sites de test, prendre 6 pages précises. Pour chacune : 2 recherches par sujet et 2 recherches par public (publics du profil), 10 premiers résultats.
- Retirer par l'adresse les pages d'accueil, légales, commerciales et les rubriques. Sur les pages restantes, relever les liens sortants cassés du contenu.
- Passer un échantillon au tri d'angle du rédacteur (petit modèle, puis modèle fort sur les pages retenues).
- Critère : au moins 30 % de pages avec angle après le filtre gratuit, sur chacun des deux sites (référence : 10 %). En dessous, revoir le principe avant de coder la suite.
- Sortie : tableau par site et par famille de recherche (résultats, pages lues, angles, liens morts utiles, coût), noté dans `PROGRESS.md`.

**Résultat de MC.0 (18/11/2026) : critère non atteint** (4 % et 3 % de pages avec angle, détail dans `PROGRESS.md`). Les 10 premiers résultats d'une recherche par sujet ou par public sont de gros médias, des sites officiels et des concurrents. Conséquences : MC.2 n'est pas à coder tel quel ; MC.1 commence par rétablir les vraies adresses des résultats (`resolve_goto_urls`), défaut réel du produit ; un essai MC.0b doit mesurer les familles non testées (pages de liens de petits sites, résultats au-delà du rang 10, qui cite déjà une page comparable, pages disparues encore citées) avant tout développement.

**Résultat de MC.0b (18/11/2026) : la bonne direction.** Référence terrain de Jonathan : ses liens viennent de pages qui citent DÉJÀ des ressources comme la sienne (petit éditeur de son public, page qui cite plusieurs ressources comparables, lien mort). En partant des liens entrants de ressources comparables : 10 % et 15 % de cibles (4 % et 3 % en MC.0), 300 à 900 domaines candidats pour 0,20 USD, et des cibles du type qu'il décrit. Le rendement dépend de la ressource de départ. Les liens morts ne sortent pas encore. **Ordre de travail révisé** : MC.1 (vraies adresses et filtre gratuit), puis MC.6, puis un essai dédié aux liens morts ; MC.2, MC.3b et MC.4 sont à relire à la lumière de MC.6 avant d'être codés.

### MC.6 Qui cite déjà des ressources comparables (nouvelle source principale)

À lire avant de commencer : `docs/mc0b-essai.md` (réglages des appels, filtre, consigne de jugement des trois cas, rendement par ressource). Découpage en sessions : **MC.6a** la source dans la collecte (ressources comparables, liens entrants, filtre gratuit, coût annoncé et plafonné) ; **MC.6b** le jugement des trois cas dans la qualification et le tri du rédacteur, et le pilotage par ressource ; **MC.6c** la boule de neige et la mesure sur une vraie campagne des deux sites.

- **Ressources comparables** : pour chaque site, les sites et pages que les autres citent pour le même besoin. Deux origines, sans règle propre à un thème : les concurrents qui sortent sur les recherches par sujet (les « concurrents » écartés jusqu'ici sont la liste de départ), et les ressources que citent les pages déjà retenues.
- **Liens entrants** de chaque ressource (DataForSEO, une page par domaine, langue de la campagne, spam plafonné) : chaque page qui la cite est candidate. Coût mesuré : 0,024 à 0,03 USD par ressource pour 150 pages.
- **Pilotage par ressource** : lire 6 à 8 pages par ressource, puis ne poursuivre que celles qui donnent des cibles ; une ressource citée surtout dans des pages légales ou des fermes à liens est abandonnée.
- **Critère de jugement** aligné sur les trois cas de Jonathan (lien mort remplaçable, petit éditeur du public qui cite des ressources, page de contenu qui cite plusieurs ressources comparables), y compris dans le tri du rédacteur ; un billet ancien n'est pas un motif de refus ; les fermes à liens sont écartées.
- **Boule de neige** : depuis chaque cible retenue, suivre ses liens vers des sites du même genre et lire leurs pages de ressources (gratuit).
- Mesure sur les deux sites : cibles par campagne (objectif 30 à 40 messages envoyables), part de cibles par ressource, coût.

**MC.6a faite (18/11/2026)** : phase `citations` de la collecte (6 ressources au plus, coût annoncé et plafonné, ~0,19 USD par site), ressources choisies par le petit modèle parmi les concurrents de l'audit et les sites vus sur les recherches, filtre gratuit d'adresse (accueil, légale, fichier) dans l'étage 1 de la qualification, vraies adresses des résultats Google avec repli. Détail et mesures dans `PROGRESS.md`. Reste pour **MC.6b** : jugement des trois cas dans la qualification et le rédacteur, pilotage par ressource ; pour **MC.6c** : boule de neige et mesure sur une vraie campagne des deux sites.

**MC.6b faite (18/11/2026), objectif NON atteint** : jugement des trois cas dans la qualification et dans le rédacteur, relevé gratuit de ce que la page cite, pilotage par ressource (sondage de 8 pages, abandon), choix des ressources mieux informé (page d'accueil de chaque candidat, concurrents non retenus par l'audit), deux jeux d'évaluation annotés. Mesure réelle, liste courte rejugée par le modèle fort : **3 cibles sur 35 pour mega-coloring.com (~3 % des pages lues), 0 sur 33 pour remove-me.io** (MC.0b, ressources choisies à la main : 15 % et 10 %). Cause : les ressources choisies automatiquement sont des sites qui achètent leurs liens ; les pages qui les citent sont des fermes à liens, des articles sponsorisés et des annuaires, que le petit modèle ne reconnaît pas sur un extrait. Détail dans `PROGRESS.md`.

**MC.6c faite (18/11/2026), mesure conclusive** : sur les deux sites, avec le critère de MC.6b. L'ancre du lien ne sert à rien (les fermes à liens écrivent le nom du site). La lecture de la page entière (6 000 caractères, `claude-haiku-5-5`) nettoie la liste courte (38 à 11 et 31 à 15) sans créer de cibles. **La boule de neige est la seule piste qui change le résultat : mega-coloring.com 11 cibles sur 34 (32 %, objectif atteint), remove-me.io 4 sur 23 (17 %) avec des ressources publiques gratuites choisies à la main (sans graine).** Codé : page entière et modèle de qualification, pages paginées écartées par l'adresse. Détail dans `PROGRESS.md`.

**MC.6d faite (18/11/2026), objectif de 30 % NON atteint sur la liste complète** : phase `boule_de_neige` dans le produit (sites cités par les cibles retenues, jugés par `resource-judge`, 6 ressources au plus, coût annoncé ~0,18 USD et plafonné, pages ajoutées à la réserve et lues avec le pilotage par ressource), repli « ressources publiques et gratuites ». Mesure avec les graines trouvées seules, liste courte rejugée par le modèle fort : **mega-coloring.com 2 sur 24 au premier passage puis 10 sur 35 pour la boule de neige (29 % de ses pages ; liste complète 12 sur 59, 20 %) ; remove-me.io 0 sur 10 puis 3 sur 14 (21 % ; liste complète 3 sur 24, 12 %)**. Le repli forcé sur remove-me.io ne retient rien. Haiku (sous-agent) sur le jeu des trois cas : précision 1,00, rappel 0,90. Détail dans `PROGRESS.md`.

**MC.6e faite (18/11/2026)** : (1) catalogue COMPLET du site (`site_catalogue` : sitemap plus pages visitées avec titre, titre principal, description ; plafond 100 / 200 / 500 / 1 000 selon le palier, la bêta compte comme Starter) ; présélection gratuite de 25 pages par mots communs ; consigne système mise en cache. (2) Cinq refus seulement, le reste devient une note « à relire » ; bouton « Rédiger quand même » (n'existait pas) sur toute cible écartée. (3) Mesure A/B sur les mêmes 25 cibles par site : **mega-coloring.com 3 sur 23 → 12 sur 23, remove-me.io 0 sur 25 → 11 sur 25** (cibles gardées par le modèle fort). Attention : le gain vient presque entièrement de la règle de refus (cibles gardées par proximité, situation « autre »), pas du catalogue ; la qualité de ces messages reste à mesurer. Détail dans `PROGRESS.md`. **Reste (MC.6f)** : relire les messages « par proximité » avec Jonathan, première passe de ressources réduite, graines sans services payants, repli « publiques » alimenté par une recherche.

### MC.1 Filtre gratuit par nature de page

- **D'abord les vraies adresses** : demander `resolve_goto_urls` à la recherche DataForSEO, pour ne plus lire une page d'accueil ou une page approximative à la place de l'article trouvé (`resolveRedirect`, `exact: false`). Mesurer le coût et le délai réels.
- Écarter avant toute lecture payante : page d'accueil, page légale (politique de confidentialité, mentions, CGU, cookies), page commerciale (tarifs, fiche de formation ou de produit, panier), rubrique, étiquette, pagination, recherche interne. Par l'adresse d'abord, puis par la page lue (peu de texte éditorial, formulaire d'achat, date de publication).
- Exception : une page d'accueil reste candidate pour une mention sans lien ou un lien mort constaté.
- Motif d'exclusion lisible, compté dans l'entonnoir. Jeu d'essai annoté (les 80 cibles du 17/11 : 60 doivent tomber, les 2 bonnes doivent rester).

### MC.2 Recherches par sujet et par public, à partir des pages du site

- Réutiliser le catalogue du rédacteur (`site_pages`) et les publics du profil (`brand_profiles.personas`). Pour chaque page précise, le modèle écrit des recherches par sujet (ce qu'un article voisin viserait) et des recherches par public (ce public + ce sujet), et dit quel public a besoin de quelle page.
- S'il y en a un, il relève le « fait nouveau » que la page connaît et que d'anciens articles ignorent (une règle qui a changé, un service fermé) : les pages qui donnent encore l'ancienne information sont des cibles naturelles.
- Ces recherches remplacent la majorité des recherches « public + thème général » de l'univers de requêtes ; le coût annoncé avant lancement ne change pas d'ordre de grandeur (0,006 USD par recherche).
- Chaque candidat garde la page du site et le public qui l'ont fait trouver : le rédacteur part de là au lieu de deviner.
- Mesure : part de pages avec angle par famille (sujet, public), sur les deux sites.

### MC.3 Liens morts

Trois sources, de la moins chère à la plus chère. Aujourd'hui : 11 candidats et 4 constats sur 80 cibles, la phase étant coupée par son budget.

- **Dans les pages déjà trouvées (gratuit)** : vérifier les liens sortants du contenu de chaque page lue (pas seulement ceux de la liste courte), et ne garder que les liens cassés dont le sujet correspond à une page du site. Un lien cassé sans rapport n'est pas un angle (le flux d'agenda d'isoc.fr, 17/11).
- **Pages disparues de sites comparables (payant, plafonné)** : pour les sites dont les pages se classent sur les mêmes recherches que les nôtres, lire leurs pages en 404 qui reçoivent encore des liens, puis QUI les cite. Remplace le choix actuel des « concurrents » par thème (fr.norton.com, senat.fr le 17/11).
- **Ressources connues qui ont fermé** : quand le profil ou une page du site nomme un service, un outil ou une page officielle qui n'existe plus, chercher qui le cite encore.
- Pour chaque lien mort retenu : la page du site qui le remplace, vérifiée en 200, et l'adresse exacte du lien cassé (le message la cite).
- Coût à annoncer et à plafonner : mesuré le 16/11, 0,05 USD par appel de backlinks.

### MC.3b Qui cite déjà une page comme la nôtre

- Pour chaque page du site, repérer les 3 à 5 pages les mieux placées sur ses recherches, puis lire QUI les cite (backlinks de la page, pas du domaine). Une page qui cite déjà un guide équivalent a une place pour le nôtre.
- À lancer seulement si MC.2 et MC.3 ne suffisent pas à atteindre l'objectif de volume : c'est la famille la plus chère.

### MC.4 La qualification juge l'angle, pas le sujet

- Remplacer la note de proximité par le tri d'angle du rédacteur, sur la page lue en entier, avec le petit modèle de génération actuelle (≈ 0,001 USD par page lue en entier ; aujourd'hui ≈ 0,0014 USD par cible pour un extrait de 1 200 caractères).
- Avec ce prix, lire aussi la réserve (498 candidats jamais lus le 17/11) : objectif 500 à 600 pages jugées par campagne pour moins de 1 USD.
- Le verdict et la page proposée sont gardés : le rédacteur ne refait pas le tri, il rejuge et écrit. La recherche de contact ne se fait plus que pour les cibles avec angle.
- Classement de la liste courte par force de l'angle (lien mort ou fait périmé, puis manque explicite, puis liste de ressources tenue), avant l'autorité du site.

### MC.5 Rendement par source et pilotage

- Entonnoir par source et par type de recherche : candidats, pages lues, angles, messages prêts, puis réponses et liens obtenus.
- Le budget d'une campagne va d'abord aux sources qui donnent des angles ; une source sous 5 % après 40 pages lues est arrêtée.
- Écran de campagne : « N pages lues, N avec une raison de demander un lien, N messages prêts », et les cibles écartées avec leur motif.

**Objectifs (à confirmer après MC.0).** 30 à 40 messages envoyables par campagne (10 aujourd'hui avec le filtre), coût total d'une campagne sous 5 USD, aucune cible de la liste courte sans angle.

**Hors périmètre.** Recherche du bon destinataire (auteur de l'article plutôt que l'adresse générale), exemples de messages de Jonathan, presse et journalistes : à traiter après.

## Plus tard (hors plan v1)

OAuth Gmail/Outlook, extension navigateur pour formulaires et badges SERP, module annuaires, serveur MCP, marque blanche, autres langues.

---

## Prompt de démarrage d'une session (modèle)

```
Lis CLAUDE.md et PROGRESS.md. Puis lis uniquement le sous-jalon M{x}.{y} dans PLAN.md.
Vérifie que ses prérequis sont faits dans PROGRESS.md. Annonce ce que tu vas faire et ce que tu ne feras pas.
Reste dans le périmètre. À la fin : tests/lint/typecheck verts, PROGRESS.md à jour, commit sur la branche m{x}.{y}-{nom}, PR, puis donne-moi le prompt de la session suivante.
```

## Modèle de PROGRESS.md

```
# PROGRESS.md
## État
| Sous-jalon | Statut (à faire / en cours / fait / partiel) | PR | Date |
## Décisions prises
## Fichiers et modules clés
## Commandes (dev, tests, migrations, Inngest)
## Mesures (coût par audit, taux de contact, etc.)
## Dettes et pièges
## Backlog (idées hors périmètre)
## Prochain sous-jalon recommandé
```
