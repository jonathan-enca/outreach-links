import { Check } from "lucide-react";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { JOURNEY_STEPS, type JourneyStep } from "./next-step";

/**
 * Le fil d'étapes commun à tout le parcours (MU.2) : où j'en suis, ce qui reste. Sur mobile, seule
 * l'étape en cours garde son nom (« Étape 4 sur 5 : Analyse ») pour tenir sur une ligne.
 */
export function JourneySteps({ current }: { current: JourneyStep }) {
  const index = JOURNEY_STEPS.indexOf(current);
  const j = t.journey;
  return (
    <nav aria-label={j.label} className="mb-6">
      <p className="text-sm font-medium text-primary md:hidden">
        {j.stepOf(index + 1, JOURNEY_STEPS.length)} : {j.steps[current]}
      </p>
      <ol className="mt-2 flex items-center gap-1 md:mt-0 md:gap-2">
        {JOURNEY_STEPS.map((step, i) => {
          const state = i < index ? "done" : i === index ? "current" : "todo";
          return (
            <li
              key={step}
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 md:flex-none",
                i === index ? "" : "flex-1 md:flex-none",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "current" && "bg-primary/10 text-primary ring-2 ring-primary",
                  state === "todo" && "bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm md:inline",
                  state === "current" ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {j.steps[step]}
                <span className="sr-only">
                  {state === "done" ? ` (${j.done})` : state === "current" ? ` (${j.current})` : ""}
                </span>
              </span>
              {i < JOURNEY_STEPS.length - 1 ? (
                <span aria-hidden className="hidden h-px w-6 bg-border md:block" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
