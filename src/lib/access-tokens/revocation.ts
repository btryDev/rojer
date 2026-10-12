import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Révoque les liens encore ouverts sur un objet — à sa clôture, son
 * annulation ou sa suppression, et (2026-10-12, relecture indépendante) quand
 * le contenu qu'une signature scellerait change : un lien envoyé montre une
 * version, l'empreinte est calculée au moment du code — sans révocation,
 * l'entreprise extérieure signait une version qu'elle n'avait pas vue.
 *
 * **Ce module n'est volontairement pas `"use server"`** : exporté comme
 * server action, il révoquerait les liens de n'importe quel objet sur simple
 * appel. Ses appelants ont déjà établi la propriété de l'établissement.
 *
 * Avant lui, les seules écritures de `revoqueLe` étaient l'épuisement des
 * essais de code (`./verify.ts`) et le bouton « Annuler l'accès »
 * (`./actions.ts`) : un plan clos ou annulé laissait ses liens de signature
 * valides jusqu'à leur expiration. Cette révocation est le premier geste ; la
 * garde de fond est au moment de signer (`@/lib/signatures/etat-signable`),
 * parce qu'un jeton émis par un autre chemin échapperait à celle-ci.
 *
 * Ne touche qu'aux jetons **non consommés et non révoqués** : un lien qui a
 * déjà servi à signer garde sa trace « utilisé le … », et une révocation
 * antérieure garde son motif. La clause est bornée à `etablissementId`.
 *
 * `db` : le client de la transaction de l'appelant, quand la révocation doit
 * tomber avec l'écriture qui la motive (`modifierPlanPrevention`).
 */
export async function revoquerLiensEnVol(
  params: LiensDeLObjet & { motif: string },
  db: Prisma.TransactionClient = prisma,
): Promise<number> {
  const r = await db.accessToken.updateMany({
    where: whereLiensEnVol(params),
    data: { revoqueLe: new Date(), revoqueMotif: params.motif },
  });
  return r.count;
}

type LiensDeLObjet = {
  etablissementId: string;
  objetType: string;
  objetId: string;
};

/** Les liens qu'une révocation emporterait — la même clause pour les deux. */
function whereLiensEnVol(p: LiensDeLObjet) {
  return {
    etablissementId: p.etablissementId,
    objetType: p.objetType,
    objetId: p.objetId,
    utiliseLe: null,
    revoqueLe: null,
  };
}

/**
 * Combien de liens encore utilisables une révocation emporterait — ce que
 * l'écran « Modifier » annonce avant l'envoi. Un lien expiré n'y compte pas :
 * il ne mène déjà plus nulle part, rien n'est à renvoyer pour lui.
 */
export async function compterLiensEnVol(p: LiensDeLObjet): Promise<number> {
  return prisma.accessToken.count({
    where: { ...whereLiensEnVol(p), expireLe: { gt: new Date() } },
  });
}
