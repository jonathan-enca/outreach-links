import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const metadata: Metadata = { title: t.shell.account.title };

async function Account() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const a = t.shell.account;
  const links = [
    { href: "/app/site", label: a.sites },
    { href: "/app/garde-fous", label: a.safeguards },
    { href: "/app/taches", label: a.tasks },
    { href: "/app/facturation", label: a.billing },
  ];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{auth.user.email}</p>
      <Card className="p-2">
        <ul>
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-3 hover:bg-muted"
              >
                {l.label}
                <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          {t.auth.signOut}
        </Button>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <PageHeader title={t.shell.account.title} description={t.shell.account.description} />
      <Suspense>
        <Account />
      </Suspense>
    </>
  );
}
