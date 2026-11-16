# Jalon MU : l'espace client repensé, de l'inscription à la liste de cibles

> Rédigé le 16/11/2026 à la demande de Jonathan, après son essai en tant qu'utilisateur lambda. Ce fichier est autonome : diagnostic, parcours cible, moteur cible, puis 12 sous-jalons (MU.0 à MU.11), chacun avec son **prompt à copier** pour lancer la session suivante. Périmètre : tout ce qui se passe **avant** l'envoi des messages (la partie « CRM » : lots, envoi, réponses, liens, reste hors périmètre). Lié à `CLAUDE.md` (méthode, section 15), `PLAN.md` et `PROGRESS.md`. [HYPOTHÈSE] = à mesurer. [À CONFIRMER] = décision de Jonathan, une option par défaut est toujours proposée.

## 0. Comment utiliser ce fichier

- **Un sous-jalon = une conversation Claude Code.** Les faire dans l'ordre des numéros.
- Pour lancer une session : copier le bloc « Prompt à copier » du sous-jalon. Rien d'autre à préparer.
- Deux points d'arrêt où Jonathan refait l'essai lui-même : **après MU.3** (parcours visible de bout en bout) et **après MU.10** (résultats par tactique).
- Les décisions de la section 5 ont une option par défaut : si Jonathan ne dit rien, la session applique le défaut et le note dans `PROGRESS.md`.

## 1. Diagnostic : ce que vit un nouvel inscrit aujourd'hui

Sources : lecture du code de chaque écran, et lecture en base de production de ce qu'ont réellement produit les audits lancés (3 audits, tous sur mega-coloring.com).

### 1.1 Le parcours actuel, écran par écran

| #   | Écran                              | Ce que voit l'utilisateur                                                                                                                                                                          | Problème                                                                                                          |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | `/app` après inscription           | « Connecté en tant que… », 5 boutons de même poids (Analyser mon site, Configurer, Aller à l'audit, Abonnement, Se déconnecter), menu de 7 entrées toutes vides                                    | Aucune indication de la première chose à faire ; le menu montre des écrans qui ne servent pas encore              |
| 2   | `/app/demarrer`                    | Un champ : l'adresse du site                                                                                                                                                                       | Bien. Mais 15 à 40 s d'attente sur un bouton grisé, sans rien voir                                                |
| 3   | `/app/demarrer/[site]`             | Un long formulaire : thème, objectif, toutes les rubriques du profil modifiables (activité, offre, public, ressources, variantes, ton, personas), puis un tableau de coûts en dollars sur 4 lignes | Trop de champs, vocabulaire interne, coûts d'API en dollars affichés à un client                                  |
| 4   | `/app/audit/[id]`                  | 4 lignes avec un badge, puis des tableaux : concurrents dans la SERP, backlinks des concurrents, profil de liens, « opportunités »                                                                 | C'est l'étape « chercheur » en brut. La valeur promise (la liste courte de cibles) n'y est pas                    |
| 5   | `/app/audit/[id]/cibles`           | Trois étapes payantes à lancer une par une (Collecter, Qualifier, Analyser les pages), chacune avec coût attendu, pire cas, budget et reste                                                        | Le vrai produit est caché derrière un lien et 3 clics ; aucune progression en direct (il faut actualiser la page) |
| 6   | Question « fondateur ? » puis plan | Posée à la fin, juste avant la validation                                                                                                                                                          | Arrive trop tard ; un « plan de liens » intermédiaire s'intercale encore avant les messages                       |

### 1.2 Ce que disent les données de production

- **Aucun audit n'a atteint la liste de cibles.** Les 3 audits se sont arrêtés à l'ancienne chaîne (concurrents, backlinks, profil, opportunités). La collecte, la qualification et l'analyse des pages (le moteur des trois tactiques, jalon MT) n'ont **jamais tourné depuis l'interface** : seulement en ligne de commande pendant le développement.
- **80 % de la dépense part dans une étape qui ne fournit pas de cibles.** Sur les 2 derniers audits : 1,24 USD dépensés, dont 1,00 USD en téléchargement des backlinks des concurrents. Or la conception (`docs/audit-v2.md`) dit que les concurrents servent à exclure et à recouper, jamais à fournir les cibles.
- **Ce que l'écran présente comme « opportunités » est du bruit.** Audit du 16/11 : 222 lignes, dont 191 « écart de domaines » en priorité haute : askology.biz, windowssearch-exp.com, getmycell.com, devappstor.com… Aucun tri, aucune demande, aucun contact.
- **Mauvais marché.** Le dernier site a été lu comme anglophone (l'accueil de mega-coloring.com est en anglais, le site est multilingue) : thème « free printable coloring pages », concurrents retenus woocoloring.com, thecolor.com, raskrasil.com. Personne n'a demandé à l'utilisateur sur quel marché il veut des liens.
- **Les requêtes par type d'éditeur n'ont jamais été générées en production** (table `query_universes` vide), alors que toute la collecte en dépend.
- **Un état bloqué.** Le dernier audit affiche l'étape « opportunités » en cours, alors que le journal dit qu'elle est finie, avec 0 résultat. L'utilisateur attend quelque chose qui n'arrivera pas.
- **Aucun écran de l'espace client n'a été regardé dans un navigateur connecté** pendant le développement (noté à chaque sous-jalon : « pas de test Playwright connecté »). C'est la cause première : les écrans ont été écrits sans être vus.

### 1.3 En une phrase

Le produit a aujourd'hui **deux moteurs empilés** (l'ancien, visible, coûteux et peu utile ; le nouveau, pertinent mais caché et manuel), un onboarding qui pose les mauvaises questions, et aucune progression lisible. Il faut **un seul parcours, un seul moteur, un seul écran de résultat**.

