import "server-only";
import { prisma } from "@/lib/prisma";
import { ORDRE_RAPPORT_PLUS_RECENT } from "@/lib/rapports/derniere-realisation";
import { requireUser } from "@/lib/auth/require-user";
import type { StatutAction } from "@prisma/client";
import { cache } from "react";
import { JOURS_HORIZON_PROCHE, ajouterJours, debutDuJour } from "@/lib/dates";
import { STATUTS_ACTION_OUVERTE, joursDeRetard } from "@/lib/dates/retard";

// ~~`"libre"`~~ — retirée le 2026-10-24 : une action sans origine est
// impossible (CHECK `Action_origine_xor`, ADR-002), le filtre « Libres » ne
// pouvait rien montrer.
export type OrigineAction = "duerp" | "verification";

export type FiltresPlanActions = {
  origine?: OrigineAction;
  statut?: StatutAction;
  /** criticité minimale (>=) */
  criticiteMin?: number;
  /** true = masquer les levées/abandonnées */
  enCoursSeulement?: boolean;
};

export async function listerActions(
  etablissementId: string,
  filtres: FiltresPlanActions = {},
) {
  const user = await requireUser();
  const where: Parameters<typeof prisma.action.findMany>[0] = {
    where: {
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
    },
  };

  where.where = { ...where.where, ...clauseOrigine(filtres.origine) };

  if (filtres.statut) {
    where.where = { ...where.where, statut: filtres.statut };
  } else if (filtres.enCoursSeulement) {
    where.where = {
      ...where.where,
      statut: { in: ["ouverte", "en_cours"] },
    };
  }

  if (filtres.criticiteMin !== undefined) {
    where.where = {
      ...where.where,
      criticite: { gte: filtres.criticiteMin },
    };
  }

  return prisma.action.findMany({
    ...where,
    include: {
      risque: {
        include: { unite: { include: { duerp: true } } },
      },
      verification: {
        // `salarie` : une action née d'une échéance nominative doit nommer la
        // personne, pas « Tout l'établissement » (ADR-023).
        include: { equipement: true, salarie: true },
      },
    },
    orderBy: [
      { statut: "asc" }, // ouverte / en_cours avant le reste
      { echeance: "asc" },
      { criticite: "desc" },
    ],
  });
}

export type ActionListee = Awaited<ReturnType<typeof listerActions>>[number];

export function origineDeLAction(a: {
  risqueId: string | null;
  verificationId: string | null;
}): OrigineAction {
  // XOR garanti par la base (`Action_origine_xor`) : sans risque, c'est une
  // vérification.
  return a.risqueId ? "duerp" : "verification";
}

export async function getAction(id: string) {
  const user = await requireUser();
  const action = await prisma.action.findFirst({
    where: { id, etablissement: { entreprise: { userId: user.id } } },
    include: {
      risque: {
        include: { unite: { include: { duerp: true } } },
      },
      verification: {
        include: {
          equipement: true,
          salarie: true,
          rapports: {
            orderBy: ORDRE_RAPPORT_PLUS_RECENT,
          },
        },
      },
      etablissement: {
        select: { id: true, raisonDisplay: true },
      },
      // ADR-048 : l'appareil qu'un contrôle d'ensemble a désigné, et le
      // rapport qui a relevé le point.
      equipement: { select: { id: true, libelle: true } },
      rapportOrigine: { select: { id: true, dateRapport: true, resultat: true } },
    },
  });
  if (!action) return null;

  // Le rapport choisi comme justificatif de clôture (`cloturerAction`). La
  // colonne `leveeRapportId` n'a pas de relation Prisma : on le relit, borné à
  // l'établissement de l'action comme à l'écriture. Il était enregistré et
  // affiché nulle part (audit du 2026-10-12). `null` alors que l'id est posé :
  // le rapport a été supprimé depuis, et la fiche le dit.
  const leveeRapport = action.leveeRapportId
    ? await prisma.rapportVerification.findFirst({
        where: {
          id: action.leveeRapportId,
          etablissementId: action.etablissementId,
        },
        select: { id: true, dateRapport: true, fichierNomOriginal: true },
      })
    : null;
  return { ...action, leveeRapport };
}

