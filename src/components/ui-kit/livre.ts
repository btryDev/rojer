import type { Charte } from "./charte";

/**
 * Le « livre » : le petit lien discret qui ouvre le texte d'un article
 * (2026-10-20, allègement des écrans). Un seul style pour `TexteSource` et
 * pour `LegalBadge` en `compact` — deux écritures avaient déjà divergé
 * (l'une sans contour de focus).
 *
 * Pas de marge négative ici : dans une rangée de plusieurs livres, elle les
 * faisait se chevaucher. L'appelant qui ouvre une ligne l'ajoute lui-même.
 */
export const LIVRE: Record<Charte, string> = {
  board:
    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium text-[color:var(--board-slate-mid)] transition-colors hover:bg-[color:var(--board-blue-pale)] hover:text-[color:var(--board-blue-ink)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--board-blue-strong)]",
  papier:
    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[0.75rem] font-medium text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--warm)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--warm)]",
};

/** La référence imprimée en tête du panneau d'un livre. */
export const LIVRE_REFERENCE: Record<Charte, string> = {
  board:
    "m-0 mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--board-slate-soft)]",
  papier:
    "m-0 mb-2 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]",
};
