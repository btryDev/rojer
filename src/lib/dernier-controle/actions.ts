"use server";

// La date du dernier contrôle déclarée par l'exploitant, sans rapport
// (ADR-051, décision de la propriétaire du 2026-10-27). Elle date l'échéance
// suivante ; elle ne solde rien et n'entre pas au registre.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireVerification } from "@/lib/auth/scope";
import { recalculerLigne } from "@/lib/calendrier/recalcul-ligne";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { WHERE_RAPPORT_REALISE } from "@/lib/rapports/derniere-realisation";
import { estAppareilRetire, MESSAGE_APPAREIL_RETIRE } from "@/lib/equipements/retrait";
import { lireDateDeclaree, recoitUneDateDeclaree } from "./regles";

export type DateDeclareeState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const LIGNE_ETEINTE = "Ce contrôle ne s'applique plus à cet appareil. Rechargez la page.";

const DEJA_UN_RAPPORT =
  "Un rapport de contrôle est déjà enregistré : c'est lui qui date la prochaine échéance.";

export async function declarerDernierControle(
  verificationId: string,
  _prev: DateDeclareeState,
  formData: FormData,
): Promise<DateDeclareeState> {
  const { verification: v, etablissementId } = await requireVerification(verificationId);
  if (!recoitUneDateDeclaree(v)) {
    return { status: "error", message: "Ce contrôle ne se date pas par une date déclarée." };
  }
  const eq =
    v.equipementId === null
      ? null
      : await prisma.equipement.findFirst({
          where: { id: v.equipementId, etablissementId },
          select: { actif: true, dateMiseEnService: true },
        });
  if (eq && estAppareilRetire(eq)) return { status: "error", message: MESSAGE_APPAREIL_RETIRE };

  const lu = lireDateDeclaree(formData.get("dernierControleLe"), new Date(), eq?.dateMiseEnService ?? null);
  if (!lu.ok) return { status: "error", message: lu.message };

  // Sous le verrou de la ligne, comme le dépôt d'un rapport : un rapport
  // réalisé déposé entre-temps rend la déclaration sans objet.
  const refus = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "Verification" WHERE "id" = ${v.id} FOR UPDATE`;
    // Relue sous le verrou : une régénération a pu l'archiver depuis la lecture
    // de `requireVerification` (revue du 2026-10-27).
    const ligne = await tx.verification.findUnique({
      where: { id: v.id },
      select: { archiveLe: true },
    });
    if (ligne === null || ligne.archiveLe !== null) return LIGNE_ETEINTE;
    const realise = await tx.rapportVerification.count({
      where: { verificationId: v.id, ...WHERE_RAPPORT_REALISE },
    });
    if (realise > 0 && lu.date !== null) return DEJA_UN_RAPPORT;
    await tx.verification.updateMany({
      where: { id: v.id, etablissementId },
      data: { dernierControleDeclareLe: lu.date },
    });
    await recalculerLigne(tx, v.id);
    return null;
  });
  if (refus !== null) return { status: "error", message: refus };

  await regenererApresMutation(etablissementId, "dernier-controle/declaration");
  revalidatePath(`/etablissements/${etablissementId}`, "layout");
  return { status: "success" };
}
