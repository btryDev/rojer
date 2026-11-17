import Link from "next/link";
import { Suspense } from "react";

import { CarteAbonnement, OffreFermee, TEXTE_AIDE } from "@/components/abonnements/CarteAbonnement";
import { ChangerDeFormule, type OptionDeFormule } from "@/components/abonnements/ChangerDeFormule";
import { FormulaireAbonnement, type OffreAffichee } from "@/components/abonnements/FormulaireAbonnement";
import { NOM_DU_PLAFOND } from "@/components/abonnements/JaugeDePlafond";
import { MenuAbonnement } from "@/components/abonnements/MenuAbonnement";
import { PageDuCompte } from "@/components/compte/PageDuCompte";
import { buttonVariants } from "@/components/ui/button";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import type { Db } from "@/lib/auth/compte";
import { prixTTC } from "@/lib/abonnements/affichage";
import { sensDuChangement } from "@/lib/abonnements/changement";
import { PAGE_ESSAI } from "@/lib/abonnements/essai";
import {
  CLES_FORMULES,
  DUREE_ESSAI_JOURS,
  FORMULES,
  LIBELLE_PERIODICITE,
  PERIODICITES,
  formuleDeLookupKey,
  lookupKey,
  pointsDeFormule,
  type Quotas,
} from "@/lib/abonnements/formules";
import { lireOffreChoisie } from "@/lib/abonnements/offre-choisie";
import { etatDeLAbonnement } from "@/lib/abonnements/page-abonnement";
import { depassementsDe, estAnnuelle, stocksDuCompte, type CleQuota } from "@/lib/abonnements/quotas";
import { PAGE_PAIEMENT } from "@/lib/abonnements/sous-pages";
import { GESTE_DU_PORTAIL, preselection, type VueAbonnement } from "@/lib/abonnements/vue-abonnement";
import { formaterDateLongueFr } from "@/lib/dates";
import { clientStripeLecture } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { baissePrevue, prixDesFormules } from "@/lib/stripe/parcours";

export const metadata = {
  title: "Formules — Rojer",
};

/**
 * Les formules (2026-11-17, sous-page de l'abonnement) : s'abonner pendant ou
 * après l'essai, ou changer de formule pour un abonnement qui paie (ADR-053
 * §§ 9 et 10). Le tableau des plafonds se lit pour tous, sans Stripe.
 *
 * Seule sous-page à lire Stripe hors retour de paiement, et seulement pour un
 * geste qui l'exige : les prix pour s'abonner (gardés dix minutes,
 * `prixDesFormules`), et l'abonnement avec sa baisse planifiée pour en
 * changer — rendu sous `Suspense`, la page ne l'attend pas. Un membre, un
 * compte sans offre lancée, un essai à démarrer ou un abonnement à régler ne
 * lisent rien chez Stripe.
 */

/** Un changement de formule refusé (`changerFormuleAction`), dit à côté du choix. */
const REFUS = {
  impossible: "Le changement de formule n'est possible que pour un abonnement à jour de ses paiements.",
  "resiliation-prevue": "Votre abonnement prend fin à la date prévue : reprenez-le d'abord depuis Paiement et factures pour changer de formule.",
  "trop-d-utilisateurs": "Cette formule permet moins d'utilisateurs que votre compte n'en a : retirez-en d'abord depuis Membres du compte.",
} as const;

export default async function FormulesPage({ searchParams }: { searchParams: Promise<{ formule?: string }> }) {
  const { formule: refus0 } = await searchParams;
  // `Object.hasOwn` et non `in` : `?formule=toString` ne doit pas trouver le prototype.
  const refus = refus0 && Object.hasOwn(REFUS, refus0) ? REFUS[refus0 as keyof typeof REFUS] : null;
  const etat = await etatDeLAbonnement();
  const { c, compteId, ligne, vue } = etat;
  // Les offres (prix chez Stripe) et la formule choisie sur la page publique
  // (`offre-choisie.ts`), ensemble ; seulement pour s'abonner.
  const [offres, offreChoisie] = vue.cas === "formulaire" ? await Promise.all([offresAffichees(), lireOffreChoisie()]) : [[], null];

  return (
    <PageDuCompte
      titre="Formules"
      description="Toutes les formules donnent accès à tout Rojer ; elles diffèrent par le nombre de sites, de personnes et de documents."
      menu={<MenuAbonnement />}
    >
      <MessageFormulaire ton="alerte">{refus}</MessageFormulaire>
      {vue.cas === "fermee" ? (
        <OffreFermee />
      ) : vue.cas === "formulaire" ? (
        <CarteAbonnement titre={vue.titre}>
          <FormulaireAbonnement
            offres={offres}
            compteId={compteId}
            quand={vue.quand}
            courante={preselection(vue, { abonnement: etat.formule, offreChoisie })}
          />
        </CarteAbonnement>
      ) : vue.cas === "portail" && vue.situation === "a-jour" && ligne?.statut === "active" && c ? (
        <CarteAbonnement titre="Changer de formule">
          <Suspense fallback={<p className={TEXTE_AIDE}>Chargement des formules…</p>}>
            <ChangementDeFormule
              db={c.db}
              compteId={c.compte.compteId}
              pageCompteId={compteId}
              actuelle={ligne.formule}
              finPeriode={ligne.finPeriode}
              subscriptionId={ligne.stripeSubscriptionId}
            />
          </Suspense>
        </CarteAbonnement>
      ) : (
        <CarteAbonnement>
          <RienAChanger vue={vue} />
        </CarteAbonnement>
      )}

      <CarteAbonnement titre="Ce que permet chaque formule">
        <TableauDesFormules />
      </CarteAbonnement>
    </PageDuCompte>
  );
}

