"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import { supprimerRapport } from "@/lib/rapports/actions";

export function SupprimerRapportButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  return (
    // La carte de question est un frère du bouton : les deux rangées d'où ce
    // bouton part — le pied de fiche d'une vérification, la ligne du registre
    // — sont `flex-wrap`, donc la carte passe à la ligne et prend la largeur
    // au lieu de se glisser entre deux pilules.
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        data-ecriture
        onClick={() =>
          demander({
            titre: "Supprimer ce rapport de vérification ?",
            detail:
              "Le fichier est retiré du stockage : c'est la pièce qu'on " +
              "présente en cas de contrôle, et rien ne la reconstitue. Si " +
              "c'était le seul rapport de cette vérification, sa réalisation " +
              "n'est plus prouvée et elle redevient une vérification à faire.",
            agir: "Supprimer le rapport",
            alors: () =>
              startTransition(async () => {
                await supprimerRapport(id);
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
