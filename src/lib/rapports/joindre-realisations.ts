// La jointure « dernière réalisation » pour des lignes déjà lues, par le client
// Prisma de l'application.
//
// Séparée de `derniere-realisation.ts`, qui reste pur, pour une raison
// précise : le serveur MCP a son propre client (`lib/mcp/prisma.ts`) et lit ce
// module-là. S'il importait celui-ci, il chargerait un second client.
// [2026-10-14, audit Next.js M5 : le MCP lit désormais ~~`dbMcp()`~~ [2026-10-31 :
// le client borné de `clientMcp`]
// (`lib/mcp/db.ts`) — le client commun dans le processus web, `prismaMcp`
// dans le seul serveur stdio. La séparation reste juste : en stdio, ce module
// interrogerait le client commun, qui écrit ses requêtes sur stdout en dev.]

import { cache } from "react";
import { Prisma } from "@prisma/client";
import { requireLectureSqlProprietaire } from "@/lib/auth/scope";
import {
  ORDRE_RAPPORT_PLUS_RECENT,
  type DerniereRealisation,
} from "./derniere-realisation";
import {
  projeterDernieresRealisations,
  type AvecDerniereRealisation,
} from "./projeter-realisations";
import { RESULTATS_REALISES } from "./resultats";

/**
 * `ORDRE_RAPPORT_PLUS_RECENT` en SQL, DÉRIVÉ de la constante et non recopié :
 * l'ordre était déjà recopié à huit endroits avant l'audit du 2026-09-19, et
 * une copie qui perd son second terme désigne un autre « dernier rapport » que
 * le moteur.
 */
function ordreRapportPlusRecentSql(alias: string): Prisma.Sql {
  return Prisma.raw(
    ORDRE_RAPPORT_PLUS_RECENT.flatMap((terme) =>
      Object.entries(terme).map(([colonne, sens]) => `${alias}."${colonne}" ${sens.toUpperCase()}`),
    ).join(", "),
  );
}

/** Le dernier rapport d'une ligne : son identifiant, sa date, son résultat. */
export type DernierRapport = { id: string } & DerniereRealisation;

/**
 * Le dernier rapport de chaque ligne d'un établissement — réalisé seulement,
 * ou tout résultat —, une ligne par échéance, calculé par la base
 * (~~`DISTINCT ON`~~ [2026-10-28 : une descente d'index par ligne, voir
 * plus bas]). La portée au propriétaire est DANS la requête
 * (`requireLectureSqlProprietaire`) : elle ne compte pas sur ses appelants.
 *
 * [2026-10-27, plan performance, lot 1a] Remplace la lecture de TOUS les
 * rapports réalisés départagés en mémoire : sur dix ans d'historique, 290
 * lignes au lieu de 7 888 rapports, sur chaque écran (la barre latérale y
 * passe). Le `distinct` de Prisma 6 se fait en mémoire côté moteur et ne
 * réduisait rien, d'où le SQL. « Réalisé » vient de `RESULTATS_REALISES`, la
 * source de `WHERE_RAPPORT_REALISE` ; l'ordre, d'`ordreRapportPlusRecentSql`.
 * L'équivalence au départage du moteur (`indexerDernieresRealisations`) est
 * tenue contre une vraie base par `joindre-realisations.integration.test.ts`.
 *
 * [2026-10-28, plan performance] Plus de `DISTINCT ON` : il lisait et triait
 * TOUT l'historique de l'établissement à chaque écran — ≈ 12 ms à dix ans,
 * quatre fois plus à quarante (durée de conservation). Désormais une descente
 * d'index par ligne (`LATERAL … LIMIT 1` sur
 * `(verificationId, dateRapport DESC, createdAt DESC)`) : le coût suit le
 * nombre de lignes, borné par la cible, et plus la longueur de l'historique
 * (≈ 1,1 ms mesuré sur le même dossier).
 *
 * Le rapport reste borné à l'établissement par SA colonne `etablissementId`,
 * comme avant et comme le registre (`listerRapportsDeLEtablissement`) : la
 * portée au compte ne s'élargit pas, et le registre et cette lecture voient
 * les mêmes rapports. Seul écart avec l'ancienne requête : un rapport dont la
 * ligne appartiendrait à un autre établissement n'est plus lu — l'unique
 * écriture (`rapports/actions.ts`) recopie l'établissement de la ligne, il
 * ne peut pas exister.
 */
async function lireDerniersRapports(
  etablissementId: string,
  realisesSeulement: boolean,
): Promise<Map<string, DernierRapport>> {
  // La portée se prouve une fois, sur la ligne ; le rapport porte le même
  // établissement (filtre ci-dessous), donc le même propriétaire.
  const lignes = await requireLectureSqlProprietaire<
    { verificationId: string; id: string; dateRapport: Date; resultat: string }
  >('v."etablissementId"', (proprietaire) => Prisma.sql`
    SELECT v."id" AS "verificationId", d."id", d."dateRapport", d."resultat"
    FROM "Verification" v
    CROSS JOIN LATERAL (
      SELECT r."id", r."dateRapport", r."resultat"::text AS "resultat"
      FROM "RapportVerification" r
      WHERE r."verificationId" = v."id"
        AND r."etablissementId" = ${etablissementId}
        AND (${!realisesSeulement} OR r."resultat"::text = ANY(${[...RESULTATS_REALISES]}::text[]))
      ORDER BY ${ordreRapportPlusRecentSql("r")}
      LIMIT 1
    ) d
    WHERE v."etablissementId" = ${etablissementId}
      AND ${proprietaire}
  `);
  return new Map(
    lignes.map((l) => [
      l.verificationId,
      { id: l.id, dateRapport: l.dateRapport, resultat: l.resultat },
    ]),
  );
}

/**
 * La dernière RÉALISATION de chaque ligne de l'établissement, indexée par
 * ligne. Mémoïsée sur le rendu (`cache()`) : la barre latérale, le tableau de
 * bord, le calendrier et le parc la demandent tous — une seule requête par
 * affichage, lançable en parallèle de la lecture des lignes.
 */
export const dernieresRealisationsDeLEtablissement = cache(
  (etablissementId: string) => lireDerniersRapports(etablissementId, true),
);

/**
 * Le dernier rapport de chaque ligne, QUEL QUE SOIT son résultat : celui sous
 * lequel le registre pose les points sans rapport d'origine (`rapports/queries.ts`).
 */
export const derniersRapportsDeLEtablissement = cache(
  (etablissementId: string) => lireDerniersRapports(etablissementId, false),
);

/**
 * Joint à des lignes déjà lues de l'établissement la date et le résultat de
 * leur dernier rapport réalisé — une projection sur l'index mémoïsé.
 *
 * Préféré à un `rapports: { …, take: 1 }` dans l'`include` quand la forme de la
 * ligne circule loin : un champ `rapports` réduit à un seul élément, dans un
 * type que le registre ou un PDF réutilisent, serait lu un jour comme la liste
 * complète.
 */
export async function joindreDernieresRealisations<T extends { id: string }>(
  etablissementId: string,
  lignes: T[],
): Promise<AvecDerniereRealisation<T>[]> {
  if (lignes.length === 0) return [];
  return projeterDernieresRealisations(
    lignes,
    await dernieresRealisationsDeLEtablissement(etablissementId),
  );
}