/** Pourquoi il n'y a pas de formule à choisir ici, et où aller. */
function RienAChanger({ vue }: { vue: VueAbonnement }) {
  const lien = buttonVariants({ variant: "board", size: "board" });
  if (vue.cas === "membre") return <p className={TEXTE_AIDE}>Seul le propriétaire du compte choisit ou change la formule.</p>;
  if (vue.cas === "essai")
    return (
      <div className="flex flex-col items-start gap-5">
        <p className={TEXTE_AIDE}>
          Commencez par l&apos;essai gratuit : {DUREE_ESSAI_JOURS} jours de la formule {FORMULES[CLES_FORMULES[0]].libelle}, sans
          carte bancaire. Vous choisirez votre formule en vous abonnant.
        </p>
        <Link href={PAGE_ESSAI} className={lien}>
          Démarrer mon essai gratuit
        </Link>
      </div>
    );
  if (vue.cas === "portail" && vue.situation !== "a-jour")
    return (
      <div className="flex flex-col items-start gap-5">
        <p className={TEXTE_AIDE}>{vue.situation === "a-regler" ? REFUS.impossible : REFUS["resiliation-prevue"]}</p>
        <Link href={PAGE_PAIEMENT} className={lien}>
          {GESTE_DU_PORTAIL[vue.situation]}
        </Link>
      </div>
    );
  // Juste après un paiement, la copie de l'abonnement peut retarder : rien à proposer.
  return <p className={TEXTE_AIDE}>Rien à choisir pour le moment.</p>;
}

/** Les formules et leurs prix lus chez Stripe ; sans réponse, les prix manquent et le bouton reste fermé. */
async function offresAffichees(): Promise<OffreAffichee[]> {
  const config = configurationStripe();
  const prix = config.active ? await prixDesFormules(clientStripeLecture(config)).catch(() => new Map()) : new Map();
  return CLES_FORMULES.map((f) => ({
    formule: f,
    libelle: FORMULES[f].libelle,
    pourQui: FORMULES[f].pourQui,
    points: pointsDeFormule(f),
    prix: Object.fromEntries(
      PERIODICITES.map((p) => [p, { cle: lookupKey(f, p), centimes: prix.get(lookupKey(f, p))?.montantCentimes ?? null }]),
    ) as OffreAffichee["prix"],
  }));
}

/** Ce que fait un changement de formule, dit avant le clic — le changement de rythme compris. */
function effetDuChangement(sens: "montee" | "baisse", actuelle: string | null, visee: string, finPeriode: Date | null): string {
  if (sens === "baisse") {
    const fin = finPeriode ? `le ${formaterDateLongueFr(finPeriode)}` : "à la fin de la période payée";
    return `À la fin de votre période payée, ${fin}, sans remboursement de la période en cours.`;
  }
  const de = formuleDeLookupKey(actuelle)?.periodicite;
  const vers = formuleDeLookupKey(visee)?.periodicite;
  if (de === "mensuel" && vers === "annuel") {
    return "Tout de suite : l'année est prélevée maintenant, moins ce qui reste de votre mois en cours.";
  }
  if (de === "annuel" && vers === "mensuel") {
    return "Tout de suite : votre période repart aujourd'hui ; ce qui reste de votre année est déduit du nouveau prix, et la différence éventuelle est prélevée maintenant.";
  }
  return "Tout de suite : la différence pour la période en cours est prélevée maintenant.";
}

/**
 * Les formules vers lesquelles un abonnement qui paie peut aller, avec, pour
 * chacune, son sens (montée tout de suite, baisse en fin de période) et ce qui
 * dépasserait ; et la baisse déjà planifiée. Sans réponse de Stripe : rien.
 */
