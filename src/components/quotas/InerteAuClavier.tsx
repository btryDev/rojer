"use client";
// Ce qui est inerte en lecture seule (`data-ecriture-inerte`) l'est aussi au
// clavier (ADR-054 § 4). La feuille de style coupe la souris
// (`pointer-events: none`), pas la tabulation : un bouton Oui / Non atteint
// par Tab s'activait encore à Entrée, et un champ enregistré à la sortie
// s'éditait. Rendu seulement en lecture seule (`MarqueLectureSeule`).
//
// En capture sur le document : avant que React (attaché à la racine) ne voie
// l'événement. Le refus reste au serveur. Les contrôles inertes portent aussi
// `aria-disabled`, pour qu'un lecteur d'écran les annonce indisponibles — y
// compris ceux rendus après coup (panneau ouvert, liste dépliée).

import { useEffect } from "react";

const INERTE = "[data-ecriture-inerte]";
const CONTROLES = `${INERTE} :is(button, input, select, textarea, a[href], [role="button"], [role="radio"], [role="checkbox"])`;

function annoncerIndisponibles() {
  for (const el of document.querySelectorAll(CONTROLES))
    if (el.getAttribute("aria-disabled") !== "true") el.setAttribute("aria-disabled", "true");
}

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
    annoncerIndisponibles();
    const observateur = new MutationObserver(annoncerIndisponibles);
    observateur.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("focusin", quitter, true);
    document.addEventListener("click", arreter, true);
    return () => {
      observateur.disconnect();
      document.removeEventListener("focusin", quitter, true);
      document.removeEventListener("click", arreter, true);
    };
  }, []);
  return null;
}
