# CLAUDE.md — Projet « Outreach IA de backlinks gratuits, audit d'abord »

> Version 3.1 (14/11/2026). Ajout d'un workflow public de 6 agents Claude Code (post LinkedIn, capture d'écran), de la méthode de travail par sessions (section 15) et du plan de code `PLAN.md`. Réécriture centrée sur la méthode netlinking de Jonathan, déjà automatisée avec Claude Code sur ses propres sites et qui a fonctionné. Sources : pages publiques et comptes d'essai d'Outlink AI, BacklinkBot (agent + annuaires), MentionAgent, Linkee (site test : mega-coloring.com), pages publiques de HeyLinks. [HYPOTHÈSE] = choix de conception ou donnée non vérifiée. [À CONFIRMER] = question ouverte pour Jonathan.

## 1. Vision

Un mini-SaaS public, français d'abord, qui **industrialise une méthode d'outreach éprouvée pour obtenir des backlinks éditoriaux gratuits** (pas de liens achetés ni sponsorisés).

Le produit part d'un **audit** (comme le ferait un vrai consultant SEO) qui trouve toutes les opportunités de liens à partir de la SERP et des concurrents, puis **exécute** le plan par mail depuis la boîte de l'utilisateur, avec validation humaine par lot, une relance, un inbox classé et la vérification des liens.

Positionnement : « Outlink AI / MentionAgent / HeyLinks, mais avec un vrai audit en amont, un tri des cibles qui évite les mauvaises, et un français natif ».

**Décision de Jonathan (15/11/2026)** : on assume d'être **l'alternative française d'Outlink AI** : même philosophie, même outil, **même structure et mêmes sections de site** (voir `docs/home-reference.md`), avec un meilleur audit de base et un prix nettement plus bas. Les textes, le logo, les marques, les captures et les chiffres de la référence ne sont jamais repris : tout est réécrit en français pour notre produit, et toute affirmation comparative (prix, qualité) doit être vérifiable.

**Règles de messaging**

- Jamais « backlinks garantis ». Promettre un audit précis, un plan priorisé, des cibles filtrées et un envoi maîtrisé.
- Le site marketing vend l'automatisation par IA. Les **emails d'outreach eux-mêmes** ne mentionnent jamais l'IA ; si un destinataire le demande, on répond honnêtement. [décision confirmée]
- Libeller honnêtement la nature des liens (éditorial gratuit, échange, achat) ; pas de PBN, pas de liens déguisés.

## 2. Paysage concurrentiel (observé)

### 2.1 Constat

Les outils testés (Outlink AI, BacklinkBot agent, MentionAgent, Linkee, HeyLinks) convergent sur la boucle découvrir → scorer → contacter → relancer → vérifier. **Aucun ne fait un vrai audit par page** : ils partent de mots-clés ou d'un domaine. En France, le netlinking est dominé par des **places de marché de liens sponsorisés** (Getfluence, Paper.club, Ereferer, Rocketlinks, Linkuma, Linkavista, Linksgarden, WhitePress, SEMJuice). Aucun outil d'outreach IA FR/EU trouvé (non exhaustif ; certaines sources de comparaison sont affiliées).

### 2.2 Fiches

