"use client";

// La trace de L. 4121-3-1, VI, sur une version validée (C45, 2026-09-27).
// Une date, facultative, que l'employeur déclare : Rojer ne transmet rien.
// Sans date, la ligne dit « non renseignée » — jamais « non transmise », que
// Rojer ne sait pas.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  noterTransmissionSpst,
  type TraceTransmissionState,
} from "@/lib/versions/actions";

export function TransmissionSpstForm({
  duerpId,
  versionId,
  numero,
  transmiseLe,
  transmiseLeTexte,
}: {
  duerpId: string;
  versionId: string;
  numero: number;
  /** Clé « AAAA-MM-JJ » de la date déclarée, ou `null`. */
  transmiseLe: string | null;
  /** La même date, formatée côté serveur. */
  transmiseLeTexte: string | null;
}) {
  const action = noterTransmissionSpst.bind(null, duerpId, versionId);
  const [state, formAction, pending] = useActionState<
    TraceTransmissionState,
    FormData
  >(action, { status: "idle" });
  const id = `transmiseSpstLe-${numero}`;

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="m-0 block text-[12px] leading-[1.45] text-[color:var(--board-slate-mid)]"
        >
          {transmiseLeTexte
            ? `Transmise au service de prévention et de santé au travail le ${transmiseLeTexte}`
            : "Transmission au service de prévention et de santé au travail : date non renseignée"}
        </label>
        <input
          id={id}
          name="transmiseSpstLe"
          type="date"
          defaultValue={transmiseLe ?? ""}
          className="champ-board mt-1 max-w-[12rem]"
        />
      </div>
      <Button
        type="submit"
        variant="boardClair"
        size="boardSm"
        disabled={pending}
      >
        {pending ? "Enregistrement…" : "Noter la date"}
      </Button>
      {state.status === "error" && (
        <p className="m-0 w-full text-[12px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
    </form>
  );
}
