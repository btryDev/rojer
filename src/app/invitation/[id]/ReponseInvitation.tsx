"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { accepterInvitation, refuserInvitation, type EtatMembres } from "@/lib/membres/actions";

const INITIAL: EtatMembres = { status: "idle" };

export function ReponseInvitation({ invitationId }: { invitationId: string }) {
  const [accepte, accepter, enAcceptation] = useActionState(accepterInvitation, INITIAL);
  const [refuse, refuser, enRefus] = useActionState(refuserInvitation, INITIAL);
  const etat = accepte.status !== "idle" ? accepte : refuse;
  return (
    <div className="flex flex-col gap-3">
      <form action={accepter}>
        <input type="hidden" name="invitationId" value={invitationId} />
        <Button type="submit" variant="board" size="board" disabled={enAcceptation || enRefus} className="w-full">
          {enAcceptation ? "Un instant…" : "Rejoindre le compte →"}
        </Button>
      </form>
      <form action={refuser}>
        <input type="hidden" name="invitationId" value={invitationId} />
        <Button type="submit" variant="boardClair" size="board" disabled={enAcceptation || enRefus} className="w-full">
          Refuser l&apos;invitation
        </Button>
      </form>
      <MessageFormulaire ton={etat.status === "error" ? "alerte" : "info"}>
        {etat.status === "idle" ? undefined : etat.message}
      </MessageFormulaire>
    </div>
  );
}
