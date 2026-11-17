import "server-only";
// Un compte sans abonnement depuis douze mois est supprimé, après deux
// avertissements (ADR-058). Joué par la tâche quotidienne
// (`lib/taches/quotidiennes.ts`), hors de toute session : il lit les
// abonnements de tous les comptes et efface un compte entier, d'où le client
// brut (`portee/imports.test.ts`).
//
// L'horloge (`Abonnement.sansAbonnementDepuis`) est écrite par la
// synchronisation Stripe ; ici, on ne fait que la lire. La date de
// suppression est posée au premier avertissement et n'avance jamais : au
// moins 30 jours après le premier e-mail, 7 jours après le second.

import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { envoiEnService, motifErreur, publicAppUrl, sendMail } from "@/lib/email";
import { ajouterJours, ajouterMois, formaterDateLongueFr } from "@/lib/dates";
import { clesDesEtablissements } from "@/lib/suppression/fichiers";
import { getStorage } from "@/lib/storage";
import { OPTIONS_WEBHOOK } from "@/lib/stripe/client";
import { expirerSessionsOuvertes, sessionsOuvertes } from "@/lib/stripe/parcours";
import { synchroniserClientStripe, toutLister } from "@/lib/stripe/synchronisation";
import { HORS_ABONNEMENT_OUVERT, OUVRENT, TERMINES } from "./droits";
import { alerter } from "@/lib/alertes";
import { ecrireAuxProprietaires } from "./rappels";
import { PAGE_ABONNEMENT } from "./saisie";

export const MOIS_SANS_ABONNEMENT = 12;
/** Comptes supprimés au plus par passe : la tâche reste courte, le reste attend le lendemain. */
export const SUPPRESSIONS_PAR_PASSE = 10;
/** La trace d'un compte supprimé se garde cinq ans (prescription de droit commun, art. 2224 du Code civil). */
export const MOIS_DE_CONSERVATION_DE_LA_TRACE = 60;
/** Fichiers retirés du stockage au plus par passe. */
export const FICHIERS_PAR_PASSE = 500;

/** Douze mois civils après l'horloge (jour civil de Paris, ADR-011). */
export function finDuDelai(sansAbonnementDepuis: Date): Date {
  return ajouterMois(sansAbonnementDepuis, MOIS_SANS_ABONNEMENT);
}

const plusTard = (a: Date, b: Date) => (a.getTime() >= b.getTime() ? a : b);
const dans = (maintenant: Date, jours: number) => ajouterJours(maintenant, jours);

/**
 * La date de suppression à dire au compte : celle posée au premier
 * avertissement ; avant lui, la fin du délai — jamais moins de 30 jours,
 * puisque le premier e-mail la posera à 30 jours au moins (un compte dont
 * l'horloge a dépassé douze mois sans avertissement, offre relancée ou envoi
 * hors service, n'est pas « supprimé très prochainement »).
 */
export function dateDeSuppressionPrevue(sansAbonnementDepuis: Date, suppressionPrevueLe: Date | null, maintenant: Date): Date {
  return suppressionPrevueLe ?? plusTard(finDuDelai(sansAbonnementDepuis), dans(maintenant, 30));
}
const FERME = HORS_ABONNEMENT_OUVERT;

export type Avertissement = "j30" | "j7";

/**
 * Ce que le compte peut garder avant la suppression : `versionsDuerp`, les
 * versions validées de son DUERP (téléchargeables une à une, abonnement ou
 * non — un compte d'avant le lancement a pu en valider sans payer) ;
 * `aPaye`, l'export du dossier (ADR-053 § 15).
 */
export type CeQuiSeGarde = { versionsDuerp: boolean; aPaye: boolean };

