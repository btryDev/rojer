/**
 * Le « livre » : le petit lien discret qui ouvre le texte d'un article
 * (2026-10-20, allègement des écrans). Un seul style pour le livre
 * (`LegalBadge`, `Textes`, `TexteSource`) et pour le « ? » à titre
 * (`AideEcran`) — deux écritures avaient déjà divergé (l'une sans contour de
 * focus). Board seulement : le papier est de la dette (2026-10-28).
 *
 * Pas de marge négative ici : dans une rangée de plusieurs livres, elle les
 * faisait se chevaucher. L'appelant qui ouvre une ligne l'ajoute lui-même.
 */
export const LIVRE =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium text-[color:var(--board-slate-mid)] transition-colors hover:bg-[color:var(--board-blue-pale)] hover:text-[color:var(--board-blue-ink)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--board-blue-strong)]";

/** La référence imprimée en tête du panneau d'un livre. */
export const LIVRE_REFERENCE =
  "m-0 mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--board-slate-soft)]";
