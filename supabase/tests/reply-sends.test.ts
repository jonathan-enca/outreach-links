import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M5.2b : garde-fous EN BASE de l'envoi des réponses. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `reply_sends_test_${process.pid}_${Date.now()}`;
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

describe.skipIf(!adminUrl)("reply_sends : garde-fous en base", () => {
  let workspaceId: string;
  let userId: string;
  let planId: string;
  let draftId: string;
  let mailboxId: string;
  let seq = 0;

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
    userId = (
      await db.query("insert into auth.users (email) values ('a@example.com') returning id")
    ).rows[0].id;
    workspaceId = (
      await db.query("select workspace_id from public.memberships where user_id = $1", [userId])
    ).rows[0].workspace_id;
    const siteId = (
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
    const item = {
      type: "annuaire",
      source_domain: "a.fr",
      target_page_url: "https://alice-site.fr/",
      anchor_kind: "marque",
      anchor_text: "Alice",
      expected_link_type: "editorial",
      rationale: "test",
      priority: "haute",
      priority_score: 80,
    };
    const p = await db.query("select * from public.create_link_plan($1, $2, $3::jsonb)", [
      a.rows[0].id,
      userId,
      JSON.stringify([item]),
    ]);
    planId = p.rows[0].plan_id;
    const itemId = (
      await db.query("select id from public.link_plan_items where plan_id = $1", [planId])
    ).rows[0].id;
    draftId = (
      await db.query(
        `insert into public.target_drafts
           (plan_item_id, plan_id, workspace_id, channel, subject, body, hook, targeting_reason,
            proposed_url, url_status, ready)
         values ($1, $2, $3, 'email', 's', 'corps', 'h', 'r', 'https://alice-site.fr/', 200, true)
         returning id`,
        [itemId, planId, workspaceId],
      )
    ).rows[0].id;
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

  /** Fil complet : lot validé, envoi initial, réponse entrante, classification, brouillon. */
  async function thread(
    c: Client,
    o: { draftStatus?: string; category?: string; from?: string } = {},
  ) {
    let b = (
      await c.query(
        "select b.id from public.batches b join public.batch_items i on i.batch_id = b.id where i.draft_id = $1",
        [draftId],
      )
    ).rows[0]?.id as string | undefined;
    if (!b) {
      b = (
        await c.query(
          "insert into public.batches (plan_id, workspace_id, number) values ($1, $2, $3) returning id",
          [planId, workspaceId, ++seq],
        )
      ).rows[0].id as string;
      await c.query(
        `insert into public.batch_items (batch_id, draft_id, plan_id, workspace_id, position)
         values ($1, $2, $3, $4, 1)`,
        [b, draftId, planId, workspaceId],
      );
      await c.query(
        "update public.batches set status = 'valide', validated_at = now(), validated_by = $2 where id = $1",
        [b, userId],
      );
    }
    // Un seul envoi initial par brouillon : les fils suivants du même test le réutilisent.
    const existing = (
      await c.query("select id from public.sent_messages where draft_id = $1", [draftId])
    ).rows[0]?.id as string | undefined;
    const sent =
      existing ??
      ((
        await c.query(
          `insert into public.sent_messages (workspace_id, plan_id, batch_id, draft_id, mailbox_id,
             dry_run, to_email, subject, body, message_id, status)
           values ($1, $2, $3, $4, $5, false, 'contact@cible.fr', 's', 'corps', $6, 'en_cours')
           returning id`,
          [workspaceId, planId, b, draftId, mailboxId, `<s${++seq}@alice-site.fr>`],
        )
      ).rows[0].id as string);
    const inb = (
      await c.query(
        `insert into public.inbound_messages (workspace_id, mailbox_id, sent_message_id, message_id,
           from_email, kind, match_method, received_at, body_excerpt)
         values ($1, $2, $3, $4, $5, 'reponse', 'en_tete', now(), 'texte') returning id`,
        [workspaceId, mailboxId, sent, `<r${++seq}@cible.fr>`, o.from ?? "Contact@cible.fr"],
      )
    ).rows[0].id as string;
    await c.query(
      `insert into public.reply_classifications (workspace_id, inbound_message_id, sent_message_id,
         category, confidence, justification, source, proposed_action, action_status)
       values ($1, $2, $3, $4, 0.9, 'x', 'regle', 'revue_manuelle', 'proposee')`,
      [workspaceId, inb, sent, o.category ?? "question"],
    );
    const status = o.draftStatus ?? "validee";
    const rd = (
      await c.query(
        `insert into public.reply_drafts (workspace_id, inbound_message_id, sent_message_id, kind, body,
           status, source, validated_by, validated_at)
         values ($1, $2, $3, 'reponse', 'Bonjour', $4, 'modele', $5, $6) returning id`,
        [
          workspaceId,
          inb,
          sent,
          status,
          status === "validee" ? userId : null,
          status === "validee" ? new Date().toISOString() : null,
        ],
      )
    ).rows[0].id as string;
    return { sent, inb, rd, batch: b };
  }

  const send = (
    c: Client,
    t: { sent: string; inb: string; rd: string },
    o: { to?: string; dry?: boolean; mailbox?: string; status?: string } = {},
  ) =>
    c.query(
      `insert into public.reply_sends (workspace_id, reply_draft_id, inbound_message_id,
         sent_message_id, mailbox_id, dry_run, to_email, subject, body, message_id, in_reply_to, status,
         skip_reason)
       values ($1, $2, $3, $4, $5, $6, $7, 'Re: s', 'Bonjour', $8, '<x@cible.fr>', $9, $10)
       returning id`,
      [
        workspaceId,
        t.rd,
        t.inb,
        t.sent,
        o.mailbox ?? mailboxId,
        o.dry ?? true,
        o.to ?? "contact@cible.fr",
        `<out${++seq}@alice-site.fr>`,
        o.status ?? "en_cours",
        o.status === "ignore" ? "test" : null,
      ],
    );
  const rejects = async (c: Client, p: () => Promise<unknown>, re: RegExp) => {
    await c.query("savepoint s");
    await expect(p()).rejects.toThrow(re);
    await c.query("rollback to savepoint s");
  };

  it("accepte une réponse validée vers l'expéditeur, dans la boîte qui l'a reçue", async () => {
    await inTx(async (c) => {
      const t = await thread(c);
      await send(c, t);
    });
  });

  it("refuse un brouillon non validé ou rejeté", async () => {
    await inTx(async (c) => {
      for (const s of ["brouillon", "rejetee"]) {
        const t = await thread(c, { draftStatus: s });
        await rejects(c, () => send(c, t), /non validé/);
      }
    });
  });

  it("refuse un autre destinataire que l'expéditeur, ou une autre boîte", async () => {
    await inTx(async (c) => {
      const t = await thread(c);
      await rejects(c, () => send(c, t, { to: "autre@cible.fr" }), /pas l'expéditeur/);
      const other = (
        await c.query(
          `insert into public.mailboxes (workspace_id, site_id, email, from_name, username, password_enc,
             key_version, smtp_host, smtp_port, imap_host, imap_port, status, smtp_ok, imap_ok)
           select workspace_id, site_id, 'autre@alice-site.fr', 'Jo', 'jo', 'v1.x.y.z', 'v1', 'smtp.x.fr', 587,
             'imap.x.fr', 993, 'verifiee', true, true from public.mailboxes where id = $1 returning id`,
          [mailboxId],
        )
      ).rows[0].id;
      await rejects(c, () => send(c, t, { mailbox: other }), /boîte différente/);
    });
  });

  it("refuse une adresse en suppression et une catégorie à risque", async () => {
    await inTx(async (c) => {
      const t = await thread(c);
      await c.query(
        "insert into public.suppressions (workspace_id, email, reason) values ($1, 'contact@cible.fr', 'desinscription')",
        [workspaceId],
      );
      await rejects(c, () => send(c, t), /suppression/);
    });
    await inTx(async (c) => {
      const t = await thread(c, { category: "plainte_hostile" });
      await rejects(c, () => send(c, t), /catégorie à risque/);
    });
    await inTx(async (c) => {
      const t = await thread(c);
      await c.query(
        "update public.reply_classifications set validated_category = 'desinscription' where inbound_message_id = $1",
        [t.inb],
      );
      await rejects(c, () => send(c, t), /catégorie à risque/);
    });
  });

  it("refuse une boîte suspendue", async () => {
    await inTx(async (c) => {
      const t = await thread(c);
      await c.query("update public.mailboxes set status = 'suspendue' where id = $1", [mailboxId]);
      await rejects(c, () => send(c, t), /non vérifiée|suspendue|check/i);
    });
  });

  it("plafond horaire partagé : envois d'outreach et réponses comptent ensemble", async () => {
    await inTx(async (c) => {
      const t = await thread(c); // 1 envoi initial réel (dry_run false)
      await c.query("update public.sent_messages set dry_run = true where id = $1", [t.sent]);
      // hourly_cap = 2 : l'envoi initial (1) + une réponse (2) puis plus rien.
      await send(c, t);
      const t2 = await thread(c);
      await rejects(c, () => send(c, t2), /plafond horaire/);
    });
  });

  it("une réponse par brouillon et par mode ; un envoi terminé n'est plus modifiable ; pas de delete", async () => {
    await inTx(async (c) => {
      const t = await thread(c);
      const id = (await send(c, t)).rows[0].id as string;
      await rejects(c, () => send(c, t), /unique|duplicate/i);
      await c.query(
        "update public.reply_sends set status = 'simule', sent_at = now() where id = $1",
        [id],
      );
      await rejects(
        c,
        () => c.query("update public.reply_sends set status = 'echec' where id = $1", [id]),
        /terminé/,
      );
      await rejects(
        c,
        () => c.query("delete from public.reply_sends where id = $1", [id]),
        /permission/i,
      );
    });
  });

  it("un enregistrement « ignore » est toujours possible (motif obligatoire)", async () => {
    await inTx(async (c) => {
      const t = await thread(c, { draftStatus: "brouillon" });
      await send(c, t, { status: "ignore" });
    });
  });
});
