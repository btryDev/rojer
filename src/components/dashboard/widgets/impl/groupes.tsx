"use client";

// Widgets thématiques qui regroupent plusieurs compteurs liés dans une
// même cellule bento — plus lisible qu'une file de petits KPIs isolés.
// Les widgets unitaires (kpi-en-retard, kpi-sous-30j, etc.) restent
// disponibles dans le registre pour les power users qui préfèrent
// composer eux-mêmes.

import { BentoCell } from "@/components/dashboard/BentoCell";
import type { DashboardBundle } from "../types";

type Tone = "alert" | "amber" | "navy" | "green" | "neutral";

function toneHex(t: Tone): string {
  switch (t) {
    case "alert":
      return "var(--board-signal-ink)";
    case "amber":
      return "var(--board-amber-ink)";
    case "navy":
      return "var(--board-blue-ink)";
    case "green":
      return "var(--board-green-ink)";
    default:
      return "var(--muted-foreground)";
  }
}

/* ─── Widget « Indicateurs » — 6 KPI en ligne (mockup V2) ─────── */

type KpiDef = {
  k: string;
  v: number | string;
  trend: string;
  tone: Tone;
  hint: string;
};

function Kpi({ def, first }: { def: KpiDef; first: boolean }) {
  return (
    <div
      className="flex flex-col gap-2 px-4 py-1.5"
      style={{ borderLeft: first ? "0" : "1px dashed var(--board-slate)" }}
    >
      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--board-slate-mid)]">
        {def.k}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[2.25rem] font-semibold leading-none tabular-nums tracking-[-0.02em]"
          style={{ color: toneHex(def.tone) }}
        >
          {def.v}
        </span>
        <span
          aria-hidden
          className="inline-block size-1.5 rounded-full"
          style={{ background: toneHex(def.tone) }}
        />
      </div>
      <div className="text-[11.5px] leading-[1.35] text-[color:var(--board-slate-mid)]">
        {def.hint}
        {/* Certains états font converger trend et hint sur la même
            phrase — on ne l'affiche pas deux fois. */}
        {def.trend !== def.hint ? (
          <>
            <br />
            <span className="text-[color:var(--board-slate-ink)]">{def.trend}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function WidgetIndicateurs({ bundle }: { bundle: DashboardBundle }) {
  const {
    verifsEnRetard,
    verifsAPlanifier,
    verifsSous30j,
    actionsOuvertes,
    actionsEnCours,
    actionsEnRetard,
    rapports12m,
  } = bundle.dashboard.compteurs;
  const { nbVerifs } = bundle;
  const totalActions = actionsOuvertes + actionsEnCours;
  const jourDernier = bundle.jourDernierRapport;

  const kpis: KpiDef[] = [
    {
      k: "En retard",
      v: verifsEnRetard,
      trend: verifsEnRetard === 0 ? "à jour" : "vérifications dépassées",
      tone: verifsEnRetard > 0 ? "alert" : "neutral",
      hint: "vérifications dépassées",
    },
    {
      k: "À planifier",
      v: verifsAPlanifier,
      trend: verifsAPlanifier === 0 ? "rien à planifier" : "sans date prévue",
      tone: verifsAPlanifier > 0 ? "amber" : "neutral",
      hint: "sans date prévue",
    },
    {
      k: "Sous 30 j",
      v: verifsSous30j,
      trend: "sur les 30 prochains jours",
      tone: verifsSous30j > 0 ? "navy" : "neutral",
      hint: "vérifications planifiées",
    },
    {
      k: "Actions en cours",
      v: totalActions,
      trend:
        actionsEnRetard > 0
          ? `dont ${actionsEnRetard} en retard`
          : totalActions > 0
            ? "à lever"
            : "aucune",
      tone: totalActions > 0 ? (actionsEnRetard > 0 ? "amber" : "navy") : "neutral",
      hint: "plan d'actions",
    },
    {
      k: "Rapports 12 m",
      // Des rapports déposés, pas des lignes couvertes (ADR-034) : c'est ce
      // que le libellé promet, et ce que le registre montre.
      v: rapports12m,
      trend:
        nbVerifs > 0
          ? `sur ${nbVerifs} attendu${nbVerifs > 1 ? "s" : ""}`
          : "aucun attendu",
      tone: rapports12m > 0 ? "green" : "neutral",
      hint: "déposés au registre",
    },
    {
      k: "Dern. rapport",
      v: jourDernier === null ? "—" : jourDernier,
      trend: jourDernier === null ? "pas encore" : "jours",
      tone: "neutral",
      hint: jourDernier === null ? "aucun dépôt" : "activité récente",
    },
  ];

  return (
    <section className="carte-board px-7 py-6 sm:px-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="v2-title">Indicateurs</h3>
          <p className="v2-subtitle">
            Vue d&apos;ensemble — vérifications, actions et activité
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-0 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k, i) => (
          <Kpi key={k.k} def={k} first={i === 0} />
        ))}
      </div>
    </section>
  );
}

