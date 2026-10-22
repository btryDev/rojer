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

import Image from "next/image";
import type { ReactNode } from "react";
import type {
  FamilleEtatsPermanents,
  LigneEtatPermanent,
} from "@/lib/etats-permanents/queries";
import { ancreFamille } from "@/lib/etats-permanents/ancre";
import { BandeauRepliable } from "./BandeauRepliable";
import { phraseCompteur } from "@/lib/etats-permanents/phrases";
import {
  FOND_TEINTE,
  illustrationDuBloc,
  teinteDe,
} from "@/lib/etats-permanents/illustrations";
import {
  DESSIN_GESTE,
  LIBELLE_GESTE,
  SOUS_TITRE_GESTE,
  lignesParGeste,
} from "@/lib/etats-permanents/gestes";

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

/** Le lien vers une famille, dans le widget du tableau de bord (2026-10-17). */
export const CLASSES_LIEN_FAMILLE =
  "text-[13.5px] font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4";

/*
 * ~~`SommaireParUsage`~~ (retiré le 2026-10-21, revue de code) : le sommaire
 * des familles n'était plus rendu depuis le hero du 2026-10-20 — les familles
 * repliées tiennent sur un écran. Le widget du tableau de bord vise toujours
 * les ancres des sections (`ancreFamille`).
 */

/** Les classes d'une section de famille : cible d'ancre, anneau de focus de la charte. */
const CLASSES_SECTION =
  "flex scroll-mt-8 flex-col gap-4 rounded-[30px] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[color:var(--board-blue-strong)]";

const EYEBROW =
  "board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]";

/** Une ligne est-elle en place ? La règle du compteur (`queries.ts`). */
function estEnPlace(l: LigneEtatPermanent): boolean {
  return l.parLesTitres ? l.parLesTitres.enPlace : l.declareLe !== null;
}

/**
 * Une famille hors frise (2026-10-20) : un bandeau repliable pleine largeur —
 * le dessin, le titre et le compte toujours visibles, les lignes dépliées au
 * clic sur deux colonnes (`BandeauRepliable`). ~~Une colonne par famille~~,
 * puis ~~un panneau à gauche et les lignes à droite~~ : des colonnes de
 * hauteurs inégales laissaient des trous (contrôles visuels de la propriétaire).
 *
 * Le titre (h2) est dans le bandeau, hors de toute carte ; chaque bloc est une
 * carte qui porte au plus son sur-titre (charte, interdits 11 et 12).
 */
function Bandeau({
  id,
  titre,
  sousTitre,
  compte,
  fond,
  dessin,
  blocs,
  rendreLigne,
  focusable,
}: {
  id: string;
  titre: string;
  sousTitre?: string;
  compte: string;
  fond: string;
  dessin: string | null;
  blocs: { cle: string; libelle: string | null; lignes: LigneEtatPermanent[] }[];
  rendreLigne: (l: LigneEtatPermanent) => ReactNode;
  focusable: boolean;
}) {
  return (
    <BandeauRepliable
      id={id}
      titre={titre}
      compte={[sousTitre, compte].filter(Boolean).join(" · ")}
      fond={fond}
      dessin={dessin}
      focusable={focusable}
      classeSection={CLASSES_SECTION}
    >
      {blocs.map((b) => (
        <div key={b.cle} className="carte-board px-5 pb-5 pt-4">
          {b.libelle && <h3 className={EYEBROW + " mb-3"}>{b.libelle}</h3>}
          <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2">
            {b.lignes.map((l) => rendreLigne(l))}
          </ul>
        </div>
      ))}
    </BandeauRepliable>
  );
}

/**
 * Les familles de l'écran, par famille (2026-10-20, refonte illustrée).
 *
 * INCENDIE ET SECOURS se lit comme une frise — une seule carte, une étape par
 * sous-catégorie dans l'ordre où elles servent (prévenir, alerter, éteindre,
 * évacuer, secourir), chaque étape coiffée de son rond illustré ; un trait
 * relie les ronds, plein quand toutes les lignes de l'étape sont en place,
 * pointillé sinon. Les étapes sont des h3 de même rang dans la carte : une
 * frise, pas deux niveaux de titrage. Les autres familles sont des bandeaux.
 *
 * Ce qui ne change pas : une section par famille, dans l'ordre que la lecture
 * rend, son `id` d'ancre et `tabIndex={-1}`, son titre hors des cartes.
 */
