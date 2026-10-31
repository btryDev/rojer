import "server-only";
// `createMany` sur le client borné (ADR-051, constats du lot 1) : Prisma
// n'accepte pas de `connect` dans un `createMany`, la borne ne peut donc pas y
// être portée par la requête. Cette fonction lit d'abord, par le client qu'on
// lui passe — celui de la transaction en cours, donc dans la même
// transaction —, les lignes parentes que chaque clé étrangère désigne. La
// lecture étant bornée, une ligne d'un autre compte n'est pas rendue : s'il en
// manque une, rien n'est inséré. Le client retient les identifiants rendus
// dans un lot qui ne dure que cet appel (`dansUnLot`, `noterVus`), et c'est ce
// relevé qui lui fait accepter le `createMany`.

import type { Prisma } from "@prisma/client";
import { clesDuCompte, dansUnLot, ErreurPortee } from "./borne";
import type { ClientBorne, TransactionBornee } from "./client";

type Ligne = Record<string, unknown>;
type Delegue = {
  findMany(a: { where: Ligne; select: { id: true } }): Promise<{ id: string }[]>;
  createMany(a: Ligne): Promise<{ count: number }>;
};

function delegue(client: ClientBorne | TransactionBornee, nom: string): Delegue {
  const cle = nom.charAt(0).toLowerCase() + nom.slice(1);
  return (client as unknown as Record<string, Delegue>)[cle];
}

export async function creerEnLotVerifie(
  client: ClientBorne | TransactionBornee,
  nom: Prisma.ModelName,
  lignes: Ligne[],
  options: { skipDuplicates?: boolean } = {},
): Promise<{ count: number }> {
  // Rien à insérer : ni lecture, ni transaction.
  if (lignes.length === 0) return { count: 0 };
  // Hors transaction, la vérification et l'insertion partiraient chacune de
  // leur côté (mesuré le 2026-10-30) : on en ouvre une.
  if ("$transaction" in client && typeof client.$transaction === "function")
    return client.$transaction((tx) => creerEnLotVerifie(tx, nom, lignes, options));
  // Lecture des parents et insertion dans le même lot : le relevé des
  // identifiants vus ne vit que le temps de cet appel. Les clés sont celles de
  // la table de borne.ts (clés simples vers `id`, vérifiées au chargement).
  return dansUnLot(async () => {
    for (const { cle, cible } of clesDuCompte(nom)) {
      const ids = [...new Set(lignes.map((l) => l[cle]).filter((v) => v !== undefined && v !== null))];
      if (ids.length === 0) continue;
      const trouves = await delegue(client, cible).findMany({ where: { id: { in: ids } }, select: { id: true } });
      if (trouves.length !== ids.length)
        throw new ErreurPortee(`${nom}.${cle} : ${ids.length - trouves.length} ligne(s) parente(s) hors du compte`);
    }
    return delegue(client, nom).createMany({ data: lignes, ...options });
  });
}
