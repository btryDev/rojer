"use client";

// Les équipements suggérés, derrière un lien qui ouvre une fenêtre.
//
// Décision de la propriétaire du 2026-10-27 : la liste des suggestions n'est
// plus posée dans la page — elle y restait à vie, rien ne retenant « je n'en ai
// pas ». Le panneau (`PreRemplissagePanel`) est inchangé : seul son lieu change.

import { useCallback, useState } from "react";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { buttonVariants } from "@/components/ui/button";
import { PreRemplissagePanel } from "./PreRemplissagePanel";

type Props = React.ComponentProps<typeof PreRemplissagePanel> & {
  /** `lien` : dans une phrase ; `bouton` : le geste d'une ligne « à faire ». */
  forme: "lien" | "bouton";
  libelle: string;
};

export function SuggestionsEnFenetre({ forme, libelle, ...panneau }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-haspopup="dialog"
        className={
          forme === "bouton"
            ? buttonVariants({ variant: "board", size: "boardSm" })
            : "font-semibold text-[color:var(--board-ink)] underline underline-offset-2 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-ink)]"
        }
      >
        {libelle}
      </button>
      <PanneauModal
        ouvert={ouvert}
        surFermer={fermer}
        surtitre="Suggestions"
        titre="Équipements souvent présents dans votre activité"
      >
        <PreRemplissagePanel {...panneau} />
      </PanneauModal>
    </>
  );
}
