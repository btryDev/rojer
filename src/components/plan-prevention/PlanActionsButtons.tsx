"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import { cloturerPlan, supprimerPlan } from "@/lib/plan-prevention/actions";
import { cn } from "@/lib/utils";
import { GESTE_FICHE } from "./classes-fiche";

/** Les gestes de la fiche (`GESTE_FICHE`) : « Supprimer » en encre rouge. */
const ENTETE_SUPPRIMER = cn(GESTE_FICHE, "text-[color:var(--board-signal-ink)]");

export function BoutonCloturer({ planId, entete = false }: { planId: string; entete?: boolean }) {
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  return (
    <>
      <Button data-ecriture
        type="button"
        variant="board"
        size="board"
        className={entete ? GESTE_FICHE : undefined}
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
        {pending ? "…" : entete ? "Clôturer" : "Clôturer le plan"}
      </Button>
      {confirmation}
    </>
  );
}

export function BoutonSupprimerPlan({ planId, entete = false }: { planId: string; entete?: boolean }) {
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  return (
    <>
      <Button data-ecriture
        type="button"
        variant="boardClair"
        size="boardSm"
        className={entete ? ENTETE_SUPPRIMER : undefined}
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
