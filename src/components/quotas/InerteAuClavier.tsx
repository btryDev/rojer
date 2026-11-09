"use client";
// Ce qui est inerte en lecture seule (`data-ecriture-inerte`) l'est aussi au
// clavier (ADR-054 § 4). La feuille de style coupe la souris
// (`pointer-events: none`), pas la tabulation : un bouton Oui / Non atteint
// par Tab s'activait encore à Entrée, et un champ enregistré à la sortie
// s'éditait. Rendu seulement en lecture seule (`MarqueLectureSeule`).
//
// En capture sur le document : avant que React (attaché à la racine) ne voie
// l'événement. Le refus reste au serveur.

import { useEffect } from "react";

const INERTE = "[data-ecriture-inerte]";

export function InerteAuClavier() {
  useEffect(() => {
    const dans = (e: Event) => e.target instanceof Element && e.target.closest(INERTE) !== null;
    const quitter = (e: FocusEvent) => {
      if (dans(e) && e.target instanceof HTMLElement) e.target.blur();
    };
    const arreter = (e: Event) => {
      if (!dans(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    document.addEventListener("focusin", quitter, true);
    document.addEventListener("click", arreter, true);
    return () => {
      document.removeEventListener("focusin", quitter, true);
      document.removeEventListener("click", arreter, true);
    };
  }, []);
  return null;
}
