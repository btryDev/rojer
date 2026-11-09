"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import { supprimerActionPlan } from "@/lib/actions/plan";

export function SupprimerActionButton({
  id,
  redirectTo,
}: {
  id: string;
  redirectTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { demander, confirmation } = useConfirmation();

  return (
    <>
      <Button data-ecriture
        variant="boardClair"
        size="boardSm"
        disabled={pending}
        onClick={() =>
          demander({
            titre: "Supprimer cette action du plan ?",
            detail:
              "Son échéance, son responsable et ce qui a déjà été noté de son " +
              "avancement partent avec elle. Ce qu'elle traitait — un risque " +
              "du DUERP, une vérification — reste, mais sans plus rien en " +
              "regard.",
            agir: "Supprimer l'action",
            alors: () =>
              startTransition(async () => {
                await supprimerActionPlan(id);
                if (redirectTo) router.push(redirectTo);
                else router.refresh();
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
