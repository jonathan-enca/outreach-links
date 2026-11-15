# Relevé de la home d'outlinkai.com (MH.1)

Relevé du 15/11/2026, page `https://www.outlinkai.com/` (redirection 308 depuis `outlinkai.com`), faite avec fetch puis Playwright (Chromium, 1440 px de large et mobile 390 px). Aucune modification du site, aucune inscription, aucune requête hors lecture de la page publique.

**Usage** : référence d'architecture pour MH.2 et MH.3 (ordre, rôle et mécanique des sections). Les textes sont **paraphrasés ou réduits à des intitulés** : MH.2 et MH.3 réécrivent tout en français pour notre produit, jamais mot à mot (CLAUDE.md section 8). Les captures ne sont pas versionnées (droits d'auteur de la source) ; elles se refont avec le script décrit en fin de document.

## 1. Vue d'ensemble

Page unique de 17 000 px environ au bureau, sections numérotées de 01 à 09 (certaines sans numéro) (numéro mono + libellé en capitales dans un filet horizontal, par exemple « 04 HOW AUTOPILOT WORKS »), puis un appel final et un footer. Alternance de fonds : **sombre** (hero, boucle, appel final, footer) / **clair** gris très pâle ou blanc (reste). Un seul accent (bleu électrique), une grotesque pour les titres (Schibsted Grotesk, serrée, très grande) et une mono (Geist Mono) pour les libellés, chiffres et petites mentions techniques. JSON-LD : `Organization`, `WebSite`, `SoftwareApplication`, `FAQPage`.

Ordre des sections :

| #   | id           | Section                                             | Fond               | Rôle                                            |
| --- | ------------ | --------------------------------------------------- | ------------------ | ----------------------------------------------- |
| -   | -            | Header collant                                      | sombre translucide | navigation + CTA                                |
| -   | -            | Hero                                                | sombre, halo bleu  | promesse, double CTA, lien « sans inscription » |
| -   | -            | Bandeau « tourne sur les outils que vous utilisez » | sombre             | réassurance (intégrations, conformité)          |
| 01  | `what-it-is` | C'est quoi                                          | clair              | définition en clair, citée par les moteurs IA   |
| 02  | -            | Le problème                                         | gris pâle          | douleurs du client                              |
| 03  | `by-hand`    | Preuves                                             | clair              | chiffres sur sites du fondateur, source citée   |
| 04  | `product`    | Comment ça marche (boucle en 7 étapes + digest)     | sombre             | mécanisme + aperçu de l'écran digest            |
| 05  | -            | Qualité des cibles, personnalisation, suivi         | gris pâle          | 3 blocs produit avec maquettes                  |
| 06  | -            | Fonctions (8 cartes)                                | clair              | liste de bénéfices                              |
| -   | `extension`  | Extension Chrome et application Android             | gris pâle          | produits satellites                             |
| 07  | `compare`    | Comparatif                                          | clair              | tableau vs outils DIY vs agences                |
| 08  | `pricing`    | Tarifs                                              | gris pâle          | 3 plans + bascule mensuel/annuel                |
| 09  | `faq`        | FAQ                                                 | clair              | 9 questions (accordéon)                         |
| -   | -            | Appel final                                         | clair puis sombre  | dernier CTA                                     |
| -   | -            | Footer                                              | sombre             | liens, comparatifs, légal                       |

## 2. Section par section

### 2.1 Header (collant)

- `position: sticky`, hauteur 65 px, fond `rgba(8,9,12,.92)` (sombre quasi opaque, sans flou), filet bas 1 px blanc à 8 %. Ne change pas au scroll.
- Gauche : logo (pastille bleue arrondie avec un anneau) + nom, le suffixe « AI » en bleu clair. Liens : Product, Why Outlink (ancre `#compare`), Pricing, FAQ (ancre `#faq`).
- Droite : « Sign in » (texte), « Start free » (bouton plein, bleu `#3442ff`, rayon 10 px, léger halo).
- **Mobile** : le bouton burger ouvre un panneau latéral droit (environ 75 % de largeur) sur fond flouté, titre « Menu » + croix, les 4 liens, un séparateur, « Sign in » puis « Start free » en bouton pleine largeur. Pas de scroll horizontal (390 px).

