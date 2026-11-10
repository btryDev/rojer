/** Le nom du compte, sous le titre d'une page dont les gestes portent sur lui ; rien sans nom. */
export function NomDuCompte({ nom }: { nom: string | null }) {
  return nom ? <p className="m-0 mt-2 text-[15px] font-semibold tracking-[-0.01em] text-[color:var(--board-ink)]">{nom}</p> : null;
}