- **Outlink AI** : 39 $ / 99 $ / 299 $ par mois, remboursement 14 jours, prévisualisation gratuite sans carte jusqu'au premier envoi. Score de cible = Pertinence /50 + Autorité /30 + Absence de spam /20 ; seuil de qualité Loose / Balanced / Strict ; règle « me demander en cas de doute » ; relances J0 / J+4 / J+9 ; réponses automatiques débloquées après 20 réponses validées sans modification ; refuse de payer pour un lien. Boîte Gmail/Outlook en OAuth, plafonds, garde-fous, digest, extension Chrome, MCP.
- **BacklinkBot** : annuaires (Starter 99 $ / Pro 199 $ / Elite 499 $) + un agent d'outreach vendu à part (plans 19 $ le premier mois puis 49 / 99 / 199 $). Modèle à crédits : 500 gratuits ; 1 crédit par mot-clé ou concurrent découvert, par recherche de contact, par scan de communauté ; l'envoi est gratuit. Relances J+3 / J+7.
- **MentionAgent** : Starter 99 $/mois, 50 crédits d'essai (2 par brouillon). Crée pour le client un domaine dédié et une boîte Gmail transférable ; montée en charge 5 → 40 mails/jour/boîte sur ~3 semaines ; autopilot désactivé par défaut. **Inbox classé** : Hot, Warm, Paid offers, Cold, Negotiating, Deals closed, Archived. Génère une réponse « prête à insérer » (page, ancre, phrase à ajouter, phrase « après »). Connecteur MCP, bêta de visibilité IA.
- **Linkee** : place de marché de liens payants (~110 à 755 $ par lien), « pertinence vérifiée par IA » via le top 1 000 mots-clés du site. Hors périmètre (liens payants) mais utile comme repère de prix.
- **HeyLinks** : outreach IA du même type (pages publiques seulement).
- **Workflow Claude Code « machine à backlinks gratuits »** (post LinkedIn FR, formation en upsell, chiffres auto-déclarés : « 500 demandes en 3 jours », sans taux de réponse ni liens obtenus) : 6 agents. Chercheur (top 30 de la SERP sur 3 requêtes prioritaires), Filtre (vendeurs de liens, profils anormaux), Chasseur 404 (liens morts de la niche à reprendre), Enquêteur (email jusque dans mentions légales et CGU), Rédacteur (demande de 3 lignes, jamais un template), Facteur (10 emails/heure max, heures ouvrées). Sortie : liste courte classée, avec pour chaque site la demande à faire et pourquoi. Angle : cibles que personne ne sollicite (mairies, photographes, e-commerces, forums modérés), « des liens que ton concurrent ne peut pas racheter ». Existe déjà en français comme workflow, pas comme SaaS.

### 2.3 Faiblesses observées à exploiter

