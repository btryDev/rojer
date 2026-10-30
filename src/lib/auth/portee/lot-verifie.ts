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

import { Prisma } from "@prisma/client";
import { dansUnLot, ErreurPortee, estDuCompte } from "./borne";
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
  const m = Prisma.dmmf.datamodel.models.find((x) => x.name === nom);
  if (!m) throw new ErreurPortee(`modèle inconnu : ${nom}`);
  // Lecture des parents et insertion dans le même lot : le relevé des
  // identifiants vus ne vit que le temps de cet appel.
  return dansUnLot(async () => {
    for (const r of m.fields) {
      if (r.kind !== "object" || !estDuCompte(r.type) || r.relationFromFields?.length !== 1) continue;
      const cle = r.relationFromFields[0];
      const ids = [...new Set(lignes.map((l) => l[cle]).filter((v) => v !== undefined && v !== null))];
      if (ids.length === 0) continue;
      const trouves = await delegue(client, r.type).findMany({ where: { id: { in: ids } }, select: { id: true } });
      if (trouves.length !== ids.length)
        throw new ErreurPortee(`${nom}.${cle} : ${ids.length - trouves.length} ligne(s) parente(s) hors du compte`);
    }
    return delegue(client, nom).createMany({ data: lignes, ...options });
  });
}
