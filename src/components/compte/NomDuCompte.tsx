/**
 * Sous le titre d'une page dont les gestes portent sur un compte : le nom du
 * compte, quand la personne en a plusieurs.
 * ~~et l'adresse connectée, avec la sortie (2026-11-16)~~ [2026-11-17,
 * décision de la propriétaire : la déconnexion n'a rien à faire dans les pages
 * du compte, elle est dans la gélule.]
 */
export function NomDuCompte({ nom }: { nom: string }) {
  return <p className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-[color:var(--board-ink)]">{nom}</p>;
}
