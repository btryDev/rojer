import type { ReactNode } from "react";
import { Livre } from "@/components/ui-kit/LegalBadge";

/**
 * Le motif des aides du parcours de création (2026-11-16, retours de tests
 * en préprod) : à l'écran, une phrase et un exemple ; le détail juridique,
 * gardé tel quel puisqu'il est exact, derrière « En savoir plus ».
 *
 * Un `<details>` (le livre de la charte) et non une modal : le détail reste
 * dans le document, rendu côté serveur, lisible sans script et par les
 * gardes qui vérifient qu'une aide partagée avec la fiche est affichée
 * entière (`question-matieres.test.tsx`).
 */
export function EnSavoirPlus({
  libelle = "En savoir plus",
  children,
}: {
  libelle?: string;
  children: ReactNode;
}) {
  return (
    <Livre libelle={libelle} ouvreLaLigne className="mt-1 block">
      <div className="[&>p]:m-0 [&>p+p]:mt-2">{children}</div>
    </Livre>
  );
}
