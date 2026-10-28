import { CorpsEnAttente } from "@/components/layout/CorpsEnAttente";

import { CadreEnTete } from "./CadreEnTete";
import { aUneIllustration } from "./illustrations/liste";
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
 * hauteur ; la bascule de vue, quand la page en porte une, par une pastille
 * de sa taille. Le panneau teinté suit la règle de l'en-tête (pas de dessin,
 * pas de panneau) mais reste vide : les dessins s'animent au montage, et ce
 * repli est un composant client
 * (`etablissements/[id]/loading.tsx`) — les importer pour ne pas les montrer
 * les enverrait au navigateur sur chaque écran (`CadreEnTete`). Le panneau
 * tient sa hauteur minimale ; un dessin plus haut l'allonge à l'arrivée.
 */
export function ChargementSection({ item, titre, bascule }: RepliSection) {
  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <p role="status" className="sr-only">
        Chargement…
      </p>
      <CadreEnTete
        item={item}
        titre={titre}
        description={<DescriptifEnAttente />}
        avecPanneau={aUneIllustration(item)}
      >
        {bascule ? (
          // La hauteur des deux bascules de l'en-tête (`SelecteurLecture`,
          // `OngletsPage`) : une pastille `p-1` autour de boutons de 13 px.
          <div
            aria-hidden
            className="h-10 w-[260px] max-w-full rounded-full bg-[color:var(--board-slate-pale)]"
          />
        ) : null}
      </CadreEnTete>
      <CorpsEnAttente />
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
