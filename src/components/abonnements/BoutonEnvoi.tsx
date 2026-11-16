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
}: {
  children: React.ReactNode;
  variant: "board" | "boardClair";
  disabled?: boolean;
  describedBy?: string;
  /** Un bouton qui porte une valeur au formulaire (deux gestes, un formulaire). */
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
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
