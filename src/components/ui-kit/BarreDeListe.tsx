import type { ReactNode } from "react";

/**
 * La rangée qui ouvre une liste, sous l'en-tête de page : à gauche ce que la
 * liste signale (les alertes), à droite le geste qui l'allonge (« Ajouter… »).
 *
 * Elle existe parce que l'en-tête commun (`EnTetePage`) ne porte plus que la
 * bascule de vue (décision de la propriétaire du 2026-10-25) : les compteurs
 * et les boutons d'ajout, qui y vivaient, redescendent au-dessus de la liste
 * qu'ils concernent — partout de la même façon, d'où ce composant.
 */
export function BarreDeListe({
  alertes,
  action,
}: {
  /** Les alertes de la liste ; rien quand il n'y a rien à signaler. */
  alertes?: ReactNode;
  /** Le geste principal de la liste. */
  action?: ReactNode;
}) {
  if (!alertes && !action) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5">{alertes}</div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}
