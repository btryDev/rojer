import { FilRetour } from "@/components/ui-kit/FilRetour";
import { NomDuCompte } from "@/components/compte/NomDuCompte";
import { BandeauAbonnement } from "@/components/abonnements/BandeauAbonnement";
import { compteDeLaPage, getOptionalCompte, type Db } from "@/lib/auth/compte";
import { MESSAGE_COMPTE_CHANGE } from "@/lib/auth/compte-attendu";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { requireUser } from "@/lib/auth/require-user";
import { PAGE_ABONNEMENT, abonnementDuCompte, contexteDroits, offreLancee } from "@/lib/abonnements/saisie";
import { droitsDe, gesteAbonnement, libelleStatut, OUVRENT, phaseDuCompte, resiliationPrevue } from "@/lib/abonnements/droits";
import { preselection, vueAbonnement } from "@/lib/abonnements/vue-abonnement";
import { lireOffreChoisie } from "@/lib/abonnements/offre-choisie";
import { formaterDateLongueFr } from "@/lib/dates";
import { dateDeSuppressionPrevue } from "@/lib/abonnements/suppression";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ouvrirPortailAction } from "@/lib/abonnements/actions";
import { FormulaireAbonnement, type OffreAffichee } from "@/components/abonnements/FormulaireAbonnement";
import { BoutonEnvoi } from "@/components/abonnements/BoutonEnvoi";
import { ChangerDeFormule, type OptionDeFormule } from "@/components/abonnements/ChangerDeFormule";
import { sensDuChangement } from "@/lib/abonnements/changement";
import { depassementsDe, stocksDuCompte } from "@/lib/abonnements/quotas";
import { prixTTC } from "@/lib/abonnements/affichage";
import { baissePrevue } from "@/lib/stripe/parcours";
import { clientStripeLecture } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { idStripe } from "@/lib/stripe/ids";
import { synchroniserClientStripe } from "@/lib/stripe/synchronisation";
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
import { prixDesFormules } from "@/lib/stripe/parcours";
import { DUREE_ESSAI_JOURS } from "@/lib/abonnements/formules";

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
 * l'abonnement (ADR-053 §§ 9 — amendé le 2026-11-16 —, 10, 12) : l'essai
 * s'il est encore disponible ; « s'abonner » (formule, rythme, puis la page
 * de Stripe, paiement immédiat) pendant l'essai, après lui ou après une
 * résiliation ; le portail Stripe une fois abonné. Un autre membre voit
 * l'état, sans les boutons. `?document=1` : un document officiel attend
 * l'abonnement.
 */

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
 * Au retour de Checkout (`?paiement=termine&session=cs_…`) : la copie de
 * l'abonnement est relue chez Stripe AVANT l'affichage. Sans cela, la page
 * montrait encore « Essai terminé » et le bandeau de saisie fermée à qui
 * venait de payer, le temps que la notification arrive (répétition du
 * 2026-11-17). Sans réponse de Stripe, la page s'affiche quand même ; la
 * notification suivra.
 *
 * Rend vrai seulement pour une session payée de CE client, créée depuis
 * moins de 25 heures (une session dure 24 h au plus) : une adresse de retour revisitée (historique, favori) ou forgée ne
 * relit rien, ne masque pas le formulaire et n'annonce aucun paiement (revue
 * du 2026-11-17).
 */
async function relireApresPaiement(db: Db, compteId: string, session: string | undefined, maintenant: Date): Promise<boolean> {
  const config = configurationStripe();
  if (!config.active || !session || !/^cs_[A-Za-z0-9_]+$/.test(session)) return false;
  const ligne = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
  if (!ligne?.stripeCustomerId) return false;
  const stripe = clientStripeLecture(config);
  const payee = await stripe.checkout.sessions.retrieve(session).catch(() => null);
  const recente = payee && payee.created * 1000 > maintenant.getTime() - RETOUR_DE_PAIEMENT_MS;
  if (!payee || !recente || payee.status !== "complete" || idStripe(payee.customer) !== ligne.stripeCustomerId) return false;
  await synchroniserClientStripe(stripe, ligne.stripeCustomerId, { attendreMs: 5_000 }).catch(() => null);
  return true;
}

