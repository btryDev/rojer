"use client";
// Un bouton d'envoi qui se ferme pendant l'envoi : un double clic ne fait pas
// deux changements de formule chez Stripe.

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function BoutonEnvoi({
  children,
  variant,
  disabled,
  describedBy,
  name,
  value,
  carte,
}: {
  children: React.ReactNode;
  variant: "board" | "boardClair";
  /**
   * Dans une carte d'offre (page Formules, 2026-11-17) : le bouton de la
   * landing, pleine largeur — d'encre sur la carte claire, blanc sur la carte
   * d'encre.
   */
  carte?: "claire" | "encre";
  disabled?: boolean;
  describedBy?: string;
  /** Un bouton qui porte une valeur au formulaire (deux gestes, un formulaire). */
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  if (carte)
    return (
      <button
        type="submit"
        name={name}
        value={value}
        disabled={disabled || pending}
        aria-describedby={describedBy}
        className={`lp-btn w-full justify-center disabled:cursor-not-allowed disabled:opacity-45 ${carte === "encre" ? "lp-btn-blanc" : "lp-btn-ink"}`}
      >
        {pending ? "Un instant…" : children}
      </button>
    );
  return (
    <Button
      type="submit"
      variant={variant}
      size="board"
      name={name}
      value={value}
      disabled={disabled || pending}
      aria-describedby={describedBy}
    >
      {pending ? "Un instant…" : children}
    </Button>
  );
}
