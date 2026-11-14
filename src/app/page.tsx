import { t } from "@/lib/messages";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold tracking-tight">{t.home.title}</h1>
      <p className="text-lg text-zinc-600">{t.home.subtitle}</p>
    </main>
  );
}
