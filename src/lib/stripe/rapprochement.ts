import "server-only";
// Le rapprochement quotidien (ADR-053 § 5, amendé le 2026-11-10) : chaque
// client dont l'abonnement n'est pas terminé est demandé à la relecture.
// Stripe écrit qu'un événement peut ne jamais être créé
// (docs.stripe.com/events/manage-webhook-endpoints) : c'est le seul filet,
// et il borne à un jour l'écart entre la copie et Stripe. La file relit
// ensuite chaque client, une fois, sous son bail.
//
// Une copie terminée (résilié, premier paiement expiré) n'est pas relue
// chaque jour — leur nombre ne fait que croître. Son réabonnement, si ses
// événements se perdent, est rattrapé de l'autre côté : les clients des
// abonnements NÉS chez Stripe ces trois derniers jours sont demandés aussi
// (revue du 2026-11-17 : sans cela, il payait et restait fermé).
//
// Lecture à travers les comptes : seul usage du client brut ici
// (`portee/imports.test.ts`) — elle ne lit que l'identifiant du client
// Stripe, aucune donnée de compte.

import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { demanderSynchronisations } from "./file";
import { idStripe } from "./ids";
import { toutLister } from "./synchronisation";

/** Statuts terminés chez Stripe : plus rien n'y change. */
const TERMINES = ["canceled", "incomplete_expired"];
const PAR_LOT = 500;

const NES_DEPUIS_S = 3 * 24 * 3600;

/** Les clients des abonnements créés chez Stripe ces trois derniers jours, une fois chacun. */
async function clientsDesAbonnementsRecents(stripe: Stripe, maintenant: Date): Promise<string[]> {
  const depuis = Math.floor(maintenant.getTime() / 1000) - NES_DEPUIS_S;
  const recents = await toutLister(stripe.subscriptions.list({ created: { gte: depuis }, status: "all", limit: 100 }), 5000);
  return [...new Set(recents.flatMap((s) => idStripe(s.customer) ?? []))];
}

export async function rapprocher(maintenant: Date, stripe: Stripe): Promise<{ demandes: number }> {
  const recents = await clientsDesAbonnementsRecents(stripe, maintenant);
  await demanderSynchronisations(recents, maintenant);
  let demandes = recents.length;
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
