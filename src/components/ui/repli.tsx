/**
 * Le lien qui ouvre un `<details>` du board, avec son chevron. Partagé par
 * les autres types d'ERP de la fiche établissement et l'ajout d'une ligne au
 * journal du registre, qui portaient la même chaîne de classes recopiée
 * (contrôle visuel du lot 3, ADR-045, 2026-10-17) :
 *
 *  - `min-h-6` : la zone cliquable fait 24 px de haut (WCAG 2.5.8), sans
 *    grossir le texte — elle faisait 18,75 px ;
 *  - `[&::-webkit-details-marker]:hidden` : Safari ignore `list-none` et
 *    garde son triangle à côté du chevron. Même motif que `landing/Questions.tsx` ;
 *  - le chevron tourne dans une boîte carrée centrée : tourné autour du centre
 *    du seul glyphe, il débordait à gauche et chevauchait l'anneau de focus.
 */
export const LIEN_REPLI =
  "inline-flex min-h-6 cursor-pointer list-none items-center gap-2 text-[12.5px] font-semibold text-[color:var(--board-slate-ink)] transition-colors hover:text-[color:var(--board-ink)] [&::-webkit-details-marker]:hidden";

export const CHEVRON_REPLI =
  "inline-flex size-4 flex-none items-center justify-center leading-none transition-transform group-open:rotate-90 motion-reduce:transition-none";

/** Le chevron, à placer en tête du `<summary>` d'un `<details className="group">`. */
export function ChevronRepli() {
  return (
    <span aria-hidden className={CHEVRON_REPLI}>
      ›
    </span>
  );
}
