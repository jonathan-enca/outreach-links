import { Suspense } from "react";
import { t } from "@/lib/messages";
import { LoginForm } from "./login-form";

async function Form({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return <LoginForm initialError={erreur ? t.auth.errorCallback : undefined} />;
}

export default function ConnexionPage(props: { searchParams: Promise<{ erreur?: string }> }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">{t.auth.title}</h1>
      <p className="text-zinc-600">{t.auth.intro}</p>
      <Suspense>
        <Form searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
