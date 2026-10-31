import "server-only";
// Le client Prisma borné à une portée (ADR-051 § 2) : un compte. [La portée
// « établissement » n'est pas faite : jetons et MCP sont bornés au compte
// propriétaire, décision de la propriétaire du 2026-10-30.] Il ajoute la
// borne à chaque opération de modèle, même si l'appelant l'oublie, et refuse
// ce qu'il ne sait pas borner. Il ne s'obtient qu'avec une portée : sans
// elle, pas de client.
//
// Le SQL brut (`$queryRaw`, `$executeRaw`) n'est pas borné par l'extension :
// sa propre garde le tient (ADR-051 § 5).

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { argumentsBornes, ErreurPortee, estLectureDIdentifiants, noterVus, type Portee } from "./borne";

function etendre(base: PrismaClient, p: Portee) {
  // Copie figée : un appelant qui garderait l'objet ne peut plus déplacer la
  // portée d'un client déjà en cache (revue du lot 2a).
  const portee: Portee = Object.freeze({ type: "compte", userId: p.userId });
  // Typé comme le client brut : l'extension ne porte que sur les ARGUMENTS
  // des requêtes (`query`), elle n'ajoute ni modèle, ni champ, ni méthode —
  // l'API à l'exécution est la même. Le type étendu de Prisma, lui, n'est pas
  // assignable à `Prisma.TransactionClient` et perdait le type des `include` :
  // les utilitaires qui reçoivent un client ou une transaction les acceptent
  // ainsi sans changer de signature.
  const client = base.$extends({
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
  return client as unknown as PrismaClient;
}

export type ClientBorne = PrismaClient;

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
  if (client) {
    // Le plus récemment servi passe en queue : l'éviction vise le moins
    // récemment servi, pas le plus ancien créé — un client remplacé au milieu
    // d'un rendu ferait manquer les `cache()` qui le prennent pour clé.
    CLIENTS.delete(cle);
    CLIENTS.set(cle, client);
  } else {
    if (CLIENTS.size >= MAX_CLIENTS) CLIENTS.delete(CLIENTS.keys().next().value!);
    // L'identifiant lu une seule fois sert à la clé ET au client : un objet à
    // accesseur ne peut pas rendre deux comptes (contre-vérification du lot 2a).
    client = etendre(prisma, { type: "compte", userId: id });
    CLIENTS.set(cle, client);
  }
  return client;
}

/**
 * Le même client borné, construit sur un AUTRE client brut que celui de
 * l'application : le serveur MCP stdio, dont la sortie standard appartient au
 * protocole, a son propre client sans journal sur stdout (`mcp/prisma.ts`).
 * Pas de cache ici : `mcp/db.ts` garde le client de la session stdio, qui ne
 * sert qu'un établissement. Réservé à `auth/compte-hors-session.ts`
 * (`portee/imports.test.ts`).
 */
export function clientBorneSur(base: PrismaClient, portee: Portee): ClientBorne {
  if (portee?.type !== "compte" || typeof portee.userId !== "string" || portee.userId.length === 0)
    throw new ErreurPortee("portée sans identifiant : client refusé");
  return etendre(base, { type: "compte", userId: portee.userId });
}

/** Le client d'une transaction ouverte sur un client borné. */
export type TransactionBornee = Prisma.TransactionClient;
