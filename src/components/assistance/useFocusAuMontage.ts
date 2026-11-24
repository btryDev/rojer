"use client";

import { useEffect, useRef } from "react";

/**
 * Le focus d'une étape ouverte par un geste (relecture React du 2026-11-24) :
 * le bouton cliqué a disparu du DOM, le focus irait au `<body>`. L'élément
 * visé porte `tabIndex={-1}` ; rien ne bouge au premier rendu, où `focaliser`
 * est faux.
 */
export function useFocusAuMontage<T extends HTMLElement>(focaliser: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (focaliser) ref.current?.focus();
  }, [focaliser]);
  return ref;
}
