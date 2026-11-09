"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import { supprimerPrestataire } from "@/lib/prestataires/actions";

export function SupprimerPrestataireButton({
  etablissementId,
  prestataireId,
}: {
  etablissementId: string;
  prestataireId: string;
}) {
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  return (
    <>
      <Button data-ecriture
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          demander({
            titre: "Supprimer ce prestataire de votre annuaire ?",
            detail:
              "Ses coordonnées et ses domaines s'en vont, et les pièces " +
              "téléversées — attestation URSSAF, assurance RC pro, Kbis — " +
              "sont retirées du stockage. Ce sont elles qui justifient de " +
              "l'avoir choisi.",
            agir: "Supprimer le prestataire",
            alors: () =>
              startTransition(async () => {
                await supprimerPrestataire(etablissementId, prestataireId);
              }),
          })
        }
      >
        {pending ? "Suppression…" : "Supprimer"}
      </Button>
      {confirmation}
    </>
  );
}
