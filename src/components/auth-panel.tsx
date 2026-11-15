import { Check } from "lucide-react";
import { t } from "@/lib/messages";

/** Bande produit à droite des pages d'inscription et de connexion (surface nuit, bureau seulement). */
export function AuthPanel() {
  const p = t.signup.panel;
  return (
    <aside
      aria-label={p.title}
      className="surface-night bg-grid relative hidden flex-col justify-center overflow-hidden bg-background px-12 py-16 text-foreground lg:flex xl:px-20"
    >
      <div className="mx-auto w-full max-w-xl">
        <p className="text-sm font-semibold text-primary">{p.label}</p>
        <h2 className="mt-4 text-balance text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
          {p.title}
        </h2>
        <ul className="mt-8 flex flex-col gap-4 text-lg">
          {p.points.map((pt) => (
            <li key={pt} className="flex items-center gap-3">
              <Check aria-hidden className="size-5 shrink-0 text-primary" />
              {pt}
            </li>
          ))}
        </ul>

        <div
          aria-hidden="true"
          className="mt-10 overflow-hidden rounded-panel border border-border bg-card shadow-float"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3 text-sm">
            <span className="text-muted-foreground">
              {t.app.name} · {p.agent} <span className="ml-2 text-xs">({p.example})</span>
            </span>
            <span className="flex items-center gap-2 text-primary">
              <span className="size-2 rounded-full bg-primary" />
              {p.running}
            </span>
          </div>
          <ul>
            {p.lines.map((l, i) => (
              <li
                key={l.step}
                className={`grid grid-cols-[5.5rem_1fr] gap-4 px-5 py-3.5 text-sm ${i === 0 ? "border-l-2 border-primary bg-muted/50" : ""}`}
              >
                <span className={i === 0 ? "font-semibold text-primary" : "text-muted-foreground"}>
                  {l.step}
                </span>
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
