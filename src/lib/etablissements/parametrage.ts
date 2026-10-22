"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";

/**
 * ~~Les deux questions de paramétrage~~ La question de paramétrage — ADR-025 § 7, ADR-032.
 * [2026-10-22, `lot/guide-par-module` : le guide renvoie aux modules ; celle
 * des EPI se répond sur la fiche et son action est retirée, comme les
 * relances des questions de la fiche. Reste l'assureur, qu'aucun autre écran
 * ne pose.]
 *
 * ~~Elles n'ont pas d'écran~~ [2026-10-12 : celle des EPI se corrige aussi à
 * la fiche (`etablissements/[id]/modifier`), audit B2 — la checklist
 * s'effaçant une fois répondue, un « non » ne se corrigeait plus nulle part.
 * Celle de l'assureur n'en a pas besoin : elle n'ouvre qu'une porte de
 * saisie, que la page Prescriptions laisse ouverte quelle que soit la
 * réponse] : « Paramètres » pointe la page de connexion d'un
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
 * Ce qu'elles touchent au calendrier :
 *  - `aDemandesAssureur` n'ouvre aucune obligation, il ouvre une porte de
 *    saisie ; ce sont les `PrescriptionParticuliere` créées ensuite qui font
 *    naître des échéances, par le mécanisme inchangé de l'ADR-035.
 *  - `epiPresents` ~~est une consignation~~ : depuis l'ADR-041 (2026-10-08),
 *    il conditionne la consigne d'utilisation des EPI (R. 4323-105, lu au
 *    corpus `code-travail-epi` le 2026-09-04) — la lecture que cette note
 *    attendait est faite. Seul un « non » déclaré retire la consigne. Aucune
 *    périodicité n'en dérive.
 */

export type ReponseParametrage =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" }
  /** La réponse est enregistrée, la régénération du calendrier a échoué. */
  | { status: "success_avec_avertissement"; message: string };

/** `"oui"`/`"non"` et rien d'autre — pas de repli silencieux sur « non ». */
const reponseBooleenne = z.enum(["oui", "non"]);

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
