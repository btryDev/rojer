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
import { envoiEnService, motifErreur, publicAppUrl } from "@/lib/email";
import { ajouterJours, ajouterMois, debutDuJour, formaterDateLongueFr } from "@/lib/dates";
import { clesDesEtablissements } from "@/lib/suppression/fichiers";
import { getStorage } from "@/lib/storage";
import { OPTIONS_WEBHOOK } from "@/lib/stripe/client";
import { DUREE_PAGE_DE_PAIEMENT_S } from "@/lib/stripe/parcours";
import { synchroniserClientStripe, toutLister } from "@/lib/stripe/synchronisation";
import { HORS_ABONNEMENT_OUVERT, OUVRENT, TERMINES } from "./droits";
import { alerter, alerterUneFoisParJour } from "@/lib/alertes";
import { ecrireAuxMembres, ecrireAuxProprietaires } from "./rappels";
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
 * `fichiers`, les fichiers déposés (rapports, attestations), qui se
 * téléchargent un à un, la lecture restant ouverte — l'employeur doit garder
 * les rapports annexés au registre (R. 4323-25, R. 4323-26) ; `aPaye`,
 * l'export du dossier (ADR-053 § 15), qui les reprend.
 */
export type CeQuiSeGarde = { versionsDuerp: boolean; fichiers: boolean; aPaye: boolean };

/** Ce que tout e-mail de suppression rappelle (CLAUDE.md, règle 10). */
export const CONSERVATION_DUERP =
  "La conservation de votre document unique d'évaluation des risques (DUERP), quarante ans dans ses versions successives, reste à la charge de l'employeur (articles L. 4121-3-1 et R. 4121-4 du Code du travail).";

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
    garde.aPaye
      ? "Vos autres documents s'exportent depuis la page « Préparer un contrôle » de chaque établissement."
      : garde.fichiers
        ? "Les fichiers que vous avez déposés (rapports de vérification, attestations…) se téléchargent un à un depuis leur page, jusqu'à cette date."
        : null,
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
      ...(conserver.length > 0 ? conserver : ["Votre compte ne porte aucun document validé ni fichier déposé."]),
      CONSERVATION_DUERP,
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
      compte: { suppressionDemandeeLe: null }, // une demande (§ 8) a son propre e-mail et sa date
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
      compte: { suppressionDemandeeLe: null },
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
  const { partis } = await ecrireAuxMembres(compteId, messageAuxMembres(nom, suppressionLe), "avertissement J-7 aux membres");
  return partis;
}

async function ceQuiSeGarde(compteId: string, debutPayantLe: Date | null): Promise<CeQuiSeGarde> {
  const aPaye = debutPayantLe !== null;
  const [versions, fichiers] = await Promise.all([
    prisma.duerpVersion.count({ where: { duerp: { etablissement: { entreprise: { compteId } } } } }),
    // Qui a payé exporte son dossier, fichiers compris : rien à compter.
    aPaye ? 0 : prisma.fichierStocke.count({ where: { compteId } }),
  ]);
  return { versionsDuerp: versions > 0, fichiers: fichiers > 0, aPaye };
}

/** L'horloge au plus tard pour que la fin du délai tombe d'ici `jours` jours. */
function avantDelai(maintenant: Date, jours: number): Date {
  return ajouterMois(dans(maintenant, jours), -MOIS_SANS_ABONNEMENT);
}

function compter(b: Bilan, partis: number, echec: boolean) {
  if (partis > 0) b.envoyes++;
  if (echec) b.echecs++;
}

/**
 * Un paiement ouvert depuis moins que la vie d'une page Checkout retient la
 * suppression — plus dix minutes : la marque est écrite avant la création de
 * la page, dont Stripe compte l'expiration sur sa propre horloge (relecture du
 * 2026-11-17).
 */
const PAIEMENT_EN_COURS_MS = (DUREE_PAGE_DE_PAIEMENT_S + 10 * 60) * 1000;
export const paiementEnCours = (ouvertLe: Date | null, maintenant: Date) =>
  ouvertLe != null && ouvertLe.getTime() > maintenant.getTime() - PAIEMENT_EN_COURS_MS;

