"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { choisirSecteur } from "@/lib/duerps/actions";

export function ConfirmerSecteurButton({
  duerpId,
  secteurId,
}: {
  duerpId: string;
  secteurId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      data-ecriture
      variant="board"
      size="board"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await choisirSecteur(duerpId, secteurId);
        });
      }}
    >
      {pending ? "Application…" : "Confirmer et continuer →"}
    </Button>
  );
}
