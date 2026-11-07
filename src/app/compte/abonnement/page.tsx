import { FilRetour } from "@/components/ui-kit/FilRetour";
import { BandeauAbonnement } from "@/components/abonnements/BandeauAbonnement";
import { getOptionalCompte, type Db } from "@/lib/auth/compte";
import { requireUser } from "@/lib/auth/require-user";
import { abonnementDuCompte, contexteDroits, offreLancee } from "@/lib/abonnements/saisie";
import { droitsDe, gesteAbonnement, libelleStatut, OUVRENT } from "@/lib/abonnements/droits";
import { formaterDateLongueFr } from "@/lib/dates";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ouvrirPortailAction } from "@/lib/abonnements/actions";
import { FormulaireAbonnement, type OffreAffichee } from "@/components/abonnements/FormulaireAbonnement";
import { FinalisationCarte } from "@/components/abonnements/FinalisationCarte";
import { ChangerDeFormule, type OptionDeFormule } from "@/components/abonnements/ChangerDeFormule";
import { sensDuChangement } from "@/lib/abonnements/changement";
import { depassements } from "@/lib/abonnements/quotas";
import { eurosHT } from "@/lib/abonnements/affichage";
import { baissePrevue } from "@/lib/stripe/parcours";
import { carteParDefaut } from "@/lib/abonnements/souscription";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { PAGE_ESSAI } from "@/lib/abonnements/essai";
import {
  CLES_FORMULES,
  FORMULES,
  LIBELLE_PERIODICITE,
  PERIODICITES,
  formuleDeLookupKey,
  lookupKey,
  pointsDeFormule,
} from "@/lib/abonnements/formules";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { DUREE_ESSAI_JOURS, prixDesFormules } from "@/lib/stripe/parcours";

export const metadata = {
  title: "Abonnement — Rojer",
};

/**
 * L'abonnement du compte (ADR-053) : son état, et pourquoi une saisie a été
 * refusée (`verifierSaisie` y renvoie avec `?saisie=fermee`, le gel avec
 * `?saisie=gelee`). La lecture n'est jamais fermée ; les documents
 * officiels (validation, exports, publication) demandent un abonnement payé
 * (§ 15). Le propriétaire y gère
 * l'abonnement (ADR-053 §§ 10, 12) : l'essai s'il est encore disponible ;
 * « s'abonner » (formule, rythme, puis carte chez Stripe) pendant l'essai ou
 * en pause, et après une résiliation ; le portail Stripe une fois payant. Un
 * autre membre voit l'état, sans les boutons. `?immediat=1` : un document
 * officiel attend l'abonnement, le premier mois se paie tout de suite.
 */

