"use client";

// Le nombre d'heures prévisible revu en cours de chantier, sur la fiche d'un
// plan — R. 4512-7, 1°, seconde phrase (2026-10-12). Même patron que la trace
// de R. 4512-12 (`InformationInspectionForm`).

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  noterHeuresRevisees,
  type TraceInspectionState,
} from "@/lib/plan-prevention/actions";

export function HeuresReviseesForm({ planId }: { planId: string }) {
  const action = noterHeuresRevisees.bind(null, planId);
  const [state, formAction, pending] = useActionState<
    TraceInspectionState,
    FormData
  >(action, { status: "idle" });

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <div className="min-w-0">
        <label
          htmlFor="heuresPrevisiblesRevisees"
          className="m-0 block text-[13px] leading-[1.55] text-[color:var(--board-slate-ink)]"
        >
          Heures prévisibles
        </label>
        <input
          id="heuresPrevisiblesRevisees"
          name="heuresPrevisiblesRevisees"
          type="text"
          inputMode="numeric"
          maxLength={5}
          required
          className="champ-board mt-1 max-w-[8rem]"
        />
      </div>
      <div className="min-w-0">
        <label
          htmlFor="heuresPrevisiblesReviseesLe"
          className="m-0 block text-[13px] leading-[1.55] text-[color:var(--board-slate-ink)]"
        >
          Revues le
        </label>
        <input
          id="heuresPrevisiblesReviseesLe"
          name="heuresPrevisiblesReviseesLe"
          type="date"
          required
          className="champ-board mt-1 max-w-[12rem]"
        />
      </div>
      <Button type="submit" variant="boardClair" size="boardSm" disabled={pending}>
        {pending ? "Enregistrement…" : "Noter"}
      </Button>
      {state.status === "error" && (
        <p className="m-0 w-full text-[12px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
    </form>
  );
}
