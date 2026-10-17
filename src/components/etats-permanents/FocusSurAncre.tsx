"use client";

import { useEffect } from "react";
import { PREFIXE_ANCRE_FAMILLE } from "@/lib/etats-permanents/ancre";

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
 * Next, et `prefers-reduced-motion` n'a rien à arbitrer ici.
 *
 * **Seule une ancre de famille est lue** (`PREFIXE_ANCRE_FAMILLE`, la constante
 * qui pose l'id). ~~`decodeURIComponent` sur tout le hash, puis une garde
 * `tabIndex === -1`~~ (2026-10-17, revue de c6) : une ancre mal encodée
 * (`#%E0%A4%A`) levait `URIError` et faisait tomber toute la page sur sa
 * limite d'erreur ; et la garde ne gardait rien — un `div` sans attribut rend
 * aussi `-1`. Les ids de famille sont en ASCII : sans décodage, rien ne lève,
 * et le préfixe dit seul ce qui est visé.
 *
 * **Il ne vole pas un focus déjà posé** : il n'agit que si le focus est encore
 * sur `body`.
 *
 * **`hashchange` n'est pas écouté, et c'est voulu.** Le sommaire de la page
 * pointe vers ses sections par des ancres natives (`<a href="#…">`) : le
 * navigateur y déplace lui-même le focus, la section étant focalisable. Seule
 * l'arrivée par une navigation côté client — le widget, par `next/link` —
 * laisse le focus en haut de page, et elle monte ce composant.
 */
export function FocusSurAncre() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id.startsWith(PREFIXE_ANCRE_FAMILLE)) return;
    if (document.activeElement !== document.body) return;
    document.getElementById(id)?.focus({ preventScroll: true });
  }, []);
  return null;
}
