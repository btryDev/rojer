import { prisma } from "@/lib/prisma";

/**
 * Révoque les liens encore ouverts sur un objet — à sa clôture, son
 * annulation ou sa suppression.
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
 */
export async function revoquerLiensEnVol(params: {
  etablissementId: string;
  objetType: string;
  objetId: string;
  motif: string;
}): Promise<number> {
  const r = await prisma.accessToken.updateMany({
    where: {
      etablissementId: params.etablissementId,
      objetType: params.objetType,
      objetId: params.objetId,
      utiliseLe: null,
      revoqueLe: null,
    },
    data: { revoqueLe: new Date(), revoqueMotif: params.motif },
  });
  return r.count;
}
