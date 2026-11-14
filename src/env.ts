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
