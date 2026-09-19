"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import { cloturerPlan, supprimerPlan } from "@/lib/plan-prevention/actions";

export function BoutonCloturer({ planId }: { planId: string }) {
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  return (
    <>
      <Button
        type="button"
        variant="board"
        size="board"
        disabled={pending}
        onClick={() =>
          demander({
            titre: "Clôturer ce plan de prévention ?",
            detail:
              "Le plan passe en « clos » : l'intervention est déclarée " +
              "terminée. Il reste au dossier avec ses signatures — c'est un " +
              "état qui se change, pas une suppression. Les liens de " +
              "signature encore ouverts sont désactivés.",
            agir: "Clôturer le plan",
            alors: () =>
              startTransition(async () => {
                await cloturerPlan(planId);
              }),
          })
        }
      >
        {pending ? "…" : "Clôturer le plan"}
      </Button>
      {confirmation}
    </>
  );
}

export function BoutonSupprimerPlan({ planId }: { planId: string }) {
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  return (
    <>
      <Button
        type="button"
        variant="boardClair"
        size="boardSm"
        disabled={pending}
        onClick={() =>
          // Le serveur décide entre les deux sorties selon l'état du plan
          // (`supprimerPlan`) : un plan non encore signé est effacé, un plan
          // signé passe en « annulé ». La question dit les deux plutôt que
          // d'annoncer une suppression qui n'aura pas toujours lieu — l'ancien
          // libellé, « Supprimer / annuler ce plan ? », laissait à
          // l'utilisateur le soin de deviner lequel des deux le concernait.
          demander({
            titre: "Supprimer ce plan de prévention ?",
            detail:
              "Un plan qui n'a reçu aucune signature et pour lequel aucun " +
              "lien de signature n'a été envoyé est effacé, avec les mesures " +
              "qui y ont été saisies. Sinon, il passe en « annulé » et reste " +
              "au dossier : les signatures recueillies ne se détruisent pas. " +
              "Les liens de signature encore ouverts sont désactivés.",
            agir: "Supprimer le plan",
            alors: () =>
              startTransition(async () => {
                await supprimerPlan(planId);
              }),
          })
        }
      >
        {pending ? "…" : "Supprimer"}
      </Button>
      {confirmation}
    </>
  );
}
