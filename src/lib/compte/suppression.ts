import "server-only";
// La suppression du compte à la demande d'un propriétaire (ADR-058 § 8).
//
// La demande pose une date ; l'effacement vient sept jours plus tard, par la
// tâche quotidienne et la même fonction que la suppression d'un compte sans
// abonnement (`abonnements/suppression.ts`). Rien n'est résilié à la
// demande : annuler remet tout comme avant. Seule exception, un abonnement
// qui se renouvellerait avant la date reçoit une fin programmée à son
// échéance, notée (`suppressionFinPosee`) et retirée à l'annulation.
//
// Client Prisma brut : `Compte` n'est pas dans la portée bornée ; le compte
// vient toujours de `verifierProprietaire` (garde : `portee/imports.test.ts`).

import { cache } from "react";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { ajouterJours, formaterDateLongueFr } from "@/lib/dates";
import { motifErreur, publicAppUrl } from "@/lib/email";
import { alerter } from "@/lib/alertes";
import { abonnementEnCours, resiliationDemandee } from "@/lib/abonnements/droits";
import { ecrireAuxMembres, ecrireAuxProprietaires } from "@/lib/abonnements/rappels";
import { CONSERVATION_DUERP, effacementDeLaDemande, paiementEnCours, SANS_PAIEMENT_EN_COURS } from "@/lib/abonnements/suppression";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { synchroniserClientStripe } from "@/lib/stripe/synchronisation";

export const PAGE_SUPPRESSION = "/compte/suppression";

export type DemandeDeSuppression = { demandeeLe: Date; par: string | null; effacementLe: Date };

/** La demande en cours du compte, ou `null` ; une lecture par rendu (le bandeau du dossier, la page). */
export const demandeDuCompte = cache(async (compteId: string): Promise<DemandeDeSuppression | null> => {
  const c = await prisma.compte.findUnique({
    where: { id: compteId },
    select: { suppressionDemandeeLe: true, suppressionDemandeePar: true },
  });
  if (!c?.suppressionDemandeeLe) return null;
  return { demandeeLe: c.suppressionDemandeeLe, par: c.suppressionDemandeePar, effacementLe: effacementDeLaDemande(c.suppressionDemandeeLe) };
});

/** Le nom du compte, tel que le propriétaire doit le taper. */
export async function nomDuCompte(compteId: string): Promise<string> {
  return (await prisma.compte.findUniqueOrThrow({ where: { id: compteId }, select: { name: true } })).name;
}

/** Ce que la page dit avant le geste : les versions du DUERP par établissement, et si l'export est ouvert. */
export async function ceQuiPart(compteId: string, maintenant = new Date()) {
  const [etablissements, ligne] = await Promise.all([
    prisma.etablissement.findMany({
      where: { entreprise: { compteId } },
      orderBy: { createdAt: "asc" },
      select: { id: true, raisonDisplay: true, duerps: { select: { id: true, _count: { select: { versions: true } } } } },
    }),
    prisma.abonnement.findUnique({ where: { compteId }, select: { debutPayantLe: true, statut: true, finPeriode: true, finPrevueLe: true } }),
  ]);
  const enCours = abonnementEnCours(ligne?.statut ?? null);
  return {
    etablissements: etablissements.map((e) => ({
      id: e.id,
      nom: e.raisonDisplay,
      duerpId: e.duerps[0]?.id ?? null,
      versions: e.duerps.reduce((n, d) => n + d._count.versions, 0),
    })),
    aPaye: ligne?.debutPayantLe != null,
    abonnementEnCours: enCours,
    /** Le renouvellement qui tomberait avant l'effacement : l'abonnement s'arrêtera ce jour-là (la règle de `poserLaDemande`, sur notre copie). */
    finAbonnementAvant:
      enCours && !ligne?.finPrevueLe && ligne?.finPeriode && ligne.finPeriode <= limiteDeRenouvellement(effacementDeLaDemande(maintenant))
        ? ligne.finPeriode
        : null,
  };
}

/** Le jour d'effacement entier, et un jour de plus si la passe était reportée : un renouvellement d'ici là serait prélevé pour rien. */
const limiteDeRenouvellement = (effacementLe: Date) => ajouterJours(effacementLe, 2);

type Refus = { refus: string };

/**
 * Pose la demande. Refusée pendant un paiement (la suppression l'attendrait
 * de toute façon) et pendant un changement de formule planifié (Stripe
 * refuserait la fin programmée). Deux propriétaires en même temps : une
 * seule demande passe.
 */
