import { Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";

/** Écran qui remplace le formulaire une fois l'email parti : on sait quoi faire ensuite. */
export function CheckInbox({
  email,
  kind,
  onOtherAddress,
}: {
  email: string;
  kind: "signup" | "reset";
  onOtherAddress: () => void;
}) {
  const c = t.auth.checkInbox;
  const [before, after] = c[kind].split("{email}");
  return (
    <div role="status" className="flex flex-col gap-5">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary"
      >
        <Mail className="size-6" />
      </span>
      <h2 className="text-3xl font-bold leading-tight tracking-tight">{c.title}</h2>
      <p className="text-lg text-muted-foreground">
        {before}
        <strong className="break-words text-foreground">{email}</strong>
        {after}
      </p>
      <p className="text-sm text-muted-foreground">{c.spam}</p>
      <div className="flex flex-col gap-3 border-t border-border pt-5 text-sm">
        <Button
          type="button"
          variant="outline"
          onClick={onOtherAddress}
          className="h-11 self-start"
        >
          {c.otherAddress}
        </Button>
        <p className="text-muted-foreground">
          {c.haveAccount}{" "}
          <Link href="/connexion" className="font-medium text-primary underline underline-offset-4">
            {c.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
