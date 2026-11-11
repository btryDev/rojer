"use client";

import { useState } from "react";

/**
 * Le « ⋯ » d'une ligne (2026-11-12) : les gestes rares (modifier, supprimer,
 * revoir les mesures) se replient derrière lui, pour qu'une ligne n'ait
 * qu'un bouton principal. Les gestes restent les mêmes composants, dépliés
 * sur place — rien n'est recâblé.
 */
export function ActionsSecondaires({
  libelle,
  children,
}: {
  libelle: string;
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      {ouvert && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      <button
        type="button"
        aria-expanded={ouvert}
        aria-label={ouvert ? "Masquer les autres actions" : libelle}
        title={ouvert ? "Masquer les autres actions" : libelle}
        onClick={() => setOuvert((o) => !o)}
        className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[color:var(--board-card)] text-[15px] font-bold text-[color:var(--board-slate-mid)] shadow-[0_0_0_1px_var(--board-slate-line)] transition-colors hover:text-[color:var(--board-ink)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--board-blue-strong)]"
      >
        {ouvert ? "×" : "⋯"}
      </button>
    </>
  );
}
