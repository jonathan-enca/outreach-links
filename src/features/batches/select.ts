export interface Candidate {
  draftId: string;
  position: number;
  channel: "email" | "formulaire";
  ready: boolean;
  status: string;
  sendable: boolean;
}

/**
 * Brouillons admissibles dans un lot : email, prêt (URL 200, linter vert), contact vérifié,
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
        c.channel === "email" &&
        c.ready &&
        c.status === "brouillon" &&
        c.sendable &&
        !inBatch.has(c.draftId),
    )
    .sort((a, b) => a.position - b.position)
    .slice(0, size);
}