/** Le compte a-t-il une carte par défaut chez Stripe ? Sans réponse, comme sans carte. */
async function carteDuCompte(db: Db, compteId: string): Promise<boolean> {
  const config = configurationStripe();
  if (!config.active) return false;
  const ligne = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
  if (!ligne) return false;
  return carteParDefaut(clientStripe(config), ligne.stripeCustomerId).then((c) => c !== null, () => false);
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
async function changementsPossibles(
  db: Db,
  compteId: string,
  actuelle: string | null,
  finPeriode: Date | null,
): Promise<{ options: OptionDeFormule[]; baisse: { libelle: string; le: Date } | null }> {
  const config = configurationStripe();
  if (!config.active) return { options: [], baisse: null };
  const stripe = clientStripe(config);
  const [prix, ligne] = await Promise.all([
    prixDesFormules(stripe).catch(() => new Map()),
    db.abonnement.findUnique({ where: { compteId }, select: { stripeSubscriptionId: true } }),
  ]);
  const libelleDe = (cle: string) => {
    const f = formuleDeLookupKey(cle);
    return f ? `${FORMULES[f.formule].libelle}, ${LIBELLE_PERIODICITE[f.periodicite].adjectif}` : cle;
  };
  const options = await Promise.all(
    CLES_FORMULES.flatMap((f) => PERIODICITES.map((p) => lookupKey(f, p)))
      .map((cle) => ({ cle, sens: sensDuChangement(actuelle, cle) }))
      .filter((o): o is { cle: string; sens: "montee" | "baisse" } => o.sens === "montee" || o.sens === "baisse")
      .map(async ({ cle, sens }) => {
        const f = formuleDeLookupKey(cle)!;
        const montant = prix.get(cle)?.montantCentimes;
        return {
          cle,
          sens,
          effet: effetDuChangement(sens, actuelle, cle, finPeriode),
          libelle: libelleDe(cle),
          prix: montant ? `${eurosHT(montant)} HT par ${LIBELLE_PERIODICITE[f.periodicite].unite}` : null,
          depassements: sens === "baisse" ? await depassements(db, compteId, cle) : [],
        };
      }),
  );
  let baisse: { libelle: string; le: Date } | null = null;
  let baisseCle: string | null = null;
  if (ligne?.stripeSubscriptionId) {
    const prevue = await stripe.subscriptions
      .retrieve(ligne.stripeSubscriptionId)
      .then((s) => baissePrevue(stripe, s))
      .catch(() => null);
    if (prevue) {
      baisse = { libelle: prevue.lookupKey ? libelleDe(prevue.lookupKey) : "une autre formule", le: prevue.le };
      baisseCle = prevue.lookupKey;
    }
  }
  // La formule déjà prévue ne se propose pas une seconde fois.
  return { options: baisseCle ? options.filter((o) => o.cle !== baisseCle) : options, baisse };
}

/** Les formules et leurs prix lus chez Stripe ; sans réponse, les prix manquent et le bouton reste fermé. */
async function offresAffichees(): Promise<OffreAffichee[]> {
  const config = configurationStripe();
  const prix = config.active ? await prixDesFormules(clientStripe(config)).catch(() => new Map()) : new Map();
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


/** Ce que la page dit après un changement de formule (`changerFormuleAction`). */
const MESSAGES_FORMULE = {
  changee: "C'est fait : votre nouvelle formule s'applique dès maintenant.",
  prevue: "C'est noté : votre nouvelle formule s'appliquera à la fin de la période payée.",
  gardee: "Vous gardez votre formule actuelle.",
  impossible: "Le changement de formule n'est possible que pour un abonnement à jour de ses paiements.",
  "resiliation-prevue": "Votre abonnement prend fin à la date prévue : reprenez-le d'abord depuis « Gérer mon abonnement » pour changer de formule.",
  "trop-d-utilisateurs": "Cette formule permet moins d'utilisateurs que votre compte n'en a : retirez-en d'abord depuis Membres du compte.",
} as const;

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{
    saisie?: string;
    stripe?: string;
    paiement?: string;
    abonnement?: string;
    carte?: string;
    immediat?: string;
    formule?: string;
    essai?: string;
  }>;
}) {
  // Sans compte encore (rien créé), la page se lit quand même : aucun
  // abonnement (ADR-054). `requireCompte` renverrait à l'onboarding.
  await requireUser();
  const c = await getOptionalCompte();
  const { saisie, stripe, paiement, abonnement, carte, immediat, essai, formule: formuleChange0 } = await searchParams;
  const formuleChange = formuleChange0 && formuleChange0 in MESSAGES_FORMULE ? (formuleChange0 as keyof typeof MESSAGES_FORMULE) : null;
  const ctx = contexteDroits();
  const ouvert = offreLancee(ctx);
  // Une seule lecture : la ligne sert à l'état affiché et aux droits.
  const ligne = c ? await abonnementDuCompte(c.db, c.compte.compteId) : null;
  const droits = droitsDe(ligne, ctx);
  // Sans compte encore, `role` est nul : l'essai reste proposé.
  const geste = gesteAbonnement({ ouvert, role: c?.compte.role ?? null, ligne });
  const formule = formuleDeLookupKey(ligne?.formule);
  const offres = geste === "abonner" || geste === "souscrire" ? await offresAffichees() : [];
  // Vient de payer, la confirmation de Stripe n'est pas encore là : la page le
  // dit et ne propose jamais de payer une seconde fois (le geste est le portail).
  const paiementEnConfirmation = ligne?.statut === "active" && !ligne.debutPayantLe;
  const payerMaintenant = immediat === "1" || ligne?.statut === "paused";
  // Essai avec une carte déjà enregistrée : la formule est choisie, l'abonnement
  // démarrera seul à la fin de l'essai ; on peut encore en changer.
  const carteEnregistree =
    geste === "abonner" && ligne?.statut === "trialing" && c ? await carteDuCompte(c.db, c.compte.compteId) : false;
  // Changer de formule : un abonnement qui paie, pour son propriétaire.
  const { options: optionsChangement, baisse } =
    // Une résiliation prévue : on ne change pas une formule qui s'arrête.
    geste === "portail" && ligne?.statut === "active" && !ligne.resilieEnFinDePeriode && !ligne.finPrevueLe && c
      ? await changementsPossibles(c.db, c.compte.compteId, ligne.formule, ligne.finPeriode)
      : { options: [], baisse: null };
  const finEssai = ligne?.finEssai ? `, le ${formaterDateLongueFr(ligne.finEssai)}` : "";
  const quand =
    geste === "souscrire"
      ? "Le paiement se fait sur la page sécurisée de Stripe, notre prestataire de paiement."
      : payerMaintenant
        ? carteEnregistree
          ? "Le premier paiement est prélevé aussitôt sur votre carte enregistrée, et votre abonnement démarre."
          : "Votre carte s'enregistre sur la page sécurisée de Stripe ; le premier paiement est prélevé aussitôt et votre abonnement démarre."
        : carteEnregistree
          ? `La nouvelle formule s'applique tout de suite. Rien n'est prélevé avant la fin de votre essai${finEssai}.`
          : `Votre carte s'enregistre sur la page sécurisée de Stripe. Rien n'est prélevé avant la fin de votre essai${finEssai}.`;

  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[560px]">
        <FilRetour provenance={null} canonique={{ href: "/entreprises", label: "Mon dossier" }} />
        <h1 className="board-titre m-0 mt-6 text-[clamp(29px,3vw,39px)]">Abonnement</h1>
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Vos dossiers restent toujours consultables, quel que soit l&apos;état de l&apos;abonnement.
        </p>

        {saisie === "fermee" && !droits.saisie && (
          <p className="m-0 mt-6 text-[14px] leading-[1.45] text-[color:var(--board-slate-ink)]">
            Votre dernière modification n&apos;a pas été enregistrée.
          </p>
        )}

        {/* Un site ou un prestataire au-delà de la formule (gel, ADR-053 § 14). */}
        {saisie === "gelee" && (
          <div className="mt-6">
            <MessageFormulaire ton="alerte">
              Votre dernière modification n&apos;a pas été enregistrée. Ce site ou ce prestataire dépasse votre
              formule : il reste consultable et exportable, mais ne se modifie plus. Supprimez-en un plus ancien ou
              passez à une formule supérieure pour le modifier.
            </MessageFormulaire>
          </div>
        )}

        {/* Un geste réservé aux abonnés y renvoie (`exigerUnPaiement`) : on dit pourquoi on est là. */}
        {immediat === "1" && (geste === "abonner" || geste === "souscrire") && (
          <div className="mt-6">
            <MessageFormulaire ton="info">
              Valider un document, exporter le registre ou le dossier de contrôle, publier le registre
              d&apos;accessibilité ou demander une signature à un tiers est réservé aux abonnés. Abonnez-vous : le
              premier mois est prélevé aussitôt, et vous pouvez le faire tout de suite.
            </MessageFormulaire>
          </div>
        )}

        {droits.bandeau && <BandeauAbonnement bandeau={droits.bandeau} avecLien={false} className="mt-6" />}

        <section className="carte-board mt-7 px-7 py-6 sm:px-8" aria-labelledby="titre-etat">
          <h2 id="titre-etat" className="board-titre m-0 text-[22px]">
            État
          </h2>
          {ouvert ? (
            <dl className="m-0 mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
              <dt className="text-[color:var(--board-slate-mid)]">Abonnement</dt>
              <dd className="m-0 font-semibold">{libelleStatut(ligne?.statut ?? null)}</dd>
              {ligne?.formule && (
                <>
                  <dt className="text-[color:var(--board-slate-mid)]">Formule</dt>
                  <dd className="m-0">
                    {formule
                      ? ligne.statut === "trialing" && !carteEnregistree
                        ? // Pendant l'essai, le rythme n'est pas encore choisi : il se choisit en s'abonnant.
                          `${FORMULES[formule.formule].libelle} (essai)`
                        : `${FORMULES[formule.formule].libelle}, facturation ${LIBELLE_PERIODICITE[formule.periodicite].adjectif}`
                      : ligne.formule}
                  </dd>
                </>
              )}
              {ligne?.finEssai && ligne.statut === "trialing" && (
                <>
                  <dt className="text-[color:var(--board-slate-mid)]">Fin de l&apos;essai</dt>
                  <dd className="m-0">{formaterDateLongueFr(ligne.finEssai)}</dd>
                </>
              )}
              {/* Seul un abonnement qui court a une période en cours : ni un
                  abonnement terminé, ni une pause ou un impayé, où Stripe
                  n'avance plus la période. */}
              {ligne?.finPeriode && OUVRENT.has(ligne.statut ?? "") && (
                <>
                  <dt className="text-[color:var(--board-slate-mid)]">Période en cours jusqu&apos;au</dt>
                  <dd className="m-0">{formaterDateLongueFr(ligne.finPeriode)}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="m-0 mt-2 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Les abonnements ne sont pas encore ouverts : toutes les fonctions de Rojer restent accessibles.
            </p>
          )}
        </section>

        <div className="mt-6 flex flex-col gap-3">
          <MessageFormulaire ton="alerte">
            {stripe === "indisponible" ? "L'opération n'a pas abouti. Réessayez un peu plus tard ; rien ne vous a été facturé." : null}
          </MessageFormulaire>
          <MessageFormulaire ton="info">
            {essai === "entreprise-deja-essayee"
              ? "Cette entreprise a déjà bénéficié d'un essai gratuit avec un autre compte : votre essai s'arrête ici. Votre établissement est créé et reste consultable ; abonnez-vous pour continuer à le compléter."
              : paiement === "termine"
              ? "Paiement terminé. Votre abonnement s'affiche ici dans quelques secondes : rechargez la page s'il n'apparaît pas."
              : formuleChange
                ? MESSAGES_FORMULE[formuleChange]
                : paiementEnConfirmation
                ? "Le premier paiement est en cours : les fonctions réservées aux abonnés s'ouvrent dès qu'il est confirmé. Inutile de payer de nouveau."
                : abonnement === "en-cours"
                ? "Un abonnement est déjà en cours pour ce compte : gérez-le ici plutôt que d'en souscrire un second."
                : abonnement === "formule-choisie"
                  ? `C'est enregistré. Rien n'est prélevé avant la fin de votre essai${finEssai} ; votre abonnement démarre alors.`
                  : null}
          </MessageFormulaire>
        </div>

        {geste && (
          <section className="carte-board mt-5 px-7 py-6 sm:px-8" aria-labelledby="titre-gerer">
            <h2 id="titre-gerer" className="board-titre m-0 text-[22px]">
              {geste === "abonner" || geste === "souscrire" ? "S'abonner" : "Gérer"}
            </h2>
            {geste === "membre" && (
              <p className="m-0 mt-2 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Seul le propriétaire du compte gère l&apos;abonnement.
              </p>
            )}
            {geste === "essai" && (
              <>
                <p className="m-0 mt-2 mb-5 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  {DUREE_ESSAI_JOURS} jours gratuits de la formule {FORMULES[CLES_FORMULES[0]].libelle}, sans carte bancaire.
                </p>
                <Link href={PAGE_ESSAI} className={buttonVariants({ variant: "board", size: "board" })}>
                  Démarrer mon essai gratuit
                </Link>
              </>
            )}
            {geste === "portail" && optionsChangement.length > 0 && (
              <ChangerDeFormule options={optionsChangement} baisse={baisse} />
            )}
            {geste === "portail" && (
              <form action={ouvrirPortailAction} className={optionsChangement.length > 0 ? "mt-6" : undefined}>
                <p className="m-0 mt-2 mb-5 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  Changer de carte, résilier, télécharger vos factures : sur la page sécurisée de Stripe, notre
                  prestataire de paiement.
                  {baisse
                    ? " Un changement de formule est prévu : pour résilier, choisissez d'abord « Garder ma formule »."
                    : null}
                </p>
                <Button type="submit" variant="board" size="board">
                  Gérer mon abonnement
                </Button>
              </form>
            )}
            {carte && geste === "abonner" ? (
              <div className="mt-3">
                <FinalisationCarte sessionId={carte} />
              </div>
            ) : (
              (geste === "abonner" || geste === "souscrire") && (
                <>
                  {carteEnregistree && (
                    <p className="m-0 mt-2 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                      Votre carte est enregistrée : votre abonnement démarre à la fin de l&apos;essai{finEssai}. Vous
                      pouvez encore changer de formule.
                    </p>
                  )}
                  <FormulaireAbonnement
                    offres={offres}
                    quand={quand}
                    immediat={payerMaintenant}
                    libelle={payerMaintenant ? "Payer et m'abonner" : carteEnregistree ? "Changer de formule" : "Continuer vers le paiement"}
                  />
                  {carteEnregistree && (
                    <form action={ouvrirPortailAction} className="mt-4">
                      <Button type="submit" variant="boardClair" size="board">
                        Changer de carte, voir mes factures
                      </Button>
                    </form>
                  )}
                </>
              )
            )}
          </section>
        )}
      </div>
    </main>
  );
}
