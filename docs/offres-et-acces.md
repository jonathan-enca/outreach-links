# Offres et accès : réflexion d'ensemble (21/11/2026)

> **Validé par Jonathan le 21/11/2026** : les cinq points marqués **[À TRANCHER]** sont tranchés selon l'option proposée.
>
> 1. Analyse gratuite complète, **une seule fois par compte**.
> 2. En gratuit, **3 messages en entier**, les autres : objet et première phrase.
> 3. Le plafond mensuel compte les **cibles contactées** ; relance et réponses incluses, non comptées.
> 4. Prix **29,90 / 49,90 / 199,90 €** (Starter, Pro, Scale), comme en ligne ; `CLAUDE.md` est à corriger.
> 5. **« 7 jours d'essai » supprimé** : le gratuit est l'essai. « Satisfait ou remboursé 14 jours » reste une option à voir avec le juriste, non promise pour l'instant.

## 1. Où on en est aujourd'hui (relevé dans le code et la base)

**Ce qui existe déjà**

- Table `plans` (source de vérité) et module unique des droits `src/features/billing/entitlements.ts`.
- Refus déjà appliqués côté serveur : nombre de sites, nombre de boîtes d'envoi (gratuit : 0), campagnes par mois, envoi et plafond mensuel d'envois.
- Stripe est câblé en mode test (abonnements, webhook, mensuel et annuel à -20 %).

**Ce que la base dit vraiment (lu le 21/11)**

| Offre   | Prix / mois | Sites | Campagnes / mois | Envois / mois | Boîtes | Vérif. des liens | Domaine dédié |
| ------- | ----------- | ----- | ---------------- | ------------- | ------ | ---------------- | ------------- |
| Gratuit | 0 €         | 1     | 1                | 0             | 0      | non              | non           |
| Starter | 29,90 €     | 1     | 1                | 100           | 1      | non              | non           |
| Pro     | 49,90 €     | 3     | 3                | 300           | 2      | oui              | non           |
| Scale   | 199,90 €    | 20    | 20               | 1 000         | 10     | oui              | oui           |

**Les trous**

1. **Tout est ouvert en production** : `BETA_MODE` donne à chaque inscrit les droits Starter, envoi compris. Aucun verrou n'est donc visible aujourd'hui.
2. **Les emails des cibles ne sont masqués nulle part.** Ils arrivent en clair dans le navigateur (écran Vos cibles, À valider, lots, export CSV). Pire : la base les rend lisibles à tout utilisateur connecté, même sans passer par nos écrans.
3. **Aucun écran de verrouillage.** Un gratuit qui clique sur « connecter ma boîte » reçoit une phrase d'erreur, pas une proposition d'offre.
4. **L'analyse du gratuit est bridée** dans le code (3 concurrents, 0,25 USD) : c'est le contraire de « il voit tout ».
5. **La home promet « 7 jours d'essai offerts »**, qui n'existe pas dans le code et contredit l'idée d'un gratuit permanent.
6. **Écart de prix** : `CLAUDE.md` dit 19,90 / 39,90 / 99,90 € et « Business » ; la base et la home disent 29,90 / 49,90 / 199,90 € et « Scale ».
7. **Le compteur d'envois compte aussi les relances et les réponses.** Avec 100 envois, Starter contacte environ 50 cibles, alors qu'une campagne en livre 80 à 100 : l'offre d'entrée ne peut pas envoyer sa propre campagne.

## 2. Le principe : « tout voir, rien envoyer »

Le gratuit n'est pas une version réduite du produit : c'est **le produit entier, arrêté une marche avant l'envoi**. L'utilisateur doit se dire « tout le travail est fait, il ne me reste qu'à appuyer ». Le verrou tombe au moment où l'envie est la plus forte.

Trois règles pour que l'appât reste honnête (section 1 de `CLAUDE.md`) :