/* ─── Anciens widgets — gardés opt-in pour power users ──── */

type MiniTone = "alerte" | "warn" | "ok" | "default";

function miniToneClass(t: MiniTone): string {
  switch (t) {
    case "alerte":
      return "text-[color:var(--board-signal-ink)]";
    case "warn":
      return "text-[color:var(--board-amber-ink)]";
    case "ok":
      return "text-[color:var(--board-green-ink)]";
    default:
      return "text-[color:var(--board-ink)]";
  }
}

function MiniStat({
  label,
  valeur,
  tone = "default",
  sub,
}: {
  label: string;
  valeur: number | string;
  tone?: MiniTone;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--board-slate-mid)]">
        {label}
      </p>
      <p
        className={
          "text-[1.9rem] font-semibold leading-none tabular-nums tracking-[-0.03em] " +
          miniToneClass(tone)
        }
      >
        {valeur}
      </p>
      {sub ? (
        <p className="text-[12px] text-[color:var(--board-slate-mid)]">{sub}</p>
      ) : null}
    </div>
  );
}

export function WidgetEcheances({ bundle }: { bundle: DashboardBundle }) {
  const { verifsEnRetard, verifsAPlanifier, verifsSous30j } =
    bundle.dashboard.compteurs;

  return (
    <BentoCell
      kicker="Échéances"
      sub={
        verifsEnRetard + verifsAPlanifier + verifsSous30j === 0
          ? "Rien à traiter"
          : undefined
      }
    >
      <div className="grid grid-cols-3 gap-4 pt-1">
        <MiniStat
          label="En retard"
          valeur={verifsEnRetard}
          tone={verifsEnRetard > 0 ? "alerte" : "default"}
        />
        <MiniStat
          label="À planifier"
          valeur={verifsAPlanifier}
          tone={verifsAPlanifier > 0 ? "warn" : "default"}
        />
        <MiniStat
          label="Sous 30 j"
          valeur={verifsSous30j}
          tone={verifsSous30j > 0 ? "warn" : "default"}
        />
      </div>
    </BentoCell>
  );
}

export function WidgetActivite({ bundle }: { bundle: DashboardBundle }) {
  const {
    actionsOuvertes,
    actionsEnCours,
    actionsEnRetard,
    rapports12m,
  } = bundle.dashboard.compteurs;
  const totalActions = actionsOuvertes + actionsEnCours;
  const jourDernier = bundle.jourDernierRapport;

  return (
    <BentoCell kicker="Activité">
      <div className="grid grid-cols-3 gap-4 pt-1">
        <MiniStat
          label="Actions en cours"
          valeur={totalActions}
          tone={actionsEnRetard > 0 ? "warn" : "default"}
          sub={
            actionsEnRetard > 0
              ? `${actionsEnRetard} en retard`
              : totalActions > 0
                ? "à lever"
                : "aucune"
          }
        />
        <MiniStat label="Rapports 12 m" valeur={rapports12m} tone="ok" />
        <MiniStat
          label="Dernier rapport"
          valeur={jourDernier === null ? "—" : `J-${jourDernier}`}
          tone={
            jourDernier !== null && jourDernier < 30 ? "ok" : "default"
          }
        />
      </div>
    </BentoCell>
  );
}
