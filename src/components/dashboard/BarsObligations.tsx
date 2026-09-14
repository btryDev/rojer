// Barres mensuelles des vérifications — les douze mois de l'année civile
// (mois courant mis en évidence). Reçoit les données agrégées par
// `repartirParMois` (`lib/dashboard/barres-mois.ts`).
//
// DEUX UNITÉS DANS UNE BARRE, et l'infobulle les nomme. « Couvert » compte des
// CONTRÔLES FAITS — un par rapport réalisé, au mois de sa date — ; « à venir »
// et « retard » comptent des ÉCHÉANCES, une par ligne ouverte. Depuis que
// chaque rapport compte, une alarme hebdomadaire ajoute environ quatre
// contrôles faits par mois : les appeler « obligations » faisait lire quatre
// obligations là où il y en a une (relecture, 2026-09-14).

import { CHAMP_ETAT } from "@/lib/calendrier/etats";

export type BarMois = {
  mois: number; // 0-11 (janv = 0)
  annee: number;
  /** Contrôles FAITS dans le mois : un par rapport réalisé. */
  couvert: number;
  /** Échéances ouvertes du mois, à venir. */
  aVenir: number;
  /** Échéances ouvertes du mois, en retard. */
  retard: number;
};

const LABELS_MOIS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function BarsObligations({
  data,
  moisCourant,
}: {
  data: BarMois[];
  moisCourant: number;
}) {
  // Hauteur normalisée sur le max total (100%).
  const totals = data.map((d) => d.couvert + d.aVenir + d.retard);
  const max = Math.max(1, ...totals);

  return (
    <div className="grid h-[160px] grid-cols-12 items-end gap-2.5">
      {data.map((d) => {
        const total = d.couvert + d.aVenir + d.retard;
        const heightPct = (total / max) * 100;
        const isCourant = d.mois === moisCourant;
        // Les couleurs viennent de `CHAMP_ETAT`, source unique du produit, et
        // non d'une table locale : un « en retard » d'une teinte ici et d'une
        // autre au calendrier fait lire deux états là où il n'y en a qu'un.
        //
        // Un mois sans échéance prend l'ardoise et non le filet : c'est une
        // absence, pas une graduation.
        const tone =
          d.retard > 0
            ? CHAMP_ETAT.enRetard
            : d.aVenir > 0
              ? CHAMP_ETAT.proche
              : total > 0
                ? CHAMP_ETAT.faite
                : "var(--board-slate-pale)";
        return (
          <div
            key={`${d.annee}-${d.mois}`}
            className="flex h-full flex-col items-center justify-end gap-1.5"
          >
            <div
              className={
                "w-full rounded-t transition-[height] duration-500 " +
                (isCourant
                  ? "outline outline-2 outline-offset-2 outline-[color:var(--board-ink)]"
                  : "")
              }
              style={{
                height: `${heightPct}%`,
                minHeight: total > 0 ? 4 : 0,
                background: tone,
              }}
              title={`${d.couvert} contrôle${d.couvert > 1 ? "s" : ""} fait${d.couvert > 1 ? "s" : ""} · ${d.aVenir} échéance${d.aVenir > 1 ? "s" : ""} à venir · ${d.retard} en retard`}
            />
            <span className="font-mono text-[11px] text-[color:var(--board-slate-mid)]">
              {LABELS_MOIS[d.mois]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function LegendeBarsObligations() {
  return (
    <span className="flex items-center gap-3 text-[12px] text-[color:var(--board-slate-mid)]">
      <LegendDot color={CHAMP_ETAT.faite} /> Contrôles faits
      <LegendDot color={CHAMP_ETAT.proche} /> À venir
      <LegendDot color={CHAMP_ETAT.enRetard} /> Retard
    </span>
  );
}

function LegendDot({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full"
        style={{ background: color }}
      />
    </span>
  );
}
