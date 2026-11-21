import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M3.2 : RLS et contraintes de target_contacts, manual_tasks, suppressions. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `contacts_test_${process.pid}_${Date.now()}`;
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

describe.skipIf(!adminUrl)("contacts des cibles : RLS et contraintes", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let planId: string;
  let itemId: string;

  const insertContact = (cols: string, vals: string) =>
    `insert into public.target_contacts
       (plan_item_id, plan_id, workspace_id, reason, ${cols})
     select '${itemId}', '${planId}', '${alice.workspaceId}', 'motif', ${vals}`;

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
    const a = await db.query(
      `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
       values ($1, $2, array['coloriage licorne'], 3, 0.25) returning id`,
      [alice.workspaceId, s.rows[0].id],
    );
    const items = JSON.stringify([
      {
        type: "annuaire",
        source_domain: "annuaire.fr",
        target_page_url: "https://alice-site.fr/",
        anchor_kind: "marque",
        anchor_text: "Alice",
        expected_link_type: "editorial",
        rationale: "test",
        priority: "haute",
        priority_score: 80,
      },
    ]);
    const p = await db.query("select * from public.create_link_plan($1, $2, $3::jsonb)", [
      a.rows[0].id,
      alice.userId,
      items,
    ]);
    planId = p.rows[0].plan_id;
    itemId = (await db.query("select id from public.link_plan_items where plan_id = $1", [planId]))
      .rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  it("un email non vérifié n'est jamais envoyable", async () => {
    const bad = [
      "status, email, verification, sendable",
      "'email_verifie', 'a@b.fr', 'non_verifie', true",
    ] as const;
    for (const verification of ["non_verifie", "risque", "inconnu", "invalide"]) {
      await asRole("service_role", null, async (c) => {
        await expect(
          c.query(insertContact(bad[0], `'email_verifie', 'a@b.fr', '${verification}', true`)),
        ).rejects.toThrow(/sendable_needs_valid/);
      });
    }
    await asRole("service_role", null, async (c) => {
      await expect(
        c.query(insertContact("status, sendable", "'email_verifie', false")),
      ).rejects.toThrow(/verified_is_sendable/);
    });
    await asRole("service_role", null, async (c) => {
      await expect(
        c.query(
          insertContact(
            "status, email, verification, sendable",
            "'email_a_verifier', 'a@b.fr', 'valide', true",
          ),
        ),
      ).rejects.toThrow(/verified_is_sendable|sendable_needs_valid/);
    });
    await asRole("service_role", null, async (c) => {
      expect(
        (
          await c.query(
            insertContact(
              "status, email, verification, sendable",
              "'email_verifie', 'a@b.fr', 'valide', true",
            ),
          )
        ).rowCount,
      ).toBe(1);
    });
  });

  it("un membre lit les contacts de son workspace, un autre non ; pas d'écriture client", async () => {
    await db.query("begin");
    try {
      await db.query("set local role service_role");
      await db.query(insertContact("status", "'introuvable'"));
      await db.query(
        `insert into public.manual_tasks (plan_item_id, plan_id, workspace_id, form_url)
         values ($1, $2, $3, 'https://b.fr/contact')`,
        [itemId, planId, alice.workspaceId],
      );
      await db.query("reset role");
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: alice.userId, role: "authenticated" }),
      ]);
      expect((await db.query("select * from public.target_contacts_v")).rowCount).toBe(1);
      expect((await db.query("select * from public.manual_tasks_v")).rowCount).toBe(1);
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: bob.userId, role: "authenticated" }),
      ]);
      expect((await db.query("select * from public.target_contacts_v")).rowCount).toBe(0);
      expect((await db.query("select * from public.manual_tasks_v")).rowCount).toBe(0);
    } finally {
      await db.query("rollback");
    }
    await asRole("authenticated", alice.userId, async (c) => {
      await expect(c.query(insertContact("status", "'introuvable'"))).rejects.toThrow(/permission/);
    });
  });

  it("service_role ne peut pas supprimer un contact ; une tâche est unique par cible", async () => {
    await asRole("service_role", null, async (c) => {
      await c.query(insertContact("status", "'introuvable'"));
      await expect(c.query("delete from public.target_contacts")).rejects.toThrow(/permission/);
    });
    await asRole("service_role", null, async (c) => {
      const ins = `insert into public.manual_tasks (plan_item_id, plan_id, workspace_id, form_url)
        values ('${itemId}', '${planId}', '${alice.workspaceId}', 'https://b.fr/c')`;
      await c.query(ins);
      await expect(c.query(ins)).rejects.toThrow(/duplicate|unique/);
    });
  });

  it("liste de suppression : un email ou un domaine, unique par workspace", async () => {
    await asRole("service_role", null, async (c) => {
      await expect(
        c.query("insert into public.suppressions (workspace_id) values (null)"),
      ).rejects.toThrow(/email_or_domain/);
    });
    await asRole("service_role", null, async (c) => {
      const ins = `insert into public.suppressions (workspace_id, email) values ('${alice.workspaceId}', 'A@B.fr')`;
      await c.query(ins);
      await expect(c.query(ins.replace("A@B.fr", "a@b.fr"))).rejects.toThrow(/duplicate|unique/);
    });
    await db.query("begin");
    try {
      await db.query("set local role service_role");
      await db.query(
        `insert into public.suppressions (workspace_id, email) values ('${alice.workspaceId}', 'x@y.fr')`,
      );
      await db.query(
        "insert into public.suppressions (workspace_id, domain) values (null, 'glob.fr')",
      );
      await db.query("reset role");
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: bob.userId, role: "authenticated" }),
      ]);
      expect((await db.query("select * from public.suppressions")).rowCount).toBe(0);
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: alice.userId, role: "authenticated" }),
      ]);
      expect((await db.query("select * from public.suppressions")).rowCount).toBe(1);
    } finally {
      await db.query("rollback");
    }
  });
});
