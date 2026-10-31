import "server-only";
import { cache } from "react";
import type { Db } from "@/lib/auth/compte";
import type { CategorieEquipement } from "@prisma/client";

/**
 * La catégorie qui fait porter la surveillance des légionelles par le
 * RÉFÉRENTIEL (2026-10-17, sous-lot F, décision de la propriétaire) :
 * `ecs-temperature-mensuelle` et `ecs-legionelles-analyse-annuelle`, une ligne
 * de chaque par installation déclarée.
 */
export const CATEGORIE_EAU_CHAUDE_SUIVIE: CategorieEquipement =
  "EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC";

/**
 * L'établissement est-il un ERP qui a déclaré au moins une installation de la
 * catégorie ?
 *
 * ERP, et pas seulement « déclarée » : les deux lignes ne naissent qu'en ERP
 * (`typologies: { erp: true }`, champ de l'art. 1er). Un établissement non
 * ERP qui déclarerait la catégorie n'en reçoit aucune ; s'il fallait taire le
 * carnet pour lui aussi, il ne lui resterait plus aucun rappel.
 *
 * Lu par l'échéance du carnet (`calendrier/echeances.ts`, `sourceLegionelles`)
 * et par la ligne du tableau de bord (`dashboard/queries.ts`) : quand la
 * réponse est oui, le calendrier porte déjà l'analyse annuelle et la
 * température mensuelle, et le module se tait sur ces rappels — un seul
 * rappel par acte (ADR-010, amendement du 2026-10-17). Une seule lecture,
 * pour que les deux surfaces ne puissent pas diverger.
 *
 * ACTIVE seulement (revue indépendante du 2026-10-17) : le moteur ne voit que
 * les équipements `actif: true` (`calendrier/passe.ts`, ADR-012). Une
 * installation retirée du parc perd ses deux lignes ; la compter ici aussi
 * laissait le carnet muet, la matrice en « na » et la page affirmer que Rojer
 * suit — l'utilisateur perdait tout rappel.
 *
 * `db` est le client borné au compte de l'appelant (ADR-051), reçu de sa
 * garde ; `scope` porte en plus le prédicat de compte
 * (`etablissement.entreprise.userId`).
 */
export async function eauChaudeSuivieParLeCalendrier(
  db: Db,
  scope: {
    etablissementId: string;
    etablissement: { entreprise: { userId: string } };
  },
): Promise<boolean> {
  return eauChaudeSuivieDuRendu(db, scope.etablissementId, scope.etablissement.entreprise.userId);
}

/** Le corps, mémoïsé sur le rendu : la matrice du tableau de bord et les
 *  échéances du carnet le demandaient chacune (plan performance, lot 1). Clés
 *  stables, comme au dossier du rendu (`dossier-du-rendu.ts`, en-tête) ;
 *  `getModulesMatrice` éprouve que client et prédicat y sont lus. */
const eauChaudeSuivieDuRendu = cache(async function eauChaudeSuivieDuRendu(
  db: Db,
  etablissementId: string,
  userId: string,
): Promise<boolean> {
  const n = await db.equipement.count({
    where: {
      etablissementId,
      etablissement: { entreprise: { userId }, estERP: true },
      categorie: CATEGORIE_EAU_CHAUDE_SUIVIE,
      actif: true,
    },
  });
  return n > 0;
});
