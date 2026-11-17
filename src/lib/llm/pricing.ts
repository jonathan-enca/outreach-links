/**
 * Grille de prix des modèles (USD par million de jetons) [HYPOTHÈSE : grille publique au
 * moment de l'écriture]. Le coût est calculé à partir des jetons RÉELS renvoyés par
 * l'API ; l'estimation avant appel sert au plafond. Modèle inconnu : tarif prudent.
 */
export interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
  "claude-sonnet-4-5": { inputPerMTok: 3, outputPerMTok: 15 },
  "gpt-4o-mini": { inputPerMTok: 0.15, outputPerMTok: 0.6 },
  "gpt-5-mini": { inputPerMTok: 0.25, outputPerMTok: 2 },
};

/** Tarif appliqué à un modèle absent de la grille (volontairement élevé). */
export const FALLBACK_PRICE: ModelPrice = { inputPerMTok: 5, outputPerMTok: 25 };

export function priceFor(model: string): ModelPrice {
  const exact = MODEL_PRICES[model];
  if (exact) return exact;
  // Modèles datés (gpt-4o-mini-2024-07-18) : plus long préfixe connu.
  const prefix = Object.keys(MODEL_PRICES)
    .filter((k) => model.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? MODEL_PRICES[prefix]! : FALLBACK_PRICE;
}

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceFor(model);
  return r6((inputTokens * p.inputPerMTok + outputTokens * p.outputPerMTok) / 1e6);
}

/** Estimation grossière avant l'appel : ~4 caractères par jeton en entrée, sortie au maximum. */
export function estimateCostUsd(model: string, promptChars: number, maxOutputTokens: number) {
  return costUsd(model, Math.ceil(promptChars / 4), maxOutputTokens);
}

/**
 * API par lots d'Anthropic (Message Batches) : 50 % du tarif standard, entrée et sortie, vérifié dans
 * la documentation Anthropic le 18/11/2026 (« All usage is charged at 50 percent of the standard API
 * prices »). Délai annoncé : « most batches completing within 1 hour », jamais plus de 24 h.
 */
export const BATCH_DISCOUNT = 0.5;

/** Coût d'une requête passée par l'API par lots (USD). */
export function batchCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  return r6(costUsd(model, inputTokens, outputTokens) * BATCH_DISCOUNT);
}
