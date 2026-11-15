import { promises as dns } from "node:dns";
import type { Verification } from "./types";

/** Candidat renvoyé par un finder d'emails (recherche par domaine). */
export interface FoundEmail {
  email: string;
  /** 0 à 100, tel que donné par le fournisseur. */
  confidence: number;
}

/**
 * Fournisseur payant de recherche et de vérification d'emails, derrière une interface.
 * Absent (null) sans clé : l'enquêteur ne trouve alors que les emails visibles, qui restent
 * « à vérifier » donc jamais envoyables.
 */
export interface EmailProvider {
  name: string;
  /** Emails connus du domaine (1 appel payant). */
  findByDomain(domain: string): Promise<FoundEmail[]>;
  /** Vérifie la délivrabilité d'une adresse (1 appel payant). */
  verify(email: string): Promise<Verification>;
}

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

/** Correspondance des statuts Hunter vers nos statuts ; tout ce qui est douteux n'est PAS valide. */
export function mapHunterStatus(status: string | undefined): Verification {
  switch (status) {
    case "valid":
      return "valide";
    case "invalid":
    case "disposable":
      return "invalide";
    case "accept_all":
    case "webmail":
      return "risque";
    case "unknown":
      return "inconnu";
    default:
      return "inconnu";
  }
}

/** Adaptateur Hunter (domain-search et email-verifier). `r.hunter.io` n'est jamais appelé sans clé. */
export function createHunterProvider(apiKey: string, fetchImpl: FetchLike = fetch): EmailProvider {
  const base = "https://api.hunter.io/v2";
  async function getJson(path: string, params: Record<string, string>): Promise<unknown> {
    const qs = new URLSearchParams({ ...params, api_key: apiKey });
    const res = await fetchImpl(`${base}${path}?${qs.toString()}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Hunter ${path} : HTTP ${res.status}`);
    return res.json();
  }
  return {
    name: "hunter",
    async findByDomain(domain) {
      const json = (await getJson("/domain-search", { domain, limit: "5" })) as {
        data?: { emails?: { value?: string; confidence?: number }[] };
      };
      return (json.data?.emails ?? [])
        .filter((e): e is { value: string; confidence: number } => typeof e.value === "string")
        .map((e) => ({ email: e.value.toLowerCase(), confidence: Number(e.confidence ?? 0) }));
    },
    async verify(email) {
      const json = (await getJson("/email-verifier", { email })) as {
        data?: { status?: string };
      };
      return mapHunterStatus(json.data?.status);
    },
  };
}

export interface ProviderEnv {
  EMAIL_FINDER_PROVIDER?: string;
  EMAIL_FINDER_API_KEY?: string;
}

/** Fournisseur configuré, ou null (finder désactivé sans clé). */
export function createProviderFromEnv(
  e: ProviderEnv,
  fetchImpl: FetchLike = fetch,
): EmailProvider | null {
  if (!e.EMAIL_FINDER_API_KEY) return null;
  if ((e.EMAIL_FINDER_PROVIDER ?? "hunter") === "hunter") {
    return createHunterProvider(e.EMAIL_FINDER_API_KEY, fetchImpl);
  }
  return null;
}

/** Vérificateur gratuit : sans appel payant. */
export interface FreeVerifier {
  name: string;
  verify(email: string): Promise<Verification>;
}

/** Domaines jetables courants : jamais un contact éditorial. */
const DISPOSABLE = new Set([
  "mailinator.com",
  "yopmail.com",
  "yopmail.fr",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "trashmail.com",
  "sharklasers.com",
]);

type MxResolver = (domain: string) => Promise<{ exchange: string }[]>;

/**
 * Vérification DNS gratuite : le domaine doit exister, ne pas être jetable et publier au moins
 * un serveur de messagerie réel (MX ; le « null MX » `.` signifie « aucun mail »). Elle ne prouve
 * PAS que la boîte existe : on ne l'applique qu'à un email que le site publie lui-même sur son
 * propre domaine, et les rebonds (M4) restent le filet de sécurité.
 */
export function createMxVerifier(resolveMx: MxResolver = (d) => dns.resolveMx(d)): FreeVerifier {
  return {
    name: "mx",
    async verify(email) {
      const domain = email.split("@")[1]?.toLowerCase();
      if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return "invalide";
      if (DISPOSABLE.has(domain)) return "invalide";
      try {
        const records = await resolveMx(domain);
        const real = records.filter((r) => r.exchange && r.exchange !== ".");
        return real.length > 0 ? "valide" : "invalide";
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === "ENOTFOUND" || code === "ENODATA") return "invalide";
        return "inconnu"; // panne DNS, délai : jamais « valide » par défaut
      }
    },
  };
}
