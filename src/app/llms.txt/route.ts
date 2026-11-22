import { buildLlmsTxt } from "@/features/content/listing";

/** `/llms.txt` : statique, relu toutes les heures pour suivre les publications programmées. */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
