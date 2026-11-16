// MU.0 : prépare `.env.local` pour la session de test connectée (jamais versionné : `.env*` est ignoré).
//
// Lit les clés du projet Supabase par l'API de gestion (jeton `SUPABASE_ACCESS_TOKEN`, ou injecté par
// le proxy de l'environnement cloud) et tire un mot de passe aléatoire pour le compte de test. Le
// script de données (`seed.mjs`) crée ce compte ou remet son mot de passe à cette valeur : les
// identifiants ne vivent donc que dans `.env.local`, le temps de la session.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const FILE = resolve(ROOT, ".env.local");
const REF = process.env.SUPABASE_PROJECT_REF ?? "ivjkwhhgtibewqzccvrj";
const PORT = process.env.SHOTS_PORT ?? "3100";

/** Variables déjà présentes dans `.env.local` (on ne remplace jamais une valeur existante). */
function readExisting() {
  if (!existsSync(FILE)) return new Map();
  const out = new Map();
  for (const line of readFileSync(FILE, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

async function fetchKeys() {
  const headers = process.env.SUPABASE_ACCESS_TOKEN
    ? { authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` }
    : {};
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(
      `API de gestion Supabase : HTTP ${res.status}. Définir SUPABASE_ACCESS_TOKEN, ou lancer avec NODE_USE_ENV_PROXY=1 dans l'environnement cloud.`,
    );
  }
  const keys = await res.json();
  const pick = (name, type) => keys.find((k) => k.name === name && k.type === type)?.api_key;
  const anon = pick("default", "publishable") ?? pick("anon", "legacy");
  const service = pick("service_role", "legacy") ?? pick("default", "secret");
  if (!anon || !service) throw new Error("Clés Supabase introuvables dans la réponse.");
  return { anon, service };
}

const existing = readExisting();
const wanted = new Map();
if (!existing.has("SUPABASE_SERVICE_ROLE_KEY") || !existing.has("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
  const { anon, service } = await fetchKeys();
  wanted.set("NEXT_PUBLIC_SUPABASE_ANON_KEY", anon);
  wanted.set("SUPABASE_SERVICE_ROLE_KEY", service);
}
wanted.set("NEXT_PUBLIC_SUPABASE_URL", `https://${REF}.supabase.co`);
wanted.set("NEXT_PUBLIC_APP_URL", `http://localhost:${PORT}`);
// Aucun job réel en local : sans serveur de développement Inngest, aucun événement ne part.
wanted.set("INNGEST_DEV", "1");
wanted.set("EMAIL_DRY_RUN", "true");
wanted.set("BETA_MODE", "true");
wanted.set("E2E_EMAIL", process.env.E2E_EMAIL ?? "espace-test@mega-coloring.com");
wanted.set("E2E_PASSWORD", randomBytes(18).toString("base64url"));

const lines = [];
for (const [k, v] of wanted) if (!existing.has(k)) lines.push(`${k}=${v}`);
if (lines.length > 0) {
  const head = existsSync(FILE) ? readFileSync(FILE, "utf8").replace(/\n*$/, "\n") : "";
  writeFileSync(FILE, `${head}${lines.join("\n")}\n`, { mode: 0o600 });
}
console.log(
  `.env.local : ${lines.length} variable(s) ajoutée(s), ${existing.size} déjà présente(s). Aucune valeur affichée.`,
);
