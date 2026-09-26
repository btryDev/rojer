"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import {
  assertEntrepriseOwnership,
  getOptionalUserEtablissement,
} from "@/lib/auth/scope";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { entrepriseSchema } from "./schema";

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success" };

export async function creerEntreprise(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  // 1 user = 1 entreprise : si une entreprise existe déjà pour ce user,
  // on ne la duplique pas — retour sur le dashboard de l'établissement.
  const existant = await getOptionalUserEtablissement();
  if (existant) redirect(`/etablissements/${existant.id}`);

  const raw = Object.fromEntries(formData);
  const parsed = entrepriseSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // V2 : l'entrée dans l'outil se fait en deux temps.
  //   1. créer l'entreprise (identité juridique)
  //   2. déclarer au moins un établissement (adresse, typologie, régimes)
  // Le DUERP est initié depuis la page détail d'un établissement.
  const entreprise = await prisma.entreprise.create({
    data: { ...parsed.data, userId: user.id },
  });

  redirect(`/etablissements/nouveau?entrepriseId=${entreprise.id}`);
}

export async function modifierEntreprise(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertEntrepriseOwnership(id);
  const raw = Object.fromEntries(formData);
  const parsed = entrepriseSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.entreprise.update({
    where: { id },
    data: parsed.data,
  });

  // L'effectif de l'entreprise est lu par le moteur (`effectifMaille`, C37) :
  // le CSE, la formation de ses élus et le règlement intérieur en dépendent.
  // Aujourd'hui aucune de ces obligations n'écrit de ligne au calendrier
  // (états permanents, titres de salariés), mais le calendrier de chaque
  // établissement est régénéré comme après toute mutation qu'il lit — le
  // patron du dépôt — pour qu'une obligation datée à seuil d'entreprise, le
  // jour où il y en aura une, ne dépende pas d'une mutation de hasard.
  const etablissements = await prisma.etablissement.findMany({
    where: { entrepriseId: id },
    select: { id: true },
  });
  for (const e of etablissements) {
    await regenererApresMutation(e.id, "entreprises/modification");
    revalidatePath(`/etablissements/${e.id}`, "layout");
  }

  revalidatePath("/entreprises");
  revalidatePath(`/entreprises/${id}`);
  return { status: "success" };
}

/**
 * Refus motivé de suppression. Même forme que celui du module établissements :
 * la suppression d'une entreprise cascade jusqu'aux versions de DUERP, et la
 * base la refuse désormais (`onDelete: Restrict`, migration
 * `20260810120000_integrite_et_conservation`).
 */
export type SuppressionEntrepriseResult = {
  statut: "refus";
  message: string;
  exportHref: string;
};

/**
 * Supprime l'entreprise — ou explique pourquoi la loi l'interdit.
 *
 * `prisma.entreprise.delete` cascadait jusqu'ici sur tout l'arbre, versions de
 * DUERP comprises, alors que `docs/rgpd.md` interdit explicitement cette
 * suppression : une `DuerpVersion` figée se conserve 40 ans (art. R. 4121-4 CT)
 * et cette obligation légale l'emporte sur le droit à l'effacement
 * (art. 17.3 RGPD). La base refuse désormais ; on traduit ce refus en français
 * plutôt que de laisser remonter un `P2003`.
 *
 * En cas de succès, la fonction redirige et ne rend pas la main.
 */
export async function supprimerEntreprise(
  id: string,
): Promise<SuppressionEntrepriseResult> {
  await assertEntrepriseOwnership(id);

  // Un établissement dont on connaît l'id permet d'orienter vers l'export.
  const etablissement = await prisma.etablissement.findFirst({
    where: { entrepriseId: id },
    select: { id: true },
  });

  const nbVersions = await prisma.duerpVersion.count({
    where: { duerp: { etablissement: { entrepriseId: id } } },
  });

  const exportHref = etablissement
    ? `/etablissements/${etablissement.id}/controle`
    : "/entreprises";

  if (nbVersions > 0) {
    return {
      statut: "refus",
      exportHref,
      message:
        `Suppression impossible : ${nbVersions} version${nbVersions > 1 ? "s" : ""} ` +
        "de votre document unique d'évaluation des risques " +
        `${nbVersions > 1 ? "sont archivées" : "est archivée"} sur ce compte. ` +
        "Le Code du travail les fait conserver 40 ans (art. R. 4121-4 du Code du " +
        "travail) : elles servent à prouver, des décennies plus tard, à quels " +
        "risques un salarié a été exposé. Ce refus s'applique même à une " +
        "demande d'effacement (art. 17.3 du RGPD, obligation légale). Vous " +
        "pouvez en revanche exporter l'intégralité de vos documents.",
    };
  }

  try {
    await prisma.entreprise.delete({ where: { id } });
  } catch (err) {
    // Filet de sécurité : une version a pu être figée entre le comptage et la
    // suppression. L'utilisateur ne doit jamais voir une erreur Prisma brute.
    console.error(`[entreprises] suppression refusée pour ${id}`, err);
    return {
      statut: "refus",
      exportHref,
      message:
        "Suppression impossible : ce compte porte des documents à conservation " +
        "obligatoire. Exportez votre dossier de conformité, puis contactez le " +
        "support si vous souhaitez fermer le compte.",
    };
  }

  revalidatePath("/entreprises");
  redirect("/entreprises");
}
