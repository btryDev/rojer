// Lectures du tableau de bord.
//
// Une règle traverse ce fichier : **aucune définition du retard n'est écrite
// ici**. Elles vivent toutes dans `@/lib/dates/retard` (ADR-011), et ce
// module se contente de les appliquer. Il en hébergeait trois différentes —
// une par fonction — avec des conséquences visibles à l'écran : la pastille
// rouge « en retard » apparaissait sur la carte de l'équipement et la barre
// rouge dans le graphe mensuel le matin même de l'échéance, pendant que le
// bandeau du calendrier disait « rien en retard ».
//
// Deuxième règle : **les compteurs affichés se calculent sur l'ensemble
// complet**, jamais sur la liste tronquée envoyée au moteur de
// recommandations (même réflexe que `statsActionsEnRetard`, qui refuse de
// moyenner un retard sur une liste coupée).

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { compterActions } from "@/lib/actions/queries";
import { computeVigilance } from "@/lib/prestataires/vigilance";
import { chargerTransmissions } from "./transmissions";
import { obligationParId } from "@/lib/referentiels/conformite";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import {
  MOIS_FENETRE_HISTORIQUE,
  ajouterJours,
  ajouterMois,
  composantesCiviles,
  debutDuJour,
  instantCivil,
  joursCivilsEntre,
} from "@/lib/dates";
import { estActionEnRetard } from "@/lib/dates/retard";
import {
  classerVerification,
  TON_REGISTRE,
  lecturesCalendrier,
} from "@/lib/calendrier/etats";
import { WHERE_RAPPORT_REALISE } from "@/lib/rapports/derniere-realisation";
import { joindreDernieresRealisations } from "@/lib/rapports/joindre-realisations";
import {
  typeDeVerification,
  type BatimentEcheance,
  type TypeVerification,
} from "@/lib/calendrier/echeances";
import { repartirVerifications } from "@/lib/pdf/etat-verifications";
import type { ModulesMatrice } from "./obligations";
import { evaluerEtatDuerp, type EtatDuerp } from "./duerp";
import { calculerScoreDepuisEtat, type Score } from "./score";
import { compterEtatsPermanents } from "@/lib/etats-permanents/queries";
import {
  porteeBatiment,
  toutesLesConditions,
} from "@/lib/calendrier/portee";
import { libellePorteur } from "@/lib/calendrier/labels";
import { estEcheanceContractuelle } from "@/lib/prescriptions/sources";
import {
  genererRecommandations,
  type Recommandation,
} from "./recommandations";

/**
 * Statuts d'une occurrence **ouverte** : elle attend encore sa réalisation.
 * Le pendant des statuts « réalisées », qui restent en base à vie (le
 * registre de sécurité en dépend) et qu'aucune requête d'échéances ne doit
 * ramener.
 */
const STATUTS_VERIF_OUVERTE = ["a_planifier", "planifiee", "depassee"] as const;

/** Statuts d'un permis de feu / plan de prévention encore ouvert : tout sauf
 *  l'état final ou l'abandon. */
const STATUTS_PERMIS_OUVERTS = [
  "brouillon",
  "attente_signatures",
  "valide",
  "en_cours",
] as const;
const STATUTS_PLAN_OUVERTS = [
  "brouillon",
  "inspection_faite",
  "attente_signatures",
  "valide",
] as const;

export type BarMois = {
  mois: number; // 0-11
  annee: number;
  couvert: number;
  aVenir: number;
  retard: number;
};

/**
 * Raccourcit les libellés d'obligation verbeux pour les cartes
 * compactes de la frise.
 * « Vérification périodique annuelle installation électrique »
 *    → « Installation électrique »
 */
