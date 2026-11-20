import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState } from "@/features/audits/service";
import { SIGNATURE_ROLES } from "@/features/signature/signature";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
const M = t.settings.yourMessages.errors;

/** 150 Ko au plus (le navigateur réduit l'image avant l'envoi). */
export const LOGO_MAX_BYTES = 150 * 1024;

export interface ParsedLogo {
  mime: "image/png" | "image/jpeg";
  base64: string;
}

/** Lit une image `data:` PNG ou JPEG et vérifie sa signature binaire (jamais de SVG : script possible). */
export function parseLogo(raw: unknown): ParsedLogo | null {
  if (typeof raw !== "string") return null;
  const m = /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/]+=*)$/.exec(raw.trim());
  if (!m) return null;
  const bytes = Buffer.from(m[2]!, "base64");
  if (bytes.length === 0 || bytes.length > LOGO_MAX_BYTES) return null;
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (m[1] === "image/png" ? !png : !jpeg) return null;
  return { mime: m[1] as ParsedLogo["mime"], base64: bytes.toString("base64") };
}

/** « linkedin.com/in/x », « www.linkedin.com/in/x » ou l'adresse complète : rendue en https. */
export function normalizeLinkedin(raw: string): string | null {
  const v = raw.trim().replace(/^https?:\/\//i, "");
  if (!/^([a-z]{2,3}\.)?linkedin\.com\/[^\s]+$/i.test(v) || v.length > 190) return null;
  const [host, ...rest] = v.split("/");
  const path = rest.join("/").replace(/\/+$/, "");
  if (!path) return null;
  return `https://${host!.toLowerCase()}/${path}`;
}

export function normalizePhone(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, " ");
  if (v.length < 6 || v.length > 30 || !/^\+?[0-9 ().-]+$/.test(v)) return null;
  return v;
}

export interface MessageSettingsInput {
  firstName: string;
  lastName: string | null;
  role: (typeof SIGNATURE_ROLES)[number];
  showSite: boolean;
  linkedinUrl: string | null;
  phone: string | null;
  /** "keep" : inchangé ; "remove" : retiré ; sinon la nouvelle image. */
  logo: "keep" | "remove" | ParsedLogo;
}

const on = (fd: FormData, k: string) => fd.get(k) === "on";
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};

export function parseMessageSettings(
  fd: FormData,
): { ok: true; value: MessageSettingsInput } | { ok: false; message: string } {
  const firstName = str(fd, "firstName");
  if (firstName.length < 1 || firstName.length > 60) return { ok: false, message: M.firstName };
  const lastRaw = str(fd, "lastName");
  if (lastRaw.length > 60) return { ok: false, message: M.lastName };
  const role = str(fd, "role");
  if (!(SIGNATURE_ROLES as readonly string[]).includes(role)) return { ok: false, message: M.role };

  let linkedinUrl: string | null = null;
  if (on(fd, "linkedin")) {
    linkedinUrl = normalizeLinkedin(str(fd, "linkedinUrl"));
    if (!linkedinUrl) return { ok: false, message: M.linkedin };
  }
  let phone: string | null = null;
  if (on(fd, "phone")) {
    phone = normalizePhone(str(fd, "phoneNumber"));
    if (!phone) return { ok: false, message: M.phone };
  }
  let logo: MessageSettingsInput["logo"] = "remove";
  if (on(fd, "logo")) {
    const data = str(fd, "logoData");
    if (!data) logo = "keep";
    else {
      const parsed = parseLogo(data);
      if (!parsed) return { ok: false, message: M.logo };
      logo = parsed;
    }
  }
  return {
    ok: true,
    value: {
      firstName,
      lastName: lastRaw || null,
      role: role as MessageSettingsInput["role"],
      showSite: on(fd, "showSite"),
      linkedinUrl,
      phone,
      logo,
    },
  };
}

/**
 * Enregistre les réglages « Vos messages » d'un site. Les champs passent par la RLS et les droits par
 * colonne de l'utilisateur ; le logo est écrit par le serveur, une fois l'accès au site prouvé.
 */
export async function saveSignatureSettings(
  supabase: Client,
  getService: () => Client,
  siteId: string,
  fd: FormData,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: t.settings.messages.unauthenticated };
  const parsed = parseMessageSettings(fd);
  if (!parsed.ok) return { status: "error", message: parsed.message };
  const v = parsed.value;
  const { data, error } = await supabase
    .from("sites")
    .update({
      signature_first_name: v.firstName,
      signature_last_name: v.lastName,
      founder_role: v.role,
      founder_confirmed_at: new Date().toISOString(),
      signature_show_site: v.showSite,
      signature_linkedin_url: v.linkedinUrl,
      signature_phone: v.phone,
    })
    .eq("id", siteId)
    .select("id, signature_logo_token");
  if (error || !data?.length) return { status: "error", message: t.settings.messages.saveError };

  if (v.logo === "keep" || (v.logo === "remove" && !data[0]!.signature_logo_token)) {
    return { status: "ok", message: t.settings.messages.saved };
  }
  const db = getService();
  if (v.logo === "remove") {
    const off = await db.from("sites").update({ signature_logo_token: null }).eq("id", siteId);
    if (off.error) return { status: "error", message: t.settings.messages.saveError };
    await db.from("site_logos").delete().eq("site_id", siteId);
    return { status: "ok", message: t.settings.messages.saved };
  }
  const up = await db.from("site_logos").upsert({
    site_id: siteId,
    mime: v.logo.mime,
    data_base64: v.logo.base64,
    updated_at: new Date().toISOString(),
  });
  if (up.error) return { status: "error", message: t.settings.messages.saveError };
  // Nouveau jeton à chaque logo : l'adresse change, donc aucune messagerie ne garde l'ancien en cache.
  const token = randomBytes(16).toString("hex");
  const set = await db.from("sites").update({ signature_logo_token: token }).eq("id", siteId);
  if (set.error) return { status: "error", message: t.settings.messages.saveError };
  return { status: "ok", message: t.settings.messages.saved };
}
