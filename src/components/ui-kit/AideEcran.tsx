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
import { PanneauModal } from "./PanneauModal";

export function AideEcran({
  titre,
  children,
}: {
  /** Titre de la modal — « Comment lire cette page », le plus souvent. */
  titre: string;
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
        aria-label={titre}
        title={titre}
        className="flex size-[34px] flex-none items-center justify-center rounded-full bg-[color:var(--board-card)] text-[color:var(--board-slate-mid)] shadow-[0_0_0_1px_rgba(13,18,36,.08)] transition-colors hover:bg-[color:var(--board-blue-pale)] hover:text-[color:var(--board-blue-ink)]"
      >
        <HelpCircle className="size-[18px]" />
      </button>
      <PanneauModal ouvert={ouvert} surFermer={fermer} surtitre="Comprendre" titre={titre}>
        {children}
      </PanneauModal>
    </>
  );
}
