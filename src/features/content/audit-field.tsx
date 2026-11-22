"use client";

import { useRouter } from "next/navigation";
import { signupHref } from "@/features/auth/signup-href";
import { t } from "@/lib/messages";

/** Où mènent les appels à l'action des contenus : l'inscription (l'analyse gratuite commence après). */
export const CTA_DESTINATION = "/inscription";

/**
 * Champ « votresite.fr » des appels à l'action A et C. La saisie part avec la personne vers
 * l'inscription (`?site=`), y est retenue le temps de créer le compte, puis préremplit l'écran de
 * démarrage. Sans JavaScript, le formulaire (GET) mène au même endroit avec le même paramètre.
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
        const value = new FormData(e.currentTarget).get("site");
        router.push(signupHref(typeof value === "string" ? value : ""));
      }}
    >
      <input
        type="text"
        name="site"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={300}
        placeholder={c.fieldPlaceholder}
        aria-label={c.fieldLabel}
      />
      <button type="submit" className="art-btn">
        {button}
      </button>
    </form>
  );
}
