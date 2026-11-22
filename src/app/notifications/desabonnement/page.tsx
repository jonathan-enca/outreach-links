import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { notificationSecret, unsubscribePath } from "@/features/notifications/secret";
import { notificationName } from "@/features/notifications/template";
import { readUnsubscribeToken } from "@/features/notifications/unsubscribe";
import { turnOff } from "@/features/settings/notifications";
import { t } from "@/lib/messages";
import { createServiceClient } from "@/lib/supabase/service";

const U = t.notifications.unsubscribePage;
export const metadata: Metadata = { title: U.title, robots: { index: false } };

const read = (token: unknown) => {
  const secret = notificationSecret();
  return secret ? readUnsubscribeToken(token, secret) : null;
};

/**
 * Lien « Ne plus recevoir cet email » des notifications. Sans connexion : le jeton signé de l'email
 * suffit, et il ne permet que de couper ce type d'email. La page demande une confirmation (un simple
 * passage d'un antivirus de messagerie sur le lien ne doit rien changer).
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; fait?: string }>;
}) {
  const params = await searchParams;
  const token = read(params.t);
  const manage = (
    <p className="mt-8 text-sm">
      <Link
        href="/app/reglages/notifications"
        className="font-medium text-primary underline underline-offset-4"
      >
        {U.manage}
      </Link>
    </p>
  );
  if (!token) {
    return (
      <AuthShell>
        <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight">{U.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{U.invalid}</p>
        {manage}
      </AuthShell>
    );
  }
  const name = notificationName(token.key);
  async function confirm(formData: FormData) {
    "use server";
    const { redirect } = await import("next/navigation");
    const raw = String(formData.get("t") ?? "");
    const again = read(raw);
    if (again) await turnOff(createServiceClient(), again.workspaceId, again.key);
    redirect(`${unsubscribePath(raw)}&fait=1`);
  }
  return (
    <AuthShell>
      <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight">{U.title}</h1>
      {params.fait ? (
        <p role="status" className="mt-3 text-lg text-muted-foreground">
          {U.done(name)}
        </p>
      ) : (
        <form action={confirm} className="mt-3 flex flex-col gap-6">
          <input type="hidden" name="t" value={params.t} />
          <div>
            <p className="text-lg">{U.ask(name)}</p>
            <p className="text-muted-foreground">{U.hint}</p>
          </div>
          <div>
            <Button type="submit">{U.confirm}</Button>
          </div>
        </form>
      )}
      {manage}
    </AuthShell>
  );
}
