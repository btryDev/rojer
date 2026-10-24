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

import Link from "next/link";
import { retourDistinct, type Provenance } from "@/lib/navigation/provenance";

// Jetons du board, pas du papier : le fil ouvre une fiche qui vit dans la
// même page que le calendrier — `text-muted-foreground` y posait un gris
// d'une autre famille, visible à côté de l'ardoise H205.
const STYLE_LIEN =
  "font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors";

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
  // ailleurs.
  const ailleurs = retourDistinct(provenance, canonique.href);
  // Une provenance qui mène au parent garde son adresse (ses filtres) mais
  // prend son nom : « ← Équipement » quand la page sait dire « ← BAES salle »
  // (contrôle visuel du 2026-10-24).
  const retour = !provenance
    ? canonique
    : ailleurs
      ? provenance
      : { href: provenance.href, label: canonique.label };

  return (
    <nav
      aria-label="Retour"
      className={
        "flex flex-wrap items-center gap-x-3 gap-y-1" +
        (className ? ` ${className}` : "")
      }
    >
      <Link
        href={retour.href}
        className={`${STYLE_LIEN} text-[color:var(--board-slate-soft)] hover:text-[color:var(--board-ink)]`}
      >
        ← {retour.label}
      </Link>
      {ailleurs && (
        <>
          <span aria-hidden className="text-[color:var(--board-slate)]">
            ·
          </span>
          <Link
            href={canonique.href}
            className={`${STYLE_LIEN} text-[color:var(--board-slate)] hover:text-[color:var(--board-ink)]`}
          >
            {canonique.label}
          </Link>
        </>
      )}
    </nav>
  );
}
