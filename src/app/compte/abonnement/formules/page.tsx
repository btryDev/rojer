import Link from "next/link";
import { cache, Suspense, type ReactNode } from "react";

import { BoutonEnvoi } from "@/components/abonnements/BoutonEnvoi";
import { CarteAbonnement, OffreFermee, TEXTE_AIDE } from "@/components/abonnements/CarteAbonnement";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { ouvrirPortailAction } from "@/lib/abonnements/actions";
import { BaissePrevue, GesteChangement, GesteSAbonner, NOTE_FORTE, type OptionDeFormule } from "@/components/abonnements/GestesDeFormule";
import { MenuAbonnement } from "@/components/compte/MenuInterne";
import { PageDuCompte } from "@/components/compte/PageDuCompte";
import { GrilleDesOffres } from "@/components/landing/GrilleDesOffres";
import { OFFRES, type Periode } from "@/components/landing/tarif-donnees";
import { TarifOffres } from "@/components/landing/TarifOffres";
import { buttonVariants } from "@/components/ui/button";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import type { Db } from "@/lib/auth/compte";
import { fermeParLaBaisse, ouvertParLaMontee, sensDuChangement } from "@/lib/abonnements/changement";
import { REFUS_CHANGEMENT } from "@/lib/abonnements/refus-changement";
import { PAGE_ESSAI } from "@/lib/abonnements/essai";
import {
  CLES_FORMULES,
  FORMULE_D_ESSAI,
  DUREE_ESSAI_JOURS,
  FORMULES,
  LIBELLE_PERIODICITE,
  LOOKUP_KEYS,
  PERIODICITES,
  formuleDeLookupKey,
  lookupKey,
  type CleFormule,
} from "@/lib/abonnements/formules";
import { lireOffreChoisie } from "@/lib/abonnements/offre-choisie";
import { etatDeLAbonnement } from "@/lib/abonnements/page-abonnement";
import { depassementsDe, stocksDuCompte } from "@/lib/abonnements/quotas";
import { PAGE_PAIEMENT } from "@/lib/abonnements/sous-pages";
import { abonnementEnCours, essaiProche, finPrevueDe } from "@/lib/abonnements/droits";
import { GESTE_DU_PORTAIL, type VueAbonnement } from "@/lib/abonnements/vue-abonnement";
import { formaterDateLongueFr } from "@/lib/dates";
import { demandeDuCompte, PAGE_SUPPRESSION } from "@/lib/compte/suppression";
import { clientStripeLecture } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { baissePrevue, prixDesFormules } from "@/lib/stripe/parcours";

export const metadata = {
  title: "Votre abonnement — Rojer",
};

/**
 * Les formules (2026-11-17, sous-page de l'abonnement) : les cartes de la
 * page publique (`TarifOffres`, décision de la propriétaire : « comme sur la
 * landing »), avec dans chaque carte le geste du cas — s'abonner pendant ou
 * après l'essai, ou changer de formule pour un abonnement qui paie (ADR-053
 * §§ 9 et 10) — puis le détail des offres, replié (`GrilleDesOffres`).
 *
 * Seule sous-page à lire Stripe hors retour de paiement, et seulement pour un
 * geste qui l'exige : les prix pour s'abonner ou changer (gardés dix
 * minutes, `prixDesFormules`), et l'abonnement avec sa baisse planifiée pour
 * changer — sous `Suspense`, la page ne l'attend pas. Sans geste (membre,
 * offre fermée, essai à démarrer, abonnement à régler), les cartes montrent
 * les prix de la page publique et rien n'est lu chez Stripe.
 */

/** Un changement de formule refusé, dit à côté du choix (la fenêtre de confirmation le dit aussi). */
const REFUS = REFUS_CHANGEMENT;

/** La carte d'encre de la page publique : le bouton y est blanc. */
const carteDe = (f: CleFormule) => (OFFRES.find((o) => o.formule === f)?.misEnAvant ? "encre" : "claire");

