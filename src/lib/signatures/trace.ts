import { prisma } from "@/lib/prisma";
import type { ObjetSignable } from "@prisma/client";

/**
 * Un objet signable porte-t-il déjà une trace de signature ?
 *
 * **Ce module n'est volontairement pas `"use server"`** (même raison que
 * `./appartenance.ts`) : exporté comme server action, il répondrait par oui ou
 * non sur des identifiants arbitraires.
 *
 * ── Pourquoi la question existe ──────────────────────────────────────────
 *
 * `supprimerPlan` et `supprimerPermisFeu` effaçaient l'objet dès qu'il était en
 * `brouillon` ou en `attente_signatures`. Or `attente_signatures` est l'état de
 * CRÉATION des deux objets, et celui où les signatures se recueillent : aucun
 * code n'écrit jamais `valide`. Un plan signé par l'entreprise extérieure
 * restait donc en `attente_signatures` et s'effaçait d'un clic. `Signature.
 * objetId` n'a pas de clé étrangère : la signature survivait, orpheline, et
 * `/verifier/<id>` répondait « document introuvable » à qui la contrôlait.
 *
 * Le statut ne dit donc pas si un objet a été signé. Ce qui le dit, ce sont
 * les faits en base : une `Signature` posée, ou un `AccessToken` émis — un
 * lien parti chez un tiers est un fait, même si personne n'a encore signé, et
 * effacer l'objet laisserait ce tiers devant un lien qui ne mène à rien.
 *
 * Un jeton de n'importe quel scope compte, pas seulement `signature` : tout
 * jeton sur l'objet signifie qu'un tiers y a été invité. Le sens d'erreur est
 * voulu — au pire, un plan qui aurait pu être effacé passe « annulé » et
 * reste au dossier, ce que le dirigeant voit ; l'inverse effaçait une preuve
 * sans que personne ne puisse s'en apercevoir.
 *
 * Les deux comptes sont bornés à `etablissementId` : la question porte sur CET
 * objet de CET établissement, et un identifiant homonyme ailleurs n'y répond
 * pas.
 */
export async function porteUneTraceDeSignature(
  objetType: ObjetSignable,
  objetId: string,
  etablissementId: string,
): Promise<boolean> {
  const [signatures, jetons] = await Promise.all([
    prisma.signature.count({
      where: { objetType, objetId, etablissementId },
    }),
    prisma.accessToken.count({
      where: { objetType, objetId, etablissementId },
    }),
  ]);
  return signatures > 0 || jetons > 0;
}