/** Le message, en texte seul. */
export function messageAvantSuppression(
  quand: Avertissement,
  suppressionLe: Date,
  sansAbonnementDepuis: Date,
  garde: CeQuiSeGarde,
  base: string,
): { subject: string; text: string } {
  const date = formaterDateLongueFr(suppressionLe);
  const conserver = [
    garde.versionsDuerp
      ? "Pour conserver les versions validées de votre DUERP, téléchargez-les avant cette date depuis la page DUERP de chaque établissement."
      : null,
    garde.aPaye ? "Vos autres documents s'exportent depuis la page « Préparer un contrôle » de chaque établissement." : null,
  ].filter((l): l is string => l !== null);
  return {
    subject:
      quand === "j7"
        ? `Rappel : vos données Rojer seront supprimées le ${date}`
        : `Vos données Rojer seront supprimées le ${date}`,
    text: [
      "Bonjour,",
      "",
      `Votre compte Rojer n'a plus d'abonnement depuis le ${formaterDateLongueFr(sansAbonnementDepuis)}. Ses données seront supprimées définitivement le ${date} : établissements, documents, fichiers déposés et accès de l'équipe.`,
      "",
      `Pour les garder, abonnez-vous avant cette date : ${base}${PAGE_ABONNEMENT}`,
      "",
      ...(conserver.length > 0 ? conserver : ["Votre compte ne porte aucun document validé."]),
      "La conservation de votre document unique d'évaluation des risques (DUERP), quarante ans dans ses versions successives, reste à la charge de l'employeur (articles L. 4121-3-1 et R. 4121-4 du Code du travail).",
      "",
      "— Rojer",
    ].join("\n"),
  };
}

/** Le message aux membres qui ne sont pas propriétaires, une fois, avec le rappel J-7 : seul un propriétaire peut réabonner. */
export function messageAuxMembres(nomDuCompte: string, suppressionLe: Date): { subject: string; text: string } {
  const date = formaterDateLongueFr(suppressionLe);
  return {
    subject: `Le compte Rojer « ${nomDuCompte} » sera supprimé le ${date}`,
    text: [
      "Bonjour,",
      "",
      `Le compte Rojer « ${nomDuCompte} », dont vous êtes membre, n'a plus d'abonnement. Ses données seront supprimées définitivement le ${date}, et votre accès avec.`,
      "",
      "Seul un propriétaire du compte peut le réabonner : rapprochez-vous de lui avant cette date. Si vous avez besoin de documents, téléchargez-les ou demandez-lui de les exporter d'ici là.",
      "",
      "— Rojer",
    ].join("\n"),
  };
}

type Bilan = { envoyes: number; echecs: number };

/**
 * Les deux avertissements. J-30 : la date de suppression se pose (douze mois
 * après l'horloge, au moins 30 jours plus tard). J-7 : sept jours avant, la
 * date repoussée d'autant si le rappel part en retard. Au plus une fois
 * chacun : la marque est posée avant l'envoi, rendue si rien n'est parti —
 * échec ou aucun destinataire : aucun compte n'est supprimé sans e-mail.
 */
export async function avertirAvantSuppression(
  maintenant: Date,
): Promise<Record<Avertissement, Bilan> & { membresPrevenus: number; horsService?: true }> {
  const bilan = { j30: { envoyes: 0, echecs: 0 }, j7: { envoyes: 0, echecs: 0 }, membresPrevenus: 0 };
  if (!envoiEnService()) return { ...bilan, horsService: true };
  const base = publicAppUrl();

  const premiers = await prisma.abonnement.findMany({
    where: {
      ...FERME,
      avertiSuppression30Le: null,
      sansAbonnementDepuis: { not: null, lte: avantDelai(maintenant, 30) },
    },
    select: { id: true, compteId: true, sansAbonnementDepuis: true, debutPayantLe: true },
  });
  for (const l of premiers) {
    const prevue = plusTard(finDuDelai(l.sansAbonnementDepuis!), dans(maintenant, 30));
    const prise = await prisma.abonnement.updateMany({
      where: { id: l.id, avertiSuppression30Le: null, sansAbonnementDepuis: l.sansAbonnementDepuis },
      data: { avertiSuppression30Le: maintenant, suppressionPrevueLe: prevue },
    });
    if (prise.count !== 1) continue;
    const { partis, echec } = await ecrireAuxProprietaires(
      l.compteId,
      messageAvantSuppression("j30", prevue, l.sansAbonnementDepuis!, await ceQuiSeGarde(l.compteId, l.debutPayantLe), base),
      "avertissement J-30",
    );
    compter(bilan.j30, partis, echec);
    if (partis === 0) {
      if (!echec) console.error(`avertissement J-30 : aucun propriétaire joignable (compte ${l.compteId})`);
      await prisma.abonnement
        .updateMany({ where: { id: l.id, avertiSuppression30Le: maintenant }, data: { avertiSuppression30Le: null, suppressionPrevueLe: null } })
        .catch(() => {});
    }
  }

  const seconds = await prisma.abonnement.findMany({
    where: {
      ...FERME,
      sansAbonnementDepuis: { not: null },
      avertiSuppression30Le: { not: null },
      avertiSuppression7Le: null,
      suppressionPrevueLe: { lte: dans(maintenant, 7) },
    },
    select: {
      id: true,
      compteId: true,
      suppressionPrevueLe: true,
      sansAbonnementDepuis: true,
      debutPayantLe: true,
      compte: { select: { name: true } },
    },
  });
  for (const l of seconds) {
    const avant = l.suppressionPrevueLe!;
    const prevue = plusTard(avant, dans(maintenant, 7));
    const prise = await prisma.abonnement.updateMany({
      where: { id: l.id, avertiSuppression7Le: null, suppressionPrevueLe: avant },
      data: { avertiSuppression7Le: maintenant, suppressionPrevueLe: prevue },
    });
    if (prise.count !== 1) continue;
    const { partis, echec } = await ecrireAuxProprietaires(
      l.compteId,
      messageAvantSuppression("j7", prevue, l.sansAbonnementDepuis!, await ceQuiSeGarde(l.compteId, l.debutPayantLe), base),
      "avertissement J-7",
    );
    compter(bilan.j7, partis, echec);
    // Les autres membres, une fois, quand le propriétaire a été prévenu : leur
    // échec ne retient pas la suppression (la règle des deux e-mails vaut pour
    // qui peut réabonner).
    if (partis > 0) bilan.membresPrevenus += await prevenirLesMembres(l.compteId, l.compte.name, prevue);
    if (partis === 0) {
      if (!echec) console.error(`avertissement J-7 : aucun propriétaire joignable (compte ${l.compteId})`);
      await prisma.abonnement
        .updateMany({ where: { id: l.id, avertiSuppression7Le: maintenant }, data: { avertiSuppression7Le: null, suppressionPrevueLe: avant } })
        .catch(() => {});
    }
  }
  return bilan;
}