export default async function FormulesPage({ searchParams }: { searchParams: Promise<{ formule?: string }> }) {
  const { formule: refus0 } = await searchParams;
  // `Object.hasOwn` et non `in` : `?formule=toString` ne doit pas trouver le prototype.
  const refus = refus0 && Object.hasOwn(REFUS, refus0) ? REFUS[refus0 as keyof typeof REFUS] : null;
  const { c, compteId, ligne, vue, formule, phase, ctx } = await etatDeLAbonnement();
  // Une suppression demandée ferme tous les gestes d'abonnement (ADR-058 § 8,
  // `clientDuCompte`) : la page ne les propose pas, et dit pourquoi
  // (essai local du 2026-11-23 : les boutons restaient, refusés au clic).
  const suppression = compteId ? await demandeDuCompte(compteId) : null;
  const finEssai = phase.type === "essai" ? phase.fin : null;
  // La formule d'un abonnement qui court, et lui seul — jamais un essai (sa
  // formule est `FORMULE_D_ESSAI`), ni un abonnement terminé (relecture du
  // 2026-11-17).
  const actuelle = !finEssai && ligne && abonnementEnCours(ligne.statut) ? ligne.formule : null;
  // Changer de formule, ou résilier : un abonnement payé et à jour.
  const paye = !suppression && vue.cas === "portail" && vue.situation === "a-jour" && ligne?.statut === "active" && c ? { ligne, c } : null;
  // Le rythme montré d'abord, le même pour le repli et pour les cartes :
  // l'offre choisie sur la page publique, sinon celui de l'abonnement.
  const offreChoisie = vue.cas === "formulaire" ? await lireOffreChoisie() : null;
  const periodeInitiale = LIBELLE_PERIODICITE[(offreChoisie ?? formule)?.periodicite ?? "mensuel"].unite;
  const enEssai = finEssai ? FORMULE_D_ESSAI : null;
  const sansGeste = <Cartes actuelle={actuelle} enEssai={enEssai} periodeInitiale={periodeInitiale} />;

  // Une suppression demandée : les cartes, sans geste ; la carte de la suppression dit pourquoi.
  let cartes: ReactNode = sansGeste;
  if (!suppression && vue.cas === "formulaire") {
    cartes = (
      <Suspense fallback={sansGeste}>
        <CartesPourSAbonner compteId={compteId} finEssai={finEssai} maintenant={ctx.maintenant} periodeInitiale={periodeInitiale} />
      </Suspense>
    );
  } else if (paye) {
    cartes = (
      <Suspense fallback={sansGeste}>
        <CartesPourChanger
          db={paye.c.db}
          compteId={paye.c.compte.compteId}
          pageCompteId={compteId}
          actuelle={actuelle}
          finPeriode={paye.ligne.finPeriode}
          subscriptionId={paye.ligne.stripeSubscriptionId}
          periodeInitiale={periodeInitiale}
        />
      </Suspense>
    );
  }

  return (
    <PageDuCompte
      titre="Votre abonnement"
      description="Votre offre, mise en avant ; les autres pour en changer. Toutes donnent accès à tout Rojer : elles diffèrent par le nombre de sites, de personnes et de documents."
      menu={<MenuAbonnement />}
      pleineLargeur
    >
      <MessageFormulaire ton="alerte">{refus}</MessageFormulaire>
      {vue.cas === "fermee" ? <OffreFermee /> : null}
      {suppression ? (
        <CarteAbonnement>
          <div className="flex flex-col items-start gap-5">
            <p className={TEXTE_AIDE}>
              La suppression de ce compte est prévue le {formaterDateLongueFr(suppression.effacementLe)}&nbsp;: d&apos;ici là, la formule ne
              se change pas et l&apos;abonnement ne se gère pas.{" "}
              {vue.cas === "membre" ? "Seul un propriétaire du compte peut annuler la suppression." : "Annulez d'abord la suppression pour le faire."}
            </p>
            <Link href={PAGE_SUPPRESSION} className={buttonVariants({ variant: "board", size: "board" })}>
              Voir la suppression
            </Link>
          </div>
        </CarteAbonnement>
      ) : vue.cas !== "fermee" && vue.cas !== "formulaire" && !paye ? (
        <CarteAbonnement>
          <RienAChanger vue={vue} />
        </CarteAbonnement>
      ) : null}
      <div>
        {cartes}
        <GrilleDesOffres />
      </div>
      {paye ? (
        // La baisse planifiée bloque la résiliation chez Stripe : la section
        // la lit (mémoïsée avec les cartes, un seul appel), sans retenir la page.
        <Suspense fallback={null}>
          <ResiliationDuPaye compteId={compteId} finPeriode={paye.ligne.finPeriode} subscriptionId={paye.ligne.stripeSubscriptionId} />
        </Suspense>
      ) : !suppression && vue.cas === "portail" && vue.situation === "fin-prevue" && ligne ? (
        <Resiliation situation="fin-prevue" compteId={compteId} finPeriode={finPrevueDe(ligne)} baissePrevue={false} />
      ) : null}
    </PageDuCompte>
  );
}

