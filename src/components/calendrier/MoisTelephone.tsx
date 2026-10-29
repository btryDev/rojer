"use client";

import { useId, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RegistreLigne } from "@/lib/calendrier/etats";
import { GrilleAvecJour, type CasePoints } from "./GrillePoints";

/** Une ligne de la liste mensuelle, rendue par la page côté serveur. */
export type LigneSection = {
  cle: string;
  /** « 2026-10-29 » ; `null` pour une ligne sans échéance connue. */
  jour: string | null;
  /** Son état, pour la couleur du point dans la grille du téléphone. */
  etat: RegistreLigne;
  noeud: React.ReactNode;
};

/** Les lignes empilées, un filet entre deux. La liste de l'ordinateur et
 *  celle du jour choisi sur téléphone. */
export function ListeLignes({ lignes }: { lignes: LigneSection[] }) {
  return (
    <ul className="m-0 mt-3 flex list-none flex-col p-0">
      {lignes.map((l, i) => (
        <li
          key={l.cle}
          className={i === 0 ? "" : "border-t border-[color:rgba(10,10,10,.07)]"}
        >
          {l.noeud}
        </li>
      ))}
    </ul>
  );
}

/** Un mois que le téléphone peut afficher. */
export type MoisTelephoneData = {
  /** Clé `AAAA-MM`. */
  cle: string;
  /** « Octobre 2026 ». */
  titre: string;
  lignes: LigneSection[];
  nbEnRetard: number;
};

/** Les cases d'un mois : des vides jusqu'au 1er (semaine du lundi), puis un
 *  jour par case. Calcul civil pur, sans horloge ni fuseau. */
function casesDuMois(
  cleMois: string,
  cleAujourdhui: string,
  parJour: Map<string, LigneSection[]>,
): CasePoints[] {
  const [a, m] = cleMois.split("-").map(Number);
  const decalage = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7;
  const nbJours = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const cases: CasePoints[] = Array.from({ length: decalage }, () => null);
  for (let n = 1; n <= nbJours; n += 1) {
    const cle = `${cleMois}-${String(n).padStart(2, "0")}`;
    cases.push({
      cle,
      numero: n,
      estAujourdhui: cle === cleAujourdhui,
      etats: (parJour.get(cle) ?? []).map((l) => l.etat),
    });
  }
  return cases;
}

/**
 * La lecture « par mois » du calendrier sur téléphone (décision 4A de la
 * propriétaire, 2026-10-29) : le mois en grille à points, et la liste du
 * jour touché dessous — les mêmes lignes que la liste de l'ordinateur.
 *
 * Ce qu'une grille d'un mois ne montre pas est dit autour d'elle : les
 * retards des mois d'avant (un bandeau qui y mène — plier n'est pas cacher),
 * et les lignes du mois sans échéance connue (sous la liste du jour).
 */
export function MoisTelephone({
  mois,
  moisInitial,
  cleAujourdhui,
}: {
  /** Les mois navigables, dans l'ordre : retards des années révolues, puis
   *  les douze de l'année affichée. */
  mois: MoisTelephoneData[];
  moisInitial: string | null;
  /** « 2026-10-29 ». */
  cleAujourdhui: string;
}) {
  const [cleMois, setCleMois] = useState<string | null>(null);
  // Pas `mois-AAAA-MM` : c'est l'ancre des cartes de l'ordinateur
  // (`ancreDuMois`), et la règle annuelle la cherche par identifiant.
  const titreId = useId();

  // Le mois montré : celui choisi s'il est encore servi (changer d'année le
  // retire), sinon le mois d'arrivée, sinon le mois courant, sinon le premier.
  const indexDe = (cle: string | null) => mois.findIndex((m) => m.cle === cle);
  const index =
    [cleMois, moisInitial, cleAujourdhui.slice(0, 7)]
      .map(indexDe)
      .find((i) => i >= 0) ?? (mois.length > 0 ? 0 : -1);
  const courant = index >= 0 ? mois[index] : null;
  if (!courant) return null;

  const parJour = new Map<string, LigneSection[]>();
  const sansDate: LigneSection[] = [];
  for (const l of courant.lignes) {
    if (l.jour === null) sansDate.push(l);
    else parJour.set(l.jour, [...(parJour.get(l.jour) ?? []), l]);
  }

  // Les retards des mois d'avant celui qu'on regarde : la grille ne les
  // montre pas, le bandeau les compte et mène au premier.
  const avant = mois.slice(0, index).filter((m) => m.nbEnRetard > 0);
  const nbRetardsAvant = avant.reduce((n, m) => n + m.nbEnRetard, 0);

  return (
    <div className="flex flex-col gap-4">
      {nbRetardsAvant > 0 ? (
        <button
          type="button"
          onClick={() => setCleMois(avant[0].cle)}
          className="flex min-h-11 items-center justify-between gap-3 rounded-[16px] bg-[color:var(--board-signal-wash)] px-4 py-2.5 text-left text-[13.5px] font-semibold text-[color:var(--board-signal-ink)] ring-1 ring-inset ring-[color:var(--board-signal)]"
        >
          {nbRetardsAvant} en retard les mois précédents
          <ChevronRight aria-hidden className="size-4 flex-none" />
        </button>
      ) : null}

      <section className="carte-board px-4 pb-5 pt-4" aria-labelledby={titreId}>
        <div className="mb-4 flex items-center gap-2">
          <BoutonMois
            label="Mois précédent"
            onClick={index > 0 ? () => setCleMois(mois[index - 1].cle) : undefined}
          >
            <ChevronLeft className="size-4" />
          </BoutonMois>
          <h3
            id={titreId}
            className="board-titre m-0 flex-1 text-center text-[18px] first-letter:uppercase"
          >
            {courant.titre}
          </h3>
          <BoutonMois
            label="Mois suivant"
            onClick={
              index < mois.length - 1 ? () => setCleMois(mois[index + 1].cle) : undefined
            }
          >
            <ChevronRight className="size-4" />
          </BoutonMois>
        </div>

        <GrilleAvecJour
          cases={casesDuMois(courant.cle, cleAujourdhui, parJour)}
          rendreJour={(cle) => {
            const lignes = parJour.get(cle);
            return lignes ? <ListeLignes lignes={lignes} /> : null;
          }}
        />

        {sansDate.length > 0 ? (
          <div className="mt-5 border-t border-[color:var(--board-slate-line)] pt-4">
            <p className="m-0 text-[13px] font-semibold text-[color:var(--board-slate-ink)]">
              Sans date ce mois-ci ({sansDate.length})
            </p>
            <ListeLignes lignes={sansDate} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function BoutonMois({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className="grid size-10 flex-none place-items-center rounded-full text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-slate-pale)] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
