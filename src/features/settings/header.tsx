import { t } from "@/lib/messages";

export function SettingsHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
        {t.settings.eyebrow}
      </p>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="max-w-2xl text-muted-foreground">{description}</p>
    </div>
  );
}
