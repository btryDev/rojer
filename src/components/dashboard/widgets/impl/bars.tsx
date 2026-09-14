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
  const { barsData, barsSansEcheance, barsRetardsAnterieurs, moisCourant } =
    bundle;
  // Ce qu'aucune barre de l'année ne porte existe pourtant : les lignes sans
  // échéance connue, et les retards d'années passées. L'état vide « déclarez
  // vos équipements » ne s'affiche que quand il n'y a VRAIMENT rien. Il
  // s'affichait sur un dossier neuf dont les douze appareils étaient en
  // retard (relecture, 2026-09-14).
  const nbSansEcheance = barsSansEcheance.aVenir + barsSansEcheance.retard;
  const nbHorsMois = nbSansEcheance + barsRetardsAnterieurs;
  const aucuneBarre = barsData.every(
    (b) => b.couvert + b.aVenir + b.retard === 0,
  );
  const vide = aucuneBarre && nbHorsMois === 0;
  const annee = bundle.aujourdhui.getFullYear();

  if (variant === "radial") {
    // Les comptes gardent TOUTES les échéances de vérification dues cette
    // année, datées ou non, et les retards d'années passées, dus MAINTENANT :
    // « En retard » dit le retard des VÉRIFICATIONS, celui du calendrier
    // (`repartirParMois`). Le bandeau, lui, ajoute les actions, attestations
    // et autres échéances en retard : il peut dire davantage.
    const totaux = barsData.reduce(
      (acc, b) => ({
        couvert: acc.couvert + b.couvert,
        aVenir: acc.aVenir + b.aVenir,
        retard: acc.retard + b.retard,
      }),
      {
        couvert: 0,
        aVenir: barsSansEcheance.aVenir,
        retard: barsSansEcheance.retard + barsRetardsAnterieurs,
      },
    );
    return (
      <BentoCell kicker={`Obligations ${annee}`} sub="Répartition des échéances">
        {vide ? (
          <EmptyBars />
        ) : (
          <DonutStatuts
            totaux={totaux}
            sansEcheance={barsSansEcheance}
            anterieurs={barsRetardsAnterieurs}
          />
        )}
      </BentoCell>
    );
  }

  // Variant "bars" (défaut)
  const horsMois = libelleHorsMois(nbSansEcheance, barsRetardsAnterieurs, annee);
  return (
    <BentoCell
      kicker={`Obligations ${annee}`}
      sub={horsMois ?? undefined}
      legend={<LegendeBarsObligations />}
    >
      {vide ? (
        <EmptyBars />
      ) : aucuneBarre ? (
        <AucuneBarre nb={nbSansEcheance} />
      ) : (
        <BarsObligations data={barsData} moisCourant={moisCourant} />
      )}
    </BentoCell>
  );
}

/** Le compte de ce qu'aucune barre ne porte, dit sous le titre du widget. */
export function libelleHorsMois(
  sansEcheance: number,
  anterieurs: number,
  annee: number,
): string | null {
  const parts = [
    sansEcheance > 0 ? `${sansEcheance} sans échéance connue` : null,
    anterieurs > 0
      ? `${anterieurs} retard${anterieurs > 1 ? "s" : ""} d'avant ${annee}`
      : null,
  ].filter((p) => p !== null);
  return parts.length === 0 ? null : `${parts.join(" · ")}, hors des mois`;
}

function EmptyBars() {
  return (
    <div className="flex h-[160px] items-center justify-center rounded-md border border-dashed border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)]/40 p-6 text-center text-[0.86rem] text-[color:var(--board-slate-mid)]">
      Le calendrier se remplit à partir de la fiche de l&apos;établissement, de ses équipements et de ses salariés.
    </div>
  );
}

/** Des lignes existent, aucune n'est datée dans l'année : ni vide, ni barres. */
function AucuneBarre({ nb }: { nb: number }) {
  return (
    <div className="flex h-[160px] items-center justify-center rounded-md border border-dashed border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)]/40 p-6 text-center text-[0.86rem] text-[color:var(--board-slate-mid)]">
      {nb > 0
        ? `Aucune échéance datée cette année : ${nb} ${nb > 1 ? "lignes" : "ligne"} sans échéance connue.`
        : "Aucune échéance datée cette année."}
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
  sansEcheance = { aVenir: 0, retard: 0 },
  anterieurs = 0,
}: {
  /** `aVenir` et `retard` INCLUENT les lignes sans échéance connue et les
   *  retards d'années passées. */
  totaux: { couvert: number; aVenir: number; retard: number };
  /** Combien, dans chaque rangée, n'ont pas d'échéance connue — dit, pas
   *  soustrait. */
  sansEcheance?: { aVenir: number; retard: number };
  /** Combien des retards datent d'une année passée — dit, pas soustrait. */
  anterieurs?: number;
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
        {/* Chaque « dont » sous SA rangée : un seul « dont N sans échéance
            connue » sous « En retard » attribuait au retard les lignes du
            jour, encore à venir (relecture des libellés, 2026-09-14). */}
        <Item
          color={CHAMP_ETAT.lointain}
          label="À venir"
          value={totaux.aVenir}
          total={total}
        />
        {sansEcheance.aVenir > 0 ? (
          <li className="pl-5 text-[0.8rem] text-[color:var(--board-slate-mid)]">
            {`dont ${sansEcheance.aVenir} sans échéance connue`}
          </li>
        ) : null}
        <Item
          color={CHAMP_ETAT.enRetard}
          label="En retard"
          value={totaux.retard}
          total={total}
        />
        {sansEcheance.retard > 0 ? (
          <li className="pl-5 text-[0.8rem] text-[color:var(--board-slate-mid)]">
            {`dont ${sansEcheance.retard} sans échéance connue`}
          </li>
        ) : null}
        {anterieurs > 0 ? (
          <li className="pl-5 text-[0.8rem] text-[color:var(--board-slate-mid)]">
            {`dont ${anterieurs} ${anterieurs > 1 ? "retards" : "retard"} d'une année passée`}
          </li>
        ) : null}
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
