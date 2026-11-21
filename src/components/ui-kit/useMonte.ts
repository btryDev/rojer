import { useSyncExternalStore } from "react";

const sAbonner = () => () => {};

/**
 * Vrai une fois le composant monté au navigateur, faux au rendu serveur ET à
 * l'hydratation (2026-11-21) : ce qui dépend de `document` ou de l'horloge
 * de l'écran attend ce rendu-là, sans écart d'hydratation.
 */
export function useMonte(): boolean {
  return useSyncExternalStore(
    sAbonner,
    () => true,
    () => false,
  );
}
