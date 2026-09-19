import { prisma } from "@/lib/prisma";
import type {
  ObjetSignable,
  StatutPermisFeu,
  StatutPlanPrevention,
} from "@prisma/client";

/**
 * Un objet est-il encore dans un état où l'on peut le signer ?
 *
 * **Ce module n'est volontairement pas `"use server"`** (voir
 * `./appartenance.ts`).
 *
 * ── Pourquoi cette garde existe ──────────────────────────────────────────
 *
 * Clore ou annuler un plan ne touchait pas aux liens de signature déjà
 * partis, et la pose de signature ne regardait pas l'état de l'objet : un
 * plan clos, ou annulé, se signait encore avec un lien de la veille. Deux
 * gestes la referment, et ils ne sont pas redondants. La clôture révoque les
 * liens en vol (`@/lib/access-tokens/revocation`), mais un jeton émis par un
 * autre chemin — ou pendant la clôture — lui échapperait : la garde de fond
 * est ICI, au moment de signer.
 *
 * ── Ce qui est tranché ───────────────────────────────────────────────────
 *
 * Plan de prévention : `clos` et `annule` ne se signent plus ; tous les
 * autres statuts se signent, comme avant.
 *
 * Permis de feu : `termine` (l'équivalent de « clos ») et `annule` ne se
 * signent plus. **`en_cours` reste signable, délibérément** : rien n'empêche
 * aujourd'hui de démarrer des travaux avant d'avoir recueilli les deux
 * signatures, et refuser la signature à ce moment-là empêcherait de
 * régulariser un permis que le chantier a devancé. La règle « on ne démarre
 * pas sans signatures » est une question de produit, pas de sécurité.
 *
 * Ces listes ne préjugent pas du cycle de contre-signature décidé le
 * 2026-09-07 (`docs/chantiers-ouverts.md` § 10) : elles ne font qu'interdire
 * de signer un objet dont la vie est terminée.
 *
 * Les autres types d'objet signables n'ont pas de fin de vie ici : ils
 * répondent « signable », et leur existence dans l'établissement reste
 * vérifiée par `calculerHashObjet`.
 */

export const STATUTS_PLAN_NON_SIGNABLES: readonly StatutPlanPrevention[] = [
  "clos",
  "annule",
];

export const STATUTS_PERMIS_NON_SIGNABLES: readonly StatutPermisFeu[] = [
  "termine",
  "annule",
];

export function statutPlanSignable(statut: StatutPlanPrevention): boolean {
  return !STATUTS_PLAN_NON_SIGNABLES.includes(statut);
}

export function statutPermisSignable(statut: StatutPermisFeu): boolean {
  return !STATUTS_PERMIS_NON_SIGNABLES.includes(statut);
}

/**
 * La lecture est bornée à `etablissementId`, qui vient du jeton ou d'un
 * établissement dont l'appartenance vient d'être vérifiée — jamais de l'URL.
 * Un objet hors de ce périmètre est « non signable ».
 */
export async function objetEstSignable(
  objetType: ObjetSignable | string,
  objetId: string,
  etablissementId: string,
): Promise<boolean> {
  if (objetType === "plan_prevention") {
    const plan = await prisma.planPrevention.findFirst({
      where: { id: objetId, etablissementId },
      select: { statut: true },
    });
    return plan !== null && statutPlanSignable(plan.statut);
  }
  if (objetType === "permis_feu") {
    const permis = await prisma.permisFeu.findFirst({
      where: { id: objetId, etablissementId },
      select: { statut: true },
    });
    return permis !== null && statutPermisSignable(permis.statut);
  }
  return true;
}