### 2.2 Hero

- Pastille d'annonce cliquable en haut (« NEW » + nouveauté produit + flèche) : annonce de l'appli mobile.
- Surtitre mono en capitales : à qui s'adresse le produit (agences SEO et équipes internes).
- **H1 sur deux lignes**, très gros (~96 px), la première ligne en dégradé bleu/violet, la seconde en blanc : « AI-native / backlink building ». Pas de verbe d'action : un nom de catégorie.
- Paragraphe de 3 phrases (~20 px, gris clair) : trouve les sites, rédige le pitch, envoie depuis la boîte de l'utilisateur, relance, traite les réponses, vérifie le lien ; l'utilisateur fixe les garde-fous et lit un digest.
- Deux boutons : « Start free » (plein, flèche) et « See how it works » (secondaire, ancre vers la boucle).
- Deux micro-garanties mono avec puce verte : aperçu gratuit des prospects, carte demandée seulement à l'envoi ; à partir de 39 $/mois, remboursement 14 jours.
- Ligne « Just looking ? » avec lien **vers un aperçu sans inscription** (équivalent de notre audit gratuit public).
- Fond : quadrillage très discret + halo bleu radial derrière le titre. Cartes d'interface flottantes autour du titre (5 vignettes : cible qualifiée avec score de pertinence 92 et contrôle spam, brouillon IA avec « hook » tiré de la page, garde-fous 150 envois/jour, envoi, réponse « → négociation », lien vérifié live DR 68 dofollow). Leur comportement sur mobile n'a pas été relevé.
- Sous le texte : fenêtre « product tour » (barre de fenêtre avec 3 points, titre mono, durée 1:15) contenant une **vidéo** MP4 de 75 s avec affiche, muette, en boucle, avec contrôles, sans lecture automatique, légendée « espace de démo enregistré dans le produit, chiffres de la démo ».

### 2.3 Bandeau de réassurance

Libellé mono « Runs on the tools you already trust » puis 5 pastilles texte : Stripe, Gmail OAuth, Outlook OAuth, Search Console, RGPD · CAN-SPAM. Pas de logos clients.

### 2.4 Section 01 : « C'est quoi ? » (`what-it-is`)