export async function poserLaDemande(compteId: string, email: string, maintenant: Date): Promise<{ ok: true } | Refus> {
  const effacementLe = effacementDeLaDemande(maintenant);
  const ligne = await prisma.abonnement.findUnique({
    where: { compteId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true, statut: true, paiementOuvertLe: true },
  });
  if (paiementEnCours(ligne?.paiementOuvertLe ?? null, maintenant)) {
    return { refus: "Un paiement est en cours sur ce compte : réessayez dans une heure." };
  }

  // Un abonnement qui court : se renouvellera-t-il avant l'effacement ?
  let stripe: Stripe | null = null;
  let finAPoser: string | null = null;
  let finAbonnementLe: Date | null = null;
  if (ligne?.stripeSubscriptionId && abonnementEnCours(ligne.statut)) {
    const config = configurationStripe();
    if (!config.active) return { refus: INDISPONIBLE };
    stripe = clientStripe(config);
    try {
      const s = await stripe.subscriptions.retrieve(ligne.stripeSubscriptionId);
      if (s.schedule) {
        return { refus: "Un changement de formule est prévu : renoncez-y d'abord sur la page Abonnement, puis revenez ici." };
      }
      // Une fin déjà demandée par le propriétaire (`cancel_at_period_end`,
      // `cancel_at`) reste la sienne : ni reposée, ni retirée à l'annulation
      // (relecture du 2026-11-18).
      const echeance = s.items.data[0]?.current_period_end;
      if (abonnementEnCours(s.status) && echeance && echeance * 1000 <= limiteDeRenouvellement(effacementLe).getTime()) {
        if (s.cancel_at && s.cancel_at > echeance) {
          return { refus: "Une fin d'abonnement est déjà prévue après son prochain renouvellement : retirez-la d'abord sur la page Abonnement, puis revenez ici." };
        }
        if (!resiliationDemandee(s)) {
          finAPoser = s.id;
          finAbonnementLe = new Date(echeance * 1000);
        }
      }
    } catch (e) {
      console.error(`suppression demandée (compte ${compteId}) : abonnement illisible chez Stripe — ${motifErreur(e)}`);
      return { refus: INDISPONIBLE };
    }
  }

  const prise = await prisma.compte.updateMany({
    // Le paiement en cours relu DANS l'écriture : un « S'abonner » passé
    // depuis la lecture ci-dessus ne laisse pas poser la demande.
    where: { id: compteId, suppressionDemandeeLe: null, ...SANS_PAIEMENT_EN_COURS(maintenant) },
    data: { suppressionDemandeeLe: maintenant, suppressionDemandeePar: email, suppressionFinPosee: finAPoser !== null },
  });
  if (prise.count !== 1) return { refus: "La suppression de ce compte est déjà demandée, ou un paiement vient de s'y ouvrir : rechargez la page." };

  if (stripe && finAPoser) {
    try {
      await stripe.subscriptions.update(finAPoser, { cancel_at_period_end: true });
    } catch (e) {
      // Rien de posé à moitié : la demande est retirée.
      await prisma.compte.updateMany({
        where: { id: compteId, suppressionDemandeeLe: maintenant },
        data: { suppressionDemandeeLe: null, suppressionDemandeePar: null, suppressionFinPosee: false },
      });
      console.error(`suppression demandée (compte ${compteId}) : fin d'abonnement non programmée — ${motifErreur(e)}`);
      return { refus: INDISPONIBLE };
    }
    await relire(stripe, ligne?.stripeCustomerId ?? null);
  }

  const nom = await nomDuCompte(compteId);
  const envois = [
    await ecrireAuxProprietaires(compteId, messageDemande(nom, email, effacementLe, publicAppUrl(), finAbonnementLe), "suppression demandée"),
    await ecrireAuxMembres(compteId, messageDemandeAuxMembres(nom, effacementLe), "suppression demandée, aux membres"),
  ];
  // La demande reste posée (le bandeau et la page la disent), mais des
  // personnes n'ont pas reçu la date : à prévenir à la main.
  if (envois.some((e) => e.echec)) {
    await alerter("suppression demandée : des e-mails ne sont pas partis", [
      `compte ${compteId}, effacement prévu le ${formaterDateLongueFr(effacementLe)}`,
      "Des propriétaires ou des membres n'ont pas reçu la date ni le lien pour annuler : les prévenir.",
    ]);
  }
  return { ok: true };
}

