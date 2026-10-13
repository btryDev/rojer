"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import { supprimerRisque } from "@/lib/risques/actions";
import { detailSuppressionRisque } from "./suppression-risque";

/**
 * Supprimer un risque personnalisé, ou RETIRER un risque du référentiel
 * retenu par erreur (relecture indépendante du 2026-10-12 : aucun bouton ne le
 * retirait, et la case de la liste le faisait sans demander). Le même geste
 * serveur (`supprimerRisque`) et la même question, qui dit ce qui part — comme
 * la suppression d'une unité.
 */
export function SupprimerRisqueButton({
  id,
  referentiel = false,
  nbActions,
  nbLevees,
}: {
  id: string;
  /** Un risque du référentiel : « Retirer », et il retourne à la liste. */
  referentiel?: boolean;
  nbActions: number;
  nbLevees: number;
}) {
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  return (
    <>
      <Button
        variant="boardClair"
        size="boardSm"
        disabled={pending}
        onClick={() =>
          demander({
            titre: referentiel
              ? "Retirer ce risque de l'unité de travail ?"
              : "Supprimer ce risque de l'unité de travail ?",
            detail: detailSuppressionRisque({ referentiel, nbActions, nbLevees }),
            agir: referentiel ? "Retirer le risque" : "Supprimer le risque",
            alors: () =>
              startTransition(async () => {
                await supprimerRisque(id);
              }),
          })
        }
      >
        {referentiel ? "Retirer ce risque" : "Supprimer"}
      </Button>
      {confirmation}
    </>
  );
}
