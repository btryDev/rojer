"use client";

// Widget « 30 prochains jours » (identifiant technique `meteo`, conservé pour
// ne pas casser les tableaux de bord déjà personnalisés).
//
// Il s'appelait « Météo du mois » : la propriétaire l'a jugé trompeur — le mot
// ne dit rien de ce que la grille montre (2026-09-14). Trente cases, une par
// jour ; chaque case prend la couleur de l'échéance CONNUE la plus urgente qui
// y tombe (retard > planifiée > rien).

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

  // Seules les échéances CONNUES colorent une case : une ligne « à planifier »
  // posait sa date de génération — un appareil déclaré aujourd'hui peignait la
  // case du jour (2026-09-14). Il n'y a donc plus de case ambre : le ton `warn`
  // est celui d'une « à planifier » à venir, toujours sans échéance connue.
  const alerteParJour = new Map<string, boolean>();
  for (const e of evenementsMois.filter((x) => !x.sansEcheance)) {
    const key = cleJourCivil(e.date);
    alerteParJour.set(key, (alerteParJour.get(key) ?? false) || e.tone === "alerte");
  }

  // Les comptes gardent toute la fenêtre : un retard ne sort pas d'un compte
  // faute de case. « Sans date » compte les lignes sans échéance connue qui
  // ne sont pas en retard — celles en retard sont déjà dans « retard ».
  const compte = {
    alerte: evenementsMois.filter((e) => e.tone === "alerte").length,
    ok: evenementsMois.filter((e) => e.tone === "ok").length,
    sansDate: evenementsMois.filter((e) => e.sansEcheance && e.tone !== "alerte")
      .length,
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
          const alerte = alerteParJour.get(jour.cle);
          const occupe = alerte !== undefined;
          const bg = occupe
            ? alerte
              ? CHAMP_ETAT.enRetard
              : CHAMP_ETAT.lointain
            : "var(--board-slate-pale)";
          const isToday = jour.estAujourdhui;
          return (
            <div
              key={jour.cle}
              title={
                occupe
                  ? `${jour.libelleLong} — ${alerte ? "retard" : "planifié"}`
                  : `${jour.libelleLong} — libre`
              }
              className={
                "aspect-square rounded " +
                (isToday
                  ? "outline outline-2 outline-offset-1 outline-[color:var(--board-ink)]"
                  : "")
              }
              style={{ background: bg, opacity: occupe ? 1 : 0.5 }}
            />
          );
        })}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--board-slate-mid)]">
        <LegendePt color={CHAMP_ETAT.enRetard} label={`${compte.alerte} retard`} />
        <LegendePt color={CHAMP_ETAT.lointain} label={`${compte.ok} planifié`} />
        {/* Sans pastille : aucune case ne porte cette couleur. */}
        {compte.sansDate > 0 ? <span>{`${compte.sansDate} sans date`}</span> : null}
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
