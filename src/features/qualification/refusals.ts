/**
 * Les cinq refus de la décision de Jonathan du 18/11/2026 (« ne pas s'autocensurer »), définis UNE fois
 * pour la qualification (`llm.ts`) et le rédacteur (`drafting/write.ts`). Contacter pour rien coûte
 * presque rien ; ne pas contacter à tort fait perdre un lien : tout le reste est gardé, avec une note.
 * Aucun mot ni exemple propre à un thème.
 */
export const FIVE_REFUSALS = `- le site de la cible propose lui-même la même chose que l'expéditeur : un concurrent direct ne recommandera pas son site. C'est aussi le cas d'une boutique ou d'un prestataire qui vend aux mêmes lecteurs des produits ou des services du même genre : une fiche produit, une page de catalogue ou un article d'un commerce du même secteur est un concurrent, pas un éditeur ;
- c'est un document juridique (mentions légales, CGU, CGV, politique de confidentialité) : on ne le fait pas modifier par un inconnu ;
- c'est un site d'articles écrits pour vendre des liens ou pour le référencement, manifestement : sujets sans rapport entre eux sur le même site, auteur anonyme (« admin », « la rédaction »), liens vers des commerces sans rapport. Signe décisif : le nom de domaine, le titre ou l'activité du site (un commerce, un artisan, une marque, un secteur) n'ont aucun rapport avec le sujet de l'article ; un site d'un tout autre secteur qui publie un article sur le thème de l'expéditeur est une ferme à liens, même si l'article est bien écrit ;
- c'est un très gros site (grand média, opérateur, grande enseigne, administration nationale) ou une dépêche d'agence figée : personne n'y modifiera une page pour un inconnu ;
- la page n'a aucun rapport avec le sujet du site de l'expéditeur : ni le thème ni le public ne se recoupent.`;

/** Ce qui n'est PAS un refus : un signal, noté pour la personne qui relira le message. */
export const SIGNALS = `la page ne cite qu'un seul lien (« lien unique »), le texte du lien existant paraît optimisé pour le référencement (« ancre optimisée »), la page ressemble à un article sponsorisé, un billet ancien, une page d'accueil, une rubrique ou une page commerciale qui garde un angle de ressources, un partenaire commercial`;

/** La règle de proximité : tout ce qui n'est pas un des cinq refus est gardé. */
export const keepNear = (verb: "rédigée" | "gardée") =>
  `Contacter pour rien coûte presque rien ; ne pas contacter à tort fait perdre un lien. Une cible proche du contenu visé (même thème, même public, ressources voisines) est TOUJOURS ${verb} : propose la page du catalogue la plus proche, même imparfaite, et dis honnêtement en quoi elle peut servir ses lecteurs. « Le catalogue n'a pas la page exacte » n'est JAMAIS un motif de refus.`;