/** Écrit aux membres qui ne sont pas propriétaires ; rend le nombre d'e-mails partis. */
async function prevenirLesMembres(compteId: string, nom: string, suppressionLe: Date): Promise<number> {
  let partis = 0;
  try {
    const membres = await prisma.membre.findMany({
      where: { compteId, role: { not: "owner" } },
      select: { user: { select: { email: true } } },
    });
    for (const { user } of membres) {
      try {
        await sendMail({ to: user.email, ...messageAuxMembres(nom, suppressionLe) });
        partis++;
      } catch (e) {
        console.error(`avertissement J-7 aux membres non envoyé (compte ${compteId}) — ${motifErreur(e)}`);
      }
    }
  } catch (e) {
    console.error(`avertissement J-7 : membres illisibles (compte ${compteId}) — ${motifErreur(e)}`);
  }
  return partis;
}

async function ceQuiSeGarde(compteId: string, debutPayantLe: Date | null): Promise<CeQuiSeGarde> {
  const versions = await prisma.duerpVersion.count({ where: { duerp: { etablissement: { entreprise: { compteId } } } } });
  return { versionsDuerp: versions > 0, aPaye: debutPayantLe !== null };
}

/** L'horloge au plus tard pour que la fin du délai tombe d'ici `jours` jours. */
function avantDelai(maintenant: Date, jours: number): Date {
  return ajouterMois(dans(maintenant, jours), -MOIS_SANS_ABONNEMENT);
}

function compter(b: Bilan, partis: number, echec: boolean) {
  if (partis > 0) b.envoyes++;
  if (echec) b.echecs++;
}

/** Les comptes à supprimer aujourd'hui : date atteinte, les deux avertissements partis. */
/** Une page de paiement plus récente que ce délai retient la suppression d'un jour. */
const PAIEMENT_EN_COURS_MS = 3_600_000;

const ECHUS = (maintenant: Date) => ({
  ...FERME,
  sansAbonnementDepuis: { not: null },
  avertiSuppression30Le: { not: null },
  avertiSuppression7Le: { not: null },
  suppressionPrevueLe: { lte: maintenant },
});

/**
 * Un compte reporté passe derrière les autres comptes échus : sa date devient
 * celle de la passe (elle est déjà dépassée, rien n'est avancé). Sans quoi dix
 * comptes qui échouent chaque jour bloqueraient la file pour tous les autres.
 */
async function reporter(compteId: string, maintenant: Date) {
  await prisma.abonnement
    .updateMany({ where: { compteId, ...ECHUS(maintenant) }, data: { suppressionPrevueLe: maintenant } })
    .catch((e: unknown) => console.error(`report du compte ${compteId} non noté — ${motifErreur(e)}`));
}