/**
 * Compteurs du plan d'actions (tableau de bord, en-tête de la page,
 * synthèses PDF). Agrégats calculés en base pour rester performants même
 * à volume.
 *
 * Toutes les bornes de date sont prises au **début du jour civil de
 * Paris** (ADR-011). Comparer `echeance` à `new Date()` brut faisait
 * basculer « en retard » une action due aujourd'hui dès 02:00 heure de
 * Paris — l'échéance est stockée à minuit UTC — alors que l'utilisateur a
 * toute sa journée. Le calendrier, lui, normalisait déjà : les deux
 * écrans annonçaient des nombres différents le matin.
 */
/**
 * Restreint un `where` à une origine d'action, exactement comme
 * `listerActions`. Extraite pour que la liste et ses compteurs ne puissent
 * plus diverger : ils divergeaient, et l'écran affichait « 12 en retard » en
 * rose au-dessus de trois lignes filtrées.
 */
function clauseOrigine(origine: OrigineAction | undefined) {
  if (origine === "duerp") return { risqueId: { not: null } };
  if (origine === "verification") return { verificationId: { not: null } };
  return {};
}

export async function compterActions(
  etablissementId: string,
  now: Date = new Date(),
  /**
   * Le filtre appliqué à la liste que ces compteurs coiffent. Par défaut
   * aucun — les appelants qui résument l'ensemble du plan (sidebar, PDF) ne
   * changent pas.
   *
   * La charte l'impose : « un en-tête ne doit jamais contredire ce qu'il
   * coiffe ; les compteurs se calculent sur ce qui est réellement affiché,
   * filtre compris ».
   */
  filtres: { origine?: OrigineAction } = {},
) {
  return compteursActionsDuRendu(
    etablissementId,
    debutDuJour(now).getTime(),
    filtres.origine,
  );
}

/**
 * Le corps de `compterActions`, mémoïsé par `cache()` sur le rendu (audit
 * Next.js du 2026-10-14, H2) : la barre latérale et le tableau de bord en
 * demandaient chacun les cinq comptages, dans le même rendu.
 *
 * LA CLÉ EST LE DÉBUT DU JOUR, EN MILLISECONDES, et non l'instant : c'est la
 * seule chose que le calcul lit de l'horloge. Deux appelants qui prennent
 * chacun leur `new Date()` à quelques millisecondes d'écart tombent donc sur
 * la même entrée — et sur le même résultat, puisque le calcul ne pouvait pas
 * les distinguer. `cache()` compare par identité : un `Date` ne serait jamais
 * deux fois le même. Hors rendu RSC (PDF, actions), rien n'est mémoïsé.
 *
 * Plus d'actions ne naissent ni ne bougent pendant un rendu : le partage entre
 * le layout et la page, rendus en parallèle, ne lit rien de périmé.
 */
