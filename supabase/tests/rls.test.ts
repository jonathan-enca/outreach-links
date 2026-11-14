import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Tests de RLS sur un vrai Postgres. TEST_DATABASE_URL = connexion superutilisateur ;
 * une base temporaire est créée puis supprimée. Obligatoire en CI.
 */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `rls_test_${process.pid}_${Date.now()}`;
let admin: Client;
let db: Client;

const dir = path.resolve(__dirname, "..");

async function asUser<T>(userId: string | null, fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query(`set local role ${userId ? "authenticated" : "anon"}`);
    if (userId) {
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
    }
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

async function signUp(email: string): Promise<{ userId: string; workspaceId: string }> {
  const u = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  const userId = u.rows[0].id as string;
  const m = await db.query("select workspace_id from public.memberships where user_id = $1", [
    userId,
  ]);
  return { userId, workspaceId: m.rows[0].workspace_id as string };
}

describe.skipIf(!adminUrl)("RLS", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let aliceSite: string;

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
    aliceSite = s.rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName} with (force)`);
    await admin?.end();
  });

  it("crée un workspace et une membership owner à l'inscription", async () => {
    expect(alice.workspaceId).not.toBe(bob.workspaceId);
    const r = await db.query("select role from public.memberships where user_id = $1", [
      alice.userId,
    ]);
    expect(r.rows).toEqual([{ role: "owner" }]);
    const e = await db.query("select type from public.events where workspace_id = $1", [
      alice.workspaceId,
    ]);
    expect(e.rows).toEqual([{ type: "workspace.created" }]);
  });

  it("un utilisateur ne lit que son workspace", async () => {
    const r = await asUser(bob.userId, (c) => c.query("select id from public.workspaces"));
    expect(r.rows.map((x) => x.id)).toEqual([bob.workspaceId]);
  });

  it("un utilisateur ne lit pas les memberships, sites et events d'un autre workspace", async () => {
    await asUser(bob.userId, async (c) => {
      expect(
        (await c.query("select * from public.memberships")).rows.every(
          (x) => x.workspace_id === bob.workspaceId,
        ),
      ).toBe(true);
      expect((await c.query("select * from public.sites")).rows).toHaveLength(0);
      expect(
        (await c.query("select * from public.events")).rows.every(
          (x) => x.workspace_id === bob.workspaceId,
        ),
      ).toBe(true);
    });
  });

  it("un anonyme ne lit rien (accès refusé)", async () => {
    await expect(asUser(null, (c) => c.query("select * from public.sites"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(asUser(null, (c) => c.query("select * from public.workspaces"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("refuse d'écrire un site dans le workspace d'un autre", async () => {
    await expect(
      asUser(bob.userId, (c) =>
        c.query("insert into public.sites (workspace_id, domain) values ($1, 'intrus.fr')", [
          alice.workspaceId,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("ne modifie ni ne supprime le site d'un autre (0 ligne touchée)", async () => {
    await asUser(bob.userId, async (c) => {
      const u = await c.query("update public.sites set domain = 'pwned.fr' where id = $1", [
        aliceSite,
      ]);
      expect(u.rowCount).toBe(0);
      const d = await c.query("delete from public.sites where id = $1", [aliceSite]);
      expect(d.rowCount).toBe(0);
    });
    const r = await db.query("select domain from public.sites where id = $1", [aliceSite]);
    expect(r.rows[0].domain).toBe("alice-site.fr");
  });

  it("un membre gère les sites de son workspace", async () => {
    await asUser(alice.userId, async (c) => {
      await c.query("insert into public.sites (workspace_id, domain) values ($1, 'second.fr')", [
        alice.workspaceId,
      ]);
      const r = await c.query("select domain from public.sites order by domain");
      expect(r.rows.map((x) => x.domain)).toEqual(["alice-site.fr", "second.fr"]);
    });
  });

  it("refuse la création de workspace et de membership côté client", async () => {
    await expect(
      asUser(bob.userId, (c) => c.query("insert into public.workspaces (name) values ('x')")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(bob.userId, (c) =>
        c.query(
          "insert into public.memberships (workspace_id, user_id, role) values ($1, $2, 'owner')",
          [alice.workspaceId, bob.userId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("events : ajout seul, pour soi, dans son workspace", async () => {
    await asUser(alice.userId, async (c) => {
      await c.query(
        "insert into public.events (workspace_id, actor_id, type) values ($1, $2, 'test')",
        [alice.workspaceId, alice.userId],
      );
    });
    await expect(
      asUser(alice.userId, (c) =>
        c.query(
          "insert into public.events (workspace_id, actor_id, type) values ($1, $2, 'usurpation')",
          [alice.workspaceId, bob.userId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(bob.userId, (c) =>
        c.query(
          "insert into public.events (workspace_id, actor_id, type) values ($1, $2, 'test')",
          [alice.workspaceId, bob.userId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(asUser(alice.userId, (c) => c.query("delete from public.events"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asUser(alice.userId, (c) => c.query("update public.events set type = 'x'")),
    ).rejects.toThrow(/permission denied/);
  });

  it("seuls owner/admin renomment le workspace ; pas d'autres colonnes", async () => {
    await asUser(alice.userId, async (c) => {
      const u = await c.query("update public.workspaces set name = 'Renommé' where id = $1", [
        alice.workspaceId,
      ]);
      expect(u.rowCount).toBe(1);
    });
    await asUser(bob.userId, async (c) => {
      const u = await c.query("update public.workspaces set name = 'Pirate' where id = $1", [
        alice.workspaceId,
      ]);
      expect(u.rowCount).toBe(0);
    });
    await expect(
      asUser(alice.userId, (c) =>
        c.query("update public.workspaces set created_by = null where id = $1", [
          alice.workspaceId,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("toutes les tables du schéma public ont la RLS activée", async () => {
    const r = await db.query(
      "select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity",
    );
    expect(r.rows).toEqual([]);
  });
});
