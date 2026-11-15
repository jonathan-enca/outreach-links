import { Check } from "lucide-react";
import { t } from "@/lib/messages";

/**
 * Cartes d'illustration autour du titre (bureau seulement, décoratives : `aria-hidden`). Les données
 * sont des exemples, jamais des résultats réels ; elles montrent ce que le service prépare.
 */
const base =
  "absolute w-[16.5rem] rounded-card border border-white/10 bg-card/80 p-4 font-mono text-[12px] leading-relaxed text-card-foreground shadow-float backdrop-blur-sm";
const tag = "mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary";

function Bar({ value }: { value: number }) {
  return (
    <span className="relative block h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-primary"
        style={{ width: `${value}%` }}
      />
    </span>
  );
}

export function HeroCards() {
  const c = t.home.hero.cards;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden xl:block">
      <div className={`${base} left-[2%] top-[4%] -rotate-3`}>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="font-semibold">blog-voyage.fr</span>
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[11px] text-primary">
            {c.target.badge}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-muted-foreground">{c.target.relevance}</span>
          <Bar value={92} />
          <span>92</span>
        </div>
        <p className="mt-2 text-muted-foreground">{c.target.checks}</p>
      </div>

      <div className={`${base} left-[-1%] top-[40%] rotate-2`}>
        <p className={tag}>{c.pitch.tag}</p>
        <p className="text-muted-foreground">{c.pitch.hookLabel}</p>
        <p className="mt-1 text-[13px]">{c.pitch.hook}</p>
        <p className="mt-2 text-muted-foreground">{c.pitch.detail}</p>
      </div>

      <div className={`${base} bottom-[2%] left-[6%] -rotate-2`}>
        <p className={tag}>{c.guardrails.tag}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded border border-white/15 px-2 py-0.5">{c.guardrails.perHour}</span>
          <span className="rounded border border-white/15 px-2 py-0.5">{c.guardrails.hours}</span>
          <span className="rounded border border-white/15 px-2 py-0.5">{c.guardrails.review}</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-primary">
          <Check className="size-3.5" /> {c.guardrails.ok}
        </p>
      </div>

      <div className={`${base} right-[2%] top-[3%] rotate-2`}>
        <p className={tag}>{c.sent.tag}</p>
        <p>
          <span className="text-muted-foreground">{c.sent.from}</span>
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-muted-foreground">{c.sent.today}</span>
          <Bar value={80} />
          <span>8 / 10</span>
        </div>
      </div>

      <div className={`${base} right-[-1%] top-[38%] -rotate-2`}>
        <div className="flex items-center justify-between">
          <p className={tag}>{c.reply.tag}</p>
          <span className="text-muted-foreground">{c.reply.ago}</span>
        </div>
        <p className="text-[13px]">{c.reply.quote}</p>
        <p className="mt-2 text-muted-foreground">→ {c.reply.status}</p>
      </div>

      <div className={`${base} bottom-[3%] right-[5%] rotate-1 border-primary/30`}>
        <p className="flex items-center gap-1.5 text-primary">
          <Check className="size-3.5" /> {c.live.tag}
        </p>
        <p className="mt-1 text-[13px]">{c.live.url}</p>
        <p className="mt-2">
          <span className="rounded border border-white/15 px-2 py-0.5">{c.live.kind}</span>
        </p>
      </div>
    </div>
  );
}
