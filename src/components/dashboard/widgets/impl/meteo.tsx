"use client";

// Widget « 30 prochains jours » (identifiant technique `meteo`, conservé pour
// ne pas casser les tableaux de bord déjà personnalisés).
//
// Il s'appelait « Météo du mois » : la propriétaire l'a jugé trompeur — le mot
// ne dit rien de ce que la grille montre (2026-09-14). Trente cases, une par
// jour ; chaque case prend la couleur de l'échéance la plus urgente qui y
// tombe (retard > à planifier > planifiée > rien).

import { CHAMP_ETAT } from "@/lib/calendrier/etats";
import { BentoCell } from "@/components/dashboard/BentoCell";
import { cleJourCivil } from "@/lib/dates";
import { colonnesJours } from "../temps";
import type { DashboardBundle } from "../types";

export function WidgetMeteo({ bundle }: { bundle: DashboardBundle }) {
  const { evenementsMois = [] } = bundle;

  // Référence du bundle, jamais `new Date()` : rendu identique SSR/CSR.
  //
  // Cases et événements partagent la même clé de jour civil Europe/Paris.
  // Les cases étaient posées à minuit local puis indexées en UTC : à
  // Paris, la heatmap peignait chaque jour sur la case du lendemain.
  const jours = colonnesJours(bundle.aujourdhui, 30);

  // Pour chaque jour : tone dominant.
  type Tone = "alerte" | "warn" | "ok";
  const tonePriorite: Record<Tone, number> = { alerte: 3, warn: 2, ok: 1 };
  const toneParJour = new Map<string, Tone>();
  // Seules les échéances CONNUES colorent une case : une ligne « à planifier »
  // posait sa date de génération — un appareil déclaré aujourd'hui peignait la
  // case du jour (2026-09-14). Les comptes ci-dessous, eux, gardent toute la
  // fenêtre : un retard ne sort pas d'un compte faute de case.
  for (const e of evenementsMois.filter((x) => !x.sansEcheance)) {
    const key = cleJourCivil(e.date);
    const actuel = toneParJour.get(key);
    const etone = e.tone as Tone;
    if (!actuel || tonePriorite[etone] > tonePriorite[actuel]) {
      toneParJour.set(key, etone);
    }
  }

  const compte = {
    alerte: evenementsMois.filter((e) => e.tone === "alerte").length,
    warn: evenementsMois.filter((e) => e.tone === "warn").length,
    ok: evenementsMois.filter((e) => e.tone === "ok").length,
  };

  return (
    <BentoCell
      kicker="30 prochains jours"
      sub={
        evenementsMois.length === 0
          ? "Aucune tâche"
          : `${evenementsMois.length} sur la période`
      }
    >
      <div className="grid grid-cols-10 gap-1.5">
        {jours.map((jour) => {
          const tone = toneParJour.get(jour.cle);
          const bg = tone
            ? tone === "alerte"
              ? CHAMP_ETAT.enRetard
              : tone === "warn"
                ? CHAMP_ETAT.proche
                : CHAMP_ETAT.lointain
            : "var(--board-slate-pale)";
          const isToday = jour.estAujourdhui;
          return (
            <div
              key={jour.cle}
              title={
                tone
                  ? `${jour.libelleLong} — ${tone === "alerte" ? "retard" : tone === "warn" ? "à planifier" : "planifié"}`
                  : `${jour.libelleLong} — libre`
              }
              className={
                "aspect-square rounded " +
                (isToday
                  ? "outline outline-2 outline-offset-1 outline-[color:var(--board-ink)]"
                  : "")
              }
              style={{ background: bg, opacity: tone ? 1 : 0.5 }}
            />
          );
        })}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--board-slate-mid)]">
        <LegendePt color={CHAMP_ETAT.enRetard} label={`${compte.alerte} retard`} />
        <LegendePt
          color={CHAMP_ETAT.proche}
          label={`${compte.warn} à planifier`}
        />
        <LegendePt color={CHAMP_ETAT.lointain} label={`${compte.ok} planifié`} />
      </div>
    </BentoCell>
  );
}

function LegendePt({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block size-2 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
