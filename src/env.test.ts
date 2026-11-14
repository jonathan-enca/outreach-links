import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "./env";

describe("parseEnv", () => {
  it("accepte une configuration valide", () => {
    const env = parseEnv({ NEXT_PUBLIC_APP_URL: "http://localhost:3000", NODE_ENV: "development" });
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("échoue bruyamment si une variable manque", () => {
    expect(() => parseEnv({ NODE_ENV: "development" })).toThrow(EnvError);
    expect(() => parseEnv({})).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("rejette une URL invalide", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_APP_URL: "pas-une-url" })).toThrow(EnvError);
  });

  it("active le dry run par défaut hors production seulement", () => {
    const base = { NEXT_PUBLIC_APP_URL: "https://exemple.fr" };
    expect(parseEnv({ ...base, NODE_ENV: "development" }).EMAIL_DRY_RUN).toBe(true);
    expect(parseEnv({ ...base, NODE_ENV: "production" }).EMAIL_DRY_RUN).toBe(false);
    expect(parseEnv({ ...base, NODE_ENV: "production", EMAIL_DRY_RUN: "true" }).EMAIL_DRY_RUN).toBe(
      true,
    );
  });
});
