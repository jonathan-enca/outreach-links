# Prompt maître n° 3 : deux fois plus de cibles à ressources égales, contacts, bas de liste

À copier tel quel dans une nouvelle session Claude Code. Rédigé le 17/11/2026 à la fin de la session du prompt maître n° 2 (voir `PROGRESS.md`, section « Session du 17/11 (nuit) : prompt maître n° 2 »), puis mis à jour après le retour de Jonathan : « bonne qualité ; comment en avoir le double avec les mêmes ressources ? ».

```
Tu travailles seul, sans m'interroger, pendant que je suis absent. Tout ce qui suit est VALIDÉ. Réponds-moi en français simple, à la fin seulement.

## 0. Lectures (sans tout relire)
CLAUDE.md ; PROGRESS.md : section « Session du 17/11 (nuit) : prompt maître n° 2 » en entier (mesures, décisions, dettes) ; docs/jalon-mu.md : sections 3, 4, 5 puis MU.8 et MU.10. Annonce en 3 lignes ce que tu fais et ne fais pas, puis travaille.

## 1. Autonomie (inchangée)
Mêmes règles que docs/master-prompt-2.md, section 1 : tu valides toi-même SQL, déploiements, variables, PR et fusions ; API de gestion Supabase si l'outil MCP demande une confirmation ; aucun email d'outreach réel ; aucune donnée de vrais clients supprimée ; pas de force-push ; budget des runs réels 3,00 USD pour la session, sur les sites de test seulement, journalisé dans PROGRESS.md. Captures connectées bureau 1440 et mobile 390 pour tout écran modifié. Le compte de test garde une analyse terminée de mega-coloring.com France (audit f530ee83…, 72 cibles, 228 sites en réserve) : sers-t'en pour mesurer avant de relancer une recherche payante.

## 2. Objectif principal : deux fois plus de cibles pour le même coût et la même attente
Retour de Jonathan (17/11) : la qualité est bonne, il en veut le double. Aujourd'hui : 54 cibles pour environ 0,92 USD et 12 minutes (0,017 USD par cible). Cible de la session : **environ 110 cibles pour 1 USD au plus, la première liste toujours affichée en 12 minutes environ**, sans assouplir aucune règle de tri.

Ce que les mesures du 17/11 disent (audit f530ee83…) :
- **La recherche trouve déjà assez de sites** : 677 trouvés, 400 lus, 228 jamais lus (162 venus du contenu, 66 des recherches Google). Le frein est la lecture et le jugement, pas la recherche.
- **Lire la réserve coûte 3 fois moins cher par cible** : un lot « Lire d'autres sites » = 80 pages lues, 53 jugées, 18 cibles, 0,09 USD, 90 secondes (0,005 USD par cible).
- **0,11 USD par analyse ne rapporte aucune cible** : liens morts des concurrents (0,075 USD, 0 cible sur trois runs) et mentions de marque (0,033 USD, 0 cible). Le recoupement : 0,03 à 0,04 USD pour 0 à 2 cibles.
- **Le jugement** : 4 800 jetons d'entrée et 660 de sortie par appel de 5 cibles ; l'entrée (les extraits de page) fait 59 % du coût. Raccourcir la sortie ou juger en deux passes ne rapporte presque rien.
- **Sur 213 pages jugées, 60 sont des concurrents et 61 hors sujet.** 16 des 60 concurrents ont un mot du thème dans leur nom de domaine (2 des 72 cibles seulement) : gain possible, mais petit (8 % du jugement).
- **Pertes gratuites à récupérer** : 14 cibles pertinentes sans contact trouvé ; 48 sites écartés à la lecture pour « éditeur introuvable » sans avoir été jugés ; 43 sites dont le robots.txt ne répond pas, lus pour rien.

Chantiers, dans cet ordre (mesure avant et après chacun, sur l'audit du compte de test) :

### A. La réserve se lit toute seule, en arrière-plan
Après l'affichage de la première liste (inchangée : 150 pages jugées), l'analyse continue seule par lots, comme « Lire d'autres sites », jusqu'à l'un de ces arrêts : réserve épuisée, budget total de jugement de l'analyse, deux lots de suite avec moins de 5 cibles. L'écran des cibles montre que la lecture continue et se met à jour seul ; l'email de fin part quand tout est fini. Le bouton reste pour relancer à la main. Les nouvelles cibles reçoivent aussi l'étape « liens morts » (aujourd'hui elles ne l'ont pas).

### B. Payer moins cher le jugement de l'arrière-plan
[À VÉRIFIER dans la documentation Anthropic avant de coder] : l'API par lots (Message Batches) facture moins cher des appels qui n'ont pas besoin d'une réponse immédiate. Si c'est confirmé et que le délai réel tient en quelques minutes, utilise-la pour les lots d'arrière-plan seulement (jamais pour la première liste). Mesure le délai réel sur un lot ; si le délai dépasse 15 minutes, garde les appels directs et dis-le.

### C. Ne plus payer ce qui ne rapporte rien, sans retirer une tactique promise
Liens morts des concurrents et mentions de marque : ne lance ces appels que quand ils ont une chance (concurrent de la même langue et pas un géant ; nom de marque non générique), et déplace le budget économisé vers le jugement. La tactique reste affichée, avec son résultat honnête quand elle n'a rien trouvé. Les liens morts PROUVÉS sur les pages des cibles (4 au dernier run) viennent d'une autre étape : n'y touche pas.

### D. Les pertes gratuites
1. MU.8, contacts (docs/jalon-mu.md) : lire plus de pages (contact, mentions légales, à propos), adresses déguisées, formulaires mieux reconnus ; les cibles sans contact restent visibles dans un onglet à part. Objectif : moins de 5 cibles pertinentes perdues sur 64.
2. « Éditeur introuvable » : avant d'écarter, lire l'accueil du site quand la page lue ne montre ni contact ni mentions ni auteur. Mesure combien des 48 sont récupérés et combien deviennent des cibles.
3. Robots.txt sans réponse : ces sites passent en fin de file au lieu d'occuper une place de lecture (ils ne sont toujours pas écartés).
4. Concurrents reconnaissables à leur nom de domaine (un mot du thème dans le nom) : en fin de file, jamais écartés. Les mots viennent du profil du site, rien en dur.

### E. Garde-fou de qualité (obligatoire, en même temps que le volume)
Les cibles ajoutées viennent du bas de la réserve : la qualité doit être contrôlée, pas supposée.
1. Liste des cibles que Claude a jugées faibles le 17/11 (16 sur 72, voir la conversation et le compte de test) : creavea.com, amedenfant.fr, devenirparent.net, hello-merlin.com, paperblog.fr, bambintroc.fr, dessinpassion.com, journaux.fr, lepointdufle.net, maniaclic.blog4ever.com ; limites : editions-retz.com, flashmode.tn, kidscare.lu, wikicampers.fr, papadejojo.fr, bayard-jeunesse.com. **Seul l'avis de Jonathan fait foi** : s'il a répondu dans PROGRESS.md ou docs/eval-qualite-recherche.md, ajoute ses verdicts au jeu annoté ; sinon ajoute ces cas comme « à confirmer » et ne change aucune règle de tri sur leur seule base.
2. Constat : la moitié des cibles faibles ont été jugées sur leur page d'accueil, pas sur une page qui parle du sujet ; le seuil d'adéquation n'est pas le bon levier (3 des 10 seulement sont à 0,5). Piste à mesurer sur le jeu annoté : une page d'accueil sans rapport visible avec le thème pèse moins dans le score.
3. Soupçon à vérifier par une lecture réelle : cinq sites dont le nom de domaine n'a aucun rapport avec leur contenu (nantes-artifice.fr au rang 4, creativa-grenoble.com, laruellebleue.com, famille-heureuse.fr, trucetastuce.net) ressemblent à des noms de domaine rachetés pour vendre des liens. Ouvre-les (lecture polie, robots.txt respecté), cherche les signes (articles sponsorisés, mentions de tarifs, thèmes sans rapport entre eux). Si c'est confirmé : cas ajoutés au jeu annoté, règle de détection mesurée avant / après. Si ce n'est pas confirmé : dis-le et n'ajoute aucune règle.
4. Tableau de fin : cibles 1 à 30 / 31 à 60 / 61 et plus, part jugée bonne, avant et après.

### F. Run réel de contrôle
Quand A à E sont en production (vérifie Inngest) : une analyse complète de mega-coloring.com France sur le compte de test, par l'interface. Note : nombre de cibles à l'affichage de la première liste et à la fin de l'arrière-plan, durée de chacune, coût total, coût par cible, répartition par type, qualité par tranche. Critère : au moins 100 cibles pour 1 USD au plus, première liste en 13 minutes au plus. Si ce n'est pas atteint : explique lequel des chantiers n'a pas rapporté, avec la mesure, sans remplir artificiellement.

## 3. Ensuite, si le temps le permet
1. **Email de fin d'analyse** : la clé RESEND_API_KEY posée sur Vercel est invalide (« Resend 401 validation_error »). Si une clé valide a été posée : constate un envoi (événement analysis.email_sent, puis Resend list-emails). Sinon : retire de l'écran d'analyse la phrase « vous recevrez un email dès que c'est prêt » tant que l'envoi ne marche pas, et dis-le en une phrase à la fin.
2. **MU.10**, écran « Vos cibles » version résultat : Garder / Écarter avec motif, lien « Voir les sites écartés et pourquoi » ; la barre fixe ne doit plus recouvrir les onglets ni les cartes.
3. **12 types d'éditeurs × 4 requêtes = 48 recherches**, le budget en couvre 40 : applique-le seulement si le coût total reste sous 1 USD après les chantiers ci-dessus.
4. MU.5, MU.9, MU.7 (a, b, d), MU.11 : voir docs/jalon-mu.md.

## 4. Points de vigilance mesurés (ne pas refaire les mêmes erreurs)
- Ne relève PAS le seuil d'adéquation (0,5) : essayé le 17/11, le jeu annoté passe de 0,94 à 0,59 de rappel.
- Pas d'opérateur de recherche (intitle:, inurl:) : facturé 5 fois plus cher par le fournisseur.
- Le robots.txt qui ne répond pas vite ne doit jamais écarter un site.
- Un champ trop long renvoyé par le modèle se raccourcit, il ne fait jamais rejeter toute la réponse (le jugement des cibles a encore des longueurs maximales : rends-le tolérant).
- Toute écriture qui remplace des lignes se fait sans suppression préalable, et se teste sur une vraie base (la base simulée des tests ne connaît pas les contraintes : c'est ce qui a laissé passer la panne de « Lire d'autres sites »).
- Rejoue le jeu annoté (précision et rappel) avant et après toute modification d'une règle de tri.
- Deux analyses du même site ne trouvent pas les mêmes cibles (73 sites différents sur deux runs, 21 en commun) : ne compare jamais deux runs cible par cible pour juger d'une règle ; mesure sur les mêmes candidats.

## 5. Fin de session
PROGRESS.md à jour (mesures avant / après de chaque chantier, coût par cible, décisions, dettes, coûts), tests, lint, typecheck et format verts, PR fusionnées dans main, production déployée, Inngest à jour. Puis dis-moi en langage simple : ce qui marche, ce qui ne marche pas, les chiffres, et le prompt de la session suivante.
```