/** Les comptes à supprimer aujourd'hui : date atteinte, les deux avertissements partis. */
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
  for (const { compteId, motif, demandeeLe, stripeCustomerId, debutPayantLe, paiementOuvertLe } of await comptesASupprimer(maintenant, stripe)) {
    // Sans Stripe, un compte qui a un client Stripe attend : on ne supprime
    // pas un compte dont on ne peut pas arrêter la facturation — signalé, la
    // date a été annoncée (relecture du 2026-11-18).
    if (!stripe && stripeCustomerId) {
      bilan.reportes++;
      await signalerLeReport(compteId, "abonnements désactivés : impossible d'arrêter la facturation chez Stripe", maintenant);
      continue;
    }
    // Une demande annulée depuis la sélection : rien chez Stripe, rien ne
    // se défait (relecture du 2026-11-18) ; relue sous le verrou, plus bas.
    if (motif === "demande" && !(await demandeToujoursEchue(compteId, maintenant))) {
      bilan.reportes++;
      continue;
    }
    // Une page de paiement ouverte retient la suppression AVANT tout geste
    // chez Stripe : résilier et annuler les factures ne se défont pas, et le
    // compte qui s'abonne garderait sinon son impayé effacé (relecture du
    // 2026-11-18). Relu sous le verrou, plus bas, pour la page ouverte entre-temps.
    if (paiementEnCours(paiementOuvertLe, maintenant)) {
      bilan.reportes++;
      continue;
    }
    // Le client Stripe existe-t-il encore (supprimé au tableau de bord : rien
    // à y fermer ni à y effacer) ?
    let clientChezStripe = stripeCustomerId !== null;
    // Un compte qui n'a jamais quitté l'essai (compté chez Rojer, ADR-053 § 9
    // amendé le 2026-11-16) n'a pas de client Stripe : rien à y arrêter.
    if (stripe && stripeCustomerId) try {
      // Stripe fait foi, pas notre copie : un webhook perdu peut cacher un
      // réabonnement. Un abonnement ouvert chez Stripe : rien n'est résilié
      // ni effacé, la copie est relue (son horloge se vide) et le compte
      // attend. Sinon, ce qui pourrait encore facturer (un impayé) est
      // résilié, et ce qui resterait payable fermé (`fermerLesFactures`).
      // Un paiement ouvert retient la suppression (`paiementEnCours`, relu
      // sous le verrou de la ligne, plus bas) : rien
      // à demander à Stripe sur ses pages de paiement.
      let abonnements: Stripe.Subscription[];
      try {
        // Une liste tronquée n'est pas un état complet : `toutLister` le refuse.
        abonnements = await toutLister(stripe.subscriptions.list({ customer: stripeCustomerId, status: "all", limit: 100 }, OPTIONS_WEBHOOK), 1000);
      } catch (e) {
        if (!introuvable(e)) throw e;
        if (!(await clientSupprime(stripe, stripeCustomerId))) {
          // Introuvable sans être supprimé : mauvaise clé (test en production,
          // autre compte Stripe) — le compte attend, signalé chaque jour.
          throw new Error(
            `client Stripe ${stripeCustomerId} introuvable sans être supprimé : vérifier la clé Stripe de l'application (mode, compte) ; rien n'est effacé tant que Stripe ne dit pas le client supprimé`,
          );
        }
        console.error(`suppression du compte ${compteId} : client Stripe ${stripeCustomerId} supprimé, rien à résilier`);
        abonnements = [];
        clientChezStripe = false;
      }
      // Premier paiement encore en traitement (`incomplete`, que Stripe rend
      // actif ou expire sous 23 heures) : le compte attend. Ouvert, pour un
      // compte sans abonnement : notre copie retardait — le compte attend
      // aussi. Ouvert pour une demande (§ 8) : c'est l'abonnement qui court
      // encore, résilié ci-dessous — sauf s'il est né APRÈS la demande (un
      // « S'abonner » passé au même instant) : celui-là, quelqu'un vient de
      // le payer, le compte attend et c'est signalé.
      const neApresLaDemande = (s: Stripe.Subscription) => demandeeLe !== null && s.created * 1000 > demandeeLe.getTime();
      if (motif === "demande" && abonnements.some((s) => OUVRENT.has(s.status) && neApresLaDemande(s))) {
        bilan.reportes++;
        await signalerLeReport(compteId, "un abonnement a été souscrit après la demande de suppression : le résilier ou retirer la demande, à la main", maintenant);
        continue;
      }
      if (abonnements.some((s) => s.status === "incomplete" || (motif === "sans_abonnement" && OUVRENT.has(s.status)))) {
        bilan.reportes++;
        await reporter(compteId, maintenant);
        const relue = await synchroniserClientStripe(stripe, stripeCustomerId).then(
          () => "copie relue",
          (e: unknown) => `copie NON relue — ${motifErreur(e)}`,
        );
        console.error(`suppression du compte ${compteId} annulée : un abonnement est ouvert chez Stripe (${relue})`);
        continue;
      }
      for (const s of abonnements) {
        if (!TERMINES.has(s.status)) await stripe.subscriptions.cancel(s.id);
      }
      if (clientChezStripe) await fermerLesFactures(stripe, stripeCustomerId);
    } catch (e) {
      bilan.reportes++;
      await reporter(compteId, maintenant);
      await signalerLeReport(compteId, `Stripe — ${motifErreur(e)}`, maintenant);
      continue;
    }
    try {
      const cles = await supprimerCompte(compteId, maintenant, motif);
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
      await signalerLeReport(compteId, `base — ${motifErreur(e)}`, maintenant);
      continue;
    }
    // Un client qui n'a jamais payé n'a rien à garder chez Stripe : aucune
    // facture à conserver pour la comptabilité (RGPD, relecture du 2026-11-17).
    // Notre copie (`debutPayantLe`) ne fait qu'écarter d'emblée qui a payé ;
    // la liste des factures, chez Stripe, décide.
    if (stripe && clientChezStripe && stripeCustomerId && !debutPayantLe) await effacerLeClientSansFacture(stripe, compteId, stripeCustomerId);
  }
  return bilan;
}

