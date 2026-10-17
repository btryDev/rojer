// Les états de « Ce qui doit être en place », rangés par usage (2026-10-17).
//
// Sorti de la page pour être rendu en test : la page est un composant serveur
// qui lit la session et la base, celui-ci ne reçoit que les familles déjà
// calculées par `listerEtatsPermanents` et ne lit rien d'autre. Il ne trie ni
// ne replie : l'ordre des familles, des blocs et des lignes est celui que la
// lecture rend, et il ne dépend pas de la déclaration (`ordre.ts`).
//
// LA HIÉRARCHIE, ET POURQUOI ELLE EST À DEUX ÉTAGES HORS CARTE. Une carte ne
// porte jamais deux niveaux de titrage (charte, interdit 11). La famille prend
// donc un titre de section AU-DESSUS de ses cartes, et chaque carte n'a plus
// qu'un sur-titre : la sous-catégorie. Une famille sans sous-catégorie n'a
// qu'une carte, sans sur-titre — il ne ferait que répéter le titre posé juste
// au-dessus (interdit 12).

import type { ReactNode } from "react";
import type {
  FamilleEtatsPermanents,
  LigneEtatPermanent,
} from "@/lib/etats-permanents/queries";
import { ancreFamille } from "@/lib/etats-permanents/ancre";
import { phraseCompteur } from "@/lib/etats-permanents/phrases";

/**
 * Le sommaire : les familles PRÉSENTES sur ce dossier, et elles seules — une
 * ancre vers une famille absente serait un lien mort (interdit 19). Les ancres
 * et les `id` sortent de la même fonction.
 *
 * Aucun défilement animé : le saut est celui du navigateur. En ajouter un
 * obligerait à le couper sous `prefers-reduced-motion` (interdit 22), pour
 * un gain nul sur une page qu'on parcourt de haut en bas.
 */
export function SommaireParUsage({
  familles,
}: {
  familles: FamilleEtatsPermanents[];
}) {
  if (familles.length === 0) return null;
  return (
    <nav aria-label="Sommaire">
      <ol className="m-0 flex list-none flex-wrap gap-x-7 gap-y-2 p-0">
        {familles.map((f) => (
          <li key={f.groupe} className="flex items-baseline gap-2">
            <a
              href={`#${ancreFamille(f.groupe)}`}
              className="text-[13.5px] font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4"
            >
              {f.libelle}
            </a>
            <span className="text-[12.5px] tabular-nums text-[color:var(--board-slate-mid)]">
              {f.enPlace} sur {f.total}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SectionsParUsage({
  familles,
  rendreLigne,
}: {
  familles: FamilleEtatsPermanents[];
  /** La ligne telle que la page la rend (`LigneEtat`, ses liens, son dossier). */
  rendreLigne: (l: LigneEtatPermanent) => ReactNode;
}) {
  return (
    <>
      {familles.map((f) => (
        <section
          key={f.groupe}
          id={ancreFamille(f.groupe)}
          aria-labelledby={`${ancreFamille(f.groupe)}-titre`}
          className="flex scroll-mt-8 flex-col gap-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2
              id={`${ancreFamille(f.groupe)}-titre`}
              className="board-titre m-0 text-[22px]"
            >
              {f.libelle}
            </h2>
            {/* Le compte de la famille dit d'où vient chaque « en place »,
                comme celui de l'en-tête et avec la même phrase : jamais
                « conformes », jamais un pourcentage. */}
            <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
              <span className="tabular-nums">
                {f.enPlace} sur {f.total}
              </span>
              {" · "}
              {phraseCompteur(f.enPlace, f.total, f.parLesTitres.enPlace)}
            </p>
          </div>

          {f.blocs.map((b) => (
            <div
              key={b.sous ?? f.groupe}
              className="carte-board px-7 py-6 sm:px-8"
            >
              {/* Barème « sur-titre de section » (§ 3) : la sous-catégorie
                  coiffe une carte, pas une ligne. Absent quand le bloc est la
                  famille entière : le titre est déjà au-dessus. */}
              {b.libelle && (
                <h3 className="board-eyebrow m-0 mb-3 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                  {b.libelle}
                </h3>
              )}
              <ul className="m-0 list-none p-0">
                {b.lignes.map((l) => rendreLigne(l))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
