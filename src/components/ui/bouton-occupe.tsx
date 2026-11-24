import type { ComponentProps } from "react"

import { RoueAttente } from "@/components/ui/roue-attente"

/**
 * Le bouton fait main qui sait dire qu'il travaille — la même règle que
 * `<Button enCours>` (Apple HIG, « Buttons », 2026-11-24), pour les pilules
 * qui gardent leurs propres classes (page publique, signatures, plan de
 * prévention) : la roue en tête, fermé pendant l'envoi, `aria-busy`. Le
 * libellé reste à l'appelant (« Envoi… »). Un `disabled` passé avec reste lu.
 */
export function BoutonOccupe({
  enCours = false,
  disabled,
  children,
  ...props
}: ComponentProps<"button"> & { enCours?: boolean }) {
  return (
    <button {...props} disabled={disabled || enCours} aria-busy={enCours || undefined}>
      {enCours ? <RoueAttente className="size-4" /> : null}
      {children}
    </button>
  )
}
