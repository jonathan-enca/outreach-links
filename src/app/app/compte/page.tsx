import { redirect } from "next/navigation";
import { SETTINGS_HOME } from "@/features/shell/settings-links";

/** L'ancienne page « Compte » : tout est maintenant sous « Réglages ». */
export default function Page() {
  redirect(SETTINGS_HOME);
}
