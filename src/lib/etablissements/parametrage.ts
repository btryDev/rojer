"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { reponseSommeilSuivantLeType } from "./schema";
import {
  MESSAGE_REGEN_ECHEC,
  regenererApresMutation,
} from "@/lib/calendrier/regeneration-sure";

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
  // Depuis l'ADR-041, la réponse conditionne la consigne d'utilisation des EPI
  // (R. 4323-105) : le calendrier suit, comme après une question de la fiche.
  const regenere = await regenererApresMutation(etablissementId, "parametrage/epiPresents");
  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);
  return regenere
    ? { status: "success" }
    : { status: "success_avec_avertissement", message: MESSAGE_REGEN_ECHEC };
}

/**
 * Les deux questions de la fiche dont le silence retient des lignes « à
 * confirmer » (analyse du 2026-09-27, étape 3 — relance des dossiers muets).
 * Posées aussi au parcours depuis ce jour ; ici pour les dossiers nés avant.
 *
 * Contrairement aux deux questions de paramétrage ci-dessus, la réponse change
 * le calendrier : il est régénéré, comme après la fiche (`CHAMPS_STRUCTURANTS`).
 */
async function repondreQuestionDeLaFiche(
  etablissementId: string,
  champ:
    | "manipuleMatieresR422722"
    | "chiffonsImpregnes"
    | "comporteLocauxSommeilPublic",
  formData: FormData,
  /** Refuse une réponse que la fiche n'aurait pas gardée ; rend le message. */
  garde?: (oui: boolean) => Promise<string | null>,
): Promise<ReponseParametrage> {
  await assertEtablissementOwnership(etablissementId);
  const parsed = reponseBooleenne.safeParse(formData.get("reponse"));
  if (!parsed.success) {
    return { status: "error", message: "Répondez oui ou non." };
  }
  const refus = garde ? await garde(parsed.data === "oui") : null;
  if (refus) return { status: "error", message: refus };
  await prisma.etablissement.update({
    where: { id: etablissementId },
    data: { [champ]: parsed.data === "oui" },
  });
  const regenere = await regenererApresMutation(
    etablissementId,
    `parametrage/${champ}`,
  );
  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);
  // Comme `modifierEtablissement` : la réponse est acquise, mais le dirigeant
  // doit savoir que le calendrier n'a pas encore suivi (revue du lot 1).
  return regenere
    ? { status: "success" }
    : { status: "success_avec_avertissement", message: MESSAGE_REGEN_ECHEC };
}

export async function repondreMatieres(
  etablissementId: string,
  _prev: ReponseParametrage,
  formData: FormData,
): Promise<ReponseParametrage> {
  return repondreQuestionDeLaFiche(etablissementId, "manipuleMatieresR422722", formData);
}

export async function repondreChiffons(
  etablissementId: string,
  _prev: ReponseParametrage,
  formData: FormData,
): Promise<ReponseParametrage> {
  return repondreQuestionDeLaFiche(etablissementId, "chiffonsImpregnes", formData);
}

export async function repondreSommeil(
  etablissementId: string,
  _prev: ReponseParametrage,
  formData: FormData,
): Promise<ReponseParametrage> {
  return repondreQuestionDeLaFiche(
    etablissementId,
    "comporteLocauxSommeilPublic",
    formData,
    // La même normalisation que la fiche (contre-revue du lot 1) : sur un type
    // qui ne pose pas la question, `reponseSommeilSuivantLeType` remet la
    // réponse à `null` — et ces actions n'écrivent jamais `null`. La réponse
    // est donc refusée, plutôt qu'écrite là où plus aucun écran ne la montre.
    async (oui) => {
      const etab = await prisma.etablissement.findUnique({
        where: { id: etablissementId },
        select: { estERP: true, typeErp: true },
      });
      const garde = reponseSommeilSuivantLeType({
        estERP: etab?.estERP ?? false,
        typeErp: etab?.typeErp ?? null,
        comporteLocauxSommeilPublic: oui,
      });
      return garde.comporteLocauxSommeilPublic === null
        ? "La question des locaux à sommeil ne se pose pas pour ce type d'établissement."
        : null;
    },
  );
}
