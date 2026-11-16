/**
 * MU.1 : exécution en parallèle bornée, sans jamais frapper deux fois le même hôte en même temps.
 * Sert à lire des pages de sites DIFFÉRENTS de front (le délai par hôte et le robots.txt restent ceux
 * du lecteur sûr) : c'est ce qui ramène une analyse de vingt minutes à quelques minutes.
 */

/**
 * Clé de file d'un hôte : les deux dernières étiquettes (`blog.exemple.fr` et `www.exemple.fr`
 * partagent la file `exemple.fr`, comme deux blogs d'une même plateforme). Volontairement large : au
 * pire deux sites voisins sont lus l'un après l'autre, jamais l'inverse.
 */
export function hostLane(hostOrUrl: string): string {
  let host = hostOrUrl.trim().toLowerCase();
  if (host.includes("/")) {
    try {
      host = new URL(host.includes("://") ? host : `https://${host}`).hostname;
    } catch {
      host = host.split("/")[0] ?? host;
    }
  }
  const labels = host.replace(/\.$/, "").split(".").filter(Boolean);
  return labels.length <= 2 ? labels.join(".") : labels.slice(-2).join(".");
}

export interface ByHostOptions {
  /** Files (hôtes) traitées de front. */
  concurrency: number;
  /** Attente entre deux éléments d'une même file (politesse par hôte). */
  sameHostDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Applique `fn` à chaque élément. Les éléments d'un même hôte passent l'un après l'autre (avec
 * `sameHostDelayMs` entre eux) ; au plus `concurrency` hôtes sont traités en même temps. Les résultats
 * gardent l'ordre des éléments. Si `fn` lève, l'erreur remonte une fois les lectures en cours finies.
 */
export async function mapByHost<T, R>(
  items: readonly T[],
  hostOf: (item: T) => string,
  fn: (item: T, index: number) => Promise<R>,
  opts: ByHostOptions,
): Promise<R[]> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const lanes = new Map<string, number[]>();
  items.forEach((item, i) => {
    const lane = hostLane(hostOf(item));
    const list = lanes.get(lane);
    if (list) list.push(i);
    else lanes.set(lane, [i]);
  });
  const queue = [...lanes.values()];
  const results = new Array<R>(items.length);
  let failure: { error: unknown } | null = null;

  const worker = async () => {
    for (;;) {
      const lane = queue.shift();
      if (!lane || failure) return;
      for (const [n, i] of lane.entries()) {
        if (failure) return;
        if (n > 0 && opts.sameHostDelayMs) await sleep(opts.sameHostDelayMs);
        try {
          results[i] = await fn(items[i]!, i);
        } catch (error) {
          failure ??= { error };
          return;
        }
      }
    }
  };
  const width = Math.max(1, Math.min(Math.floor(opts.concurrency) || 1, queue.length));
  await Promise.all(Array.from({ length: width }, worker));
  if (failure) throw (failure as { error: unknown }).error;
  return results;
}