/**
 * La baisse de formule planifiée chez Stripe (`schedule`, que la copie locale
 * ne garde pas), lue une fois par rendu : les cartes et la résiliation la
 * demandent toutes deux. Sans Stripe ou sans réponse : aucune.
 */
const baisseDuCompte = cache(async (subscriptionId: string | null) => {
  const config = configurationStripe();
  if (!config.active || !subscriptionId) return null;
  const stripe = clientStripeLecture(config);
  return stripe.subscriptions
    .retrieve(subscriptionId)
    .then((s) => baissePrevue(stripe, s))
    .catch(() => null);
});

async function ResiliationDuPaye({
  compteId,
  finPeriode,
  subscriptionId,
}: {
  compteId: string | null;
  finPeriode: Date | null;
  subscriptionId: string | null;
}) {
  const prevue = await baisseDuCompte(subscriptionId);
  return <Resiliation situation="a-jour" compteId={compteId} finPeriode={finPeriode} baissePrevue={!!prevue} />;
}

/**
 * Résilier (2026-11-17, décision de la propriétaire : « en bas, une section
 * pour annuler l'abonnement ») : le portail de Stripe s'ouvre sur l'écran de
 * résiliation (`ouvrirPortailAction`, `geste=resilier`). Ce qui se passe
 * ensuite est dit avant le clic. Une fin déjà prévue se reprend au même
 * endroit. Un paiement à régler se règle d'abord (Paiement et factures).
 * Un changement de formule planifié bloque la résiliation chez Stripe (un
 * planning est rattaché) : on y renonce d'abord, et la section le dit.
 */
function Resiliation({
  situation,
  compteId,
  finPeriode,
  baissePrevue,
}: {
  situation: "a-jour" | "fin-prevue";
  compteId: string | null;
  finPeriode: Date | null;
  baissePrevue: boolean;
}) {
  // Sans date connue (copie en retard), la phrase se passe de date.
  const le = finPeriode ? ` le ${formaterDateLongueFr(finPeriode)}` : "";
  const fin = finPeriode ? `le ${formaterDateLongueFr(finPeriode)}` : "à la date prévue";
  return (
    <CarteAbonnement titre={situation === "fin-prevue" ? "Fin de l'abonnement prévue" : "Résilier l'abonnement"}>
      <form action={ouvrirPortailAction} className="flex flex-col items-start gap-4">
        <ChampCompteAttendu compteId={compteId} />
        {situation === "a-jour" ? <input type="hidden" name="geste" value="resilier" /> : null}
        <p className={TEXTE_AIDE}>
          {situation === "fin-prevue"
            ? `Votre abonnement prend fin ${fin}, sans nouveau prélèvement. Vous pouvez le reprendre jusqu'à cette date.`
            : `Votre abonnement court jusqu'à la fin de la période payée${finPeriode ? "," : ""}${le}, sans remboursement. Ensuite, la saisie se ferme ; vos dossiers restent consultables et exportables douze mois.`}
        </p>
        {baissePrevue ? (
          <p id="resiliation-bloquee" className="m-0 text-[14px] font-semibold leading-[1.5] text-[color:var(--board-ink)]">
            Un changement d&apos;offre est prévu : pour résilier, choisissez d&apos;abord « Garder ma formule », plus haut.
          </p>
        ) : null}
        <BoutonEnvoi variant="boardClair" disabled={baissePrevue} describedBy={baissePrevue ? "resiliation-bloquee" : undefined}>
          {situation === "fin-prevue" ? GESTE_DU_PORTAIL["fin-prevue"] : "Résilier l'abonnement"}
        </BoutonEnvoi>
      </form>
    </CarteAbonnement>
  );
}

/** Les cartes de la page publique, avec les prix de Stripe et le geste de chaque formule. */
function Cartes({
  actuelle,
  enEssai = null,
  periodeInitiale,
  gestes = {},
  prix = {},
}: {
  actuelle: string | null;
  enEssai?: CleFormule | null;
  periodeInitiale: Periode;
  gestes?: Partial<Record<string, ReactNode>>;
  prix?: Partial<Record<string, number | null>>;
}) {
  return <TarifOffres app={{ gestes, prix, actuelle, enEssai, periodeInitiale }} />;
}

