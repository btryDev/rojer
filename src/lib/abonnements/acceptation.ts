import "server-only";
// La preuve d'acceptation des conditions générales (ADR-053 § 8) : version
// et empreinte du texte accepté, par la personne, pour le compte. Un journal,
// jamais effacé — une acceptation sans essai ni paiement ne nuit à personne,
// un essai ou un paiement sans preuve, si. Seule écriture de
// `AcceptationConditions` : l'essai (`essai.ts`) et le passage au payant
// (`sAbonnerAction`). Le réabonnement par Checkout n'en écrit pas : Stripe
// garde la case cochée sur la session.

import type { Db } from "@/lib/auth/compte";
import { VERSION_CONDITIONS } from "./conditions";
import { empreinteConditions } from "./conditions-empreinte";

export async function enregistrerAcceptation(
  db: Db,
  { compteId, userId }: { compteId: string; userId: string },
  contexte: "essai" | "abonnement",
): Promise<void> {
  await db.acceptationConditions.create({
    data: { compteId, userId, version: VERSION_CONDITIONS, empreinte: empreinteConditions(), contexte },
  });
}
