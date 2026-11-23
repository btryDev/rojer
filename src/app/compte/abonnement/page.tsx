import Link from "next/link";
import { Suspense } from "react";

import { BandeauAbonnement } from "@/components/abonnements/BandeauAbonnement";
import { CarteAbonnement, OffreFermee, TEXTE_AIDE } from "@/components/abonnements/CarteAbonnement";
import { FrisePeriode } from "@/components/abonnements/FrisePeriode";
import { JaugeDePlafond } from "@/components/abonnements/JaugeDePlafond";
import { MenuAbonnement } from "@/components/compte/MenuInterne";
import { RecapPaiement } from "@/components/abonnements/RecapPaiement";
import { PageDuCompte } from "@/components/compte/PageDuCompte";
import { buttonVariants } from "@/components/ui/button";
import { PastilleAbonnement } from "@/components/abonnements/PastilleAbonnement";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { MESSAGE_COMPTE_CHANGE } from "@/lib/auth/compte-attendu";
import type { Db } from "@/lib/auth/compte";
import { getOptionalCompte } from "@/lib/auth/compte";
import { PAGE_ESSAI } from "@/lib/abonnements/essai";
import { essaiProche } from "@/lib/abonnements/droits";
import { etatAffiche } from "@/lib/abonnements/etat-affiche";
import { DUREE_ESSAI_JOURS } from "@/lib/abonnements/formules";
import { etatDeLAbonnement, type EtatDeLAbonnement } from "@/lib/abonnements/page-abonnement";
import { utilisationDuCompte } from "@/lib/abonnements/quotas";
import { contexteDroits } from "@/lib/abonnements/saisie";
import { PAGE_ABONNEMENT, PAGE_FORMULES, PAGE_PAIEMENT, PAGE_UTILISATION } from "@/lib/abonnements/sous-pages";
import { dateDeSuppressionPrevue } from "@/lib/abonnements/suppression";
import { GESTE_DU_PORTAIL, type VueAbonnement } from "@/lib/abonnements/vue-abonnement";
import { clientStripeLecture } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { idStripe } from "@/lib/stripe/ids";
import { synchroniserClientStripe } from "@/lib/stripe/synchronisation";

export const metadata = {
  title: "Abonnement — Rojer",
};

/**
 * La vue d'ensemble de l'abonnement du compte (ADR-053 ; découpée en quatre
 * sous-pages le 2026-11-17, décision de la propriétaire) : l'état en une
 * carte — formule, pastille, frise de la période —, puis deux résumés qui
 * mènent à Utilisation et à Paiement et factures. Les gestes (s'abonner,
 * changer de formule, le portail de Stripe) vivent sur leurs sous-pages.
 *
 * Cette adresse reste celle où l'on arrive : `verifierSaisie` y renvoie avec
 * `?saisie=fermee`, le gel avec `?saisie=gelee`, `exigerUnPaiement` avec
 * `?document=1`, les actions de l'abonnement avec `?formule=…` (les refus,
 * eux, sur Formules) ou `?stripe=indisponible`, Checkout avec
 * `?paiement=termine&session=…`.
 *
 * Stripe n'est lu qu'au retour d'un paiement (`relireApresPaiement`) : tout
 * le reste vient de la copie locale de l'abonnement.
 */

/**
 * Au retour de Checkout (`?paiement=termine&session=cs_…`) : la copie de
 * l'abonnement est relue chez Stripe AVANT l'affichage. Sans cela, la page
 * montrait encore « Essai terminé » et le bandeau de saisie fermée à qui
 * venait de payer, le temps que la notification arrive (répétition du
 * 2026-11-17). Sans réponse de Stripe, la page s'affiche quand même ; la
 * notification suivra.
 *
 * Rend vrai seulement pour une session payée de CE client, créée depuis
 * moins de 25 heures (une session dure 24 h au plus) : une adresse de retour
 * revisitée (historique, favori) ou forgée ne relit rien, ne masque pas le
 * formulaire et n'annonce aucun paiement (revue du 2026-11-17).
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
 * Ce que la page dit après avoir gardé sa formule (`annulerBaisseAction`). Un
 * changement fait ou prévu se dit dans la fenêtre de confirmation (2026-11-23).
 */
