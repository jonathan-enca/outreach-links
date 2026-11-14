export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-6 flex flex-col gap-2">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-2xl text-muted-foreground">{description}</p>
    </header>
  );
}