Bloc de définition factuelle, écrit pour être cité (SEO et moteurs IA) : titre-question, paragraphe de définition, puis **grille 2 colonnes de 6 couples libellé / réponse** : ce que c'est, pour qui, ce qui tourne tout seul, ce que l'utilisateur contrôle, d'où partent les mails (boîte de l'utilisateur, jamais un pool partagé), **ce que le produit ne fait pas** (n'achète pas de liens). Aucune image (la grille est en texte).

### 2.5 Section 02 : le problème

Titre « le link building ne devrait pas manger votre semaine », une phrase, puis **12 pastilles de douleurs** (listes scrappées à la main, relances oubliées, PBN, domaine brûlé, cibles déjà contactées par un collègue, agences payées pour des liens maigres, liens qui disparaissent, etc.). Les pastilles sont disposées en nuage compact.

### 2.6 Section 03 : preuves (`by-hand`)

- Titre, paragraphe d'honnêteté (sites du fondateur, liens construits à la main, **pas** avec le produit, chiffres tirés d'Ahrefs).
- Bandeau de 3 grands chiffres (DR 6 → 37 en 4 mois ; trafic x3,2 ; 189 citations IA).
- **5 cartes de sites** (initiale colorée, nom, domaine et description, DR avant → après avec courbe d'aire, lignes de métriques avec période, « nouveaux sites DR 20+ qui font un lien », « liens depuis » avec 2 à 4 domaines et leur DR, étiquette « Founder-owned · links built by hand »).
- Deuxième rangée : **marquee** horizontal infini de légendes courtes (chiffre + nom du site), en 3 ou 4 copies (animation CSS en continu).
- Note de source en bas : outil, date (8 novembre 2026), méthode de comptage, périmètre.
- Enseignement : preuve par dogfooding avec méthode et date, ce que CLAUDE.md section 13 demande aussi. À adapter avec **nos** sites et **nos** chiffres, rien d'inventé.

### 2.7 Section 04 : comment ça marche (`product`, fond sombre)

- Titre sur deux phrases courtes (« Set the guardrails. The AI runs the loop. »), sous-texte à droite sur la même ligne (mise en page 2 colonnes : titre à gauche, texte à droite, partout dans la page).
- **Carte « La boucle autopilote »** : 7 étapes numérotées 01 à 07 sur une ligne horizontale (pastille ronde, titre, une ligne de description) : Discover, Qualify, Personalize, Send, Follow up, Handle reply, Verify. La ligne se remplit en bleu et l'étape active est pleine, avec une pastille « Verify feeds the next cycle » qui boucle. Sa mise en forme mobile n'a pas été relevée en détail (la page ne déborde pas à 390 px).
- **Maquette de navigateur** (fond clair dans la section sombre, barre d'adresse mono `app.…/digest`) : « Cette semaine en autopilote », période, pastille verte « garde-fous respectés », 4 compteurs (liens obtenus, prospects qualifiés, réponses traitées, DR moyen), 3 lignes d'activité avec statut (Live, Répondu, Envoyé).
- CTA intermédiaire : phrase + « Start free » + « Preview without signing up ».

### 2.8 Section 05 : qualité, personnalisation, suivi

Trois blocs texte + maquette (l'alternance gauche/droite n'a pas été vérifiée) :

1. **Cibles** : titre, phrase, 3 puces (scoring pertinence + autorité, filtre spam/PBN, prospects frais dédoublonnés) ; maquette de deux cartes de domaine, une « Qualified » (pertinence 92, DR 68, spam passé), une « Filtered out » (réseau de liens).
2. **Personnaliser et envoyer** : 3 puces (hook issu de la page, envoi depuis Gmail/Outlook, garde-fous de délivrabilité) ; maquette d'un brouillon (en-tête De / À, texte avec deux passages soulignés numérotés 1 et 2, légende « hook tiré de sa page », jauge « santé de la boîte 98 », heure d'envoi).
3. **Relancer et vérifier** : 3 puces ; maquette « Activité » avec 3 fils (lien vérifié, réponse « négociation », relance programmée dans 3 j).

### 2.9 Section 06 : fonctions

**8 cartes numérotées** en grille (titre court + 2 lignes) : qualité des prospects, personnalisation et gestion des réponses, délivrabilité, preuves, serveur MCP, garde-fous, rapports en marque blanche, agences. Deux CTA sous la grille (« Tour the full product », « Browse all tactics »).

### 2.10 Extension Chrome et application Android (`extension`)

Deux blocs côte à côte, sans numéro : extension qui badge les résultats Google avec l'historique (contacté, en cours, lien posé, ne pas contacter), application Android pour approuver les brouillons. Chacun : titre, paragraphe, 3 puces, 2 CTA (store + « voir »), maquette. **Hors périmètre pour nous** (aucun de ces deux produits n'existe).

### 2.11 Section 07 : comparatif (`compare`)

