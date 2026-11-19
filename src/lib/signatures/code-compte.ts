import "server-only";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import type { ObjetSignable, PartieSignataire, Prisma } from "@prisma/client";
import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import { exigerSignatureDEssai } from "@/lib/abonnements/validation";
import { prendreQuota, RefusQuota } from "@/lib/abonnements/quotas";
import { signatureDejaComptee } from "@/lib/plan-prevention/resignature";
import { envoyerMailCodeCompte } from "@/lib/access-tokens/mail";
import { rendreEnvoiOtp, reserverEnvoiOtp } from "@/lib/access-tokens/verify";
import { envoiEnService, motifErreur } from "@/lib/email";
import { formaterHeureFr } from "@/lib/dates";
import { ipClient } from "@/lib/securite/ip-client";
import {
  OTP_ESSAIS_MAX,
  OTP_LENGTH,
  generateOtp,
  hashOtp,
  otpEstExpire,
  otpExpirationDate,
  renvoiOtpAutorise,
  renvoiOtpPossibleLe,
  verifyOtp,
} from "./otp";
import { calculerHashObjet } from "./hash-objet";
import { verrouillerObjetSigne } from "./verrou-contenu";
import { objetEstSignable } from "./etat-signable";
import { validerSiCoSigne } from "./statut-objet";
import { envoyerAvisCoSignature } from "./avis-co-signature";
import { MESSAGE_PARTIE_DEJA_SIGNEE, estPartieDejaSignee, partiesAttendues } from "./parties";
import { libelleDocumentSignable } from "./libelle-document";

/**
 * La signature depuis le compte, confirmée par un code envoyé à l'adresse du
 * compte (2026-11-19, décision de la propriétaire, fenêtre « Signer et
 * envoyer » de la fiche du plan de prévention). En deux temps, comme la
 * signature par lien : le code part à la demande, puis la signature n'est
 * posée qu'avec le bon code. Méthode enregistrée : `compte_code_email`.
 *
 * **Module serveur, volontairement pas `"use server"`** : ses appelants sont
 * des actions qui ouvrent par `verifierSaisie` et désignent l'objet
 * (`plan-prevention/signature-fiche-actions.ts`). Chaque fonction refait
 * quand même la garde d'appartenance (`assertEtablissementDuCompte`).
 *
 * Les règles du code sont celles d'un lien (`otp.ts`) : empreinte seule,
 * 10 minutes, un nouveau code au plus par minute, cinq par heure et par
 * adresse (`reserverEnvoiOtp`, la même table que les liens), trois essais.
 * Une différence, dite : il n'y a pas de lien à révoquer, donc les trois
 * essais sont ceux d'UN code — épuisés, la ligne est effacée et un nouveau
 * code se demande, sous les deux plafonds d'envoi. Au plus quinze codes
 * éprouvés par heure, par une personne déjà connectée.
 */

type Objet = { etablissementId: string; objetType: ObjetSignable; objetId: string };

/** Le titulaire signe au nom de l'entreprise utilisatrice, toujours (`signerEnCompteConnecte`). */
function partieDuCompte(objetType: ObjetSignable): PartieSignataire | null {
  return partiesAttendues(objetType).includes("entreprise_utilisatrice") ? "entreprise_utilisatrice" : null;
}

export const MESSAGE_NON_SIGNABLE_COMPTE =
  "Ce document n'est pas à signer pour l'instant : il est clos, annulé, ou une modification proposée attend une réponse.";

export type EnvoiCodeCompte =
  | { ok: true; email: string; renvoiPossibleLe: string }
  | { ok: false; message: string };

