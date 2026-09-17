// Ce qui est dépassé — et ce qui arrive — ventilé par famille, source unique.
//
// Deux écrans annonçaient un nombre de retards, et les deux nombres se
// contredisaient : le badge de la sidebar comptait les vérifications
// périodiques, le bandeau du calendrier comptait les familles du registre
// d'échéances (ADR-010). L'écart avait fini par être *documenté*
// dans l'aide de l'écran plutôt que corrigé.
//
// Le tableau de bord, lui, en avait fabriqué deux de plus : son bandeau
// d'accueil additionnait vérifications et actions (deux familles sur
// cinq), et la pastille de son widget « Échéances » comptait les dates
// passées de la frise — donc aussi celles d'un permis de feu **clos**,
// que le registre marque `ok`. Trois nombres sur un écran, aucun faux,
// tous nommés « en retard ».
//
// Il n'y a désormais qu'un seul calcul, ici, appelé par la sidebar, la
// page calendrier et le tableau de bord : les lectures ne peuvent plus
// diverger, et chacune choisit explicitement le périmètre qu'elle annonce
// (ADR-015).

import { compterEtatCalendrier } from "./queries";
import {
  FAMILLE_DE_TYPE,
  TYPES_VERIFICATION,
  filtrerParBatiment,
  listerAutresEcheances,
} from "./echeances";
import type {
  EcheanceCalendrier,
  FamilleEcheance,
  TypeVerification,
} from "./echeances";
import { JOURS_HORIZON_PROCHE } from "@/lib/dates";
import { estDansLesProchainsJours } from "@/lib/dates/retard";
import { dateEnJeuAutre } from "./etats";

/** Une ventilation : le détail par famille, et sa somme. */
export type VentilationEcheances = {
  /** Toute famille est présente, à 0 si vide. */
  parFamille: Record<FamilleEcheance, number>;
  /** Toutes familles confondues. */
  total: number;
};

/**
 * (Le sous-compte `verifications`, qui suivait, est retiré le 2026-09-17 : il
 * n'avait plus de lecteur depuis que l'ADR-015 a ôté du rail le badge
 * « Contrôles matériel », constaté le 2026-08-28 et remesuré ce jour-là.)
 */
export type RetardsParFamille = VentilationEcheances;

/**
 * Ce que le flux des vérifications apporte, ventilé par nature.
 *
 * Un seul nombre suffisait tant que la table `Verification` ne portait
 * qu'une nature. Elle en porte deux depuis l'ADR-023, et le versement en
 * bloc (`parFamille.controle = verifsEnRetard`) attribuait à « Contrôles »
 * les titres devenus « Personnel ». Le paramètre est un enregistrement
 * exhaustif, pas un nombre plus un optionnel : une troisième nature ne
 * compilera pas tant qu'elle n'aura pas dit où elle tombe.
 */
export type VerifsParType = Record<TypeVerification, number>;

/**
 * L'état des échéances d'un établissement, en deux ventilations de même
 * périmètre : ce qui est dépassé, et ce qui tombe dans les trente jours
 * sans l'être encore. Les deux ensembles sont disjoints — une échéance
 * dépassée n'est pas « à venir ».
 */
export type EtatEcheances = {
  retards: RetardsParFamille;
  sous30j: VentilationEcheances;
  /**
   * Vérifications sans date de rendez-vous et pas encore dépassées. Ni
   * un retard ni un engagement daté : annoncé à part, jamais fondu dans
   * les deux ventilations ci-dessus.
   */
  verifsAPlanifier: number;
  /**
   * Vérifications EN RETARD sans échéance connue (`aUnRendezVous`) : déjà
   * comptées dans `retards`, et nommées à part parce qu'aucune frise ni
   * grille ne peut les poser — sans ce compte, elles n'étaient signalées que
   * dans la pastille « N en retard » (relecture des libellés, 2026-09-14).
   */
  verifsEnRetardSansEcheance: number;
};

const FAMILLES: FamilleEcheance[] = [
  "controle",
  "travaux",
  "operations",
  "papiers",
  "personnel",
];

/** Un compteur par famille, toutes à zéro. */
function ventilationVide(): Record<FamilleEcheance, number> {
  return Object.fromEntries(FAMILLES.map((f) => [f, 0])) as Record<
    FamilleEcheance,
    number
  >;
}

