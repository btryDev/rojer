import "server-only";
import type { PartieSignataire } from "@prisma/client";
import { signatureDEssaiPermise } from "@/lib/abonnements/validation";
import { emettreAccessToken } from "@/lib/access-tokens/emission";
import type { Db } from "@/lib/auth/compte";
import { motifErreur } from "@/lib/email";
import { objetEstSignable } from "@/lib/signatures/etat-signable";
import { MESSAGE_PARTIE_DEJA_SIGNEE } from "@/lib/signatures/parties";
import { lireContexteDemande, presentationDemandeSignature } from "@/lib/signatures/mail-demande";

/**
 * Un lien de signature émis depuis la fiche du plan (2026-11-19) : après
 * « Signer et envoyer », par « Renvoyer le lien », par « Envoyer le lien ».
 * Le chemin d'émission ordinaire (`emettreAccessToken` : appartenance,
 * fréquence, plafonds, ancien lien de la partie révoqué APRÈS l'envoi), et la
 * règle de l'essai sans paiement lue SANS redirection — comme le lien émis
 * au refus d'une proposition (`emettreLienApresRefus`) : un refus se dit dans
 * la réponse, il n'interrompt pas une signature déjà posée.
 *
 * Ne lève pas : un échec revient en message, que la fiche affiche.
 */
export async function emettreLienDepuisLaFiche(
  db: Db,
  p: {
    compteId: string;
    emailDuCompte: string | null;
    etablissementId: string;
    planId: string;
    to: string;
    nom: string | null;
    partie: PartieSignataire;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    if (!(await objetEstSignable(db, "plan_prevention", p.planId, p.etablissementId))) {
      return {
        ok: false,
        message: "Le plan n'est pas à signer pour l'instant : il est clos, annulé, ou une proposition attend votre réponse.",
      };
    }
    const dejaSignee = await db.signature.count({
      where: { etablissementId: p.etablissementId, objetType: "plan_prevention", objetId: p.planId, partie: p.partie, active: true },
    });
    if (dejaSignee > 0) return { ok: false, message: MESSAGE_PARTIE_DEJA_SIGNEE };
    const to = p.to.trim().toLowerCase();
    if (!(await signatureDEssaiPermise(db, p.compteId, p.emailDuCompte, to))) {
      return {
        ok: false,
        message: "Sans abonnement payé, un lien de signature ne part qu'à votre propre adresse. Abonnez-vous pour l'envoyer.",
      };
    }
    const contexte = await lireContexteDemande(db, "plan_prevention", p.planId, p.etablissementId);
    if (!contexte) return { ok: false, message: "Ce plan n'existe plus." };
    // Le nom, sur une ligne et dans la borne de l'émission (120) : la fiche
    // en admet 200.
    const nom = p.nom?.replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 120) || undefined;
    const r = await emettreAccessToken({
      etablissementId: p.etablissementId,
      scope: "signature",
      objetType: "plan_prevention",
      objetId: p.planId,
      emailDestinataire: to,
      nomDestinataire: nom,
      partie: p.partie,
      ...presentationDemandeSignature(contexte),
    });
    return r.ok ? { ok: true } : { ok: false, message: r.message };
  } catch (e) {
    console.error("[plan-prevention] lien depuis la fiche non émis :", motifErreur(e));
    return { ok: false, message: "Le lien n'a pas pu être envoyé. Réessayez dans quelques minutes." };
  }
}
