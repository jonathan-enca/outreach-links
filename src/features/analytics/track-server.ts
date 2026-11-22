import { track } from "@vercel/analytics/server";
import type { AnalyticsEventName, AnalyticsEvents } from "./events";

/** Envoie un événement depuis le serveur. Ne casse jamais l'action appelante. */
export async function trackServer<N extends AnalyticsEventName>(
  name: N,
  ...props: AnalyticsEvents[N] extends Record<string, never> ? [] : [AnalyticsEvents[N]]
): Promise<void> {
  try {
    await track(name, props[0] as Record<string, string> | undefined);
  } catch {
    // Mesure seulement : une panne d'Analytics ne doit jamais bloquer l'utilisateur.
  }
}
