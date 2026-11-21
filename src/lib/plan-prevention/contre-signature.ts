import type { PartieSignataire, Prisma } from "@prisma/client";
import { revoquerLiensEnVol } from "@/lib/access-tokens/revocation";
import { envoiEnService, motifErreur, publicAppUrl, sendMail } from "@/lib/email";
import { mailSignature } from "@/lib/email/gabarit";
import { ecrireAuxProprietaires } from "@/lib/abonnements/rappels";
import { signatureDEssaiPermise } from "@/lib/abonnements/validation";
import { emettreAccessToken } from "@/lib/access-tokens/emission";
import type { Db } from "@/lib/auth/compte";
import { objetEstSignable } from "@/lib/signatures/etat-signable";
import { libelleDocumentSignable } from "@/lib/signatures/libelle-document";
import { lireContexteDemande, presentationRefusAvecLien } from "@/lib/signatures/mail-demande";

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
 *   effacées : nom, adresse, IP, empreinte restent, et l'historique de la
 *   fiche les montre « révoquées », vérifiables (`VerifierSignature`) ;
 * - un plan « valide » repasse « en attente de signatures » ;
 * - tous les liens encore ouverts sur le plan sont révoqués.
 * Ensuite, sans les signatures actives, le plan redevient modifiable
 * (`compterSignatures`), et tout le monde re-signe.
 */

export const MOTIF_REVOCATION_PLAN = {
  proposition: "l'entreprise extérieure a proposé une modification du plan",
  correction: "l'entreprise utilisatrice corrige le plan",
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
    motif: `${motif} ; demandez un nouveau lien à votre interlocuteur`,
  });
  return actives.map(({ signataireEmail, signataireNom, partie }) => ({
    signataireEmail,
    signataireNom,
    partie,
  }));
}

// ── Les e-mails (ADR-061 § 5) : au mieux, après la réponse ─────────────────
//
// [2026-11-19] En HTML de marque, avec leur texte à côté (`mailSignature`,
// reprise de la forme des e-mails de GestBAT, décision de la propriétaire).

async function libelle(db: Prisma.TransactionClient, etablissementId: string, planId: string) {
  return (await libelleDocumentSignable(db, "plan_prevention", planId, etablissementId)) ?? "plan de prévention";
}

/**
 * Chaque signataire dont la signature tombe l'apprend — sauf celui qui a fait
 * le geste (`auteurEmail`, 2026-11-19) : le dirigeant qui révoque, ou qui
 * accepte une proposition, n'a pas à apprendre ce qu'il vient de faire.
 */
