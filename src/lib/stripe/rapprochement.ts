import "server-only";
// Le rapprochement quotidien (ADR-053 § 5, amendé le 2026-11-10) : chaque
// client dont l'abonnement n'est pas terminé est demandé à la relecture.
// Stripe écrit qu'un événement peut ne jamais être créé
// (docs.stripe.com/events/manage-webhook-endpoints) : c'est le seul filet,
// et il borne à un jour l'écart entre la copie et Stripe. La file relit
// ensuite chaque client, une fois, sous son bail.
//
// Lecture à travers les comptes : seul usage du client brut ici
// (`portee/imports.test.ts`) — elle ne lit que l'identifiant du client
// Stripe, aucune donnée de compte.

import { prisma } from "@/lib/prisma";
import { demanderSynchronisations } from "./file";

/** Statuts terminés chez Stripe : plus rien n'y change. */
const TERMINES = ["canceled", "incomplete_expired"];
const PAR_LOT = 500;

export async function rapprocher(maintenant: Date): Promise<{ demandes: number }> {
  let demandes = 0;
  let apres: string | undefined;
  for (;;) {
    const lot = await prisma.abonnement.findMany({
      // Un compte en essai n'a pas de client Stripe (ADR-053 § 9, amendé le
      // 2026-11-16) : rien à relire.
      where: {
        OR: [{ statut: null }, { statut: { notIn: TERMINES } }],
        stripeCustomerId: apres ? { gt: apres } : { not: null },
      },
      orderBy: { stripeCustomerId: "asc" },
      take: PAR_LOT,
      select: { stripeCustomerId: true },
    });
    const clients = lot.flatMap((l) => (l.stripeCustomerId ? [l.stripeCustomerId] : []));
    await demanderSynchronisations(clients, maintenant);
    demandes += clients.length;
    if (lot.length < PAR_LOT) return { demandes };
    apres = clients.at(-1);
  }
}
