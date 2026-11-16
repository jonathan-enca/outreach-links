import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * MT.6 : présentation choisie par l'utilisateur (`sites.founder_role`) et brief du rédacteur
 * (`plan_item_briefs`). Vérifie aussi que les lignes écrites par « Valider ces demandes » (plan, triage,
 * contacts, tâches, briefs) respectent les contraintes des tables que rédaction et lots lisent.
 */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `targets_test_${process.pid}_${Date.now()}`;
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

async function signUp(email: string) {
  const u = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  const userId = u.rows[0].id as string;
  const m = await db.query("select workspace_id from public.memberships where user_id = $1", [
    userId,
  ]);
  return { userId, workspaceId: m.rows[0].workspace_id as string };
}

describe.skipIf(!adminUrl)(
  "écran « Vos cibles » : présentation, briefs et pont vers le plan",
  () => {
    let alice: { userId: string; workspaceId: string };
    let bob: { userId: string; workspaceId: string };
    let siteId: string;
    let auditId: string;
    let targetId: string;

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
      siteId = (
        await db.query(
          "insert into public.sites (workspace_id, domain) values ($1, 'alice-site.fr') returning id",
          [alice.workspaceId],
        )
      ).rows[0].id;
      auditId = (
        await db.query(
          `insert into public.audits (workspace_id, site_id, queries, max_competitors, cost_cap_usd)
         values ($1, $2, array['coloriage'], 10, 2) returning id`,
          [alice.workspaceId, siteId],
        )
      ).rows[0].id;
      const collectionId = (
        await db.query(
          `insert into public.candidate_collections (audit_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, target_usd, status)
         values ($1, $2, $3, '{}'::jsonb, 0.3, 0.5, 0.55, 'termine') returning id`,
          [auditId, alice.workspaceId, siteId],
        )
      ).rows[0].id;
      const qrunId = (
        await db.query(
          `insert into public.qualification_runs (audit_id, collection_id, workspace_id, site_id, plan, expected_cost_usd, worst_case_usd, budget_usd, status)
         values ($1, $2, $3, $4, '{"model":"m","budgetUsd":0.1}'::jsonb, 0.05, 0.08, 0.1, 'termine') returning id`,
          [auditId, collectionId, alice.workspaceId, siteId],
        )
      ).rows[0].id;
      targetId = (
        await db.query(
          `insert into public.qualified_targets (run_id, audit_id, workspace_id, domain, tactics, status, stage_reached, exclusion_reason)
         values ($1, $2, $3, 'asso.fr', array['mentions'], 'exclu', 5, 'sans_contact') returning id`,
          [qrunId, auditId, alice.workspaceId],
        )
      ).rows[0].id;
    });

    afterAll(async () => {
      await db?.end();
      await admin?.query(`drop database if exists ${dbName}`);
      await admin?.end();
    });

    it("founder_role : vide par défaut, trois valeurs seulement", async () => {
      await inTx(async (c) => {
        const r = await c.query("select founder_role, founder_confirmed_at from public.sites");
        expect(r.rows[0]).toEqual({ founder_role: null, founder_confirmed_at: null });
        for (const ok of ["fondateur", "equipe", "agence"]) {
          await c.query("update public.sites set founder_role = $1", [ok]);
        }
        await c.query("savepoint a");
        await expect(c.query("update public.sites set founder_role = 'ceo'")).rejects.toThrow(
          /check|violates/i,
        );
        await c.query("rollback to savepoint a");
      });
    });

    it("un membre met à jour la présentation de son site, pas celle d'un autre espace", async () => {
      await inTx(async (c) => {
        await c.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: bob.userId, role: "authenticated" }),
        ]);
        await c.query("set local role authenticated");
        const r = await c.query("update public.sites set founder_role = 'fondateur' returning id");
        expect(r.rowCount).toBe(0);
        await c.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: alice.userId, role: "authenticated" }),
        ]);
        const ok = await c.query(
          "update public.sites set founder_role = 'equipe', founder_confirmed_at = now() returning id",
        );
        expect(ok.rowCount).toBe(1);
      });
    });

    /** Reproduit l'écriture de `validateRequests` pour une demande (plan -> triage -> contacts -> brief). */
    async function writeBridge(
      c: Client,
      o: { contact?: "email_verifie" | "email_a_verifier" | "formulaire"; badBrief?: boolean } = {},
    ) {
      await c.query("set local role service_role");
      const items = [
        {
          type: "lien_mort",
          source_domain: "asso.fr",
          source_url: "https://asso.fr/liens",
          url_exact: true,
          target_page_url: "https://alice-site.fr/guide",
          anchor_kind: "descriptive",
          anchor_text: "guide",
          expected_link_type: "reprise_lien_mort",
          offer: null,
          rationale: "Blog de classe",
          priority: "haute",
          priority_score: 98,
          broken_url: "https://vieux.fr/x",
        },
      ];
      const plan = await c.query("select * from public.create_link_plan($1, $2, $3::jsonb)", [
        auditId,
        alice.userId,
        JSON.stringify(items),
      ]);
      const planId = plan.rows[0].plan_id as string;
      const item = (
        await c.query("select id from public.link_plan_items where plan_id = $1", [planId])
      ).rows[0].id as string;
      await c.query(
        `insert into public.link_plan_triage_runs (plan_id, workspace_id, status, requested_by, finished_at)
       values ($1, $2, 'termine', $3, now())`,
        [planId, alice.workspaceId, alice.userId],
      );
      await c.query(
        `insert into public.contact_runs (plan_id, workspace_id, status, requested_by, finished_at)
       values ($1, $2, 'termine', $3, now())`,
        [planId, alice.workspaceId, alice.userId],
      );
      await c.query(
        `insert into public.link_target_triage (plan_item_id, plan_id, workspace_id, verdict, reason, needs_review, source, resolved_url, url_status, url_origin, hook, page_title)
       values ($1, $2, $3, 'ok', 'Retenue', false, 'llm', 'https://asso.fr/liens', 200, 'recherche', 'Une phrase', 'Liens')`,
        [item, planId, alice.workspaceId],
      );
      const kind = o.contact ?? "email_verifie";
      await c.query(
        `insert into public.target_contacts (plan_item_id, plan_id, workspace_id, status, email, email_source, verification, contact_url, form_url, reason, sendable)
       values ($1, $2, $3, $4, $5, $6, $7, null, $8, 'Contact', $9)`,
        [
          item,
          planId,
          alice.workspaceId,
          kind,
          kind === "formulaire" ? null : "contact@asso.fr",
          kind === "formulaire" ? null : "page",
          kind === "email_verifie" ? "valide" : "non_verifie",
          kind === "formulaire" ? "https://asso.fr/contact" : null,
          kind === "email_verifie",
        ],
      );
      if (kind === "formulaire") {
        await c.query(
          `insert into public.manual_tasks (plan_item_id, plan_id, workspace_id, type, form_url)
         values ($1, $2, $3, 'formulaire', 'https://asso.fr/contact')`,
          [item, planId, alice.workspaceId],
        );
      }
      await c.query(
        `insert into public.plan_item_briefs (plan_item_id, plan_id, workspace_id, target_id, kind, quote, brief, request_lines, presentation)
       values ($1, $2, $3, $4, 'lien_mort', 'Une phrase', $5::jsonb, $6, 'equipe')`,
        [
          item,
          planId,
          alice.workspaceId,
          targetId,
          JSON.stringify({ opening: "Votre page" }),
          o.badBrief ? ["a", "b"] : ["a", "b", "c"],
        ],
      );
      return { planId, item };
    }

    it("les lignes du pont satisfont les contraintes du plan, du triage, des contacts et du brief", async () => {
      for (const contact of ["email_verifie", "email_a_verifier", "formulaire"] as const) {
        await inTx(async (c) => {
          const { planId } = await writeBridge(c, { contact });
          const r = await c.query(
            "select count(*)::int as n from public.plan_item_briefs where plan_id = $1",
            [planId],
          );
          expect(r.rows[0].n).toBe(1);
        });
      }
    });

    it("un brief sans trois lignes, une présentation inconnue ou un type inconnu : refusés", async () => {
      await inTx(async (c) => {
        await c.query("savepoint a");
        await expect(writeBridge(c, { badBrief: true })).rejects.toThrow(/check|violates/i);
        await c.query("rollback to savepoint a");
        await c.query("reset role");
        const { item, planId } = await writeBridge(c);
        for (const bad of [
          "update public.plan_item_briefs set presentation = 'ceo'",
          "update public.plan_item_briefs set kind = 'autre'",
          "update public.plan_item_briefs set brief = '[]'::jsonb",
        ]) {
          await c.query("savepoint b");
          await expect(c.query(bad), bad).rejects.toThrow(/check|violates/i);
          await c.query("rollback to savepoint b");
        }
        expect(item).toBeTruthy();
        expect(planId).toBeTruthy();
      });
    });

    it("lecture par les membres de l'espace seulement ; aucune écriture côté utilisateur", async () => {
      await inTx(async (c) => {
        await writeBridge(c);
        await c.query("reset role");
        await c.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: alice.userId, role: "authenticated" }),
        ]);
        await c.query("set local role authenticated");
        expect((await c.query("select * from public.plan_item_briefs")).rowCount).toBe(1);
        await c.query("savepoint a");
        await expect(c.query("update public.plan_item_briefs set quote = 'x'")).rejects.toThrow(
          /permission denied/,
        );
        await c.query("rollback to savepoint a");
        await c.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: bob.userId, role: "authenticated" }),
        ]);
        expect((await c.query("select * from public.plan_item_briefs")).rowCount).toBe(0);
      });
    });

    it("la cible supprimée laisse le brief (référence mise à nul), le plan supprimé l'emporte", async () => {
      await inTx(async (c) => {
        const { planId } = await writeBridge(c);
        await c.query("reset role");
        await c.query("delete from public.qualified_targets where id = $1", [targetId]);
        const r = await c.query(
          "select target_id from public.plan_item_briefs where plan_id = $1",
          [planId],
        );
        expect(r.rows[0].target_id).toBeNull();
      });
    });
  },
);
