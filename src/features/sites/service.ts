import type { SupabaseClient } from "@supabase/supabase-js";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { betaEnabled } from "@/features/audits/beta";
import { loadEntitlements, planBlockMessage } from "@/features/billing/entitlements";
import { parseSiteForm, type FieldErrors, type SiteInput } from "./schema";
import { checkOwnership, type PageFetcher } from "./verify";

type Client = SupabaseClient<Database>;

export interface SiteFormState {
  status: "idle" | "error" | "saved";
  errors?: FieldErrors;
  message?: string;
  siteId?: string;
}

export interface VerifyState {
  status: "idle" | "verified" | "failed" | "error";
  message?: string;
}

export const SITE_MESSAGES = t.sites.messages;

function toRow(d: SiteInput) {
  return {
    domain: d.domain,
    niche: d.niche,
    country: d.country,
    language: d.language,
    signature_first_name: d.signatureFirstName,
    offered_asset: d.offeredAsset,
    sender_email: d.senderEmail,
    priority_queries: d.priorityQueries,
  };
}

async function currentUserId(supabase: Client): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function createSite(supabase: Client, formData: FormData): Promise<SiteFormState> {
  const parsed = parseSiteForm(formData);
  if (!parsed.ok) {
    return { status: "error", errors: parsed.errors, message: SITE_MESSAGES.invalid };
  }
  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: SITE_MESSAGES.unauthenticated };

  // La RLS limite aux workspaces dont l'utilisateur est membre.
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!ws) return { status: "error", message: SITE_MESSAGES.noWorkspace };

  // Plafond de sites du forfait (gratuit : 1).
  const ent = await loadEntitlements(supabase, ws.id, new Date(), betaEnabled());
  const { data: owned } = await supabase.from("sites").select("id").eq("workspace_id", ws.id);
  if ((owned?.length ?? 0) >= ent.maxSites) {
    return { status: "error", message: planBlockMessage(ent, "site") };
  }

  const { data, error } = await supabase
    .from("sites")
    .insert({ workspace_id: ws.id, ...toRow(parsed.data) })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") {
      return {
        status: "error",
        errors: { domain: SITE_MESSAGES.duplicate },
        message: SITE_MESSAGES.duplicate,
      };
    }
    return { status: "error", message: SITE_MESSAGES.saveError };
  }
  await supabase.from("events").insert({
    workspace_id: ws.id,
    actor_id: userId,
    type: "site.created",
    payload: { site_id: data.id, domain: parsed.data.domain },
  });
  return { status: "saved", siteId: data.id, message: SITE_MESSAGES.saved };
}

export async function updateSite(
  supabase: Client,
  siteId: string,
  formData: FormData,
): Promise<SiteFormState> {
  const parsed = parseSiteForm(formData);
  if (!parsed.ok) {
    return { status: "error", errors: parsed.errors, message: SITE_MESSAGES.invalid };
  }
  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: SITE_MESSAGES.unauthenticated };

  const { data, error } = await supabase
    .from("sites")
    .update(toRow(parsed.data))
    .eq("id", siteId)
    .select("id, workspace_id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        errors: { domain: SITE_MESSAGES.duplicate },
        message: SITE_MESSAGES.duplicate,
      };
    }
    return { status: "error", message: SITE_MESSAGES.saveError };
  }
  // 0 ligne : site absent ou d'un autre workspace (la RLS masque les deux).
  if (!data) return { status: "error", message: SITE_MESSAGES.notFound };
  await supabase.from("events").insert({
    workspace_id: data.workspace_id,
    actor_id: userId,
    type: "site.updated",
    payload: { site_id: data.id, domain: parsed.data.domain },
  });
  return { status: "saved", siteId: data.id, message: SITE_MESSAGES.saved };
}

/**
 * Vérifie la propriété du domaine. `supabase` = client de l'utilisateur (la RLS
 * garantit qu'il est membre) ; `getServiceClient` n'est appelé qu'en cas de
 * succès, car seul service_role peut écrire verified_at.
 */
export async function verifySite(
  supabase: Client,
  siteId: string,
  fetchPage: PageFetcher,
  getServiceClient: () => Client,
): Promise<VerifyState> {
  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: SITE_MESSAGES.unauthenticated };

  const { data: site } = await supabase
    .from("sites")
    .select("id, workspace_id, domain, verification_token, verified_at")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return { status: "error", message: SITE_MESSAGES.notFound };
  if (site.verified_at) return { status: "verified", message: SITE_MESSAGES.alreadyVerified };

  const result = await checkOwnership(site.domain, site.verification_token, fetchPage);
  if (!result.verified) {
    return {
      status: "failed",
      message:
        result.reason === "unreachable" ? SITE_MESSAGES.unreachable : SITE_MESSAGES.notFoundToken,
    };
  }

  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: SITE_MESSAGES.verifyUnavailable };
  }
  const { error } = await service
    .from("sites")
    .update({ verified_at: new Date().toISOString(), verification_method: result.method })
    .eq("id", site.id)
    .eq("domain", site.domain); // ne valide pas un domaine modifié entre-temps
  if (error) return { status: "error", message: SITE_MESSAGES.verifyUnavailable };

  await supabase.from("events").insert({
    workspace_id: site.workspace_id,
    actor_id: userId,
    type: "site.verified",
    payload: { site_id: site.id, domain: site.domain, method: result.method },
  });
  return { status: "verified", message: SITE_MESSAGES.verified };
}
