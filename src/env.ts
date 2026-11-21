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
  /** Lecteur de pages de secours du tri (M3.1) : `jina` active r.jina.ai (hôte à autoriser). */
  PAGE_READER_FALLBACK: z.enum(["none", "jina"]).default("none"),
  /** Finder et vérificateur d'emails (M3.2) : sans clé, rien n'est jamais « envoyable ». */
  /**
   * Emails transactionnels (jamais d'outreach) : Resend. Sans clé, aucun email n'est envoyé et l'espace
   * le dit (l'écran d'analyse ne promet plus d'email). `TRANSACTIONAL_FROM` : expéditeur d'un domaine vérifié.
   */
  RESEND_API_KEY: z.string().min(1).optional(),
  TRANSACTIONAL_FROM: z.string().min(3).default("no-reply@ouiouioui.app"),
  EMAIL_FINDER_PROVIDER: z.enum(["hunter"]).default("hunter"),
  EMAIL_FINDER_API_KEY: z.string().min(1).optional(),
  /** Vérification gratuite (DNS) des emails publiés par la cible sur son domaine ; `none` la coupe. */
  EMAIL_FREE_VERIFY: z.enum(["mx", "none"]).default("mx"),
  /**
   * Clés AES-256 des identifiants de boîte (M4.1) : « v2:<base64 32 o>,v1:<base64 32 o> ».
   * La première chiffre, toutes déchiffrent (rotation). Génération : `openssl rand -base64 32`.
   */
  MAILBOX_ENCRYPTION_KEYS: z.string().min(1).optional(),
  /** LLM (optionnels : erreur claire à l'usage). Anthropic est la cible ; OpenAI sert au développement. */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  /** Force le fournisseur ; sinon Anthropic si sa clé existe, sinon OpenAI. */
  LLM_PROVIDER: z.enum(["anthropic", "openai"]).optional(),
  /**
   * Jugement des lots d'arrière-plan par l'API par lots d'Anthropic (50 % moins cher, réponse en
   * différé). `off` = appels directs (interrupteur si le délai mesuré devient trop long). Sans effet
   * hors Anthropic.
   */
  LLM_BATCH_JUDGEMENT: z.enum(["on", "off"]).default("on"),
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
  /** Stripe : clé secrète de test (`sk_test_`) ou réelle (`sk_live_`). Sans clé : adaptateur factice. */
  STRIPE_SECRET_KEY: z
    .string()
    .regex(/^sk_(test|live)_/, "clé secrète Stripe attendue (sk_test_ ou sk_live_)")
    .optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  /**
   * Second garde d'envoi réel (avec EMAIL_DRY_RUN). Faux par défaut partout :
   * aucun email réel ne part tant que cette variable n'est pas "true".
   */
  OUTREACH_SENDING_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /**
   * G1 : connexion d'une boîte par compte Google (OAuth). Faux par défaut ; le bouton n'apparaît et
   * les routes /api/google/* ne répondent que si c'est "true" ET que le client OAuth est renseigné.
   */
  GOOGLE_OAUTH_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  /**
   * MQ.2 : connexion de la Search Console (lecture seule). Faux par défaut tant que la vérification
   * Google (G4) n'est pas faite : le bouton n'apparaît que si c'est "true" ET que Google OAuth est actif.
   */
  SEARCH_CONSOLE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /**
   * Envoi ponctuel : id d'UN brouillon validé qui part en premier et peut dépasser le quota
   * d'échauffement (jamais le plafond horaire ni le plafond journalier de la boîte). Absent par
   * défaut ; à retirer une fois le message parti.
   */
  SEND_PRIORITY_DRAFT_ID: z.string().uuid().optional(),
  /**
   * Mode bêta (MT.0) : tout espace est traité au niveau « payant » (limites de volume levées), sans
   * toucher à la table `plans`. Faux par défaut ; posé à "true" sur Vercel pendant la bêta. Les
   * plafonds de sécurité de coût et les protections d'envoi restent actifs.
   */
  BETA_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /**
   * MU.1 : "true" remet l'ANCIENNE chaîne dans le parcours (backlinks des concurrents, liste
   * d'opportunités, chasseur 404 d'origine). Faux par défaut : une seule analyse, de bout en bout.
   * Le code de l'ancienne chaîne est conservé jusqu'à MU.11.
   */
  LEGACY_CHAIN: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /** Plafond de sécurité des dépenses d'API de toute la plateforme sur 24 h glissantes (USD). */
  DAILY_COST_CAP_USD: z.coerce.number().positive().default(25),
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
