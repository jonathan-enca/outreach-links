import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M5.1 : classification des réponses, relance repoussée et droits. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `classif_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function inTx<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role service_role");
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

describe.skipIf(!adminUrl)("classification des réponses : contraintes en base", () => {
  let workspaceId: string;
  let userId: string;
  let planId: string;
  let siteId: string;
  const drafts: string[] = [];
  let mailboxId: string;

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
    const u = await db.query(
      "insert into auth.users (email) values ('a@example.com') returning id",
    );
    userId = u.rows[0].id;
    workspaceId = (
      await db.query("select workspace_id from public.memberships where user_id = $1", [userId])
    ).rows[0].workspace_id;
    siteId = (
      await db.query(
        "insert into public.sites (workspace_id, domain) values ($1, 'alice-site.fr') returning id",
        [workspaceId],
      )
    ).rows[0].id;
    const a = await db.query(
      `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
       values ($1, $2, array['q'], 3, 0.25) returning id`,
      [workspaceId, siteId],
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
      userId,
      JSON.stringify(["a", "b", "c", "d", "e"].map((x) => item(`${x}.fr`))),
    ]);
    planId = p.rows[0].plan_id;
    const items = (
      await db.query("select id from public.link_plan_items where plan_id = $1 order by position", [
        planId,
      ])
    ).rows.map((r) => r.id as string);
    for (const itemId of items) {
      drafts.push(
        (
          await db.query(
            `insert into public.target_drafts
               (plan_item_id, plan_id, workspace_id, channel, subject, body, hook, targeting_reason,
                proposed_url, url_status, ready)
             values ($1, $2, $3, 'email', 's', 'corps', 'h', 'r', 'https://alice-site.fr/', 200, true)
             returning id`,
            [itemId, planId, workspaceId],
          )
        ).rows[0].id,
      );
    }
    mailboxId = (
      await db.query(
        `insert into public.mailboxes (workspace_id, site_id, email, from_name, username, password_enc,
           key_version, smtp_host, smtp_port, imap_host, imap_port, status, smtp_ok, imap_ok, hourly_cap)
         values ($1, $2, 'jo@alice-site.fr', 'Jo', 'jo', 'v1.x.y.z', 'v1', 'smtp.alice-site.fr', 587,
           'imap.alice-site.fr', 993, 'verifiee', true, true, 2) returning id`,
        [workspaceId, siteId],
      )
    ).rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  /** Lot validé avec les `n` premiers brouillons (dans la transaction du test). */
  async function validatedBatch(c: Client, n: number) {
    const b = (
      await c.query(
        "insert into public.batches (plan_id, workspace_id, number) values ($1, $2, 1) returning id",
        [planId, workspaceId],
      )
    ).rows[0].id as string;
    for (let i = 0; i < n; i++) {
      await c.query(
        `insert into public.batch_items (batch_id, draft_id, plan_id, workspace_id, position)
         values ($1, $2, $3, $4, $5)`,
        [b, drafts[i], planId, workspaceId, i + 1],
      );
    }
    await c.query(
      "update public.batches set status = 'valide', validated_at = now(), validated_by = $2 where id = $1",
      [b, userId],
    );
    return b;
  }

  let seq = 0;
  const claim = (
    c: Client,
    o: {
      batch: string;
      draft: string;
      to?: string;
      dry?: boolean;
      mailbox?: string | null;
      status?: string;
      claimedAt?: string;
      step?: string;
    },
  ) =>
    c.query(
      `insert into public.sent_messages (workspace_id, plan_id, batch_id, draft_id, mailbox_id, dry_run,
         to_email, subject, body, message_id, status, skip_reason, claimed_at, step)
       values ($1, $2, $3, $4, $5, $6, $7, 's', 'corps', $8, $9, $10, coalesce($11::timestamptz, now()), $12)
       returning id`,
      [
        workspaceId,
        planId,
        o.batch,
        o.draft,
        o.mailbox === undefined ? mailboxId : o.mailbox,
        o.dry ?? true,
        o.to ?? "contact@cible.fr",
        `<m${++seq}@alice-site.fr>`,
        o.status ?? "en_cours",
        o.status === "ignore" ? "test" : null,
        o.claimedAt ?? null,
        o.step ?? "initial",
      ],
    );

  async function initialSent(c: Client, to = "contact@cible.fr") {
    const b = await validatedBatch(c, 1);
    const r = await claim(c, { batch: b, draft: drafts[0]!, to, dry: false });
    return { id: r.rows[0].id as string };
  }
  const inbound = (c: Client, sent: string, mid: string, kind = "reponse") =>
    c.query(
      `insert into public.inbound_messages (workspace_id, mailbox_id, sent_message_id, message_id, kind,
         match_method, received_at, body_excerpt)
       values ($1, $2, $3, $4, $5, 'en_tete', now(), 'texte') returning id`,
      [workspaceId, mailboxId, sent, mid, kind],
    );

  const classify = (
    c: Client,
    inboundId: string,
    sentId: string,
    o: { category?: string; notBefore?: string | null; confidence?: number; action?: string } = {},
  ) =>
    c.query(
      `insert into public.reply_classifications (workspace_id, inbound_message_id, sent_message_id,
         category, confidence, justification, source, proposed_action, action_status, follow_up_not_before)
       values ($1, $2, $3, $4, $5, 'test', 'regle', $6, 'proposee', $7::timestamptz) returning id`,
      [
        workspaceId,
        inboundId,
        sentId,
        o.category ?? "question",
        o.confidence ?? 0.9,
        o.action ?? "brouillon_reponse",
        o.notBefore ?? null,
      ],
    );

  it("une seule classification par message entrant ; catégorie, confiance et action contraintes", async () => {
    await inTx(async (c) => {
      const s = await initialSent(c);
      const m = (await inbound(c, s.id, "<c1@cible.fr>")).rows[0].id as string;
      await classify(c, m, s.id);
      await c.query("savepoint a");
      await expect(classify(c, m, s.id)).rejects.toThrow(/unique|duplicate/i);
      await c.query("rollback to savepoint a");
      const m2 = (await inbound(c, s.id, "<c2@cible.fr>")).rows[0].id as string;
      await expect(classify(c, m2, s.id, { category: "chaud" })).rejects.toThrow(/check/i);
      await c.query("rollback to savepoint a");
      await expect(classify(c, m2, s.id, { confidence: 1.4 })).rejects.toThrow(/check|range/i);
      await c.query("rollback to savepoint a");
      await expect(classify(c, m2, s.id, { action: "envoyer_reponse" })).rejects.toThrow(/check/i);
      await c.query("rollback to savepoint a");
    });
  });

  it("relance repoussée : seule une réponse automatique peut repousser", async () => {
    await inTx(async (c) => {
      const s = await initialSent(c);
      const m = (await inbound(c, s.id, "<c3@cible.fr>")).rows[0].id as string;
      await c.query("savepoint a");
      await expect(
        classify(c, m, s.id, { category: "question", notBefore: "2999-01-01T00:00:00Z" }),
      ).rejects.toThrow(/reply_class_postpone_only_for_auto/);
      await c.query("rollback to savepoint a");
      await classify(c, m, s.id, {
        category: "reponse_automatique",
        notBefore: "2999-01-01T00:00:00Z",
        action: "repousser_relance",
      });
    });
  });

  it("garde-fou de relance : refusée tant que la date repoussée n'est pas passée, acceptée après", async () => {
    await inTx(async (c) => {
      const b = await validatedBatch(c, 1);
      await c.query("update public.mailboxes set hourly_cap = 10, daily_cap = 20 where id = $1", [
        mailboxId,
      ]);
      const r = await claim(c, { batch: b, draft: drafts[0]! });
      const id = r.rows[0].id as string;
      await c.query(
        `update public.sent_messages set status = 'envoye', sent_at = now() - interval '10 days',
           follow_up_due_at = now() - interval '1 day' where id = $1`,
        [id],
      );
      const mid = (await c.query("select message_id from public.sent_messages where id = $1", [id]))
        .rows[0].message_id as string;
      const m = (await inbound(c, id, "<c4@cible.fr>", "reponse_automatique")).rows[0].id as string;
      const cl = (
        await classify(c, m, id, {
          category: "reponse_automatique",
          notBefore: new Date(Date.now() + 5 * 86_400_000).toISOString(),
          action: "repousser_relance",
        })
      ).rows[0].id as string;
      const send = () =>
        c.query(
          `insert into public.sent_messages (workspace_id, plan_id, batch_id, draft_id, mailbox_id,
             dry_run, to_email, subject, body, message_id, in_reply_to, status, step)
           values ($1, $2, $3, $4, $5, true, 'contact@cible.fr', 'Re: s', 'relance', '<rel@alice-site.fr>',
             $6, 'en_cours', 'relance')`,
          [workspaceId, planId, b, drafts[0], mailboxId, mid],
        );
      await c.query("savepoint a");
      await expect(send()).rejects.toThrow(/repoussée/);
      await c.query("rollback to savepoint a");
      // La date repoussée est passée : la relance repart.
      await c.query("reset role");
      await c.query(
        "update public.reply_classifications set follow_up_not_before = now() - interval '1 hour' where id = $1",
        [cl],
      );
      await c.query("set local role service_role");
      await send();
    });
  });

  it("droits : service_role n'efface rien et ne modifie que la validation ; un membre lit seulement ses lignes", async () => {
    await db.query("begin");
    try {
      await db.query("set local role service_role");
      const s = await initialSent(db);
      const m = (await inbound(db, s.id, "<c5@cible.fr>")).rows[0].id as string;
      const cl = (await classify(db, m, s.id)).rows[0].id as string;
      await db.query("savepoint a");
      await expect(
        db.query("update public.reply_classifications set category = 'ambigu' where id = $1", [cl]),
      ).rejects.toThrow(/permission/i);
      await db.query("rollback to savepoint a");
      await expect(
        db.query("delete from public.reply_classifications where id = $1", [cl]),
      ).rejects.toThrow(/permission/i);
      await db.query("rollback to savepoint a");
      await db.query("update public.reply_classifications set validated_by = $2 where id = $1", [
        cl,
        userId,
      ]);
      await db.query("update public.inbound_messages set classified_at = now() where id = $1", [m]);
      await db.query("reset role");
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
      expect((await db.query("select 1 from public.reply_classifications")).rowCount).toBe(1);
      await db.query("savepoint b");
      await expect(classify(db, m, s.id)).rejects.toThrow(/permission/i);
      await db.query("rollback to savepoint b");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: "00000000-0000-4000-8000-000000000009", role: "authenticated" }),
      ]);
      expect((await db.query("select 1 from public.reply_classifications")).rowCount).toBe(0);
    } finally {
      await db.query("rollback");
    }
  });
});
