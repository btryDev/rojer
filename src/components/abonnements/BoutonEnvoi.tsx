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
  discret = false,
}: {
  children: React.ReactNode;
  variant: "board" | "boardClair";
  /**
   * Dans une carte d'offre (page Formules, 2026-11-17) : le bouton de la
   * landing, pleine largeur — d'encre sur la carte claire, blanc sur la carte
   * d'encre.
   */
  carte?: "claire" | "encre";
  /**
   * Dans une carte, un geste secondaire, en lien : s'abonner plus tôt à la
   * formule de l'essai (2026-11-17) — rien n'y pousse, il reste possible.
   */
  discret?: boolean;
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
        className={
          discret
            ? "w-full cursor-pointer bg-transparent py-1 text-center text-[0.88rem] font-semibold text-current underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-45"
            : `lp-btn w-full justify-center disabled:cursor-not-allowed disabled:opacity-45 ${carte === "encre" ? "lp-btn-blanc" : "lp-btn-ink"}`
        }
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
