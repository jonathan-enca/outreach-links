import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M5.2 : inbox, brouillons de réponse, politique payant. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `inbox_test_${process.pid}_${Date.now()}`;
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

describe.skipIf(!adminUrl)("inbox : contraintes en base", () => {
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

  async function reply(c: Client) {
    const s = await initialSent(c);
    const m = (await inbound(c, s.id, `<r${++seq}@cible.fr>`)).rows[0].id as string;
    return { sent: s.id, inbound: m };
  }
  const draft = (
    c: Client,
    r: { sent: string; inbound: string },
    o: Record<string, unknown> = {},
  ) => {
    const v = {
      kind: "reponse",
      body: "Bonjour",
      insertion: null,
      payment_option: null,
      budget_cap_eur: null,
      link_nature: null,
      status: "brouillon",
      ...o,
    };
    return c.query(
      `insert into public.reply_drafts (workspace_id, inbound_message_id, sent_message_id, kind, body,
         insertion, payment_option, budget_cap_eur, link_nature, status, source, validated_by, validated_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, 'modele', $11, $12) returning id`,
      [
        workspaceId,
        r.inbound,
        r.sent,
        v.kind,
        v.body,
        v.insertion ? JSON.stringify(v.insertion) : null,
        v.payment_option,
        v.budget_cap_eur,
        v.link_nature,
        v.status,
        v.status === "validee" ? userId : null,
        v.status === "validee" ? new Date().toISOString() : null,
      ],
    );
  };
  const rejects = async (c: Client, p: () => Promise<unknown>, re: RegExp) => {
    await c.query("savepoint s");
    await expect(p()).rejects.toThrow(re);
    await c.query("rollback to savepoint s");
  };

  it("un brouillon par message et par nature ; « prêt à insérer » exige l'insertion", async () => {
    await inTx(async (c) => {
      const r = await reply(c);
      await draft(c, r);
      await rejects(c, () => draft(c, r), /unique|duplicate/i);
      await rejects(
        c,
        () => draft(c, r, { kind: "pret_a_inserer" }),
        /reply_drafts_insertion_required/,
      );
      await rejects(
        c,
        () => draft(c, r, { insertion: { a: 1 } }),
        /reply_drafts_insertion_required/,
      );
      await draft(c, r, {
        kind: "pret_a_inserer",
        insertion: {
          page_url: "https://x.fr/",
          anchor: "a",
          sentence_to_add: "b",
          sentence_after: "c",
        },
      });
    });
  });

  it("achat plafonné : plafond et libellé sponsorisé obligatoires, sinon aucun plafond", async () => {
    await inTx(async (c) => {
      const r = await reply(c);
      await rejects(c, () => draft(c, r, { payment_option: "achat_plafonne" }), /purchase_rules/);
      await rejects(
        c,
        () =>
          draft(c, r, {
            payment_option: "achat_plafonne",
            budget_cap_eur: 50,
            link_nature: "echange",
          }),
        /purchase_rules/,
      );
      await rejects(
        c,
        () => draft(c, r, { payment_option: "decliner", budget_cap_eur: 50 }),
        /purchase_rules/,
      );
      await rejects(
        c,
        () =>
          draft(c, r, {
            payment_option: "achat_plafonne",
            budget_cap_eur: 0,
            link_nature: "sponsorise",
          }),
        /check/i,
      );
      await draft(c, r, {
        payment_option: "achat_plafonne",
        budget_cap_eur: 50,
        link_nature: "sponsorise",
      });
    });
  });

  it("validation : auteur obligatoire ; un brouillon validé ou rejeté est figé", async () => {
    await inTx(async (c) => {
      const r = await reply(c);
      const id = (await draft(c, r)).rows[0].id as string;
      await rejects(
        c,
        () => c.query("update public.reply_drafts set status = 'validee' where id = $1", [id]),
        /validated_has_author/,
      );
      await c.query(
        "update public.reply_drafts set status = 'validee', validated_by = $2, validated_at = now() where id = $1",
        [id, userId],
      );
      await rejects(
        c,
        () => c.query("update public.reply_drafts set body = 'autre' where id = $1", [id]),
        /figé/,
      );
      await rejects(
        c,
        () => c.query("update public.reply_drafts set status = 'brouillon' where id = $1", [id]),
        /figé/,
      );
    });
  });

  it("droits : jamais de delete ; le contenu rattaché (sent_message_id) n'est pas modifiable", async () => {
    await inTx(async (c) => {
      const r = await reply(c);
      const id = (await draft(c, r)).rows[0].id as string;
      await rejects(
        c,
        () => c.query("delete from public.reply_drafts where id = $1", [id]),
        /permission/i,
      );
      await rejects(
        c,
        () => c.query("update public.reply_drafts set source = 'llm' where id = $1", [id]),
        /permission/i,
      );
      await rejects(c, () => c.query("delete from public.inbox_states"), /permission/i);
    });
  });

  it("état de fil : un seul par envoi, valeurs contraintes ; autonomie : manuel ou assisté seulement", async () => {
    await inTx(async (c) => {
      const r = await reply(c);
      await c.query(
        "insert into public.inbox_states (sent_message_id, workspace_id, state) values ($1, $2, 'gagne')",
        [r.sent, workspaceId],
      );
      await rejects(
        c,
        () =>
          c.query(
            "insert into public.inbox_states (sent_message_id, workspace_id, state) values ($1, $2, 'archive')",
            [r.sent, workspaceId],
          ),
        /unique|duplicate/i,
      );
      await c.query("update public.inbox_states set state = 'archive' where sent_message_id = $1", [
        r.sent,
      ]);
      await rejects(
        c,
        () =>
          c.query("update public.inbox_states set state = 'zzz' where sent_message_id = $1", [
            r.sent,
          ]),
        /check/i,
      );
      const def = await c.query("select autonomy_level from public.workspaces where id = $1", [
        workspaceId,
      ]);
      expect(def.rows[0].autonomy_level).toBe("assiste");
      await c.query("update public.workspaces set autonomy_level = 'manuel' where id = $1", [
        workspaceId,
      ]);
      await rejects(
        c,
        () =>
          c.query("update public.workspaces set autonomy_level = 'autopilot' where id = $1", [
            workspaceId,
          ]),
        /check/i,
      );
    });
  });
});