## 2. Le moteur donne-t-il les résultats voulus ? Tactique par tactique

Mesures du seul run réel complet (mega-coloring.com, en ligne de commande, 16/11) : 552 sites candidats, 150 pages lues, 62 jugées pertinentes, **19 cibles livrées** ; analyse des pages sur 28 cibles : **0 lien mort, 0 mention, 2 liens inadaptés**.

| Tactique promise sur la home                                                   | Résultat mesuré                                                                                                                                                    | Verdict                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 1. Sites que personne ne sollicite (mairies, associations, boutiques, forums…) | 19 à 30 cibles, dont 17 blogs ou médias sur 19 ; 1 association, aucune mairie ni médiathèque ; bas de liste faible (pro-perform.fr, paperblog.fr, un blog de spam) | **Partiel** : la base est bonne, les types promis manquent |
| 2. Pages ressources et liens morts                                             | 0 lien mort trouvé                                                                                                                                                 | **Ne fonctionne pas** tel que branché                      |
| 3. Mentions de marque sans lien                                                | 0 mention                                                                                                                                                          | **Vide** pour une petite marque ; à dire honnêtement       |

### 2.1 Pourquoi, et quoi changer

**Tactique 1. La collecte ramène des blogs, pas les types d'éditeurs promis.**

- Cause 1 : les requêtes sont écrites par le modèle, 5 par persona, **sans aucun opérateur** (règle du prompt) ; rien ne garantit une requête par type d'éditeur. Et le seul run réel était borné : 8 requêtes exécutées, alors que le budget en prévoit jusqu'à 33.
- Cause 2 : Content Analysis fournit 350 des 515 candidats pour 47 % du coût, sur le seul thème : il ramène des pages qui parlent du sujet, donc des blogs et des concurrents.
- Cause 3 : la liste courte prend les 40 premiers scores, sans seuil de qualité ni mélange de types.
- À faire (MU.6) : (a) **gabarits de requêtes garantis par type d'éditeur**, écrits dans le code par type et par langue (école, médiathèque, association, collectivité, forum, boutique, blog), le modèle ne fournissant que les mots du thème ; (b) mesurer avec le budget de requêtes complet (30 à 40), pas un run borné à 8 ; (c) **mesurer le rendement par source** (candidats → cibles livrées) et déplacer le budget vers ce qui rapporte ; (d) **seuil de qualité** au lieu de « les 40 premiers », et **quota de diversité** (au plus la moitié de blogs quand d'autres types existent) ; (e) annoter les vrais mauvais cas du bas de liste dans le jeu d'évaluation avant de toucher aux règles ; (f) champ facultatif « ville ou zone » : mairies et associations locales n'ont de sens que pour une activité locale.
- Honnêteté : les types dépendent du site. Pour un site de coloriages, ce sont les écoles, médiathèques, assistantes maternelles ; pour un photographe, la mairie et les associations de sa ville. L'écran doit dire quels types ont été cherchés et combien ont été trouvés.

**Tactique 2. Les liens morts sont cherchés au mauvais endroit.**

