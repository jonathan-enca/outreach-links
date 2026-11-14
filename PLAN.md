# PLAN.md — Plan de code par jalons et sous-jalons

> Lié à `CLAUDE.md` (contexte produit, section 15 = méthode de travail). **Un sous-jalon = une conversation Claude Code.** Chaque sous-jalon liste : objectif, prérequis, tâches, livrables, critères d'acceptation, hors périmètre.
> Conventions techniques : Next.js (App Router) + TypeScript strict, pnpm, Supabase (migrations SQL versionnées, RLS partout), Inngest, zod pour toute entrée/sortie externe, Vitest, Playwright pour 2 ou 3 parcours clés, UI en français (chaînes dans un fichier `messages/fr.ts`), shadcn/ui + Tailwind.

## Vue d'ensemble

| Jalon | Sujet                  | Sous-jalons      | Résultat visible                                       |
| ----- | ---------------------- | ---------------- | ------------------------------------------------------ |
| M0    | Fondations             | 0.1 à 0.4        | App déployée, auth, base, Inngest, suivi des coûts     |
| M1    | Audit et concurrents   | 1.1 à 1.6        | Audit gratuit public avec capture d'email              |
| M2    | Plan de liens          | 2.1 à 2.3        | Plan validable (opportunités, liens morts)             |
| M3    | Tri des cibles et lots | 3.1 à 3.4        | Lots de messages prêts à valider                       |
| M4    | Envoi et relance       | 4.1 à 4.4        | Envois plafonnés, relance unique, lecture des réponses |
| M5    | Inbox et liens         | 5.1 à 5.4        | Réponses classées, liens vérifiés, tâches formulaires  |
| M6    | Produit et paiement    | 6.1 à 6.4        | Stripe, garde-fous, digest, landing, anti-abus         |
| M7    | Bêta et lancement      | 7.1 à 7.3        | Dogfooding, avis juridique, ouverture                  |
| MA    | Refonte de l'audit     | A.1 à A.6        | Audit repensé sur la base des mesures réelles          |
| MD    | Design du site global  | D.1 (à découper) | Identité visuelle et UX cohérentes, site entier        |

Chemin critique pour un **premier test réel sur mega-coloring.com** : M0 → M1 → M2 → M3 → M4.1 à 4.3. Le reste peut suivre.

Un sous-jalon fait vaut quand : critères d'acceptation cochés, tests/lint/typecheck verts, `PROGRESS.md` à jour, PR ouverte.

### Jalons ajoutés le 14/11/2026 (décision de Jonathan, à découper avant de commencer)

- **MA. Refonte du process d'audit.** À reprendre à plat après le premier audit réel (voir PROGRESS.md, « M1.6 bis ») : concurrents retenus trop gros (cultura, shutterstock, pixabay), site sans mot-clé classé = score 0 et audit vide, URL de page inconnues quand la SERP renvoie des redirections Google, coût réel du Backlinks ~20 % au-dessus de la grille et marge gratuite quasi nulle, étapes M1.3 à M1.5 et M2.1 enchaînées avec confirmations séparées. À décider : audit pensé pour un site neuf, choix des concurrents par taille et pertinence, parcours unique et plus court, valeur de l'aperçu gratuit. Prérequis : M2 terminé (pour juger l'audit avec le plan de liens). À placer avant l'ouverture publique (M6/M7).
- **MD. Design du site global.** Identité visuelle et expérience du site entier (accueil, audit gratuit, connexion, écrans `/app`) : direction artistique, mode sombre, mobile, accessibilité, contenu réel des écrans de la coquille M0.4. Prérequis : MA (le design suit le nouveau parcours d'audit). Hors périmètre : nouvelles fonctionnalités.

### MA. Découpe en sous-jalons (14/11/2026, options par défaut les plus simples et les moins coûteuses)

Ordre : chaque sous-jalon est livrable seul, sans appel payant en CI, et réduit coût ou bruit.

- **MA.1 Concurrents actionnables (fait).** Liste `GIANT_DOMAINS` (banques d'images, grande distribution, médias, institutions) ajoutée aux exclusions de la découverte ; zéro coût d'API. Hors périmètre : filtre par taille réelle (MA.2).
- **MA.2 Filtre de taille avant l'étape coûteuse (fait, via `bulk_referring_domains` en une requête).** Utiliser `backlinks.summary` (déjà appelé) pour écarter les concurrents au-delà d'un seuil de domaines référents (défaut : 20 000 en gratuit, 100 000 en payant) **avant** `backlinks.backlinks`, et les remplacer par les candidats suivants ; économise le coût Backlinks. Tests sur fixtures.
- **MA.3 Grille de coûts recalée.** Ajuster `estimate` sur les coûts réels mesurés (Backlinks ~ +20 %, `ranked_keywords` 0,012) ; marge gratuite restaurée (réduire `limit` des backlinks du gratuit plutôt que relever le plafond de 0,25 USD).
- **MA.4 Site neuf sans mot-clé classé.** Au lieu d'échouer (`aucun_mot_cle`), mode « site neuf » : requêtes issues de la niche saisie (3 requêtes par défaut, sans LLM), score affiché « non classé » (pas 0), plan fondé sur les concurrents seulement.
- **MA.5 URL exactes des cibles.** Marquer les URL issues de redirections Google comme partielles (`url_exact = false`) ; résolution tardive par fetch (M3.1) ; pas de second appel SERP payant.
- **MA.6 Parcours unique.** Une seule confirmation du coût total, puis enchaînement automatique concurrents → backlinks → profil → opportunités ; progression unique sur la page d'audit.
- **MA.7 Valeur de l'aperçu gratuit.** Revoir ce que montre l'aperçu (en tenant compte de MA.2 à MA.5) ; hors design visuel (MD).

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

### 5.3 Vérification des liens

- **Prérequis** : 5.2.
- **Tâches** : job de crawl à J+7, J+14, J+30 : le lien est-il en ligne, dofollow/nofollow, contextuel, page indexable ; table `links` ; statut « Live » ; alerte si le lien disparaît ; page « Liens obtenus ».
- **Acceptation** : détection correcte sur pages de test (lien présent, nofollow, disparu).

### 5.4 Tâches manuelles (formulaires)

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