const introuvable = (e: unknown) => (e as { code?: unknown } | null)?.code === "resource_missing";

/**
 * Le client Stripe a-t-il été SUPPRIMÉ (dans le tableau de bord) ? Stripe
 * résilie alors ses abonnements, et garde le client lisible, marqué
 * `deleted`. Un « introuvable » ne suffit pas : une mauvaise clé (clé de test
 * en production, autre compte Stripe) répond de même, alors que l'abonnement
 * réel facture peut-être encore — on ne supprime pas sur cette réponse-là.
 */
async function clientSupprime(stripe: Stripe, customerId: string): Promise<boolean> {
  const client = await stripe.customers.retrieve(customerId).catch(() => null);
  return client?.deleted === true;
}

export type BilanSuppressions = { supprimes: number; reportes: number };

/**
 * Supprime les comptes échus, au plus `SUPPRESSIONS_PAR_PASSE`. Sans Stripe
 * (abonnements désactivés), rien : on ne supprime pas un compte dont on ne
 * peut pas arrêter la facturation.
 */
export async function supprimerComptesEchus(maintenant: Date, stripe: Stripe | null): Promise<BilanSuppressions> {
  const bilan: BilanSuppressions = { supprimes: 0, reportes: 0 };
  if (!stripe) return bilan;
  const echus = await prisma.abonnement.findMany({
    where: ECHUS(maintenant),
    select: { compteId: true, stripeCustomerId: true },
    orderBy: { suppressionPrevueLe: "asc" },
    take: SUPPRESSIONS_PAR_PASSE,
  });
  for (const { compteId, stripeCustomerId } of echus) {
    // Un compte qui n'a jamais quitté l'essai (compté chez Rojer, ADR-053 § 9
    // amendé le 2026-11-16) n'a pas de client Stripe : rien à y arrêter.
    if (stripeCustomerId) try {
      // Stripe fait foi, pas notre copie : un webhook perdu peut cacher un
      // réabonnement. Un abonnement ouvert chez Stripe : rien n'est résilié
      // ni effacé, la copie est relue (son horloge se vide) et le compte
      // attend. Sinon, ce qui pourrait encore facturer (un impayé) est
      // résilié ; le client et ses factures restent.
      // Une page de paiement ouverte depuis moins d'une heure : le
      // propriétaire paie peut-être en ce moment — le compte attend le
      // lendemain. Une page plus ancienne (abandonnée) expire. Les sessions
      // d'abord, les abonnements ensuite : un paiement qui aboutit entre les
      // deux lectures se voit dans la seconde (relecture du 2026-11-17).
      let abonnements: Stripe.Subscription[];
      try {
        const ouvertes = await sessionsOuvertes(stripe, stripeCustomerId, OPTIONS_WEBHOOK);
        if (ouvertes.some((s) => s.created * 1000 > maintenant.getTime() - PAIEMENT_EN_COURS_MS)) {
          bilan.reportes++;
          await reporter(compteId, maintenant);
          console.error(`suppression du compte ${compteId} reportée : une page de paiement vient d'être ouverte`);
          continue;
        }
        await expirerSessionsOuvertes(stripe, stripeCustomerId, OPTIONS_WEBHOOK);
        // Une liste tronquée n'est pas un état complet : `toutLister` le refuse.
        abonnements = await toutLister(stripe.subscriptions.list({ customer: stripeCustomerId, status: "all", limit: 100 }, OPTIONS_WEBHOOK), 1000);
      } catch (e) {
        if (!introuvable(e)) throw e;
        if (!(await clientSupprime(stripe, stripeCustomerId))) {
          // Introuvable sans être supprimé : mauvaise clé (test en production,
          // autre compte Stripe) — le compte attend, chaque jour : à signaler.
          await alerter("suppression d'un compte en attente : client Stripe introuvable", [
            `compte ${compteId}, client ${stripeCustomerId}`,
            "Vérifier la clé Stripe de l'application (mode, compte) ; rien n'est effacé tant que Stripe ne dit pas le client supprimé.",
          ]);
          throw e;
        }
        console.error(`suppression du compte ${compteId} : client Stripe ${stripeCustomerId} supprimé, rien à résilier`);
        abonnements = [];
      }
      if (abonnements.some((s) => OUVRENT.has(s.status))) {
        bilan.reportes++;
        await reporter(compteId, maintenant);
        const relue = await synchroniserClientStripe(stripe, stripeCustomerId).then(
          () => "copie relue",
          (e: unknown) => `copie NON relue — ${motifErreur(e)}`,
        );
        console.error(`suppression du compte ${compteId} annulée : un abonnement est ouvert chez Stripe (${relue})`);
        continue;
      }
      // Un premier paiement en traitement (`incomplete`) peut encore aboutir :
      // on attend que Stripe le rende actif ou l'expire (sous 23 heures).
      if (abonnements.some((s) => s.status === "incomplete")) {
        bilan.reportes++;
        await reporter(compteId, maintenant);
        console.error(`suppression du compte ${compteId} reportée : un paiement est en traitement chez Stripe`);
        continue;
      }
      for (const s of abonnements) {
        if (!TERMINES.has(s.status)) await stripe.subscriptions.cancel(s.id);
      }
    } catch (e) {
      bilan.reportes++;
      await reporter(compteId, maintenant);
      console.error(`suppression du compte ${compteId} reportée : Stripe — ${motifErreur(e)}`);
      continue;
    }
    try {
      // Sous le verrou de la ligne, juste avant d'effacer : un client Stripe
      // apparu depuis la lecture de la passe (« S'abonner » vient de le
      // réserver), et le compte attend. Aucun appel à Stripe sous le verrou.
      const cles = await supprimerCompte(compteId, maintenant, { client: stripeCustomerId });
      if (cles === null) {
        bilan.reportes++;
        continue;
      }
      // Les fichiers sont notés dans la transaction ; la tâche des fichiers
      // à libérer les retire du stockage (`libererFichiersEnAttente`).
      bilan.supprimes++;
    } catch (e) {
      bilan.reportes++;
      await reporter(compteId, maintenant);
      console.error(`suppression du compte ${compteId} échouée — ${motifErreur(e)}`);
    }
  }
  return bilan;
}

