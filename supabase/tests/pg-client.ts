import type { Client } from "pg";

/**
 * Mini client « façon supabase-js » posé sur une VRAIE base Postgres (contraintes, clés uniques,
 * `on conflict` réels). La base simulée des tests unitaires ne connaît aucune contrainte : c'est ce qui
 * a laissé passer la panne de « Lire d'autres sites » du 17/11/2026. Couvre seulement ce que le code de
 * la lecture de la réserve utilise : select (count, head), update, upsert, eq, neq, in, range, limit,
 * maybeSingle.
 */
type Filter = { sql: (n: number) => string; params: unknown[] };
interface State {
  table: string;
  op: "select" | "update" | "upsert";
  cols: string;
  count: boolean;
  head: boolean;
  returning: boolean;
  filters: Filter[];
  values: Record<string, unknown> | Record<string, unknown>[] | null;
  onConflict: string | null;
  from: number | null;
  to: number | null;
  limit: number | null;
  single: boolean;
}

type Result = { data: unknown; error: { message: string } | null; count: number | null };

const param = (v: unknown) =>
  v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)
    ? JSON.stringify(v)
    : v;

class Query implements PromiseLike<Result> {
  private s: State;
  constructor(
    private db: Client,
    table: string,
  ) {
    this.s = {
      table,
      op: "select",
      cols: "*",
      count: false,
      head: false,
      returning: false,
      filters: [],
      values: null,
      onConflict: null,
      from: null,
      to: null,
      limit: null,
      single: false,
    };
  }
  select(cols = "*", opts?: { count?: "exact"; head?: boolean }) {
    if (this.s.op === "select") this.s.cols = cols;
    else this.s.returning = true;
    this.s.count = Boolean(opts?.count);
    this.s.head = Boolean(opts?.head);
    return this;
  }
  update(values: Record<string, unknown>) {
    this.s.op = "update";
    this.s.values = values;
    return this;
  }
  upsert(values: Record<string, unknown>[], opts: { onConflict: string }) {
    this.s.op = "upsert";
    this.s.values = values;
    this.s.onConflict = opts.onConflict;
    return this;
  }
  private f(col: string, op: string, v: unknown) {
    this.s.filters.push({ sql: (n) => `"${col}" ${op} $${n}`, params: [param(v)] });
    return this;
  }
  eq(col: string, v: unknown) {
    return this.f(col, "=", v);
  }
  neq(col: string, v: unknown) {
    return this.f(col, "<>", v);
  }
  in(col: string, vs: readonly unknown[]) {
    this.s.filters.push({ sql: (n) => `"${col}" = any($${n})`, params: [vs] });
    return this;
  }
  range(a: number, b: number) {
    this.s.from = a;
    this.s.to = b;
    return this;
  }
  limit(n: number) {
    this.s.limit = n;
    return this;
  }
  maybeSingle() {
    this.s.single = true;
    return this;
  }
  private async run(): Promise<Result> {
    const s = this.s;
    const params: unknown[] = [];
    const where = () => {
      const parts = s.filters.map((f) => {
        const sql = f.sql(params.length + 1);
        params.push(...f.params);
        return sql;
      });
      return parts.length ? ` where ${parts.join(" and ")}` : "";
    };
    let sql: string;
    if (s.op === "select") {
      sql = s.head ? "select count(*)::int as n" : `select ${s.cols}`;
      sql += ` from public.${s.table}${where()}`;
      if (s.from !== null) sql += ` offset ${s.from} limit ${(s.to ?? s.from) - s.from + 1}`;
      else if (s.limit !== null) sql += ` limit ${s.limit}`;
    } else if (s.op === "update") {
      const vals = s.values as Record<string, unknown>;
      const sets = Object.entries(vals).map(([k, v]) => {
        params.push(param(v));
        return `"${k}" = $${params.length}`;
      });
      sql = `update public.${s.table} set ${sets.join(", ")}${where()}`;
      if (s.returning) sql += " returning *";
    } else {
      const rows = s.values as Record<string, unknown>[];
      const cols = Object.keys(rows[0]);
      const tuples = rows.map(
        (r) =>
          `(${cols
            .map((c) => {
              params.push(param(r[c]));
              return `$${params.length}`;
            })
            .join(", ")})`,
      );
      const conflict = s.onConflict!.split(",").map((c) => c.trim());
      const upd = cols.filter((c) => !conflict.includes(c)).map((c) => `"${c}" = excluded."${c}"`);
      sql = `insert into public.${s.table} (${cols.map((c) => `"${c}"`).join(", ")}) values ${tuples.join(", ")} on conflict (${conflict.join(", ")}) do update set ${upd.join(", ")}`;
      if (s.returning) sql += " returning *";
    }
    try {
      const res = await this.db.query(sql, params);
      if (s.op === "select" && s.head) {
        return { data: null, error: null, count: res.rows[0].n as number };
      }
      const data = s.single ? (res.rows[0] ?? null) : res.rows;
      return { data, error: null, count: s.count ? res.rowCount : null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message }, count: null };
    }
  }
  then<A = Result, B = never>(
    ok?: ((v: Result) => A | PromiseLike<A>) | null,
    ko?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.run().then(ok, ko);
  }
}

/** Client « supabase-js » minimal sur une vraie base (à caster en `SupabaseClient` dans les tests). */
export function pgSupabase(db: Client) {
  return { from: (table: string) => new Query(db, table) };
}