- On ne montre que du vrai : « email vérifié » seulement s'il a été trouvé et vérifié ; « 87 messages prêts » seulement s'ils sont écrits.
- Chaque verrou dit ce qu'il cache et ce qui le débloque, sans fausse urgence.
- Jamais « backlinks garantis », y compris sur l'écran de paiement.

## 3. Le gratuit en détail

| Élément                                            | Gratuit                                               | Pourquoi                                                                                 |
| -------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Site                                               | 1                                                     | décision de Jonathan                                                                     |
| Analyse complète (concurrents, pages à pousser)    | **oui, la vraie, une fois**                           | c'est l'effet « gros travail fait pour moi » ; la relancer est payant **[À TRANCHER 1]** |
| Search Console                                     | oui                                                   | améliore l'analyse et engage l'utilisateur                                               |
| Liste des cibles (site, page, type, raison, score) | **toute la liste**                                    | il voit le volume et la qualité                                                          |
| Email de contact                                   | **masqué** : « Email vérifié 🔒 », jamais l'adresse   | sinon il envoie lui-même                                                                 |
| Lien vers le formulaire de contact                 | masqué                                                | même raison                                                                              |
| Messages rédigés                                   | **3 en entier, les autres : objet + première phrase** | 3 suffisent à juger la qualité ; tout montrer permet de copier-coller **[À TRANCHER 2]** |
| Export CSV                                         | verrouillé                                            | même raison                                                                              |
| Boîte d'envoi                                      | **connexion verrouillée**                             | décision de Jonathan                                                                     |
| Validation et envoi, relance, tâches manuelles     | verrouillés                                           | cœur du payant                                                                           |
| Réponses, liens obtenus                            | écrans visibles, vides, avec un exemple               | il voit ce qu'il aura                                                                    |

**Limite assumée** : un utilisateur motivé peut visiter les 90 pages et chercher les contacts à la main. C'est justement le travail que le produit vend ; on ne cache pas les sites.

**Coût** : une campagne complète coûte environ 1 à 1,50 USD d'API. C'est le coût d'acquisition d'un inscrit. Protections : email confirmé à l'inscription, **une seule analyse gratuite par compte**, cache par domaine (déjà en place), plafond de dépense quotidien global (25 USD aujourd'hui, à relever au lancement).

**Impératif technique** : le masquage se fait **côté serveur et dans la base**, pas à l'affichage. Une adresse masquée ne doit jamais quitter le serveur.

## 4. Les trois offres payantes

Proposition : garder la structure actuelle, corriger deux incohérences.

| Élément                            | Starter                | Pro (recommandé) | Scale           |
| ---------------------------------- | ---------------------- | ---------------- | --------------- |
| Pour qui                           | un site                | plusieurs sites  | agence, éditeur |
| Sites                              | 1                      | 3                | 20              |
| Campagnes par mois                 | 1                      | 3                | 20              |
| **Cibles contactées par mois**     | 100                    | 300              | **2 000**       |
| Relance et réponses                | incluses, non comptées | idem             | idem            |
| Boîtes d'envoi                     | 1                      | 2                | 10              |
| Emails visibles, messages, export  | oui                    | oui              | oui             |
| Réponses classées                  | oui                    | oui              | oui             |
| Vérification du lien obtenu        | oui                    | oui              | oui             |
| Surveillance continue + alertes    | non                    | oui              | oui             |
| Réponses prêtes à insérer          | non                    | oui              | oui             |
| Pages du site connues du rédacteur | 200                    | 500              | 1 000           |
| Domaine d'envoi dédié              | non                    | non              | oui             |

Les deux corrections :

- **Compter les cibles contactées, pas les emails** **[À TRANCHER 3]**. Plus simple à comprendre (« 100 sites contactés par mois »), et Starter peut enfin envoyer une campagne entière. La relance ne nous coûte rien.
- **Scale à 2 000** : à 1 000 pour 20 sites, cela fait 50 par site, moins qu'une campagne.

