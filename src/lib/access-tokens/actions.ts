"use server";

import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";

/**
 * Server actions de l'accès externe (ADR-007).
 *
 * **`emettreAccessToken` n'est plus ici**, et c'est un correctif de sécurité.
 * Tout export d'un module `"use server"` est un point d'entrée réseau : elle
 * y acceptait `sujetMail` et `messageMail` en texte libre, si bien qu'un
 * compte gratuit pouvait faire partir de l'expéditeur Rojer, vers n'importe
 * quelle adresse, un courriel au sujet et au corps de son choix, avec un lien
 * `/acces/…` légitime. Elle vit désormais dans `./emission.ts`, qui n'est pas
 * `"use server"` : seul du code serveur l'atteint, et le seul appelant,
 * `demanderSignature`, valide ses entrées et dérive le texte du courriel
 * côté serveur.
 */

/**
 * Révoque un token (bouton « Annuler l'accès »).
 *
 * `updateMany` plutôt qu'`update` : la clause porte à la fois sur
 * l'identifiant du token et sur l'établissement dont on vient de vérifier
 * l'appartenance. Avec `update`, l'identifiant seul faisait foi — un user
 * pouvait présenter son propre établissement et révoquer le lien d'accès
 * d'un tiers.
 */
export async function revoquerAccessToken(
  etablissementId: string,
  accessTokenId: string,
  motif: string,
): Promise<void> {
  await assertEtablissementOwnership(etablissementId);
  await prisma.accessToken.updateMany({
    where: { id: accessTokenId, etablissementId },
    data: { revoqueLe: new Date(), revoqueMotif: motif },
  });
}
