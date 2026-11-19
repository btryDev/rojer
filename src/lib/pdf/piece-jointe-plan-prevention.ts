import "server-only";
import type { Prisma } from "@prisma/client";
import { motifErreur, type PieceJointe } from "@/lib/email";
import { reserverPlaceExport } from "@/lib/exports/limite";
import { construirePlanPreventionData } from "./builder-plan-prevention";
import { nomFichierPlanPrevention } from "./PlanPreventionDocument";
import { rendrePdf } from "./rendre";

/**
 * Le PDF d'un plan de prévention, prêt à joindre à un courriel (2026-11-19 :
 * l'avis « signé par toutes les parties », ADR-061 § 7). Rendu une fois pour
 * tous les destinataires.
 *
 * Au mieux, comme l'avis qui l'appelle : `null` si le plan est introuvable
 * dans l'établissement, si la file d'export est pleine, ou si le rendu
 * échoue — le journal le dit, et le courriel part sans pièce. Jamais de
 * levée.
 *
 * Le rendu prend sa place dans la file des exports (`exports/limite.ts`) :
 * c'est du calcul synchrone, comme pour une route PDF. Le demandeur est le
 * plan — aucun utilisateur n'est connecté après une signature par lien.
 */
export async function pieceJointePlanPrevention(
  /** Le client borné au compte de l'appelant ou du jeton (ADR-051). */
  db: Prisma.TransactionClient,
  etablissementId: string,
  planId: string,
): Promise<PieceJointe | null> {
  try {
    const data = await construirePlanPreventionData(db, etablissementId, planId);
    if (!data) return null;
    const liberer = await reserverPlaceExport(`courriel:${planId}`);
    if (liberer instanceof Response) {
      console.error("[signatures] PDF du plan non joint : file d'export pleine.");
      return null;
    }
    let pdf: Buffer;
    try {
      pdf = await rendrePdf({ type: "plan-prevention", props: { data } }, { origine: "courriel" });
    } finally {
      liberer();
    }
    return {
      name: nomFichierPlanPrevention(data.numero, data.etablissement),
      content: pdf.toString("base64"),
      contentType: "application/pdf",
    };
  } catch (e) {
    console.error("[signatures] PDF du plan non joint :", motifErreur(e));
    return null;
  }
}
