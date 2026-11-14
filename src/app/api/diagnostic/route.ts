import { NextResponse, type NextRequest } from "next/server";

// Route TEMPORAIRE : vérifie que les clés de production sont valides (endpoints gratuits).
// Protégée par DIAGNOSTIC_TOKEN. À supprimer après le test.
export const dynamic = "force-dynamic";

async function probe(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function GET(request: NextRequest) {
  const expected = process.env.DIAGNOSTIC_TOKEN;
  if (!expected || request.nextUrl.searchParams.get("token") !== expected) {
    return new NextResponse("Not found", { status: 404 });
  }
  const login = process.env.DATAFORSEO_LOGIN ?? "";
  const password = process.env.DATAFORSEO_PASSWORD ?? "";
  const anthropic = process.env.ANTHROPIC_API_KEY ?? "";
  const dataforseo =
    login && password
      ? await probe("https://api.dataforseo.com/v3/appendix/user_data", {
          Authorization: "Basic " + Buffer.from(`${login}:${password}`).toString("base64"),
        })
      : { ok: false, status: -1 };
  const llm = anthropic
    ? await probe("https://api.anthropic.com/v1/models?limit=1", {
        "x-api-key": anthropic,
        "anthropic-version": "2023-06-01",
      })
    : { ok: false, status: -1 };
  return NextResponse.json({
    dataforseo,
    anthropic: llm,
    placeholders: {
      dataforseo: login === "XXX" || password === "XXX",
      anthropic: anthropic === "XXX",
    },
  });
}
