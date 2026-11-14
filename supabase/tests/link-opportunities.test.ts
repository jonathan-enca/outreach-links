import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M2.1 : RLS et contraintes de link_opportunities, colonnes opportunities_* des audits. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `opps_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function asRole<T>(
  role: "authenticated" | "service_role",
  userId: string | null,
  fn: (c: Client) => Promise<T>,
): Promise<T> {
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

const insertSql = (type: string, domain: string, priority = "moyenne", score = 60) =>
  `insert into public.link_opportunities
     (audit_id, workspace_id, site_id, type, source_domain, target_page_url, expected_link_type, rationale, priority_score, priority)
   select a.id, a.workspace_id, a.site_id, '${type}', '${domain}', 'https://alice-site.fr/', 'editorial', 'test', ${score}, '${priority}'
   from public.audits a limit 1`;

describe.skipIf(!adminUrl)("link_opportunities : RLS et contraintes", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };

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
    await db.query(
      `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
       values ($1, $2, array['coloriage licorne'], 3, 0.25)`,
      [alice.workspaceId, s.rows[0].id],
    );
    await db.query(insertSql("annuaire", "annuaire.fr"));
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("un membre lit son workspace, pas un autre", async () => {
    await asRole("authenticated", alice.userId, async (c) => {
      expect((await c.query("select * from public.link_opportunities")).rowCount).toBe(1);
    });
    await asRole("authenticated", bob.userId, async (c) => {
      expect((await c.query("select * from public.link_opportunities")).rowCount).toBe(0);
    });
  });

  it("un anonyme est refusé", async () => {
    await db.query("begin");
    try {
      await db.query("set local role anon");
      await expect(db.query("select * from public.link_opportunities")).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.query("rollback");
    }
  });

  it.each([
    "update public.link_opportunities set status = 'retenu'",
    "delete from public.link_opportunities",
    "update public.audits set opportunities_status = 'termine'",
  ])("aucune écriture côté client : %s", async (sql) => {
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query(sql)).rejects.toThrow(/permission denied/);
    });
  });

  it("service_role écrit ; un domaine n'existe qu'une fois par audit", async () => {
    await asRole("service_role", null, async (c) => {
      expect((await c.query(insertSql("page_ressources", "ressources.fr"))).rowCount).toBe(1);
      await expect(c.query(insertSql("jamais_sollicite", "ressources.fr"))).rejects.toThrow(
        /duplicate key/,
      );
    });
  });

  it.each([
    insertSql("type_inconnu", "x1.fr"),
    insertSql("annuaire", "x2.fr", "urgente"),
    insertSql("annuaire", "x3.fr", "haute", 101),
  ])("contraintes de valeurs : %s", async (sql) => {
    await asRole("service_role", null, async (c) => {
      await expect(c.query(sql)).rejects.toThrow(/violates check constraint/);
    });
  });
});
