# Stratégie SEO et planning éditorial de backleenks.com

> Établie le 22/11/2026. Marché : France, français. Données : Search Console (propriété `sc-domain:backleenks.com`), OpenSEO / DataForSEO (volumes mensuels Google France, difficulté KD sur 100), lecture des premières pages de Google sur 10 requêtes. [HYPOTHÈSE] = estimation non mesurée.

## 1. Constat de départ

**Le site part de zéro, et c'est normal.**

- Search Console : 0 clic et 0 impression sur les 3 derniers mois.
- Une seule page est connue de Google : la page d'accueil (indexée, dernier passage le 21/11/2026). `/aide/boite-envoi`, `/connexion`, `/inscription` et `/mentions-legales` sont inconnues de Google.
- Le site n'a aucun contenu éditorial : pas de blog, pas de guide, pas de glossaire, pas de comparatif.

**Le marché est petit mais accessible.**

- Les deux grands mots font peu de volume : « backlink » 1 900 recherches par mois (KD 30), « netlinking » 1 300 (KD 20).
- Tout le reste est de la longue traîne entre 20 et 400 recherches, avec des KD presque toujours sous 20.
- Les premières pages sont tenues par des blogs d'agences et d'indépendants (neocamino, pixalione, tactee, audreytips, luca-fancello, killianmouton), pas seulement par Semrush ou Abondance. Un site jeune avec de bons contenus et quelques liens peut y entrer.
- Ordre de grandeur de la demande visée par ce plan : 15 000 à 20 000 recherches par mois en tout, dont moins de 5 000 vraiment au cœur du produit [HYPOTHÈSE : somme de volumes qui se recoupent en partie].

**Conséquence** : l'objectif n'est pas le volume de trafic mais des visiteurs qui ont un problème de liens. Quelques centaines de visites bien ciblées par mois valent plus ici que des milliers sur « c'est quoi un prompt ».

**Réserve sur le KD** : un KD de 0 signifie souvent « pas assez de données », pas « gagné d'avance ». Chaque sujet du mois 1 a été ou doit être vérifié sur la vraie page de résultats avant rédaction.

## 2. Chantier technique à faire avant de publier

Classé par priorité. Tout se règle dans le code du site.

