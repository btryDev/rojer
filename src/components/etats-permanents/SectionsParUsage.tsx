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
 * Le compte de l'en-tête de PAGE : le chiffre, et sous lui la SEULE phrase de
 * l'écran qui dit qui affirme « en place » (`phraseCompteur`, ADR-027,
 * amendement du 2026-10-17, § 10). Sorti de la page pour que le test rende
 * l'écran entier — en-tête, sommaire, familles — et compte la phrase une
 * fois, pas trois.
 *
 * Le compteur est MESURÉ, jamais écrit à la main : `listerEtatsPermanents`
 * le calcule sur ce que le moteur rend pour CE dossier.
 */
export function CompteurDeLaPage({
  enPlace,
  total,
  parLesTitres,
}: {
  enPlace: number;
  total: number;
  /** La part d'`enPlace` établie d'après les titres déclarés. */
  parLesTitres: number;
}) {
  if (total === 0) return null;
  return (
    // `data-compteur-page` : le test du widget relève ce bloc sur l'écran et
    // dans le widget, qui le rend aussi (2026-10-17).
    <div data-compteur-page className="shrink-0 text-right">
      <p className="board-titre m-0 text-[20px] tabular-nums leading-none">
        {enPlace} sur {total}
      </p>
      <p className="board-eyebrow m-0 mt-1.5 text-[9.5px] tracking-[0.12em] text-[color:var(--board-slate-soft)]">
        {phraseCompteur(enPlace, total, parLesTitres)}
      </p>
    </div>
  );
}

/**
 * Le lien vers une famille, au sommaire de l'écran et dans le widget du
 * tableau de bord (2026-10-17) : la même porte a la même allure aux deux
 * endroits.
 */
export const CLASSES_LIEN_FAMILLE =
  "text-[13.5px] font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4";

/**
 * Le sommaire : les familles PRÉSENTES sur ce dossier, et elles seules — une
 * ancre vers une famille absente serait un lien mort (interdit 19). Les ancres
 * et les `id` sortent de la même fonction. Le repli « Autres obligations »
 * (`familles.ts`) y entre comme une famille, en dernier, quand il porte une
 * ligne.
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
          // `flex-wrap` (2026-10-17, revue de c6) : à 375 px, un libellé
          // long et son compte se serraient en deux colonnes étroites ; le
          // compte passe désormais sous le libellé quand la place manque.
          <li
            key={f.groupe}
            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
          >
            <a href={`#${ancreFamille(f.groupe)}`} className={CLASSES_LIEN_FAMILLE}>
              {f.libelle}
            </a>
            {/* ~~« x sur n », nu~~ (2026-10-17, revue indépendante) : le
                compte dit qui affirme, comme celui de la famille (ADR-027).
                ~~`phraseSommaire`~~ (2026-10-17, revue de c6) : « x sur n »
                de nouveau, et cette fois parce que l'en-tête de page dit qui
                affirme pour tout l'écran — une phrase, une fois (§ 10). */}
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
          // `tabIndex={-1}` (2026-10-17, revue de c6) : la section est la
          // cible d'une ancre du sommaire. Sans lui, le saut déplace la vue
          // mais pas le focus, et la touche Tab repart du sommaire — un
          // lecteur au clavier ou d'écran ne suit pas le lien qu'il a suivi.
          tabIndex={-1}
          className="flex scroll-mt-8 flex-col gap-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2
              id={`${ancreFamille(f.groupe)}-titre`}
              className="board-titre m-0 text-[22px]"
            >
              {f.libelle}
            </h2>
            {/* ~~Le compte de la famille dit d'où vient chaque « en place »,
                comme celui de l'en-tête et avec la même phrase~~ (2026-10-17,
                revue de c6 : la phrase se lisait autant de fois qu'il y a de
                familles). « x sur n » seul : l'en-tête de page dit qui
                affirme. Jamais « conformes », jamais un pourcentage. */}
            <p className="m-0 text-[12.5px] tabular-nums text-[color:var(--board-slate-mid)]">
              {f.enPlace} sur {f.total}
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
