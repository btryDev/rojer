import type { ObjetSignable, PartieSignataire, Prisma } from "@prisma/client";
import { envoiEnService, motifErreur, sendMail } from "@/lib/email";
import { mailSignature } from "@/lib/email/gabarit";
import { formaterHeureFr } from "@/lib/dates";
import { formaterJourDateLongueFr } from "@/lib/dates/jour-long";
import { libelleDocumentSignable } from "./libelle-document";
import { pieceJointePlanPrevention } from "@/lib/pdf/piece-jointe-plan-prevention";

/**
 * L'avis de fin de signature (2026-11-19) : quand toutes les parties d'un
 * acte co-signé (plan de prévention, permis de feu) ont signé, chaque
 * signataire reçoit un courriel avec l'empreinte SHA-256 du document et,
 * pour un plan, le PDF en pièce jointe. ~~l'adresse publique qui vérifie SA
 * signature (`/verifier/[signatureId]`)~~ [2026-11-21, ADR-006 amendée : plus
 * de page publique de vérification ; la preuve transmise est le PDF avec les
 * empreintes.]
 *
 * Pourquoi : jusqu'ici aucune partie ne recevait rien, et la preuve ne vivait
 * que chez Rojer. Une empreinte tenue par chaque partie fait sortir la preuve
 * de l'auto-attestation : Rojer ne pourrait plus changer le document sans
 * que la vérification le dise à quelqu'un qui garde l'empreinte d'origine.
 *
 * ~~Une liste de toutes les signatures, avec chaque empreinte et chaque lien,
 * envoyée à l'identique à chacun~~ [2026-11-19, reprise de la forme GestBAT,
 * décision de la propriétaire : un message par destinataire — le document, la
 * date où il est signé par tous, UNE empreinte, le lien « Vérifier » de sa
 * seule signature ; rien sur l'adresse de l'autre partie.]
 *
 * Au mieux : appelée APRÈS la signature écrite et l'acte validé, et après la
 * réponse (`after`, côté appelant), elle ne lève jamais — un envoi qui échoue
 * se journalise et ne défait rien.
 *
 * **Ce module n'est volontairement pas `"use server"`** (voir
 * `./appartenance.ts`) : ses appelants ont établi le périmètre.
 */

const LIBELLE_PARTIE: Record<"plan_prevention" | "permis_feu", Record<PartieSignataire, string>> = {
  plan_prevention: {
    entreprise_utilisatrice: "entreprise utilisatrice",
    entreprise_exterieure: "entreprise extérieure",
  },
  permis_feu: {
    entreprise_utilisatrice: "donneur d'ordre",
    entreprise_exterieure: "prestataire",
  },
};

const TITRE: Record<"plan_prevention" | "permis_feu", string> = {
  plan_prevention: "Plan de prévention signé",
  permis_feu: "Permis de feu signé",
};

/**
 * Le libellé de GestBAT (2026-11-19), sans « la CPAM ou la médecine du
 * travail », qu'aucune lecture de Rojer ne source. Pour le plan de prévention
 * seulement : le permis de feu n'a pas reçu de décision.
 */
const CONSERVATION_PLAN =
  "Conservez ce document pendant toute la durée de l'opération et au moins " +
  "5 ans : il peut être demandé par l'inspection du travail.";

function quand(d: Date): string {
  return `${formaterJourDateLongueFr(d)} à ${formaterHeureFr(d)} (heure de Paris)`;
}

export async function envoyerAvisCoSignature(
  /** Le client borné au compte de l'appelant ou du jeton (ADR-051). */
  db: Prisma.TransactionClient,
  objetType: ObjetSignable,
  objetId: string,
  etablissementId: string,
): Promise<void> {
  if (objetType !== "plan_prevention" && objetType !== "permis_feu") return;
  try {
    if (!envoiEnService()) return;
    const [libelle, signatures] = await Promise.all([
      libelleDocumentSignable(db, objetType, objetId, etablissementId),
      db.signature.findMany({
        where: { objetType, objetId, etablissementId, active: true },
        orderBy: { horodatageIso: "asc" },
        select: {
          id: true,
          partie: true,
          signataireNom: true,
          signataireEmail: true,
          hashDocument: true,
          horodatageIso: true,
        },
      }),
    ]);
    if (!libelle || signatures.length === 0) return;
    // Le PDF du plan, rendu une fois et joint à chaque avis (2026-11-19,
    // ADR-061 § 7). Au mieux : sans lui, l'avis part quand même.
    const pieceJointe =
      objetType === "plan_prevention"
        ? await pieceJointePlanPrevention(db, etablissementId, objetId)
        : null;

    // La date où l'acte est signé par tous : celle de la dernière signature.
    const signeLe = quand(
      signatures.reduce((d, s) => (s.horodatageIso > d ? s.horodatageIso : d), signatures[0].horodatageIso),
    );

    // Un message par destinataire, qui ne porte que SES signatures (une, sauf
    // si la même adresse a signé pour les deux parties).
    const parDestinataire = new Map<string, typeof signatures>();
    for (const s of signatures) {
      const to = s.signataireEmail.trim().toLowerCase();
      if (!to.includes("@")) continue;
      parDestinataire.set(to, [...(parDestinataire.get(to) ?? []), s]);
    }

    await Promise.all(
      [...parDestinataire].map(([to, siennes]) => {
        const [premiere] = siennes;
        const message = mailSignature({
          titre: TITRE[objetType],
          nom: premiere.signataireNom,
          paragraphes: [`Le document « ${libelle} » est signé par toutes les parties le ${signeLe}.`],
          surtitre: "Signatures complètes",
          encadre: [
            ...siennes.map((s) => ({
              libelle: "Votre signature",
              valeur:
                `${s.signataireNom}${s.partie ? ` (${LIBELLE_PARTIE[objetType][s.partie]})` : ""}, ` +
                `le ${quand(s.horodatageIso)}`,
            })),
            // L'empreinte du document tel que ce signataire l'a signé : celle
            // que le PDF imprime.
            // Celle des données signées (JSON canonique), pas celle du PDF
            // joint (audit de sécurité du 2026-11-21).
            {
              libelle:
                objetType === "plan_prevention"
                  ? "Empreinte SHA-256 des données du plan (ce n'est pas celle du PDF joint)"
                  : "Empreinte SHA-256 des données signées",
              valeur: premiere.hashDocument,
            },
          ],
          suite: [
            ...(objetType === "plan_prevention" ? [CONSERVATION_PLAN] : []),
            "Gardez aussi ce message : cette empreinte, imprimée aussi sur le PDF, " +
              "se compare à celle affichée dans Rojer par l'émetteur.",
          ],
          apres: [],
        });
        return sendMail({
          to,
          subject: `Document signé par toutes les parties : ${libelle}`,
          ...message,
          // Le PDF du plan, rendu une fois pour tous (lot 5) ; absent, l'avis part sans.
          ...(pieceJointe ? { attachments: [pieceJointe] } : {}),
        }).catch((e: unknown) => console.error("[signatures] avis de fin non envoyé :", motifErreur(e)));
      }),
    );
  } catch (e) {
    console.error("[signatures] avis de fin impossible :", motifErreur(e));
  }
}
