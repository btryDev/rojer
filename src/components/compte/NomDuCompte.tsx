import { ConnecteAvec } from "./ConnecteAvec";

/**
 * Sous le titre d'une page dont les gestes portent sur un compte : le nom du
 * compte (quand la personne en a plusieurs) et l'adresse connectée, avec la
 * sortie (2026-11-16 : un essai démarré sur le mauvais compte, faute de le
 * voir). Rien si on ne sait ni l'un ni l'autre.
 */
export function NomDuCompte({ nom, email = null }: { nom: string | null; email?: string | null }) {
  return (
    <>
      {nom ? <p className="m-0 mt-2 text-[15px] font-semibold tracking-[-0.01em] text-[color:var(--board-ink)]">{nom}</p> : null}
      {email ? <ConnecteAvec email={email} className="mt-2" /> : null}
    </>
  );
}
