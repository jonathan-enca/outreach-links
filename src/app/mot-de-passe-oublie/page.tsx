import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/features/auth/forms";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: t.auth.forgot.title };

export default function MotDePasseOubliePage() {
  const f = t.auth.forgot;
  return (
    <AuthShell>
      <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">{f.title}</h1>
      <p className="mb-8 mt-3 text-lg text-muted-foreground">{f.intro}</p>
      <ForgotForm />
      <p className="mt-8 text-center text-sm">
        <Link href="/connexion" className="font-medium text-primary underline underline-offset-4">
          {f.back}
        </Link>
      </p>
    </AuthShell>
  );
}
