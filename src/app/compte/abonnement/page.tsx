import { FilRetour } from "@/components/ui-kit/FilRetour";
import { NomDuCompte } from "@/components/compte/NomDuCompte";
import { BandeauAbonnement } from "@/components/abonnements/BandeauAbonnement";
import { compteDeLaPage, getOptionalCompte, type Db } from "@/lib/auth/compte";
import { MESSAGE_COMPTE_CHANGE } from "@/lib/auth/compte-attendu";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { requireUser } from "@/lib/auth/require-user";
import { abonnementDuCompte, contexteDroits, offreLancee } from "@/lib/abonnements/saisie";
import { droitsDe, gesteAbonnement, libelleStatut, OUVRENT, resiliationPrevue } from "@/lib/abonnements/droits";
import { besoinDeLaCarte, preselection, vueAbonnement } from "@/lib/abonnements/vue-abonnement";
import { lireOffreChoisie } from "@/lib/abonnements/offre-choisie";
import { formaterDateLongueFr } from "@/lib/dates";
import { dateDeSuppressionPrevue } from "@/lib/abonnements/suppression";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ouvrirPortailAction, reglerFactureAction } from "@/lib/abonnements/actions";
import { FormulaireAbonnement, type OffreAffichee } from "@/components/abonnements/FormulaireAbonnement";
import { BoutonEnvoi } from "@/components/abonnements/BoutonEnvoi";
import { FinalisationCarte } from "@/components/abonnements/FinalisationCarte";
import { ChangerDeFormule, type OptionDeFormule } from "@/components/abonnements/ChangerDeFormule";
import { sensDuChangement } from "@/lib/abonnements/changement";
import { depassements } from "@/lib/abonnements/quotas";
import { prixTTC } from "@/lib/abonnements/affichage";
import { baissePrevue } from "@/lib/stripe/parcours";
import { carteParDefaut } from "@/lib/abonnements/souscription";
import { clientStripeLecture } from "@/lib/stripe/client";
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