async function ChangementDeFormule({
  db,
  compteId,
  pageCompteId,
  actuelle,
  finPeriode,
  subscriptionId,
}: {
  db: Db;
  compteId: string;
  /** Le compte que montre la page (`ChampCompteAttendu`). */
  pageCompteId: string | null;
  actuelle: string | null;
  finPeriode: Date | null;
  subscriptionId: string | null;
}) {
  const libelleDe = (cle: string) => {
    const f = formuleDeLookupKey(cle);
    return f ? `${FORMULES[f.formule].libelle}, ${LIBELLE_PERIODICITE[f.periodicite].adjectif}` : cle;
  };
  const actuelleLibelle = actuelle ? libelleDe(actuelle) : null;
  const config = configurationStripe();
  if (!config.active) return null;
  const stripe = clientStripeLecture(config);
  const visees = CLES_FORMULES.flatMap((f) => PERIODICITES.map((p) => lookupKey(f, p)))
    .map((cle) => ({ cle, sens: sensDuChangement(actuelle, cle) }))
    .filter((o): o is { cle: string; sens: "montee" | "baisse" } => o.sens === "montee" || o.sens === "baisse");
  // Les prix (cache de dix minutes), la ligne et les stocks, ensemble : les
  // stocks seulement si une baisse est proposée.
  const [prix, stocks, prevue] = await Promise.all([
    prixDesFormules(stripe).catch(() => new Map()),
    visees.some((o) => o.sens === "baisse") ? stocksDuCompte(db, compteId) : null,
    // L'abonnement relu chez Stripe pour sa baisse planifiée (`schedule`,
    // que la copie locale ne garde pas) ; l'identifiant vient de la copie.
    subscriptionId
      ? stripe.subscriptions
          .retrieve(subscriptionId)
          .then((s) => baissePrevue(stripe, s))
          .catch(() => null)
      : null,
  ]);
  const options: OptionDeFormule[] = visees.map(({ cle, sens }) => {
    const f = formuleDeLookupKey(cle)!;
    const montant = prix.get(cle)?.montantCentimes;
    return {
      cle,
      sens,
      effet: effetDuChangement(sens, actuelle, cle, finPeriode),
      libelle: libelleDe(cle),
      prix: montant ? prixTTC(montant, f.periodicite) : null,
      depassements: sens === "baisse" && stocks ? depassementsDe(stocks, cle) : [],
    };
  });
  const baisse = prevue ? { libelle: prevue.lookupKey ? libelleDe(prevue.lookupKey) : "une autre formule", le: prevue.le } : null;
  // La formule déjà prévue ne se propose pas une seconde fois.
  const proposees = prevue?.lookupKey ? options.filter((o) => o.cle !== prevue.lookupKey) : options;
  return (
    <>
      {actuelleLibelle ? (
        <p className={TEXTE_AIDE}>
          Votre formule : <strong className="font-semibold text-[color:var(--board-ink)]">{actuelleLibelle}</strong>.
        </p>
      ) : null}
      {proposees.length > 0 || baisse ? <ChangerDeFormule options={proposees} baisse={baisse} compteId={pageCompteId} /> : null}
    </>
  );
}

/**
 * Les lignes du tableau : chaque plafond appliqué (`CleQuota`), tiré des
 * quotas de `formules.ts` — une formule qui borne demain les zones le dira
 * ici sans retouche —, puis l'assistant. Les heures d'expert ne sont pas
 * livrées : elles n'y figurent pas (`pointsDeFormule`).
 */
const LIGNES_DU_TABLEAU: { libelle: string; valeur: (q: Quotas) => string }[] = [
  ...(Object.keys(NOM_DU_PLAFOND) as CleQuota[]).map((cle) => ({
    libelle: estAnnuelle(cle) ? `${NOM_DU_PLAFOND[cle]} par an` : NOM_DU_PLAFOND[cle],
    valeur: (q: Quotas) => {
      const n = q[cle];
      return n === null ? "Sans limite" : cle === "stockageGo" ? `${n} Go` : String(n);
    },
  })),
  { libelle: "Connecter un assistant", valeur: (q) => (q.connecterUnAssistant ? "Oui" : "Non") },
];

function TableauDesFormules() {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[14px]">
        <thead>
          <tr className="border-b border-[color:var(--board-slate-line)] text-left text-[13px] text-[color:var(--board-slate-mid)]">
            <th scope="col" className="py-2.5 pr-3 font-semibold">
              Plafond
            </th>
            {CLES_FORMULES.map((f) => (
              <th key={f} scope="col" className="px-3 py-2.5 text-right font-semibold">
                {FORMULES[f].libelle}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LIGNES_DU_TABLEAU.map((l) => (
            <tr key={l.libelle} className="border-b border-[color:var(--board-slate-line)] last:border-b-0">
              <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                {l.libelle}
              </th>
              {CLES_FORMULES.map((f) => (
                <td key={f} className="px-3 py-2.5 text-right tabular-nums">
                  {l.valeur(FORMULES[f].quotas)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
