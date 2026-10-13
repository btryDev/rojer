import { prisma } from "@/lib/prisma";
import type {
  ObjetSignable,
  StatutPermisFeu,
  StatutPlanPrevention,
} from "@prisma/client";
import { partiesAttendues, repartirSignatures } from "./parties";

/**
 * Le statut d'un acte co-signé suit ses signatures (audit du 2026-10-12,
 * constats 3 et 5).
 *
 * **Ce module n'est volontairement pas `"use server"`** (voir
 * `./appartenance.ts`) : ses appelants — les deux chemins de signature — ont
 * déjà établi le périmètre, par le jeton ou par le compte.
 *
 * Rien n'écrivait jamais `valide` : un plan et un permis restaient « En
 * attente de signatures » après les deux signatures, et la fiche du permis
 * titrait en même temps « Permis co-signé et valide ». Le passage se fait ici,
 * après chaque signature posée, quand toutes les parties attendues ont signé
 * (`repartirSignatures`, la lecture même des fiches).
 *
 * L'écriture est CONDITIONNELLE : elle ne part que d'un statut d'avant
 * signature, si bien qu'elle ne ramène jamais en arrière un permis démarré, un
 * plan clos ou un objet annulé. Deux signatures simultanées ne la perdent pas :
 * chacune relit après sa propre écriture, et la dernière à relire voit les deux.
 *
 * Ce qui n'est PAS ici, et qui est une décision (`chantiers-ouverts.md` § 10) :
 * révoquer les signatures quand le contenu change, figer le document signé,
 * l'horodater chez un tiers. Et l'état « inspection commune faite » du plan,
 * dont le sens au regard de la création reste à trancher.
 */
const STATUTS_PLAN_AVANT_VALIDE: StatutPlanPrevention[] = [
  "brouillon",
  "inspection_faite",
  "attente_signatures",
];
const STATUTS_PERMIS_AVANT_VALIDE: StatutPermisFeu[] = [
  "brouillon",
  "attente_signatures",
];

export async function validerSiCoSigne(
  objetType: ObjetSignable,
  objetId: string,
  etablissementId: string,
): Promise<void> {
  if (partiesAttendues(objetType).length === 0) return;
  const signatures = await prisma.signature.findMany({
    where: { objetType, objetId, etablissementId },
    select: { partie: true },
  });
  if (repartirSignatures(objetType, signatures).manquantes.length > 0) return;

  if (objetType === "plan_prevention") {
    await prisma.planPrevention.updateMany({
      where: { id: objetId, etablissementId, statut: { in: STATUTS_PLAN_AVANT_VALIDE } },
      data: { statut: "valide" },
    });
  } else if (objetType === "permis_feu") {
    await prisma.permisFeu.updateMany({
      where: { id: objetId, etablissementId, statut: { in: STATUTS_PERMIS_AVANT_VALIDE } },
      data: { statut: "valide" },
    });
  }
}
