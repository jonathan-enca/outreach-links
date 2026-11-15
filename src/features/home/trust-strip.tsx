import { t } from "@/lib/messages";

export function TrustStrip() {
  const s = t.home.trust;
  return (
    <section aria-label={s.label} className="px-4 py-8 sm:px-7">
      <p className="mb-4 text-center text-sm font-medium text-muted-foreground">{s.label}</p>
      <ul className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2.5">
        {s.items.map((item) => (
          <li
            key={item}
            className="rounded-full border border-border bg-muted px-3.5 py-1.5 text-[13.5px] text-muted-foreground"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