export function SectionsParUsage({
  familles,
  rendreLigne,
}: {
  familles: FamilleEtatsPermanents[];
  /** La ligne telle que la page la rend (sa vignette). */
  rendreLigne: (l: LigneEtatPermanent) => ReactNode;
}) {
  return (
    <>
      {familles.map((f) => {
        const compte = `${f.enPlace} sur ${f.total}`;
        if (f.groupe === "incendie_secours") {
          return (
            <section
              key={f.groupe}
              id={ancreFamille(f.groupe)}
              aria-labelledby={`${ancreFamille(f.groupe)}-titre`}
              tabIndex={-1}
              className={CLASSES_SECTION}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 id={`${ancreFamille(f.groupe)}-titre`} className="board-titre m-0 text-[22px]">
                  {f.libelle}
                </h2>
                <p className="m-0 text-[12.5px] tabular-nums text-[color:var(--board-slate-mid)]">{compte}</p>
              </div>
              <div className="carte-board px-6 pb-6 pt-7 sm:px-7">
                <ol
                  className="m-0 grid list-none gap-6 p-0 md:gap-0 md:[grid-template-columns:repeat(var(--etapes),minmax(0,1fr))]"
                  style={{ ["--etapes" as string]: String(f.blocs.length) }}
                >
                  {f.blocs.map((b, k) => {
                    const plein = b.lignes.length > 0 && b.lignes.every(estEnPlace);
                    return (
                      <li key={b.sous ?? f.groupe} className="relative flex flex-col items-center gap-2.5 md:px-1.5">
                        {k < f.blocs.length - 1 && (
                          <span
                            aria-hidden
                            className="absolute top-[46px] hidden h-0.5 md:block"
                            style={{
                              left: "calc(50% + 46px)",
                              right: "calc(-50% + 46px)",
                              background: plein
                                ? "var(--board-slate-mid)"
                                : "repeating-linear-gradient(90deg, var(--board-slate) 0 6px, transparent 6px 11px)",
                            }}
                          />
                        )}
                        <span
                          className="relative z-[1] grid size-[92px] place-items-center overflow-hidden rounded-full"
                          style={{ background: FOND_TEINTE[teinteDe(f.groupe, b.sous)] }}
                        >
                          <Image src={illustrationDuBloc(f.groupe, b.sous)} alt="" width={84} height={84} />
                        </span>
                        {b.libelle && <h3 className={EYEBROW}>{b.libelle}</h3>}
                        <ul className="m-0 flex w-full list-none flex-col gap-1.5 p-0">
                          {b.lignes.map((l) => rendreLigne(l))}
                        </ul>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>
          );
        }
        return (
          <Bandeau
            key={f.groupe}
            id={ancreFamille(f.groupe)}
            titre={f.libelle}
            compte={compte}
            fond={FOND_TEINTE[teinteDe(f.groupe, null)]}
            dessin={illustrationDuBloc(f.groupe, null)}
            blocs={f.blocs.map((b) => ({ cle: b.sous ?? f.groupe, libelle: b.libelle, lignes: b.lignes }))}
            rendreLigne={rendreLigne}
            focusable
          />
        );
      })}
    </>
  );
}

/**
 * La seconde découpe (2026-10-20, à trancher) : les mêmes lignes, rangées par
 * geste (`gestes.ts`), en bandeaux. Les lignes « fait le » n'y entrent pas :
 * elles gardent leur section. Le compte suit la règle de l'en-tête.
 */
export function SectionsParGeste({
  familles,
  rendreLigne,
}: {
  familles: FamilleEtatsPermanents[];
  rendreLigne: (l: LigneEtatPermanent) => ReactNode;
}) {
  return (
    <>
      {lignesParGeste(familles).map(({ geste, lignes }) => {
        const comptees = lignes.filter((l) => l.compteDansLEnTete);
        return (
          <Bandeau
            key={geste}
            id={`geste-${geste}`}
            titre={LIBELLE_GESTE[geste]}
            sousTitre={SOUS_TITRE_GESTE[geste]}
            compte={`${comptees.filter(estEnPlace).length} sur ${comptees.length}`}
            fond="var(--board-slate-pale)"
            dessin={DESSIN_GESTE[geste]}
            blocs={[{ cle: geste, libelle: null, lignes }]}
            rendreLigne={rendreLigne}
            focusable={false}
          />
        );
      })}
    </>
  );
}
