import { NextResponse } from "next/server";
import { notificationSecret, unsubscribePath } from "@/features/notifications/secret";
import { readUnsubscribeToken } from "@/features/notifications/unsubscribe";
import { turnOff } from "@/features/settings/notifications";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Désinscription en un clic (RFC 8058), appelée en POST par la messagerie quand la personne clique
 * sur « Se désabonner » à côté de l'expéditeur. Coupe seulement ce type d'email pour cet espace.
 * Un GET (lien ouvert à la main) renvoie vers la page avec confirmation.
 */
export async function POST(req: Request) {
  const secret = notificationSecret();
  const token = secret
    ? readUnsubscribeToken(new URL(req.url).searchParams.get("t"), secret)
    : null;
  if (!token) return new NextResponse("Lien invalide.", { status: 400 });
  const ok = await turnOff(createServiceClient(), token.workspaceId, token.key);
  if (!ok) {
    logger.warn("désinscription en un clic impossible", { key: token.key });
    return new NextResponse("Réessayez plus tard.", { status: 500 });
  }
  return new NextResponse("C'est noté.", { status: 200 });
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("t") ?? "";
  return NextResponse.redirect(new URL(unsubscribePath(raw), req.url), 303);
}
