"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";

/**
 * Les deux questions de paramétrage — ADR-025 § 7, ADR-032.
 *
 * Elles n'ont pas d'écran : « Paramètres » pointe la page de connexion d'un
 * assistant, et le lot A8 refera la navigation. En attendant, elles se posent
 * et se répondent **dans la checklist du tableau de bord**, en place. Un écran
 * de paramétrage créé ici serait à défaire dans deux semaines, et un écran à
 * défaire est un écran que personne ne reprend.
 *
 * **Ce que ces actions n'écrivent jamais, c'est `null`.** `null` est la valeur
 * d'origine et elle veut dire « pas encore répondu » (migration
 * 20260901170000) ; les actions ne servent qu'à en sortir. Répondre « non »
 * écrit `false`, ce qui est une réponse — et c'est ce que le prédicat `faite`
 * de la checklist observe, jamais la valeur elle-même.
 *
 * Aucune des deux ne touche le calendrier :
 *  - `aDemandesAssureur` n'ouvre aucune obligation, il ouvre une porte de
 *    saisie ; ce sont les `PrescriptionParticuliere` créées ensuite qui font
 *    naître des échéances, par le mécanisme inchangé de l'ADR-035.
 *  - `epiPresents` est une **consignation**. R. 4323-95 à R. 4323-106 CT et
 *    l'arrêté du 19 mars 1993 n'ont jamais été ouverts dans ce dépôt, et un
 *    guide commercial a déjà fait croire à une périodicité annuelle générale
 *    des EPI qui n'existe pas. Lire avant d'encoder : rien ne dérive de cette
 *    réponse, et rien ne doit en dériver avant cette lecture.
 */

export type ReponseParametrage =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

/** `"oui"`/`"non"` et rien d'autre — pas de repli silencieux sur « non ». */
const reponseBooleenne = z.enum(["oui", "non"]);

/** Le détail EPI : borné comme les autres textes libres du modèle. */
const detailEpi = z
  .string()
  .trim()
  .max(1000, "1000 caractères au maximum")
  .optional();

export async function repondreDemandesAssureur(
  etablissementId: string,
  _prev: ReponseParametrage,
  formData: FormData,
): Promise<ReponseParametrage> {
  await assertEtablissementOwnership(etablissementId);

  const parsed = reponseBooleenne.safeParse(formData.get("reponse"));
  if (!parsed.success) {
    return { status: "error", message: "Répondez oui ou non." };
  }

  await prisma.etablissement.update({
    where: { id: etablissementId },
    data: { aDemandesAssureur: parsed.data === "oui" },
  });
  revalidatePath(`/etablissements/${etablissementId}`);
  return { status: "success" };
}

export async function repondreEpiPresents(
  etablissementId: string,
  _prev: ReponseParametrage,
  formData: FormData,
): Promise<ReponseParametrage> {
  await assertEtablissementOwnership(etablissementId);

  const parsed = reponseBooleenne.safeParse(formData.get("reponse"));
  if (!parsed.success) {
    return { status: "error", message: "Répondez oui ou non." };
  }
  const detail = detailEpi.safeParse(formData.get("detail") ?? undefined);
  if (!detail.success) {
    return { status: "error", message: detail.error.issues[0].message };
  }

  const oui = parsed.data === "oui";
  await prisma.etablissement.update({
    where: { id: etablissementId },
    data: {
      epiPresents: oui,
      // Répondre « non » efface un détail laissé par une réponse précédente :
      // le garder ferait subsister une liste d'EPI sous une déclaration
      // d'absence d'EPI, et c'est la contradiction qu'un contrôleur relèverait.
      epiPresentsDetail: oui ? (detail.data || null) : null,
    },
  });
  revalidatePath(`/etablissements/${etablissementId}`);
  return { status: "success" };
}
