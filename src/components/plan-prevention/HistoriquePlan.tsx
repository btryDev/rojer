import { VerifierSignature } from "@/components/signatures/VerifierSignature";
import { CarteRepliable } from "@/components/ui-kit/CarteRepliable";
import { SECTION_SUIVI } from "./classes-fiche";
import type { EvenementHistorique, TonHistorique } from "@/lib/plan-prevention/fiche-signatures";
import { formaterHeureFr } from "@/lib/dates";

/**
 * L'historique du plan (2026-11-19, maquette V2 « Historique ») : une ligne
 * par fait, façon calendrier — tuile noire du jour et de l'heure, la phrase,
 * sa précision, une pastille. Les signatures révoquées y sont, chacune
 * vérifiable : la fiche n'en tient plus de liste à part. Lu par la page
 * (`historiqueDuPlan`), rien n'est écrit ici.
 *
 * ~~Dans une fenêtre, ouverte par un bouton « Historique »~~ [2026-11-21,
 * maquette V3 validée : une section de l'onglet « Suivi », « Ce qui s'est
 * passé » ; plus de bouton ni de fenêtre].
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
const FMT_COMPLET = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  dateStyle: "long",
  timeStyle: "short",
});

function TuileJourHeure({ date }: { date: Date }) {
  return (
    <span
      aria-hidden
      className="flex size-12 flex-none flex-col items-center justify-center rounded-[12px] bg-[color:var(--board-ink)] text-white"
    >
      <span className="font-display text-[17px] font-bold leading-none tabular-nums">{FMT_JOUR.format(date)}</span>
      <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em]">{formaterHeureFr(date)}</span>
    </span>
  );
}

export function HistoriquePlan({
  evenements,
  etablissementId,
}: {
  evenements: EvenementHistorique[];
  etablissementId: string;
}) {
  const n = evenements.length;
  // Repliée, fermée par défaut (2026-11-21, décision de la propriétaire) :
  // `CarteRepliable`, le `<details>` natif du board.
  return (
    <CarteRepliable
      id="historique"
      titre="Ce qui s'est passé"
      compte={`${n} événement${n > 1 ? "s" : ""}`}
      ouverte={false}
      // Une section de la carte unique de la fiche (2026-11-21).
      classeEnveloppe={SECTION_SUIVI}
    >
      {n === 0 ? (
        <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">Rien encore.</p>
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
                {e.sousLigne && (
                  <p className="m-0 mt-0.5 text-[13px] text-[color:var(--board-slate-soft)]">{e.sousLigne}</p>
                )}
                {e.verifier && (
                  <div className="mt-1 flex flex-col gap-1">
                    {e.verifier.map((v) => (
                      <VerifierSignature
                        key={v.signatureId}
                        etablissementId={etablissementId}
                        signatureId={v.signatureId}
                        libelle={v.libelle}
                      />
                    ))}
                  </div>
                )}
                <p className="m-0 mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--board-slate-soft)]">
                  {FMT_MOIS.format(e.date)}
                </p>
              </div>
              <span className={`pastille-board flex-none text-[12.5px] ${PASTILLE[e.pastille.ton]}`}>
                {e.pastille.mot}
              </span>
            </li>
          ))}
        </ol>
      )}
    </CarteRepliable>
  );
}
