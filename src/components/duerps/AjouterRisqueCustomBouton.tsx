"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { AjouterRisqueCustomForm } from "./AjouterRisqueCustomForm";

/**
 * « Ajouter un risque spécifique », en tête de la liste des risques retenus,
 * ouvre une fenêtre (2026-11-12) : le formulaire vivait tout en bas de la
 * page, où on ne le voyait pas. Même formulaire, même action serveur.
 */
export function AjouterRisqueCustomBouton({ uniteId }: { uniteId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  return (
    <>
      <Button
        data-ecriture
        type="button"
        variant="boardClair"
        size="boardSm"
        onClick={() => setOuvert(true)}
      >
        + Ajouter un risque spécifique
      </Button>
      <PanneauModal
        ouvert={ouvert}
        surFermer={fermer}
        surtitre="Risques retenus"
        titre="Ajouter un risque spécifique"
      >
        <AjouterRisqueCustomForm uniteId={uniteId} surAjout={fermer} />
      </PanneauModal>
    </>
  );
}
