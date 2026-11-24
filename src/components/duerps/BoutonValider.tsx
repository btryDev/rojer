"use client";

import { useFormStatus } from "react-dom";
import { buttonVariants } from "@/components/ui/button";
import { RoueAttente } from "@/components/ui/roue-attente";

/** Le bouton d'envoi de `ValiderEtapeBouton` : inerte et annoncé pendant l'envoi, pas de double validation. */
export function BoutonValider({ libelle, disabled }: { libelle: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonVariants({ variant: "board", size: "board" })}
    >
      {pending ? <RoueAttente className="size-4" /> : null}
      {pending ? "Validation…" : libelle}
    </button>
  );
}
