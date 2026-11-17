export interface Candidate {
  draftId: string;
  position: number;
  channel: "email" | "formulaire";
  ready: boolean;
  status: string;
  sendable: boolean;
}

/**
 * Brouillons admissibles dans un lot : email (contact vérifié) ou formulaire, prêt (URL 200, linter vert),
 * pas déjà dans un lot. Ordre du plan ; au plus `size`.
 */
export function pickEligible(
  candidates: readonly Candidate[],
  inBatch: ReadonlySet<string>,
  size: number,
): Candidate[] {
  return candidates
    .filter(
      (c) =>
        // Email : contact vérifié obligatoire. Formulaire : jamais envoyé, c'est une tâche manuelle
        // (message prêt à coller) qui apparaît une fois le lot validé.
        (c.channel === "formulaire" || c.sendable) &&
        c.ready &&
        c.status === "brouillon" &&
        !inBatch.has(c.draftId),
    )
    .sort((a, b) => a.position - b.position)
    .slice(0, size);
}
