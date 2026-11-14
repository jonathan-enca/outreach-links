import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** M1.6 : RLS fermée, unicité domaine/période, limitation de débit, coupe-circuit de dépense. */
const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl && process.env.CI) throw new Error("TEST_DATABASE_URL est obligatoire en CI");

const dbName = `public_audit_test_${process.pid}_${Date.now()}`;
const dir = path.resolve(__dirname, "..");
let admin: Client;
let db: Client;

async function asRole<T>(role: "anon" | "authenticated" | "service_role", fn: () => Promise<T>) {
  await db.query("begin");
  try {
    await db.query(`set local role ${role}`);
    return await fn();
  } finally {
    await db.query("rollback");
  }
}

describe.skipIf(!adminUrl)("audit gratuit public : base de données", () => {
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
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName} with (force)`);
    await admin?.end();
  });

  it("anon et authenticated n'accèdent à aucune table publique de l'audit gratuit", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      for (const table of ["public_audits", "public_audit_leads", "rate_limit_hits"]) {
        await expect(asRole(role, () => db.query(`select * from public.${table}`))).rejects.toThrow(
          /permission denied/,
        );
      }
    }
  });

  it("anon ne peut appeler ni la limitation de débit ni le calcul de dépense", async () => {
    await expect(
      asRole("anon", () => db.query("select * from public.rate_limit_hit('b', 'k', 1, 60)")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole("authenticated", () => db.query("select public.public_audit_spend_since(now())")),
    ).rejects.toThrow(/permission denied/);
  });

  it("une seule exécution par domaine et par période", async () => {
    await db.query(
      "insert into public.public_audits (domain, period_key) values ('a.fr', '2026-11')",
    );
    await expect(
      db.query("insert into public.public_audits (domain, period_key) values ('a.fr', '2026-11')"),
    ).rejects.toThrow(/duplicate key/);
    // Autre période ou autre domaine : autorisé.
    await db.query(
      "insert into public.public_audits (domain, period_key) values ('a.fr', '2026-12')",
    );
    await db.query(
      "insert into public.public_audits (domain, period_key) values ('b.fr', '2026-11')",
    );
  });

  it("refuse un statut ou une période invalides", async () => {
    await expect(
      db.query(
        "insert into public.public_audits (domain, period_key, status) values ('c.fr', '2026-11', 'x')",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.query("insert into public.public_audits (domain, period_key) values ('d.fr', 'nov')"),
    ).rejects.toThrow(/check constraint/);
  });

  it("un même email ne demande qu'une fois le même rapport ; l'email est en minuscules", async () => {
    const a = await db.query("select id from public.public_audits where domain = 'b.fr'");
    const id = a.rows[0].id as string;
    const insert =
      "insert into public.public_audit_leads (public_audit_id, email, access_token) values ($1, $2, $3)";
    await db.query(insert, [id, "x@example.com", "t".repeat(40)]);
    await expect(db.query(insert, [id, "x@example.com", "u".repeat(40)])).rejects.toThrow(
      /duplicate key/,
    );
    await expect(db.query(insert, [id, "Y@Example.com", "v".repeat(40)])).rejects.toThrow(
      /check constraint/,
    );
  });

  it("limitation de débit : autorise jusqu'à la limite puis refuse avec un délai", async () => {
    const hit = async (key: string) =>
      (await db.query("select * from public.rate_limit_hit('test', $1, 3, 3600)", [key])).rows[0];
    expect((await hit("ip1")).allowed).toBe(true);
    expect((await hit("ip1")).allowed).toBe(true);
    const third = await hit("ip1");
    expect(third.allowed).toBe(true);
    expect(third.hits).toBe(3);
    const fourth = await hit("ip1");
    expect(fourth.allowed).toBe(false);
    expect(fourth.retry_after_seconds).toBeGreaterThan(0);
    expect(fourth.retry_after_seconds).toBeLessThanOrEqual(3600);
    // Une autre clé ou un autre seau n'est pas affecté.
    expect((await hit("ip2")).allowed).toBe(true);
    const other = await db.query("select * from public.rate_limit_hit('autre', 'ip1', 1, 60)");
    expect(other.rows[0].allowed).toBe(true);
  });

  it("limitation de débit : les appels hors fenêtre ne comptent plus", async () => {
    const q = "select * from public.rate_limit_hit('fenetre', 'k', 1, 60)";
    await db.query(q);
    expect((await db.query(q)).rows[0].allowed).toBe(false);
    await db.query(
      "update public.rate_limit_hits set created_at = now() - interval '2 minutes' where bucket = 'fenetre'",
    );
    expect((await db.query(q)).rows[0].allowed).toBe(true);
  });

  it("service_role appelle la limitation de débit", async () => {
    const r = await asRole("service_role", () =>
      db.query("select * from public.rate_limit_hit('sr', 'k', 1, 60)"),
    );
    expect(r.rows[0].allowed).toBe(true);
  });

  it("dépense gratuite : somme les coûts des audits publics depuis une date, rien d'autre", async () => {
    const a = await db.query("select id from public.public_audits where domain = 'a.fr' limit 1");
    const id = a.rows[0].id as string;
    await db.query(
      `insert into public.cost_ledger (provider, operation, estimated_cost_usd, actual_cost_usd, public_audit_id)
       values ('dataforseo', 'serp.organic.live', 0.006, 0.0061, $1), ('dataforseo', 'labs.ranked_keywords', 0.02, null, $1)`,
      [id],
    );
    // Hors audit public : ne compte pas.
    await db.query(
      "insert into public.cost_ledger (provider, operation, estimated_cost_usd) values ('dataforseo', 'x', 9)",
    );
    // Ancien : hors fenêtre.
    await db.query(
      `insert into public.cost_ledger (provider, operation, estimated_cost_usd, public_audit_id, created_at)
       values ('dataforseo', 'old', 5, $1, now() - interval '3 days')`,
      [id],
    );
    const r = await db.query(
      "select public.public_audit_spend_since(now() - interval '1 day') as spend",
    );
    expect(Number(r.rows[0].spend)).toBeCloseTo(0.0261, 6);
  });

  it("service_role écrit les audits publics et le journal des coûts rattaché", async () => {
    await asRole("service_role", async () => {
      const r = await db.query(
        "insert into public.public_audits (domain, period_key) values ('sr.fr', '2026-11') returning id",
      );
      await db.query(
        "insert into public.cost_ledger (provider, operation, public_audit_id) values ('x', 'y', $1)",
        [r.rows[0].id],
      );
    });
  });
});