/** Une date déjà passée (suppression reportée d'une passe à l'autre) ne s'affiche pas : la suppression est imminente. */
function dateDeSuppressionAffichee(le: Date, maintenant = new Date()): string {
  return le.getTime() > maintenant.getTime() ? `le ${formaterDateLongueFr(le)}` : "très prochainement";
}

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
  return carteParDefaut(clientStripeLecture(config), ligne.stripeCustomerId).then((c) => c !== null, () => false);
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
  const stripe = clientStripeLecture(config);
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
          prix: montant ? prixTTC(montant, f.periodicite) : null,
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
    compte?: string;
    facture?: string;
    conditions?: string;
  }>;
}) {
  // Sans compte encore (rien créé), la page se lit quand même : aucun
  // abonnement (ADR-054). `requireCompte` renverrait à l'onboarding.
  const user = await requireUser();
  const c = await getOptionalCompte();
  const { saisie, stripe, paiement, abonnement, carte, immediat, formule: formuleChange0, compte: compteChange, facture, conditions } =
    await searchParams;
  // Le compte que montre la page : ses gestes le postent (`ChampCompteAttendu`).
  const { compteId, nomCompte } = await compteDeLaPage();
  const formuleChange = formuleChange0 && formuleChange0 in MESSAGES_FORMULE ? (formuleChange0 as keyof typeof MESSAGES_FORMULE) : null;
  const ctx = contexteDroits();
  const ouvert = offreLancee(ctx);
  // Une seule lecture : la ligne sert à l'état affiché et aux droits.
  const ligne = c ? await abonnementDuCompte(c.db, c.compte.compteId) : null;
  const droits = droitsDe(ligne, ctx);
  // Sans compte encore, `role` est nul : l'essai reste proposé.
  const geste = gesteAbonnement({ ouvert, role: c?.compte.role ?? null, ligne });
  const formule = formuleDeLookupKey(ligne?.formule);
  // Vient de payer, la confirmation de Stripe n'est pas encore là : la page le
  // dit et ne propose jamais de payer une seconde fois (le geste est le portail).
  const paiementEnConfirmation = ligne?.statut === "active" && !ligne.debutPayantLe;
  const finPrevue = ligne ? resiliationPrevue(ligne) : false;
  const finEssai = ligne?.finEssai ? `, le ${formaterDateLongueFr(ligne.finEssai)}` : "";
  const entree = {
    geste,
    statut: ligne?.statut ?? null,
    resiliationPrevue: finPrevue,
    immediat: immediat === "1",
    retourCarte: !!carte,
    finEssai,
  };
  // Les lectures chez Stripe, ensemble : les offres (formulaire) et la carte
  // du compte (seulement là où elle change le geste).
  const [offres, carteEnregistree] = await Promise.all([
    geste === "abonner" || geste === "souscrire" ? offresAffichees() : Promise.resolve([]),
    c && besoinDeLaCarte(entree) ? carteDuCompte(c.db, c.compte.compteId) : Promise.resolve(false),
  ]);
  const vue = vueAbonnement({ ...entree, carteEnregistree });
  // La formule présélectionnée : celle de l'abonnement quand elle est
  // choisie ; avant, celle choisie sur la page publique (`offre-choisie.ts`).
  const offreChoisie = vue.cas === "formulaire" && vue.mode !== "changer" ? await lireOffreChoisie() : null;
  const courante = preselection(vue, { abonnement: formule, offreChoisie, geste });
  // Changer de formule : un abonnement qui paie, pour son propriétaire ; pas
  // une formule qui s'arrête.
  const { options: optionsChangement, baisse } =
    geste === "portail" && ligne?.statut === "active" && !finPrevue && c
      ? await changementsPossibles(c.db, c.compte.compteId, ligne.formule, ligne.finPeriode)
      : { options: [], baisse: null };

  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[560px]">
        <FilRetour provenance={null} canonique={{ href: "/entreprises", label: "Mon dossier" }} />
        <h1 className="board-titre m-0 mt-6 text-[clamp(29px,3vw,39px)]">Abonnement</h1>
        <NomDuCompte nom={nomCompte} email={user.email} />
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Vos dossiers restent toujours consultables, quel que soit l&apos;état de l&apos;abonnement.
        </p>

        {/* Un geste parti d'un onglet resté sur un autre compte (`clientDuCompte`) : refusé. */}
        {compteChange === "change" && (
          <div className="mt-6">
            <MessageFormulaire ton="alerte">{MESSAGE_COMPTE_CHANGE}</MessageFormulaire>
          </div>
        )}

        {/* S'abonner sans la case des conditions (`sAbonnerAction`) : rien n'a été fait. */}
        {conditions === "requises" && (
          <div className="mt-6">
            <MessageFormulaire ton="alerte">
              Rien n&apos;a été enregistré : cochez la case pour accepter les conditions générales, puis recommencez.
            </MessageFormulaire>
          </div>
        )}

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
        {vue.cas === "formulaire" && vue.annoncerDocument && (
          <div className="mt-6">
            <MessageFormulaire ton="info">
              Valider un document, exporter le registre ou le dossier de contrôle, publier le registre
              d&apos;accessibilité ou demander une signature à un tiers est réservé aux abonnés. En payant
              maintenant, votre abonnement démarre aujourd&apos;hui et les limites de l&apos;essai sont levées.
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
              <dd className="m-0 font-semibold">{libelleStatut(ligne)}</dd>
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
              {/* Sans abonnement depuis douze mois, le compte est supprimé (ADR-058) :
                  la date posée au premier avertissement, sinon la fin du délai. */}
              {ligne?.sansAbonnementDepuis && !OUVRENT.has(ligne.statut ?? "") && (
                <>
                  <dt className="text-[color:var(--board-slate-mid)]">Données supprimées</dt>
                  <dd className="m-0">
                    {dateDeSuppressionAffichee(dateDeSuppressionPrevue(ligne.sansAbonnementDepuis, ligne.suppressionPrevueLe, new Date()))}, sauf
                    abonnement d&apos;ici là
                  </dd>
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
            {paiement === "termine"
              ? "Paiement terminé. Votre abonnement s'affiche ici dans quelques secondes : rechargez la page s'il n'apparaît pas."
              : formuleChange
                ? MESSAGES_FORMULE[formuleChange]
                : paiementEnConfirmation
                ? "Le premier paiement est en cours : les fonctions réservées aux abonnés s'ouvrent dès qu'il est confirmé. Inutile de payer de nouveau."
                : facture === "aucune"
                ? "Aucune facture n'attend de paiement : votre abonnement est à jour."
                : facture === "introuvable"
                ? "Aucune facture payable n'a été trouvée. Vérifiez votre carte depuis « Gérer mon abonnement » ; si le problème reste, écrivez-nous."
                : abonnement === "en-cours"
                ? "Un abonnement est déjà en cours pour ce compte : gérez-le ici plutôt que d'en souscrire un second."
                : abonnement === "formule-choisie"
                  ? `C'est enregistré. Rien n'est prélevé avant la fin de votre essai${finEssai} ; votre abonnement démarre alors.`
                  : null}
          </MessageFormulaire>
        </div>

        {vue.cas !== "aucune" && (
          <section className="carte-board mt-5 px-7 py-6 sm:px-8" aria-labelledby="titre-gerer">
            <h2 id="titre-gerer" className="board-titre m-0 text-[22px]">
              {vue.titre}
            </h2>
            {vue.cas === "membre" && (
              <p className="m-0 mt-2 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Seul le propriétaire du compte gère l&apos;abonnement.
              </p>
            )}
            {vue.cas === "essai" && (
              <>
                <p className="m-0 mt-2 mb-5 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  {DUREE_ESSAI_JOURS} jours gratuits de la formule {FORMULES[CLES_FORMULES[0]].libelle}, sans carte bancaire.
                </p>
                <Link href={PAGE_ESSAI} className={buttonVariants({ variant: "board", size: "board" })}>
                  Démarrer mon essai gratuit
                </Link>
              </>
            )}
            {vue.cas === "portail" && (
              <>
                {optionsChangement.length > 0 && <ChangerDeFormule options={optionsChangement} baisse={baisse} compteId={compteId} />}
                {vue.factureEnAttente && (
                  <form action={reglerFactureAction} className="mt-2 mb-6">
                    <ChampCompteAttendu compteId={compteId} />
                    <p className="m-0 mb-4 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                      Une facture attend son paiement. Réglez-la sur la page sécurisée de Stripe, avec la même carte
                      ou une autre : la saisie se rouvre dès qu&apos;elle est payée.
                    </p>
                    <BoutonEnvoi variant="board">Régler la facture en attente</BoutonEnvoi>
                  </form>
                )}
                <FormulairePortail
                  compteId={compteId}
                  variant={vue.factureEnAttente ? "boardClair" : "board"}
                  className={optionsChangement.length > 0 ? "mt-6" : "mt-2"}
                >
                  Carte, factures, résiliation : sur la page sécurisée de Stripe, notre prestataire de paiement.
                  {baisse ? " Un changement de formule est prévu : pour résilier, choisissez d'abord « Garder ma formule »." : null}
                </FormulairePortail>
              </>
            )}
            {vue.cas === "essai-resilie" && (
              <FormulairePortail compteId={compteId} variant="board" className="mt-2">
                Vous avez résilié : votre essai s&apos;arrête{finEssai}, et rien ne sera prélevé. Pour changer d&apos;avis,
                reprenez votre abonnement depuis « Gérer mon abonnement ».
              </FormulairePortail>
            )}
            {vue.cas === "finalisation" && carte && (
              <div className="mt-3">
                <FinalisationCarte sessionId={carte} />
              </div>
            )}
            {/* Juste après un paiement, la copie de l'abonnement peut retarder de
                quelques secondes sur Stripe : la page ne repropose pas de payer
                (répétition du 2026-11-16 — « Payer et m'abonner » restait affiché
                à côté de « Paiement terminé »). Le serveur refuse de toute façon
                un second paiement. */}
            {vue.cas === "formulaire" && paiement !== "termine" && (
              <>
                {vue.rappelApresEssai && formule && (
                  <p className="m-0 mt-2 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    Votre carte est enregistrée. Après l&apos;essai{finEssai} : {FORMULES[formule.formule].libelle},
                    facturation {LIBELLE_PERIODICITE[formule.periodicite].adjectif}.
                  </p>
                )}
                <FormulaireAbonnement
                  offres={offres}
                  compteId={compteId}
                  mode={vue.mode}
                  libelle={vue.libelle}
                  quand={vue.quand}
                  courante={courante}
                  proposerPayerMaintenant={vue.proposerPayerMaintenant}                />
                {vue.portail && (
                  <FormulairePortail compteId={compteId} variant="boardClair" className="mt-6">
                    {vue.portail}
                  </FormulairePortail>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

/** Le portail Stripe (carte, factures, résiliation), avec la phrase qui dit ce qu'on y fait. */
function FormulairePortail({
  compteId,
  variant,
  className,
  children,
}: {
  compteId: string | null;
  variant: "board" | "boardClair";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form action={ouvrirPortailAction} className={className}>
      <ChampCompteAttendu compteId={compteId} />
      <p className="m-0 mb-5 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">{children}</p>
      <BoutonEnvoi variant={variant}>Gérer mon abonnement</BoutonEnvoi>
    </form>
  );
}