const MESSAGES_FORMULE = {
  gardee: "Vous gardez votre formule actuelle.",
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
  const { saisie, stripe, paiement: paiement0, abonnement, document, formule: formuleChange0, compte: compteChange, session } =
    await searchParams;
  // Le retour de Checkout ne compte que s'il est vérifié chez Stripe — et la
  // relecture passe AVANT la lecture de la ligne (`etatDeLAbonnement`).
  const c = await getOptionalCompte();
  const paiementTermine =
    !!c && paiement0 === "termine" && (await relireApresPaiement(c.db, c.compte.compteId, session, contexteDroits().maintenant));
  const etat = await etatDeLAbonnement();
  const vue = etat.vueAvec({ documentAttend: document === "1", paiementTermine });
  // `Object.hasOwn` et non `in` : `?formule=toString` ne doit pas trouver le prototype.
  const formuleChange =
    formuleChange0 && Object.hasOwn(MESSAGES_FORMULE, formuleChange0) ? MESSAGES_FORMULE[formuleChange0 as keyof typeof MESSAGES_FORMULE] : null;

  return (
    <PageDuCompte
      titre="Abonnement"
      description="Votre formule, où vous en êtes de la période, et ce qu'il reste à faire."
      menu={<MenuAbonnement />}
    >

      {/* Un geste parti d'un onglet resté sur un autre compte (`clientDuCompte`) : refusé. */}
      {compteChange === "change" && <MessageFormulaire ton="alerte">{MESSAGE_COMPTE_CHANGE}</MessageFormulaire>}

      {saisie === "fermee" && !etat.droits.saisie && (
        <p className="m-0 text-[14px] leading-[1.45] text-[color:var(--board-slate-ink)]">
          Votre dernière modification n&apos;a pas été enregistrée.
        </p>
      )}

      {/* Un site ou un prestataire au-delà de la formule (gel, ADR-053 § 14). */}
      {saisie === "gelee" && (
        <MessageFormulaire ton="alerte">
          Votre dernière modification n&apos;a pas été enregistrée. Ce site ou ce prestataire dépasse votre formule : il
          reste consultable et exportable, mais ne se modifie plus. Supprimez-en un plus ancien ou passez à une formule
          supérieure pour le modifier.
        </MessageFormulaire>
      )}

      {/* Un geste réservé aux abonnés y renvoie (`exigerUnPaiement`) : on dit pourquoi on est là. */}
      {vue.cas === "formulaire" && vue.annoncerDocument && (
        <MessageFormulaire ton="info">
          Valider un document, exporter le registre ou le dossier de contrôle, publier le registre d&apos;accessibilité ou
          demander une signature à un tiers est réservé aux abonnés. En vous abonnant, votre abonnement démarre
          aujourd&apos;hui et les limites de l&apos;essai sont levées.
        </MessageFormulaire>
      )}

      {etat.droits.bandeau && <BandeauAbonnement bandeau={etat.droits.bandeau} avecLien={false} />}

      <MessageFormulaire ton="alerte">
        {stripe === "indisponible" ? "L'opération n'a pas abouti. Réessayez un peu plus tard ; rien ne vous a été facturé." : null}
      </MessageFormulaire>
      {/* « S'abonner » avant l'ouverture au public (`lib/ouverture.ts`). */}
      <MessageFormulaire ton="info">
        {stripe === "bientot" ? "L'abonnement ouvre très bientôt : vous pourrez souscrire depuis cette page." : null}
      </MessageFormulaire>
      <MessageFormulaire ton="info">
        {messageDeLaPage({ paiementTermine, phase: etat.phase, formuleChange, abonnement })}
      </MessageFormulaire>

      {vue.cas === "fermee" ? (
        <OffreFermee />
      ) : (
        <>
          <CarteEtat etat={etat} vue={vue} />
          {c ? (
            // Les compteurs ne retiennent pas la carte d'état : le résumé arrive après.
            <Suspense fallback={null}>
              <Resumes etat={etat} vue={vue} db={c.db} compteId={c.compte.compteId} />
            </Suspense>
          ) : null}
        </>
      )}

      <p className={`${TEXTE_AIDE} text-[13px]`}>
        Sans abonnement, vos dossiers restent consultables douze mois, puis le compte est supprimé, après deux e-mails
        d&apos;avertissement.
      </p>
    </PageDuCompte>
  );
}

/** L'état en une carte : la formule en grand, sa pastille, la frise, et le geste du cas (`etatAffiche`). */
function CarteEtat({ etat, vue }: { etat: EtatDeLAbonnement; vue: VueAbonnement }) {
  const { ligne, ctx } = etat;
  const suppressionLe = ligne?.sansAbonnementDepuis
    ? dateDeSuppressionPrevue(ligne.sansAbonnementDepuis, ligne.suppressionPrevueLe, ctx.maintenant)
    : null;
  const affiche = etatAffiche(ligne, ctx.maintenant, suppressionLe);
  return (
    <section className="carte-board px-7 py-7 sm:px-8" aria-labelledby="titre-etat">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-5">
        <div className="flex min-w-0 flex-col items-start gap-2.5">
          <PastilleAbonnement pastille={affiche.pastille} />
          <h2 id="titre-etat" className="board-titre m-0 text-[clamp(34px,4vw,46px)] leading-none tracking-[-0.04em]">
            {affiche.titre}
          </h2>
          {affiche.detail ? <p className={TEXTE_AIDE}>{affiche.detail}</p> : null}
        </div>
        <GesteDuCas
          vue={vue}
          // Discret pendant l'essai, sauf dans sa dernière semaine ou quand un
          // document officiel attend l'abonnement : c'est alors le geste.
          discret={etat.phase.type === "essai" && !essaiProche(etat.phase.fin, ctx.maintenant) && !(vue.cas === "formulaire" && vue.annoncerDocument)}
        />
      </div>
      {affiche.frise ? <FrisePeriode frise={affiche.frise} maintenant={ctx.maintenant} /> : null}
      {affiche.suppressionImminente ? (
        <p className={`${TEXTE_AIDE} mt-5`}>Vos données seront supprimées très prochainement, sauf abonnement d&apos;ici là.</p>
      ) : null}
    </section>
  );
}

