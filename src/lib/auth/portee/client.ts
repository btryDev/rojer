import "server-only";
// Le client Prisma borné à une portée (ADR-051 § 2) : un compte, et pour un
// accès sans session un établissement de ce compte. ~~[La portée
// « établissement » n'est pas faite : jetons et MCP sont bornés au compte
// propriétaire, décision de la propriétaire du 2026-10-30.]~~ [2026-11-09 :
// faite, `Portee.etablissementId` — ADR-051, « Portée d'un établissement ».] Il ajoute la
// borne à chaque opération de modèle, même si l'appelant l'oublie, et refuse
// ce qu'il ne sait pas borner. Il ne s'obtient qu'avec une portée : sans
// elle, pas de client.
//
// Le SQL brut (`$queryRaw`, `$executeRaw`) n'est pas borné par l'extension :
// sa propre garde le tient (ADR-051 § 5).

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  argumentsBornes,
  ErreurLectureSeule,
  ErreurPortee,
  estLectureDIdentifiants,
  noterVus,
  sqlPeutEcrire,
  type Portee,
} from "./borne";
import { transactionEnCours, verifierGel, verifierSaisieOuverte } from "./gel";

function etendre(base: PrismaClient, p: Portee) {
  // Copie figée : un appelant qui garderait l'objet ne peut plus déplacer la
  // portée d'un client déjà en cache (revue du lot 2a).
  const portee: Portee = Object.freeze({
    type: "compte",
    compteId: p.compteId,
    userId: p.userId,
    lectureSeule: p.lectureSeule === true,
    geles: p.geles,
    saisieFermee: p.saisieFermee,
    etablissementId: p.etablissementId,
  });
  // Le SQL brut d'écriture n'est pas borné par l'extension (ADR-051 § 5) ; en
  // lecture seule, il est refusé ici (ADR-054 § 4). La forme non paramétrée
  // est interdite dans tout le dépôt par la garde du SQL brut. Les lectures brutes ont
  // leur propre garde (`requireLectureSqlProprietaire`).
  const refuserEnLecture = (operation: string) => {
    if (portee.lectureSeule) throw new ErreurLectureSeule(operation);
  };
  // Typé comme le client brut : l'extension ne porte que sur les ARGUMENTS
  // des requêtes (`query`), elle n'ajoute ni modèle, ni champ, ni méthode —
  // l'API à l'exécution est la même. Le type étendu de Prisma, lui, n'est pas
  // assignable à `Prisma.TransactionClient` et perdait le type des `include` :
  // les utilitaires qui reçoivent un client ou une transaction les acceptent
  // ainsi sans changer de signature.
  const client = base.$extends({
    name: "borne-au-compte",
    query: {
      // La saisie fermée vaut aussi pour le SQL brut écrit par ce client
      // (`ecrireReponseFermee`, registre) : même lecture d'abonnement.
      async $executeRaw({ args, query }) {
        refuserEnLecture("$executeRaw");
        if (portee.saisieFermee) verifierSaisieOuverte("$executeRaw", "update");
        return query(args);
      },
      // Une lecture brute qui écrirait (`UPDATE … RETURNING`) est refusée en
      // lecture seule, comme `$executeRaw` (revue de sécurité des lots 3-4).
      async $queryRaw({ args, query }) {
        if ((portee.lectureSeule || portee.saisieFermee) && sqlPeutEcrire(texteSql(args))) {
          refuserEnLecture("$queryRaw");
          if (portee.saisieFermee) verifierSaisieOuverte("$queryRaw", "update");
        }
        return query(args);
      },
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Le gel (ADR-053 § 14) : refusé avant d'écrire, sur les arguments
          // tels que l'action les donne.
          // La saisie fermée d'abord : synchrone, sans lecture, et son message est le bon.
          if (portee.saisieFermee) verifierSaisieOuverte(model, operation);
          if (portee.geles) await verifierGel(base, model, operation, args, { ...portee, geles: portee.geles });
          const resultat = await query(argumentsBornes(model, operation, args, portee) as typeof args);
          if (estLectureDIdentifiants(operation, args)) noterVus(model, portee, resultat);
          return resultat;
        },
      },
    },
  });
  // La transaction interactive en cours est suivie : le gel y lit (`gel.ts`).
  return new Proxy(client as unknown as PrismaClient, {
    get(cible, cle, recepteur) {
      const valeur = Reflect.get(cible, cle, recepteur);
      if (cle !== "$transaction" || typeof valeur !== "function") return valeur;
      return (ops: unknown, ...reste: unknown[]) =>
        valeur.call(
          cible,
          typeof ops === "function" ? (tx: object) => transactionEnCours.run(tx, () => ops(tx)) : ops,
          ...reste,
        );
    },
  });
}

