import { z } from "zod";

/**
 * Validation des variables d'environnement.
 * Toute variable manquante ou invalide fait échouer le démarrage / le build
 * avec un message explicite : rien ne passe silencieusement.
 * Chaque sous-jalon ajoute ici ses propres variables (jamais ailleurs).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url({ message: "doit être une URL absolue" }),
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "doit être une URL absolue" }),
  /** Clé publique (anon / publishable) : protégée par la RLS, jamais la clé service_role. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "ne doit pas être vide"),
  /**
   * Variables SECRÈTES ou externes : optionnelles (le build ne doit jamais casser) ;
   * l'erreur claire est levée à l'usage (voir requireEnv).
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  /** "1" en local pour parler au dev server Inngest (npx inngest-cli dev). */
  INNGEST_DEV: z.string().optional(),
  /** DataForSEO (optionnels : erreur claire à l'usage). */
  DATAFORSEO_LOGIN: z.string().min(1).optional(),
  DATAFORSEO_PASSWORD: z.string().min(1).optional(),
  /**
   * "true" : n'envoie aucun identifiant, un proxy injecte l'authentification
   * (environnement de développement agent). Jamais en production.
   */
  DATAFORSEO_PROXY_AUTH: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /** LLM (optionnels : erreur claire à l'usage). Anthropic est la cible ; OpenAI sert au développement. */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  /** Force le fournisseur ; sinon Anthropic si sa clé existe, sinon OpenAI. */
  LLM_PROVIDER: z.enum(["anthropic", "openai"]).optional(),
  /** Remplace le modèle par défaut du fournisseur choisi. */
  LLM_MODEL: z.string().min(1).optional(),
  /**
   * "true" : n'envoie aucune clé OpenAI, un proxy injecte l'authentification
   * (environnement de développement agent). Jamais en production.
   */
  LLM_PROXY_AUTH: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /**
   * Audit gratuit public (M1.6). Valeurs par défaut sûres : non requises.
   * PUBLIC_AUDIT_ENABLED=false = interrupteur manuel ; PUBLIC_AUDIT_DAILY_CAP_USD = coupe-circuit
   * de dépense (DataForSEO + LLM) par jour UTC pour l'ensemble des audits gratuits.
   */
  PUBLIC_AUDIT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  PUBLIC_AUDIT_DAILY_CAP_USD: z.coerce.number().positive().max(1000).default(3),
  /** Sel du hachage des IP (anti-abus). À défaut, dérivé de SUPABASE_SERVICE_ROLE_KEY. */
  ABUSE_HASH_SALT: z.string().min(16).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  /**
   * Second garde d'envoi réel (avec EMAIL_DRY_RUN). Faux par défaut partout :
   * aucun email réel ne part tant que cette variable n'est pas "true".
   */
  OUTREACH_SENDING_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /** Aucun envoi d'email réel hors production, sauf décision explicite. */
  EMAIL_DRY_RUN: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type Env = Omit<z.infer<typeof schema>, "EMAIL_DRY_RUN"> & {
  EMAIL_DRY_RUN: boolean;
};

export class EnvError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Variables d'environnement invalides :\n- ${issues.join("\n- ")}`);
    this.name = "EnvError";
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new EnvError(
      result.error.issues.map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`),
    );
  }
  const data = result.data;
  return {
    ...data,
    // dry run par défaut partout sauf en production
    EMAIL_DRY_RUN: data.EMAIL_DRY_RUN ?? data.NODE_ENV !== "production",
  };
}

export const env: Env = parseEnv(process.env);

type OptionalSecretKey =
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "INNGEST_EVENT_KEY"
  | "INNGEST_SIGNING_KEY"
  | "DATAFORSEO_LOGIN"
  | "DATAFORSEO_PASSWORD"
  | "ANTHROPIC_API_KEY"
  | "OPENAI_API_KEY";

/** Lit une variable optionnelle au moment de l'usage : erreur claire si elle manque. */
export function requireEnv(name: OptionalSecretKey, source: Env = env): string {
  const value = source[name];
  if (!value) {
    throw new EnvError([`${name} : variable requise pour cette fonctionnalité, mais non définie`]);
  }
  return value;
}