/**
 * Le geste que la carte propose : un lien vers la sous-page qui le porte, ou
 * l'essai. `discret` : pendant l'essai, rien n'y pousse à payer (2026-11-17)
 * — les offres, en lien clair ; s'abonner plus tôt y reste possible.
 */
function GesteDuCas({ vue, discret }: { vue: VueAbonnement; discret: boolean }) {
  const plein = buttonVariants({ variant: "board", size: "board" });
  const clair = buttonVariants({ variant: "boardClair", size: "board" });
  switch (vue.cas) {
    case "essai":
      return (
        <Link href={PAGE_ESSAI} className={plein}>
          Démarrer mon essai gratuit
        </Link>
      );
    case "formulaire":
      return (
        <Link href={PAGE_FORMULES} className={discret ? clair : plein}>
          {discret ? "Voir les offres" : "M'abonner"}
        </Link>
      );
    case "portail":
      return vue.situation === "a-jour" ? (
        <div className="flex flex-wrap gap-2.5">
          <Link href={PAGE_FORMULES} className={clair}>
            Changer d&apos;offre
          </Link>
          <Link href={PAGE_PAIEMENT} className={clair}>
            Paiement et factures
          </Link>
        </div>
      ) : (
        <Link href={PAGE_PAIEMENT} className={plein}>
          {GESTE_DU_PORTAIL[vue.situation]}
        </Link>
      );
    case "membre":
      return <p className={TEXTE_AIDE}>Seul le propriétaire du compte gère l&apos;abonnement.</p>;
    case "aucune":
    case "fermee":
      return null;
  }
}

/** Les deux résumés sous l'état : ce qui est utilisé, et le paiement — sans rien lire chez Stripe. */
async function Resumes({ etat, vue, db, compteId }: { etat: EtatDeLAbonnement; vue: VueAbonnement; db: Db; compteId: string }) {
  const { lignes } = await utilisationDuCompte(db, compteId, {
    ligne: etat.ligne,
    seulementPlafonnes: true,
    maintenant: etat.ctx.maintenant,
  });
  // Les trois plafonds les plus entamés : ce qui approche d'un refus. Un
  // plafond d'une unité tenue (le site unique, la personne seule) n'annonce
  // rien : il passe après les autres.
  const ratio = (l: (typeof lignes)[number]) => (l.plafond! > 1 ? l.utilise / l.plafond! : -1);
  const plusEntames = lignes
    .filter((l) => l.plafond! > 0)
    .sort((a, b) => ratio(b) - ratio(a))
    .slice(0, 3);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <CarteAbonnement titre="Utilisation" lien={{ href: PAGE_UTILISATION, libelle: "Tout voir" }}>
        {plusEntames.length > 0 ? (
          plusEntames.map((l) => <JaugeDePlafond key={l.cle} utilisation={l} />)
        ) : (
          <p className={TEXTE_AIDE}>Votre formule n&apos;a pas de plafond chiffré.</p>
        )}
      </CarteAbonnement>
      <CarteAbonnement
        titre="Paiement"
        lien={vue.cas === "portail" ? { href: PAGE_PAIEMENT, libelle: "Carte et factures" } : undefined}
      >
        {vue.cas === "membre" ? (
          <p className={TEXTE_AIDE}>Le paiement et les factures sont gérés par le propriétaire du compte.</p>
        ) : vue.cas === "portail" && etat.ligne ? (
          <RecapPaiement ligne={etat.ligne} formule={etat.formule} situation={vue.situation} />
        ) : vue.cas === "aucune" ? (
          // Retour d'un paiement dont la copie retarde : ne pas dire « aucune
          // carte » à qui vient de payer (relecture du 2026-11-17).
          <p className={TEXTE_AIDE}>Votre paiement est en cours d&apos;enregistrement : il s&apos;affichera ici dans un instant.</p>
        ) : (
          <p className={TEXTE_AIDE}>
            Aucune carte enregistrée : rien ne vous est demandé tant que vous ne vous abonnez pas
            {etat.phase.type === "essai" ? `, ni pendant les ${DUREE_ESSAI_JOURS} jours de l'essai` : ""}.
          </p>
        )}
      </CarteAbonnement>
    </div>
  );
}

/** La phrase d'information de la page, une seule à la fois, par ordre de priorité. */
function messageDeLaPage(p: {
  paiementTermine: boolean;
  phase: EtatDeLAbonnement["phase"];
  formuleChange: string | null;
  abonnement?: string;
}): React.ReactNode {
  if (p.paiementTermine) {
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
  if (p.formuleChange) return p.formuleChange;
  if (p.abonnement === "en-cours") return "Un abonnement est déjà en cours pour ce compte : gérez-le ici plutôt que d'en souscrire un second.";
  return null;
}
