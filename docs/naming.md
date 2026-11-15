# MN.1 : nom et domaine (15/11/2026)

Aucun achat n'a été fait. Cette note sert à choisir ; l'achat (dépense nouvelle) attend l'accord de Jonathan.

## Méthode et limites

- Disponibilité des domaines : RDAP officiel (`rdap.nic.fr` pour `.fr`, Verisign pour `.com` et `.net`, Identity Digital pour `.io`, PIR pour `.org`) : une réponse 404 = nom non enregistré. Prix `.com` et `.io` : API du registrar Vercel (le `.fr` n'y est pas supporté, prix à voir chez un registrar français, ~7 à 10 € l'an en général [HYPOTHÈSE]).
- Marques et noms existants : **recherche web seulement** (une recherche exacte par nom). L'INPI (`data.inpi.fr`) répond 403 depuis l'environnement et EUIPO / WIPO n'ont pas été interrogés : **aucune recherche d'antériorité officielle n'a été faite**. Elle reste à faire par Jonathan ou un conseil en propriété industrielle (classes 9, 35 et 42) avant dépôt ou investissement lourd.
- Les noms les plus évidents (Pontis, Sillage, Cordée, Ricochet, Liane, Passerelle, Nodal, Cairn…) ont `.fr` et `.com` déjà pris : écartés.
- Critères : français, court, prononçable, sans « backlink » ni « IA ».

## 14 noms testés

| Nom       | Idée                                                | .fr   | .com     | .io                 | Remarque                                             |
| --------- | --------------------------------------------------- | ----- | -------- | ------------------- | ---------------------------------------------------- |
| Lienvue   | « lien » + « vue » : voir ses liens (audit d'abord) | libre | libre    | libre               | `.net` et `.org` aussi libres ; aucun usage trouvé   |
| Cordelien | « cordée » + « lien » : s'encorder entre sites      | libre | libre    | libre               | un peu long ; évoque aussi les Cordeliers (histoire) |
| Nouelo    | « nouer » (un lien) + finale douce                  | libre | libre    | libre               | inventé, très court ; aucun sens direct              |
| Lienaly   | « lien » + « analyse »                              | libre | libre    | libre               | proche de Lienz (ville) à l'oral écrit               |
| Lienvif   | « lien » + « vif » (vivant)                         | libre | libre    | libre               | peu parlant                                          |
| Liensage  | « lien » + « sage »                                 | libre | libre    | libre               | plutôt ludique                                       |
| Passelien | « passe-lien », passeur                             | libre | libre    | ? (limite d'appels) | jeu de mots, lisible                                 |
| Pontelien | « pont » + « lien »                                 | libre | libre    | ?                   | redondant                                            |
| Tramelo   | « trame » (tisser)                                  | libre | libre    | ?                   | proche de Tramelan (commune suisse)                  |
| Ponteva   | « pont »                                            | libre | **pris** | libre               | `.com` pris : écarté                                 |
| Pontelo   | « pont »                                            | libre | **pris** | ?                   | `.com` pris : écarté                                 |
| Citelo    | « citer »                                           | libre | **pris** | pris                | écarté                                               |
| Sillago   | « sillage »                                         | libre | **pris** | libre               | écarté                                               |
| Mentova   | « mention »                                         | libre | **pris** | pris                | écarté                                               |

« ? » = réponse 429 du serveur RDAP `.io` (limite d'appels), non retestée ; `.io` n'est de toute façon pas nécessaire.

## Shortlist de 3

| Rang | Nom           | Domaines libres                      | Prix `.com` / `.io` (1re année, Vercel)         | Atouts                                                                                                                                                                                       | Risques                                                                                                |
| ---- | ------------- | ------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1    | **Lienvue**   | `.fr`, `.com`, `.io`, `.net`, `.org` | 12,03 $ / 14,99 $ (renouvellement `.io` : 46 $) | Dit le produit en deux syllabes (« voir ses liens », donc l'audit d'abord), prononçable, pas de « backlink » ni « IA », tous les domaines utiles libres, aucun usage trouvé en recherche web | Racine « lien » commune aux outils de netlinking (confusion possible, pas de marque identique trouvée) |
| 2    | **Nouelo**    | `.fr`, `.com`, `.io`, `.net`, `.org` | 12,03 $ / 14,99 $                               | Nom inventé donc très distinctif et facile à déposer, court, doux, aucun résultat web                                                                                                        | Ne dit rien du produit (il faut l'expliquer), « nouel- » proche de « Noël / nouvel » à l'oral          |
| 3    | **Cordelien** | `.fr`, `.com`, `.io`                 | 12,03 $ / 14,99 $                               | Image de la cordée (entraide, solidité), français, mémorable                                                                                                                                 | 3 syllabes + « lien » : plus long ; référence historique (Cordeliers) sans effet de marque identifié   |

**Recommandation : Lienvue**, avec `lienvue.fr` (cible française d'abord) et `lienvue.com` (protection, redirection). Coût estimé : ~12 $ pour le `.com` (Vercel) + un `.fr` (~7 à 10 € [HYPOTHÈSE]). Le `.io` est inutile au départ (renouvellement à 46 $).

## À décider par Jonathan, puis étapes suivantes (non faites)

1. Choisir le nom parmi les 3 (ou en demander d'autres).
2. Faire vérifier l'antériorité à l'INPI et à l'EUIPO (classes 9, 35, 42) avant achat si l'on veut déposer la marque.
3. Valider la dépense (`.com` ~12 $, `.fr` chez un registrar français), puis : achat, branchement Vercel, `NEXT_PUBLIC_APP_URL`, URL de redirection Supabase Auth, domaine d'envoi Resend (SPF/DKIM/DMARC), renommage du dépôt et des textes.

## Décision du 15/11/2026 : nom de travail « Autolink.ai »

- **Jonathan** : le nom et le domaine définitifs seront trouvés plus tard ; pour avancer, le produit s'appelle provisoirement **« Autolink.ai »** (MN.2, home, textes).
- **Aucun achat.** `autolink.ai` est déjà enregistré par un tiers (outil de maillage interne SEO, surtout Webflow, société allemande) : le nom ne peut être ni acheté ni déposé tel quel, et la confusion de marque est un risque réel. `getautolink.ai` est libre (160 $ pour 2 ans), `getautolink.io` libre (14,99 $ puis 46 $), `getautolink.fr` libre, `getautolink.com` pris. Rien n'est acheté.
- **Conséquence pour le code et les textes** : le nom doit rester **un seul réglage** (constante / message dans `messages/fr.ts`), jamais écrit en dur, pour pouvoir le changer sans refonte. Pas de logo définitif, pas d'achat de domaine, pas de dépôt de marque, pas de branchement Vercel / Resend / Supabase sur un domaine d'ici là : l'URL reste `https://outreach-links.vercel.app`.
- **Brief de nom pour plus tard** (précisé le 15/11) : mélange lien / netlinking / IA / automatique, qui se prononce et s'écrit pareil dans toutes les langues (donc « link » plutôt que « lien », sans accent). Pistes testées avec `.fr` et `.com` libres : Linknaut (recommandé), Linkomia, Linkomatia, Netlinkia, Linkautomat. L'antériorité INPI / EUIPO reste à vérifier avant tout dépôt.
