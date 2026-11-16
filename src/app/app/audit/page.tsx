import { redirect } from "next/navigation";

/** MU.2 : la liste des audits n'existe plus ; `/app` mène à la prochaine étape. */
export default function Page() {
  redirect("/app");
}