const RETOUR_DE_PAIEMENT_MS = 25 * 3_600_000;

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
  const visees = CLES_FORMULES.flatMap((f) => PERIODICITES.map((p) => lookupKey(f, p)))
    .map((cle) => ({ cle, sens: sensDuChangement(actuelle, cle) }))
    .filter((o): o is { cle: string; sens: "montee" | "baisse" } => o.sens === "montee" || o.sens === "baisse");
  // Les stocks du compte, comptés une fois pour toutes les baisses proposées.
  const stocks = visees.some((o) => o.sens === "baisse") ? await stocksDuCompte(db, compteId) : null;
  const options = visees.map(({ cle, sens }) => {
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
    document?: string;
    formule?: string;
    compte?: string;
    session?: string;
  }>;
}) {
  // Sans compte encore (rien créé), la page se lit quand même : aucun
  // abonnement (ADR-054). `requireCompte` renverrait à l'onboarding.
  const user = await requireUser();
  const c = await getOptionalCompte();
  const { saisie, stripe, paiement: paiement0, abonnement, document, formule: formuleChange0, compte: compteChange, session } =
    await searchParams;
  // Le compte que montre la page : ses gestes le postent (`ChampCompteAttendu`).
  const { compteId, nomCompte } = await compteDeLaPage();
  const formuleChange = formuleChange0 && formuleChange0 in MESSAGES_FORMULE ? (formuleChange0 as keyof typeof MESSAGES_FORMULE) : null;
  const ctx = contexteDroits();
  const ouvert = offreLancee(ctx);
  // Le retour de Checkout ne compte que s'il est vérifié chez Stripe.
  const paiement =
    c && paiement0 === "termine" && (await relireApresPaiement(c.db, c.compte.compteId, session, ctx.maintenant)) ? "termine" : undefined;
  // Une seule lecture : la ligne sert à l'état affiché et aux droits.
  const ligne = c ? await abonnementDuCompte(c.db, c.compte.compteId) : null;
  const droits = droitsDe(ligne, ctx);
  // Sans compte encore, `role` est nul : l'essai reste proposé.
  const geste = gesteAbonnement({ ouvert, role: c?.compte.role ?? null, ligne });
  const formule = formuleDeLookupKey(ligne?.formule);
  const finPrevue = ligne ? resiliationPrevue(ligne) : false;
  const phase = phaseDuCompte(ligne, ctx.maintenant);
  const essaiEnCours = phase.type === "essai";
  const vue = vueAbonnement({
    geste,
    statut: ligne?.statut ?? null,
    enEssai: essaiEnCours,
    documentAttend: document === "1",
    paiementTermine: paiement === "termine",
  });
  // Les offres (Stripe) et la formule choisie sur la page publique
  // (`offre-choisie.ts`), ensemble ; la présélection, sinon, reprend celle
  // d'un abonnement passé.
  const [offres, offreChoisie] =
    vue.cas === "formulaire" ? await Promise.all([offresAffichees(), lireOffreChoisie()]) : [[], null];
  const courante = preselection(vue, { abonnement: formule, offreChoisie });
  const messageInfo = messageDeLaPage({ paiement, phase, formuleChange, abonnement });
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
          Sans abonnement, vos dossiers restent consultables douze mois, puis le compte est supprimé, après deux
          e-mails d&apos;avertissement.
        </p>

        {/* Un geste parti d'un onglet resté sur un autre compte (`clientDuCompte`) : refusé. */}
        {compteChange === "change" && (
          <div className="mt-6">
            <MessageFormulaire ton="alerte">{MESSAGE_COMPTE_CHANGE}</MessageFormulaire>
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
              d&apos;accessibilité ou demander une signature à un tiers est réservé aux abonnés. En vous
              abonnant, votre abonnement démarre aujourd&apos;hui et les limites de l&apos;essai sont levées.
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
              <dd className="m-0 font-semibold">{libelleStatut(ligne, ctx.maintenant)}</dd>
              {ligne?.formule && (
                <>
                  <dt className="text-[color:var(--board-slate-mid)]">Formule</dt>
                  <dd className="m-0">
                    {formule
                      ? `${FORMULES[formule.formule].libelle}, facturation ${LIBELLE_PERIODICITE[formule.periodicite].adjectif}`
                      : ligne.formule}
                  </dd>
                </>
              )}
              {phase.type === "essai" && (
                <>
                  <dt className="text-[color:var(--board-slate-mid)]">Fin de l&apos;essai</dt>
                  <dd className="m-0">{formaterDateLongueFr(phase.fin)}</dd>
                </>
              )}
              {/* Seul un abonnement qui court a une période en cours : ni un
                  abonnement terminé, ni un impayé, où Stripe
                  n'avance plus la période. */}
              {ligne?.finPeriode && OUVRENT.has(ligne.statut ?? "") && (
                <>
                  <dt className="text-[color:var(--board-slate-mid)]">Période en cours jusqu&apos;au</dt>
                  <dd className="m-0">{formaterDateLongueFr(ligne.finPeriode)}</dd>
                </>
              )}
              {/* Sans abonnement depuis douze mois, le compte est supprimé (ADR-058) :
                  la date posée au premier avertissement, sinon la fin du délai. */}
              {ligne?.sansAbonnementDepuis && !OUVRENT.has(ligne.statut ?? "") && !essaiEnCours && (
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
            {messageInfo}
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
                {/* Un impayé : le portail de Stripe, où la carte se change (il
                    l'enregistre et la met par défaut) et la facture se paie ou
                    se confirme. La page de la facture, elle, n'enregistre pas
                    une carte saisie sans la case « sauvegarder » : la carte
                    refusée restait celle du mois suivant (répétition du
                    2026-11-17). */}
                <FormulairePortail
                  compteId={compteId}
                  variant="board"
                  libelle={vue.aRegler ? "Changer de carte et payer" : undefined}
                  className={optionsChangement.length > 0 ? "mt-6" : "mt-2"}
                >
                  {vue.aRegler ? (
                    <>
                      Votre dernier paiement n&apos;est pas passé. Changez de carte, ou confirmez le paiement si votre
                      banque le demande : il est relancé aussitôt, sur la page sécurisée de Stripe.
                      {!droits.saisie ? " La saisie se rouvre dès qu'il est passé." : null}
                    </>
                  ) : (
                    <>
                      Carte, factures, résiliation : sur la page sécurisée de Stripe, notre prestataire de paiement.
                      {baisse ? " Un changement de formule est prévu : pour résilier, choisissez d'abord « Garder ma formule »." : null}
                    </>
                  )}
                </FormulairePortail>
              </>
            )}
            {/* Juste après un paiement, la vue ne propose pas de payer
                (`paiementTermine`, vue-abonnement.ts) ; le serveur refuse de
                toute façon un second paiement. */}
            {vue.cas === "formulaire" && (
              <FormulaireAbonnement offres={offres} compteId={compteId} quand={vue.quand} courante={courante} />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

/** La phrase d'information de la page, une seule à la fois, par ordre de priorité. */
function messageDeLaPage(p: {
  paiement?: string;
  phase: ReturnType<typeof phaseDuCompte>;
  formuleChange: keyof typeof MESSAGES_FORMULE | null;
  abonnement?: string;
}): React.ReactNode {
  if (p.paiement === "termine") {
    if (p.phase.type !== "abonne") {
      // Recharger la même adresse garderait le paramètre : le lien l'ôte.
      return (
        <>
          Paiement terminé. Votre abonnement s&apos;affiche ici dans quelques secondes :{" "}
          <Link href={PAGE_ABONNEMENT} className="underline">
            actualiser la page
          </Link>
          .
        </>
      );
    }
    // Une adresse de retour revisitée plus tard ne dit « reçu » qu'à un abonnement actif.
    return p.phase.statut === "active" ? "Paiement reçu : votre abonnement est actif." : null;
  }
  if (p.formuleChange) return MESSAGES_FORMULE[p.formuleChange];
  if (p.abonnement === "en-cours") return "Un abonnement est déjà en cours pour ce compte : gérez-le ici plutôt que d'en souscrire un second.";
  return null;
}

/** Le portail Stripe (carte, factures, résiliation), avec la phrase qui dit ce qu'on y fait. */
function FormulairePortail({
  compteId,
  variant,
  libelle = "Gérer mon abonnement",
  className,
  children,
}: {
  compteId: string | null;
  variant: "board" | "boardClair";
  libelle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form action={ouvrirPortailAction} className={className}>
      <ChampCompteAttendu compteId={compteId} />
      <p className="m-0 mb-5 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">{children}</p>
      <BoutonEnvoi variant={variant}>{libelle}</BoutonEnvoi>
    </form>
  );
}
