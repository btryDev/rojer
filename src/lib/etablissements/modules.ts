import { requireCompte } from "@/lib/auth/compte";
import { cache } from "react";
import { requireLectureSqlProprietaire } from "@/lib/auth/scope";
import { debutDuJour } from "@/lib/dates";
import { instantDuRendu } from "@/lib/dates/instant-du-rendu";
import { Prisma } from "@prisma/client";
import {
  STATUTS_PERMIS_FEU_CLOS,
  STATUTS_PLAN_PREVENTION_CLOS,
} from "@/lib/calendrier/statuts-operations";
import type { SidebarModules } from "@/components/layout/sidebar-nav";

/**
 * État des registres d'un établissement, pour que la navigation sache ce qui
 * le concerne (cf. l'en-tête de `sidebar-nav.ts`).
 *
 * ~~Volontairement minimal : trois comptages, pas de jointure, pas de calcul de
 * fraîcheur.~~ Cette lecture est faite dans le layout, donc sur **chaque page**
 * de l'établissement — elle ne doit jamais devenir un coût de navigation.
 * `getModulesMatrice` reste la source riche du tableau de bord (états des
 * permis, retards de relevés, vigilance) ; ~~les deux partagent les règles
 * d'applicabilité, pas les requêtes.~~ [2026-10-27, plan performance, lot 1 :
 * les deux partagent désormais leurs lectures (`comptesModulesDuRendu`,
 * `carnetDuRendu`) — deux requêtes sur chaque page, comme avant à une près,
 * et aucune de plus sur le tableau de bord.]
 *
 * `estERP` est passé par l'appelant, qui a déjà l'établissement en main.
 *
 * Mémoïsé par `cache()` sur le rendu (audit Next.js du 2026-10-14, H2) — deux
 * clés primitives, l'identifiant et le booléen. Hors rendu RSC, rien n'est
 * mémoïsé.
 *
 * ADR-005 : scope par userId via la relation entreprise.
 */
export const getEtatModules = cache(async function getEtatModules(
  etablissementId: string,
  estERP: boolean,
): Promise<SidebarModules> {
  // Les mêmes comptages que la matrice du tableau de bord, lus une fois par
  // rendu (plan performance, lot 1) : trois requêtes sur chaque page, comme
  // avant — et aucune de plus sur le tableau de bord.
  const comptes = await comptesModulesDuRendu(
    etablissementId,
    debutDuJour(instantDuRendu()).getTime(),
  );
  return {
    estERP,
    nbPermisFeu: comptes.permisFeu.total,
    nbPlansPrevention: comptes.plansPrevention.total,
    carnetSanitaireExiste: comptes.carnet !== null,
  };
});


/**
 * Le carnet sanitaire et sa dernière analyse, lus une fois par rendu : la
 * barre latérale, la matrice et la source des échéances du carnet les
 * partagent (plan performance, lot 1). Portée au compte dans la requête.
 */
export const carnetDuRendu = cache(async function carnetDuRendu(etablissementId: string) {
  const { user, db } = await requireCompte();
  return db.carnetSanitaire.findFirst({
    where: { etablissementId, etablissement: { entreprise: { userId: user.id } } },
    select: {
      id: true,
      analyses: {
        // `createdAt` départage deux analyses du même jour, comme le faisait
        // la source des échéances du carnet, qui lit désormais ici.
        orderBy: [{ dateAnalyse: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { dateAnalyse: true },
      },
    },
  });
});

/**
 * Les comptages des modules complémentaires — permis de feu, plans de
 * prévention, carnet sanitaire —, partagés par la barre latérale
 * (`getEtatModules`) et la matrice du tableau de bord (`getModulesMatrice`),
 * mémoïsés sur le rendu. Un comptage agrégé par table (`count(*) FILTER`) :
 * les permis et les plans s'accumulent avec les années, on les compte dans la
 * base sans les lire.
 *
 * [2026-10-27, plan performance, lot 1] Avant : cinq `count` pour la matrice,
 * deux pour la barre, et deux lectures du carnet, dans le même rendu ;
 * désormais une requête de comptage et une lecture du carnet.
 */
export const comptesModulesDuRendu = cache(async function comptesModulesDuRendu(
  etablissementId: string,
  debutDuJourMs: number,
) {
  // `dateFin` est un instant UTC sans fuseau ; la borne lui est comparée en
  // UTC explicite, quel que soit le fuseau de la session (revue du lot 1) —
  // comme le faisaient les `count` Prisma remplacés.
  const debutSql = Prisma.sql`(${new Date(debutDuJourMs).toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
  // Une requête pour les deux tables (sous-requêtes scalaires), chacune sous
  // la portée au compte. « Ouvert » = tout sauf les statuts qui soldent
  // l'opération (`statuts-operations.ts`) : la règle du calendrier.
  // Le même alias `m` dans chaque sous-requête : un seul prédicat.
  const [[comptes], carnet] = await Promise.all([
    requireLectureSqlProprietaire<{
      permisTotal: bigint;
      permisEchus: bigint;
      plansTotal: bigint;
      plansSansInspection: bigint;
      plansEchus: bigint;
    }>('m."etablissementId"', (proprietaire) => Prisma.sql`
      SELECT
        (SELECT count(*) FROM "PermisFeu" m
          WHERE m."etablissementId" = ${etablissementId} AND ${proprietaire}) AS "permisTotal",
        (SELECT count(*) FROM "PermisFeu" m
          WHERE m."etablissementId" = ${etablissementId} AND ${proprietaire}
            AND m."dateFin" < ${debutSql}
            AND NOT (m."statut"::text = ANY(${[...STATUTS_PERMIS_FEU_CLOS]}::text[]))) AS "permisEchus",
        (SELECT count(*) FROM "PlanPrevention" m
          WHERE m."etablissementId" = ${etablissementId} AND ${proprietaire}) AS "plansTotal",
        (SELECT count(*) FROM "PlanPrevention" m
          WHERE m."etablissementId" = ${etablissementId} AND ${proprietaire}
            AND m."inspectionDate" IS NULL
            AND NOT (m."statut"::text = ANY(${[...STATUTS_PLAN_PREVENTION_CLOS]}::text[]))) AS "plansSansInspection",
        (SELECT count(*) FROM "PlanPrevention" m
          WHERE m."etablissementId" = ${etablissementId} AND ${proprietaire}
            AND m."dateFin" < ${debutSql}
            AND NOT (m."statut"::text = ANY(${[...STATUTS_PLAN_PREVENTION_CLOS]}::text[]))) AS "plansEchus"
    `),
    carnetDuRendu(etablissementId),
  ]);
  return {
    permisFeu: {
      total: Number(comptes.permisTotal),
      echusNonClos: Number(comptes.permisEchus),
    },
    plansPrevention: {
      total: Number(comptes.plansTotal),
      sansInspection: Number(comptes.plansSansInspection),
      echusNonClos: Number(comptes.plansEchus),
    },
    carnet,
  };
});
