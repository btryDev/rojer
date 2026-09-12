"use client";

// Quatre widgets KPI « small » (2 colonnes chacun). Chacun expose une
// facette chiffrée utile sur un coup d'œil — pas de variants.

import { KpiCard } from "@/components/dashboard/KpiCard";
import type { DashboardBundle } from "../types";

export function WidgetKpiEnRetard({ bundle }: { bundle: DashboardBundle }) {
  const { verifsEnRetard, verifsAPlanifier } = bundle.dashboard.compteurs;
  return (
    <KpiCard
      label="En retard"
      value={verifsEnRetard}
      tone={verifsEnRetard > 0 ? "alerte" : "default"}
      trend={
        verifsAPlanifier > 0
          ? { dir: "flat", label: `+ ${verifsAPlanifier} à planifier` }
          : undefined
      }
    />
  );
}

export function WidgetKpiSous30j({ bundle }: { bundle: DashboardBundle }) {
  const { verifsSous30j } = bundle.dashboard.compteurs;
  return (
    <KpiCard
      label="Échéances sous 30 j"
      value={verifsSous30j}
      tone={verifsSous30j > 0 ? "warn" : "default"}
    />
  );
}

export function WidgetKpiActions({ bundle }: { bundle: DashboardBundle }) {
  const { actionsOuvertes, actionsEnCours, actionsEnRetard } =
    bundle.dashboard.compteurs;
  const total = actionsOuvertes + actionsEnCours;
  return (
    <KpiCard
      label="Actions en cours"
      value={total}
      tone={actionsEnRetard > 0 ? "warn" : "default"}
      trend={
        actionsEnRetard > 0
          ? { dir: "down", label: `${actionsEnRetard} en retard` }
          : undefined
      }
    />
  );
}

export function WidgetKpiRapports({ bundle }: { bundle: DashboardBundle }) {
  // `rapports12m` et non `verifsRealisees12m` : la carte annonce des RAPPORTS,
  // et depuis l'ADR-034 le second compte des LIGNES dont l'échéance ouverte
  // n'est ni dépassée ni proche — un dossier tenu à jour dont tout arrive sous
  // trente jours affichait « 0 » pendant que le registre portait ses pièces.
  const { rapports12m } = bundle.dashboard.compteurs;
  return <KpiCard label="Rapports 12 mois" value={rapports12m} tone="ok" />;
}
