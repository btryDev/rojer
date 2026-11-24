"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Le bouton d'envoi de `ValiderEtapeBouton` : inerte et annoncé pendant l'envoi, pas de double validation. */
export function BoutonValider({ libelle, disabled }: { libelle: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="board" size="board" enCours={pending} disabled={disabled}>
      {pending ? "Validation…" : libelle}
    </Button>
  );
}