export type MotifDeSuppression = "sans_abonnement" | "demande";

/** Le délai entre la demande d'un propriétaire et l'effacement (ADR-058 § 8). */
export const JOURS_AVANT_EFFACEMENT = 7;

/**
 * Le jour d'effacement d'une demande faite le `demandeeLe` : le septième jour
 * civil après (minuit, Paris) — la tâche du matin de ce jour-là l'efface,
 * quelle que soit l'heure de la demande. C'est la date dite partout.
 */
export function effacementDeLaDemande(demandeeLe: Date): Date {
  return ajouterJours(debutDuJour(demandeeLe), JOURS_AVANT_EFFACEMENT);
}

/** Échue : le jour d'effacement est aujourd'hui, ou passé. */
const DEMANDE_ECHUE = (maintenant: Date) => ({
  suppressionDemandeeLe: { lt: ajouterJours(debutDuJour(maintenant), 1 - JOURS_AVANT_EFFACEMENT) },
});

async function demandeToujoursEchue(compteId: string, maintenant: Date): Promise<boolean> {
  return (await prisma.compte.count({ where: { id: compteId, ...DEMANDE_ECHUE(maintenant) } })) === 1;
}

type Candidat = {
  compteId: string;
  motif: MotifDeSuppression;
  /** La demande (§ 8), pour reconnaître un abonnement né après elle. */
  demandeeLe: Date | null;
  stripeCustomerId: string | null;
  debutPayantLe: Date | null;
  paiementOuvertLe: Date | null;
};

/**
 * Les comptes à effacer à cette passe : les demandes échues (§ 8), puis les
 * comptes sans abonnement (§ 4), chacun `SUPPRESSIONS_PAR_PASSE` au plus —
 * des demandes bloquées ne retiennent pas les autres comptes (relecture du
 * 2026-11-18). Sans Stripe (abonnements désactivés), pas de compte sans
 * abonnement : l'offre n'est pas lancée.
 */
