import "server-only";
import { requireCompte } from "@/lib/auth/compte";
import { ORDRE_RAPPORT_PLUS_RECENT } from "@/lib/rapports/derniere-realisation";
import type { StatutAction } from "@prisma/client";
import { cache } from "react";
import { JOURS_HORIZON_PROCHE, ajouterJours, debutDuJour } from "@/lib/dates";
import {
  STATUTS_ACTION_OUVERTE,
  estActionEnRetard,
  estActionSansEcheance,
  joursDeRetard,
} from "@/lib/dates/retard";
import { instantDuRendu } from "@/lib/dates/instant-du-rendu";

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
  const { db } = await requireCompte();
  const where: Parameters<typeof db.action.findMany>[0] = {
    where: {
      etablissementId,
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

  return db.action.findMany({
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
  const { db } = await requireCompte();
  const action = await db.action.findFirst({
    where: { id },
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
    ? await db.rapportVerification.findFirst({
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
 * synthèses PDF). ~~Agrégats calculés en base pour rester performants même
 * à volume.~~ [2026-10-27, plan performance, lot 1 : comptés en mémoire sur
 * UNE lecture des actions suivies — ouvertes ou en cours, et levées des
 * trente derniers jours —, partagée sur le rendu. Bornée par les actions à
 * traiter, pas par l'historique : les actions closes ne sont pas lues.]
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
// Sa forme en mémoire, pour les compteurs : `estDOrigine`, plus bas.
function clauseOrigine(origine: OrigineAction | undefined) {
  if (origine === "duerp") return { risqueId: { not: null } };
  if (origine === "verification") return { verificationId: { not: null } };
  return {};
}

export async function compterActions(
  etablissementId: string,
  now: Date = instantDuRendu(),
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
  const debut = debutDuJour(now);
  return compterLesActions(
    await actionsSuiviesDuRendu(etablissementId, debut.getTime()),
    debut,
    filtres.origine,
  );
}

/** Ce que les compteurs et les retards lisent d'une action. */
type ActionSuivie = {
  id: string;
  libelle: string;
  statut: StatutAction;
  echeance: Date | null;
  leveeLe: Date | null;
  risqueId: string | null;
  verificationId: string | null;
};

/** La règle de `clauseOrigine`, sur une action déjà lue : les deux formes
 *  restent côte à côte en esprit — la liste filtre en base, les compteurs en
 *  mémoire — et se citent l'une l'autre pour ne pas diverger. */
const estDOrigine = (a: ActionSuivie, origine: OrigineAction | undefined) =>
  origine === "duerp"
    ? a.risqueId !== null
    : origine === "verification"
      ? a.verificationId !== null
      : true;

/**
 * Les actions que les compteurs et les retards lisent — ouvertes ou en cours,
 * plus les levées des trente derniers jours —, toutes origines confondues, en
 * UNE requête mémoïsée sur le rendu (`cache()`).
 *
 * [2026-10-27, plan performance, lot 1] Remplace cinq `count` par origine
 * demandée, plus la lecture des retards : le tableau de bord et la barre
 * latérale en faisaient dix, plus une. Les actions closes depuis plus de
 * trente jours, l'historique qui grossit, ne sont pas lues.
 *
 * LA CLÉ EST LE DÉBUT DU JOUR, EN MILLISECONDES, et non l'instant : c'est la
 * seule chose que le calcul lit de l'horloge. Deux appelants qui prennent
 * chacun leur `new Date()` à quelques millisecondes d'écart tombent donc sur
 * la même entrée. `cache()` compare par identité : un `Date` ne serait jamais
 * deux fois le même. Hors rendu RSC (PDF, actions), rien n'est mémoïsé.
 */
export const actionsSuiviesDuRendu = cache(async function actionsSuiviesDuRendu(
  etablissementId: string,
  debutDuJourMs: number,
): Promise<ActionSuivie[]> {
  const { db } = await requireCompte();
  return db.action.findMany({
    where: {
      etablissementId,
      OR: [
        // Le module de dates expose la liste en `readonly string[]` — il reste
        // utilisable côté client, sans importer l'enum Prisma. Le cast
        // n'élargit rien : les deux littéraux sont bien des `StatutAction`.
        { statut: { in: [...STATUTS_ACTION_OUVERTE] as StatutAction[] } },
        {
          statut: "levee",
          leveeLe: { gte: ajouterJours(new Date(debutDuJourMs), -JOURS_HORIZON_PROCHE) },
        },
      ],
    },
    select: {
      id: true,
      libelle: true,
      statut: true,
      echeance: true,
      leveeLe: true,
      risqueId: true,
      verificationId: true,
    },
  });
});

/**
 * Les compteurs des deux origines — mesures du DUERP, points relevés par un
 * rapport — sur UNE lecture des actions suivies. Pour les appelants hors
 * rendu (PDF), où `cache()` ne mémoïse pas et où deux `compterActions`
 * liraient deux fois les mêmes actions (revue du lot 1).
 */
export async function compterActionsParOrigine(
  etablissementId: string,
  now: Date = instantDuRendu(),
) {
  const debut = debutDuJour(now);
  const actions = await actionsSuiviesDuRendu(etablissementId, debut.getTime());
  return {
    duerp: compterLesActions(actions, debut, "duerp"),
    verification: compterLesActions(actions, debut, "verification"),
  };
}

/** Les compteurs du plan d'actions sur les actions suivies. Pure. */
function compterLesActions(
  actions: readonly ActionSuivie[],
  debut: Date,
  origine: OrigineAction | undefined,
) {
  const retenues = actions.filter((a) => estDOrigine(a, origine));
  const ouvertes = retenues.filter((a) => a.statut === "ouverte").length;
  const enCours = retenues.filter((a) => a.statut === "en_cours").length;
  const limiteLevee = ajouterJours(debut, -JOURS_HORIZON_PROCHE).getTime();
  return {
    ouvertes,
    enCours,
    // Les prédicats partagés du plan d'actions (`dates/retard.ts`) : la borne
    // est le début du jour civil, que `debut` est déjà.
    enRetard: retenues.filter((a) => estActionEnRetard(a, debut)).length,
    // Angle mort du plan d'actions : sans date, une action n'apparaît ni au
    // calendrier, ni dans la frise, ni dans les « 30 prochains jours », et ne
    // peut par construction jamais être « en retard ». Elle n'est pas fautive
    // — elle est invisible. Ce compteur permet à l'interface d'inviter à la
    // dater, sur le modèle du « sans date » déjà affiché pour les
    // vérifications à planifier.
    /** Actions ouvertes qu'aucune date ne porte — à dater, pas à traiter. */
    sansEcheance: retenues.filter(estActionSansEcheance).length,
    leveesRecemment: retenues.filter(
      (a) => a.statut === "levee" && a.leveeLe !== null && a.leveeLe.getTime() >= limiteLevee,
    ).length, // sur 30 derniers jours
    totalACouvrir: ouvertes + enCours,
  };
}

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
  now: Date = instantDuRendu(),
  /** Le widget du plan d'actions lit les mesures du DUERP (ADR-048, lot 3). */
  filtres: { origine?: OrigineAction } = {},
): Promise<StatsRetardActions> {
  // Les mêmes actions que les compteurs, lues une fois par rendu (lot 1 du
  // plan performance) : en retard = ouverte ou en cours, échéance avant le
  // début du jour civil, la plus ancienne d'abord.
  const debut = debutDuJour(now);
  const enRetard = (await actionsSuiviesDuRendu(etablissementId, debut.getTime()))
    .filter(
      (a) => estDOrigine(a, filtres.origine) && estActionEnRetard(a, debut),
    )
    .sort((a, b) => (a.echeance as Date).getTime() - (b.echeance as Date).getTime());

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
