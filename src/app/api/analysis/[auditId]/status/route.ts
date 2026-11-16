import { NextResponse } from "next/server";
import { loadAnalysisSnapshot } from "@/features/analysis/status";
import { UUID_RE } from "@/features/shell/next-step";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * État d'une analyse pour l'écran « Analyse en cours » (MU.3), interrogé toutes les 3 secondes.
 * Lecture seule avec la session de la personne (RLS) : un audit d'un autre espace répond 404.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await ctx.params;
  if (!UUID_RE.test(auditId)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const snapshot = await loadAnalysisSnapshot(supabase, auditId);
  if (!snapshot) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