/** Retire la demande ; la fin d'abonnement qu'elle avait programmée est retirée d'abord. */
export async function retirerLaDemande(compteId: string, email: string): Promise<{ ok: true } | Refus> {
  const c = await prisma.compte.findUnique({
    where: { id: compteId },
    select: { suppressionDemandeeLe: true, suppressionFinPosee: true, abonnement: { select: { stripeCustomerId: true, stripeSubscriptionId: true } } },
  });
  if (!c?.suppressionDemandeeLe) return { ok: true };
  const abonnement = c.abonnement;
  // La fin programmée par la demande a pu déjà prendre effet : l'abonnement ne
  // court plus, et l'annulation le dit au lieu de promettre « comme avant ».
  let abonnementArrete = false;
  if (c.suppressionFinPosee && !abonnement?.stripeSubscriptionId) abonnementArrete = true;
  else if (c.suppressionFinPosee && abonnement?.stripeSubscriptionId) {
    const config = configurationStripe();
    if (!config.active) return { refus: INDISPONIBLE };
    const stripe = clientStripe(config);
    try {
      const s = await stripe.subscriptions.retrieve(abonnement.stripeSubscriptionId);
      if (!abonnementEnCours(s.status)) abonnementArrete = true;
      else if (s.cancel_at_period_end) await stripe.subscriptions.update(s.id, { cancel_at_period_end: false });
    } catch (e) {
      console.error(`suppression annulée (compte ${compteId}) : fin d'abonnement non retirée — ${motifErreur(e)}`);
      return { refus: INDISPONIBLE };
    }
    await relire(stripe, abonnement.stripeCustomerId);
  }
  const retiree = await prisma.compte.updateMany({
    where: { id: compteId, suppressionDemandeeLe: c.suppressionDemandeeLe },
    data: { suppressionDemandeeLe: null, suppressionDemandeePar: null, suppressionFinPosee: false },
  });
  if (retiree.count === 1) {
    const nom = await nomDuCompte(compteId);
    const message = messageAnnulation(nom, email, effacementDeLaDemande(c.suppressionDemandeeLe), abonnementArrete);
    await ecrireAuxProprietaires(compteId, message, "suppression annulée");
    await ecrireAuxMembres(compteId, message, "suppression annulée, aux membres");
  }
  return { ok: true };
}

const INDISPONIBLE = "Le service de paiement ne répond pas : rien n'a été fait. Réessayez dans quelques minutes.";

/** La copie locale relue après un geste chez Stripe ; le webhook la relira de toute façon. */
async function relire(stripe: Stripe, customerId: string | null) {
  if (customerId) await synchroniserClientStripe(stripe, customerId).catch(() => null);
}

type Message = { subject: string; text: string };

const TELECHARGER = "Téléchargez les versions validées du DUERP avant cette date, depuis la page DUERP de chaque établissement.";

export function messageDemande(nom: string, par: string, effacementLe: Date, base: string, finAbonnementLe: Date | null = null): Message {
  const date = formaterDateLongueFr(effacementLe);
  const abonnement = finAbonnementLe
    ? `Son abonnement, qui devait se renouveler le ${formaterDateLongueFr(finAbonnementLe)}, s'arrêtera ce jour-là au lieu de se renouveler : la saisie sera fermée ensuite, et annuler la suppression après cette date ne le rétablit pas.`
    : "Son abonnement, s'il en a un, sera résilié ce jour-là, sans remboursement de la période entamée.";
  return {
    subject: `Le compte Rojer « ${nom} » sera supprimé le ${date}`,
    text: [
      "Bonjour,",
      "",
      `La suppression du compte Rojer « ${nom} » a été demandée par ${par}. Ses données seront supprimées définitivement le ${date} : établissements, documents, fichiers déposés et accès de l'équipe. ${abonnement}`,
      "",
      `Pour annuler d'ici là : ${base}${PAGE_SUPPRESSION}`,
      "",
      CONSERVATION_DUERP,
      TELECHARGER,
      "",
      "— Rojer",
    ].join("\n"),
  };
}

export function messageDemandeAuxMembres(nom: string, effacementLe: Date): Message {
  const date = formaterDateLongueFr(effacementLe);
  return {
    subject: `Le compte Rojer « ${nom} » sera supprimé le ${date}`,
    text: [
      "Bonjour,",
      "",
      `Un propriétaire du compte Rojer « ${nom} », dont vous êtes membre, en a demandé la suppression. Ses données seront supprimées définitivement le ${date}, et votre accès avec.`,
      "",
      "Si vous avez besoin de documents, téléchargez-les d'ici là, ou rapprochez-vous d'un propriétaire du compte : lui seul peut annuler la suppression.",
      "",
      "— Rojer",
    ].join("\n"),
  };
}

export function messageAnnulation(nom: string, par: string, effacementLe: Date, abonnementArrete = false): Message {
  return {
    subject: `La suppression du compte Rojer « ${nom} » est annulée`,
    text: [
      "Bonjour,",
      "",
      `La suppression du compte Rojer « ${nom} », prévue le ${formaterDateLongueFr(effacementLe)}, a été annulée par ${par}. Le compte et ses données restent.`,
      ...(abonnementArrete
        ? ["", "Son abonnement s'est arrêté pendant la demande et ne court plus : un propriétaire peut s'abonner de nouveau depuis la page Abonnement pour continuer à saisir."]
        : []),
      "",
      "— Rojer",
    ].join("\n"),
  };
}