/**
 * Efface un compte entier, dans une transaction, la ligne d'abonnement
 * verrouillée et la condition relue : un réabonnement de dernière minute
 * l'emporte (`null`), comme un client Stripe apparu depuis la lecture de la
 * passe (`garde`). Garde la trace du compte (`CompteSupprime`, cinq ans)
 * et note ses fichiers dans la file des fichiers à libérer, dans la même
 * transaction : l'effacement ne peut pas réussir sans elles. Rend les clés.
 */
export async function supprimerCompte(
  compteId: string,
  maintenant: Date,
  garde?: { client: string | null },
): Promise<string[] | null> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Abonnement" WHERE "compteId" = ${compteId}::uuid FOR UPDATE`;
      const encore = await tx.abonnement.findFirst({
        where: { compteId, ...ECHUS(maintenant) },
        select: { stripeCustomerId: true, sansAbonnementDepuis: true, avertiSuppression30Le: true, avertiSuppression7Le: true, compte: { select: { name: true } } },
      });
      if (!encore) return null;
      if (garde && encore.stripeCustomerId !== garde.client) return null;

      const etablissements = await tx.etablissement.findMany({
        where: { entreprise: { compteId } },
        select: { id: true },
      });
      const cles = await clesDesEtablissements(
        tx,
        etablissements.map((e) => e.id),
      );
      // Et tout fichier compté au compte, même plus référencé (un dépôt
      // abandonné) : il partirait sinon du compte, pas du stockage.
      const comptes = await tx.fichierStocke.findMany({ where: { compteId }, select: { cle: true } });
      // La trace, avant que les lignes ne partent : qui a accepté quoi, qui a
      // été prévenu et quand (ADR-058 § 5). Aucune donnée métier.
      const [acceptations, proprietaires] = await Promise.all([
        tx.acceptationConditions.findMany({
          where: { compteId },
          orderBy: { accepteeLe: "asc" },
          select: { version: true, empreinte: true, contexte: true, accepteeLe: true, user: { select: { email: true } } },
        }),
        tx.membre.findMany({ where: { compteId, role: "owner" }, select: { user: { select: { email: true } } } }),
      ]);
      await tx.compteSupprime.create({
        data: {
          ancienCompteId: compteId,
          nom: encore.compte.name,
          proprietaires: proprietaires.map((m) => m.user.email),
          acceptations: acceptations.map((a) => ({
            email: a.user.email,
            version: a.version,
            empreinte: a.empreinte,
            contexte: a.contexte,
            accepteeLe: a.accepteeLe.toISOString(),
          })),
          sansAbonnementDepuis: encore.sansAbonnementDepuis,
          avertiSuppression30Le: encore.avertiSuppression30Le,
          avertiSuppression7Le: encore.avertiSuppression7Le,
          supprimeLe: maintenant,
          conserverJusquAu: ajouterMois(maintenant, MOIS_DE_CONSERVATION_DE_LA_TRACE),
        },
      });

      // Les versions de DUERP ne suivent aucune cascade, exprès (elles
      // bloquent la suppression d'une entreprise par son dirigeant) : la fin
      // du service les efface, l'employeur les a reçues par l'export (ADR-058).
      await tx.duerpVersion.deleteMany({ where: { duerp: { etablissement: { entreprise: { compteId } } } } });
      await tx.entreprise.deleteMany({ where: { compteId } });
      await tx.demandeAssistance.deleteMany({ where: { compteId } });
      await tx.acceptationConditions.deleteMany({ where: { compteId } });
      await tx.abonnement.delete({ where: { compteId } });

      const membres = await tx.membre.findMany({ where: { compteId }, select: { userId: true } });
      await tx.compte.delete({ where: { id: compteId } });

      // Les personnes qui ne sont membres d'aucun autre compte, et dont rien
      // ne garde la trace ailleurs (une signature, un lien d'accès, une
      // demande, une acceptation, une invitation envoyée : sur un autre
      // compte, la personne reste — l'invitation la suit en cascade).
      for (const { userId } of membres) {
        const [ailleurs, signatures, liens, demandes, acceptations, invitations] = await Promise.all([
          tx.membre.count({ where: { userId } }),
          tx.signature.count({ where: { userId } }),
          tx.accessToken.count({ where: { createdByUserId: userId } }),
          tx.demandeAssistance.count({ where: { userId } }),
          tx.acceptationConditions.count({ where: { userId } }),
          tx.invitationCompte.count({ where: { inviterId: userId } }),
        ]);
        if (ailleurs + signatures + liens + demandes + acceptations + invitations === 0) await tx.user.delete({ where: { id: userId } });
      }
      const aLiberer = [...new Set([...cles, ...comptes.map((f) => f.cle)])];
      await tx.fichierALiberer.createMany({
        data: aLiberer.map((cle) => ({ cle, contexte: "comptes/suppression" })),
        skipDuplicates: true,
      });
      return aLiberer;
    },
    { timeout: 60_000 },
  );
}

