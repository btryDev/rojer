"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { RemiseAttestationState } from "@/lib/prestataires/actions";
import { ChampsDatesAttestation } from "./ChampsDatesAttestation";

/**
 * Sur la fiche du prestataire : saisir la remise et l'émission de
 * l'attestation de vigilance. C'est là que l'écran invite à les renseigner
 * (« À saisir sur la fiche du prestataire »), et le seul endroit où une
 * fiche existante peut les recevoir.
 */
export function FormulaireDatesAttestation({
  action,
  remiseLe,
  emiseLe,
}: {
  action: (
    prev: RemiseAttestationState,
    formData: FormData,
  ) => Promise<RemiseAttestationState>;
  remiseLe?: string;
  emiseLe?: string;
}) {
  const [state, formAction, pending] = useActionState<
    RemiseAttestationState,
    FormData
  >(action, { status: "idle" });
  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChampsDatesAttestation erreur={err} remiseLe={remiseLe} emiseLe={emiseLe} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="board" size="board" type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer les dates"}
        </Button>
        {state.status === "error" && !state.fieldErrors && (
          <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">{state.message}</p>
        )}
        {state.status === "success" && (
          <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">Dates enregistrées.</p>
        )}
      </div>
    </form>
  );
}
