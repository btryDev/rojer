/**
 * Un compte posé sur le champ de son état : le nombre en grand, son mot à
 * côté — « 3 dépassées », « 2 pièces à demander ».
 *
 * Extrait le 2026-10-25 : le même dessin était écrit trois fois (le bandeau
 * du parc, Équipe, Prestataires), et deux copies avaient déjà divergé sur la
 * couleur du nombre.
 */
export function CompteurEtat({
  nombre,
  legende,
  champ,
  encre,
}: {
  nombre: number;
  legende: string;
  /** Le champ de l'état (`CHAMP_ETAT`), ou une surface neutre. */
  champ: string;
  /** L'encre du mot, lisible sur le champ (`ENCRE_ETAT`). */
  encre: string;
}) {
  return (
    <span
      className="inline-flex items-baseline gap-2 rounded-full px-4 py-[9px]"
      style={{ background: champ }}
    >
      <span className="board-titre text-[20px] leading-none tabular-nums">{nombre}</span>
      <span className="board-eyebrow text-[9.5px] tracking-[0.12em]" style={{ color: encre }}>
        {legende}
      </span>
    </span>
  );
}
