import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanAppUrl, destinationAfterCode } from "./destination";
import { requestPasswordReset, setNewPassword, signIn, signUp } from "./service";

type AuthErr = { code?: string; status?: number } | null;

function client(over: Record<string, unknown> = {}) {
  const auth = {
    signUp: vi.fn(async () => ({ data: { session: null, user: {} }, error: null as AuthErr })),
    signInWithPassword: vi.fn(async () => ({ data: {}, error: null as AuthErr })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null as AuthErr })),
    getUser: vi.fn(async () => ({ data: { user: { id: "u1" } } })),
    updateUser: vi.fn(async () => ({ data: {}, error: null as AuthErr })),
    ...over,
  };
  return { auth, supabase: { auth } as unknown as SupabaseClient };
}
const APP = "https://exemple.test";

describe("inscription", () => {
  it("exige un nom, un email valide et 8 caractères de mot de passe, sans appeler Supabase", async () => {
    const { auth, supabase } = client();
    for (const bad of [
      { name: "", email: "a@b.fr", password: "12345678" },
      { name: "Camille", email: "pas-un-email", password: "12345678" },
      { name: "Camille", email: "a@b.fr", password: "1234567" },
    ]) {
      expect((await signUp(supabase, bad, APP)).status).toBe("error");
    }
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("envoie le nom, demande la confirmation et ne révèle pas si l'adresse existe", async () => {
    const { auth, supabase } = client();
    const res = await signUp(
      supabase,
      { name: " Camille ", email: " a@b.fr ", password: "12345678" },
      APP,
    );
    expect(res.status).toBe("confirm");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "a@b.fr",
      password: "12345678",
      options: { data: { full_name: "Camille" }, emailRedirectTo: `${APP}/auth/callback` },
    });
  });

  it("entre directement dans l'espace si la session est ouverte", async () => {
    const { supabase } = client({
      signUp: async () => ({ data: { session: {}, user: {} }, error: null }),
    });
    expect(
      await signUp(supabase, { name: "C", email: "a@b.fr", password: "12345678" }, APP),
    ).toEqual({
      status: "ok",
      redirectTo: "/app/demarrer",
    });
  });

  it("traduit la limite d'emails et les mots de passe faibles", async () => {
    const limited = client({
      signUp: async () => ({
        data: {},
        error: { code: "over_email_send_rate_limit", status: 429 },
      }),
    });
    expect(
      (await signUp(limited.supabase, { name: "C", email: "a@b.fr", password: "12345678" }, APP))
        .message,
    ).toMatch(/Trop/);
    const weak = client({
      signUp: async () => ({ data: {}, error: { code: "weak_password", status: 422 } }),
    });
    expect(
      (await signUp(weak.supabase, { name: "C", email: "a@b.fr", password: "12345678" }, APP))
        .message,
    ).toMatch(/8 caractères/);
  });
});

describe("connexion", () => {
  it("connecte et mène à /app", async () => {
    const { auth, supabase } = client();
    expect(await signIn(supabase, { email: "a@b.fr", password: "x" })).toEqual({
      status: "ok",
      redirectTo: "/app",
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.fr", password: "x" });
  });

  it("même message pour un mauvais mot de passe et un compte inconnu", async () => {
    const { supabase } = client({
      signInWithPassword: async () => ({
        data: {},
        error: { code: "invalid_credentials", status: 400 },
      }),
    });
    const res = await signIn(supabase, { email: "a@b.fr", password: "mauvais" });
    expect(res).toMatchObject({ status: "error", message: "Email ou mot de passe incorrect." });
  });

  it("dit de confirmer l'adresse si elle ne l'est pas", async () => {
    const { supabase } = client({
      signInWithPassword: async () => ({
        data: {},
        error: { code: "email_not_confirmed", status: 400 },
      }),
    });
    expect((await signIn(supabase, { email: "a@b.fr", password: "x" })).message).toMatch(
      /Confirmez/,
    );
  });
});

describe("mot de passe oublié", () => {
  it("répond pareil que l'adresse existe ou non", async () => {
    const { auth, supabase } = client();
    const res = await requestPasswordReset(supabase, "a@b.fr", APP);
    expect(res.status).toBe("ok");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.fr", {
      redirectTo: `${APP}/auth/recuperation`,
    });
    const err = client({
      resetPasswordForEmail: async () => ({
        data: {},
        error: { code: "user_not_found", status: 400 },
      }),
    });
    expect(await requestPasswordReset(err.supabase, "a@b.fr", APP)).toEqual(res);
  });

  it("le nouveau mot de passe exige une session et 8 caractères", async () => {
    const noSession = client({ getUser: async () => ({ data: { user: null } }) });
    expect((await setNewPassword(noSession.supabase, "12345678")).message).toMatch(/expiré/);
    const ok = client();
    expect((await setNewPassword(ok.supabase, "court")).status).toBe("error");
    expect(await setNewPassword(ok.supabase, "12345678")).toEqual({
      status: "ok",
      redirectTo: "/app",
    });
    expect(ok.auth.updateUser).toHaveBeenCalledWith({ password: "12345678" });
  });
});

describe("destination après un lien d'email", () => {
  const now = new Date("2026-11-15T20:00:00Z");
  it("un lien de réinitialisation récent mène au choix du mot de passe", () => {
    expect(
      destinationAfterCode(
        { recovery_sent_at: "2026-11-15T19:50:00Z", confirmation_sent_at: "2026-11-14T14:36:00Z" },
        now,
      ),
    ).toBe("/reinitialiser");
  });
  it("une confirmation d'inscription, ou une récupération ancienne, mène à l'espace", () => {
    expect(destinationAfterCode({ confirmation_sent_at: "2026-11-15T19:55:00Z" }, now)).toBe(
      "/app",
    );
    expect(destinationAfterCode({ recovery_sent_at: "2026-11-15T10:00:00Z" }, now)).toBe("/app");
    expect(destinationAfterCode(null, now)).toBe("/app");
  });
  it("retire la barre finale de l'URL de l'application", () => {
    expect(cleanAppUrl("https://outreach-links.vercel.app/ ")).toBe(
      "https://outreach-links.vercel.app",
    );
  });
});
