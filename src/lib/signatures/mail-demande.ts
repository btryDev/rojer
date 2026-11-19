import type { Prisma } from "@prisma/client";
import { formaterJourDateLongueFr } from "@/lib/dates/jour-long";
import { libelleDocumentSignable } from "./libelle-document";

/**
 * Ce que dit le courriel d'un lien de signature (2026-11-19, reprise de la
 * forme des e-mails de GestBAT, décision de la propriétaire) : QUI demande la
 * signature — la raison sociale de l'entreprise du compte, que le message ne
 * nommait pas —, et pour un plan de prévention un encadré référence,
 * entreprise extérieure, lieux, période.
 *
 * **Ce module n'est volontairement pas `"use server"`** (voir
 * `./appartenance.ts`) : ses appelants ont établi le périmètre, et lisent avec
 * le client borné au compte.
 *
 * Tout est dérivé de l'objet, côté serveur, comme le libellé
 * (`./libelle-document.ts`) : le texte du courriel ne vient jamais du
 * navigateur. Le texte saisi (raison sociale, lieux) est réduit à une ligne et
 * borné, puis échappé par le gabarit (`@/lib/email/gabarit`).
 */

const LONGUEUR_VALEUR = 200;
const LONGUEUR_DEMANDEUR = 80;

function uneLigne(texte: string, max: number): string {
  // Aucun caractère de contrôle : `emissionSchema` les refuse (en-têtes).
  const plat = texte.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
  return plat.length > max ? `${plat.slice(0, max - 1)}…` : plat;
}

function numero(n: number): string {
  return `PP-${String(n).padStart(3, "0")}`;
}

export type ContexteDemande = {
  /** Le libellé du document (`libelleDocumentSignable`). */
  libelle: string;
  /** La raison sociale de l'entreprise du compte, si elle se lit. */
  demandeur: string | null;
  plan: {
    reference: string;
    entrepriseExterieure: string;
    lieux: string;
    dateDebut: Date;
    dateFin: Date;
  } | null;
};

export async function lireContexteDemande(
  /** Le client borné au compte de l'appelant (ADR-051). */
  db: Prisma.TransactionClient,
  objetType: string,
  objetId: string,
  etablissementId: string,
): Promise<ContexteDemande | null> {
  const [libelle, etablissement, plan] = await Promise.all([
    libelleDocumentSignable(db, objetType, objetId, etablissementId),
    // Au mieux : sans la raison sociale, le courriel part sans la nommer.
    Promise.resolve()
      .then(() =>
        db.etablissement.findFirst({
          where: { id: etablissementId },
          select: { entreprise: { select: { raisonSociale: true } } },
        }),
      )
      .catch(() => null),
    objetType === "plan_prevention"
      ? db.planPrevention.findFirst({
          where: { id: objetId, etablissementId },
          select: {
            numero: true,
            entrepriseExterieureRaison: true,
            lieux: true,
            dateDebut: true,
            dateFin: true,
          },
        })
      : null,
  ]);
  if (!libelle) return null;
  const raison = etablissement?.entreprise?.raisonSociale;
  return {
    libelle,
    demandeur: raison ? uneLigne(raison, LONGUEUR_DEMANDEUR) || null : null,
    plan: plan
      ? {
          reference: numero(plan.numero),
          entrepriseExterieure: uneLigne(plan.entrepriseExterieureRaison, LONGUEUR_VALEUR),
          lieux: uneLigne(plan.lieux, LONGUEUR_VALEUR),
          dateDebut: plan.dateDebut,
          dateFin: plan.dateFin,
        }
      : null,
  };
}

export type LigneEncadre = { libelle: string; valeur: string };

/** L'encadré du courriel : le plan en quatre lignes, sinon le nom du document. */
export function encadreDemande(c: ContexteDemande): LigneEncadre[] {
  if (!c.plan) return [{ libelle: "Document", valeur: c.libelle }];
  const lignes: LigneEncadre[] = [
    { libelle: "Référence", valeur: c.plan.reference },
    { libelle: "Entreprise extérieure", valeur: c.plan.entrepriseExterieure },
  ];
  if (c.plan.lieux) lignes.push({ libelle: "Lieux", valeur: c.plan.lieux });
  lignes.push({
    libelle: "Période",
    valeur: `du ${formaterJourDateLongueFr(c.plan.dateDebut)} au ${formaterJourDateLongueFr(c.plan.dateFin)}`,
  });
  return lignes;
}

/** Les champs de présentation qu'attend `emettreAccessToken`. */
export type PresentationLien = {
  sujetMail: string;
  titreMail: string;
  messageMail: string;
  encadreMail: LigneEncadre[];
  boutonMail: string;
};

const PHRASE_ENREGISTREMENT =
  "Rojer enregistrera votre signature avec son horodatage et l'empreinte " +
  "du document tel qu'il se présentait.";

/** E1 — le lien de signature. Aucun code : il part à la demande, depuis la page. */
export function presentationDemandeSignature(c: ContexteDemande): PresentationLien {
  // ~~« la même valeur probatoire qu'une signature manuscrite (art.
  // 1366-1367 du Code civil, règlement eIDAS niveau simple) »~~ — une
  // qualification (contre-lecture du 2026-09-26) : l'al. 2 de l'art. 1367
  // ne présume la fiabilité que « dans des conditions fixées par décret en
  // Conseil d'Etat ». Même texte que la page `/signe`.
  if (c.plan) {
    const invitation = c.demandeur
      ? `${c.demandeur} vous invite à signer le plan de prévention relatif à ` +
        `l'intervention de ${c.plan.entrepriseExterieure} sur son site.`
      : `Vous êtes invité(e) à signer le plan de prévention relatif à ` +
        `l'intervention de ${c.plan.entrepriseExterieure}.`;
    return {
      sujetMail: `Plan de prévention à signer — ${c.plan.reference}${c.demandeur ? ` (${c.demandeur})` : ""}`,
      titreMail: "Plan de prévention à signer",
      messageMail: [invitation, PHRASE_ENREGISTREMENT].join("\n\n"),
      encadreMail: encadreDemande(c),
      boutonMail: "Consulter et signer le plan",
    };
  }
  return {
    sujetMail: `Signature à apporter : ${c.libelle}`,
    titreMail: "Document à signer",
    messageMail: [
      c.demandeur
        ? `${c.demandeur} vous invite à signer électroniquement le document suivant.`
        : "Vous êtes invité(e) à signer électroniquement le document suivant.",
      PHRASE_ENREGISTREMENT,
    ].join("\n\n"),
    encadreMail: encadreDemande(c),
    boutonMail: "Consulter et signer",
  };
}

/**
 * E5, refus — l'avis de décision porte un NOUVEAU lien de signature : sans
 * lui, l'entreprise extérieure dont la proposition est refusée n'avait plus
 * de quoi signer le plan tel qu'il est (vu en préprod, 2026-11-19).
 */
export function presentationRefusAvecLien(c: ContexteDemande): PresentationLien {
  const plan = c.plan;
  const qui = c.demandeur ?? "Votre interlocuteur";
  return {
    sujetMail: `Proposition non retenue — ${plan?.reference ?? c.libelle}`,
    titreMail: "Proposition non retenue",
    messageMail: [
      `${qui} n'a pas retenu votre proposition de modification du document « ${c.libelle} » : le plan reste tel qu'il était.`,
      "Vous pouvez le relire et le signer depuis ce nouveau lien.",
    ].join("\n\n"),
    encadreMail: encadreDemande(c),
    boutonMail: plan ? "Consulter et signer le plan" : "Consulter et signer",
  };
}
