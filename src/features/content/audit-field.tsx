"use client";

import { useRouter } from "next/navigation";
import { t } from "@/lib/messages";

/** Où mènent les appels à l'action des contenus : l'inscription (l'analyse gratuite commence après). */
export const CTA_DESTINATION = "/inscription";

/**
 * Champ « votresite.fr » des appels à l'action A et C. La home n'a pas de champ d'audit en service et
 * l'inscription ne lit pas de domaine : le bouton mène donc à l'inscription, sans transmettre la saisie.
 * Sans JavaScript, le formulaire mène au même endroit.
 */
export function AuditField({ button }: { button: string }) {
  const router = useRouter();
  const c = t.content.cta;
  return (
    <form
      className="art-field"
      action={CTA_DESTINATION}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(CTA_DESTINATION);
      }}
    >
      <input
        type="text"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={c.fieldPlaceholder}
        aria-label={c.fieldLabel}
      />
      <button type="submit" className="art-btn">
        {button}
      </button>
    </form>
  );
}
