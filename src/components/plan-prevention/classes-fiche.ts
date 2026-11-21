/**
 * Les gestes de la fiche du plan (maquette V2) : pilules blanches. Hors du
 * module client des boutons (`PlanActionsButtons`) : la page, rendue au
 * serveur, les lit aussi — une constante exportée d'un module `"use client"`
 * n'y arrive pas comme une chaîne.
 */
export const PILULE_FICHE =
  "inline-flex min-h-11 items-center rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[18px] text-[14px] font-normal normal-case tracking-normal text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-slate-pale)] disabled:opacity-60";
