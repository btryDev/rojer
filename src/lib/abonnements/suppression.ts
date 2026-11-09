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
import { clesDesEtablissements, libererFichiers } from "@/lib/suppression/fichiers";
import { OPTIONS_WEBHOOK } from "@/lib/stripe/client";
import { expirerSessionsOuvertes } from "@/lib/stripe/parcours";
import { synchroniserClientStripe } from "@/lib/stripe/synchronisation";
import { OUVRENT } from "./droits";
import { adressesDesProprietaires } from "./rappels";
import { PAGE_ABONNEMENT } from "./saisie";

export const MOIS_SANS_ABONNEMENT = 12;
/** Comptes supprimés au plus par passe : la tâche reste courte, le reste attend le lendemain. */
export const SUPPRESSIONS_PAR_PASSE = 10;

/** Douze mois civils après l'horloge (jour civil de Paris, ADR-011). */
export function finDuDelai(sansAbonnementDepuis: Date): Date {
  return ajouterMois(sansAbonnementDepuis, MOIS_SANS_ABONNEMENT);
}

const plusTard = (a: Date, b: Date) => (a.getTime() >= b.getTime() ? a : b);
const dans = (maintenant: Date, jours: number) => ajouterJours(maintenant, jours);
const FERME = { OR: [{ statut: null }, { statut: { notIn: [...OUVRENT] } }] };

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

type Bilan = { envoyes: number; echecs: number };

/** Envoie un message à tous les propriétaires ; rend le nombre d'e-mails partis et s'il y a eu un échec. */
async function ecrireAuxProprietaires(compteId: string, message: { subject: string; text: string }, contexte: string) {
  let partis = 0;
  let echec = false;
  try {
    for (const to of await adressesDesProprietaires(compteId)) {
      try {
        await sendMail({ to, ...message });
        partis++;
      } catch (e) {
        echec = true;
        console.error(`${contexte} non envoyé (compte ${compteId}) — ${motifErreur(e)}`);
      }
    }
  } catch (e) {
    echec = true;
    console.error(`${contexte} : propriétaires illisibles (compte ${compteId}) — ${motifErreur(e)}`);
  }
  return { partis, echec };
}

/**
 * Les deux avertissements. J-30 : la date de suppression se pose (douze mois
 * après l'horloge, au moins 30 jours plus tard). J-7 : sept jours avant, la
 * date repoussée d'autant si le rappel part en retard. Au plus une fois
 * chacun : la marque est posée avant l'envoi, rendue si rien n'est parti.
 */
