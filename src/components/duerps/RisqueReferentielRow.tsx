"use client";

import { useTransition } from "react";
import { ajouterRisqueReferentiel } from "@/lib/risques/actions";

type Props = {
  uniteId: string;
  referentielId: string;
  libelle: string;
  description?: string;
};

/**
 * Un risque du référentiel À ENVISAGER : la case le retient, et rien d'autre
 * (relecture indépendante du 2026-10-12). ~~`RisqueToggleRow`~~ basculait :
 * cochée, la case retirait le risque et ses actions sans demander. Retirer un
 * risque retenu se fait sur le risque, « Retirer ce risque », confirmé.
 */
export function RisqueReferentielRow({
  uniteId,
  referentielId,
  libelle,
  description,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[16px] border border-[color:var(--board-slate-line)] p-3 transition-colors hover:bg-[color:var(--board-slate-pale)] ${pending ? "opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={pending}
        disabled={pending}
        onChange={() => {
          startTransition(async () => {
            await ajouterRisqueReferentiel(uniteId, referentielId);
          });
        }}
        className="mt-1 accent-[color:var(--board-ink)]"
      />
      <div className="min-w-0">
        <p className="m-0 text-[14px] font-medium leading-[1.45] text-[color:var(--board-ink)]">
          {libelle}
        </p>
        {description && (
          <p className="m-0 mt-0.5 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            {description}
          </p>
        )}
      </div>
    </label>
  );
}
