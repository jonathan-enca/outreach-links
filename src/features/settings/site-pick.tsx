import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Site = Database["public"]["Tables"]["sites"]["Row"];

/** Le site dont on règle les messages ou la boîte : celui de l'adresse (`?site=`), sinon le premier. */
export async function pickSite(
  supabase: SupabaseClient<Database>,
  wanted: string | undefined,
): Promise<{ site: Site | null; sites: Site[] }> {
  const { data } = await supabase
    .from("sites")
    .select("*")
    .order("created_at", { ascending: true });
  const sites = data ?? [];
  return { site: sites.find((s) => s.id === wanted) ?? sites[0] ?? null, sites };
}

/** Choix du site quand la personne en a plusieurs. */
export function SiteTabs({
  sites,
  current,
  base,
}: {
  sites: Site[];
  current: string;
  base: string;
}) {
  if (sites.length < 2) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {sites.map((s) => (
        <Link
          key={s.id}
          href={`${base}?site=${s.id}`}
          aria-current={s.id === current ? "page" : undefined}
          className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
            s.id === current
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card"
          }`}
        >
          {s.domain}
          {s.country ? ` · ${s.country}` : ""}
        </Link>
      ))}
    </div>
  );
}