async function comptesASupprimer(maintenant: Date, stripe: Stripe | null): Promise<Candidat[]> {
  const [demandes, echus] = await Promise.all([
    prisma.compte.findMany({
      where: DEMANDE_ECHUE(maintenant),
      select: {
        id: true,
        suppressionDemandeeLe: true,
        abonnement: { select: { stripeCustomerId: true, debutPayantLe: true, paiementOuvertLe: true } },
      },
      orderBy: { suppressionDemandeeLe: "asc" },
      take: SUPPRESSIONS_PAR_PASSE,
    }),
    stripe
      ? prisma.abonnement.findMany({
          where: { ...ECHUS(maintenant), compte: { suppressionDemandeeLe: null } },
          select: { compteId: true, stripeCustomerId: true, debutPayantLe: true, paiementOuvertLe: true },
          orderBy: { suppressionPrevueLe: "asc" },
          take: SUPPRESSIONS_PAR_PASSE,
        })
      : [],
  ]);
  return [
    ...demandes.map((c) => ({
      compteId: c.id,
      motif: "demande" as const,
      demandeeLe: c.suppressionDemandeeLe,
      stripeCustomerId: c.abonnement?.stripeCustomerId ?? null,
      debutPayantLe: c.abonnement?.debutPayantLe ?? null,
      paiementOuvertLe: c.abonnement?.paiementOuvertLe ?? null,
    })),
    ...echus.map((e) => ({ ...e, motif: "sans_abonnement" as const, demandeeLe: null })),
  ];
}

/**
 * Un compte annoncé « supprimé le … » qui reste en base se signale : sans
 * cela, l'échec n'allait qu'au journal, et la tâche du jour se disait réussie
 * (relecture du 2026-11-17). Une fois par jour et par compte.
 */
async function signalerLeReport(compteId: string, motif: string, maintenant: Date) {
  await alerterUneFoisParJour(`suppression:${compteId}`, "suppression d'un compte reportée", [
    `compte ${compteId}`,
    motif,
    "Le compte reste en base ; la suppression est retentée à la passe suivante.",
  ], maintenant);
}

/**
 * Ce qui resterait payable chez Stripe, fermé avant l'effacement : les
 * factures ouvertes annulées (une facture annulée ne se paie plus, son lien
 * hébergé non plus), les brouillons supprimés. Sans quoi un ancien client
 * pouvait régler un impayé après la suppression de son compte, et l'argent
 * restait sans que personne le sache (relecture du 2026-11-17). Une facture
 * payée entre la liste et l'annulation fait échouer celle-ci : le compte
 * attend la passe suivante, et Stripe y sera relu.
 */
async function fermerLesFactures(stripe: Stripe, customer: string) {
  // « Irrécouvrable » se paie encore par son lien (relances de Stripe) : annulée aussi.
  for (const status of ["open", "uncollectible", "draft"] as const) {
    for (const f of await toutLister(stripe.invoices.list({ customer, status, limit: 100 }, OPTIONS_WEBHOOK), 1000)) {
      if (f.id) await (status === "draft" ? stripe.invoices.del(f.id) : stripe.invoices.voidInvoice(f.id));
    }
  }
}

/**
 * Après l'effacement d'un compte qui n'a jamais payé : son client Stripe (né
 * d'un « S'abonner » abandonné) porte une adresse et l'identifiant du compte,
 * sans facture à garder — il est supprimé. Une facture, même annulée, le
 * garde (pièce comptable). Un échec se signale : le compte, lui, est déjà
 * effacé.
 */
async function effacerLeClientSansFacture(stripe: Stripe, compteId: string, customer: string) {
  try {
    const factures = await stripe.invoices.list({ customer, limit: 1 }, OPTIONS_WEBHOOK);
    if (factures.data.length > 0) return;
    await stripe.customers.del(customer);
  } catch (e) {
    await alerter("client Stripe d'un compte supprimé à effacer à la main", [
      `ancien compte ${compteId}, client ${customer}`,
      `Il n'a jamais payé : rien à garder chez Stripe. Échec : ${motifErreur(e)}`,
    ]);
  }
}

