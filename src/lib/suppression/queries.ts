import "server-only";
import { assertEntrepriseDuCompte, assertEtablissementDuCompte } from "@/lib/auth/scope";
import { RAPPORT_HORS_LIGNE_SALARIE } from "@/lib/controle/pieces-zip";
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
 *
 * **Le nombre de rapports non plus**, pour une raison voisine : la carte
 * renvoie à l'export de « Préparer un contrôle » pour les garder, et ce ZIP
 * écarte les rapports des lignes de salarié (`RAPPORT_HORS_LIGNE_SALARIE`).
 * La cascade, elle, les emporte tous : le nombre annoncé doit être celui que
 * l'export reprend, sinon l'employeur croit avoir tout sauvegardé.
 */

/** Ce que la suppression d'une entreprise emporte, et ce qui la refusera. */
export async function mesurerPerimetreEntreprise(
  entrepriseId: string,
): Promise<PerimetreEntreprise> {
  const { db } = await assertEntrepriseDuCompte(entrepriseId);

  const emporte = await cascadeDepuis(db, "Entreprise", [entrepriseId]);

  // Les noms viennent de l'ensemble QUE LA CASCADE A MESURÉ, et non d'une
  // seconde requête sur `entrepriseId` : la liste nommée et le compte annoncé
  // sortent ainsi de la même mesure, et aucun `[0]` ne peut se glisser entre
  // les deux.
  const idsEtablissements = [...(emporte.get("Etablissement") ?? [])];
  const etablissements = await db.etablissement.findMany({
    where: { id: { in: idsEtablissements } },
    orderBy: { createdAt: "asc" },
    select: { raisonDisplay: true },
  });

  const [versionsDuerp, rapports] = await Promise.all([
    db.duerpVersion.count({
      where: { duerp: { etablissement: { entrepriseId } } },
    }),
    db.rapportVerification.count({
      where: { etablissement: { entrepriseId }, ...RAPPORT_HORS_LIGNE_SALARIE },
    }),
  ]);

  return {
    etablissements: etablissements.map((e) => e.raisonDisplay),
    // L'entreprise et ses établissements sont nommés par la phrase ; les
    // compter une seconde fois dans le total les ferait compter deux fois.
    lignes: compterLignes(emporte, ["Entreprise", "Etablissement"]),
    versionsDuerp,
    rapports,
  };
}

/** Ce que la suppression d'un établissement emporte, et ce qui la refusera. */
export async function mesurerPerimetreEtablissement(
  etablissementId: string,
): Promise<PerimetreEtablissement> {
  const { db } = await assertEtablissementDuCompte(etablissementId);

  const etablissement = await db.etablissement.findUniqueOrThrow({
    where: { id: etablissementId },
    select: {
      raisonDisplay: true,
      entreprise: {
        select: { raisonSociale: true, _count: { select: { etablissements: true } } },
      },
    },
  });

  const emporte = await cascadeDepuis(db, "Etablissement", [
    etablissementId,
  ]);

  const [versionsDuerp, rapports] = await Promise.all([
    db.duerpVersion.count({ where: { duerp: { etablissementId } } }),
    db.rapportVerification.count({
      where: { etablissementId, ...RAPPORT_HORS_LIGNE_SALARIE },
    }),
  ]);

  return {
    nom: etablissement.raisonDisplay,
    lignes: compterLignes(emporte, ["Etablissement"]),
    versionsDuerp,
    rapports,
    entrepriseEmportee:
      etablissement.entreprise._count.etablissements === 1
        ? etablissement.entreprise.raisonSociale
        : null,
  };
}
