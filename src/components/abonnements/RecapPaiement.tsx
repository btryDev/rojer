import type { ReactNode } from "react";

import { finPrevueDe } from "@/lib/abonnements/droits";
import { LIBELLE_PERIODICITE } from "@/lib/abonnements/formules";
import type { EtatDeLAbonnement } from "@/lib/abonnements/page-abonnement";
import type { SituationPortail } from "@/lib/abonnements/vue-abonnement";
import { formaterDateLongueFr } from "@/lib/dates";

const majuscule = (t: string) => t.replace(/^./, (l) => l.toUpperCase());

/** Une liste terme / valeur des pages de l'abonnement ; une ligne `null` ne s'affiche pas. */
export function Recap({ lignes }: { lignes: ([terme: string, valeur: ReactNode] | null)[] }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-[14px]">
      {lignes.map((l) =>
        l ? (
          <div key={l[0]} className="contents">
            <dt className="text-[color:var(--board-slate-mid)]">{l[0]}</dt>
            <dd className="m-0 font-medium">{l[1]}</dd>
          </div>
        ) : null,
      )}
    </dl>
  );
}

/**
 * Ce que la copie locale sait du paiement d'un abonnement qui court
 * (2026-11-17) : le rythme, puis le prochain prélèvement — ou la fin
 * prévue, ou le paiement à régler (`situation`, `vueAbonnement`). Rien n'est
 * lu chez Stripe. Vue d'ensemble et Paiement et factures le montrent tous
 * deux.
 */
export function RecapPaiement({
  ligne,
  formule,
  situation,
}: {
  ligne: NonNullable<EtatDeLAbonnement["ligne"]>;
  formule: EtatDeLAbonnement["formule"];
  situation: SituationPortail;
}) {
  const fin = situation === "fin-prevue" ? finPrevueDe(ligne) : null;
  return (
    <Recap
      lignes={[
        formule ? ["Facturation", majuscule(LIBELLE_PERIODICITE[formule.periodicite].adjectif)] : null,
        situation === "a-regler"
          ? ["Paiement", <span key="p" className="text-[color:var(--board-signal-ink)]">Votre dernier paiement n&apos;est pas passé</span>]
          : fin
            ? ["Fin de l'abonnement", `Le ${formaterDateLongueFr(fin)}, sans nouveau prélèvement`]
            : ligne.finPeriode
              ? ["Prochain prélèvement", `Le ${formaterDateLongueFr(ligne.finPeriode)}`]
              : null,
      ]}
    />
  );
}