- Cause : l'analyse des pages ne lit que les pages de la liste courte (trouvées pour la tactique 1, rarement des pages de liens). Le chasseur de liens morts d'origine (M2.2) est limité à 8 pages ressources et vit dans l'ancienne chaîne.
- À faire (MU.7) : (a) les **pages ressources deviennent des candidates à part entière** : requêtes à empreinte (« liens utiles », « ressources », « sites à découvrir », « nos partenaires » + thème, avec opérateurs `intitle:` / `inurl:` autorisés pour cette famille seulement), lecture de 60 à 100 pages (gratuit, robots.txt respecté), reconnaissance d'une vraie page de liens (nombre et part de liens externes) ; (b) pour chacune, vérifier les liens sortants : **lien mort prouvé (404 ou 410)** = demande de remplacement ; **pas de lien mort** = demande d'ajout à la liste, avec la rubrique de leur page et la page du site qui y a sa place ; (c) **sens inverse** : pages disparues des concurrents qui reçoivent encore des liens (DataForSEO Backlinks, champ `is_broken` déjà lu par notre client) : chaque page qui les cite est une cible avec preuve [À VÉRIFIER par un run borné : filtre, coût] ; (d) faux 404 (redirection vers l'accueil) et liens au-delà du 25e.

**Tactique 3. Une petite marque n'a pas de mentions, et le produit ne le dit pas.**

- Cause : « Mega Coloring » est une expression générique ; un site récent n'est presque jamais cité sans lien.
- À faire (MU.9) : (a) demander à l'onboarding les **autres noms** (ancien nom, nom du fondateur, nom d'un outil ou d'un produit) ; (b) pour un nom générique, exiger un indice distinctif à côté (domaine, slogan) ; (c) **état vide honnête** : « Aucune mention trouvée : votre marque est encore peu citée. Nous revérifions chaque mois » ; (d) revérification mensuelle peu coûteuse (~0,06 USD), avec un email quand une mention apparaît.

**Transversal 1. Deux cibles pertinentes sur trois sont perdues faute de contact.** Sur 62 cibles jugées pertinentes, 19 ont un contact (41 « sans contact », dont plusieurs adresses jugées invalides par le vérificateur). C'est la plus grosse perte de tout l'entonnoir, et elle est gratuite à réduire (MU.8) : lire plus de pages (contact, mentions légales, à propos, pied de page, adresses écrites « nom [at] site »), détecter mieux les formulaires, vérifier que le vérificateur n'écarte pas de bonnes adresses, et **garder les cibles sans contact dans un onglet à part** avec saisie manuelle.

**Transversal 2. Le marché.** Pays et langue visés doivent être demandés et confirmés (MU.4), et toute la chaîne doit les respecter : requêtes, filtres de langue, pages du site proposées (la version `/fr/` pour un marché français).

**Transversal 3. La durée.** La qualification prend 12 à 21 minutes parce que les pages sont lues une par une. Les hôtes étant presque tous différents, on peut en lire plusieurs en parallèle en gardant le délai par hôte (MU.1) : objectif, analyse complète en moins de 10 minutes [HYPOTHÈSE].

### 2.2 Le moteur cible : une seule analyse

L'ancienne chaîne (backlinks des concurrents à 0,50 USD, liste de 222 opportunités, plan de liens intermédiaire) **sort du parcours**. Une seule analyse enchaîne, sans clic entre les étapes :

| Étape (nom affiché à l'utilisateur)           | Ce qui tourne                                                                                      | Coût attendu [HYPOTHÈSE] |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------ |
| 1. Comprendre votre site                      | Lecture de l'accueil, du plan du site et de 8 pages ; profil de marque                             | ~0,001 USD               |
| 2. Repérer vos concurrents                    | 3 recherches, tailles mesurées en une requête                                                      | ~0,04                    |
| 3. État des lieux de vos liens (en parallèle) | Mots-clés classés, résumé des liens, domaines référents                                            | ~0,06                    |
| 4. Chercher les sites qui peuvent vous citer  | Requêtes par type d'éditeur, recoupement des concurrents, pages du thème, pages ressources, marque | ~0,40 à 0,50             |
| 5. Trier                                      | Exclusions, signaux, lecture des pages, jugement, motif lisible                                    | ~0,02                    |
| 6. Trouver un contact                         | Email publié ou formulaire                                                                         | 0                        |
| 7. Chercher liens morts et mentions           | Liens sortants vérifiés, mentions vérifiées                                                        | ~0,01                    |
| 8. Préparer vos demandes                      | Liste courte classée, demande en trois lignes, pourquoi                                            | 0                        |

Total visé : **0,55 à 0,65 USD par analyse**, contre environ 0,87 aujourd'hui (0,62 pour l'ancienne chaîne + 0,25 pour le nouveau moteur), et tout l'argent va aux cibles. Les garde-fous internes ne changent pas : budget cible 1 USD, plafond d'audit 2 USD, sécurité 5 USD par audit et 25 USD par jour, contrôle avant chaque appel payant, tout dans `cost_ledger`.

## 3. Le parcours cible

Principes : **une seule chose à faire par écran** ; l'accueil de l'espace est toujours **la prochaine étape** ; on ne demande que ce qui change le résultat, et tout est prérempli ; pendant l'attente on **voit le travail avancer et les premières cibles arriver** ; le résultat est la liste de cibles, pas un rapport.

### 3.1 Les écrans

1. **Inscription → directement l'étape 1.** Si la personne vient de l'audit gratuit de la home, son adresse de site est déjà remplie. Un fil d'étapes reste visible en haut : _Votre site · Vérification · Vous · Analyse · Vos cibles_.
2. **Étape 1, « Votre site ».** Un champ. Pendant la lecture, une liste qui se coche en direct : page d'accueil lue, plan du site trouvé (412 pages), 8 pages lues, activité comprise.
3. **Étape 2, « Vérifiez ce que nous avons compris ».** Une fiche en phrases simples, chaque bloc prérempli avec un bouton « Modifier » :
   - _Votre activité_ : « Vous proposez … pour … ».
   - _Votre marché_ : pays et langue où vous voulez des liens (détectés ; si le site existe en plusieurs langues, on demande laquelle). **Obligatoire.**
   - _Les pages que nous proposerons aux éditeurs_ : 3 à 6 pages cochées, ajout d'une adresse à la main.
   - _Qui peut vous citer_ : types d'éditeurs en étiquettes à activer ou retirer (enseignants, blogs de parents, médiathèques, associations…), ajout libre ; ville ou zone, facultatif.
   - _Vos concurrents_ : 3 à 5 détectés, modifiables (« ils servent à écarter et à recouper, jamais à être contactés »).
   - _Facultatif, replié_ : autres noms de votre marque ; sites à ne jamais contacter.
4. **Étape 3, « Vous ».** Prénom de signature et rôle (fondateur, équipe, agence). Deux champs, puis le bouton « Lancer l'analyse » avec la durée annoncée (« environ 10 minutes, vous pouvez fermer la page »). Pas de dollars.
5. **Étape 4, « Analyse en cours ».** Les 8 étapes de la section 2.2 en colonne, avec pour chacune : état, compteur en direct (« 23 recherches sur 35 · 412 sites trouvés », « 96 pages lues sur 150 »), et un exemple de ce qui vient d'être trouvé. Une barre d'avancement globale, le temps restant estimé, l'entonnoir en chiffres (« 544 sites examinés → 96 après tri → 27 cibles ») et **les premières cibles qui s'affichent dès qu'elles sont prêtes**. Message : « Vous pouvez fermer cette page, vous recevrez un email quand c'est prêt. » En cas d'échec : ce qui a marché, ce qui a échoué, un bouton « Reprendre » qui ne refait pas ce qui est fait.
6. **« Vos cibles ».** En tête, une phrase : « Nous avons examiné 544 sites et retenu 27 cibles. » Trois onglets avec leur compteur, un par tactique ; un onglet vide dit pourquoi. Une carte par site : qui c'est (type), pourquoi lui, la preuve (citation de sa page, lien mort constaté), la demande en trois lignes, le contact. Deux actions par carte : **Garder** / **Écarter** (avec un motif, qui servira à améliorer le tri). Un onglet « Sans contact trouvé » (saisie manuelle). Un lien « Voir les 517 sites écartés et pourquoi ». En bas, une barre fixe : « 12 cibles gardées · Préparer mes messages » (début de la partie CRM, hors de ce jalon).
7. **« État des lieux »** (onglet secondaire) : domaines référents du site et des concurrents, pages à pousser, résumé. C'est la partie « audit de consultant » ; elle informe, elle ne bloque rien.

### 3.2 La coquille

- **Accueil = prochaine étape.** `/app` redirige : pas de site → étape 1 ; onboarding en cours → l'étape où la personne s'est arrêtée ; analyse en cours → écran d'analyse ; analyse finie → « Vos cibles ». Avec plusieurs sites : une liste des sites, chacun avec son état et son unique bouton d'action.
- **Menu réduit à ce qui sert maintenant** : Accueil, Cibles, État des lieux. « Messages », « Réponses », « Liens obtenus » apparaissent grisés avec « après votre premier lot ». Garde-fous, tâches, abonnement et déconnexion passent dans un menu « Compte ».
- **Adresses par site**, pas par numéro d'audit : `/app/site/[siteId]/analyse`, `/cibles`, `/etat-des-lieux` (les anciennes adresses redirigent).
- **Vocabulaire.** Mots autorisés à l'écran : site, analyse, cible, demande, contact, tactique, état des lieux. Mots interdits à l'écran : collecte, qualification, entonnoir, constat, recoupement, univers de requêtes, chaîne, candidat, pire cas, plafond d'audit.
- **Plus de dollars côté utilisateur.** Le coût d'API est notre affaire : il reste contrôlé et journalisé en interne. L'utilisateur voit ce qu'une action consomme dans son forfait (« 1 analyse ») et combien de temps elle prend. [À CONFIRMER, voir D1]

### 3.3 Le socle technique de la progression

- Table `analysis_steps` (une ligne par étape et par audit : clé, position, état `attente` / `en_cours` / `termine` / `echoue` / `saute`, compteurs JSON `done` / `total` / `found`, dernier exemple, début, fin) et table `analysis_feed` (événements lisibles : cible prête, étape finie). RLS : lecture par les membres, écriture par le service.
- Chaque job Inngest met à jour sa ligne à chaque `step` par un seul helper (`progress.update`).
- L'écran interroge une route légère toutes les 3 secondes tant qu'une étape est en cours (pas de rechargement complet), s'arrête à la fin.
- Un chien de garde passe en échec toute étape « en cours » sans mise à jour depuis 15 minutes, avec un message clair et le bouton « Reprendre ».

## 4. Règles communes à toutes les sessions MU

1. **Voir avant de conclure.** Tout sous-jalon qui touche un écran se termine par des captures d'une **session connectée**, bureau (1440) et mobile (390), montrées à Jonathan dans la conversation. Un écran non regardé n'est pas fait.
2. **Se mettre à la place d'un nouvel inscrit** : pour chaque écran, vérifier « qu'est-ce que je dois faire ici ? » en moins de 5 secondes, un seul bouton principal.
3. Textes dans `messages/fr.ts`, vocabulaire de la section 3.2, aucune promesse de backlinks garantis.
4. Garde-fous de coût inchangés ; tout appel payant journalisé ; tout run réel borné, sur les sites de test, avec le coût consigné dans `PROGRESS.md`.
5. Toute étape longue passe par Inngest. Aucun envoi d'email d'outreach. Aucune dépense nouvelle sans accord.
6. Avant de changer une règle de tri : rejouer le jeu annoté, noter précision et rappel avant et après.
7. Fin de session : méthode de `CLAUDE.md` section 15 (tests, lint, typecheck, `PROGRESS.md`, PR fusionnée dans `main`, prompt de la session suivante).

## 5. Décisions à confirmer par Jonathan (une option par défaut est appliquée sinon)

| #   | Question                                                                                                           | Défaut proposé                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Cacher les coûts en dollars à l'utilisateur ?                                                                      | Oui. Il voit « 1 analyse » et une durée. La règle « annoncer le coût » de `CLAUDE.md` 3.1 devient interne                                                                                                |
| D2  | Retirer du parcours l'ancienne chaîne (backlinks des concurrents, 222 opportunités, plan de liens intermédiaire) ? | Oui, écrans masqués dès MU.1 ; le code n'est supprimé qu'en MU.11                                                                                                                                        |
| D3  | Choix « autorité générale / pages précises » dans l'onboarding ?                                                   | **Décision de Jonathan (essai du 16/11) : OUI, il revient, à l'étape 1, avant la lecture du site** : il change ce que « ce que nous avons compris » doit montrer. Remplace le défaut précédent (retrait) |
| D4  | Quand vérifier que le site appartient bien à l'utilisateur ?                                                       | Avant le premier envoi seulement (partie CRM), pas avant l'analyse                                                                                                                                       |
| D5  | Payer un service de recherche d'emails (Hunter) ?                                                                  | Non, tant que MU.8 n'a pas mesuré ce que les améliorations gratuites récupèrent                                                                                                                          |
| D6  | Deux sites de test hors coloriage pour MU.11 (un métier local, une boutique ou un SaaS)                            | À fournir par Jonathan ; à défaut, deux de ses propres sites déjà cités dans `PROGRESS.md`                                                                                                               |
| D7  | Email « vos cibles sont prêtes »                                                                                   | Oui si Resend est prêt (domaine vérifié) ; sinon avertissement dans l'espace seulement                                                                                                                   |

## 6. Les sous-jalons

Ordre : MU.0 → MU.1 → MU.2 → MU.3 → **essai de Jonathan** → MU.4 → MU.5 → MU.6 → MU.7 → MU.8 → MU.9 → MU.10 → **essai de Jonathan** → MU.11.

Modèle de prompt (les blocs ci-dessous l'appliquent déjà) :

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 3 à 5 et uniquement le sous-jalon MU.x.
Vérifie que ses prérequis sont faits dans PROGRESS.md sur main. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas.
Reste dans le périmètre. À la fin : captures d'écran connectées (bureau et mobile) si un écran change, tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de la session suivante.
```

---

### MU.0 Voir l'espace comme un utilisateur, et réparer ce qui bloque

- **Objectif** : pouvoir regarder n'importe quel écran de `/app` dans un navigateur connecté, et corriger les trois défauts qui faussent tout essai.
- **Prérequis** : aucun.
- **Tâches** :
  1. Session de test connectée : un compte de test dédié (identifiants en variables d'environnement, jamais dans le dépôt), une connexion Playwright réutilisable, et un espace de test avec trois états prêts : site sans analyse, analyse en cours, analyse finie avec des cibles (jeu de données inséré par un script rejouable).
  2. Commande `pnpm shots` : capture chaque écran de l'espace, bureau et mobile, dans un dossier hors dépôt. Produire les **captures de référence de l'existant** (l'« avant »).
  3. Corriger : (a) l'étape affichée « en cours » alors qu'elle est finie (audit du 16/11) ; (b) les requêtes par type d'éditeur jamais générées en production (table `query_universes` vide : trouver pourquoi, corriger, test) ; (c) un chien de garde pour toute étape bloquée en cours.
- **Livrables** : fixture Playwright connectée, `pnpm shots`, captures « avant » montrées à Jonathan, correctifs testés.
- **Acceptation** : les captures couvrent tous les écrans de `/app` ; un audit de test ne reste plus bloqué en cours ; une génération de requêtes réelle écrit une ligne en base (coût consigné).
- **Hors périmètre** : toute refonte d'écran.

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 1, 4 et uniquement le sous-jalon MU.0.
Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : montre-moi les captures d'écran de l'existant (bureau et mobile), tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.1.
```

### MU.1 Une seule analyse, de bout en bout

- **Objectif** : un seul lancement enchaîne toutes les étapes de la section 2.2 jusqu'à la liste courte, sans clic intermédiaire, en écrivant sa progression.
- **Prérequis** : MU.0.
- **Tâches** :
  1. Migration `analysis_steps` et `analysis_feed` (section 3.3), RLS, test SQL, helper `progress.update`.
  2. Orchestrateur Inngest unique : profil (s'il manque) → concurrents → requêtes → recherche des sites → tri → contacts → liens morts et mentions → liste courte. L'état des lieux tourne en parallèle et n'arrête jamais la suite s'il échoue.
  3. Sortir du parcours le téléchargement des backlinks des concurrents, la liste d'opportunités et le chasseur 404 d'origine (derrière un réglage ; code conservé).
  4. Un seul contrôle de budget au lancement (attendu ≤ plafond), les contrôles avant chaque appel restent. Reprise : relancer ne refait ni ne repaie ce qui est fait.
  5. Lecture des pages en parallèle sur des hôtes différents (délai par hôte et robots.txt conservés) pour ramener la durée sous 10 minutes [HYPOTHÈSE].
  6. Chaque étape écrit compteurs et exemples ; chaque cible prête écrit une ligne dans `analysis_feed`.
- **Livrables** : orchestrateur, tables, un run réel borné sur mega-coloring.com lancé par un seul événement.
- **Acceptation** : sur le site de test, un événement produit une liste courte sans aucune action ; durée et coût réels consignés (coût ≤ 1 USD) ; chaque étape a une ligne de progression exacte ; une relance après échec simulé ne repaie rien.
- **Hors périmètre** : tout écran (MU.2, MU.3) ; amélioration de la qualité des cibles (MU.6 à MU.9).

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 2.2, 3.3, 4, 5 et uniquement le sous-jalon MU.1.
Vérifie que MU.0 est fait dans PROGRESS.md sur main. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : durée et coût réels du run sur le site de test, tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.2.
```

### MU.2 La coquille : toujours savoir quoi faire

- **Objectif** : un inscrit arrive sur sa prochaine étape, pas sur un tableau de bord.
- **Prérequis** : MU.1.
- **Tâches** : fonction unique `nextStep(site)` et redirection de `/app` (section 3.2) ; inscription → étape 1 ; adresse du site reprise depuis l'audit gratuit de la home ; menu réduit et menu « Compte » ; fil d'étapes commun ; adresses par site avec redirection des anciennes ; liste des sites quand il y en a plusieurs ; retrait des dollars et du vocabulaire interne des écrans du parcours (D1) ; états vides utiles.
- **Livrables** : nouvelle coquille, captures avant / après.
- **Acceptation** : dans les trois états de test (sans site, analyse en cours, analyse finie), `/app` mène au bon écran ; un seul bouton principal par écran ; aucun montant en dollars ni mot interdit sur le parcours ; mobile sans débordement.
- **Hors périmètre** : contenu de l'onboarding (MU.4, MU.5), écran d'analyse (MU.3), écran des cibles (MU.10).

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 3, 4, 5 et uniquement le sous-jalon MU.2.
Vérifie que MU.1 est fait dans PROGRESS.md sur main. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : captures connectées avant / après (bureau et mobile), tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.3.
```

### MU.3 L'écran « Analyse en cours »

- **Objectif** : pendant l'analyse, l'utilisateur voit chaque étape avancer et les premières cibles arriver.
- **Prérequis** : MU.1, MU.2.
- **Tâches** : écran de la section 3.1 point 5 (étapes, compteurs, exemples, barre globale, temps restant calculé sur les durées mesurées, entonnoir en chiffres, premières cibles) ; route légère interrogée toutes les 3 secondes ; message « vous pouvez fermer la page » et email de fin (D7) ; état d'échec avec « Reprendre » ; passage automatique à « Vos cibles » à la fin (écran existant, en attendant MU.10) ; mobile.
- **Livrables** : écran, route d'état, email transactionnel, captures aux trois moments (début, milieu, fin) et en échec.
- **Acceptation** : sur une analyse réelle du site de test, l'écran évolue sans rechargement manuel ; les compteurs correspondent à la base ; fermer puis rouvrir la page retrouve l'état ; un échec simulé affiche quoi faire.
- **Hors périmètre** : refonte de « Vos cibles » ; qualité du moteur.

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 3, 4 et uniquement le sous-jalon MU.3.
Vérifie que MU.1 et MU.2 sont faits dans PROGRESS.md sur main. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : captures connectées de l'analyse au début, au milieu, à la fin et en échec (bureau et mobile), tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.4.
```

> **Essai de Jonathan après MU.3** : s'inscrire, entrer un site, regarder l'analyse, arriver sur les cibles. Ses remarques ajustent MU.4 à MU.10.

### MU.4 Onboarding 1/2 : adresse, lecture en direct, « ce que nous avons compris », marché

- **Objectif** : remplacer le long formulaire par une fiche lisible, et ne plus jamais se tromper de marché.
- **Prérequis** : MU.2.
- **Remarques de l'essai de Jonathan (16/11), à intégrer** : (1) **le marché (pays et langue) est demandé dès l'étape 1, avec l'adresse, avant toute lecture** : il détermine la langue des pages lues, du profil et de la recherche ; (2) **une campagne = un site × un pays** : chaque pays a sa campagne (son analyse, ses cibles, son contexte local), à dire à l'écran (« pour chaque pays, une campagne séparée ») et à pouvoir ajouter plus tard pour le même domaine [À CONFIRMER : défaut appliqué, modèle de données à trancher au démarrage de MU.4] ; (3) **l'objectif est demandé à l'étape 1 aussi** : faire ranker le site en général, ou des pages précises (D3 rétablie) ; (4) après la validation de l'adresse, **jamais de bouton grisé muet** : animation et durée estimée ; (5) la fiche et les noms de pages ne doivent plus sortir en anglais pour un marché français.
- **Tâches** : lecture du site en job avec liste qui se coche en direct (plus d'attente muette) ; fiche en phrases, blocs préremplis avec « Modifier » ; **marché obligatoire** (pays, langue ; détection d'un site multilingue et choix de la version) ; le profil de marque, les pages lues et les pages proposées suivent la langue choisie (la version `/fr/` pour un marché français) ; reprise de l'onboarding là où il s'est arrêté ; retrait de l'objectif (D3).
- **Livrables** : étapes 1 et 2 du parcours, migration si nécessaire, run réel borné du profil sur mega-coloring.com en marché France.
- **Acceptation** : sur mega-coloring.com, le marché proposé peut être mis à France / français et le profil, le thème et les pages suivent ; la fiche tient sur un écran de bureau sans champ ouvert par défaut ; tests.
- **Hors périmètre** : pages à citer, éditeurs, concurrents, signature (MU.5).

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 3, 4, 5 et uniquement le sous-jalon MU.4.
Vérifie que MU.2 est fait dans PROGRESS.md sur main et tiens compte de mes remarques d'essai notées dans PROGRESS.md. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : captures connectées (bureau et mobile), tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.5.
```

### MU.5 Onboarding 2/2 : ce que vous proposez, qui peut vous citer, vos concurrents, vous

- **Objectif** : recueillir, préremplies, les seules entrées qui changent le résultat, et les brancher sur le moteur.
- **Prérequis** : MU.4.
- **Remarque de l'essai (16/11)** : la page d'accueil est proposée par défaut quand l'objectif est « autorité générale », mais **jamais imposée : elle doit pouvoir se décocher** ; ajout manuel d'adresses toujours possible.
- **Tâches** : pages à faire citer (cases, accueil décochable, ajout d'une adresse vérifiée en HTTP 200) ; types d'éditeurs en étiquettes (activer, retirer, ajouter), ville ou zone facultative ; concurrents détectés avant le lancement, modifiables, ajout manuel ; autres noms de la marque ; sites à ne jamais contacter ; étape « Vous » (prénom, rôle : la question « fondateur ? » quitte l'écran des cibles) ; bouton de lancement avec durée annoncée ; **chaque entrée est lue par le moteur** (requêtes, exclusions, recoupement, mentions, présentation dans les demandes).
- **Livrables** : fin du parcours d'onboarding, migrations, tests montrant qu'une entrée modifiée change bien le plan de l'analyse.
- **Acceptation** : du champ adresse au lancement en moins de 2 minutes sans rien saisir d'autre que l'adresse, le prénom et le rôle ; retirer un type d'éditeur retire ses requêtes ; un site « à ne jamais contacter » n'apparaît jamais dans les cibles.
- **Hors périmètre** : qualité des résultats par tactique (MU.6 à MU.9).

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 3, 4, 5 et uniquement le sous-jalon MU.5.
Vérifie que MU.4 est fait dans PROGRESS.md sur main. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : captures connectées de tout l'onboarding (bureau et mobile), tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.6.
```

### MU.6 Moteur, tactique 1 : trouver les types d'éditeurs promis

- **Objectif** : que la liste contienne réellement les sites « que personne ne sollicite » adaptés au site, et plus de bas de liste faible.
- **Prérequis** : MU.1 (MU.5 souhaitable).
- **Tâches** : points (a) à (f) de la section 2.1, tactique 1. D'abord mesurer : tableau « source → candidats → cibles livrées → coût » sur un run réel ; ensuite gabarits par type d'éditeur et par langue, run avec le budget de requêtes complet, réallocation du budget, seuil de qualité et quota de diversité, vrais mauvais cas ajoutés au jeu annoté.
- **Livrables** : gabarits, tableau de rendement par source dans `PROGRESS.md`, jeu annoté enrichi, run réel avant / après.
- **Acceptation** (mega-coloring.com, marché France) : au moins 25 cibles livrées, dont au moins 8 qui ne sont ni des blogs ni des médias (écoles, médiathèques, associations, assistantes maternelles, forums) ; aucun des mauvais cas connus (pro-perform.fr, paperblog.fr, blog de spam) ; précision du jeu annoté ≥ 0,9 ; coût ≤ budget. Si un seuil n'est pas atteint : le dire, avec la mesure et la cause.
- **Hors périmètre** : pages ressources et liens morts (MU.7), contacts (MU.8), mentions (MU.9).

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 2, 4 et uniquement le sous-jalon MU.6.
Vérifie que MU.1 est fait dans PROGRESS.md sur main. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : la liste des cibles avant et après avec leur type, le rendement par source, le coût réel, tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.7.
```

### MU.7 Moteur, tactique 2 : pages ressources et liens morts

- **Objectif** : que la tactique 2 produise des cibles, avec preuve.
- **Prérequis** : MU.1.
- **Tâches** : points (a) à (d) de la section 2.1, tactique 2 : requêtes à empreinte pour pages de liens, reconnaissance d'une page ressources, lecture de 60 à 100 pages, vérification des liens sortants, deux demandes distinctes (remplacement avec preuve 404 / 410 ; ajout à la liste avec la rubrique visée), run borné du sens inverse (pages disparues des concurrents) avec coût mesuré avant de le garder, faux 404, fusion avec l'analyse de pages existante.
- **Livrables** : pages ressources comme source de candidates, jeu annoté de pages de liens, run réel.
- **Acceptation** (mega-coloring.com) : au moins 30 pages ressources lues ; au moins 8 cibles « page ressources » livrées, dont au moins 2 liens morts prouvés ; aucun lien déclaré mort sans 404 / 410 constaté. Si le thème n'en fournit pas assez : chiffres et explication à l'écran, pas de remplissage.
- **Hors périmètre** : contacts (MU.8), écran (MU.10).

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 2, 4 et uniquement le sous-jalon MU.7.
Vérifie que MU.1 est fait dans PROGRESS.md sur main. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : les pages ressources trouvées, les liens morts prouvés, le coût réel, tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.8.
```

### MU.8 Moteur : ne plus perdre deux cibles sur trois faute de contact

- **Objectif** : trouver un contact pour au moins la moitié des cibles pertinentes, sans dépense nouvelle.
- **Prérequis** : MU.1.
- **Tâches** : mesurer d'abord la perte par cause (aucune adresse, adresse rejetée par le vérificateur, formulaire non reconnu, page bloquée) ; lire plus de pages (contact, mentions légales, à propos, conditions, pied de page) ; adresses écrites en clair déguisé, données structurées ; meilleure détection des formulaires ; contrôle du vérificateur sur un échantillon relu à la main ; pages en HTTP 403 : lecteur de secours si un hôte autorisé existe [À VÉRIFIER], sinon noté ; cibles sans contact conservées à part avec le lien vers leur page de contact.
- **Livrables** : enquêteur amélioré, tableau des pertes avant / après, jeu annoté de pages de contact.
- **Acceptation** : sur le run de référence, au moins 50 % des cibles pertinentes ont un contact (31 % aujourd'hui) ; aucune adresse inventée ou devinée ; les cibles sans contact restent visibles. D5 tranché avec les chiffres.
- **Hors périmètre** : service payant de recherche d'emails (D5).

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 2, 4, 5 et uniquement le sous-jalon MU.8.
Vérifie que MU.1 est fait dans PROGRESS.md sur main. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : le taux de contact avant et après avec les causes de perte, tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.9.
```

### MU.9 Moteur, tactique 3 : mentions sans lien, dites honnêtement

- **Objectif** : trouver les mentions quand il y en a, et l'expliquer quand il n'y en a pas.
- **Prérequis** : MU.5 (autres noms), MU.1.
- **Tâches** : points (a) à (d) de la section 2.1, tactique 3 : autres noms pris en compte, garde-fou des noms génériques, état vide honnête, revérification mensuelle plafonnée avec email ; test sur un site connu pour avoir des mentions (D6).
- **Livrables** : recherche de mentions revue, job mensuel, textes de l'état vide.
- **Acceptation** : sur un site réellement cité, au moins une mention sans lien est trouvée et vérifiée (la page ne lie pas déjà le site) ; sur mega-coloring.com, l'état vide s'affiche avec son explication ; aucun homonyme accepté sur le jeu annoté.
- **Hors périmètre** : réutilisation d'images sans crédit (backlog).

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 2, 4 et uniquement le sous-jalon MU.9.
Vérifie que MU.1 et MU.5 sont faits dans PROGRESS.md sur main. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : les mentions trouvées sur le site de test cité, l'état vide sur mega-coloring.com, tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.10.
```

### MU.10 L'écran « Vos cibles », version résultat

- **Objectif** : que le premier écran après l'analyse soit la liste courte, lisible par tactique, avec la transparence sur ce qui a été écarté.
- **Prérequis** : MU.3 ; MU.6 à MU.9 souhaitables.
- **Tâches** : écran de la section 3.1 point 6 : phrase de synthèse, onglets par tactique avec compteurs et états vides honnêtes, carte par site, Garder / Écarter avec motif enregistré, onglet « Sans contact trouvé » avec saisie manuelle, liste des sites écartés par motif, barre fixe « Préparer mes messages » (pont existant vers les brouillons, sans passer par l'ancien plan de liens) ; onglet « État des lieux » (section 3.1 point 7) ; retrait des trois boutons payants et de la question « fondateur ? ».
- **Livrables** : nouvel écran, captures avec données réelles.
- **Acceptation** : un nouvel inscrit comprend en 5 secondes combien de cibles il a et quoi faire ; chaque carte montre pourquoi, preuve, demande, contact ; écarter une cible la retire et garde le motif ; mobile ; aucune action d'envoi.
- **Hors périmètre** : brouillons, lots, envoi (partie CRM).

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 3, 4 et uniquement le sous-jalon MU.10.
Vérifie que MU.3 est fait dans PROGRESS.md sur main. Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : captures connectées avec les cibles réelles du site de test (bureau et mobile), tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis donne-moi le prompt de MU.11.
```

> **Essai de Jonathan après MU.10** : refaire tout le parcours et juger les cibles une par une (garder / écarter).

### MU.11 Essai complet sur trois sites, mesures, nettoyage

- **Objectif** : vérifier que le parcours et le moteur tiennent hors du site de test habituel, et retirer l'ancien.
- **Prérequis** : MU.10 ; sites de D6.
- **Tâches** : parcours complet en production sur 3 sites de niches différentes (dont un métier local) ; pour chacun : durée, coût, nombre de cibles par tactique et par type, taux de contact, jugement de Jonathan (gardées / écartées et motifs) ; tableau de bord interne minimal du coût par analyse et par étape (obligation de `CLAUDE.md` 4.5, reprend MT.7) ; correction des bloquants ; suppression des écrans et du code de l'ancienne chaîne devenus inutiles (D2) ; mise à jour de `CLAUDE.md` (sections 3 et 4.1) et de la home si une promesse ne correspond plus à ce que l'outil fait.
- **Livrables** : tableau de mesures par site dans `PROGRESS.md`, tableau de bord interne, code mort retiré, documents à jour.
- **Acceptation** : indicateurs de la section 7 mesurés sur les 3 sites ; chaque écart expliqué ; aucun écran de l'ancienne chaîne accessible.
- **Hors périmètre** : partie CRM, paliers et prix.

```
Lis CLAUDE.md et PROGRESS.md. Puis lis dans docs/jalon-mu.md les sections 4, 5, 7 et uniquement le sous-jalon MU.11.
Vérifie que MU.10 est fait dans PROGRESS.md sur main et que j'ai fourni les sites de test (D6). Annonce en 3 lignes ce que tu vas faire et ce que tu ne feras pas. Reste dans le périmètre.
À la fin : le tableau de mesures des 3 sites, tests/lint/typecheck verts, PROGRESS.md à jour, PR fusionnée dans main, puis dis-moi ce qu'il reste avant de passer à la partie messages.
```

## 7. À quoi on reconnaît que le jalon est réussi

| Indicateur                                           | Aujourd'hui                                                                                                         | Cible                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| De l'inscription au lancement de l'analyse           | 3 écrans, dont un tableau de bord inutile et un formulaire long (profil complet ouvert, objectif, tableau de coûts) | 3 écrans courts, 3 saisies (adresse, prénom, rôle), le reste prérempli |
| Clics entre le lancement et la liste de cibles       | 4 ou plus (lien discret, 3 étapes payantes), plus des actualisations manuelles                                      | 0                                                                      |
| Analyses de production arrivées jusqu'aux cibles     | 0 sur 3                                                                                                             | toutes, ou un échec expliqué                                           |
| Durée d'une analyse                                  | 12 à 21 min pour le seul tri                                                                                        | moins de 10 min [HYPOTHÈSE]                                            |
| Coût par analyse                                     | ~0,87 USD (deux moteurs)                                                                                            | 0,55 à 0,65 USD                                                        |
| Cibles livrées (site de test)                        | 19                                                                                                                  | 25 ou plus, au-dessus du seuil de qualité                              |
| Cibles qui ne sont ni blogs ni médias                | 2 sur 19                                                                                                            | 8 ou plus                                                              |
| Cibles de la tactique 2 (dont liens morts prouvés)   | 0                                                                                                                   | 8 ou plus (dont 2 ou plus)                                             |
| Cibles pertinentes avec contact                      | 31 %                                                                                                                | 50 % ou plus                                                           |
| Mauvaises cibles relevées par Jonathan dans la liste | plusieurs en bas de liste                                                                                           | 1 sur 10 au plus                                                       |

Ces cibles chiffrées sont des objectifs de travail, pas des promesses : si une mesure réelle ne les atteint pas, la session le dit avec le chiffre et la cause, et on ajuste le seuil ou le moteur.
