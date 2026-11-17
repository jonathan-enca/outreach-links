import { createServiceClient } from "@/lib/supabase/service";

/**
 * Logo d'une signature : adresse publique (elle figure dans les messages envoyés), désignée par un
 * jeton aléatoire qui change à chaque nouveau logo. Ne révèle rien d'autre que l'image.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!/^[0-9a-f]{32}$/.test(token)) return new Response(null, { status: 404 });
  const db = createServiceClient();
  const { data: site } = await db
    .from("sites")
    .select("id")
    .eq("signature_logo_token", token)
    .maybeSingle();
  if (!site) return new Response(null, { status: 404 });
  const { data: logo } = await db
    .from("site_logos")
    .select("mime, data_base64")
    .eq("site_id", site.id)
    .maybeSingle();
  if (!logo) return new Response(null, { status: 404 });
  return new Response(Buffer.from(logo.data_base64, "base64"), {
    headers: {
      "Content-Type": logo.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