export async function avertirAvantSuppression(maintenant: Date): Promise<Record<Avertissement, Bilan> & { horsService?: true }> {
  const bilan = { j30: { envoyes: 0, echecs: 0 }, j7: { envoyes: 0, echecs: 0 } };
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
    if (partis === 0 && echec) {
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
    select: { id: true, compteId: true, suppressionPrevueLe: true, sansAbonnementDepuis: true, debutPayantLe: true },
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
    if (partis === 0 && echec) {
      await prisma.abonnement
        .updateMany({ where: { id: l.id, avertiSuppression7Le: maintenant }, data: { avertiSuppression7Le: null, suppressionPrevueLe: avant } })
        .catch(() => {});
    }
  }
  return bilan;
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
const ECHUS = (maintenant: Date) => ({
  ...FERME,
  sansAbonnementDepuis: { not: null },
  avertiSuppression30Le: { not: null },
  avertiSuppression7Le: { not: null },
  suppressionPrevueLe: { lte: maintenant },
});

export type BilanSuppressions = { supprimes: number; reportes: number; fichiers: { liberes: number; echecs: number } };

/**
 * Supprime les comptes échus, au plus `SUPPRESSIONS_PAR_PASSE`. Sans Stripe
 * (abonnements désactivés), rien : on ne supprime pas un compte dont on ne
 * peut pas arrêter la facturation.
 */
export async function supprimerComptesEchus(maintenant: Date, stripe: Stripe | null): Promise<BilanSuppressions> {
  const bilan: BilanSuppressions = { supprimes: 0, reportes: 0, fichiers: { liberes: 0, echecs: 0 } };
  if (!stripe) return bilan;
  const echus = await prisma.abonnement.findMany({
    where: ECHUS(maintenant),
    select: { compteId: true, stripeCustomerId: true },
    orderBy: { suppressionPrevueLe: "asc" },
    take: SUPPRESSIONS_PAR_PASSE,
  });
  for (const { compteId, stripeCustomerId } of echus) {
    try {
      // Stripe fait foi, pas notre copie : un webhook perdu peut cacher un
      // réabonnement. Un abonnement ouvert chez Stripe : rien n'est résilié
      // ni effacé, la copie est relue (son horloge se vide) et le compte
      // attend. Sinon, ce qui pourrait encore facturer (pause, impayé, premier
      // paiement en attente) est résilié ; le client et ses factures restent.
      // Un paiement en cours sur Checkout ne doit pas aboutir pendant la
      // suppression : ses sessions ouvertes expirent d'abord.
      await expirerSessionsOuvertes(stripe, stripeCustomerId);
      const abonnements = await stripe.subscriptions
        .list({ customer: stripeCustomerId, status: "all", limit: 100 }, OPTIONS_WEBHOOK)
        .autoPagingToArray({ limit: 10_000 });
      if (abonnements.some((s) => OUVRENT.has(s.status))) {
        bilan.reportes++;
        const relue = await synchroniserClientStripe(stripe, stripeCustomerId).then(
          () => "copie relue",
          (e: unknown) => `copie NON relue — ${motifErreur(e)}`,
        );
        console.error(`suppression du compte ${compteId} annulée : un abonnement est ouvert chez Stripe (${relue})`);
        continue;
      }
      // Un premier paiement encore en traitement (prélèvement SEPA, 3D Secure
      // en cours) peut aboutir : on ne résilie pas, on attend qu'il devienne
      // actif (l'horloge se vide) ou expiré (la suppression suit).
      if (abonnements.some((s) => s.status === "incomplete")) {
        bilan.reportes++;
        console.error(`suppression du compte ${compteId} reportée : un premier paiement est en cours chez Stripe`);
        continue;
      }
      for (const s of abonnements) {
        if (s.status !== "canceled" && s.status !== "incomplete_expired") await stripe.subscriptions.cancel(s.id);
      }
    } catch (e) {
      bilan.reportes++;
      console.error(`suppression du compte ${compteId} reportée : Stripe — ${motifErreur(e)}`);
      continue;
    }
    try {
      const cles = await supprimerCompte(compteId, maintenant);
      if (cles === null) {
        bilan.reportes++;
        continue;
      }
      bilan.supprimes++;
      const f = await libererFichiers(cles, "comptes/suppression");
      bilan.fichiers.liberes += f.liberes;
      bilan.fichiers.echecs += f.echecs;
    } catch (e) {
      bilan.reportes++;
      console.error(`suppression du compte ${compteId} échouée — ${motifErreur(e)}`);
    }
  }
  return bilan;
}

/**
 * Efface un compte entier, dans une transaction, la ligne d'abonnement
 * verrouillée et la condition relue : un réabonnement de dernière minute
 * l'emporte (`null`). Rend les clés des fichiers à libérer APRÈS.
 */
export async function supprimerCompte(compteId: string, maintenant: Date): Promise<string[] | null> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Abonnement" WHERE "compteId" = ${compteId}::uuid FOR UPDATE`;
      const encore = await tx.abonnement.findFirst({ where: { compteId, ...ECHUS(maintenant) }, select: { id: true } });
      if (!encore) return null;

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
      // demande, une acceptation : sur un autre compte, la personne reste).
      for (const { userId } of membres) {
        const [ailleurs, signatures, liens, demandes, acceptations] = await Promise.all([
          tx.membre.count({ where: { userId } }),
          tx.signature.count({ where: { userId } }),
          tx.accessToken.count({ where: { createdByUserId: userId } }),
          tx.demandeAssistance.count({ where: { userId } }),
          tx.acceptationConditions.count({ where: { userId } }),
        ]);
        if (ailleurs + signatures + liens + demandes + acceptations === 0) await tx.user.delete({ where: { id: userId } });
      }
      return [...new Set([...cles, ...comptes.map((f) => f.cle)])];
    },
    { timeout: 60_000 },
  );
}
