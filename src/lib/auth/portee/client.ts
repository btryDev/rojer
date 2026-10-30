import "server-only";
// Le client Prisma borné à une portée (ADR-051 § 2) : un compte. [La portée
// « établissement » viendra au lot 2b, voir `Portee`.] Il ajoute la
// borne à chaque opération de modèle, même si l'appelant l'oublie, et refuse
// ce qu'il ne sait pas borner. Il ne s'obtient qu'avec une portée : sans
// elle, pas de client.
//
// Le SQL brut (`$queryRaw`, `$executeRaw`) n'est pas borné par l'extension :
// sa propre garde le tient (ADR-051 § 5).

import { prisma } from "@/lib/prisma";
import { argumentsBornes, ErreurPortee, estLectureDIdentifiants, noterVus, type Portee } from "./borne";

function etendre(p: Portee) {
  // Copie figée : un appelant qui garderait l'objet ne peut plus déplacer la
  // portée d'un client déjà en cache (revue du lot 2a).
  const portee: Portee = Object.freeze({ type: "compte", userId: p.userId });
  return prisma.$extends({
    name: "borne-au-compte",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const resultat = await query(argumentsBornes(model, operation, args, portee) as typeof args);
          if (estLectureDIdentifiants(operation, args)) noterVus(model, portee, resultat);
          return resultat;
        },
      },
    },
  });
}

export type ClientBorne = ReturnType<typeof etendre>;

// Un client par portée, gardé : `$extends` est peu coûteux, mais un rendu en
// demande des dizaines. La clé est l'identifiant de la portée ; un client
// borné à X n'est rendu qu'à du code qui s'est authentifié comme X.
const CLIENTS = new Map<string, ClientBorne>();
const MAX_CLIENTS = 500;

export function clientBorne(portee: Portee): ClientBorne {
  if (portee?.type !== "compte")
    throw new ErreurPortee("seule la portée de compte existe à ce jour : client refusé");
  const id = portee.userId;
  if (typeof id !== "string" || id.length === 0)
    throw new ErreurPortee("portée sans identifiant : client refusé");
  const cle = `compte:${id}`;
  let client = CLIENTS.get(cle);
  if (!client) {
    if (CLIENTS.size >= MAX_CLIENTS) CLIENTS.delete(CLIENTS.keys().next().value!);
    client = etendre(portee);
    CLIENTS.set(cle, client);
  }
  return client;
}

/** Le client d'une transaction ouverte sur un client borné. */
export type TransactionBornee = Parameters<Parameters<ClientBorne["$transaction"]>[0]>[0];