Un changement de fond : **la vérification du lien obtenu passe dans toutes les offres**. C'est la preuve que le produit marche ; la cacher à Starter, c'est cacher la raison de rester. Pro garde la surveillance dans la durée (alerte si le lien disparaît).

**Prix [À TRANCHER 4]** : 29,90 / 49,90 / 199,90 € (la base, la home) ou 19,90 / 39,90 / 99,90 € (`CLAUDE.md`) ? Par défaut je garde ce qui est en ligne et je corrige `CLAUDE.md`.

## 5. Le tunnel

```
Home « Analysez votre site gratuitement, sans carte »
  → inscription (email confirmé)
  → site + thème (30 secondes)
  → analyse en direct (les 8 étapes, déjà en place)
  → Vos cibles : 87 sites, « 64 emails vérifiés 🔒 »
  → Messages : 3 lisibles, 84 entrouverts
  → bouton « Envoyer les 87 demandes »
  → ÉCRAN D'OFFRE (ses propres chiffres, 3 offres, mensuel / annuel)
  → paiement Stripe
  → connexion de la boîte
  → validation et premier envoi
```

- **Un seul écran d'offre**, appelé depuis tous les verrous (email masqué, message entrouvert, export, boîte, deuxième site, nouvelle campagne). Il reprend les chiffres de l'utilisateur : « 87 cibles prêtes, 64 emails vérifiés, 87 messages écrits ». Il présélectionne l'offre qui couvre ce qu'il a sous les yeux.
- **Bandeau permanent** dans l'application en gratuit : « Offre gratuite · 87 demandes prêtes à partir · Débloquer l'envoi ».
- **« 7 jours d'essai » disparaît** **[À TRANCHER 5]** : le gratuit est l'essai. Deux promesses concurrentes brouillent le message. À la place, si tu le veux : « satisfait ou remboursé 14 jours » (à valider avec le juriste).
- **Grille de tarifs** : le gratuit redevient une vraie colonne, avec en clair ce qu'il donne et ce qu'il ne donne pas.
- **Emails de relance** (Resend, avec désinscription) : analyse terminée (« 87 cibles vous attendent »), J+2 (les 3 meilleures cibles), J+7 (dernier rappel). Rien au-delà.
- **Mesure** : inscrits → analyse terminée → écran d'offre vu → paiement → boîte connectée → premier envoi. Sans ces six chiffres on ne pourra pas régler le tunnel.

## 6. Cas limites à décider maintenant

- **Fin d'abonnement** : retour au gratuit. Tout reste lisible, l'envoi s'arrête, les relances prévues sont suspendues (et le disent). Les conversations déjà ouvertes restent lisibles ; les cibles pas encore contactées sont de nouveau masquées.
- **Trop de sites après un retour à une offre plus petite** : les sites en trop passent en lecture seule, rien n'est supprimé.
- **Plafond atteint en cours de mois** : les messages validés attendent le 1er du mois et affichent cette date (règle « jamais d'attente sans explication »).
- **Testeurs de la bêta** : à la coupure de `BETA_MODE` ils passent en gratuit. Proposition : un mois de Starter offert par code.

## 7. Découpage du chantier (un sous-jalon = une session)

| Sous-jalon | Contenu                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| MO.1       | Décisions écrites dans `CLAUDE.md` et `PLAN.md` ; table `plans` et droits étendus (contacts, messages, export, liens) |
| MO.2       | Masquage côté serveur et base : emails, formulaires, messages, export ; analyse complète pour le gratuit, une fois    |
| MO.3       | **Maquette** de l'écran d'offre et des verrous, à valider, puis écrans à l'identique                                  |
| MO.4       | Tunnel : home et grille de tarifs, bandeau, emails de relance, mesure des six étapes                                  |
| MO.5       | Stripe en réel, coupure de `BETA_MODE`, fin d'abonnement et retours à une offre plus petite                           |
