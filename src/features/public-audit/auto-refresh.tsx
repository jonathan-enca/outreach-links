"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recharge la page toutes les 5 s (jusqu'à 10 minutes) tant que l'audit tourne. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > 600_000) clearInterval(timer);
      else router.refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
