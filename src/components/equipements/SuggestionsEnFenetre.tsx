"use client";

// Les équipements suggérés, derrière un lien qui ouvre une fenêtre.
//
// Décision de la propriétaire du 2026-10-27 : la liste des suggestions n'est
// plus posée dans la page — elle y restait à vie, rien ne retenant « je n'en ai
// pas ». Le panneau (`PreRemplissagePanel`) est inchangé : seul son lieu change.
//
// UNE SEULE FENÊTRE, POSÉE PAR LA PAGE (revue du 2026-10-27). Portée par le
// lien qui l'ouvre, elle disparaissait avec lui pendant qu'on la lisait : créer
// les équipements fait tomber la ligne « Déclarer vos équipements » et le lien
// de la barre, et le panneau perdait son message et l'avertissement d'un
// calendrier non recalculé. Posée par la page, elle reste ouverte sur ce
// résultat jusqu'à ce qu'on la ferme ; fermée, le panneau est démonté
// (`PanneauModal`) et le message part avec elle — il a été lu. Les déclencheurs
// ne font que l'ouvrir, par un événement de la page, et le focus leur revient
// à la fermeture.

import { useCallback, useEffect, useRef, useState } from "react";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { buttonVariants } from "@/components/ui/button";
import { PreRemplissagePanel } from "./PreRemplissagePanel";
import { LIEN_DANS_PHRASE } from "./lien-dans-phrase";

const OUVRIR = "rojer:ouvrir-suggestions";

/** La fenêtre. À poser une fois, hors de tout bloc conditionnel. */
export function FenetreSuggestions(props: React.ComponentProps<typeof PreRemplissagePanel>) {
  const [ouvert, setOuvert] = useState(false);
  const declencheur = useRef<HTMLElement | null>(null);
  const fermer = useCallback(() => {
    setOuvert(false);
    declencheur.current?.focus();
  }, []);
  useEffect(() => {
    const ouvrir = (e: Event) => {
      declencheur.current = e instanceof CustomEvent && e.detail instanceof HTMLElement ? e.detail : null;
      setOuvert(true);
    };
    window.addEventListener(OUVRIR, ouvrir);
    return () => window.removeEventListener(OUVRIR, ouvrir);
  }, []);

  return (
    <PanneauModal
      ouvert={ouvert}
      surFermer={fermer}
      surtitre="D'après votre activité"
      titre="Suggestions d'équipements"
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
      onClick={(e) => window.dispatchEvent(new CustomEvent(OUVRIR, { detail: e.currentTarget }))}
      aria-haspopup="dialog"
      className={forme === "bouton" ? buttonVariants({ variant: "board", size: "boardSm" }) : LIEN_DANS_PHRASE}
    >
      {libelle}
    </button>
  );
}
