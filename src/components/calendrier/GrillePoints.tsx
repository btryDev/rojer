"use client";

import { JOURS_SEMAINE } from "@/lib/calendrier/grille";
import { formaterJourDateLongueFr } from "@/lib/dates/jour-long";

/** Une case de la grille ; `null` pour les cases d'avant le 1er. */
export type CasePoints = {
  /** « 2026-10-29 », la clé de `cleJourCivil`. */
  cle: string;
  numero: number;
  estAujourdhui: boolean;
  /** Une couleur CSS par échéance du jour, dans l'ordre. */
  points: string[];
} | null;

/** Au-delà, les points ne se comptent plus d'un regard. */
const MAX_POINTS = 3;

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Jeudi 29 octobre 2026 », depuis une clé de jour. Midi UTC tombe le même
 *  jour civil dans le fuseau de référence. */
export function libelleDuJour(cle: string): string {
  return majuscule(formaterJourDateLongueFr(new Date(`${cle}T12:00:00Z`)));
}

/**
 * La grille du mois du téléphone (décision 4A de la propriétaire,
 * 2026-10-29) : sept colonnes de 33 px ne laissent rien lire d'une pastille,
 * la case ne porte donc plus que son numéro et un point par échéance, dans la
 * couleur de son état. Toucher un jour le choisit ; l'appelant liste ses
 * échéances dessous.
 */
export function GrillePoints({
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
        const nb = c.points.length;
        const actif = c.cle === choisi;
        return (
          <button
            key={c.cle}
            type="button"
            onClick={() => onChoisir(c.cle)}
            aria-pressed={actif}
            aria-label={`${libelleDuJour(c.cle)}, ${
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
            <span aria-hidden className="flex h-1.5 gap-[3px]">
              {c.points.slice(0, MAX_POINTS).map((couleur, k) => (
                <span
                  key={k}
                  data-point=""
                  // Le filet garde lisible un point pâle (le jaune « sous
                  // 30 jours ») sur le blanc de la carte.
                  className="size-1.5 rounded-full ring-1 ring-[rgba(10,10,10,.12)]"
                  style={{ background: couleur }}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