function libelleCourt(libelle: string): string {
  return libelle
    .replace(/^V[ée]rification\s+(p[ée]riodique\s+)?(annuelle|semestrielle|trimestrielle|mensuelle|hebdomadaire|biennale|triennale|quinquennale|d[ée]cennale)?\s*(des?\s+|de\s+|du\s+|d['’]\s*)?/i, "")
    .replace(/^Entretien\s+(annuel|semestriel|trimestriel)?\s*(des?\s+|de\s+|du\s+)?/i, "")
    .replace(/^Maintien\s+en\s+bon\s+[ée]tat\s+/i, "")
    .replace(/^Exercice\s+(d['’]\s*)?/i, "")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export type EvenementFenetre = {
  id: string;
  libelle: string;
  date: Date;
  tone: "alerte" | "warn" | "ok";
  /** Ce que la ligne **est** (ADR-016), et donc la famille qui s'en déduit.
   *  Ce flux en porte deux depuis l'ADR-023 : la vérification d'un
   *  équipement et l'échéance du titre d'une personne. Requis — l'oublier
   *  rangerait de nouveau une attestation médicale dans « Contrôles ». */
  type: TypeVerification;
  /** `true` quand la ligne naît d'un engagement contractuel — une demande
   *  d'assureur — et non d'un texte (ADR-032). Les vues calendrier du board
   *  affichent des libellés d'échéance comme les autres surfaces : sans ce
   *  drapeau, elles présentent une exigence d'assurance comme du droit. */
  contractuelle: boolean;
  /** L'appareil, ou « Tout l'établissement » (ADR-022). */
  equipement: string;
  /** Le bâtiment de l'équipement (ADR-019). `null` quand l'échéance porte sur
   *  l'établissement : elle n'est dans aucun bâtiment, et reste donc visible
   *  sous tous les filtres (ADR-010). */
  batiment: BatimentEcheance | null;
};

/**
 * Liste tous les événements de vérification sur une fenêtre glissante
 * de `joursHorizon` jours à partir d'aujourd'hui. Utilisé par les
 * widgets « Semaine » (7 j) et « Météo » (30 j), et par le flux calendrier.
 *
 * Le classement passe par `lecturesCalendrier` — LA règle, partagée avec
 * la page calendrier : une ligne soldée porte encore le rendez-vous
 * suivant de son cycle (`datePrevue` avancée par la réconciliation), et
 * ce rendez-vous entre dans la fenêtre comme n'importe quel futur. La
 * fenêtre l'ignorait (`dateRealisee: null` en base) : un contrôle annuel
 * fait l'an dernier disparaissait de la « Météo 30 j » jusqu'à la relance
 * du cycle. Les lectures « realisation » (le fait, daté au passé) sont
 * écartées : la fenêtre montre la charge, pas l'historique.
 *
 * Tons : `TON_REGISTRE` (alerte = en retard, warn = à planifier, ok = le
 * reste). L'id reste celui de la ligne — une ligne n'émet qu'un événement
 * ici (sa lecture courante OU son prochain rendez-vous), et les appelants
 * s'en servent pour la porte `/verifications/{id}`.
 */
export async function listerEvenementsFenetre(
  etablissementId: string,
  joursHorizon: number,
  filtres?: {
    domaine?: DomaineObligation;
    /** Même sémantique que `listerVerifications` : a_planifier + depassee. */
    urgentsSeulement?: boolean;
    /** Ne garder que les équipements de ce bâtiment (ADR-019). */
    batimentId?: string;
  },
): Promise<EvenementFenetre[]> {
  const user = await requireUser();
  const now = new Date();
  // Borne haute prise en jours civils : la fenêtre « 30 jours » couvre le
  // trentième jour en entier, changements d'heure compris.
  const fin = ajouterJours(debutDuJour(now), joursHorizon);

  const verifs = await prisma.verification.findMany({
    // Composées et non diffusées, comme `listerVerifications` : la portée par
    // bâtiment pose un `OR`, et ce site n'échappait à l'écrasement que parce
    // que sa condition d'urgence porte `statut` et non `OR` — un accident, pas
    // une garantie (cf. `toutesLesConditions`).
    where: toutesLesConditions(
      {
        etablissementId,
        etablissement: { entreprise: { userId: user.id } },
        datePrevue: { lte: fin },
      },
      porteeBatiment(filtres?.batimentId),
      filtres?.urgentsSeulement
        ? { statut: { in: ["a_planifier", "depassee"] } }
        : {},
    ),
    include: {
      equipement: {
        select: {
          libelle: true,
          batiment: { select: { id: true, nom: true } },
        },
      },
      // Le porteur salarié (ADR-023) : sans cette sélection, la ligne
      // d'une personne s'afficherait « Tout l'établissement ».
      salarie: { select: { nom: true, prenom: true } },
      // La source de la prescription : les vues calendrier du board affichent
      // des libellés d'échéance comme les autres surfaces, et doivent donc
      // pouvoir dire lesquelles sont contractuelles (ADR-032).
      prescription: { select: { source: true } },
    },
    orderBy: { datePrevue: "asc" },
  });

  // Filtre par domaine côté TS, comme `listerVerifications` : le domaine
  // est porté par l'obligation en référentiel, pas en base.
  const retenues = filtres?.domaine
    ? verifs.filter(
        (v) => obligationParId(v.obligationId)?.domaine === filtres.domaine,
      )
    : verifs;

  return retenues.flatMap((v) =>
    // `derniereRealisation: null` est un choix, pas un oubli : cette fenêtre
    // n'annonce que des échéances et écarte les réalisations juste en
    // dessous. Les lire coûterait une requête pour les jeter.
    lecturesCalendrier({ ...v, derniereRealisation: null }, now)
      .filter(
        (lec) =>
          lec.lecture !== "realisation" && lec.date.getTime() <= fin.getTime(),
      )
      .map((lec) => ({
        id: v.id,
        libelle: libelleCourt(v.libelleObligation),
        date: lec.date,
        tone: TON_REGISTRE[lec.registre],
        type: typeDeVerification(v),
        contractuelle: estEcheanceContractuelle(v),
        equipement: libellePorteur(v),
        // Pas d'équipement, pas de bâtiment : la ligne reste visible sous
        // tous les filtres par bâtiment (ADR-010, ADR-019).
        batiment: v.equipement?.batiment ?? null,
      })),
  );
}

export type StatsEquipement = {
  enRetard: number;
  aPlanifier: number;
  sous30j: number;
  derniereRealisee: Date | null;
  prochaineDate: Date | null;
};

/**
 * Compte les vérifications par équipement — pour afficher des pastilles
 * de statut sur les cartes du widget « Équipements déclarés ».
 * Retourne une map `equipementId → stats`. Les équipements sans aucune
 * vérification n'apparaissent pas dans la map (l'appelant traite ça
 * comme « aucune vérification »).
 *
 * `enRetard` et `aPlanifier` sont **disjoints** (prédicats partagés) : une
 * occurrence `a_planifier` dont la date est passée compte une fois, comme
 * retard. Elle était auparavant comptée dans les deux pastilles.
 */
export async function compterVerifsParEquipement(
  etablissementId: string,
): Promise<Map<string, StatsEquipement>> {
  const user = await requireUser();
  const now = new Date();
  const debutFenetreHistorique = debutDuJour(
    ajouterMois(now, -MOIS_FENETRE_HISTORIQUE),
  );

  const verifs = await joindreDernieresRealisations(
    await prisma.verification.findMany({
      where: {
        etablissementId,
        etablissement: { entreprise: { userId: user.id } },
      },
      select: {
        id: true,
        equipementId: true,
        statut: true,
        datePrevue: true,
        dateRealisee: true,
        periodicite: true,
        // Sans lui, `lecturesCalendrier` compte encore le rendez-vous suivant
        // d'une obligation qui ne s'applique plus (ADR-034). Le fait se lisait
        // dans le libellé, il a maintenant sa colonne.
        archiveLe: true,
        libelleObligation: true,
      },
    }),
  );

  const map = new Map<string, StatsEquipement>();
  const getStats = (id: string): StatsEquipement => {
    let s = map.get(id);
    if (!s) {
      s = {
        enRetard: 0,
        aPlanifier: 0,
        sous30j: 0,
        derniereRealisee: null,
        prochaineDate: null,
      };
      map.set(id, s);
    }
    return s;
  };

  for (const v of verifs) {
    // Statistiques **par équipement** : une échéance portée par
    // l'établissement (ADR-022) n'appartient à aucun appareil. La compter
    // ici ferait apparaître une entrée sous une clé qui n'est l'id d'aucun
    // équipement, et les écrans qui joignent sur cette Map afficheraient un
    // appareil fantôme.
    if (v.equipementId === null) continue;
    const s = getStats(v.equipementId);
    // UNE LIGNE, UNE ÉCHÉANCE (ADR-034, N4) : plus de dépli. La ligne portait
    // le fait passé et le rendez-vous suivant ; elle ne porte plus que ce
    // dernier, et les contrôles faits se comptent sur les rapports, juste en
    // dessous.
    const etat = classerVerification(v, now);
    if (etat === "enRetard") s.enRetard += 1;
    else if (etat === "aPlanifier") s.aPlanifier += 1;
    else if (etat === "proche") s.sous30j += 1;

    // Prochaine échéance annoncée : seulement une date ARRÊTÉE — le
    // prestataire l'a fixée —, et pas passée. Une ligne « à planifier » porte
    // une date de génération, pas un rendez-vous.
    if (
      v.statut === "planifiee" &&
      etat !== "enRetard" &&
      etat !== "archivee" &&
      etat !== "faite" &&
      (!s.prochaineDate || v.datePrevue < s.prochaineDate)
    ) {
      s.prochaineDate = v.datePrevue;
    }

    // Lue sur les rapports (ADR-034), la colonne gelée en repli pour une ligne
    // d'avant que la réconciliation n'a pas encore remise au modèle.
    const faite = v.derniereRealisation ?? v.dateRealisee;
    if (faite && faite.getTime() >= debutFenetreHistorique.getTime()) {
      if (!s.derniereRealisee || faite > s.derniereRealisee) {
        s.derniereRealisee = faite;
      }
    }
  }

  return map;
}

/**
 * Agrège les vérifications de l'année civile courante par mois, pour les
 * barres du dashboard. Utilisé par `BarsObligations`. Scoping par user
 * via la chaîne etablissement.entreprise.userId.
 *
 * Classification :
 *  - `couvert`  : dernier rapport réalisé daté dans le mois (ADR-034)
 *  - `retard`   : occurrence en retard au sens des prédicats partagés
 *  - `aVenir`   : le reste des occurrences ouvertes
 *
 * On bucket la couverture sur la date du rapport — un rapport réalisé en mai
 * apparaît bien dans le mois de mai, même si la datePrevue était ailleurs.
 * Le mois est lu en heure de Paris, comme partout ailleurs : sur un serveur
 * en UTC, une échéance du 1er du mois à minuit basculait dans le mois
 * précédent.
 */
export async function compterObligationsParMois(
  etablissementId: string,
  annee: number = composantesCiviles(new Date()).annee,
): Promise<BarMois[]> {
  const user = await requireUser();
  const debut = instantCivil(annee, 1, 1);
  const fin = instantCivil(annee + 1, 1, 1);

  const verifs = await joindreDernieresRealisations(
    await prisma.verification.findMany({
      where: {
        etablissementId,
        etablissement: { entreprise: { userId: user.id } },
        OR: [
          { datePrevue: { gte: debut, lt: fin } },
          // Une ligne couverte dans l'année : un rapport réalisé y est daté
          // (ADR-034 — la réalisation vit sur le rapport, plus sur la ligne).
          {
            rapports: {
              some: {
                dateRapport: { gte: debut, lt: fin },
                ...WHERE_RAPPORT_REALISE,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        datePrevue: true,
        dateRealisee: true,
        statut: true,
        periodicite: true,
        // Cf. ci-dessus : l'archivage est un champ (ADR-034). Sans lui, une
        // obligation éteinte continue de peindre des barres.
        archiveLe: true,
        libelleObligation: true,
      },
    }),
  );

  const buckets: BarMois[] = Array.from({ length: 12 }, (_, i) => ({
    mois: i,
    annee,
    couvert: 0,
    aVenir: 0,
    retard: 0,
  }));

  // Même dépli que le calendrier (`lecturesCalendrier`) : une ligne
  // soldée pose sa couverture au mois du fait ET son rendez-vous suivant
  // en charge à venir — la barre ne peint plus la prochaine échéance en
  // « couvert » un cycle trop tôt.
  const now = new Date();
  for (const v of verifs) {
    for (const lec of lecturesCalendrier(v, now)) {
      const c = composantesCiviles(lec.date);
      if (c.annee !== annee) continue;
      const m = c.mois - 1;

      if (lec.registre === "faite") buckets[m].couvert += 1;
      else if (lec.registre === "enRetard") buckets[m].retard += 1;
      else buckets[m].aVenir += 1;
    }
  }

  return buckets;
}

/**
 * Alimente les lignes « modules complémentaires » de la matrice
 * « Vos documents, en un coup d'œil » (voir `ModulesMatrice` pour les
 * règles d'apparition de chaque ligne). Uniquement des comptages et
 * des dates — les faits sont interprétés par `construireMatrice`.
 */
export async function getModulesMatrice(
  etablissementId: string,
  estERP: boolean,
): Promise<ModulesMatrice> {
  const user = await requireUser();
  const scope = {
    etablissementId,
    etablissement: { entreprise: { userId: user.id } },
  } as const;
  const now = new Date();
  // Échu = la date de fin est **antérieure au jour courant**. Comparer à
  // `now` brut faisait passer « échu » un permis qui court encore jusqu'à
  // ce soir.
  const debutJour = debutDuJour(now);

  const [
    accessibilite,
    nbPermis,
    nbPermisEchus,
    nbPlans,
    nbPlansSansInspection,
    nbPlansEchus,
    carnet,
    prestataires,
  ] = await Promise.all([
    prisma.registreAccessibilite.findFirst({
      where: scope,
      select: { publie: true },
    }),
    prisma.permisFeu.count({ where: scope }),
    prisma.permisFeu.count({
      where: {
        ...scope,
        dateFin: { lt: debutJour },
        statut: { in: [...STATUTS_PERMIS_OUVERTS] },
      },
    }),
    prisma.planPrevention.count({ where: scope }),
    prisma.planPrevention.count({
      where: {
        ...scope,
        statut: { in: [...STATUTS_PLAN_OUVERTS] },
        inspectionDate: null,
      },
    }),
    prisma.planPrevention.count({
      where: {
        ...scope,
        dateFin: { lt: debutJour },
        statut: { in: [...STATUTS_PLAN_OUVERTS] },
      },
    }),
    prisma.carnetSanitaire.findFirst({
      where: scope,
      select: {
        id: true,
        analyses: {
          orderBy: { dateAnalyse: "desc" },
          take: 1,
          select: { dateAnalyse: true },
        },
      },
    }),
    prisma.prestataire.findMany({ where: scope }),
  ]);

  // Fraîcheur du carnet sanitaire : mesurée **point par point**.
  //
  // La mesure portait auparavant sur le dernier relevé toutes sondes
  // confondues — un seul point relevé cette semaine suffisait à faire
  // passer la ligne au vert alors que dix autres n'avaient pas été mesurés
  // depuis un an. La pastille n'établissait pas le fait qu'elle prétendait
  // établir. On retient donc le point **le plus en retard**, et on compte à
  // part ceux qui n'ont jamais été relevés (leur ancienneté n'est pas
  // mesurable : elle ne peut pas entrer dans un maximum).
  let jourPointLePlusEnRetard: number | null = null;
  let nbPointsJamaisReleves = 0;
  let nbPoints = 0;
  if (carnet) {
    const points = await prisma.pointReleve.findMany({
      // `carnet.id` sort du `findFirst` scopé ci-dessus, donc la portée est
      // déjà établie — le prédicat est porté quand même, pour que cette
      // lecture ne dépende pas de la provenance de son argument (cf.
      // `docs/rgpd.md` § 7.1, forme A).
      where: {
        carnetId: carnet.id,
        actif: true,
        carnet: { etablissement: { entreprise: { userId: user.id } } },
      },
      select: {
        id: true,
        releves: {
          orderBy: { dateReleve: "desc" },
          take: 1,
          select: { dateReleve: true },
        },
      },
    });
    nbPoints = points.length;
    for (const p of points) {
      const dernier = p.releves[0]?.dateReleve ?? null;
      if (dernier === null) {
        nbPointsJamaisReleves += 1;
        continue;
      }
      const jours = Math.max(0, joursCivilsEntre(dernier, now));
      if (jourPointLePlusEnRetard === null || jours > jourPointLePlusEnRetard) {
        jourPointLePlusEnRetard = jours;
      }
    }
  }
  const derniereAnalyse = carnet?.analyses[0]?.dateAnalyse ?? null;

  return {
    estERP,
    accessibilite: {
      existe: accessibilite !== null,
      publie: accessibilite?.publie ?? false,
    },
    permisFeu: { total: nbPermis, echusNonClos: nbPermisEchus },
    plansPrevention: {
      total: nbPlans,
      sansInspection: nbPlansSansInspection,
      echusNonClos: nbPlansEchus,
    },
    carnetSanitaire: {
      existe: carnet !== null,
      nbPoints,
      nbPointsJamaisReleves,
      jourPointLePlusEnRetard,
      jourDerniereAnalyse: derniereAnalyse
        ? Math.max(0, joursCivilsEntre(derniereAnalyse, now))
        : null,
    },
    prestataires: {
      total: prestataires.length,
      enAlerte: prestataires.filter(
        (p) => computeVigilance(p).alertesOuvertes > 0,
      ).length,
    },
  };
}

export type DashboardData = {
  score: Score;
  recommandations: Recommandation[];
  compteurs: {
    verifsEnRetard: number;
    verifsAPlanifier: number;
    verifsSous30j: number;
    /** Lignes dont le dernier contrôle tombe dans les douze mois ET dont
     *  l'échéance ouverte n'est ni dépassée ni proche — le quatrième ensemble
     *  de `repartirVerifications`, celui qui complète le dénominateur du
     *  score (ADR-034). Ce n'est PAS un compte de rapports. */
    verifsRealisees12m: number;
    /** Les RAPPORTS réalisés déposés sur les douze derniers mois. C'est ce que
     *  les cartes « Rapports 12 m » annoncent, et ce que le registre montre :
     *  une ligne contrôlée quatre fois dans l'année en compte quatre. */
    rapports12m: number;
    actionsOuvertes: number;
    actionsEnCours: number;
    actionsEnRetard: number;
    actionsLeveesRecemment: number;
    /** Toutes les actions jamais créées, quel que soit leur statut — y
     *  compris levées il y a plus de trente jours et abandonnées. Sans lui,
     *  un établissement ayant clôturé ses vingt actions il y a trois mois
     *  s'entendait dire « Plan d'actions : rien en place ». */
    actionsTotal: number;
  };
  duerp: {
    existe: boolean;
    duerpId: string | null;
    derniereVersionAu: Date | null;
    ageJours: number | null;
    /** Aucune échéance de mise à jour dépassée — cf. `EtatDuerp.estAJour`.
     *  Faux tant qu'aucune version n'a été validée. */
    estAJour: boolean;
    /** L'état détaillé, seule source des libellés et du score. */
    etat: EtatDuerp;
  };
};

/**
 * Nombre maximal de vérifications ouvertes transmises au moteur de
 * recommandations. Le moteur n'en retient que cinq ; le plafond n'est là
 * que pour borner la charge d'un dossier très fourni.
 *
 * Il ne s'applique **qu'à la file de propositions** : les compteurs
 * (`verifsEnRetard`…) et le score sont calculés plus haut, sur l'ensemble
 * complet des occurrences. La requête historique, elle, prenait les
 * 30 premières `datePrevue` **sans filtrer les réalisées** : au bout de deux
 * ans d'usage, ces trente lignes étaient toutes des vérifications archivées,
 * le moteur ne voyait plus aucun retard, et le board annonçait « rien à
 * traiter » à côté d'un compteur affichant douze retards.
 */
const MAX_VERIFS_RECOS = 40;

/**
 * Mémoïsé par `cache()` : le layout d'établissement s'en sert pour les badges
 * de la sidebar et la page pour ses widgets, sur le même identifiant et dans le
 * même rendu. Les six requêtes ci-dessous partaient donc en double à chaque
 * chargement du tableau de bord. La portée est celle de la requête HTTP, jamais
 * plus : deux visiteurs ne partagent rien.
 */
export const getDashboardData = cache(async function getDashboardData(
  etablissementId: string,
): Promise<DashboardData> {
  const user = await requireUser();
  const scope = {
    etablissementId,
    etablissement: { entreprise: { userId: user.id } },
  } as const;
  const now = new Date();
  const debutFenetreHistorique = debutDuJour(
    ajouterMois(now, -MOIS_FENETRE_HISTORIQUE),
  );

  const [
    verifications,
    actionsOuvertes,
    compteursActions,
    actionsTotal,
    duerp,
    nbEquipements,
    transmissions,
    nbRapports,
    etatsPermanents,
    rapports12m,
  ] = await Promise.all([
    // Un seul passage sur les vérifications qui comptent : les occurrences
    // ouvertes (toutes, sans plafond — leur nombre est borné par le
    // calendrier généré) et celles réalisées sur la fenêtre d'historique.
    // Les compteurs, le score et la file de propositions décrivent ainsi le
    // même ensemble, comme le fait déjà le dossier de conformité PDF.
    prisma.verification.findMany({
      where: {
        ...scope,
        OR: [
          // Depuis l'ADR-034 une ligne roulée est ouverte ET porte un rapport
          // réalisé : les deux clauses se recouvrent, et c'est juste — la
          // première compte l'échéance, la seconde le fait.
          { dateRealisee: null, statut: { in: [...STATUTS_VERIF_OUVERTE] } },
          {
            rapports: {
              some: {
                dateRapport: { gte: debutFenetreHistorique },
                ...WHERE_RAPPORT_REALISE,
              },
            },
          },
          // Repli : une ligne d'avant, que la réconciliation n'a pas encore
          // remise au modèle, porte encore sa réalisation dans la colonne.
          { dateRealisee: { gte: debutFenetreHistorique } },
        ],
      },
      select: {
        id: true,
        statut: true,
        datePrevue: true,
        dateRealisee: true,
        // L'archivage (ADR-034). Il décide des quatre compteurs, du score et
        // de la file de propositions : une ligne éteinte gelée sur `depassee`
        // les faussait tous les trois d'un coup.
        archiveLe: true,
        libelleObligation: true,
        // La source de la prescription, pour que le board dise ce qu'une
        // ligne contractuelle est (ADR-032). Le tableau de bord est l'écran
        // le plus lu du produit : une échéance d'assureur qui s'y présente
        // comme les autres est présentée comme du droit.
        prescription: { select: { source: true } },
        equipement: { select: { libelle: true } },
        salarie: { select: { nom: true, prenom: true } },
      },
      orderBy: { datePrevue: "asc" },
    }),
    // Toutes les actions encore à traiter. Le compteur « en retard » est
    // recalculé dessus avec le prédicat partagé plutôt que repris de
    // l'agrégat SQL : les deux appliquent la même règle, mais le compteur
    // affiché et la file de propositions décrivent ainsi, par construction,
    // le même ensemble de lignes.
    prisma.action.findMany({
      where: {
        ...scope,
        statut: { in: ["ouverte", "en_cours"] },
      },
      select: {
        id: true,
        statut: true,
        echeance: true,
        libelle: true,
      },
      orderBy: { echeance: "asc" },
    }),
    compterActions(etablissementId),
    prisma.action.count({ where: scope }),
    prisma.duerp.findFirst({
      where: {
        etablissementId,
        etablissement: { entreprise: { userId: user.id } },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        versions: { orderBy: { numero: "desc" }, take: 1 },
        // L'effectif de l'entreprise conditionne la mise à jour annuelle
        // (art. R. 4121-2) — cf. `./duerp`.
        etablissement: {
          select: { entreprise: { select: { effectif: true } } },
        },
      },
    }),
    prisma.equipement.count({ where: scope }),
    // Dans le `Promise.all` et non derrière lui : le rapprochement ne dépend
    // que de `etablissementId` et `user.id`, tous deux disponibles avant.
    // Placé après, il ajoutait trois requêtes sérialisées derrière tout le
    // reste du tableau de bord (ADR-024).
    chargerTransmissions(etablissementId, user.id),
    prisma.rapportVerification.count({
      where: { verification: scope },
    }),
    // Le score ne peut pas conclure « satisfaisante » en ignorant ce que
    // l'écran « Ce qui doit être en place » affiche : un bureau de six
    // personnes sortait à 100 avec treize états non renseignés. Lu par la même
    // entrée que cet écran — deux comptes finiraient par diverger, et c'est le
    // chiffre du tableau de bord qui porterait la version fausse.
    compterEtatsPermanents(etablissementId, user.id),
    // Les rapports RÉALISÉS de la fenêtre, comptés en base : les cartes
    // « Rapports 12 m » parlent de pièces déposées, pas de lignes couvertes,
    // et depuis l'ADR-034 les deux ne coïncident plus.
    prisma.rapportVerification.count({
      where: {
        verification: scope,
        dateRapport: { gte: debutFenetreHistorique },
        ...WHERE_RAPPORT_REALISE,
      },
    }),
  ]);

  // Répartition unique, partagée avec les documents générés : quatre
  // ensembles disjoints, dont la somme sert de dénominateur au score.
  const etatVerifs = repartirVerifications(
    await joindreDernieresRealisations(verifications),
    now,
  );
  const actionsEnRetard = actionsOuvertes.filter((a) =>
    estActionEnRetard(a, now),
  ).length;

  const derniereVersion = duerp?.versions[0] ?? null;
  const etatDuerp = evaluerEtatDuerp(
    {
      ouvert: duerp !== null,
      dateDerniereVersion: derniereVersion?.createdAt ?? null,
      effectif: duerp?.etablissement.entreprise.effectif ?? 0,
    },
    now,
  );

  const score = calculerScoreDepuisEtat({
    verifs: { total: etatVerifs.total, enRetard: etatVerifs.enRetard.length },
    actions: {
      ouvertesTotal: compteursActions.totalACouvrir,
      enRetard: actionsEnRetard,
    },
    duerp: etatDuerp.ouvert ? etatDuerp : null,
    etatsPermanents,
  });

  const recommandations = genererRecommandations(
    {
      etablissementId,
      transmissions,
      // Ordre d'urgence réelle : les retards d'abord (échéance croissante,
      // la plus ancienne en tête), puis ce qui arrive, puis les occurrences
      // sans date arrêtée — dont aucune règle ne tire de proposition, mais
      // dont la seule présence déclenche l'amorçage « premier rapport ».
      // Le plafond ne peut donc jamais faire disparaître un retard.
      verifications: [...etatVerifs.enRetard, ...etatVerifs.aVenir, ...etatVerifs.aPlanifier]
        .slice(0, MAX_VERIFS_RECOS)
        .map((v) => ({
          id: v.id,
          statut: v.statut,
          datePrevue: v.datePrevue,
          dateRealisee: v.dateRealisee,
          archiveLe: v.archiveLe,
          libelleObligation: v.libelleObligation,
          equipementLibelle: libellePorteur(v),
        })),
      actions: actionsOuvertes.map((a) => ({
        id: a.id,
        statut: a.statut,
        echeance: a.echeance,
        libelle: a.libelle,
      })),
      duerp: etatDuerp,
      duerpId: duerp?.id,
      nbEquipements,
      duerpSecteurChoisi: duerp?.referentielSecteurId != null,
      nbRapports,
    },
    { now },
  );

  return {
    score,
    recommandations,
    compteurs: {
      verifsEnRetard: etatVerifs.enRetard.length,
      verifsAPlanifier: etatVerifs.aPlanifier.length,
      verifsSous30j: etatVerifs.aVenir.length,
      verifsRealisees12m: etatVerifs.realisees12m.length,
      rapports12m,
      actionsOuvertes: compteursActions.ouvertes,
      actionsEnCours: compteursActions.enCours,
      actionsEnRetard,
      actionsLeveesRecemment: compteursActions.leveesRecemment,
      actionsTotal,
    },
    duerp: {
      existe: etatDuerp.ouvert,
      duerpId: duerp?.id ?? null,
      derniereVersionAu: derniereVersion?.createdAt ?? null,
      ageJours: etatDuerp.ageJours,
      estAJour: etatDuerp.estAJour,
      etat: etatDuerp,
    },
  };
});
