import type { ObjetSignable, PartieSignataire, Prisma } from "@prisma/client";
import { envoiEnService, motifErreur, publicAppUrl, sendMail } from "@/lib/email";
import { formaterDateHeureFr } from "@/lib/dates";
import { libelleDocumentSignable } from "./libelle-document";

/**
 * L'avis de fin de signature (2026-11-19) : quand toutes les parties d'un
 * acte co-signé (plan de prévention, permis de feu) ont signé, chaque
 * signataire reçoit un courriel avec, pour chaque signature, son empreinte
 * SHA-256 et l'adresse publique qui la vérifie (`/verifier/[signatureId]`).
 *
 * Pourquoi : jusqu'ici aucune partie ne recevait rien, et la preuve ne vivait
 * que chez Rojer. Une empreinte tenue par chaque partie fait sortir la preuve
 * de l'auto-attestation : Rojer ne pourrait plus changer le document sans
 * que la vérification le dise à quelqu'un qui garde l'empreinte d'origine.
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

    const base = publicAppUrl();
    const lignes = [
      "Bonjour,",
      "",
      `Le document « ${libelle} » est signé par toutes les parties.`,
      "",
      ...signatures.flatMap((s) => [
        `- ${s.signataireNom}${s.partie ? ` (${LIBELLE_PARTIE[objetType][s.partie]})` : ""}, ` +
          `le ${formaterDateHeureFr(s.horodatageIso)} (heure de Paris)`,
        `  Empreinte SHA-256 du document signé : ${s.hashDocument}`,
        `  Vérifier cette signature : ${base}/verifier/${s.id}`,
      ]),
      "",
      "Conservez ce message : l'empreinte permet de vérifier à tout moment " +
        "que le document signé n'a pas été modifié.",
      "",
      "— Rojer",
    ];
    const texte = lignes.join("\n");
    const destinataires = [...new Set(signatures.map((s) => s.signataireEmail.trim().toLowerCase()))]
      .filter((e) => e.includes("@"));

    await Promise.all(
      destinataires.map((to) =>
        sendMail({ to, subject: `Document signé par toutes les parties : ${libelle}`, text: texte }).catch(
          (e: unknown) => console.error("[signatures] avis de fin non envoyé :", motifErreur(e)),
        ),
      ),
    );
  } catch (e) {
    console.error("[signatures] avis de fin impossible :", motifErreur(e));
  }
}
