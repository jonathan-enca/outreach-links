import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** MT.2b : cache partagé des recettes (service_role seulement) et univers de requêtes par site (RLS). */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `queries_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function asRole<T>(role: string, userId: string | null, fn: (c: Client) => Promise<T>) {
  await db.query("begin");
  try {
    await db.query(`set local role ${role}`);
    if (userId) {
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role }),
      ]);
    }
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

async function signUp(email: string) {
  const u = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  const userId = u.rows[0].id as string;
  const m = await db.query("select workspace_id from public.memberships where user_id = $1", [
    userId,
  ]);
  return { userId, workspaceId: m.rows[0].workspace_id as string };
}

describe.skipIf(!adminUrl)("univers de requêtes : cache partagé et RLS", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let siteId: string;

  const insertUniverse = (workspaceId: string, site: string, by: string) => ({
    text: `insert into public.query_universes (site_id, workspace_id, goal, budget_usd, est_cost_usd, queries, created_by)
           values ($1, $2, 'autorite_generale', 0.2, 0.1, '[{"q":"x y"}]'::jsonb, $3)`,
    values: [site, workspaceId, by],
  });
  const insertRecipe = (persona = "enseignants") =>
    `insert into public.query_recipes (niche_key, language, persona_key, recipe_version, persona_label, queries)
     values ('coloriages', 'fr', '${persona}', 1, 'Enseignants', '[{"q":"a b","tactic":"inconnus","rating":3}]'::jsonb)`;

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`create database ${dbName}`);
    const url = new URL(adminUrl!);
    url.pathname = `/${dbName}`;
    db = new Client({ connectionString: url.toString() });
    await db.connect();
    await db.query(readFileSync(path.join(dir, "tests/bootstrap.sql"), "utf8"));
    for (const f of readdirSync(path.join(dir, "migrations")).sort()) {
      await db.query(readFileSync(path.join(dir, "migrations", f), "utf8"));
    }
    alice = await signUp("alice@example.com");
    bob = await signUp("bob@example.com");
    const s = await db.query(
      "insert into public.sites (workspace_id, domain) values ($1, 'alice-site.fr') returning id",
      [alice.workspaceId],
    );
    siteId = s.rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("un membre écrit et lit les univers de son site ; un autre espace ne voit rien", async () => {
    await asRole("authenticated", alice.userId, async (c) => {
      await c.query(insertUniverse(alice.workspaceId, siteId, alice.userId));
      expect((await c.query("select * from public.query_universes")).rowCount).toBe(1);
    });
    await db.query(insertUniverse(alice.workspaceId, siteId, alice.userId));
    await asRole("authenticated", bob.userId, async (c) => {
      expect((await c.query("select * from public.query_universes")).rowCount).toBe(0);
    });
    await db.query("delete from public.query_universes");
  });

  it("refuse d'écrire dans l'espace ou sur le site d'un autre", async () => {
    await asRole("authenticated", bob.userId, async (c) => {
      await expect(c.query(insertUniverse(alice.workspaceId, siteId, bob.userId))).rejects.toThrow(
        /row-level security/,
      );
    });
    await asRole("authenticated", bob.userId, async (c) => {
      await expect(c.query(insertUniverse(bob.workspaceId, siteId, bob.userId))).rejects.toThrow(
        /row-level security/,
      );
    });
  });

  it("un univers est immuable : ni update ni delete pour un membre", async () => {
    await db.query(insertUniverse(alice.workspaceId, siteId, alice.userId));
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query("update public.query_universes set goal = 'mots_cles'")).rejects.toThrow(
        /permission denied/,
      );
    });
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query("delete from public.query_universes")).rejects.toThrow(
        /permission denied/,
      );
    });
    await db.query("delete from public.query_universes");
  });

  it("les contraintes refusent un objectif inconnu, un coût négatif, des requêtes non tableau", async () => {
    const bad = (set: string) =>
      db.query(
        `insert into public.query_universes (site_id, workspace_id, goal, budget_usd, est_cost_usd, queries)
         values ($1, $2, ${set})`,
        [siteId, alice.workspaceId],
      );
    await expect(bad(`'autre', 0.2, 0.1, '[]'::jsonb`)).rejects.toThrow(/check/);
    await expect(bad(`'mots_cles', -1, 0.1, '[]'::jsonb`)).rejects.toThrow(/check/);
    await expect(bad(`'mots_cles', 0.2, 0.1, '{}'::jsonb`)).rejects.toThrow(/check/);
  });

  it("le cache des recettes est inaccessible aux clients et ouvert au service seulement", async () => {
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query("select * from public.query_recipes")).rejects.toThrow(
        /permission denied/,
      );
    });
    await asRole("anon", null, async (c) => {
      await expect(c.query("select * from public.query_recipes")).rejects.toThrow(
        /permission denied/,
      );
    });
    await asRole("service_role", null, async (c) => {
      await c.query(insertRecipe());
      expect((await c.query("select * from public.query_recipes")).rowCount).toBe(1);
      await expect(c.query("update public.query_recipes set persona_label = 'x'")).rejects.toThrow(
        /permission denied/,
      );
    });
  });

  it("une recette est unique par niche, langue, persona et version", async () => {
    await db.query(insertRecipe());
    await expect(db.query(insertRecipe())).rejects.toThrow(/query_recipes_niche_key/);
    await db.query(insertRecipe("autre"));
    await db.query(
      `insert into public.query_recipes (niche_key, language, persona_key, recipe_version, persona_label, queries)
       values ('coloriages', 'fr', 'enseignants', 2, 'Enseignants', '[]'::jsonb)`,
    );
    await db.query(
      `insert into public.query_recipes (niche_key, language, persona_key, recipe_version, persona_label, queries)
       values ('coloriages', 'en', 'enseignants', 1, 'Teachers', '[]'::jsonb)`,
    );
    await db.query("delete from public.query_recipes");
  });

  it("la suppression du site supprime ses univers (cascade)", async () => {
    const s = await db.query(
      "insert into public.sites (workspace_id, domain) values ($1, 'jetable.fr') returning id",
      [alice.workspaceId],
    );
    await db.query(insertUniverse(alice.workspaceId, s.rows[0].id, alice.userId));
    await db.query("delete from public.sites where id = $1", [s.rows[0].id]);
    expect(
      (await db.query("select 1 from public.query_universes where site_id = $1", [s.rows[0].id]))
        .rowCount,
    ).toBe(0);
  });
});