/** Pourquoi les cartes ne proposent pas de geste ici, et où aller. */
function RienAChanger({ vue }: { vue: VueAbonnement }) {
  const lien = buttonVariants({ variant: "board", size: "board" });
  if (vue.cas === "membre") return <p className={TEXTE_AIDE}>Seul le propriétaire du compte choisit ou change la formule.</p>;
  if (vue.cas === "essai")
    return (
      <div className="flex flex-col items-start gap-5">
        <p className={TEXTE_AIDE}>
          Commencez par l&apos;essai gratuit : {DUREE_ESSAI_JOURS} jours de la formule {FORMULES[FORMULE_D_ESSAI].libelle}, sans
          carte bancaire. Vous choisirez votre formule en vous abonnant.
        </p>
        <Link href={PAGE_ESSAI} className={lien}>
          Démarrer mon essai gratuit
        </Link>
      </div>
    );
  // Une fin prévue se reprend dans la section du bas de cette page : un seul
  // geste « Reprendre », pas deux (relecture du 2026-11-17).
  if (vue.cas === "portail" && vue.situation === "fin-prevue")
    return (
      <p className={TEXTE_AIDE}>
        Votre abonnement prend fin à la date prévue : reprenez-le, plus bas sur cette page, pour changer de formule.
      </p>
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

/** Les prix des formules lus chez Stripe, en centimes par `lookupKey` ; sans réponse, aucun. */
async function prixLus(): Promise<Partial<Record<string, number | null>>> {
  const config = configurationStripe();
  if (!config.active) return {};
  const prix = await prixDesFormules(clientStripeLecture(config)).catch(() => new Map());
  return Object.fromEntries(
    LOOKUP_KEYS.map((cle) => [cle, prix.get(cle)?.montantCentimes ?? null]),
  );
}

/** S'abonner (ADR-053 § 9) : un bouton par carte, le montant du jour dit avant le clic. */
async function CartesPourSAbonner({
  compteId,
  periodeInitiale,
  finEssai,
  maintenant,
}: {
  compteId: string | null;
  periodeInitiale: Periode;
  /** La fin de l'essai en cours, s'il court : il se fait sur `FORMULE_D_ESSAI`. */
  finEssai: Date | null;
  /** L'horloge de la page (`contexteDroits`), la même que pour l'essai lui-même. */
  maintenant: Date;
}) {
  const prix = await prixLus();
  const gestes = Object.fromEntries(
    CLES_FORMULES.flatMap((f) =>
      PERIODICITES.map((p) => {
        const cle = lookupKey(f, p);
        return [
          cle,
          <GesteSAbonner
            key={cle}
            cle={cle}
            libelle={FORMULES[f].libelle}
            centimes={prix[cle] ?? null}
            periodicite={p}
            compteId={compteId}
            carte={carteDe(f)}
            essai={finEssai ? { fin: finEssai, sienne: f === FORMULE_D_ESSAI, proche: essaiProche(finEssai, maintenant) } : null}
          />,
        ];
      }),
    ),
  );
  return <Cartes actuelle={null} enEssai={finEssai ? FORMULE_D_ESSAI : null} periodeInitiale={periodeInitiale} gestes={gestes} prix={prix} />;
}

/** Ce que fait un changement de formule, dit avant le clic — le changement de rythme compris. */
function effetDuChangement(sens: "montee" | "baisse", actuelle: string | null, visee: string, finPeriode: Date | null): string {
  if (sens === "baisse") {
    return `À la fin de votre période payée${finPeriode ? `, le ${formaterDateLongueFr(finPeriode)}` : ""}, sans remboursement de la période en cours.`;
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
 * Le nom d'une formule visée, tel que la fenêtre le dit : « Pro » ; pour un
 * simple changement de rythme, « Pro à l'année » ou « Pro au mois ».
 */
function nomVise(actuelle: string | null, visee: string): string {
  const a = formuleDeLookupKey(actuelle);
  const v = formuleDeLookupKey(visee)!;
  const nom = FORMULES[v.formule].libelle;
  if (a?.formule !== v.formule) return nom;
  return `${nom} ${v.periodicite === "annuel" ? "à l'année" : "au mois"}`;
}

/** Une montée qui change de rythme : ce qui est prélevé aujourd'hui, à la place de « la différence avec … ». */
function rythmeDeLaMontee(actuelle: string | null, visee: string): string | null {
  const de = formuleDeLookupKey(actuelle)?.periodicite;
  const vers = formuleDeLookupKey(visee)?.periodicite;
  if (de === "mensuel" && vers === "annuel") return "L'année entière, moins ce qui reste de votre mois en cours";
  if (de === "annuel" && vers === "mensuel") return "Un mois, moins ce qui reste de votre année ; la période repart aujourd'hui";
  return null;
}

/**
 * Changer de formule (ADR-053 § 10) : dans chaque carte, ce que fait le
 * passage vers cette formule et ce rythme ; la carte de la formule du compte
 * porte « Votre formule », sans geste. Les prix, les stocks (pour une baisse)
 * et l'abonnement relu chez Stripe (sa baisse planifiée), ensemble.
 */
async function CartesPourChanger({
  db,
  compteId,
  pageCompteId,
  actuelle,
  finPeriode,
  subscriptionId,
  periodeInitiale,
}: {
  db: Db;
  compteId: string;
  /** Le compte que montre la page (`ChampCompteAttendu`). */
  pageCompteId: string | null;
  actuelle: string | null;
  finPeriode: Date | null;
  subscriptionId: string | null;
  periodeInitiale: Periode;
}) {
  const visees = LOOKUP_KEYS
    .map((cle) => ({ cle, sens: sensDuChangement(actuelle, cle) }))
    .filter((o): o is { cle: string; sens: "montee" | "baisse" } => o.sens === "montee" || o.sens === "baisse");
  const [prix, stocks, prevue] = await Promise.all([
    prixLus(),
    visees.some((o) => o.sens === "baisse") ? stocksDuCompte(db, compteId) : null,
    // La baisse planifiée, mémoïsée : la section de résiliation la lit aussi.
    baisseDuCompte(subscriptionId),
  ]);
  const libelleDe = (cle: string) => {
    const f = formuleDeLookupKey(cle);
    return f ? `${FORMULES[f.formule].libelle}, ${LIBELLE_PERIODICITE[f.periodicite].adjectif}` : cle;
  };
  const gestes: Partial<Record<string, ReactNode>> = Object.fromEntries(
    visees
      // La formule déjà prévue ne se propose pas une seconde fois ; sa carte
      // dit pourquoi (ci-dessous).
      .filter((o) => o.cle !== prevue?.lookupKey)
      .map(({ cle, sens }) => {
        const { formule: f, periodicite } = formuleDeLookupKey(cle)!;
        const de = formuleDeLookupKey(actuelle)?.formule ?? f;
        const depasse = sens === "baisse" && stocks ? depassementsDe(stocks, cle) : [];
        const option: OptionDeFormule = {
          cle,
          sens,
          libelle: FORMULES[f].libelle,
          effet: effetDuChangement(sens, actuelle, cle, finPeriode),
          prixConnu: typeof prix[cle] === "number",
          depassements: depasse,
          // La fenêtre de confirmation (retour de test du 2026-11-23) : ce
          // que le changement coûte et change, avant le geste.
          changement: {
            cle,
            sens,
            libelle: nomVise(actuelle, cle),
            actuelle: FORMULES[de].libelle,
            ensuiteCentimes: prix[cle] ?? null,
            unite: LIBELLE_PERIODICITE[periodicite].unite,
            rythme: sens === "montee" ? rythmeDeLaMontee(actuelle, cle) : null,
            finPeriode: finPeriode?.toISOString() ?? null,
            changements: sens === "montee" ? ouvertParLaMontee(de, f) : fermeParLaBaisse(de, f, depasse),
          },
        };
        return [cle, <GesteChangement key={cle} option={option} compteId={pageCompteId} carte={carteDe(f)} />];
      }),
  );
  if (prevue?.lookupKey) {
    gestes[prevue.lookupKey] = (
      <p className={NOTE_FORTE}>Changement prévu le {formaterDateLongueFr(prevue.le)}.</p>
    );
  }
  return (
    <>
      {prevue ? (
        <BaissePrevue
          baisse={{ libelle: prevue.lookupKey ? libelleDe(prevue.lookupKey) : "une autre formule", le: prevue.le }}
          compteId={pageCompteId}
        />
      ) : null}
      <Cartes actuelle={actuelle} periodeInitiale={periodeInitiale} gestes={gestes} prix={prix} />
    </>
  );
}
