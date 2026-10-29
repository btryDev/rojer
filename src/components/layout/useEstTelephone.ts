"use client";

import { useSyncExternalStore } from "react";

/**
 * Le seuil « téléphone » de toute l'app, en JavaScript : `md` (48rem), le
 * même que la règle de `globals.css` (`@media (width < 48rem)`) et les
 * variantes `max-md:` / `md:` des composants. Une requête média ne lit pas
 * de variable CSS : le nombre est écrit aux deux endroits, et nulle part
 * ailleurs.
 */
export const REQUETE_TELEPHONE = "(width < 48rem)";

function abonner(rappel: () => void) {
  const mq = window.matchMedia?.(REQUETE_TELEPHONE);
  mq?.addEventListener("change", rappel);
  return () => mq?.removeEventListener("change", rappel);
}

/**
 * Vrai sous 48rem. Faux au rendu serveur, qui ne connaît pas l'écran : ne
 * s'en servir que pour ce qui n'existe qu'après un geste (une feuille, un
 * focus), jamais pour choisir le premier rendu d'une page.
 */
export function useEstTelephone(): boolean {
  return useSyncExternalStore(
    abonner,
    () => window.matchMedia?.(REQUETE_TELEPHONE).matches ?? false,
    () => false,
  );
}
