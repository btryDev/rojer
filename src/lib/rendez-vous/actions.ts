"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireVerification } from "@/lib/auth/scope";
import { depuisSaisieDateHeure, joursCivilsEntre } from "@/lib/dates";
import { resoudrePrestataireOptionnel } from "@/lib/prestataires/queries";
import { suiviControleSchema } from "./schema";
import { recoitUnSuivi } from "./regles";

export type SuiviControleState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

/**
 * Enregistre le prestataire attitré d'un contrôle et le rendez-vous pris
 * (ADR-049). Ni l'un ni l'autre ne touche l'échéance : seuls les faits la
 * datent (ADR-036). Un champ vidé est retiré.
 */
export async function enregistrerSuiviControle(
  verificationId: string,
  _prev: SuiviControleState,
  formData: FormData,
): Promise<SuiviControleState> {
  const { verification: v, etablissementId } = await requireVerification(verificationId);
  if (!recoitUnSuivi(v)) {
    return { status: "error", message: "Ce contrôle ne reçoit ni prestataire ni rendez-vous." };
  }

  const parsed = suiviControleSchema.safeParse({
    prestataireId: formData.get("prestataireId"),
    rendezVousLe: formData.get("rendezVousLe"),
    rendezVousNote: formData.get("rendezVousNote"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Un identifiant venu du formulaire : il ne vaut que s'il est de CET
  // établissement.
  const prestataire = await resoudrePrestataireOptionnel(etablissementId, parsed.data.prestataireId);
  if (!prestataire.ok) return { status: "error", message: "Prestataire introuvable" };

  const rendezVousLe = parsed.data.rendezVousLe ? depuisSaisieDateHeure(parsed.data.rendezVousLe) : null;
  // Une date absurde, pas une date gênante : après l'échéance ou très en
  // avance se signale à l'écran, et s'accepte.
  if (rendezVousLe) {
    const ecart = joursCivilsEntre(new Date(), rendezVousLe);
    if (ecart < -31 || ecart > 2 * 366) {
      return {
        status: "error",
        message: "Formulaire invalide",
        fieldErrors: { rendezVousLe: ["Entre le mois dernier et deux ans d'ici"] },
      };
    }
  }
  await prisma.verification.updateMany({
    where: { id: v.id, etablissementId },
    data: {
      prestataireId: prestataire.id,
      rendezVousLe,
      // Une note sans rendez-vous n'a pas d'objet.
      rendezVousNote: rendezVousLe ? (parsed.data.rendezVousNote ?? null) : null,
    },
  });

  revalidatePath(`/etablissements/${etablissementId}`, "layout");
  return { status: "success" };
}