/** Envoie un code de signature à l'adresse du compte connecté. */
export async function envoyerCodeSignatureCompte(o: Objet): Promise<EnvoiCodeCompte> {
  const { user, compte, db } = await assertEtablissementDuCompte(o.etablissementId);
  // Sans abonnement payé, la seule signature de test : refusée ici plutôt
  // qu'après un code envoyé pour rien.
  await exigerSignatureDEssai(db, compte.compteId, user.email);
  const email = user.email?.trim().toLowerCase();
  if (!email) return { ok: false, message: "Votre compte n'a pas d'adresse e-mail : aucun code ne peut partir." };
  if (!(await objetEstSignable(db, o.objetType, o.objetId, o.etablissementId))) {
    return { ok: false, message: MESSAGE_NON_SIGNABLE_COMPTE };
  }
  const partie = partieDuCompte(o.objetType);
  if (partie && (await partieDejaSignee(db, o, partie))) {
    return { ok: false, message: MESSAGE_PARTIE_DEJA_SIGNEE };
  }
  if (!envoiEnService()) {
    return { ok: false, message: "Aucun code n'a été envoyé : l'envoi d'e-mails n'est pas encore en service dans Rojer." };
  }

  const maintenant = new Date();
  const existant = await db.codeSignatureCompte.findFirst({
    where: { etablissementId: o.etablissementId, userId: user.id, objetType: o.objetType, objetId: o.objetId },
    select: { id: true, otpExpireLe: true },
  });
  const renvoi = renvoiOtpAutorise(existant?.otpExpireLe ?? null, maintenant);
  if (!renvoi.autorise) {
    return {
      ok: false,
      message: `Un code est déjà parti il y a moins d'une minute. Patientez ${renvoi.attendreSecondes} seconde${renvoi.attendreSecondes > 1 ? "s" : ""} avant d'en demander un autre.`,
    };
  }
  const reservation = await reserverEnvoiOtp(email, maintenant);
  if (!reservation.ok) {
    return {
      ok: false,
      message:
        `Cinq codes ont déjà été envoyés à votre adresse dans l'heure. ` +
        `Vous pourrez en demander un nouveau à ${formaterHeureFr(reservation.possibleLe)}.`,
    };
  }

  const otp = generateOtp();
  const otpExpireLe = otpExpirationDate(maintenant);
  const donnees = { email, otpHash: hashOtp(otp), otpExpireLe, essaisRestants: OTP_ESSAIS_MAX };
  // Conditionnelle, comme `renouvelerOtp` : deux demandes simultanées lisent
  // le même code, une seule le remplace.
  let pose: boolean;
  if (existant) {
    const r = await db.codeSignatureCompte.updateMany({
      where: { id: existant.id, etablissementId: o.etablissementId, otpExpireLe: existant.otpExpireLe },
      data: donnees,
    });
    pose = r.count === 1;
  } else {
    pose = await db.codeSignatureCompte
      .create({
        data: {
          id: `csc_${randomUUID()}`,
          etablissementId: o.etablissementId,
          userId: user.id,
          objetType: o.objetType,
          objetId: o.objetId,
          ...donnees,
        },
      })
      .then(
        () => true,
        // L'unicité (personne, objet) : une demande simultanée a créé la ligne.
        () => false,
      );
  }
  if (!pose) {
    await rendreEnvoiOtp(email);
    return { ok: false, message: "Un code est déjà parti il y a moins d'une minute. Patientez avant d'en demander un autre." };
  }

  const document = await libelleDocumentSignable(db, o.objetType, o.objetId, o.etablissementId).catch(() => null);
  try {
    await envoyerMailCodeCompte({ to: email, nom: user.name?.trim() || null, otp, document });
  } catch (erreur) {
    await rendreEnvoiOtp(email);
    console.error("[signatures] code de signature du compte non envoyé :", motifErreur(erreur));
    return { ok: false, message: "Le code n'a pas pu être envoyé. Patientez une minute, puis demandez-en un autre." };
  }
  return { ok: true, email, renvoiPossibleLe: (renvoiOtpPossibleLe(otpExpireLe) ?? maintenant).toISOString() };
}

async function partieDejaSignee(db: Prisma.TransactionClient, o: Objet, partie: PartieSignataire) {
  return (
    (await db.signature.count({
      where: { etablissementId: o.etablissementId, objetType: o.objetType, objetId: o.objetId, partie, active: true },
    })) > 0
  );
}

export type SignatureCompteCode =
  | { ok: true; signatureId: string }
  | { ok: false; message: string; codeAReDemander?: boolean };

/**
 * Pose la signature du compte connecté, si `code` est le bon. Le
 * consentement est requis et enregistré : le texte affiché, et l'heure
 * serveur de la réception (`Signature.consentementTexte` / `consentementLe`).
 */
