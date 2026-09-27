"use client";

// La trace de R. 4512-12, 2°, sur la fiche d'un plan (C45, 2026-09-27) : la
// date à laquelle l'inspection du travail a été informée par écrit de
// l'ouverture des travaux. Déclarée, facultative ; Rojer n'informe personne.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  noterInformationInspection,
  type TraceInspectionState,
} from "@/lib/plan-prevention/actions";
import { ligneInformationInspection } from "@/lib/plan-prevention/annonces-plan";

export function InformationInspectionForm({
  planId,
  informeeLe,
  informeeLeTexte,
}: {
  planId: string;
  /** Clé « AAAA-MM-JJ » de la date déclarée, ou `null`. */
  informeeLe: string | null;
  /** La même date, formatée côté serveur. */
  informeeLeTexte: string | null;
}) {
  const action = noterInformationInspection.bind(null, planId);
  const [state, formAction, pending] = useActionState<
    TraceInspectionState,
    FormData
  >(action, { status: "idle" });

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <div className="min-w-0">
        <label
          htmlFor="inspectionTravailInformeeLe"
          className="m-0 block text-[13px] leading-[1.55] text-[color:var(--board-slate-ink)]"
        >
          {ligneInformationInspection(informeeLeTexte)}
        </label>
        <input
          id="inspectionTravailInformeeLe"
          name="inspectionTravailInformeeLe"
          type="date"
          defaultValue={informeeLe ?? ""}
          className="champ-board mt-1 max-w-[12rem]"
        />
      </div>
      <Button type="submit" variant="boardClair" size="boardSm" disabled={pending}>
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
