"use client";

import { useEffect } from "react";

/**
 * Pose le focus sur la section que vise l'ancre de l'adresse, à l'arrivée sur
 * la page.
 *
 * **Le défaut qu'il corrige** (dernière relecture de c6, #54) : un lien du
 * widget du tableau de bord mène à `…/etats-permanents#usage-…`. `next/link`
 * fait défiler jusqu'à la section, mais ne déplace pas le focus — une
 * navigation côté client n'est pas un saut d'ancre du navigateur. Au clavier
 * ou au lecteur d'écran, on arrivait en haut de la page, la section visée à
 * l'écran et le focus ailleurs.
 *
 * Il ne fait QUE ce qu'un saut d'ancre natif aurait fait : les sections portent
 * déjà `tabIndex={-1}` (`SectionsParUsage`) et l'anneau `focus-visible`. Il ne
 * fait défiler rien lui-même (`preventScroll`) : le défilement reste celui de
 * Next, et `prefers-reduced-motion` n'a rien à arbitrer ici. Une ancre qui ne
 * vise aucune section focalisable est ignorée.
 */
export function FocusSurAncre() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const cible = document.getElementById(id);
    if (cible && cible.tabIndex === -1) cible.focus({ preventScroll: true });
  }, []);
  return null;
}
