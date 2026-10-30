"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
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
  const { db, verification: v, etablissementId } = await requireVerification(verificationId);
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
  // Un rendez-vous déjà enregistré (manqué, par exemple) ne se refuse pas :
  // on doit pouvoir changer le prestataire sans l'effacer.
  const inchange = rendezVousLe !== null && v.rendezVousLe?.getTime() === rendezVousLe.getTime();
  if (rendezVousLe && !inchange) {
    const ecart = joursCivilsEntre(new Date(), rendezVousLe);
    if (ecart < -31 || ecart > 2 * 366) {
      return {
        status: "error",
        message: "Formulaire invalide",
        fieldErrors: { rendezVousLe: ["Choisissez une date entre le mois dernier et dans deux ans."] },
      };
    }
  }
  // `update` et non `updateMany` : le client borné (ADR-051) réécrit la clé
  // du prestataire en `connect` borné, ce qu'un `updateMany` ne permet pas.
  // La ligne vient d'être lue par `requireVerification`. P2025 a deux causes :
  // la ligne supprimée entre-temps (`updateMany` rendait 0 ligne : rien à
  // écrire, l'action aboutit, comme avant) ou le prestataire disparu entre sa
  // résolution et l'écriture (le `connect` borné ne trouve rien : rien n'est
  // écrit, et l'écran doit le dire).
  try {
    await db.verification.update({
      where: { id: v.id, etablissementId },
      data: {
        prestataireId: prestataire.id,
        rendezVousLe,
        // Une note sans rendez-vous n'a pas d'objet.
        rendezVousNote: rendezVousLe ? (parsed.data.rendezVousNote ?? null) : null,
      },
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")) throw e;
    if ((await db.verification.count({ where: { id: v.id, etablissementId } })) > 0) {
      return { status: "error", message: "Prestataire introuvable" };
    }
  }

  revalidatePath(`/etablissements/${etablissementId}`, "layout");
  return { status: "success" };
}