function totaliser(
  parFamille: Record<FamilleEcheance, number>,
): VentilationEcheances {
  return {
    parFamille,
    total: FAMILLES.reduce((n, f) => n + parFamille[f], 0),
  };
}

/**
 * Ventile les retards à partir des deux flux déjà chargés.
 *
 * Pure et testée : c'est elle qui garantit que la sidebar, le bandeau du
 * calendrier et le tableau de bord disent la même chose. Le ton `alerte`
 * est le seul marqueur de dépassement du registre (cf. `EcheanceCalendrier`) —
 * pas la date, qui dirait « en retard » d'un permis de feu clos la semaine
 * dernière — et les vérifications arrivent déjà comptées par
 * `compterEtatCalendrier`.
 */
export function repartirRetards(
  autres: EcheanceCalendrier[],
  verifsEnRetard: VerifsParType,
): RetardsParFamille {
  const parFamille = ventilationVide();

  // `+=` et non `=` : deux natures peuvent tomber dans la même famille, et
  // le registre y verse ensuite les siennes. L'affectation en bloc écrasait.
  for (const t of TYPES_VERIFICATION) {
    parFamille[FAMILLE_DE_TYPE[t]] += verifsEnRetard[t];
  }
  for (const e of autres) {
    if (e.tone === "alerte") parFamille[e.famille] += 1;
  }

  return totaliser(parFamille);
}

/**
 * Même ventilation, pour l'horizon proche : ce qui tombe d'aujourd'hui à
 * `JOURS_HORIZON_PROCHE` jours **sans être en retard**.
 *
 * Le registre ne porte pas de compteur « à venir » : une échéance non
 * dépassée y est simplement `ok`, quelle que soit sa date. C'est donc ici
 * qu'on applique la fenêtre, avec le prédicat civil partagé (ADR-011) et
 * l'horloge injectée — la même que celle qui a produit les tons.
 */
export function repartirSous30j(
  autres: EcheanceCalendrier[],
  verifsAVenir: VerifsParType,
  now: Date,
): VentilationEcheances {
  const parFamille = ventilationVide();

  for (const t of TYPES_VERIFICATION) {
    parFamille[FAMILLE_DE_TYPE[t]] += verifsAVenir[t];
  }
  for (const e of autres) {
    if (e.tone === "alerte") continue;
    // La date EN JEU : la fin d'une opération en cours, pas son début passé —
    // la même que la règle du calendrier, pour que les deux « sous 30 j »
    // comptent la même chose (`dateEnJeuAutre`).
    if (estDansLesProchainsJours(dateEnJeuAutre(e, now), now, JOURS_HORIZON_PROCHE)) {
      parFamille[e.famille] += 1;
    }
  }

  return totaliser(parFamille);
}

/**
 * Les mêmes échéances, lues en base.
 *
 * L'horloge est capturée **une fois** et partagée par les deux lectures :
 * deux `new Date()` séparés peuvent tomber de part et d'autre de minuit
 * et produire deux fenêtres décalées d'un jour (même précaution que
 * `listerEvenementsCalendrier`).
 *
 * `batimentId` restreint les deux flux au même lieu (ADR-019) : les
 * vérifications par leur équipement, le registre par `filtrerParBatiment`,
 * qui laisse passer ce qui concerne l'établissement entier.
 */
export async function compterEtatEcheances(
  etablissementId: string,
  now: Date = new Date(),
  filtres: { batimentId?: string } = {},
): Promise<EtatEcheances> {
  const [etat, autresTous] = await Promise.all([
    compterEtatCalendrier(etablissementId, now, {
      batimentId: filtres.batimentId,
    }),
    listerAutresEcheances(etablissementId, now),
  ]);
  const autres = filtrerParBatiment(autresTous, filtres.batimentId);

  return {
    retards: repartirRetards(autres, etat.enRetardParType),
    sous30j: repartirSous30j(autres, etat.aVenirParType, now),
    verifsAPlanifier: etat.aPlanifier,
    verifsEnRetardSansEcheance: etat.enRetardSansEcheance,
  };
}

/**
 * Les seuls retards — ce que lit la sidebar, qui n'a pas de fenêtre à
 * annoncer.
 */
export async function compterEnRetardParFamille(
  etablissementId: string,
  now: Date = new Date(),
): Promise<RetardsParFamille> {
  const { retards } = await compterEtatEcheances(etablissementId, now);
  return retards;
}
