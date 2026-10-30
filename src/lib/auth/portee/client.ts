import "server-only";
// Le client Prisma borné à une portée (ADR-051 § 2) : un compte, ou un
// établissement (prestataire porteur d'un jeton, MCP par clé). Il ajoute la
// borne à chaque opération de modèle, même si l'appelant l'oublie, et refuse
// ce qu'il ne sait pas borner. Il ne s'obtient qu'avec une portée : sans
// elle, pas de client.
//
// Le SQL brut (`$queryRaw`, `$executeRaw`) n'est pas borné par l'extension :
// sa propre garde le tient (ADR-051 § 5).

import { prisma } from "@/lib/prisma";
import { argumentsBornes, ErreurPortee, estLectureDIdentifiants, noterVus, type Portee } from "./borne";

function etendre(portee: Portee) {
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
  const id = portee.type === "compte" ? portee.userId : portee.etablissementId;
  if (typeof id !== "string" || id.length === 0)
    throw new ErreurPortee("portée sans identifiant : client refusé");
  const cle = `${portee.type}:${id}`;
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
