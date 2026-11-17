/**
 * Texte toujours bien formé avant d'entrer dans l'état d'un step Inngest. Un extrait de page coupé au
 * milieu d'un émoji laisse une demi-paire UTF-16 ; Inngest refuse alors l'état du step (« Missing
 * surrogate ») et toute l'analyse échoue (run réel du 17/11/2026, après 320 pages lues).
 */

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Remplace toute demi-paire isolée par le caractère de remplacement. */
export function wellFormed(s: string): string {
  const native = (s as { toWellFormed?: () => string }).toWellFormed;
  return typeof native === "function" ? native.call(s) : s.replace(LONE_SURROGATE, "�");
}

/** Même garantie pour toutes les chaînes d'une valeur sérialisable (objets, tableaux, clés comprises). */
export function deepWellFormed<T>(value: T): T {
  if (typeof value === "string") return wellFormed(value) as T;
  if (Array.isArray(value)) return value.map((v) => deepWellFormed(v)) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[wellFormed(k)] = deepWellFormed(v);
    return out as T;
  }
  return value;
}

/** Enveloppe un `step.run` : le résultat du step est rendu bien formé avant d'être mémorisé. */
export function safeStep(
  run: (id: string, fn: () => Promise<unknown>) => Promise<unknown>,
): <T>(id: string, fn: () => Promise<T>) => Promise<T> {
  return <T>(id: string, fn: () => Promise<T>) =>
    run(id, async () => deepWellFormed(await fn())) as Promise<T>;
}
