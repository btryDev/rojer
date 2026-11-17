import { LIBELLE_PERIODICITE } from "@/lib/abonnements/formules";
import type { EtatDeLAbonnement } from "@/lib/abonnements/page-abonnement";
import type { SituationPortail } from "@/lib/abonnements/vue-abonnement";
import { formaterDateLongueFr } from "@/lib/dates";

const majuscule = (t: string) => t.replace(/^./, (l) => l.toUpperCase());

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
  const terme = "text-[color:var(--board-slate-mid)]";
  const fin = situation === "fin-prevue" ? (ligne.finPrevueLe ?? ligne.finPeriode) : null;
  return (
    <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-[14px]">
      {formule ? (
        <>
          <dt className={terme}>Facturation</dt>
          <dd className="m-0 font-medium">{majuscule(LIBELLE_PERIODICITE[formule.periodicite].adjectif)}</dd>
        </>
      ) : null}
      {situation === "a-regler" ? (
        <>
          <dt className={terme}>Paiement</dt>
          <dd className="m-0 font-medium text-[color:var(--board-signal-ink)]">Votre dernier paiement n&apos;est pas passé</dd>
        </>
      ) : fin ? (
        <>
          <dt className={terme}>Fin de l&apos;abonnement</dt>
          <dd className="m-0 font-medium">Le {formaterDateLongueFr(fin)}, sans nouveau prélèvement</dd>
        </>
      ) : ligne.finPeriode ? (
        <>
          <dt className={terme}>Prochain prélèvement</dt>
          <dd className="m-0 font-medium">Le {formaterDateLongueFr(ligne.finPeriode)}</dd>
        </>
      ) : null}
    </dl>
  );
}
