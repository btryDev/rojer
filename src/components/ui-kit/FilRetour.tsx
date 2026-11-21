// Le fil de retour d'une page de détail : deux questions distinctes, deux
// liens distincts.
//
//   ← Calendrier        d'où je viens (la provenance, cf.
//                       `src/lib/navigation/provenance.ts`)
//   Plan d'actions      où cette fiche vit (le parent canonique)
//
// Sans provenance, le premier lien *est* le parent canonique et le second
// disparaît : la page se comporte comme avant. Le parent n'est jamais
// retiré — arriver du calendrier ne doit pas fermer la porte du plan
// d'actions, seulement cesser d'y renvoyer de force.
//
// ~~En capitales monospacées, petites, aux jetons du board~~ [2026-11-21,
// décision de la propriétaire, « il faut unifier » : chaque lien est le
// bouton clair « ← … » du DUERP (`LienRetour`) ; toutes les fiches qui
// passent par ici changent ensemble].

import { LienRetour } from "@/components/duerps/LienRetour";
import { retoursDeLaFiche, type Provenance } from "@/lib/navigation/provenance";

export function FilRetour({
  provenance,
  canonique,
  className,
}: {
  provenance: Provenance | null;
  /** Là où cette fiche vit dans l'arborescence — le parent de toujours. */
  canonique: Provenance;
  className?: string;
}) {
  // Deux liens vers le même écran ne s'affichent pas deux fois parce que
  // l'un porte des filtres : la provenance ne s'ajoute que si elle mène
  // ailleurs. Une provenance qui mène au parent garde son adresse (ses
  // filtres) mais prend son nom : « ← Équipement » quand la page sait dire
  // « ← BAES salle » (contrôle visuel du 2026-10-24).
  const { retour, parent } = retoursDeLaFiche(provenance, canonique);

  return (
    <nav aria-label="Retour" className={"flex flex-wrap items-center gap-2" + (className ? ` ${className}` : "")}>
      <LienRetour href={retour.href}>{retour.label}</LienRetour>
      {parent && <LienRetour href={parent.href}>{parent.label}</LienRetour>}
    </nav>
  );
}
