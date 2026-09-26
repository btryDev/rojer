/**
 * « Chez vous, concrètement » — personnalisation de la page Comprendre.
 *
 * Résout les règles abstraites du guide contre les données réelles de
 * l'établissement, de façon purement déterministe (zéro IA) :
 *   - le rythme de mise à jour du DUERP selon l'effectif (R. 4121-2 :
 *     au moins annuel à partir de onze salariés) ;
 *   - les obligations de vérification réellement applicables, résumées
 *     par domaine, via le moteur de matching (mode explain) ;
 *   - les trous honnêtes : équipements déclarés qui ne déclenchent rien
 *     dans la situation actuelle, absence d'équipement déclaré.
 *
 * Module pur (pas de Prisma, pas d'horloge) — testable en environnement
 * node comme le moteur de matching qu'il consomme.
 */

import { determineObligationsApplicables } from "@/lib/matching";
import type {
  EquipementMatching,
  EtablissementMatching,
} from "@/lib/matching";
import {
  DOMAINES_OBLIGATION,
  type DomaineObligation,
} from "@/lib/referentiels/conformite/types";
import type {
  CategorieEquipement,
  Periodicite,
  Realisateur,
} from "@/lib/referentiels/types-communs";

/** Seuil légal de l'annualité de mise à jour du DUERP (R. 4121-2). */
export const SEUIL_MAJ_ANNUELLE_DUERP = 11;

export type ChezVousDomaine = {
  domaine: DomaineObligation;
  nbObligations: number;
  /** Périodicités distinctes, de la plus fréquente à la plus espacée. */
  periodicites: Periodicite[];
  /** Profils de réalisateur distincts requis sur le domaine. */
  realisateurs: Realisateur[];
  /** Raisons d'applicabilité (mode explain), dédupliquées. */
  raisons: string[];
  /** Libellés distincts des équipements déclencheurs. */
  equipements: string[];
};

export type ChezVous = {
  duerp: {
    /**
     * L'effectif de l'ENTREPRISE — le 1° de `R. 4121-2` vise « les entreprises
     * d'au moins onze salariés ». Jusqu'au 2026-09-26 on lisait l'effectif du
     * site : une entreprise de quinze salariés sur deux sites s'entendait dire
     * que le 1° ne s'appliquait pas. La carte des écrans du document unique et
     * l'outil MCP lisaient déjà l'entreprise.
     */
    effectif: number;
    /** true ⇔ effectif de l'entreprise ≥ 11. */
    misAJourAnnuel: boolean;
  };
  domaines: ChezVousDomaine[];
  /**
   * Catégories d'équipement déclarées qui ne déclenchent aucune obligation
   * dans la situation actuelle (ex. « Autre », ou typologie non couverte).
   * Fait observable, sans jugement d'applicabilité : on dit « rien n'est
   * généré », jamais « rien n'est requis ».
   */
  categoriesSansObligation: CategorieEquipement[];
  aucunEquipement: boolean;
};

/** Ordre « de la plus fréquente à la plus espacée » pour l'affichage. */
const RANG_PERIODICITE: Record<Periodicite, number> = {
  hebdomadaire: 0,
  bimensuelle: 1,
  mensuelle: 2,
  six_semaines: 3,
  trimestrielle: 4,
  semestrielle: 5,
  annuelle: 6,
  biennale: 7,
  triennale: 8,
  quadriennale: 9,
  quinquennale: 10,
  decennale: 11,
  mise_en_service_uniquement: 12,
  autre: 13,
};

export function construireChezVous(
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
  effectifEntreprise: number,
): ChezVous {
  const applicables = determineObligationsApplicables(etab, equipements);

  const parDomaine = new Map<
    DomaineObligation,
    {
      nb: number;
      periodicites: Set<Periodicite>;
      realisateurs: Set<Realisateur>;
      raisons: string[];
      equipements: Set<string>;
    }
  >();

  const categoriesDeclenchantes = new Set<CategorieEquipement>();

  for (const a of applicables) {
    const d = a.obligation.domaine;
    let agg = parDomaine.get(d);
    if (!agg) {
      agg = {
        nb: 0,
        periodicites: new Set(),
        realisateurs: new Set(),
        raisons: [],
        equipements: new Set(),
      };
      parDomaine.set(d, agg);
    }
    agg.nb += 1;
    agg.periodicites.add(a.obligation.periodicite);
    for (const r of a.obligation.realisateurs) agg.realisateurs.add(r);
    for (const raison of a.raisons) {
      if (!agg.raisons.includes(raison)) agg.raisons.push(raison);
    }
    for (const eq of a.equipementsConcernes) {
      agg.equipements.add(eq.libelle);
      categoriesDeclenchantes.add(eq.categorie);
    }
  }

  // Ordre stable : celui du référentiel, pas celui de la Map.
  const domaines: ChezVousDomaine[] = DOMAINES_OBLIGATION.filter((d) =>
    parDomaine.has(d),
  ).map((d) => {
    const agg = parDomaine.get(d)!;
    return {
      domaine: d,
      nbObligations: agg.nb,
      periodicites: [...agg.periodicites].sort(
        (a, b) => RANG_PERIODICITE[a] - RANG_PERIODICITE[b],
      ),
      realisateurs: [...agg.realisateurs],
      raisons: agg.raisons,
      equipements: [...agg.equipements],
    };
  });

  const categoriesDeclarees = new Set<CategorieEquipement>(
    equipements.map((e) => e.categorie),
  );
  const categoriesSansObligation = [...categoriesDeclarees].filter(
    (c) => !categoriesDeclenchantes.has(c),
  );

  return {
    duerp: {
      effectif: effectifEntreprise,
      misAJourAnnuel: effectifEntreprise >= SEUIL_MAJ_ANNUELLE_DUERP,
    },
    domaines,
    categoriesSansObligation,
    aucunEquipement: equipements.length === 0,
  };
}
