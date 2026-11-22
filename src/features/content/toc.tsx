"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/messages";
import type { TocItem } from "./markdown";

/** Hauteur sous l'en-tête collant à partir de laquelle une section est « en cours de lecture ». */
const READING_LINE = 120;

/** Sommaire collant (bureau) : la section en cours de lecture est marquée. */
export function Toc({ items }: { items: TocItem[] }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      let active: string | null = null;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= READING_LINE) active = item.id;
      }
      setCurrent(active);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  return (
    <nav className="art-toc" aria-label={t.content.article.tocTitle}>
      <span className="art-toc-title">{t.content.article.tocTitle}</span>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={current === item.id ? "location" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
