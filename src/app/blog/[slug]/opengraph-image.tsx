import { articleOgImage, OG_ALT, OG_CONTENT_TYPE, OG_SIZE } from "@/features/content/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return articleOgImage("blog", (await params).slug);
}