/** Le texte d'une requête brute, sous les formes que Prisma passe à l'extension. */
function texteSql(args: unknown): string {
  const a = Array.isArray(args) ? args[0] : args;
  if (a && typeof a === "object" && "strings" in a && Array.isArray((a as { strings: unknown }).strings))
    return ((a as { strings: string[] }).strings).join(" ? ");
  if (a && typeof a === "object" && "sql" in a) return String((a as { sql: unknown }).sql);
  return String(a ?? "");
}

export type ClientBorne = PrismaClient;

// Un client par portée, gardé : `$extends` est peu coûteux, mais un rendu en
// demande des dizaines. La clé est la portée entière (compte, personne, lecture seule, gel, établissement) ; un
// client borné à X n'est rendu qu'à du code qui s'est authentifié comme X.
const CLIENTS = new Map<string, ClientBorne>();
const MAX_CLIENTS = 500;

/** Un identifiant : une chaîne non vide. */
const nonVide = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/** Une portée valide, lue UNE fois (un objet à accesseur ne peut pas en rendre deux). */
function lirePortee(portee: Portee): Portee {
  if (portee?.type !== "compte")
    throw new ErreurPortee("seule la portée de compte existe (un établissement s'y ajoute) : client refusé");
  const compteId = portee.compteId;
  const userId = portee.userId;
  if (!nonVide(compteId))
    throw new ErreurPortee("portée sans compte : client refusé");
  if (userId !== null && !nonVide(userId))
    throw new ErreurPortee("portée à la personne invalide : client refusé");
  const etablissementId = portee.etablissementId;
  if (etablissementId !== undefined && !nonVide(etablissementId))
    throw new ErreurPortee("portée d'établissement invalide : client refusé");
  // Le gel, figé (`gelesDuCompte` ne rend jamais un gel vide).
  const g = portee.geles;
  const geles = g && Object.freeze({ etablissements: Object.freeze([...g.etablissements]), prestataires: Object.freeze([...g.prestataires]) });
  const saisieFermee = portee.saisieFermee === true ? (true as const) : undefined;
  return { type: "compte", compteId, userId, lectureSeule: portee.lectureSeule === true, geles, saisieFermee, etablissementId };
}

export function clientBorne(portee: Portee): ClientBorne {
  const lue = lirePortee(portee);
  const gel = lue.geles ? `|gel:${lue.geles.etablissements.join(",")};${lue.geles.prestataires.join(",")}` : "";
  const etab = lue.etablissementId === undefined ? "" : `|etab:${lue.etablissementId}`;
  const fermee = lue.saisieFermee ? "|fermee" : "";
  const cle = `compte:${lue.compteId}|${lue.userId ?? "-"}|${lue.lectureSeule ? "lecture" : "saisie"}${gel}${fermee}${etab}`;
  let client = CLIENTS.get(cle);
  if (client) {
    // Le plus récemment servi passe en queue : l'éviction vise le moins
    // récemment servi, pas le plus ancien créé — un client remplacé au milieu
    // d'un rendu ferait manquer les `cache()` qui le prennent pour clé.
    CLIENTS.delete(cle);
    CLIENTS.set(cle, client);
  } else {
    if (CLIENTS.size >= MAX_CLIENTS) CLIENTS.delete(CLIENTS.keys().next().value!);
    // La portée lue une seule fois sert à la clé ET au client : un objet à
    // accesseur ne peut pas rendre deux comptes (contre-vérification du lot 2a).
    client = etendre(prisma, lue);
    CLIENTS.set(cle, client);
  }
  return client;
}

/**
 * Le même client borné, construit sur un AUTRE client brut que celui de
 * l'application : le serveur MCP stdio, dont la sortie standard appartient au
 * protocole, a son propre client sans journal sur stdout (`mcp/prisma.ts`).
 * Pas de cache ici : `mcp/db.ts` construit le client de la session stdio une
 * fois, au démarrage. Réservé à `auth/compte-hors-session.ts`
 * (`portee/imports.test.ts`).
 */
export function clientBorneSur(base: PrismaClient, portee: Portee): ClientBorne {
  return etendre(base, lirePortee(portee));
}

/** Le client d'une transaction ouverte sur un client borné. */
export type TransactionBornee = Prisma.TransactionClient;
