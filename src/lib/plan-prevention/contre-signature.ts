import type { PartieSignataire, Prisma } from "@prisma/client";
import { revoquerLiensEnVol } from "@/lib/access-tokens/revocation";
import { envoiEnService, motifErreur, publicAppUrl, sendMail } from "@/lib/email";
import { ecrireAuxProprietaires } from "@/lib/abonnements/rappels";
import { libelleDocumentSignable } from "@/lib/signatures/libelle-document";
import { MOTIFS_REMISE_EN_CORRECTION } from "./resignature";

/**
 * Remettre un plan de prévention en correction (ADR-061 § 2) — UNE opération,
 * deux portes : l'entreprise extérieure propose une modification, ou le
 * dirigeant révoque les signatures pour corriger.
 *
 * **Ce module n'est volontairement pas `"use server"`** : ses appelants ont
 * établi le périmètre, et tiennent le verrou de l'objet
 * (`verrouillerObjetSigne`) dans leur transaction.
 *
 * Ce qui se passe, dans la transaction de l'appelant :
 * - les signatures ACTIVES sont révoquées, datées, avec le motif — jamais
 *   effacées : nom, adresse, IP, empreinte restent, et `/verifier` les montre
 *   « révoquées » ;
 * - un plan « valide » repasse « en attente de signatures » ;
 * - tous les liens encore ouverts sur le plan sont révoqués.
 * Ensuite, sans les signatures actives, le plan redevient modifiable
 * (`compterSignatures`), et tout le monde re-signe.
 */

export const MOTIF_REVOCATION_PLAN = {
  proposition: MOTIFS_REMISE_EN_CORRECTION[0],
  correction: MOTIFS_REMISE_EN_CORRECTION[1],
} as const;

export type SignatureRetiree = {
  signataireEmail: string;
  signataireNom: string;
  partie: PartieSignataire | null;
};

export async function retirerSignaturesDuPlan(
  /** La transaction de l'appelant, qui tient le verrou du plan. */
  tx: Prisma.TransactionClient,
  params: { etablissementId: string; planId: string; motif: string; maintenant?: Date },
): Promise<SignatureRetiree[]> {
  const { etablissementId, planId, motif } = params;
  const maintenant = params.maintenant ?? new Date();
  const actives = await tx.signature.findMany({
    where: { objetType: "plan_prevention", objetId: planId, etablissementId, active: true },
    select: { id: true, signataireEmail: true, signataireNom: true, partie: true },
  });
  if (actives.length > 0) {
    await tx.signature.updateMany({
      where: { id: { in: actives.map((s) => s.id) }, etablissementId, active: true },
      data: { active: null, revoqueLe: maintenant, revoqueMotif: motif },
    });
  }
  await tx.planPrevention.updateMany({
    where: { id: planId, etablissementId, statut: "valide" },
    data: { statut: "attente_signatures" },
  });
  await revoquerLiensEnVol(tx, {
    etablissementId,
    objetType: "plan_prevention",
    objetId: planId,
    motif: `${motif} ; un nouveau lien vous parviendra`,
  });
  return actives.map(({ signataireEmail, signataireNom, partie }) => ({
    signataireEmail,
    signataireNom,
    partie,
  }));
}

// ── Les e-mails (ADR-061 § 5) : au mieux, après la réponse ─────────────────

async function libelle(db: Prisma.TransactionClient, etablissementId: string, planId: string) {
  return (await libelleDocumentSignable(db, "plan_prevention", planId, etablissementId)) ?? "plan de prévention";
}

const PIED = ["", "— Rojer"];

/** Chaque signataire dont la signature tombe l'apprend. */
export async function avertirSignaturesRetirees(
  db: Prisma.TransactionClient,
  params: { etablissementId: string; planId: string; motif: string; retirees: SignatureRetiree[] },
): Promise<void> {
  try {
    if (!envoiEnService() || params.retirees.length === 0) return;
    const nom = await libelle(db, params.etablissementId, params.planId);
    const destinataires = [...new Set(params.retirees.map((s) => s.signataireEmail.trim().toLowerCase()))].filter((e) =>
      e.includes("@"),
    );
    const texte = [
      "Bonjour,",
      "",
      `Votre signature du document « ${nom} » est révoquée : ${params.motif}.`,
      "Elle reste enregistrée, avec sa date, et sa vérification la montre « révoquée ».",
      "Le plan sera de nouveau soumis à la signature de chaque partie.",
      ...PIED,
    ].join("\n");
    await Promise.all(
      destinataires.map((to) =>
        sendMail({ to, subject: `Signature révoquée : ${nom}`, text: texte }).catch((e: unknown) =>
          console.error("[plan-prevention] avis de révocation non envoyé :", motifErreur(e)),
        ),
      ),
    );
  } catch (e) {
    console.error("[plan-prevention] avis de révocation impossible :", motifErreur(e));
  }
}

/** Le dirigeant (les propriétaires du compte) apprend qu'une proposition l'attend. */
export async function avertirPropositionRecue(
  db: Prisma.TransactionClient,
  params: { compteId: string; etablissementId: string; planId: string; entreprise: string },
): Promise<void> {
  try {
    if (!envoiEnService()) return;
    const nom = await libelle(db, params.etablissementId, params.planId);
    const url = `${publicAppUrl()}/etablissements/${params.etablissementId}/plan-prevention/${params.planId}`;
    await ecrireAuxProprietaires(
      params.compteId,
      {
        subject: `Modification proposée : ${nom}`,
        text: [
          "Bonjour,",
          "",
          `${params.entreprise} propose une modification du document « ${nom} », au lieu de le signer.`,
          "Les signatures déjà posées sont révoquées. Acceptez, corrigez ou refusez la proposition depuis la fiche du plan :",
          url,
          ...PIED,
        ].join("\n"),
      },
      "[plan-prevention] avis de proposition",
    );
  } catch (e) {
    console.error("[plan-prevention] avis de proposition impossible :", motifErreur(e));
  }
}

/** L'entreprise extérieure apprend ce que le dirigeant a fait de sa proposition. */
export async function avertirDecision(
  db: Prisma.TransactionClient,
  params: { etablissementId: string; planId: string; to: string; acceptee: boolean },
): Promise<void> {
  try {
    if (!envoiEnService()) return;
    const nom = await libelle(db, params.etablissementId, params.planId);
    const texte = [
      "Bonjour,",
      "",
      params.acceptee
        ? `Votre proposition de modification du document « ${nom} » est acceptée.`
        : `Votre proposition de modification du document « ${nom} » n'est pas retenue.`,
      "Le plan vous sera de nouveau soumis pour signature par votre interlocuteur.",
      ...PIED,
    ].join("\n");
    await sendMail({
      to: params.to,
      subject: params.acceptee ? `Proposition acceptée : ${nom}` : `Proposition non retenue : ${nom}`,
      text: texte,
    });
  } catch (e) {
    console.error("[plan-prevention] avis de décision non envoyé :", motifErreur(e));
  }
}