const compteursActionsDuRendu = cache(async function compteursActionsDuRendu(
  etablissementId: string,
  debutDuJourMs: number,
  origine: OrigineAction | undefined,
) {
  const user = await requireUser();
  const scope = {
    etablissementId,
    etablissement: { entreprise: { userId: user.id } },
    ...clauseOrigine(origine),
  } as const;
  const debut = new Date(debutDuJourMs);
  // Le module de dates expose la liste en `readonly string[]` — il reste
  // utilisable côté client, sans importer l'enum Prisma. Le cast n'élargit
  // rien : les deux littéraux sont bien des `StatutAction`.
  const ouvertesOuEnCours = {
    in: [...STATUTS_ACTION_OUVERTE] as StatutAction[],
  };

  const [ouvertes, enCours, enRetard, sansEcheance, leveesRecemment] =
    await Promise.all([
      prisma.action.count({
        where: { ...scope, statut: "ouverte" },
      }),
      prisma.action.count({
        where: { ...scope, statut: "en_cours" },
      }),
      prisma.action.count({
        where: {
          ...scope,
          statut: ouvertesOuEnCours,
          echeance: { lt: debut },
        },
      }),
      // Angle mort du plan d'actions : sans date, une action n'apparaît
      // ni au calendrier, ni dans la frise, ni dans les « 30 prochains
      // jours », et ne peut par construction jamais être « en retard ».
      // Elle n'est pas fautive — elle est invisible. Ce compteur permet à
      // l'interface d'inviter à la dater, sur le modèle du « sans date »
      // déjà affiché pour les vérifications à planifier.
      prisma.action.count({
        where: { ...scope, statut: ouvertesOuEnCours, echeance: null },
      }),
      prisma.action.count({
        where: {
          ...scope,
          statut: "levee",
          leveeLe: { gte: ajouterJours(debut, -JOURS_HORIZON_PROCHE) },
        },
      }),
    ]);

  return {
    ouvertes,
    enCours,
    enRetard,
    /** Actions ouvertes qu'aucune date ne porte — à dater, pas à traiter. */
    sansEcheance,
    leveesRecemment, // sur 30 derniers jours
    totalACouvrir: ouvertes + enCours,
  };
});

export type StatsRetardActions = {
  nb: number;
  /** Retard moyen en jours sur l'ensemble des actions en retard. */
  retardMoyenJours: number;
  /** L'action la plus anciennement dépassée, pour l'accroche du widget. */
  plusAncienne: { id: string; libelle: string; joursRetard: number } | null;
};

/**
 * Statistiques sur les actions dont l'échéance est dépassée.
 *
 * Requête dédiée qui lit TOUTES les échéances dépassées : une moyenne
 * calculée sur une liste tronquée serait fausse dès que l'établissement
 * dépasse la limite.
 *
 * Même borne que `compterActions` — le début du jour civil. Avec la borne
 * précédente (`new Date()` brut), les actions dues **aujourd'hui**
 * entraient dans le lot avec un retard de zéro jour et tiraient la
 * moyenne vers le bas : le widget annonçait « 4 jours de retard moyen »
 * sur un plan d'actions qui en accusait le double.
 */
export async function statsActionsEnRetard(
  etablissementId: string,
  now: Date = new Date(),
  /** Le widget du plan d'actions lit les mesures du DUERP (ADR-048, lot 3). */
  filtres: { origine?: OrigineAction } = {},
): Promise<StatsRetardActions> {
  const user = await requireUser();

  const enRetard = await prisma.action.findMany({
    where: {
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
      ...clauseOrigine(filtres.origine),
      statut: { in: [...STATUTS_ACTION_OUVERTE] as StatutAction[] },
      echeance: { lt: debutDuJour(now) },
    },
    select: { id: true, libelle: true, echeance: true },
    orderBy: { echeance: "asc" },
  });

  if (enRetard.length === 0) {
    return { nb: 0, retardMoyenJours: 0, plusAncienne: null };
  }

  // `echeance` est non-null par construction du filtre de date, et le
  // retard se compte en **jours civils** : la veille vaut 1, jamais 0.
  const retards = enRetard.map((a) => joursDeRetard(a.echeance as Date, now));
  const moyenne = Math.round(
    retards.reduce((s, j) => s + j, 0) / retards.length,
  );

  return {
    nb: enRetard.length,
    retardMoyenJours: moyenne,
    plusAncienne: {
      id: enRetard[0].id,
      libelle: enRetard[0].libelle,
      joursRetard: retards[0],
    },
  };
}

// ~~`listerActionsDeLaVerification`~~ — remplacée le 2026-10-24 par
// `listerPointsDuControle` (`points-a-corriger/queries.ts`, ADR-048).
