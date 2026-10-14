import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertEntrepriseOwnership,
  assertEtablissementOwnership,
} from "@/lib/auth/scope";
import { cascadeDepuis, compterLignes } from "./cascade";
import type {
  PerimetreEntreprise,
  PerimetreEtablissement,
} from "./perimetre";

/**
 * La mesure que les cartes de suppression annoncent.
 *
 * Elle se fait au rendu de l'écran, pas au clic : la carte de confirmation
 * s'ouvre à la milliseconde où on la demande (`ui-kit/Confirmation.tsx` est
 * synchrone), et une question qui met une seconde à apparaître se clique deux
 * fois.
 *
 * **Le nombre de versions de DUERP n'est pas dérivé de la cascade** alors que
 * `bloqueraient()` saurait le faire, et c'est délibéré : c'est exactement le
 * compte que `supprimerEntreprise` et `supprimerEtablissement` opposent à la
 * demande. La carte et le refus doivent tenir le MÊME prédicat, sinon la carte
 * finit par promettre une suppression que l'action refuse — ou l'inverse.
 */

/** Ce que la suppression d'une entreprise emporte, et ce qui la refusera. */
export async function mesurerPerimetreEntreprise(
  entrepriseId: string,
): Promise<PerimetreEntreprise> {
  await assertEntrepriseOwnership(entrepriseId);

  const emporte = await cascadeDepuis(prisma, "Entreprise", [entrepriseId]);

  // Les noms viennent de l'ensemble QUE LA CASCADE A MESURÉ, et non d'une
  // seconde requête sur `entrepriseId` : la liste nommée et le compte annoncé
  // sortent ainsi de la même mesure, et aucun `[0]` ne peut se glisser entre
  // les deux.
  const idsEtablissements = [...(emporte.get("Etablissement") ?? [])];
  const etablissements = await prisma.etablissement.findMany({
    where: { id: { in: idsEtablissements } },
    orderBy: { createdAt: "asc" },
    select: { raisonDisplay: true },
  });

  const versionsDuerp = await prisma.duerpVersion.count({
    where: { duerp: { etablissement: { entrepriseId } } },
  });

  return {
    etablissements: etablissements.map((e) => e.raisonDisplay),
    // L'entreprise et ses établissements sont nommés par la phrase ; les
    // compter une seconde fois dans le total les ferait compter deux fois.
    lignes: compterLignes(emporte, ["Entreprise", "Etablissement"]),
    versionsDuerp,
  };
}

/** Ce que la suppression d'un établissement emporte, et ce qui la refusera. */
export async function mesurerPerimetreEtablissement(
  etablissementId: string,
): Promise<PerimetreEtablissement> {
  await assertEtablissementOwnership(etablissementId);

  const etablissement = await prisma.etablissement.findUniqueOrThrow({
    where: { id: etablissementId },
    select: { raisonDisplay: true },
  });

  const emporte = await cascadeDepuis(prisma, "Etablissement", [
    etablissementId,
  ]);

  const versionsDuerp = await prisma.duerpVersion.count({
    where: { duerp: { etablissementId } },
  });

  return {
    nom: etablissement.raisonDisplay,
    lignes: compterLignes(emporte, ["Etablissement"]),
    versionsDuerp,
  };
}
