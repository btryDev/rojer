import Link from "next/link";
import { cn } from "@/lib/utils";

// Le fil d'Ariane : OÙ la page vit dans l'arborescence (ADR-014). Il ne suit
// jamais le chemin parcouru — c'est le rôle du retour (`FilRetour`,
// `retour` d'`AppTopbar`), qui dit d'où l'on vient.
//
// Extrait d'`AppTopbar` le 2026-10-13 : les pages d'entrée qui portent leur
// propre bandeau (permis de feu, plans de prévention, zones) disaient la même
// relation — « cette page est rangée sous l'établissement » — par une flèche
// de retour écrite en dur, quand le carnet sanitaire, leur frère, la disait
// par ce fil. Deux idiomes pour une relation (contrôle visuel du 2026-10-13) ;
// un seul composant, pour qu'il n'y en ait plus qu'un.

export type Crumb = {
  href?: string;
  label: string;
};

export function FilAriane({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="mb-1.5 flex min-w-0 items-center text-[12.5px] text-[color:var(--board-slate-mid)]"
    >
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        // Le premier maillon — la raison sociale — est le seul qui cède :
        // une raison sociale longue se tronque plutôt que de passer à la
        // ligne ou de pousser la page courante hors du bandeau. Les maillons
        // suivants sont des libellés du rail, courts et fixes.
        const racine = i === 0 && !last;
        return (
          <span
            key={i}
            className={racine ? "flex min-w-0 items-center" : "flex flex-none items-center"}
          >
            {c.href && !last ? (
              <Link
                href={c.href}
                className={cn(
                  "transition-colors hover:text-[color:var(--board-ink)]",
                  racine && "min-w-0 truncate",
                )}
              >
                {c.label}
              </Link>
            ) : (
              <strong
                className={cn(
                  last
                    ? "font-medium text-[color:var(--board-ink)]"
                    : "font-normal",
                  racine && "min-w-0 truncate",
                )}
              >
                {c.label}
              </strong>
            )}
            {!last ? (
              /* Le chevron est une graduation, pas du texte : il porte
                 l'ardoise claire plutôt qu'une opacité, qui fabriquait
                 un gris hors famille. */
              <span
                aria-hidden
                className="mx-1.5 flex-none text-[color:var(--board-slate)]"
              >
                ›
              </span>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
