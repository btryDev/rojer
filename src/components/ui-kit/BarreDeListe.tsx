import type { ReactNode } from "react";

/**
 * La rangée qui ouvre une liste, sous l'en-tête de page : à gauche ce que la
 * liste résume ou signale (ses alertes, son contexte), à droite le geste
 * principal (« Ajouter… », « Télécharger le PDF »).
 *
 * Elle existe parce que l'en-tête commun (`EnTetePage`) ne porte plus que la
 * bascule de vue (décision de la propriétaire du 2026-10-25) : les compteurs
 * et les boutons d'ajout, qui y vivaient, redescendent au-dessus de la liste
 * qu'ils concernent — partout de la même façon, d'où ce composant.
 */
export function BarreDeListe({
  resume,
  action,
}: {
  /** Ce que la liste signale ou rappelle ; rien quand il n'y a rien à dire. */
  resume?: ReactNode;
  /** Le geste principal de la liste. */
  action?: ReactNode;
}) {
  if (!resume && !action) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5">{resume}</div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}
