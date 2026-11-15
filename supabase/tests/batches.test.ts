import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M3.4 : lots, verrouillage et validation. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `batches_test_${process.pid}_${Date.now()}`;
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

describe.skipIf(!adminUrl)("lots : verrouillage et validation", () => {
  let alice: { userId: string; workspaceId: string };
  let bob: { userId: string; workspaceId: string };
  let planId: string;
  let readyDraft: string;
  let otherReadyDraft: string;
  let notReadyDraft: string;

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
    const item = (d: string) => ({
      type: "annuaire",
      source_domain: d,
      target_page_url: "https://alice-site.fr/",
      anchor_kind: "marque",
      anchor_text: "Alice",
      expected_link_type: "editorial",
      rationale: "test",
      priority: "haute",
      priority_score: 80,
    });
    const p = await db.query("select * from public.create_link_plan($1, $2, $3::jsonb)", [
      a.rows[0].id,
      alice.userId,
      JSON.stringify([item("a.fr"), item("b.fr"), item("c.fr")]),
    ]);
    planId = p.rows[0].plan_id;
    const items = (
      await db.query("select id from public.link_plan_items where plan_id = $1 order by position", [
        planId,
      ])
    ).rows.map((r) => r.id as string);
    const draft = async (itemId: string, ready: boolean) =>
      (
        await db.query(
          `insert into public.target_drafts
             (plan_item_id, plan_id, workspace_id, channel, subject, body, hook, targeting_reason,
              proposed_url, url_status, ready, lint_issues)
           values ($1, $2, $3, 'email', 's', 'corps', 'h', 'r', 'https://alice-site.fr/', $4, $5, $6::jsonb)
           returning id`,
          [
            itemId,
            planId,
            alice.workspaceId,
            ready ? 200 : 404,
            ready,
            ready ? "[]" : '[{"code":"x","message":"y"}]',
          ],
        )
      ).rows[0].id as string;
    readyDraft = await draft(items[0]!, true);
    otherReadyDraft = await draft(items[1]!, true);
    notReadyDraft = await draft(items[2]!, false);
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  const newBatch = async (c: Client, n = 1) =>
    (
      await c.query(
        `insert into public.batches (plan_id, workspace_id, number) values ($1, $2, $3) returning id`,
        [planId, alice.workspaceId, n],
      )
    ).rows[0].id as string;
  const addItem = (c: Client, batch: string, draft: string, pos = 1) =>
    c.query(
      `insert into public.batch_items (batch_id, draft_id, plan_id, workspace_id, position)
       values ($1, $2, $3, $4, $5)`,
      [batch, draft, planId, alice.workspaceId, pos],
    );
  const validate = (c: Client, batch: string) =>
    c.query(
      `update public.batches set status = 'valide', validated_at = now(), validated_by = $2 where id = $1`,
      [batch, alice.userId],
    );

  it("valide un lot prêt et verrouille lot et brouillons", async () => {
    await asRole("service_role", null, async (c) => {
      const b = await newBatch(c);
      await addItem(c, b, readyDraft);
      await validate(c, b);
      const d = await c.query("select status from public.target_drafts where id = $1", [
        readyDraft,
      ]);
      expect(d.rows[0].status).toBe("valide");
      await expect(
        c.query("update public.target_drafts set body = 'x' where id = $1", [readyDraft]),
      ).rejects.toThrow(/verrouillé/);
    });
  });

  it("un lot validé ne change plus ni de statut ni de contenu", async () => {
    await asRole("service_role", null, async (c) => {
      const b = await newBatch(c);
      await addItem(c, b, readyDraft);
      await validate(c, b);
      await c.query("savepoint s1");
      await expect(
        c.query(
          "update public.batches set status = 'brouillon', validated_at = null where id = $1",
          [b],
        ),
      ).rejects.toThrow(/déjà validé/);
      await c.query("rollback to savepoint s1");
      await expect(addItem(c, b, otherReadyDraft, 2)).rejects.toThrow(/verrouillé/);
      await c.query("rollback to savepoint s1");
      await expect(
        c.query("delete from public.batch_items where batch_id = $1", [b]),
      ).rejects.toThrow(/verrouillé/);
    });
  });

  it("refuse un lot vide ou contenant un message non prêt", async () => {
    await asRole("service_role", null, async (c) => {
      const empty = await newBatch(c, 1);
      await c.query("savepoint s1");
      await expect(validate(c, empty)).rejects.toThrow(/vide/);
      await c.query("rollback to savepoint s1");
      const b = await newBatch(c, 2);
      await addItem(c, b, notReadyDraft);
      await expect(validate(c, b)).rejects.toThrow(/non prêts/);
    });
  });

  it("un brouillon n'est que dans un seul lot ; retrait possible avant validation", async () => {
    await asRole("service_role", null, async (c) => {
      const b1 = await newBatch(c, 1);
      const b2 = await newBatch(c, 2);
      await addItem(c, b1, readyDraft);
      await c.query("savepoint s1");
      await expect(addItem(c, b2, readyDraft)).rejects.toThrow(/duplicate key/);
      await c.query("rollback to savepoint s1");
      await c.query("delete from public.batch_items where batch_id = $1", [b1]);
      await expect(addItem(c, b2, readyDraft)).resolves.toBeTruthy();
    });
  });

  it("le statut ne peut pas être validé avec une date absente (cohérence)", async () => {
    await asRole("service_role", null, async (c) => {
      const b = await newBatch(c);
      await addItem(c, b, readyDraft);
      await expect(
        c.query("update public.batches set status = 'valide' where id = $1", [b]),
      ).rejects.toThrow(/validated_has_date/);
    });
  });

  it("RLS : lecture réservée au workspace, aucune écriture par un utilisateur", async () => {
    await db.query(
      `insert into public.batches (plan_id, workspace_id, number) values ($1, $2, 1)`,
      [planId, alice.workspaceId],
    );
    try {
      const seen = (u: { userId: string }) =>
        asRole(
          "authenticated",
          u.userId,
          async (c) => (await c.query("select id from public.batches")).rowCount,
        );
      expect(await seen(alice)).toBe(1);
      expect(await seen(bob)).toBe(0);
      await asRole("authenticated", alice.userId, async (c) => {
        await expect(c.query("update public.batches set status = 'valide'")).rejects.toThrow(
          /permission denied/,
        );
      });
    } finally {
      await db.query("delete from public.batches");
    }
  });
});
