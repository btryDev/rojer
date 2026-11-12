"use client";

import { useFormStatus } from "react-dom";
import { buttonVariants } from "@/components/ui/button";

/** Le bouton d'envoi de `ValiderEtapeBouton` : inerte et annoncé pendant l'envoi, pas de double validation. */
export function BoutonValider({ libelle, disabled }: { libelle: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={buttonVariants({ variant: "board", size: "board" })}
    >
      {pending ? "Validation…" : libelle}
    </button>
  );
}