| #   | Constat (vérifié le 22/11/2026)                                                                                    | Action                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | `/sitemap.xml` répond 404                                                                                          | Générer un sitemap automatique et le déclarer dans Search Console                                                  |
| 2   | `/robots.txt` répond 404                                                                                           | Créer le fichier : tout autoriser sauf `/app`, `/api`, `/auth`, `/demo` ; y indiquer le sitemap                    |
| 3   | Aucune structure pour du contenu                                                                                   | Créer `/blog`, `/guides`, `/glossaire`, `/comparatifs`, `/outils` (gabarits, fil d'Ariane, liens internes, auteur) |
| 4   | `/audit-gratuit` répond 404 (seules les pages de résultat existent)                                                | En faire une vraie page d'entrée « Audit de backlinks gratuit »                                                    |
| 5   | `/connexion` et `/inscription` n'ont ni `noindex` ni adresse canonique                                             | Les passer en `noindex`                                                                                            |
| 6   | Pas d'image de partage (`og:image`) sur l'accueil                                                                  | En ajouter une, par défaut et par article                                                                          |
| 7   | `/llms.txt` répond 404                                                                                             | Le créer (prévu dans CLAUDE.md, annexe 13)                                                                         |
| 8   | `outreach-links.vercel.app` sert encore le site (l'adresse canonique pointe bien vers backleenks.com)              | Rediriger en 308 vers `www.backleenks.com`                                                                         |
| 9   | Données structurées présentes sur l'accueil seulement                                                              | Ajouter `Article`, `FAQPage`, `BreadcrumbList` sur les contenus                                                    |

Points déjà bons : HTTPS, redirection du domaine nu vers `www`, adresse canonique de l'accueil, `lang="fr"`, titre et description de l'accueil, Lighthouse mobile mesuré à 98 en M0.4.

## 3. Positionnement éditorial

**Une ligne** : le seul site français qui explique comment obtenir des liens **sans les acheter**, avec la méthode et les chiffres de nos propres campagnes.

Presque tous les contenus français sur le netlinking sont écrits par des vendeurs de liens (Semjuice, Linksgarden, Paper Club, Boosterlink). Ils ramènent tous à « achetez chez nous ». Notre angle est l'inverse, et il est crédible parce que le produit le fait.

**Trois règles pour chaque contenu**

1. Une preuve que les autres n'ont pas : un vrai message envoyé, un vrai taux de réponse, une vraie capture, un vrai coût. Sans cela, on ne publie pas.
2. Jamais « backlinks garantis ». Les comparatifs citent des prix datés et sourcés (règle de CLAUDE.md).
3. Chaque article mène à une action dans le produit : l'audit gratuit.

## 4. Les sept thèmes

Volume = recherches par mois en France. Adéquation = lien avec ce que le produit fait.

### A. Obtenir des liens gratuitement (cœur, adéquation forte)

| Mot-clé                                    | Volume    | KD     |
| ------------------------------------------ | --------- | ------ |
| campagne netlinking / campagne de netlinking | 390 + 210 | 4 / 2  |
| link building                              | 210       | 0      |
| stratégie netlinking / stratégie de netlinking | 170 + 90 | 0 / 5  |
| linkbaiting / link baiting                 | 170       | 0      |
| audit netlinking                           | 140       | 0      |
| backlink gratuit / backlinks gratuits      | 110       | 0      |
| seo off page                               | 90        | 0      |
| guest blogging                             | 90        | 3      |
| article invité                             | 70        | 0      |
| annuaire seo                               | 70        | 0      |
| rp digitales                               | 70        | 0      |
| trouver des backlinks                      | 40        | 8      |
| comment obtenir des backlinks              | 30        | 14     |
| broken link building, créer des backlinks  | 20 chacun | 25 / 1 |

### B. Acheter des liens ou non (intention commerciale, adéquation forte)

| Mot-clé                              | Volume    | KD     |
| ------------------------------------ | --------- | ------ |
| plateforme netlinking                | 390       | 10     |
| agence netlinking                    | 390       | 8      |
| acheter des backlinks / achat backlinks | 210 + 210 | 7 / 3  |
| article sponsorisé                   | 170       | 0      |
| achat de liens                       | 140       | 5      |
| vente de liens                       | 140       | 0      |
| outils netlinking / outil netlinking | 140       | 11 / 22 |
| plateforme backlink                  | 110       | 17     |
| formation netlinking                 | 110       | 0      |
| meilleure plateforme netlinking      | 90        | 5      |
| consultant netlinking                | 90        | 0      |
| tarif netlinking, prix backlink      | 30 chacun | 4 / inconnu |

C'est ici que se trouvent les gens prêts à payer. L'angle : « avant d'acheter, voici ce que vous pouvez obtenir gratuitement, et ce que ça coûte vraiment ».

### C. Avis et alternatives (intention d'achat, adéquation forte)

| Mot-clé                                  | Volume | KD |
| ---------------------------------------- | ------ | -- |
| linkuma avis                             | 880    | 23 |
| linkavista avis                          | 90     | 0  |
| ereferer avis, rocketlinks avis, boosterlink avis | 20 chacun | 0 à 2 |

Les noms de marque seuls font beaucoup plus (Paper Club 1 000, Semjuice 880, Linksgarden 720), mais ces recherches vont au site de la marque. On vise « avis » et « alternative », avec des pages factuelles : prix relevés à une date, ce que la plateforme fait, ce qu'elle ne fait pas, pour qui.

### D. Glossaire et indicateurs (volume, adéquation moyenne)

| Mot-clé                       | Volume    | KD     |
| ----------------------------- | --------- | ------ |
| trust flow                    | 320       | 0      |
| relinking                     | 260       | 0      |
| nofollow / rel nofollow       | 210 + 260 | 11 / 14 |
| ancre de lien / ancres de liens | 210 + 210 | 2 / 0  |
| dr checker                    | 210       | 0      |
| domain rating                 | 140       | 11     |
| link juice                    | 110       | 0      |
| lien dofollow                 | 90        | 0      |
| nom de domaine expiré         | 90        | 16     |
| autorité de domaine           | 70        | 1      |
| spam score                    | 70        | 8      |
| backlinks toxiques            | 50        | inconnu |
| citation flow, pénalité manuelle google | 40 chacun | 0 |

Pages courtes, une par terme. Elles servent trois fois : petit trafic régulier, liens internes vers les guides, et cibles naturelles pour nos propres demandes de liens.

### E. Écrire et envoyer des demandes par email (adéquation moyenne)

| Mot-clé                         | Volume    | KD |
| ------------------------------- | --------- | -- |
| mail de relance                 | 720       | 0  |
| cold email / cold emailing      | 480 + 480 | 0  |
| spf dkim dmarc                  | 320       | 13 |
| mail de prospection             | 210       | 30 |
| exemple mail de relance         | 140       | 0  |
| délivrabilité email             | 110       | 0  |
| warm up email                   | 50        | 8  |
| exemple mail prospection        | 40        | 0  |

Attention : « mail de relance » est surtout cherché pour des candidatures et des factures. À traiter seulement sous l'angle « relance après une demande restée sans réponse », en second temps.

### F. Liens et visibilité dans les IA (tendance, adéquation moyenne)

| Mot-clé               | Volume | KD |
| --------------------- | ------ | -- |
| geo seo               | 2 900  | 6  |
| llms.txt              | 720    | 28 |
| référencement ia      | 390    | 0  |
| référencement chatgpt | 210    | 0  |

Angle propre à nous : les mentions et les liens sur des sites tiers sont ce qui fait citer une marque par les IA. Deux ou trois articles, pas plus : le sujet attire beaucoup de monde qui n'achètera pas.

### G. Par type de site (conversion, peu de volume mesurable)

« netlinking local », « netlinking e-commerce », « netlinking B2B » n'ont pas de volume mesuré. On les écrit quand même, plus tard, comme pages d'atterrissage par profil (artisan, boutique en ligne, SaaS, association), appuyées sur « seo local » (1 000, KD 9), « référencement local » (590, KD 3), « seo shopify » (90, KD 0), « seo wix » (110, KD 11).

### Ce qu'on ne vise pas

- « backlink », « netlinking », « audit seo gratuit » (720, KD 51), « domain authority » (390, KD 72), « annuaires gratuits » (2 900, KD 55) : trop durs pour un site neuf. On y reviendra après 6 mois.
- « pbn » (3 600) : le sigle a d'autres sens, intention floue.
- Les définitions hors sujet qui font le trafic de Semjuice et Linksgarden (prompt, storytelling, soldes) : du trafic qui ne convertit pas.

## 4 bis. Thème phare : « backlinks gratuits » (ajout du 22/11/2026)

**Thèse éditoriale** : les backlinks gratuits _faciles_ ne valent rien ; ceux qui valent quelque chose se demandent, un par un, à la bonne page. Tout le thème démontre la première moitié et le produit fait la seconde.

### Ce que disent les données

- **La demande directe est petite.** « backlink gratuit » et « backlinks gratuits » font 110 recherches par mois (KD 0) et Google les compte très probablement ensemble. Les variantes (liste, générateur, dofollow gratuit, annuaire backlink gratuit, Fiverr) font 10 recherches ou ne sont pas mesurées.
- **La première page est faible.** On y trouve une page perso hébergée chez Free, des générateurs sur github.io et weebly, des listes anglophones de « 50 sites à backlinks », un guide SEOptimer, Semrush. Aucun acteur français sérieux ne tient ce sujet.
- **Personne ne tient l'angle critique.** Les résultats promettent tous des liens faciles (listes, générateurs, « 12 façons »). Aucun ne dit ce que ces liens rapportent vraiment, chiffres à l'appui.
- **C'est le mot de notre page d'accueil** (« Des backlinks gratuits, demandés aux bons sites »). Posséder ce thème renforce directement la page qui vend.

Conclusion : ce n'est pas le thème qui apportera le plus de trafic, mais c'est celui où l'on peut être premier le plus vite et où chaque lecteur est exactement notre client.

### Les mots-clés du thème

| Mot-clé                                   | Volume    | KD      | Ce que Google montre aujourd'hui                         |
| ----------------------------------------- | --------- | ------- | -------------------------------------------------------- |
| backlink gratuit / backlinks gratuits     | 110       | 0       | Listes, générateurs, « N façons »                        |
| outil seo gratuit / outils seo gratuits   | 390       | 25 / 14 | Listes d'outils                                          |
| annuaire sans lien retour                 | 260       | 0       | Mélangé avec « annuaire inversé » : demande réelle plus basse |
| disavow / google disavow                  | 210 + 40  | 13 / 14 | Tutoriels de désaveu                                     |
| référencement gratuit / seo gratuit       | 90 + 90   | 6 / 16  | Agences                                                  |
| backlinks de qualité / backlink de qualité | 70 + 50  | 17      | Petits blogs (Serif, sublim.design) : prenable           |
| negative seo                              | 70        | 0       | Blogs SEO                                                |
| backlinks toxiques / backlink toxique     | 50 + 30   | inconnu | Ahrefs en anglais en tête : prenable en français         |
| liens gratuits / lien gratuit             | 50        | 0 / 22  | Flou                                                     |
| backlinks pas cher                        | 40        | 1       | Vendeurs                                                 |
| backlink dofollow / backlink nofollow     | 30 chacun | 0 / 10  | Définitions                                              |
| générateur de backlinks, liste backlinks gratuits, backlink Fiverr, backlink de profil, web 2.0 | 10 ou non mesuré | inconnu | Outils douteux, listes anglophones |

### Les contenus

Une page mère et onze articles. Chaque article suit le même plan : la promesse, ce qu'on a mesuré, pourquoi ça ne marche pas (ou dans quel cas ça marche), quoi faire à la place, puis l'audit gratuit.

| #    | Contenu                                                                                  | Mot-clé visé                    | Rôle        |
| ---- | ---------------------------------------------------------------------------------------- | ------------------------------- | ----------- |
| Mère | Backlinks gratuits : ce qui ne sert à rien, ce qui marche vraiment                       | backlink gratuit                | Pilier      |
| 1    | Listes de « sites à backlinks gratuits » : on a testé, voici ce qu'il en reste           | liste backlinks gratuits        | Preuve      |
| 2    | Générateurs de backlinks : ce qu'ils créent vraiment                                     | générateur de backlinks         | Preuve      |
| 3    | Annuaires sans lien retour : lesquels valent encore l'inscription                        | annuaire sans lien retour       | Trafic      |
| 4    | Liens de profil, de commentaire, de forum : pourquoi Google les ignore                   | backlink de profil, web 2.0     | Éducation   |
| 5    | « 1 000 backlinks pour 5 € » : pourquoi Google les neutralise                            | backlinks pas cher              | Éducation   |
| 6    | Reconnaître un backlink de qualité en 6 questions                                        | backlinks de qualité            | Trafic      |
| 7    | Backlinks toxiques : faut-il vraiment les désavouer ?                                    | backlinks toxiques, disavow     | Trafic      |
| 8    | Dofollow ou nofollow : ce que vaut un lien gratuit en nofollow                           | backlink dofollow               | Éducation   |
| 9    | Vos 10 premiers backlinks gratuits quand le site est neuf                                | (non mesuré)                    | Conversion  |
| 10   | Référencement gratuit : ce qu'on peut faire sans payer, et ce qui coûte du temps         | référencement gratuit           | Trafic      |
| 11   | Outils SEO gratuits pour suivre ses liens                                                | outils seo gratuits             | Trafic      |

### La preuve à produire (ce qui rend le thème imprenable)

**Décision de Jonathan (22/11/2026) : aucun lien acheté, même pour un test.** La preuve vient de deux sources gratuites.

1. **Les sources publiques**, citées et datées dans chaque article (à relire au moment de rédiger) :
   - les règles anti-spam de Google, section « liens spam » : elles citent nommément l'achat de liens, les programmes qui créent des liens automatiquement, les annuaires et sites de favoris de faible qualité, les commentaires et signatures de forum avec liens optimisés ([developers.google.com/search/docs/essentials/spam-policies](https://developers.google.com/search/docs/essentials/spam-policies)) ;
   - la mise à jour « link spam » de décembre 2022, où Google annonce que SpamBrain repère les sites qui vendent des liens et ceux qui en achètent, et **neutralise** ces liens : ils ne comptent plus, ni en bien ni en mal ;
   - les déclarations répétées de Google selon lesquelles la plupart des liens de spam sont simplement ignorés, ce qui explique aussi pourquoi le désaveu est rarement utile (article 7).
2. **Nos propres observations gratuites** : ouvrir les pages que donnent les listes et les générateurs les mieux classés, et relever ce qu'on y trouve (pages mortes, liens en `nofollow`, pages non indexées dans Google, sites sans aucun visiteur). Aucune inscription ni achat n'est nécessaire pour cela ; on décrit ce qu'on voit, captures à l'appui.

Les articles 1, 2 et 5 reposent sur ces deux sources. Ce qu'on ne dit pas : un chiffre d'effet sur les positions, puisqu'on ne l'a pas mesuré.

### Lien avec le produit

- La page d'accueil vise l'intention « je veux un outil » ; la page mère vise l'intention « je veux comprendre ». Elles se lient l'une à l'autre et ne se concurrencent pas.
- Chaque article se termine par le même bloc : « Ce que nous faisons à la place », avec un exemple de vraie demande envoyée, et le champ de l'audit gratuit.
- Ton : jamais moqueur envers le lecteur qui a essayé ces méthodes. On explique, on montre les chiffres.
- Honnêteté : dire aussi ce qui marche parmi le gratuit facile (quelques annuaires sérieux, les fiches d'établissement, les profils utiles pour la marque) et que nos demandes, elles, coûtent du temps de réponse et n'aboutissent pas toutes.

### Effet sur le planning

Ce thème passe en tête : la page mère en semaine 1 (elle remplace le guide 1), puis deux articles du thème par semaine dans les semaines 2 à 6, en commençant par 6 (qualité), 5 (lots à 5 €), 1 (listes) et 7 (toxiques). Aucun ne dépend plus d'un test à attendre. Les autres sujets du planning glissent d'autant.

## 5. Architecture du contenu

```
/                        accueil
/audit-gratuit           page d'entrée de l'outil gratuit
/guides/                 6 guides piliers (2 500 à 4 000 mots)
/blog/                   articles (1 200 à 2 000 mots)
/glossaire/              1 page par terme (400 à 800 mots)
/comparatifs/            avis et alternatives
/outils/                 petits outils gratuits
/modeles/                modèles de messages à copier
```

Règle de liens internes : chaque article pointe vers son guide pilier, vers 2 à 3 pages du glossaire et vers l'audit gratuit. Chaque guide pilier liste tous ses articles.

**Les six guides piliers**

1. Obtenir des backlinks gratuits : la méthode complète
2. Monter une campagne de netlinking de A à Z
3. Acheter des liens : prix, risques et alternatives
4. Les liens cassés : la tactique qui rapporte le plus
5. Écrire une demande de lien qui reçoit une réponse
6. Mesurer un lien : DR, Trust Flow, ancres, nofollow

## 6. Plan consolidé et calendrier (révisé le 22/11/2026)

**Lecture de la difficulté (KD)** : « 0* » signifie que l'outil renvoie 0 faute de données suffisantes sur la requête, pas que la place est libre. « n.m. » = non mesuré (volume ou KD absent). Seul un KD supérieur à 0 est une vraie mesure.

### Nombre de contenus par thème

| Thème                                   | Articles | Recherches visées par mois (ordre de grandeur) |
| --------------------------------------- | -------- | ---------------------------------------------- |
| 1. Backlinks gratuits (thème phare)     | 12       | 1 400                                          |
| 2. La méthode pour obtenir des liens    | 11       | 2 000                                          |
| 3. Acheter des liens ou non             | 7        | 2 200                                          |
| 4. Avis et alternatives                 | 6        | 1 050                                          |
| 5. Demandes par email                   | 6        | 2 500                                          |
| 6. Liens et IA                          | 3        | 4 200                                          |
| 7. Par type de site                     | 5        | 2 100                                          |
| Étude chiffrée                          | 1        | (aimant à liens)                               |
| **Total articles**                      | **51**   |                                                |
| Glossaire (fiches courtes)              | 24       | 2 400                                          |
| **Total pages**                         | **75**   |                                                |

### Réserve de très longue traîne (recherche du 22/11/2026)

Seize recherches supplémentaires avec jokers (« backlink * », « * netlinking », « comment * backlinks », « trust flow * », etc.) : environ 1 700 mots-clés relevés, dont 416 en français et dans le sujet. Constat honnête : **le marché français du netlinking est étroit, la réserve mesurable est de quelques dizaines de sujets entre 10 et 170 recherches par mois**, pas de centaines.

**Réserve mesurée : 28 articles de plus**

| Sujet                                                        | Mots-clés (volume, KD)                                                                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Voir les backlinks d'un site (le sien ou un concurrent)      | analyse backlink 170 (0*), analyse backlinks 170 (25), backlinks d'un site 90 (34), trouver les backlinks d'un site 50 (26), connaître 40 (n.m.) |
| Analyse de backlinks gratuite : ce que montrent les outils   | analyse backlinks gratuit 110 (29)                                                                                       |
| Sites pour backlinks : où un lien a encore de la valeur      | site backlink 260 (17), backlink site 210 (17)                                                                           |
| Stratégie de backlinks pour un site neuf                     | stratégie backlinks 90 (8), stratégie backlink 70 (15), stratégie de backlink 20 (26)                                    |
| Créer des backlinks : ce que « créer » veut dire             | créer des backlinks 20 (1), comment créer des backlinks 20 (20), comment faire des backlinks 20 (10), création de backlinks 30 (26) |
| Obtenir des backlinks de qualité                             | obtenir des backlinks 40 (1), obtenir des backlinks de qualité 30 (9), comment obtenir des backlinks de qualité 10 (19)  |
| Exemples de backlinks commentés                              | backlink exemple 30 (15), netlinking exemple 10 (6)                                                                      |
| Netlinking et backlinking : la différence                    | netlinking et backlinking 20 (19)                                                                                        |
| Pack netlinking : ce qu'il y a dedans                        | pack netlinking 30 (1)                                                                                                   |
| Netlinking pas cher : ce qu'on obtient                       | netlinking pas cher 30 (33)                                                                                              |
| Prestation de netlinking : lire un devis                     | prestation netlinking 50 (14), prestation de netlinking 30 (14), devis netlinking 10 (n.m.)                              |
| Acheter des backlinks français                               | acheter backlinks francais 30 (18), achat de backlinks de qualité 40 (0*)                                                |
| Agence de netlinking à Paris, à Nantes                       | agence de netlinking 260 (0*), agence netlinking paris 30 (14), netlinking nantes 50 (0*)                                |
| Netlinking international, en Belgique, en Suisse             | netlinking international 30 (n.m.), belgique 10, suisse 10                                                               |
| Échange de backlinks : ce que Google accepte                 | échange de backlinks 30 (49), plateforme d'échange de liens 10 (n.m.)                                                    |
| Trust Flow gratuit : le connaître sans payer                 | trust flow gratuit 40 (0*), connaître le trust flow d'un site 10 (n.m.)                                                  |
| Trust Flow et Citation Flow                                  | trust flow citation flow 30 (30), trust flow et citation flow 20 (27)                                                    |
| Annuaires pour le référencement                              | annuaire pour référencement 70 (0*), annuaire gratuit référencement 40 (0*), annuaire de référencement 20 (0*)           |
| Liens follow et nofollow dans un profil de liens             | backlinks follow nofollow 50 (11), liens nofollow 50 (13)                                                                |
| Noindex et nofollow : ne pas confondre                       | noindex nofollow 40 (0*)                                                                                                 |
| Lien interne, lien externe, lien sortant                     | lien interne seo 10 (0*), lien externe seo 10 (27), lien sortant seo 10 (48)                                             |
| Nombre de backlinks : combien en faut-il                     | nombre de backlinks 20 (n.m.)                                                                                            |
| Netlinking interne (maillage)                                | netlinking interne 20 (0*)                                                                                               |
| Partenariat netlinking                                       | partenariat netlinking 10 (n.m.)                                                                                         |
| Freelance ou consultant netlinking                           | consultant netlinking 90 (0*), freelance netlinking 10 (n.m.)                                                            |
| Logiciel de backlinks                                        | logiciel backlink 30 (21), logiciel de backlink 10 (21)                                                                  |
| Netlinking automatique : ce qui s'automatise                 | netlinking automatique 10 (n.m.)                                                                                         |
| PBN et netlinking                                            | pbn netlinking 10 (n.m.), pbn seo 70 (0*)                                                                                |

**Réserve non mesurable par les outils (à tester, 5 articles pilotes par famille)**

Sous 10 recherches par mois, les outils n'affichent plus rien, alors que ces requêtes existent. Trois familles collent exactement au produit :

1. **« Obtenir un lien depuis… »** : une mairie, une université, la presse locale, un blog de niche, une association, Wikipédia, un office de tourisme, une chambre de commerce.
2. **« Netlinking pour… »** un métier : plombier, avocat, restaurant, photographe, coach, boutique de vêtements, gîte, auto-école.
3. **Les questions** : « pourquoi mes backlinks n'apparaissent pas », « combien de temps pour qu'un backlink soit pris en compte », « un lien nofollow sert-il à quelque chose », « que faire si un site demande de l'argent pour un lien ».

Méthode : publier 5 articles par famille, regarder dans la Search Console au bout de 4 semaines lesquels reçoivent des impressions, puis étendre seulement les familles qui en reçoivent. C'est la Search Console, pas l'outil de mots-clés, qui révélera la vraie longue traîne.

### Calendrier : deux pages par jour (décision de Jonathan, 22/11/2026)

51 articles + 28 de réserve mesurée + 15 pilotes + 24 fiches de glossaire = **118 pages, soit 59 jours (8 semaines et demie)** à deux pages par jour, 7 jours sur 7. Chaque jour : un article de fond et une page plus courte (fiche de glossaire, avis ou article de réserve).

| Semaines | Pages (14 par semaine)                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Thème backlinks gratuits en entier (12) + campagne de netlinking + acheter des backlinks                                                                |
| 2        | Méthode (10 restants) + comparatif des plateformes + Linkuma + trust flow + ancre de lien                                                               |
| 3        | Acheter ou non (5 restants) + avis et alternatives (5 restants) + nofollow, relinking, dr checker, disavow                                              |
| 4 et 5   | Réserve mesurée (28 articles), dans l'ordre du tableau                                                                                                  |
| 6        | 15 pilotes des trois familles non mesurables (bilan en semaine 9, après 4 semaines de Search Console)                                                   |
| 7        | Demandes par email (6) + liens et IA (3) + par type de site (5)                                                                                         |
| 8 et 9   | Étude chiffrée + 18 fiches de glossaire restantes ; puis extension des familles pilotes qui ont reçu des impressions                                    |

Mise en ligne : chaque contenu porte une date de publication ; le site ne l'affiche et ne l'ajoute au sitemap qu'à cette date. On peut donc préparer une semaine d'avance et laisser sortir deux pages par jour sans intervention.

## 7. Nos propres liens (on utilise le produit sur lui-même)

Sans liens, aucun de ces contenus ne montera. Le plan, avec backleenks :

1. **Liens cassés et pages ressources** : les listes « outils de netlinking » et « plateformes » qui tiennent la première page (Abondance, SE Ranking, web-konseil, referenseo, coo2boost, killianmouton, mister-wp, Journal du Net) sont des pages qui citent déjà des outils comme le nôtre. C'est exactement le cas qui a rapporté des liens à Jonathan.
2. **Annuaires de SaaS français** (saasradar.fr et équivalents) : inscription gratuite.
3. **L'étude chiffrée** de la semaine 11 : seule pièce conçue pour être citée. À proposer aux blogs SEO et aux lettres d'information du secteur.
4. **Le glossaire** : cible des demandes auprès des blogs d'indépendants qui expliquent ces notions.
5. **Publication des résultats** de cette campagne sur le site : c'est la preuve du produit (annexe 13 de CLAUDE.md).

Objectif : 20 domaines référents en 3 mois, 50 en 6 mois [HYPOTHÈSE].

## 8. Objectifs et suivi

| Échéance | Pages indexées | Impressions / mois | Clics / mois | Requêtes dans le top 20 |
| -------- | -------------- | ------------------ | ------------ | ----------------------- |
| 1 mois   | 15             | 500                | 10           | 5                       |
| 3 mois   | 50             | 5 000              | 100          | 30                      |
| 6 mois   | 80             | 20 000             | 500          | 80                      |
| 12 mois  | 120            | 60 000             | 2 000        | 150                     |

Tous ces chiffres sont des [HYPOTHÈSE] : un domaine neuf met en général 3 à 6 mois à se positionner, même avec de bons contenus.

Indicateur qui compte vraiment : audits gratuits lancés depuis un contenu, puis inscriptions.

Revue toutes les 4 semaines dans Search Console : requêtes entre la 5e et la 20e place, à renforcer en priorité (liens internes, complément de contenu, une demande de lien).

## 9. Risques

- **Contenu générique écrit à la chaîne** : il ne se positionnera pas. La preuve propre à chaque article n'est pas négociable.
- **Comparatifs** : toute affirmation sur un concurrent doit être vérifiable et datée.
- **Marché étroit** : même réussi, ce plan plafonne à quelques milliers de visites par mois. Le SEO sera un canal d'acquisition parmi d'autres, pas le seul.
- **Volumes de longue traîne** : en dessous de 50 recherches, les chiffres sont imprécis ; on juge sur la Search Console après publication.