Titre + phrase, **tableau 4 colonnes** (capacité / le produit / outils DIY / agences) sur 6 lignes (boucle complète, filtre spam, envoi depuis sa boîte, preuve du lien, coût d'échelle…). Colonne du produit mise en avant. Sous le tableau, ligne de liens « Weighing a specific tool ? » vers 6 pages de comparaison nominatives. Mise en garde CLAUDE.md : éviter le « comparatif auto-noté » (section 13) ; MH.3 le fait sobre ou le reporte.

### 2.12 Section 08 : tarifs (`pricing`)

- Titre « Start free. Scale… », texte (paiement au premier envoi, remboursement sous 14 jours).
- **Encart « Free to start »** (pastille verte + phrase + lien) avant les plans.
- **Bascule Mensuel / Annuel (−20 %)** en contrôle segmenté ; le clic sur « Yearly » change bien les prix affichés (39 → 31, 99 → 79, 299 → 239 par mois) et ajoute le total annuel.
- **3 cartes** : Starter 39 $ (150 e-mails/jour, 3 boîtes), **Growth 99 $ (carte sombre, « Most popular »**, 500 e-mails/jour, 10 boîtes), Scale 299 $ (illimité). Chaque carte : nom, accroche, prix très gros + `/mo`, ligne mono « facturé mensuellement ou X/mois en annuel », pastille de plafond, bouton, liste à coches (la carte médiane met une ligne en gras). Tous les boutons disent « Start free ».
- Note : facturation au premier envoi, garantie 14 jours ; liens vers la page tarifs complète et un article sur le coût du link building.
- Pour nous : plans `gratuit` / `starter` / `pro` de la table `plans` (M6.1), plafonds **mensuels** et non journaliers ; ne pas reprendre leurs prix.

### 2.13 Section 09 : FAQ (`faq`)

Titre, phrase avec 2 liens (hub de réponses, glossaire), **9 questions en accordéon natif** (éléments `details` / `summary`, aucune ouverte au chargement ; l'exclusivité entre questions n'a pas été testée) : c'est quoi, pour qui, risque de pénalité / spam, boîte personnelle, Google, ce que fait l'IA et ce que contrôle l'utilisateur, prix et carte, données, agences. Réponses de 2 à 4 phrases. Balisage `FAQPage`.

### 2.14 Appel final

Libellé mono (catégorie), titre « Mettez votre link building en pilote automatique », phrase, 2 boutons (« Start free », « Compare plans »), ligne de micro-garanties répétée. Centré, fond sombre prolongeant le footer.

### 2.15 Footer

- Colonne marque : logo, une phrase de promesse, lien « Service status », deux lignes de produits satellites (extension, application Android) avec mention « Free ».
- 5 colonnes de liens : Produit (aperçu, marque blanche, extension, appli, outil gratuit de prospection, MCP, tarifs, pourquoi), Tactiques (toutes, guest posting, resource & broken-link, mentions sans lien et niche edits), Ressources (réponses, glossaire, comparatifs, `llms.txt`), Entreprise (à propos, carrières, partenaires, contact, statut), Légal (confidentialité, CGU, DPA).
- Colonne « Compare » : 10 liens « X vs concurrent ».
- Réseaux sociaux (« FOLLOW »), mention de copyright. Compte 25 à 30 liens : c'est aussi un maillage interne SEO.
- Inspirations utiles pour nous : `llms.txt` (CLAUDE.md section 13, point 8), pages de comparaison et glossaire, statut du service.

## 3. Composants et comportements transverses

- **Grille** : conteneur ~1200 px centré (marges 120 px à 1440), sections de 700 à 2300 px de haut.
- **En-tête de section** en 2 colonnes : titre à gauche (très gros, serré), texte explicatif à droite ; au-dessus, filet horizontal avec numéro bleu et libellé mono.
- **Typographie** : titres en grotesque 700 serrée (~64 px section, ~96 px hero), corps ~18 à 20 px, libellés mono ~11 à 12 px en capitales espacées. Corps de page en Inter (repli), couleur de texte `#171717` sur sections claires.
- **Couleurs** : fond sombre `#08090c`, fond gris pâle `#f5f6f8`, accent bleu `#3442ff`, vert pour les statuts « live », filets blancs à 8 %.
- **Boutons** : primaire plein bleu rayon 10 px avec halo, secondaire fond sombre bordé ; flèche dans le CTA principal.
- **Cartes** : rayon 16 à 20 px, bordure fine, ombre très légère ; la carte « populaire » est inversée (sombre sur fond clair).
- **Animations** : révélation à l'apparition dans la fenêtre (les sections sont invisibles tant qu'elles ne sont pas défilées, ce qui fausse les captures plein écran), marquee en boucle, étapes de la boucle qui s'activent à tour de rôle, hero avec cartes flottantes. 15 animations actives au chargement (`document.getAnimations()`). À prévoir : `prefers-reduced-motion`.
- **Médias** : une seule vidéo (hero, non lue automatiquement), reste en maquettes HTML/CSS (aucune capture bitmap) ; l'ensemble se charge vite et reste net en mobile.
- **Mobile** (390 px) : pas de scroll horizontal, hauteur de page 25 000 px environ, largeur de page stable (pas de scroll horizontal), tableau comparatif défilant horizontalement dans son cadre (`overflow: auto`, vérifié), burger et panneau latéral (vérifié). Le reste (hero, boucle, tarifs) n'est pas détaillé : voir la capture mobile à refaire si besoin.
- **Ancres internes** : `#what-it-is`, `#by-hand`, `#product`, `#extension`, `#compare`, `#pricing`, `#faq`.

