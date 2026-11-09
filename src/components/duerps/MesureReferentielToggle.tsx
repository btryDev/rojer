"use client";

import { useTransition } from "react";
import { toggleMesureReferentiel } from "@/lib/mesures/actions";
import { LABEL_TYPE_MESURE } from "@/lib/mesures/labels";
import type { TypeMesure } from "@/lib/referentiels/types";

type Props = {
  risqueId: string;
  mesureRefId: string;
  libelle: string;
  type: TypeMesure;
  selectionne: boolean;
};

export function MesureReferentielToggle({
  risqueId,
  mesureRefId,
  libelle,
  type,
  selectionne,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <label
      data-ecriture-inerte
      className={`flex cursor-pointer items-start gap-3 rounded-[16px] border p-3 transition-colors ${
        selectionne
          ? "border-[color:var(--board-ink)] bg-[color:var(--board-slate-pale)]"
          : "border-[color:var(--board-slate-line)] hover:bg-[color:var(--board-slate-pale)]"
      } ${pending ? "opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={selectionne}
        disabled={pending}
        onChange={() => {
          startTransition(async () => {
            await toggleMesureReferentiel(risqueId, mesureRefId);
          });
        }}
        className="mt-1 accent-[color:var(--board-ink)]"
      />
      <div className="min-w-0">
        <p className="m-0 text-[14px] font-medium leading-[1.45] text-[color:var(--board-ink)]">
          {libelle}
        </p>
        <p className="m-0 mt-0.5 text-[12.5px] text-[color:var(--board-slate-mid)]">
          {LABEL_TYPE_MESURE[type]}
        </p>
      </div>
    </label>
  );
}
