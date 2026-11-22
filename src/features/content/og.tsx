import { ImageResponse } from "next/og";
import { t } from "@/lib/messages";
import { findPublished } from "./loader";
import type { Section } from "./schema";

/** Images de partage (Open Graph) : sobres, aux couleurs du site, produites à la demande par `next/og`. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
export const OG_ALT = `${t.app.name} : ${t.content.og.tagline}`;

const INK = "#0f172a";
const NAVY = "#003070";
const SKY = "#5cc8f5";

function LogoMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="9" fill={NAVY} />
      <g fill="none" strokeWidth="2.4" strokeLinecap="round" transform="translate(4 4)">
        <path d="M9 17H7A5 5 0 0 1 7 7h2M8 12h8" stroke="#ffffff" />
        <path d="M15 7h2a5 5 0 1 1 0 10h-2" stroke={SKY} />
      </g>
    </svg>
  );
}

/** `label` : la rubrique ou le thème, en petit au-dessus du titre. */
export function ogImage(title: string, label?: string): ImageResponse {
  const fontSize = title.length > 90 ? 52 : title.length > 60 ? 60 : 70;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        backgroundImage: "linear-gradient(180deg, #eef6ff 0%, #ffffff 70%)",
        color: INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <LogoMark size={64} />
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.01em" }}>{t.app.name}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {label ? (
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: NAVY }}>{label}</div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontSize,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ display: "flex", height: 10, width: 160, borderRadius: 999, background: NAVY }} />
    </div>,
    OG_SIZE,
  );
}

/** Image d'un contenu en ligne ; 404 s'il ne l'est pas (brouillon, programmé, inconnu). */
export function articleOgImage(section: Section, slug: string): Response {
  const entry = findPublished(section, slug);
  if (!entry) return new Response("Not found", { status: 404 });
  return ogImage(entry.meta.title, t.content.themes[entry.meta.theme]);
}
