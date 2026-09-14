"use client";

// Widget « Obligations de l'année » — 2 variants :
//  - bars   : grille 12 mois (BarsObligations existant)
//  - radial : donut agrégé par statut (couvert / à venir / retard)

import { CHAMP_ETAT } from "@/lib/calendrier/etats";
import { BentoCell } from "@/components/dashboard/BentoCell";
import {
  BarsObligations,
  LegendeBarsObligations,
} from "@/components/dashboard/BarsObligations";
import type { DashboardBundle } from "../types";

export function WidgetBarsObligations({
  bundle,
  variant,
}: {
  bundle: DashboardBundle;
  variant: string;
}) {
  const { barsData, moisCourant } = bundle;
  const vide = barsData.every(
    (b) => b.couvert + b.aVenir + b.retard === 0,
  );

  if (variant === "radial") {
    const totaux = barsData.reduce(
      (acc, b) => ({
        couvert: acc.couvert + b.couvert,
        aVenir: acc.aVenir + b.aVenir,
        retard: acc.retard + b.retard,
      }),
      { couvert: 0, aVenir: 0, retard: 0 },
    );
    return (
      <BentoCell
        kicker={`Obligations ${bundle.aujourdhui.getFullYear()}`}
        sub="Répartition des échéances"
      >
        {vide ? <EmptyBars /> : <DonutStatuts totaux={totaux} />}
      </BentoCell>
    );
  }

  // Variant "bars" (défaut)
  return (
    <BentoCell
      kicker={`Obligations ${bundle.aujourdhui.getFullYear()}`}
      legend={<LegendeBarsObligations />}
    >
      {vide ? (
        <EmptyBars />
      ) : (
        <BarsObligations data={barsData} moisCourant={moisCourant} />
      )}
    </BentoCell>
  );
}

function EmptyBars() {
  return (
    <div className="flex h-[160px] items-center justify-center rounded-md border border-dashed border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)]/40 p-6 text-center text-[0.86rem] text-[color:var(--board-slate-mid)]">
      Le calendrier se remplit dès que vous déclarez vos équipements.
    </div>
  );
}

/**
 * L'anneau porte les ÉCHÉANCES de l'année — à venir et en retard —, et elles
 * seules. Les contrôles faits s'affichent à côté, comptés, jamais en part.
 *
 * Il additionnait les trois dans un même total en pourcentages. Depuis que
 * « couvert » compte chaque rapport réalisé, c'était additionner deux unités :
 * au 10/09, une alarme hebdomadaire à 36 rapports et deux annuelles en retard
 * donnaient « En retard (5 %) » sur un total de 39, là où la veille on lisait
 * 50 % sur 4 (relecture, 2026-09-14). Plus une ligne est contrôlée souvent,
 * plus le retard des autres se diluait. La part du retard se lit désormais
 * sur les échéances, ce qui ne dépend pas du rythme des contrôles.
 */
export function DonutStatuts({
  totaux,
}: {
  totaux: { couvert: number; aVenir: number; retard: number };
}) {
  const total = totaux.aVenir + totaux.retard;
  const circ = 2 * Math.PI * 48;
  const pct = (n: number) => (total === 0 ? 0 : n / total);
  const offRetard = 0;
  const offAVenir = pct(totaux.retard) * circ;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r="48"
            fill="none"
            stroke="var(--board-slate-pale)"
            strokeWidth="14"
          />
          {totaux.retard > 0 ? (
            <circle
              cx="70"
              cy="70"
              r="48"
              fill="none"
              stroke={CHAMP_ETAT.enRetard}
              strokeWidth="14"
              strokeDasharray={`${pct(totaux.retard) * circ} ${circ}`}
              strokeDashoffset={-offRetard}
            />
          ) : null}
          {totaux.aVenir > 0 ? (
            <circle
              cx="70"
              cy="70"
              r="48"
              fill="none"
              stroke={CHAMP_ETAT.lointain}
              strokeWidth="14"
              strokeDasharray={`${pct(totaux.aVenir) * circ} ${circ}`}
              strokeDashoffset={-offAVenir}
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[1.8rem] font-semibold leading-none tabular-nums">
            {total}
          </span>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--board-slate-mid)]">
            Échéances
          </span>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-2 text-[0.88rem]">
        <Item
          color={CHAMP_ETAT.lointain}
          label="À venir"
          value={totaux.aVenir}
          total={total}
        />
        <Item
          color={CHAMP_ETAT.enRetard}
          label="En retard"
          value={totaux.retard}
          total={total}
        />
        {/* Compté, jamais en part : un contrôle fait n'est pas une échéance. */}
        <Item
          color="var(--board-ink)"
          label="Contrôles faits"
          value={totaux.couvert}
        />
      </ul>
    </div>
  );
}

function Item({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  /** Absent = compté sans part (les contrôles faits ne sont pas des échéances). */
  total?: number;
}) {
  const pct =
    total === undefined ? null : total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className="inline-block size-2 rounded-full"
        style={{ background: color }}
      />
      <span className="flex-1 text-[color:var(--board-ink)]">{label}</span>
      <span className="font-mono text-[0.82rem] tabular-nums">
        {value}
        {pct !== null && (
          <span className="ml-1 text-[color:var(--board-slate-mid)]">({pct}%)</span>
        )}
      </span>
    </li>
  );
}
