"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  revoquerSignaturesPlan,
  traiterProposition,
  type ContreSignatureState,
} from "@/lib/plan-prevention/contre-signature-actions";

/**
 * Les boutons de la contre-signature sur la fiche du plan (ADR-061) :
 * traiter la proposition de l'entreprise extérieure, et révoquer les
 * signatures pour corriger. La phrase sur le plafond de la formule est dite
 * au moment du geste (§ 6).
 */

export const PHRASE_PLAFOND =
  "Un signataire qui signe de nouveau ce plan ne compte pas une seconde fois dans votre formule.";

function Message({ state }: { state: ContreSignatureState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "m-0 text-[13px] text-[color:var(--board-signal-ink)]"
          : "m-0 text-[13px] text-[color:var(--board-green-ink)]"
      }
    >
      {state.message}
    </p>
  );
}

export function TraiterPropositionBoutons({ propositionId }: { propositionId: string }) {
  const action = traiterProposition.bind(null, propositionId);
  const [state, formAction, pending] = useActionState<ContreSignatureState, FormData>(action, {
    status: "idle",
  });
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="decision" value="accepter" disabled={pending} data-ecriture>
          Accepter
        </Button>
        <Button type="submit" name="decision" value="corriger" variant="outline" disabled={pending} data-ecriture>
          Accepter puis modifier
        </Button>
        <Button type="submit" name="decision" value="refuser" variant="ghost" disabled={pending} data-ecriture>
          Refuser
        </Button>
      </div>
      <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">{PHRASE_PLAFOND}</p>
      <Message state={state} />
    </form>
  );
}

export function BoutonRevoquerSignatures({ planId }: { planId: string }) {
  const [confirmer, setConfirmer] = useState(false);
  const action = revoquerSignaturesPlan.bind(null, planId);
  const [state, formAction, pending] = useActionState<ContreSignatureState>(action, { status: "idle" });

  if (!confirmer) {
    return (
      <div className="flex w-full flex-col gap-2">
        <Button type="button" variant="outline" onClick={() => setConfirmer(true)} data-ecriture>
          Révoquer les signatures pour corriger
        </Button>
        <Message state={state} />
      </div>
    );
  }
  return (
    <form action={formAction} className="flex w-full flex-col gap-2">
      <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--board-ink)]">
        Les signatures déjà posées seront révoquées et datées, jamais effacées. Chaque
        signataire en est prévenu, et le plan se fait signer de nouveau après votre
        correction. {PHRASE_PLAFOND}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending} data-ecriture>
          {pending ? "Révocation…" : "Confirmer la révocation"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirmer(false)} disabled={pending}>
          Annuler
        </Button>
      </div>
      <Message state={state} />
    </form>
  );
}
