"use client";

// AIDE D'ÉCRAN — le bouton « ? » d'une page et sa modal.
//
// Chaque écran de Rojer a des choses à expliquer une fois — d'où viennent
// les données, ce que comptent les compteurs, quel article fonde
// l'obligation. Posées en texte courant au-dessus du contenu, ces
// explications coûtent leur hauteur à chaque visite alors qu'on ne les
// lit qu'à la première ; le calendrier ouvrait sur trois lignes et deux
// badges avant sa première barre. Elles vivent donc derrière un « ? »,
// et ce composant est le motif commun : les autres pages rangeront leurs
// notes au même endroit.
//
// La modal reste volontairement bête : pas de portail, pas de pile de
// modales, pas de gestion de focus-trap complète — un écran d'aide est un
// texte qu'on ouvre et qu'on ferme. Échap ferme, le fond ferme, le focus
// arrive sur le panneau pour que le clavier et les lecteurs d'écran y
// entrent directement.

import { useCallback, useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DansAide } from "./dans-aide";
import { LIVRE } from "./livre";
import { PanneauModal } from "./PanneauModal";

/** Le « ? » rond, seul. */
const ROND =
  "flex size-[34px] flex-none items-center justify-center rounded-full bg-[color:var(--board-card)] text-[color:var(--board-slate-mid)] shadow-[0_0_0_1px_rgba(13,18,36,.08)] transition-colors hover:bg-[color:var(--board-blue-pale)] hover:text-[color:var(--board-blue-ink)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--board-blue-strong)]";

/** Le « ? » suivi d'un titre : la forme du livre (`livre.ts`), plus lisible. */
const LIGNE = cn(
  LIVRE,
  "-ml-2 max-w-full self-start text-left text-[13.5px] text-[color:var(--board-slate-ink)]",
);

export function AideEcran({
  titre,
  surtitre = "Comprendre",
  libelle,
  children,
}: {
  /** Titre de la modal — « Comment lire cette page », le plus souvent. */
  titre: string;
  /** Sur-titre de la modal. */
  surtitre?: string;
  /**
   * Texte affiché à côté du « ? » (2026-10-28, `WhyCard`) : quand l'aide
   * remplace une carte d'explication, son titre reste lisible sur l'écran et
   * le corps passe dans la modal. Absent : le « ? » rond seul.
   */
  libelle?: string;
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-haspopup="dialog"
        // Le rond n'a pas de texte : son nom est le titre de l'aide.
        aria-label={libelle ? undefined : titre}
        title={libelle ? undefined : titre}
        className={libelle ? LIGNE : ROND}
      >
        <HelpCircle
          aria-hidden
          className={libelle ? "size-4 flex-none text-[color:var(--board-slate-mid)]" : "size-[18px]"}
        />
        {libelle && <span>{libelle}</span>}
      </button>
      <PanneauModal ouvert={ouvert} surFermer={fermer} surtitre={surtitre} titre={titre}>
        <DansAide.Provider value={true}>{children}</DansAide.Provider>
      </PanneauModal>
    </>
  );
}
