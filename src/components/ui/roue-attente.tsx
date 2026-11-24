import { LoaderCircle } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * La roue d'un geste en cours (Apple HIG, « Buttons » : un indicateur
 * d'activité dans le bouton quand l'action n'est pas instantanée, 2026-11-24).
 * Décorative : le bouton qui la porte se dit occupé (`aria-busy`) et son
 * libellé change (« Enregistrer » → « Enregistrement… »). Immobile quand le
 * système demande de réduire les animations.
 *
 * Le bouton de base la pose seul (`<Button enCours>`) ; un bouton fait main
 * la pose lui-même, avec `aria-busy`.
 */
export function RoueAttente({ className }: { className?: string }) {
  return (
    <LoaderCircle
      aria-hidden
      data-roue=""
      className={cn("motion-safe:animate-spin", className)}
    />
  )
}
