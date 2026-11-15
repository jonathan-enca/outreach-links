import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M5.3 : contraintes et RLS réelles des tables `links` et `link_checks`. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `links_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function inTx<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

describe.skipIf(!adminUrl)("links : contraintes et RLS", () => {
  let wsA: string;
  let wsB: string;
  let userA: string;
  let userB: string;
  let siteA: string;
  let siteB: string;

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
    const mk = async (email: string, domain: string) => {
      const u = (await db.query("insert into auth.users (email) values ($1) returning id", [email]))
        .rows[0].id as string;
      const w = (
        await db.query("select workspace_id from public.memberships where user_id = $1", [u])
      ).rows[0].workspace_id as string;
      const s = (
        await db.query(
          "insert into public.sites (workspace_id, domain) values ($1, $2) returning id",
          [w, domain],
        )
      ).rows[0].id as string;
      return { u, w, s };
    };
    const a = await mk("a@example.com", "alice-site.fr");
    const b = await mk("b@example.com", "bob-site.fr");
    [userA, wsA, siteA] = [a.u, a.w, a.s];
    [userB, wsB, siteB] = [b.u, b.w, b.s];
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  const insertLink = (c: Client, ws: string, site: string, source = "https://blog.fr/a") =>
    c.query(
      `insert into public.links (workspace_id, site_id, source_url, source_domain, target_url)
       values ($1, $2, $3, 'blog.fr', 'https://alice-site.fr/') returning id`,
      [ws, site, source],
    );

  it("crée un lien à vérifier avec les valeurs par défaut", async () => {
    await inTx(async (c) => {
      await c.query("set local role service_role");
      const r = await insertLink(c, wsA, siteA);
      const row = (await c.query("select * from public.links where id = $1", [r.rows[0].id]))
        .rows[0];
      expect(row.status).toBe("a_verifier");
      expect(row.checks_done).toBe(0);
      expect(row.origin).toBe("manuel");
    });
  });

  it("refuse un site d'un autre espace", async () => {
    await inTx(async (c) => {
      await c.query("set local role service_role");
      await expect(insertLink(c, wsA, siteB)).rejects.toThrow(/n'appartient pas/);
    });
  });

  it("refuse un doublon (même site, source et cible)", async () => {
    await inTx(async (c) => {
      await c.query("set local role service_role");
      await insertLink(c, wsA, siteA);
      await expect(insertLink(c, wsA, siteA)).rejects.toThrow(/duplicate|unique/i);
    });
  });

  it("refuse une adresse qui n'est pas http(s)", async () => {
    await inTx(async (c) => {
      await c.query("set local role service_role");
      await expect(insertLink(c, wsA, siteA, "javascript:alert(1)")).rejects.toThrow(/check/i);
    });
  });

  it("n'autorise pas à changer l'adresse déclarée, ni à supprimer", async () => {
    await inTx(async (c) => {
      await c.query("set local role service_role");
      const id = (await insertLink(c, wsA, siteA)).rows[0].id;
      await c.query("savepoint s");
      await expect(
        c.query("update public.links set target_url = 'https://autre.fr/' where id = $1", [id]),
      ).rejects.toThrow(/ne change pas/);
      await c.query("rollback to savepoint s");
      await expect(c.query("delete from public.links where id = $1", [id])).rejects.toThrow(
        /permission/,
      );
    });
  });

  it("refuse plus de 3 étapes terminées avec une prochaine date", async () => {
    await inTx(async (c) => {
      await c.query("set local role service_role");
      const id = (await insertLink(c, wsA, siteA)).rows[0].id;
      await expect(
        c.query("update public.links set checks_done = 3, next_check_at = now() where id = $1", [
          id,
        ]),
      ).rejects.toThrow(/links_done_has_no_next/);
    });
  });

  it("link_checks : « live » sans lien trouvé refusé, historique non modifiable", async () => {
    await inTx(async (c) => {
      await c.query("set local role service_role");
      const id = (await insertLink(c, wsA, siteA)).rows[0].id;
      await c.query("savepoint s1");
      await expect(
        c.query(
          "insert into public.link_checks (link_id, workspace_id, found, outcome) values ($1, $2, false, 'live')",
          [id, wsA],
        ),
      ).rejects.toThrow(/incohérente/);
      await c.query("rollback to savepoint s1");
      await c.query(
        "insert into public.link_checks (link_id, workspace_id, milestone_day, found, outcome, rel) values ($1, $2, 7, true, 'live', 'dofollow')",
        [id, wsA],
      );
      await expect(
        c.query("update public.link_checks set found = false where link_id = $1", [id]),
      ).rejects.toThrow(/permission/);
    });
  });

  it("link_checks : un autre espace que celui du lien est refusé", async () => {
    await inTx(async (c) => {
      await c.query("set local role service_role");
      const id = (await insertLink(c, wsA, siteA)).rows[0].id;
      await expect(
        c.query(
          "insert into public.link_checks (link_id, workspace_id, found, outcome) values ($1, $2, true, 'live')",
          [id, wsB],
        ),
      ).rejects.toThrow(/espace différent/);
    });
  });

  it("RLS : chaque utilisateur ne voit que les liens de son espace", async () => {
    await db.query("begin");
    try {
      await db.query("set local role service_role");
      await insertLink(db, wsA, siteA);
      await db.query("reset role");
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userA]);
      expect((await db.query("select * from public.links")).rowCount).toBe(1);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userB]);
      expect((await db.query("select * from public.links")).rowCount).toBe(0);
      await expect(
        db.query(
          `insert into public.links (workspace_id, site_id, source_url, source_domain, target_url)
           values ($1, $2, 'https://x.fr/', 'x.fr', 'https://bob-site.fr/')`,
          [wsB, siteB],
        ),
      ).rejects.toThrow(/permission/);
    } finally {
      await db.query("rollback");
    }
  });
});