## 4. Correspondances pour notre home (guide pour MH.2 et MH.3)

| Section de la référence    | Équivalent chez nous                                                                     | À éviter / à adapter                                               |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Hero                       | Champ « ton site » qui lance l'audit gratuit (existant), 2 CTA, micro-garanties          | Pas de « backlinks garantis » ; pas de pastille d'appli            |
| Bandeau réassurance        | SMTP/IMAP, RGPD, liste de suppression ; pas de logos inventés                            | Ne pas citer des intégrations que nous n'avons pas (Gmail OAuth)   |
| 01 C'est quoi              | Définition + « ce que nous ne faisons pas » (pas de liens achetés)                       | Mention de l'IA seulement dans le marketing, jamais dans les mails |
| 02 Problème                | Douleurs françaises : annonces sponsorisées, liens payants, cibles irréalistes           | -                                                                  |
| 03 Preuves                 | Dogfooding sur nos sites, chiffres datés et sourcés, **seulement s'ils existent** (MB.2) | Ne rien inventer avant le test réel                                |
| 04 Boucle en 7 étapes      | Notre méthode en 5 étapes (CLAUDE.md 3) + maquette de l'audit ou du lot                  | -                                                                  |
| 05 Qualité / pitch / suivi | Tri des cibles avec motifs lisibles, hook visible, inbox classé                          | -                                                                  |
| 06 Fonctions               | Garde-fous, plan validé, lot validé, vérification des liens, digest                      | Pas de marque blanche, MCP, agences (hors v1)                      |
| Extension / Android        | **Aucun** (non prévu)                                                                    | Section supprimée                                                  |
| 07 Comparatif              | Sobre : « liens sponsorisés / agence / outils DIY / nous », sans note auto-attribuée     | Pas de comparatif auto-noté (CLAUDE.md 13)                         |
| 08 Tarifs                  | Gratuit / Starter / Pro depuis `plans`, plafonds mensuels                                | Ne pas copier prix ni limites ; annuel seulement s'il existe       |
| 09 FAQ                     | 9 à 10 questions : licéité, RGPD, IA dans les mails, Google, boîte, prix                 | Réponses honnêtes sur le payant et le taux de réponse              |
| Appel final et footer      | Même mécanique ; pages légales liées (MH.3), `llms.txt`                                  | -                                                                  |

## 5. Refaire le relevé

Script de rendu (hors dépôt) : Playwright, `chromium.launch()`, viewport 1440 puis 390 (`isMobile`), défilement progressif par pas de 400 px avec pause de 150 ms (déclenche les révélations), puis lecture des sections via `textContent` (un `innerText` renvoie du vide pour les blocs encore masqués). Captures : défiler jusqu'à la section et prendre une capture de la fenêtre, **pas** `fullPage` (les sections non révélées sortent noires).

## 6. Limites du relevé

- Rendu observé sans cookies ni connexion, un seul passage ; les valeurs d'animation (durées, courbes) ne sont pas mesurées au détail.
- Le contenu de la vidéo de 75 s et des pages `/product`, `/pricing` et `/login` n'a pas été relevé (hors périmètre : la home seulement).
- Les prix, plafonds et chiffres de preuve sont ceux de la source, relevés à titre indicatif et non réutilisables.