/**
 * Efface un compte entier, dans une transaction, la ligne d'abonnement
 * verrouillée et la condition relue : un réabonnement de dernière minute
 * l'emporte (`null`), comme une page de paiement encore ouverte
 * (`paiementEnCours` : `paiementOuvertLe`, écrit par « S'abonner » avant
 * Checkout, plus la vie de la page et une marge) — sans aucun appel à Stripe
 * sous le verrou. Garde la trace du compte (`CompteSupprime`, cinq ans)
 * et note ses fichiers dans la file des fichiers à libérer, dans la même
 * transaction : l'effacement ne peut pas réussir sans elles. Rend les clés.
 */
export async function supprimerCompte(
  compteId: string,
  maintenant: Date,
  motif: MotifDeSuppression = "sans_abonnement",
): Promise<string[] | null> {
  return prisma.$transaction(
    async (tx) => {
      // Le compte, puis sa ligne d'abonnement : une demande annulée, un
      // réabonnement ou un paiement ouvert de dernière minute attendent la
      // fin de la transaction, et la condition relue l'emporte.
      await tx.$queryRaw`SELECT "id" FROM "Compte" WHERE "id" = ${compteId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Abonnement" WHERE "compteId" = ${compteId}::uuid FOR UPDATE`;
      const compte = await tx.compte.findFirst({
        where: motif === "demande" ? { id: compteId, ...DEMANDE_ECHUE(maintenant) } : { id: compteId, suppressionDemandeeLe: null },
        select: { name: true, suppressionDemandeePar: true },
      });
      if (!compte) return null;
      const ligne = await tx.abonnement.findFirst({
        where: motif === "demande" ? { compteId } : { compteId, ...ECHUS(maintenant) },
        select: { paiementOuvertLe: true, sansAbonnementDepuis: true, avertiSuppression30Le: true, avertiSuppression7Le: true },
      });
      if (motif === "sans_abonnement" && !ligne) return null;
      if (paiementEnCours(ligne?.paiementOuvertLe ?? null, maintenant)) return null;
      const encore = { compte, ...ligne };

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
          sansAbonnementDepuis: encore.sansAbonnementDepuis ?? null,
          avertiSuppression30Le: encore.avertiSuppression30Le ?? null,
          avertiSuppression7Le: encore.avertiSuppression7Le ?? null,
          supprimeLe: maintenant,
          conserverJusquAu: ajouterMois(maintenant, MOIS_DE_CONSERVATION_DE_LA_TRACE),
          motif,
          demandeePar: motif === "demande" ? encore.compte.suppressionDemandeePar : null,
        },
      });

      // Les versions de DUERP ne suivent aucune cascade, exprès (elles
      // bloquent la suppression d'une entreprise par son dirigeant) : la fin
      // du service les efface, l'employeur les a reçues par l'export (ADR-058).
      await tx.duerpVersion.deleteMany({ where: { duerp: { etablissement: { entreprise: { compteId } } } } });
      await tx.entreprise.deleteMany({ where: { compteId } });
      await tx.demandeAssistance.deleteMany({ where: { compteId } });
      await tx.acceptationConditions.deleteMany({ where: { compteId } });
      await tx.abonnement.deleteMany({ where: { compteId } });

      const membres = await tx.membre.findMany({ where: { compteId }, select: { userId: true } });
      // Les personnes verrouillées avant de compter leurs attaches : une
      // invitation acceptée ailleurs, ou un compte créé, au même instant
      // (l'insertion d'un `Membre` prend un verrou partagé sur la personne)
      // attend la fin de la transaction, au lieu d'être emportée par la
      // cascade de `Membre.user` (relecture du 2026-11-17).
      if (membres.length > 0) {
        const ids = membres.map((m) => m.userId);
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ANY(${ids}::uuid[]) FOR UPDATE`;
      }
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
