"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import {
  marquerEnCours,
  marquerTermine,
  supprimerPermisFeu,
} from "@/lib/permis-feu/actions";

export function BoutonDemarrer({ permisFeuId }: { permisFeuId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="board"
      size="board"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await marquerEnCours(permisFeuId);
        })
      }
    >
      {pending ? "…" : "Démarrer les travaux"}
    </Button>
  );
}

export function BoutonTerminer({ permisFeuId }: { permisFeuId: string }) {
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
          // La seule des seize questions qui ne garde pas une perte de données
          // mais une déclaration : le permis passe en « terminé », et c'est
          // l'utilisateur qui atteste. La carte pose donc les deux points à
          // vérifier plutôt qu'un avertissement.
          demander({
            titre: "Déclarer la surveillance post-travaux terminée ?",
            detail:
              "Vous attestez qu'aucun point chaud et aucune fumée ne " +
              "subsistent sur la zone. Le permis passe en « terminé » et la " +
              "surveillance cesse d'être demandée.",
            agir: "Marquer terminé",
            alors: () =>
              startTransition(async () => {
                await marquerTermine(permisFeuId);
              }),
          })
        }
      >
        {pending ? "…" : "Marquer terminé"}
      </Button>
      {confirmation}
    </>
  );
}

export function BoutonSupprimer({ permisFeuId }: { permisFeuId: string }) {
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
          // « Cette action est définitive » était faux une fois sur deux :
          // `supprimerPermisFeu` n'efface qu'un permis en brouillon ou en
          // attente de signatures, et annule les autres pour garder la piste
          // d'audit. La question dit maintenant laquelle des deux sorties
          // s'applique, et à quoi.
          demander({
            titre: "Supprimer ce permis de feu ?",
            detail:
              "Un permis qui n'a reçu aucune signature et pour lequel aucun " +
              "lien de signature n'a été envoyé est effacé, avec les mesures " +
              "de prévention qui y ont été saisies. Sinon, il passe en " +
              "« annulé » et reste au dossier : la piste d'audit des travaux " +
              "par point chaud se conserve.",
            agir: "Supprimer le permis",
            alors: () =>
              startTransition(async () => {
                await supprimerPermisFeu(permisFeuId);
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