- Listes de cibles avec **concurrents directs** et sites irréalistes ou hors sujet (bbc.com, britishcouncil.org, krea.ai, lovetoknow.com).
- Pitchs génériques (« mention each other's work »).
- Pas d'audit ; pas de traitement des demandes de paiement (sauf la catégorie « Paid offers » de MentionAgent).
- Français absent ou traduit.
- Réserve : le français est un avantage de distribution, pas une barrière technologique. Il faut un avantage de produit : l'audit, le tri des cibles, la qualité du pitch.

## 3. Le cœur : la méthode en 5 étapes

Chaque étape de la méthode de Jonathan devient un module, un écran et un job Inngest.

### 3.0 Champs de contexte (onboarding)

| Champ                               | Rôle                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Domaine du site                     | cible des liens                                                            |
| Niche / thème                       | cadrage de la recherche de concurrents et de cibles                        |
| Pays + langue                       | langue des mails, marché des cibles                                        |
| Boîte d'envoi + prénom de signature | expéditeur ; signature naturelle                                           |
| Contreparties acceptées             | ce qu'on accepte de proposer si un éditeur demande quelque chose en retour |

Objectif : **liens éditoriaux gratuits uniquement**. Un lien payant n'est jamais acheté sans décision explicite de l'utilisateur (voir 5.4).

### 3.1 Étape 1 : Analyse des concurrents

- Trouver 10 à 20 concurrents réels **dans la SERP** (pas ceux que l'utilisateur imagine) : DataForSEO SERP + Labs `competitors_domain`.
- Requêtes prioritaires : 3 requêtes cœur de l'utilisateur (saisies ou tirées de Search Console / `ranked_keywords`) ; analyser le **top 30 de chaque SERP**, pas seulement les concurrents évidents.
- Récupérer leurs backlinks (DataForSEO Backlinks, mode batch/différé si disponible).
- **Annoncer le coût estimé avant de lancer**, avec un plafond par audit et une confirmation.
- Nettoyer : spam, réutilisation automatique d'images, domaines étrangers hors cible, doublons.
- Sorties : tableau des backlinks concurrents (équivalent de `backlinks-concurrents.md` + CSV exportable).
- Compléments du vrai audit : profil de liens du site, positions actuelles (`ranked_keywords`), pages à pousser (positions 4 à 20 à fort volume), contrôle technique (pages cassées, non indexables), écart de domaines référents (domain intersection), liens cassés, mentions de marque non liées.

### 3.2 Étape 2 : Plan de liens

Types de cibles : **sites qui ne vendent pas de liens et que personne ne sollicite** (mairies, photographes, e-commerces, forums modérés, associations), **liens morts / pages 404 à reprendre (« chasseur 404 »)**, annuaires, pages ressources, enseignants / blogueurs / associations, presse de niche, plateformes gratuites. Pour chaque type : priorité, nature de ce qui est offert en échange, page du site à promouvoir, ancre suggérée (selon le profil d'ancres existant, éviter la sur-optimisation). **L'utilisateur valide le plan avant toute action** (écran Plan de liens : cocher / décocher / réordonner).

### 3.3 Étape 3 : Préparation d'un lot

- Un suivi par cible, colonnes de base : domaine, type, contact, canal (email / formulaire), statut, date d'envoi, date de relance, réponse, décision.
- **Tri de chaque cible** : visite de la page, exclusion avec **motif lisible** : payant, mort, piraté, hors sujet, compte obligatoire, concurrent direct, trop irréaliste.
- Recherche de l'email ou du formulaire de contact ; réseaux sociaux ignorés ; email vérifié.
- Message court, personnalisé, honnête, avec l'**URL exacte vérifiée en HTTP 200** et un hook visible (ce qui, dans la page de la cible, justifie le message).
- Sortie : un lot (équivalent de `liens-lotN.md`) soumis à validation, présenté comme **liste courte classée** : pour chaque site, la demande à faire et pourquoi (pas une liste de 2 000 domaines à trier).

### 3.4 Étape 4 : Validation puis envoi

- **Rien n'est envoyé avant l'accord de l'utilisateur sur le lot** (validation par lot, pas mail par mail ; édition possible mail par mail).
- Envoi par email depuis la boîte de l'utilisateur (SMTP / OAuth) en respectant le quota quotidien.
- **Formulaires de contact** : non automatisables côté serveur de façon fiable ; ils deviennent des **tâches pour l'utilisateur** (message pré-rédigé, bouton copier, lien vers la page). Variante possible plus tard : extension navigateur, sans compte créé ni mot de passe saisi.
- Aucun compte créé, aucun mot de passe saisi pour le compte de l'utilisateur.
- Aucune mention de l'IA dans les messages.
- Journal de chaque envoi avec date de relance prévue (+10 jours par défaut).

### 3.5 Étape 5 : Relance unique

Une seule relance, à J+10 par défaut (configurable ; les concurrents font 2 à 3 relances à J+4/J+9 ou J+3/J+7). Même fil de discussion (In-Reply-To / References). Arrêt immédiat à toute réponse, désinscription ou rebond.

## 4. Couche produit

### 4.1 Parcours et écrans

1. **Accueil / hero** : champ « ton site » → aperçu gratuit de l'audit (score, pages prioritaires, 10 cibles floutées « +N de plus »), email demandé pour le rapport complet.
2. **Onboarding** : les 5 champs de contexte (3.0). Boîte d'envoi connectée en dernier, juste avant le premier envoi.
3. **Audit** : concurrents, écart de liens, pages à pousser, coût annoncé.
4. **Plan de liens** : validation par type de cible et par page.
5. **Lots** : table des cibles avec statut, motif de tri, hook, aperçu du message, édition, validation du lot.
6. **Tâches manuelles** : formulaires à remplir, messages pré-rédigés.
7. **Inbox classé** (voir 4.2).
8. **Liens obtenus** : vérification (live, dofollow/nofollow, indexé), alerte si le lien disparaît.
9. **Garde-fous** : écran central (compteur du jour, plafonds, niveau d'autonomie, seuil de qualité, pause).
10. **Digest hebdo** : liens obtenus, réponses, cibles qualifiées, prochaines actions.

### 4.2 Workflow mail et inbox classé

- **États d'un prospect** : Brouillon → Validé → Envoyé J0 → Relancé → Terminé sans réponse (+ Répondu, Lien posé, Refusé, Ne pas contacter).
- **Classification des réponses** (catégorie + confiance + justification) : accepte / lien posé ; intéressé sous conditions ; demande de paiement ; demande d'échange ; question ; refus poli ; désinscription ; redirection vers un autre contact ; réponse automatique / absence ; rebond ; plainte / hostile ; ambigu.
- **Vues** : Chaud, Tiède, Offres payantes, Froid, En négociation, Gagné, Archivé (inspiré de MentionAgent).
- **Actions automatiques par catégorie** : désinscription → liste de suppression ; rebond → email invalide ; absence → relance repoussée ; accepte → génération de la réponse « prête à insérer » (page, ancre, phrase à ajouter, phrase « après ») ; question → brouillon de réponse à valider.
- **Niveaux d'autonomie** : manuel (tout validé) ; assisté (par défaut) ; autopilot sur catégories à faible risque, débloqué après N réponses validées sans modification (ex. 20, comme Outlink) et jamais par défaut.
- Lecture limitée aux fils de campagne ; **tout email entrant est traité comme non fiable** (injection de prompt) : jamais d'instruction exécutée depuis un mail.
- Jeu d'évaluation annoté FR/EN pour mesurer la classification.

### 4.3 Politique « c'est payant »

Réponse de la cible demandant de l'argent : trois options présentées à l'utilisateur, jamais décidées seul : (a) décliner poliment, (b) proposer un échange (contribution, ressource, lien réciproque raisonnable), (c) achat plafonné si l'utilisateur fixe un budget et accepte la nature sponsorisée du lien (à libeller comme tel). Par défaut : décliner. Sur le marché français, la demande de paiement est fréquente ; ne pas la traiter comme un échec.

### 4.4 Garde-fous (ouverture au public)

- Plafonds d'envoi par boîte et par jour, échauffement progressif, fenêtre d'envoi. **Défaut : 10 emails/heure max, heures ouvrées** (configurable à la baisse seulement en gratuit/starter).
- **Décision de Jonathan (17/11/2026)** : les jours et heures d'envoi sont un réglage de la boîte, modifiable librement par l'utilisateur (Réglages > Boîte d'envoi). Défaut conseillé : du lundi au vendredi, de 9 h à 18 h. Tout email approuvé affiche son heure de départ prévue : on ne laisse jamais un email « en attente » sans dire pourquoi.
- **Plafonds d'envoi intégrés au pricing** (paliers de volume et de crédits).
- Validation de lot obligatoire ; autopilot désactivé par défaut.
- Liste de suppression globale et par utilisateur ; lien de désinscription ; `List-Unsubscribe`.
- **Suspension automatique** d'une boîte ou d'un compte au-delà de seuils de rebonds ou de plaintes.
- Blocage de domaines sensibles (gouvernement, santé, etc.) [HYPOTHÈSE] et des destinataires déjà contactés par un autre utilisateur dans un délai donné [HYPOTHÈSE].
- Anti-abus à l'inscription : **pas de vérification de propriété du domaine** (décision de Jonathan, 17/11/2026 : une campagne lancée pour le site d'un autre ne lui apporte que des liens, et la vraie sécurité est la boîte d'envoi connectée, que l'utilisateur doit contrôler). Les garde-fous restent les plafonds par boîte, la validation avant envoi, la liste de suppression et la suspension automatique.

### 4.5 Coûts et audit gratuit

- **Plafonner chaque audit** : nombre de concurrents (ex. 3 en gratuit, 10 à 20 en payant), nombre de mots-clés, profondeur des backlinks.
- Audit gratuit : version réduite (score, 3 pages prioritaires, 10 cibles en aperçu, pas d'envoi), cache DataForSEO par domaine, une exécution par domaine et par période, email requis.
- Mesurer le coût API réel par audit avant de fixer les prix ; un tableau de bord interne du coût par audit et par utilisateur est obligatoire.

### 4.6 Pricing

**Décision de Jonathan (16/11/2026)** : trois offres payantes, **19,90 € / 39,90 € / 99,90 € TTC par mois**, plus un accès gratuit sans carte (audit réduit, aperçu de cibles, aucun envoi). Source de vérité : table `plans` (`starter`, `pro`, `business`). **Les trois tactiques sont incluses dans toutes les offres** (c'est la base : la grille de tarifs ne les mentionne pas).

Répartition des accès [HYPOTHÈSE proposée, à confirmer] :

- **Starter 19,90 €** : 1 site, 1 audit complet par mois, 100 envois par mois, 1 boîte.
- **Pro 39,90 €** (recommandé) : 3 sites, 3 audits, 300 envois, 2 boîtes, réponses prêtes à insérer.
- **Business 99,90 €** : 10 sites, 10 audits, 1 000 envois, 5 boîtes, tout Pro.

**Bêta (décision de Jonathan, 17/11/2026)** : tant que `BETA_MODE` est actif, l'envoi réel est ouvert à tout inscrit sans abonnement, plafonné comme Starter (100 envois par mois). À refermer à l'ouverture du paiement.

Carte demandée au premier envoi réel (comme Outlink). Paliers différenciés par valeur (sites, audits, réponses prêtes à insérer), pas seulement par volume d'emails. Marque blanche et offre agence : plus tard. Remboursement à définir.

## 5. Pitch et qualité des messages

- Court, en français naturel, signé du prénom de l'utilisateur, sans vocabulaire marketing.
- Hook tiré de la page de la cible (article, liste, ressource), proposition concrète et honnête, **URL exacte vérifiée 200**.
- Pas de mention de l'IA ; pas de promesse mensongère ; pas de faux lien d'amitié.
- [À CONFIRMER] Un lot d'exemples de messages qui ont bien marché sur les sites de Jonathan pour calibrer le style.
- Chaque brouillon affiche son hook et la raison du ciblage.
- **Décision de Jonathan (17/11/2026), un angle ou pas de message** : avant d'écrire, la page de la cible est relue en entier et on cherche le point précis où une page précise du site (jamais « le blog ») rendrait service à ses lecteurs. Sans angle honnête, aucun message n'est écrit et la cible est écartée avec son motif. **Assoupli le 18/11/2026 (voir la décision suivante).** Le message donne l'adresse de la page de la cible et celle de la page proposée. Modèles : un petit modèle trie, un modèle fort rejuge et rédige (essai sur 20 messages réels : 2 seulement méritaient d'être envoyés).
- **Décision de Jonathan (18/11/2026), ne pas s'autocensurer** : contacter pour rien coûte presque rien (l'envoi est gratuit), ne pas contacter à tort fait perdre un lien et prive l'utilisateur de l'effet « gros travail fait pour moi ». Une cible proche du contenu visé est TOUJOURS rédigée : le modèle propose la page du site la plus proche, même imparfaite, et le brouillon est soumis à validation comme les autres. « Le catalogue n'a pas la page » n'est jamais un motif de refus : le rédacteur dispose du catalogue COMPLET du site (tout le sitemap plus les pages visitées, titre, titre principal et description, stockés une fois par site, plafond de pages selon le palier : 100, 200, 500 ou 1 000), présélectionné par sujet pour ne montrer au modèle que les 20 à 30 pages les plus proches. « Lien unique », « ancre optimisée » ou « article sponsorisé » sont des signaux (note « à relire »), pas des refus. Restent des refus : concurrent direct, page légale, ferme à liens manifeste, grand média inatteignable, aucun rapport avec le sujet. Toute cible écartée garde un bouton « rédiger quand même », afin qu'une cible affichée ne soit jamais sans message possible.
- **Ce qui a rapporté des liens à Jonathan (dit le 18/11/2026, « des dizaines de retours »)** : (1) le blog ou site personnel d'un membre du public visé (exemple : une maîtresse d'école) qui cite des ressources, à qui on propose d'ajouter la nôtre ; (2) les liens morts, le meilleur angle ; (3) une page de contenu qui cite plusieurs concurrents ou ressources comparables, à qui on propose d'ajouter la nôtre. Point commun : une page de contenu qui cite DÉJÀ des ressources comme la nôtre. C'est un travail minutieux, page par page, à industrialiser en mêlant données SEO et lecture réelle des pages. La rédaction (petit modèle qui trie, modèle fort qui rejuge et rédige) est validée ; le critère d'angle doit reconnaître ces trois cas, même sur un billet ancien.
- **Décision de Jonathan (17/11/2026), généralité** : remove-me.io et mega-coloring.com ne sont que des sites de test. Aucun mot, règle ou seuil propre à un thème dans le code ; toute amélioration de la recherche de cibles se mesure sur au moins deux sites de thèmes différents.
- **Décision de Jonathan (17/11/2026), réglages « Vos messages »** : le premier message ne propose rien en échange (la page proposée se suffit) ; ce que l'utilisateur accepte de donner en retour (partage, article, lien en retour) ne sert qu'aux réponses. La signature est celle d'une entreprise (nom, rôle, logo, lien vers le site, LinkedIn, téléphone, au choix), composée à l'envoi : un changement s'applique aussi aux messages déjà dans « À valider ».

## 6. Modèle de données

- `users`, `workspaces`, `memberships`
- `sites` (workspace_id, domaine, niche, pays, langue, signature_prénom, actif_offert, catégories)
- `audits` (site_id, statut, coût_api_estimé, coût_api_réel, plafond, résumé_json)
- `competitors` (audit_id, domaine, source_serp, domaines_référents, DR)
- `competitor_backlinks` (competitor_id, domaine_source, url_source, ancre, type, flag_spam, flag_étranger, doublon)
- `audit_pages` (audit_id, url, mots_clés_json, position_moyenne, domaines_référents, domaines_requis_estimés, priorité, état_technique)
- `link_opportunities` (audit_id, page_cible, type, domaine_source, url_source, pertinence, spam, ancre_suggérée, priorité, offert_en_échange)
- `link_plan_items` (audit_id, type, priorité, validé_par_utilisateur)
- `batches` (site_id, numéro, statut, validé_le)
- `targets` / `prospects` (batch_id, opportunité_id, domaine, type, contact, canal, statut, motif_tri, date_envoi, date_relance, réponse, décision, hook, url_cible_vérifiée)
- `drafts` (prospect_id, sujet, corps, hook, statut_validation, éditée_par_utilisateur)
- `manual_tasks` (prospect_id, type=formulaire, message_prérédigé, statut)
- `sequences`, `sequence_steps` (délais, nombre de relances, configurable)
- `mailboxes` (workspace_id, adresse, protocole, identifiants_chiffrés, santé, plafond_jour, échauffement)
- `threads`, `messages` (prospect_id, direction, étape, message_id, in_reply_to, envoyé_le)
- `reply_classifications` (message_id, catégorie, confiance, justification, action_proposée, validée_par)
- `links` (prospect_id, url_source, url_cible, ancre, dofollow, indexé, dernier_check, statut)
- `directories`, `directory_submissions`, `orders` (module annuaires, optionnel)
- `credits_ledger`, `plans`, `subscriptions`
- `events` (journal d'audit), `suppressions` (désinscriptions, ne pas contacter), `abuse_flags`

## 7. Architecture et stack

- **GitHub + Vercel** : Next.js (TypeScript).
- **Supabase** : Postgres, auth, stockage ; RLS sur toutes les tables liées à un utilisateur.
- **Stripe** : abonnements, crédits, packs.
- **Inngest** : orchestration. Toute étape longue est un `step` ; `step.sleepUntil` pour les relances et `step.waitForEvent("reply.received", timeout)` pour arrêter la séquence à la première réponse. Jobs : audit, analyse concurrents, tri des cibles, envoi quotidien plafonné, lecture IMAP périodique, classification, vérification des liens à J+7 / J+14 / J+30, digest.
- **DataForSEO** (API disponible) : SERP, Backlinks, Labs (`ranked_keywords`, `competitors_domain`), OnPage ; mode batch/différé ; cache par domaine.
- **LLM (API Anthropic)** : tri et pertinence des cibles, hooks, rédaction FR, classification des réponses, synthèse de l'audit.
- **Resend** : emails transactionnels uniquement (jamais d'outreach).
- **Envoi outreach** : SMTP (nodemailer) en MVP ; lecture IMAP (imapflow) ; OAuth Gmail ensuite (`gmail.send` sensible ; lecture = scopes restreints + audit de sécurité).
- **Recherche d'emails** + **vérification** (Hunter / ZeroBounce ou équivalents).
- **Lecture de pages** : fetch + Cheerio, puis Firecrawl / Jina Reader si blocage.
- **Chiffrement** AES des identifiants de boîtes, clé en variable d'environnement.
- Optionnel : Sentry, PostHog. SPF/DKIM/DMARC pour le domaine transactionnel.

## 8. Contraintes techniques et juridiques

- **Délivrabilité** : plafonds, échauffement, domaine secondaire recommandé, désinscription, arrêt à la réponse ou à la plainte.
- **Juridique** [à valider avec un juriste avant lancement] : prospection B2B par email en France tolérée si pertinente pour l'activité professionnelle du destinataire, avec opt-out ; RGPD : base légale, information, droit d'opposition, liste de suppression. Position à documenter sur la non-mention de l'IA dans les emails (honnêteté en cas de question).
- **Liens** : respect des consignes Google (liens sponsorisés à qualifier), pas de PBN ni de réseaux.
- **Conditions des concurrents** : ne pas copier leurs bases ni leurs textes (structure et philosophie assumées, voir section 1) ; pas de comparatif nominatif non vérifiable.
- **Données personnelles des cibles** : conservation limitée, accès restreint, suppression à la demande.

## 9. Jalons

1. **Audit + analyse des concurrents** (sans envoi) : page publique gratuite avec capture d'email, coût plafonné, cache.
2. **Plan de liens** validable.
3. **Tri des cibles + lots + brouillons FR** avec validation de lot.
4. **Envoi plafonné, relance unique, boîte IMAP/SMTP**.
5. **Inbox classé + réponses prêtes à insérer + politique « payant »**.
6. **Vérification des liens + digest + garde-fous complets + paiement Stripe**.
7. Plus tard : OAuth Gmail/Outlook, extension navigateur pour formulaires, annuaires, MCP, marque blanche, autres langues.

## 10. Indicateurs

Audit : taux de complétion, conversion gratuit → payant, **coût API par audit**. Outreach : cibles qualifiées / contactées, taux de réponse, taux de liens obtenus, coût par lien, rebonds, plaintes, santé des boîtes. Produit : activation (premier lot validé), rétention mensuelle. [À CONFIRMER] Références de Jonathan : cibles contactées, taux de réponse et liens obtenus par site avec sa méthode, pour fixer les objectifs.

## 11. Risques

- Abus par des tiers (spam) : plafonds, validation de lot, liste de suppression, suspension automatique.
- Coût API de l'audit supérieur au prix : plafonds, cache, audit gratuit réduit.
- Délivrabilité et réputation des domaines clients.
- Conformité RGPD / prospection.
- Taux de réponse faible si le tri des cibles est mauvais : c'est la raison d'être du produit.
- Une partie du travail reste manuelle (formulaires) : à assumer dans le produit.
- Promesses perçues comme des garanties.
- Concurrents anglophones qui ajoutent le français.

## 12. Questions ouvertes [À CONFIRMER]

1. Résultats obtenus avec ta méthode : cibles contactées, taux de réponse, liens obtenus par site.
2. Tous tes sites sont-ils français ? v1 francophone seulement, ou multilingue dès le départ ?
3. Exemple de lot de messages ayant bien marché (pour caler le style des pitchs).
4. Politique « c'est payant » par défaut : décliner (proposé) ou échanger ?
5. Niveau de l'audit gratuit (nombre de concurrents, de cibles en aperçu) selon le coût réel DataForSEO mesuré.

## 13. Annexe : principes UX à reprendre des références

1. Valeur avant inscription (aperçu d'audit).
2. Gratuit pour voir, payant pour agir (carte au premier envoi).
3. Panneau de garde-fous comme écran central.
4. Un seul système de statuts partout.
5. Hook visible dans chaque brouillon.
6. Digest hebdo comme moteur de rétention.
7. Échelle d'offre claire ; paliers par valeur.
8. Actifs de distribution FR (outil gratuit d'audit, pages tactiques, comparatifs, llms.txt).
9. Confiance honnête : dire ce qu'on ne fait pas ; preuve initiale par dogfooding sur nos propres sites, avec méthode et chiffres publiés.

À éviter : sections dupliquées, CTA en excès, comparatif auto-noté, paliers différenciés seulement par volume, preuve sociale non vérifiable, densité excessive sur mobile.

## 14. À vérifier

- Richesse et coût réels de DataForSEO sur des sites français (backlinks de niche, SERP FR).
- Taux de réussite de la recherche d'emails sur les petits sites FR.
- Avis juridique : prospection, RGPD, mention de l'IA.
- Comportement réel des agents concurrents au premier envoi (non observé : aucun envoi déclenché pendant les essais).

## 15. Méthode de travail Claude Code (à appliquer dès le démarrage)

Le plan de code complet est dans `PLAN.md` (jalons Mx, sous-jalons Mx.y). L'état d'avancement est dans `PROGRESS.md`.

**Règle d'or : un sous-jalon = une conversation Claude Code.** On évite les contextes longs ; chaque sous-jalon est dimensionné pour tenir dans une session (objectif unique, 1 à 4 heures de travail).

Début de session :

1. Lire `CLAUDE.md`, `PROGRESS.md`, puis uniquement le sous-jalon demandé dans `PLAN.md` (pas tout le plan).
2. Vérifier que les prérequis du sous-jalon sont marqués faits dans `PROGRESS.md` **sur `main`**. Si des PR des sous-jalons précédents sont encore ouvertes (travail sur une branche, `main` en retard), les fusionner soi-même dans l'ordre (voir « Fin de session ») avant de lire `PROGRESS.md`, puis repartir de `main` à jour. S'arrêter et le dire seulement si un prérequis n'est vraiment pas fait.
3. Annoncer en 3 lignes ce qui va être fait et ce qui ne le sera pas (hors périmètre).

Pendant la session :

- Rester strictement dans le périmètre du sous-jalon ; noter les idées hors périmètre dans `PROGRESS.md > Backlog`, ne pas les coder.
- **Vérifications allégées (décision de Jonathan, 18/11/2026)** : en local, typecheck et lint en entier, mais seulement les tests des fichiers touchés (`pnpm vitest run <dossier>`) ; la suite complète tourne sur la CI et la PR ne se fusionne que si elle est verte. Mesures réelles : échantillon de 25 cibles par site pour le rejugement par le modèle fort (pas toute la liste), caches de pages et de DataForSEO conservés. Lire seulement la fin des sorties de commande. Migrations Supabase versionnées ; aucun secret dans le dépôt.
- **Outils d'abord** : pour toute tâche technique (création de projet Supabase/Vercel/Inngest, migrations, déploiement, variables d'environnement, GitHub, etc.), utiliser au maximum les MCP et CLI disponibles (Supabase, Vercel, Inngest, Neon, `gh`, `pnpm`, Playwright…) plutôt que de demander à l'utilisateur de le faire à la main. Ne lui demander une action manuelle qu'en cas de blocage réel (outil absent, permission refusée), en le disant explicitement.
- **Autonomie maximale (décision de Jonathan, 14/11/2026)** : faire le maximum seul, sans redemander, pour tout ce qui est technique : déploiements Vercel (preview et production), variables d'environnement, réglages Supabase (auth, URL de redirection), migrations, fusion des PR. Ne demander qu'en cas de blocage réel, ou pour une dépense nouvelle (nouvelle ressource payante) ou une action destructive sur des données.
- **Accès déjà configurés dans l'environnement cloud** (jetons enregistrés via le formulaire sécurisé, jamais visibles, injectés par le proxy ; ne jamais les écrire dans le dépôt) : Vercel (`api.vercel.com`) et Supabase API de gestion (`api.supabase.com`). Vercel : `npm i -g vercel` puis `VERCEL_TOKEN=proxyinjectedplaceholdertoken0123` (sans tiret) ; le jeton est limité à l'équipe, donc passer `teamId` (voir `PROGRESS.md`) aux appels `curl https://api.vercel.com/...` (variables : `/v10/projects/{id}/env`, redéploiement : `POST /v13/deployments` avec `deploymentId`). Supabase : `curl https://api.supabase.com/v1/projects/{ref}/config/auth` (lecture et `PATCH`). Les outils MCP Supabase couvrent la base (SQL, migrations, types). Si un appel répond 401/403, attendre une minute (prise en compte du proxy) avant de redemander un jeton à Jonathan. Les gabarits d'email d'authentification sont versionnés dans `supabase/email-templates/` et doivent être recollés dans Supabase (Authentication > Emails) à chaque changement ; si l'API reste en 401, passer par le tableau de bord dans le navigateur intégré, connecté par Jonathan, plutôt que de demander un jeton.
- Toute étape longue passe par Inngest, jamais par une requête directe.
- Tout appel payant (DataForSEO, LLM, finder d'emails) passe par le client qui enregistre le coût dans `cost_ledger`.
- Aucun envoi d'email réel en développement : envoi vers une boîte de test ou mode « dry run » par défaut.

Fin de session (obligatoire) :

1. Mettre à jour `PROGRESS.md` : sous-jalon fait / partiel, décisions prises, fichiers clés, commandes pour lancer, dettes et pièges, prochain sous-jalon recommandé.
2. Commit propre sur une branche `mX.y-nom`, PR avec description du périmètre et des critères d'acceptation cochés.
3. **Fusionner la PR dans `main` soi-même** dès que la CI est verte : l'utilisateur n'est pas technique et ne gère pas Git, PR ni fusions, il ne faut jamais lui demander de le faire. Si la PR est empilée sur une autre, fusionner d'abord la plus basse. Ne laisser une PR ouverte que si un point exige sa décision (le dire alors en une phrase simple). Vérifier ensuite que `main` contient bien `PROGRESS.md` à jour.
4. Donner à l'utilisateur le **prompt de démarrage de la session suivante** (modèle dans `PLAN.md`, section « Prompt de démarrage »), en langage simple.

Si une décision de produit manque : poser la question une fois, proposer une option par défaut, avancer sur le reste. Si le périmètre d'un sous-jalon déborde : le scinder et mettre à jour `PLAN.md` avant de continuer.