export async function poserSignatureCompteAvecCode(
  o: Objet & { code: string; consentement: { texte: string } | null },
): Promise<SignatureCompteCode> {
  const { user, compte, db } = await assertEtablissementDuCompte(o.etablissementId);
  await exigerSignatureDEssai(db, compte.compteId, user.email);
  // Refusé côté serveur, avant tout essai : sans la case cochée, rien ne se signe.
  const texte = o.consentement?.texte.trim();
  if (!texte) {
    return { ok: false, message: "Cochez la case de confirmation pour signer." };
  }
  const code = o.code.replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
    return { ok: false, message: `Le code compte ${OTP_LENGTH} chiffres.` };
  }
  if (!(await objetEstSignable(db, o.objetType, o.objetId, o.etablissementId))) {
    return { ok: false, message: MESSAGE_NON_SIGNABLE_COMPTE };
  }

  const ligne = await db.codeSignatureCompte.findFirst({
    where: { etablissementId: o.etablissementId, userId: user.id, objetType: o.objetType, objetId: o.objetId },
    select: { id: true, otpHash: true, otpExpireLe: true },
  });
  if (!ligne) {
    return { ok: false, message: "Demandez d'abord votre code de signature.", codeAReDemander: true };
  }
  // Un code périmé ne consomme aucun essai.
  if (otpEstExpire(ligne.otpExpireLe, new Date())) {
    return { ok: false, message: "Ce code a expiré (validité 10 minutes). Demandez-en un nouveau.", codeAReDemander: true };
  }
  // L'essai se RÉSERVE avant la comparaison (`reserverEssaiOtp`) : une rafale
  // n'éprouve jamais plus de codes que le compteur n'en accorde.
  const reserve = await db.codeSignatureCompte.updateMany({
    where: { id: ligne.id, etablissementId: o.etablissementId, otpHash: ligne.otpHash, essaisRestants: { gt: 0 } },
    data: { essaisRestants: { decrement: 1 } },
  });
  if (reserve.count !== 1) {
    return { ok: false, message: "Ce code n'accepte plus d'essai. Demandez-en un nouveau.", codeAReDemander: true };
  }
  if (!verifyOtp(code, ligne.otpHash)) {
    const reste = await db.codeSignatureCompte.findFirst({
      where: { id: ligne.id, etablissementId: o.etablissementId },
      select: { essaisRestants: true },
    });
    const restants = Math.max(0, reste?.essaisRestants ?? 0);
    if (restants === 0) {
      await db.codeSignatureCompte.deleteMany({
        where: { id: ligne.id, etablissementId: o.etablissementId, essaisRestants: { lte: 0 } },
      });
      return {
        ok: false,
        message: `Les ${OTP_ESSAIS_MAX} essais de ce code sont épuisés. Demandez-en un nouveau.`,
        codeAReDemander: true,
      };
    }
    return { ok: false, message: `Code incorrect. Il vous reste ${restants} essai${restants > 1 ? "s" : ""}.` };
  }

  const hh = await headers();
  const ip = ipClient(hh);
  const ua = hh.get("user-agent");
  const partie = partieDuCompte(o.objetType);
  const maintenant = new Date();

  let resultat;
  try {
    resultat = await db.$transaction(async (tx) => {
      // Le verrou de l'objet, celui que prend `modifier*` : la signature porte
      // sur ce qu'une correction concurrente a écrit (`signerEnCompteConnecte`).
      await verrouillerObjetSigne(tx, o.objetType, o.objetId, o.etablissementId);
      if (!(await objetEstSignable(tx, o.objetType, o.objetId, o.etablissementId))) {
        return { ok: false as const, message: MESSAGE_NON_SIGNABLE_COMPTE };
      }
      // Le code se CONSOMME dans la transaction, sous condition : de deux
      // soumissions simultanées du bon code, une seule signe.
      const consomme = await tx.codeSignatureCompte.deleteMany({
        where: { id: ligne.id, etablissementId: o.etablissementId, otpHash: ligne.otpHash },
      });
      if (consomme.count !== 1) {
        return { ok: false as const, message: "Ce code vient de servir. Rechargez la page." };
      }
      const h = await calculerHashObjet(tx, o.objetType, o.objetId, o.etablissementId);
      if (!h.ok) return { ok: false as const, message: "Le document à signer ne se lit plus." };
      if (
        !(await signatureDejaComptee(tx, {
          etablissementId: o.etablissementId,
          objetType: o.objetType,
          objetId: o.objetId,
          partie,
          email: user.email,
        }))
      ) {
        await prendreQuota(tx, compte.compteId, "signaturesParAn");
      }
      const signature = await tx.signature.create({
        data: {
          id: `sig_${randomUUID()}`,
          etablissementId: o.etablissementId,
          objetType: o.objetType,
          objetId: o.objetId,
          partie,
          signataireNom: user.name?.trim() || user.email || "Utilisateur",
          signataireEmail: user.email ?? "",
          userId: user.id,
          hashDocument: h.hash,
          nomDocument: h.nomDocument,
          methode: "compte_code_email",
          active: true,
          ipAddress: ip,
          userAgent: ua?.slice(0, 500) ?? null,
          consentementTexte: texte.slice(0, 1000),
          consentementLe: maintenant,
        },
      });
      // « Corriger » une proposition se termine quand le dirigeant signe
      // (2026-11-19) : la marque « correction en cours » tombe avec lui.
      if (o.objetType === "plan_prevention") {
        await tx.propositionModificationPlan.updateMany({
          where: {
            etablissementId: o.etablissementId,
            planPreventionId: o.objetId,
            corrigeeLe: { not: null },
            finaliseeLe: null,
          },
          data: { finaliseeLe: maintenant },
        });
      }
      return { ok: true as const, signatureId: signature.id };
    });
  } catch (e) {
    if (estPartieDejaSignee(e)) return { ok: false, message: MESSAGE_PARTIE_DEJA_SIGNEE };
    if (e instanceof RefusQuota) return { ok: false, message: e.motif };
    throw e;
  }
  if (!resultat.ok) return resultat;
  const complet = await validerSiCoSigne(db, o.objetType, o.objetId, o.etablissementId);
  if (complet) after(() => envoyerAvisCoSignature(db, o.objetType, o.objetId, o.etablissementId));
  return { ok: true, signatureId: resultat.signatureId };
}
