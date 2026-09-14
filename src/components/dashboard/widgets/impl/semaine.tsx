"use client";

// Widget « Semaine ».
// Mini-agenda 7 jours : jour courant + 6 suivants, groupés par jour,
// avec les vérifications planifiées dans cette fenêtre.

import Link from "next/link";
import { LienProvenance } from "@/components/navigation/LienProvenance";
import { BentoCell } from "@/components/dashboard/BentoCell";
import { cleJourCivil } from "@/lib/dates";
import { colonnesJours } from "../temps";
import type { DashboardBundle } from "../types";
import { MentionContractuelle } from "@/components/prescriptions/MentionContractuelle";

export function WidgetSemaine({ bundle }: { bundle: DashboardBundle }) {
  const { evenementsSemaine = [], etablissementId } = bundle;

  // Fenêtre 7 jours à partir de la référence du bundle (jamais
  // `new Date()` au rendu : écart d'hydratation SSR/CSR).
  //
  // Colonnes et événements sont indexés par la **même** clé de jour civil
  // Europe/Paris. Les colonnes étaient auparavant posées à minuit local
  // puis indexées en UTC : à Paris, chaque cellule portait la clé de la
  // veille, et toute la semaine s'affichait décalée d'une colonne.
  const jours = colonnesJours(bundle.aujourdhui, 7);

  const eventsParJour = new Map<
    string,
    {
      id: string;
      libelle: string;
      tone: "alerte" | "warn" | "ok";
      contractuelle: boolean;
      equipement: string;
    }[]
  >();
  // Une ligne SANS ÉCHÉANCE CONNUE ne se pose sur aucun jour : sa date est
  // celle de la génération (`sansEcheance`). Un appareil déclaré aujourd'hui
  // peignait la colonne du jour d'une « échéance » que rien n'avait fixée
  // (2026-09-14). Elle reste comptée en retard ailleurs.
  const datees = evenementsSemaine.filter((e) => !e.sansEcheance);
  for (const e of datees) {
    const key = cleJourCivil(e.date);
    const arr = eventsParJour.get(key) ?? [];
    arr.push({
      id: e.id,
      libelle: e.libelle,
      tone: e.tone,
      contractuelle: e.contractuelle,
      equipement: e.equipement,
    });
    eventsParJour.set(key, arr);
  }

  // Le total reste celui de la fenêtre : il comptait déjà des retards qu'aucune
  // colonne ne montre (dates passées), et un retard ne se retire pas d'un
  // compte parce qu'il n'a pas de case.
  const total = evenementsSemaine.length;

  return (
    <BentoCell
      kicker="Semaine"
      sub={
        total === 0
          ? "Rien de prévu"
          : `${total} ${total > 1 ? "échéances" : "échéance"}`
      }
    >
      <ol className="grid grid-cols-7 gap-1.5">
        {jours.map((jour) => {
          const events = eventsParJour.get(jour.cle) ?? [];
          const isToday = jour.estAujourdhui;
          return (
            <li
              key={jour.cle}
              className={
                "flex min-h-[96px] flex-col rounded-lg p-2 " +
                (isToday
                  ? "bg-[color:var(--board-blue-soft)]"
                  : "bg-[color:var(--board-slate-pale)]")
              }
            >
              <div
                className={
                  "font-mono text-[10px] uppercase tracking-[0.14em] " +
                  (isToday
                    ? "text-[color:var(--board-blue-ink)]"
                    : "text-[color:var(--board-slate-mid)]")
                }
              >
                {jour.libelleJour}
              </div>
              <div
                className={
                  "mt-0.5 text-[0.92rem] font-semibold tabular-nums " +
                  (isToday ? "text-[color:var(--board-blue-ink)]" : "text-[color:var(--board-ink)]")
                }
              >
                {jour.numero}
              </div>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {events.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <LienProvenance
                      href={`/etablissements/${etablissementId}/verifications/${e.id}`}
                      title={`${e.libelle} — ${e.equipement}`}
                      className={
                        "block truncate rounded-sm px-1 text-[10px] font-medium leading-tight transition-opacity hover:opacity-80 " +
                        (e.tone === "alerte"
                          ? "bg-[color:color-mix(in_oklch,var(--board-signal-ink)_15%,transparent)] text-[color:var(--board-signal-ink)]"
                          : e.tone === "warn"
                            ? "bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]"
                            : "bg-[color:var(--board-card)] text-[color:var(--board-ink)]")
                      }
                    >
                      {e.libelle}
                      {e.contractuelle ? (
                        <MentionContractuelle className="ml-1.5 align-middle" />
                      ) : null}
                    </LienProvenance>
                  </li>
                ))}
                {events.length > 3 ? (
                  <li>
                    <Link
                      href={`/etablissements/${etablissementId}/calendrier`}
                      className="block text-[10px] text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)] hover:underline"
                    >
                      +{events.length - 3}
                    </Link>
                  </li>
                ) : null}
              </ul>
            </li>
          );
        })}
      </ol>
    </BentoCell>
  );
}
