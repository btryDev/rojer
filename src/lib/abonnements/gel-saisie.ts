import "server-only";
// Le gel (ADR-053 § 14) pour le SQL brut d'une saisie, qui échappe au client
// borné : à appeler avant chaque écriture en SQL brut faite pour le titulaire
// (`quotas-gel-garde.test.ts`). La session donne le compte : aucun client
// n'est reçu de l'appelant.

import { redirect } from "next/navigation";
import { requireCompte } from "@/lib/auth/compte";
import { PAGE_DU_GEL } from "@/lib/auth/portee/gel";

/**
 * Les gestes qu'un gel laisse ouverts (ADR-053 § 14) : supprimer, retirer un
 * accès, une page publique ou une déclaration, demander de l'aide — liste
 * fermée, `quotas-gel-garde.test.ts`.
 */
export { ouvrirAuGel } from "@/lib/auth/portee/gel";
import { gelesDuCompte } from "./quotas";
import { contexteDroits, offreLancee } from "./lancement";

export async function refuserSiGele(etablissementId: string): Promise<void> {
  // Avant le lancement de l'offre, rien n'est gelé : aucune lecture.
  if (!offreLancee(contexteDroits())) return;
  const { compte, db } = await requireCompte();
  if ((await gelesDuCompte(db, compte.compteId))?.etablissements.includes(etablissementId)) redirect(PAGE_DU_GEL);
}
