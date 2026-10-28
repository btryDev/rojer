import { CadreEnTete } from "./CadreEnTete";
import type { RepliSection } from "./repli-de-chargement";

/**
 * Le repli de chargement d'une page d'entrée du rail (plan performance,
 * lot 3, 2026-10-28).
 *
 * Avant lui, toutes les pages attendaient sous le même bandeau
 * « Chargement… », puis l'en-tête de la page — titre, teinte — surgissait
 * d'un coup. L'en-tête ne dépend d'aucune donnée, alors le repli le rend :
 * le titre et la teinte de la section sont à l'écran dès le clic, à leur
 * place, et seul le corps attend.
 *
 * Le descriptif, propre à chaque page, est remplacé par deux traits de sa
 * hauteur. Le panneau teinté reste vide : les dessins s'animent au montage,
 * et ce repli est un composant client (`etablissements/[id]/loading.tsx`) —
 * les importer pour ne pas les montrer les enverrait au navigateur sur chaque
 * écran (`CadreEnTete`). Le panneau tient sa hauteur minimale ; un dessin
 * plus haut l'allonge à l'arrivée de la page.
 *
 * Le corps reprend le patron « Liste » de la charte, comme le repli neutre :
 * des `.carte-board` vides, immobiles (charte § 7 : aucune surface ne pulse).
 */
export function ChargementSection({ item, titre }: RepliSection) {
  return (
    <main
      className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16"
      aria-busy="true"
    >
      <p role="status" className="sr-only">
        Chargement…
      </p>
      <CadreEnTete item={item} titre={titre} description={<DescriptifEnAttente />} panneau={<span />} />
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
