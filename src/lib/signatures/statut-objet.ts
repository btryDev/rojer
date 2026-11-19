import type {
  ObjetSignable,
  Prisma,
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

/**
 * Rend `true` quand CET appel a fait passer l'acte à « valide » : c'est le
 * signal de l'avis aux signataires (`avis-co-signature.ts`), envoyé une fois,
 * par la signature qui complète l'acte — l'écriture conditionnelle garantit
 * qu'une seule des deux signatures simultanées l'obtient.
 */
export async function validerSiCoSigne(
  /** Le client borné au compte de l'appelant ou du jeton (ADR-051). */
  db: Prisma.TransactionClient,
  objetType: ObjetSignable,
  objetId: string,
  etablissementId: string,
): Promise<boolean> {
  if (partiesAttendues(objetType).length === 0) return false;
  const signatures = await db.signature.findMany({
    where: { objetType, objetId, etablissementId },
    select: { partie: true },
  });
  if (repartirSignatures(objetType, signatures).manquantes.length > 0) return false;

  if (objetType === "plan_prevention") {
    const r = await db.planPrevention.updateMany({
      where: { id: objetId, etablissementId, statut: { in: STATUTS_PLAN_AVANT_VALIDE } },
      data: { statut: "valide" },
    });
    return r.count > 0;
  }
  if (objetType === "permis_feu") {
    const r = await db.permisFeu.updateMany({
      where: { id: objetId, etablissementId, statut: { in: STATUTS_PERMIS_AVANT_VALIDE } },
      data: { statut: "valide" },
    });
    return r.count > 0;
  }
  return false;
}
