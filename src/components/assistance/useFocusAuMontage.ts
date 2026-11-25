"use client";

import { useEffect, useRef } from "react";

/**
 * Le focus d'une étape ouverte par un geste (relecture React du 2026-11-24) :
 * le bouton cliqué a disparu du DOM, le focus irait au `<body>`. L'élément
 * visé porte `tabIndex={-1}` ; rien ne bouge au premier rendu, où `focaliser`
 * est faux (ou 0). Un compteur rend le focus à chaque retour : chaque
 * incrément le redonne (relecture du 2026-11-25).
 */
export function useFocusAuMontage<T extends HTMLElement>(focaliser: boolean | number) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (focaliser) ref.current?.focus();
  }, [focaliser]);
  return ref;
}