/**
 * Retire du stockage les fichiers notés à libérer, les moins tentés d'abord.
 * Un fichier retiré quitte la file ; un échec y reste, compté, pour la passe
 * suivante. La suppression d'une clé absente ne lève pas (tous les pilotes) :
 * une passe rejouée ne fait pas d'erreur.
 */
export async function libererFichiersEnAttente(): Promise<{ liberes: number; echecs: number; restants: number }> {
  const enAttente = await prisma.fichierALiberer.findMany({
    orderBy: [{ tentatives: "asc" }, { noteLe: "asc" }],
    take: FICHIERS_PAR_PASSE,
    select: { cle: true, contexte: true },
  });
  let liberes = 0;
  let echecs = 0;
  if (enAttente.length > 0) {
    let stockage: ReturnType<typeof getStorage> | null = null;
    try {
      stockage = getStorage();
    } catch (e) {
      console.error(`fichiers à libérer : stockage indisponible, ${enAttente.length} en attente — ${motifErreur(e)}`);
    }
    for (const { cle, contexte } of stockage ? enAttente : []) {
      try {
        await stockage!.delete(cle);
        // `deleteMany` : une autre instance a pu la retirer entre-temps.
        await prisma.fichierALiberer.deleteMany({ where: { cle } });
        liberes++;
      } catch (e) {
        echecs++;
        console.error(`[${contexte}] fichier non libéré, retenté demain : ${cle} — ${motifErreur(e)}`);
        await prisma.fichierALiberer.update({ where: { cle }, data: { tentatives: { increment: 1 } } }).catch(() => {});
      }
    }
    if (!stockage) echecs = enAttente.length;
  }
  return { liberes, echecs, restants: await prisma.fichierALiberer.count() };
}

/** Efface les traces de comptes supprimés dont les cinq ans sont passés. */
export async function purgerTracesEchues(maintenant: Date): Promise<{ effacees: number }> {
  const { count } = await prisma.compteSupprime.deleteMany({ where: { conserverJusquAu: { lt: maintenant } } });
  return { effacees: count };
}
