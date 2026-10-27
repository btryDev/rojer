/**
 * L'anneau ambre d'un champ ou d'une carte resté sans réponse (2026-10-27).
 * Un contour (`outline`) et non un `ring` : le `ring` de Tailwind remplace le
 * `box-shadow`, et la carte du board perdait sa bordure et son ombre. La marge
 * de défilement garde le libellé visible quand une ancre y mène. Module à
 * part : les composants client l'importent sans emporter le cadre.
 */
export const ANNEAU_A_COMPLETER =
  "scroll-mt-24 outline outline-2 outline-offset-2 outline-[color:var(--board-amber-ink)]";
