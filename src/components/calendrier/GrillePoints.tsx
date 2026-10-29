"use client";

import { useState } from "react";
import { JOURS_SEMAINE } from "@/lib/calendrier/grille";
import { POINT_ETAT, type RegistreLigne } from "@/lib/calendrier/etats";
import { depuisCleJourCivil } from "@/lib/dates";
import { formaterJourDateLongueFr } from "@/lib/dates/jour-long";

/** Une case de la grille ; `null` pour les cases hors du mois. */
export type CasePoints = {
  /** « 2026-10-29 », la clé de `cleJourCivil`. */
  cle: string;
  numero: number;
  estAujourdhui: boolean;
  /** L'état de chaque échéance du jour, dans n'importe quel ordre. */
  etats: RegistreLigne[];
} | null;

/** Au-delà, les points ne se comptent plus d'un regard : un « + » le dit. */
const MAX_POINTS = 3;

/** Le plus grave d'abord : les trois points montrés doivent porter le retard
 *  s'il y en a un, pas les trois premiers venus. Une table complète : un
 *  état neuf ne compile pas sans son rang. */
const RANG: Record<RegistreLigne, number> = {
  enRetard: 0,
  aConfirmer: 1,
  proche: 2,
  aPlanifier: 3,
  lointain: 4,
  sansRendezVous: 5,
  pourInformation: 6,
  faite: 7,
  archivee: 8,
};

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « jeudi 29 octobre 2026 », depuis une clé de jour. */
function jourEnLettres(cle: string): string {
  return formaterJourDateLongueFr(depuisCleJourCivil(cle));
}

function GrillePoints({
  cases,
  choisi,
  onChoisir,
}: {
  cases: CasePoints[];
  choisi: string | null;
  onChoisir: (cle: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-y-1">
      {JOURS_SEMAINE.map((j) => (
        <div
          key={j}
          className="pb-1 text-center font-mono text-[10px] font-semibold uppercase text-[color:var(--board-slate-soft)]"
        >
          {j.slice(0, 1)}
        </div>
      ))}
      {cases.map((c, i) => {
        if (!c) return <span key={`vide-${i}`} aria-hidden />;
        const nb = c.etats.length;
        const actif = c.cle === choisi;
        const montres = [...c.etats].sort((a, b) => RANG[a] - RANG[b]).slice(0, MAX_POINTS);
        return (
          <button
            key={c.cle}
            type="button"
            onClick={() => onChoisir(c.cle)}
            aria-pressed={actif}
            aria-label={`${majuscule(jourEnLettres(c.cle))}, ${
              nb === 0 ? "aucune échéance" : `${nb} échéance${nb > 1 ? "s" : ""}`
            }`}
            className={
              "mx-auto flex h-11 w-full max-w-11 flex-col items-center justify-start gap-1 rounded-[14px] pt-1.5 " +
              (actif
                ? "bg-[color:var(--board-ink)] text-white"
                : c.estAujourdhui
                  ? "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                  : "text-[color:var(--board-ink)]")
            }
          >
            <span className="text-[13px] font-semibold tabular-nums leading-none">
              {c.numero}
            </span>
            <span aria-hidden className="flex h-1.5 items-center gap-[3px]">
              {montres.map((etat, k) => (
                <span
                  key={k}
                  data-point=""
                  // Le filet garde lisible un point pâle (le jaune « sous
                  // 30 jours ») sur le blanc de la carte.
                  className="size-1.5 rounded-full ring-1 ring-[rgba(10,10,10,.12)]"
                  style={{ background: POINT_ETAT[etat] }}
                />
              ))}
              {nb > MAX_POINTS ? (
                <span data-plus="" className="text-[9px] font-bold leading-none">
                  +
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Le mois du téléphone (décision 4A de la propriétaire, 2026-10-29) : sept
 * colonnes de 33 px ne laissent rien lire d'une pastille, la case ne porte
 * donc plus que son numéro et un point par échéance, dans la couleur de son
 * état. Toucher un jour le choisit, et ses échéances se lisent dessous.
 *
 * Le jour ouvert : celui touché s'il est de ce mois, sinon aujourd'hui, sinon
 * le premier qui porte une échéance. Un choix fait dans un autre mois ne vaut
 * plus — changer de mois revient au défaut.
 *
 * Partagé par la page Calendrier (`MoisTelephone`) et le widget du tableau de
 * bord (`VueMois`) : chacun fournit ses cases et la liste d'un jour.
 */
export function GrilleAvecJour({
  cases,
  rendreJour,
}: {
  cases: CasePoints[];
  /** Les échéances d'un jour, ou `null` s'il n'en porte aucune. */
  rendreJour: (cle: string) => React.ReactNode;
}) {
  const [choisi, setChoisi] = useState<string | null>(null);
  const jours = cases.filter((c) => c !== null);
  const jour =
    jours.find((c) => c.cle === choisi) ??
    jours.find((c) => c.estAujourdhui) ??
    jours.find((c) => c.etats.length > 0) ??
    null;
  const liste = jour ? rendreJour(jour.cle) : null;

  return (
    <>
      <GrillePoints cases={cases} choisi={jour?.cle ?? null} onChoisir={setChoisi} />
      {jour ? (
        <div className="mt-5">
          <p className="m-0 text-[13px] font-semibold text-[color:var(--board-slate-ink)]">
            {jour.estAujourdhui
              ? `Aujourd'hui, ${jourEnLettres(jour.cle)}`
              : majuscule(jourEnLettres(jour.cle))}
          </p>
          {liste ?? (
            <p className="m-0 mt-2 text-[13.5px] text-[color:var(--board-slate-mid)]">
              Aucune échéance ce jour-là.
            </p>
          )}
        </div>
      ) : (
        <p className="m-0 mt-5 text-[13.5px] text-[color:var(--board-slate-mid)]">
          Aucune échéance datée ce mois-ci.
        </p>
      )}
    </>
  );
}
