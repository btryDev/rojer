import type { SidebarItemId } from "@/components/layout/sidebar-nav";

import { EnTetePage } from "./EnTetePage";

/**
 * Le repli de chargement d'une page d'entrée du rail (plan performance,
 * lot 3, 2026-10-28).
 *
 * Avant lui, un seul `loading.tsx` (`etablissements/[id]`) servait toutes les
 * pages : un clic sur « Calendrier » montrait un bandeau « Chargement… » puis
 * l'en-tête du calendrier, avec sa teinte et son dessin, surgissait d'un coup.
 * L'en-tête ne dépend d'aucune donnée — l'entrée du rail suffit —, alors le
 * repli le rend tel quel : le titre et la teinte de la section sont à l'écran
 * dès le clic, à leur place définitive, et seul le corps attend.
 *
 * Le descriptif, propre à chaque page, est remplacé par deux traits de sa
 * hauteur ; le dessin garde sa place sans se montrer (`enAttente`). Le corps
 * reprend le patron « Liste » de la charte, comme le repli commun : des
 * `.carte-board` vides, immobiles (charte § 7 : aucune surface ne pulse).
 *
 * Chaque `loading.tsx` de section l'appelle avec l'entrée de SA page ; la
 * garde `chargement-sections.test.ts` vérifie que l'entrée est la même que
 * celle de l'en-tête de la page, et qu'aucune fiche ne prend ce repli.
 */
export function ChargementSection({
  item,
  titre,
}: {
  item: Exclude<SidebarItemId, "tableau">;
  /** Le titre d'une sous-page (l'import du DUERP), comme `EnTetePage`. */
  titre?: string;
}) {
  return (
    <main
      className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16"
      aria-busy="true"
    >
      <p role="status" className="sr-only">
        Chargement…
      </p>
      <EnTetePage item={item} titre={titre} description={<DescriptifEnAttente />} enAttente />
      <div aria-hidden className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        <div className="carte-board h-[180px]" />
        <div className="grid gap-7 md:grid-cols-2">
          <div className="carte-board h-[220px]" />
          <div className="carte-board h-[220px]" />
        </div>
      </div>
    </main>
  );
}

/** Deux lignes du descriptif, à sa hauteur de ligne (1,55) : rendu dans le
 *  paragraphe de l'en-tête, d'où des `span` en bloc. */
function DescriptifEnAttente() {
  return (
    <span aria-hidden className="block">
      {["w-full", "w-[70%]"].map((largeur) => (
        <span key={largeur} className="block py-[0.33em]">
          <span
            className={`block h-[0.9em] rounded-[6px] bg-[color:var(--board-slate-pale)] ${largeur}`}
          />
        </span>
      ))}
    </span>
  );
}