export async function avertirSignaturesRetirees(
  db: Prisma.TransactionClient,
  params: {
    etablissementId: string;
    planId: string;
    motif: string;
    retirees: SignatureRetiree[];
    /** L'adresse de qui a fait le geste : aucun avis ne lui part. */
    auteurEmail?: string | null;
  },
): Promise<void> {
  try {
    if (!envoiEnService() || params.retirees.length === 0) return;
    const auteur = params.auteurEmail?.trim().toLowerCase() ?? null;
    const destinataires = [...new Set(params.retirees.map((s) => s.signataireEmail.trim().toLowerCase()))].filter(
      (e) => e.includes("@") && e !== auteur,
    );
    if (destinataires.length === 0) return;
    const nom = await libelle(db, params.etablissementId, params.planId);
    const message = mailSignature({
      titre: "Signature révoquée",
      paragraphes: [`Votre signature du document « ${nom} » est révoquée : ${params.motif}.`],
      suite: [
        "Elle reste enregistrée, avec sa date, et sa vérification la montre « révoquée ».",
        "Une fois le plan corrigé, votre interlocuteur peut vous le soumettre de nouveau.",
      ],
      apres: [],
    });
    await Promise.all(
      destinataires.map((to) =>
        sendMail({ to, subject: `Signature révoquée : ${nom}`, ...message }).catch((e: unknown) =>
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
    const message = mailSignature({
      titre: "Modifications proposées",
      paragraphes: [`${params.entreprise} propose une modification du document « ${nom} », au lieu de le signer.`],
      suite: [
        "Le plan ne se signe pas tant que vous n'avez pas décidé.",
        "Depuis la fiche du plan, acceptez la proposition (les signatures déjà " +
          "posées sont alors révoquées), corrigez-la ou refusez-la.",
      ],
      bouton: { libelle: "Voir les modifications proposées", url },
      apres: [],
    });
    await ecrireAuxProprietaires(
      params.compteId,
      { subject: `Modifications proposées : ${nom}`, ...message },
      "[plan-prevention] avis de proposition",
    );
  } catch (e) {
    console.error("[plan-prevention] avis de proposition impossible :", motifErreur(e));
  }
}

/**
 * Ce qu'il advient du nouveau lien d'un refus : parti (l'avis de décision
 * EST son courriel), en échec (plafond, fréquence, envoi), ou inutile (plan
 * clos ou annulé, partie déjà signée).
 */
export type IssueNouveauLien = "parti" | "echec" | "inutile";

/**
 * Au refus d'une proposition (ADR-061 § 4), un NOUVEAU lien de signature pour
 * l'entreprise extérieure, à l'adresse de qui a proposé — et son courriel est
 * l'avis de décision (`presentationRefusAvecLien`) : un seul message, qui dit
 * le refus et porte de quoi signer le plan tel qu'il est. Vu en préprod le
 * 2026-11-19 : sans lui, l'auteur n'avait plus de lien.
 *
 * Par le chemin d'émission ordinaire (`emettreAccessToken`) : appartenance,
 * fréquence, plafonds de la formule ; et la règle de l'essai sans paiement
 * (un lien seulement à soi-même), lue sans redirection. À appeler APRÈS la
 * transaction du refus, par l'utilisateur connecté qui refuse. Ne lève
 * jamais : un échec n'annule pas le refus, il fait partir l'avis sans lien.
 */
export async function emettreLienApresRefus(
  db: Db,
  params: {
    compteId: string;
    /** L'adresse du compte qui refuse (règle de l'essai). */
    emailDuCompte: string | null;
    etablissementId: string;
    planId: string;
    to: string;
    nom: string | null;
  },
): Promise<IssueNouveauLien> {
  const { etablissementId, planId } = params;
  try {
    if (!(await objetEstSignable(db, "plan_prevention", planId, etablissementId))) return "inutile";
    const dejaSignee = await db.signature.count({
      where: {
        etablissementId,
        objetType: "plan_prevention",
        objetId: planId,
        partie: "entreprise_exterieure",
        active: true,
      },
    });
    if (dejaSignee > 0) return "inutile";
    if (!(await signatureDEssaiPermise(db, params.compteId, params.emailDuCompte, params.to))) return "echec";
    const contexte = await lireContexteDemande(db, "plan_prevention", planId, etablissementId);
    if (!contexte) return "inutile";
    const r = await emettreAccessToken({
      etablissementId,
      scope: "signature",
      objetType: "plan_prevention",
      objetId: planId,
      emailDestinataire: params.to,
      nomDestinataire: params.nom ?? undefined,
      partie: "entreprise_exterieure",
      ...presentationRefusAvecLien(contexte),
    });
    if (!r.ok) {
      console.error(`[plan-prevention] nouveau lien après refus non émis : ${r.raison}`);
      return "echec";
    }
    return "parti";
  } catch (e) {
    console.error("[plan-prevention] nouveau lien après refus impossible :", motifErreur(e));
    return "echec";
  }
}

/**
 * L'entreprise extérieure apprend ce que le dirigeant a fait de sa
 * proposition. Au refus, quand le nouveau lien est parti, son courriel a
 * tenu lieu d'avis : celui-ci ne part pas (`emettreLienApresRefus`).
 */
export async function avertirDecision(
  db: Prisma.TransactionClient,
  params: {
    etablissementId: string;
    planId: string;
    to: string;
    acceptee: boolean;
    /** Au refus : ce qu'il est advenu du nouveau lien. */
    nouveauLien?: IssueNouveauLien;
    /** Refus d'office : le plan a été clos ou annulé (`fermerPropositionEnAttente`). */
    planFerme?: boolean;
  },
): Promise<void> {
  try {
    if (!envoiEnService()) return;
    if (!params.acceptee && params.nouveauLien === "parti") return;
    const nom = await libelle(db, params.etablissementId, params.planId);
    const message = mailSignature({
      titre: params.acceptee ? "Proposition acceptée" : "Proposition non retenue",
      paragraphes: [
        params.acceptee
          ? `Votre proposition de modification du document « ${nom} » est acceptée.`
          : params.planFerme
            ? `Votre proposition de modification du document « ${nom} » n'est pas retenue : votre interlocuteur a clos ce plan.`
            : `Votre proposition de modification du document « ${nom} » n'est pas retenue : le plan reste tel qu'il était.`,
      ],
      suite: [
        params.planFerme
          ? "Ce plan ne se signe plus. Pour toute question, adressez-vous à votre interlocuteur."
          : !params.acceptee && params.nouveauLien === "echec"
            ? // Le nouveau lien n'est pas parti, mais la proposition n'a consommé
              // ni révoqué le lien d'origine : il permet encore de signer s'il est valable.
              "Pour le signer, reprenez le lien reçu précédemment ; s'il n'est plus valable, " +
              "demandez-en un nouveau à votre interlocuteur."
            : "Votre interlocuteur peut ensuite vous soumettre de nouveau le plan à signer.",
      ],
      apres: [],
    });
    await sendMail({
      to: params.to,
      subject: params.acceptee ? `Proposition acceptée : ${nom}` : `Proposition non retenue : ${nom}`,
      ...message,
    });
  } catch (e) {
    console.error("[plan-prevention] avis de décision non envoyé :", motifErreur(e));
  }
}
