import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Client Supabase simulé en mémoire pour les tests (select / insert / update / delete,
 * filtres eq, neq, in, is et gte, order, limit, single). Ce n'est PAS une base : les contraintes
 * réelles (RLS, index uniques) sont testées sur Postgres dans supabase/tests.
 * `hooks.uniqueActivePerSite` reproduit l'index unique des audits actifs.
 */
type Row = Record<string, unknown>;

export function fakeSupabase(
  initial: Record<string, Row[]> = {},
  opts: {
    userId?: string | null;
    uniqueActivePerSite?: boolean;
    rpc?: (
      name: string,
      args: unknown,
    ) => { data: unknown; error: { code?: string; message: string } | null };
  } = {},
) {
  const tables: Record<string, Row[]> = {};
  for (const [k, v] of Object.entries(initial)) tables[k] = v.map((r) => ({ ...r }));
  let seq = 0;
  const log: { table: string; op: string; payload?: unknown }[] = [];
  const ACTIVE = ["en_attente", "estime", "confirme", "en_cours"];

  function from(table: string) {
    tables[table] ??= [];
    let op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
    let conflictCol = "";
    let payload: unknown;
    const filters: ((r: Row) => boolean)[] = [];
    let orderBy: { col: string; asc: boolean } | null = null;
    let max: number | null = null;
    let offset = 0;
    let wantsRows = false;

    const exec = () => {
      const rows = tables[table]!;
      if (op === "upsert") {
        const item = payload as Row;
        const found = rows.find((r) => r[conflictCol] === item[conflictCol]);
        if (found) Object.assign(found, item);
        else rows.push({ id: `${table}-${++seq}`, ...item });
        return { data: [found ?? rows[rows.length - 1]], error: null };
      }
      if (op === "insert") {
        const items = (Array.isArray(payload) ? payload : [payload]) as Row[];
        const created: Row[] = [];
        for (const item of items) {
          const row: Row = { id: `${table}-${++seq}`, ...item };
          if (
            table === "audits" &&
            opts.uniqueActivePerSite &&
            ACTIVE.includes(String(row.status)) &&
            rows.some((r) => r.site_id === row.site_id && ACTIVE.includes(String(r.status)))
          ) {
            return { data: null, error: { code: "23505", message: "duplicate key" } };
          }
          const dupKey =
            (table === "stripe_events" && rows.some((r) => r.id === row.id)) ||
            (table === "credits_ledger" &&
              row.idempotency_key != null &&
              rows.some(
                (r) =>
                  r.workspace_id === row.workspace_id && r.idempotency_key === row.idempotency_key,
              ));
          if (dupKey) return { data: null, error: { code: "23505", message: "duplicate key" } };
          rows.push(row);
          created.push(row);
        }
        return { data: created, error: null };
      }
      const matched = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "update") {
        for (const r of matched) Object.assign(r, payload as Row);
        return { data: matched, error: null };
      }
      if (op === "delete") {
        tables[table] = rows.filter((r) => !matched.includes(r));
        return { data: matched, error: null };
      }
      let out = [...matched];
      if (orderBy) {
        const { col, asc } = orderBy;
        out.sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1));
      }
      if (max !== null) out = out.slice(offset, offset + max);
      else if (offset) out = out.slice(offset);
      // Jointure `sites(domain)` utilisée par beginDiscovery.
      if (table === "audits") {
        out = out.map((r) => ({
          ...r,
          sites: (tables.sites ?? []).find((s) => s.id === r.site_id) ?? null,
        }));
      }
      return { data: out, error: null };
    };

    const chain: Record<string, unknown> = {};
    const one = (nullable: boolean) => {
      const res = exec();
      if (res.error) return res;
      const first = (res.data as Row[])[0];
      if (!first && !nullable)
        return { data: null, error: { code: "PGRST116", message: "0 rows" } };
      return { data: first ?? null, error: null };
    };
    chain.select = () => {
      wantsRows = true;
      return chain;
    };
    chain.insert = (p: unknown) => {
      op = "insert";
      payload = p;
      log.push({ table, op, payload: p });
      return chain;
    };
    chain.upsert = (p: unknown, o?: { onConflict?: string }) => {
      op = "upsert";
      payload = p;
      conflictCol = o?.onConflict ?? "id";
      log.push({ table, op, payload: p });
      return chain;
    };
    chain.update = (p: unknown) => {
      op = "update";
      payload = p;
      log.push({ table, op, payload: p });
      return chain;
    };
    chain.delete = () => {
      op = "delete";
      log.push({ table, op });
      return chain;
    };
    chain.eq = (col: string, val: unknown) => {
      filters.push((r) => r[col] === val);
      return chain;
    };
    chain.neq = (col: string, val: unknown) => {
      filters.push((r) => r[col] !== val);
      return chain;
    };
    chain.in = (col: string, vals: unknown[]) => {
      filters.push((r) => vals.includes(r[col]));
      return chain;
    };
    chain.is = (col: string, val: unknown) => {
      filters.push((r) => (r[col] ?? null) === val);
      return chain;
    };
    chain.gte = (col: string, val: unknown) => {
      filters.push((r) => String(r[col]) >= String(val));
      return chain;
    };
    chain.lte = (col: string, val: unknown) => {
      filters.push((r) => r[col] != null && String(r[col]) <= String(val));
      return chain;
    };
    chain.order = (col: string, o?: { ascending?: boolean }) => {
      orderBy = { col, asc: o?.ascending !== false };
      return chain;
    };
    chain.limit = (n: number) => {
      max = n;
      return chain;
    };
    chain.range = (from: number, to: number) => {
      offset = from;
      max = to - from + 1;
      return chain;
    };
    chain.single = async () => one(false);
    chain.maybeSingle = async () => one(true);
    chain.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => {
      const res = exec();
      // Sans select(), insert/update/delete ne renvoient pas de lignes.
      const shaped = !wantsRows && op !== "select" ? { data: null, error: res.error } : res;
      return Promise.resolve(shaped).then(ok, ko);
    };
    return chain;
  }

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: opts.userId === null ? null : { id: opts.userId ?? "user-1" } },
      }),
    },
    from,
    rpc: async (name: string, args: unknown) =>
      opts.rpc ? opts.rpc(name, args) : { data: null, error: { message: "rpc non simulée" } },
  } as unknown as SupabaseClient<Database>;
  return { client, tables, log };
}
