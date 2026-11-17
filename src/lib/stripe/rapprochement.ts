import "server-only";
// Le rapprochement quotidien (ADR-053 § 5, amendé le 2026-11-10) : chaque
// compte qui a un client Stripe est demandé à la relecture. Stripe écrit
// qu'un événement peut ne jamais être créé
// (docs.stripe.com/events/manage-webhook-endpoints) : c'est le seul filet,
// et il borne à un jour l'écart entre la copie et Stripe. La file relit
// ensuite chaque client, une fois, sous son bail.
//
// ~~Seuls les abonnements non terminés étaient relus~~ [2026-11-17,
// relecture : un compte résilié qui se réabonne et dont les événements se
// perdent restait « résilié » en payant. Les comptes terminés sont relus
// aussi — ils disparaissent douze mois après (ADR-058) ; plus de balayage des
// abonnements récents chez Stripe.]
//
// Lecture à travers les comptes : seul usage du client brut ici
// (`portee/imports.test.ts`) — elle ne lit que l'identifiant du client
// Stripe, aucune donnée de compte.

import { prisma } from "@/lib/prisma";
import { demanderSynchronisations } from "./file";

const PAR_LOT = 500;
/**
 * Les demandes du rapprochement sont datées un quart d'heure plus tard : la
 * file sert par date, et une relecture née d'un paiement (9 h 05) ne doit pas
 * attendre derrière tous les comptes demandés à 9 h (revue du 2026-11-17).
 * Une demande déjà en file garde sa date (`LEAST`).
 */
const DECALAGE_MS = 15 * 60_000;

export async function rapprocher(maintenant: Date): Promise<{ demandes: number }> {
  const plusTard = new Date(maintenant.getTime() + DECALAGE_MS);
  let demandes = 0;
  let apres: string | undefined;
  for (;;) {
    // Un compte en essai n'a pas de client Stripe (ADR-053 § 9) : rien à relire.
    const lot = await prisma.abonnement.findMany({
      where: { stripeCustomerId: apres ? { gt: apres } : { not: null } },
      orderBy: { stripeCustomerId: "asc" },
      take: PAR_LOT,
      select: { stripeCustomerId: true },
    });
    const clients = lot.flatMap((l) => (l.stripeCustomerId ? [l.stripeCustomerId] : []));
    await demanderSynchronisations(clients, plusTard);
    demandes += clients.length;
    if (lot.length < PAR_LOT) return { demandes };
    apres = clients.at(-1);
  }
}
