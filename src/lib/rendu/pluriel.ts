/**
 * « 1 salarié », « 9 salariés », « 2 ans » : un nombre et son mot accordé.
 *
 * Une seule écriture (2026-10-25, relecture du lot board-hero) : le même
 * accord était recopié dans la page du tableau de bord, le hero et la jauge
 * des titres. Le pluriel irrégulier se passe en troisième argument.
 */
export function pluriel(n: number, mot: string, motPluriel = `${mot}s`): string {
  return `${n} ${n > 1 ? motPluriel : mot}`;
}
