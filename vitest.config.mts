import { defineConfig } from "vitest/config";
import path from "node:path";

const real = (key: string, fake: string) =>
  process.env.VITEST_REAL_ENV === "1" ? (process.env[key] ?? fake) : fake;

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    // Valeurs fictives : env.ts valide process.env dès l'import. Les vérifications réelles qui
    // écrivent dans la vraie base (`VITEST_REAL_ENV=1`, voir `demo:watchdog`) gardent l'environnement.
    env: {
      NEXT_PUBLIC_APP_URL: real("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
      NEXT_PUBLIC_SUPABASE_URL: real("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: real("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key"),
    },
    include: ["src/**/*.test.ts", "messages/**/*.test.ts", "supabase/tests/**/*.test.ts"],
  },
});
