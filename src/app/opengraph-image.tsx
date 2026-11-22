import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/features/content/og";
import { t } from "@/lib/messages";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Image de partage par défaut du site. */
export default function Image() {
  return ogImage(t.content.og.tagline);
}
