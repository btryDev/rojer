import type { ReactNode } from "react";

/**
 * La rangée qui ouvre une liste, sous l'en-tête de page : à gauche ce que la
 * liste résume ou signale (ses alertes) ou le contexte qu'elle rappelle, à
 * droite l'aide puis le geste principal (« Ajouter… », « Exporter… »).
 *
 * Elle existe parce que l'en-tête commun (`EnTetePage`) ne porte que la
 * bascule de vue (décision de la propriétaire du 2026-10-25) : les compteurs,
 * les boutons d'ajout et d'export, l'aide, qui y vivaient, redescendent
 * au-dessus de la liste qu'ils concernent — partout de la même façon, d'où ce
 * composant. C'est ici que la règle est écrite ; les pages ne la recopient
 * pas.
 */
export function BarreDeListe({
  resume,
  contexte,
  aide,
  action,
}: {
  /** Ce que la liste signale (ses alertes) ; rien quand il n'y a rien à dire. */
  resume?: ReactNode;
  /** Le contexte de la liste, en mots séparés d'un point : « NAF 56.10A ·
   *  Restauration · 8 salariés ». */
  contexte?: readonly string[];
  /** Ce qui aide à lire la liste — aide d'écran, demande d'assistance,
   *  article qui la fonde —, posé avant le geste principal. */
  aide?: ReactNode;
  /** Le geste principal de la liste. */
  action?: ReactNode;
}) {
  const aContexte = contexte !== undefined && contexte.length > 0;
  if (!resume && !aContexte && !aide && !action) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {resume}
        {aContexte ? (
          <p className="m-0 flex flex-wrap items-center gap-x-2 text-[13px] text-[color:var(--board-slate-mid)]">
            {contexte.map((mot, i) => (
              <span key={mot} className="flex items-center gap-x-2">
                {i > 0 ? <span aria-hidden>·</span> : null}
                {mot}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      {aide || action ? (
        <div className="flex flex-none flex-wrap items-center gap-2.5">
          {aide}
          {action}
        </div>
      ) : null}
    </div>
  );
}
