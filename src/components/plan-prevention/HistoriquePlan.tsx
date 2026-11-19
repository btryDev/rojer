"use client";

import { useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import type { EvenementHistorique, TonHistorique } from "@/lib/plan-prevention/fiche-signatures";

/**
 * L'historique du plan, dans une fenêtre (2026-11-19, maquette V2
 * « Historique ») : une ligne par fait, façon calendrier — tuile noire du
 * jour et de l'heure, la phrase, sa précision, une pastille. Les signatures
 * révoquées y sont, chacune vérifiable : la fiche n'en tient plus de liste à
 * part. Lu par la page (`historiqueDuPlan`), rien n'est écrit ici.
 */

const PASTILLE: Record<TonHistorique, string> = {
  fait: "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]",
  proche: "bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]",
  bleu: "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]",
  neutre: "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-ink)]",
  retard: "bg-[color:var(--board-signal-wash)] text-[color:var(--board-signal-ink)]",
};

const FMT_JOUR = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit" });
const FMT_MOIS = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", month: "short" });
const FMT_HEURE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const FMT_COMPLET = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  dateStyle: "long",
  timeStyle: "short",
});

export function TuileJourHeure({ date }: { date: Date }) {
  return (
    <span
      aria-hidden
      className="flex size-12 flex-none flex-col items-center justify-center rounded-[12px] bg-[color:var(--board-ink)] text-white"
    >
      <span className="font-display text-[17px] font-bold leading-none tabular-nums">{FMT_JOUR.format(date)}</span>
      <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em]">{FMT_HEURE.format(date)}</span>
    </span>
  );
}

export function HistoriquePlan({
  reference,
  evenements,
}: {
  /** « PP-002 » */
  reference: string;
  evenements: EvenementHistorique[];
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[18px] text-[14px] text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-slate-pale)]"
      >
        <History className="size-[15px]" aria-hidden />
        Historique
      </button>
      <PanneauModal ouvert={ouvert} surFermer={() => setOuvert(false)} surtitre={`Plan de prévention · ${reference}`} titre="Historique">
        {evenements.length === 0 ? (
          <p className="m-0">Rien encore.</p>
        ) : (
          <ol className="m-0 list-none p-0">
            {evenements.map((e) => (
              <li
                key={e.cle}
                className="flex items-center gap-4 border-t border-[color:var(--board-slate-pale)] py-3 first:border-t-0"
              >
                <TuileJourHeure date={e.date} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[15px] font-medium leading-[1.35] text-[color:var(--board-ink)]">
                    {e.ligne}
                    <span className="sr-only">, le {FMT_COMPLET.format(e.date)}</span>
                  </p>
                  {(e.sousLigne || e.verifier) && (
                    <p className="m-0 mt-0.5 text-[13px] text-[color:var(--board-slate-soft)]">
                      {e.sousLigne}
                      {e.verifier?.map((v) => (
                        <span key={v.href}>
                          {" · "}
                          <Link href={v.href} className="text-[color:var(--board-blue-ink)] hover:underline">
                            {v.libelle}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                  <p className="m-0 mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--board-slate-soft)]">
                    {FMT_MOIS.format(e.date)}
                  </p>
                </div>
                <span className={`pastille-board flex-none text-[12.5px] ${PASTILLE[e.pastille.ton]}`}>{e.pastille.mot}</span>
              </li>
            ))}
          </ol>
        )}
      </PanneauModal>
    </>
  );
}
