"use client";

// Les équipements suggérés, derrière un lien qui ouvre une fenêtre.
//
// Décision de la propriétaire du 2026-10-27 : la liste des suggestions n'est
// plus posée dans la page — elle y restait à vie, rien ne retenant « je n'en ai
// pas ». Le panneau (`PreRemplissagePanel`) est inchangé : seul son lieu change.
//
// UNE SEULE FENÊTRE, MONTÉE EN PERMANENCE PAR LA PAGE (revue du 2026-10-27).
// Portée par le lien qui l'ouvre, elle disparaissait avec lui : créer les
// équipements fait tomber la ligne « Déclarer vos équipements » (le parc n'est
// plus vide) et le lien de la barre (plus rien à suggérer), et le panneau
// perdait son message et l'avertissement d'un calendrier non recalculé — le
// défaut que la revue du 2026-10-14 avait fermé en gardant le panneau monté.
// Les déclencheurs ne font que l'ouvrir, par un événement de la page.

import { useCallback, useEffect, useState } from "react";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { buttonVariants } from "@/components/ui/button";
import { PreRemplissagePanel } from "./PreRemplissagePanel";
import { LIEN_DANS_PHRASE } from "./lien-dans-phrase";

const OUVRIR = "rojer:ouvrir-suggestions";

/** La fenêtre. À poser une fois, hors de tout bloc conditionnel. */
export function FenetreSuggestions(props: React.ComponentProps<typeof PreRemplissagePanel>) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  useEffect(() => {
    const ouvrir = () => setOuvert(true);
    window.addEventListener(OUVRIR, ouvrir);
    return () => window.removeEventListener(OUVRIR, ouvrir);
  }, []);

  return (
    <PanneauModal
      ouvert={ouvert}
      surFermer={fermer}
      surtitre="Suggestions"
      titre="Équipements souvent présents dans votre activité"
    >
      <PreRemplissagePanel {...props} />
    </PanneauModal>
  );
}

/** Un déclencheur : `lien` dans une phrase, `bouton` pour une ligne « à faire ». */
export function OuvrirSuggestions({ forme, libelle }: { forme: "lien" | "bouton"; libelle: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OUVRIR))}
      aria-haspopup="dialog"
      className={forme === "bouton" ? buttonVariants({ variant: "board", size: "boardSm" }) : LIEN_DANS_PHRASE}
    >
      {libelle}
    </button>
  );
}
