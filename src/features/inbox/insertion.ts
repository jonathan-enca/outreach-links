/** Réponse « prête à insérer » (CLAUDE.md 4.2) : tout ce qu'il faut pour que la cible n'ait qu'à coller. */
export interface Insertion {
  /** Page de la cible à modifier. */
  page_url: string;
  /** Texte du lien. */
  anchor: string;
  /** Adresse vers laquelle le lien pointe (déjà vérifiée en 200 au premier envoi). */
  link_url: string;
  /** Phrase à ajouter. */
  sentence_to_add: string;
  /** Rendu final du passage, avec la phrase insérée après le passage cité. */
  sentence_after: string;
}

export interface InsertionInput {
  pageUrl: string;
  anchor: string;
  linkUrl: string;
  /** Citation exacte de la page de la cible (le hook du premier message). */
  hook: string;
  /** Type de la cible du plan, pour la tournure. */
  targetType: string;
}

const LEAD: Record<string, string> = {
  lien_mort: "Ce lien étant devenu inaccessible, voici une page à jour sur le sujet :",
  annuaire: "À découvrir aussi :",
};

/** Construction déterministe (aucun appel de modèle, coût nul) : phrase courte, factuelle. */
export function buildInsertion(i: InsertionInput): Insertion {
  const lead = LEAD[i.targetType] ?? "Pour aller plus loin, voir";
  const sentence = `${lead} ${i.anchor}.`.replace(/\s+/g, " ").trim();
  const hook = i.hook.trim().replace(/\s+/g, " ");
  return {
    page_url: i.pageUrl,
    anchor: i.anchor,
    link_url: i.linkUrl,
    sentence_to_add: sentence,
    sentence_after: hook ? `${hook} ${sentence}` : sentence,
  };
}

/** Corps du message à la cible : l'insertion expliquée, avec l'URL exacte. */
export function buildInsertionMessage(
  ins: Insertion,
  signatureFirstName: string,
  greeting = "Bonjour",
): { subject: string; body: string } {
  return {
    subject: "Re : votre réponse",
    body: `${greeting},\n\nMerci beaucoup. Pour vous faire gagner du temps, voici le passage prêt à coller sur ${ins.page_url} :\n\n« ${ins.sentence_after} »\n\nLe mot « ${ins.anchor} » est à lier vers ${ins.link_url}.\n\nSi vous préférez une autre formulation ou un autre emplacement, dites-le-moi, je m'adapte.\n\nMerci encore,\n${signatureFirstName}`,
  };
}
