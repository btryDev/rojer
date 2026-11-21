/**
 * Les gestes de la fiche du plan (maquette V2) : pilules blanches. Hors du
 * module client des boutons (`PlanActionsButtons`) : la page, rendue au
 * serveur, les lit aussi — une constante exportée d'un module `"use client"`
 * n'y arrive pas comme une chaîne.
 */
export const PILULE_FICHE =
  "inline-flex min-h-11 items-center rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[18px] text-[14px] font-normal normal-case tracking-normal text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-slate-pale)] disabled:opacity-60";

/**
 * Une section de l'onglet « Suivi » (2026-11-21, « toujours le même bloc ») :
 * dans la carte unique de la fiche, sous la barre d'onglets, séparée de la
 * précédente par un filet — comme les sections du plan. Les sections d'action
 * requise portent, à la place du filet, leur trait de couleur.
 */
export const SECTION_SUIVI = "border-t border-[color:var(--board-slate-pale)] px-6 py-7 first:border-t-0 md:px-10";
