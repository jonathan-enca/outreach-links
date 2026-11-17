import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { settingsGroups } from "./settings-links";

/** Les pages de réglages, par groupe, en grandes lignes faciles à toucher. */
export function SettingsList() {
  return (
    <>
      {settingsGroups().map((g) => (
        <section key={g.title} aria-labelledby={`g-${g.title}`}>
          <h2
            id={`g-${g.title}`}
            className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-primary"
          >
            {g.title}
          </h2>
          <Card className="p-1.5">
            <ul className="divide-y divide-border">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{l.label}</span>
                      <span className="block text-sm text-muted-foreground">{l.hint}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </>
  );
}
