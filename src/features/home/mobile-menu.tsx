"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";

/**
 * Panneau latéral de l'en-tête sur mobile : Échap ou clic hors du panneau pour fermer, focus rendu au bouton.
 * Rendu dans <body> (portail) : le flou de l'en-tête (backdrop-filter) ferait sinon du panneau
 * « fixed » un enfant de l'en-tête, haut de 68 px, sans fond sous les liens.
 */
export function MobileMenu({
  links,
  signIn,
  cta,
}: {
  links: { href: string; label: string }[];
  signIn: string;
  cta: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const n = t.home.nav;
  return (
    <div className="lg:hidden">
      <Button
        ref={trigger}
        variant="outline"
        size="sm"
        aria-label={n.openMenu}
        aria-expanded={open}
        aria-controls="menu-mobile"
        onClick={() => setOpen(true)}
      >
        <Menu aria-hidden />
      </Button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-foreground/40"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div
                id="menu-mobile"
                role="dialog"
                aria-modal="true"
                aria-label={n.menu}
                className="absolute inset-y-0 right-0 flex w-[78%] max-w-xs flex-col gap-2 border-l border-border bg-background p-5 shadow-float"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold">{n.menu}</span>
                  <Button
                    ref={close}
                    variant="ghost"
                    size="sm"
                    aria-label={n.closeMenu}
                    onClick={() => setOpen(false)}
                  >
                    <X aria-hidden />
                  </Button>
                </div>
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-control px-2 py-2.5 text-base hover:bg-muted"
                  >
                    {l.label}
                  </a>
                ))}
                <hr className="my-2 border-border" />
                <Link
                  href="/connexion"
                  className="rounded-control px-2 py-2.5 text-base hover:bg-muted"
                >
                  {signIn}
                </Link>
                <Button asChild className="mt-1 h-11">
                  <Link href="/inscription" onClick={() => setOpen(false)}>
                    {cta}
                  </Link>
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
