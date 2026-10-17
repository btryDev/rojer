import { describe, expect, it } from "vitest";
import {
  clesApplicabilite,
  genererProchainesVerifications,
  reconcilierCalendrier,
  type OccurrenceExistante,
} from "@/lib/calendrier/generateur";
import { obligationParId, obligationsConformite, OBLIGATIONS_RETIREES } from "./index";
import type { Obligation } from "./types";
import { determineObligationsApplicables } from "@/lib/matching";
import type { EtablissementMatching } from "@/lib/matching";
import {
  CATEGORIES_ERP,
  type CategorieEquipement,
  type Periodicite,
} from "../types-communs";

/**
 * Un extincteur, un seul rythme par acte — quel que soit le régime (C59 lot 3,
 * ADR-039).
 *
 * L'annuelle et la décennale existent deux fois : écrites par le TEXTE en ERP
 * (MS 38 § 4), retenues de la NORME NF S 61-919 en lieu de travail. Un
 * établissement ERP ET de travail recevait les deux sources pour le même
 * appareil. Un rythme écrit l'emporte toujours : la ligne de la norme porte
 * `erp: false`, et ce test tient la partition sur ce qui compte — le
 * calendrier d'un appareil —, pas sur une liste d'identifiants.
 *
 * Il rougit si l'annuelle ERP est un jour restreinte aux quatre premières
 * catégories sans que la ligne de la norme le soit du même mouvement : la
 * 5ᵉ catégorie n'aurait plus d'annuelle du tout.
 */

const etab = (o: Partial<EtablissementMatching>): EtablissementMatching => ({
  id: "etab",
  effectifSurSite: 8,
  effectifEntreprise: 8,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  typesErpAutres: [],
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
  ...o,
});

const PROFILS: { nom: string; e: EtablissementMatching }[] = [
  { nom: "travail seul", e: etab({}) },
  ...CATEGORIES_ERP.map((categorieErp) => ({
    nom: `travail + ERP ${categorieErp} (type M)`,
    e: etab({ estERP: true, categorieErp, typeErp: "M" as const }),
  })),
  {
    nom: "ERP N5 sans salarié",
    e: etab({ estEtablissementTravail: false, estERP: true, categorieErp: "N5", typeErp: "M" }),
  },
];

function rythmesDeLAppareil(
  e: EtablissementMatching,
  categorie: CategorieEquipement,
  caracteristiques: Record<string, unknown> | null = null,
  obligations?: Obligation[],
): Periodicite[] {
  const applicables = determineObligationsApplicables(
    e,
    [{ id: "eq", libelle: categorie, categorie, caracteristiques }],
    obligations ? { obligations } : undefined,
  );
  return genererProchainesVerifications(applicables)
    .filter((l) => l.equipementId === "eq")
    .map((l) => l.periodicite);
}

// ~~Un extincteur au CO2 : le tableau A.1 ne lui donne que l'annuelle et la
// révision à dix ans — pas de maintenance approfondie […].~~ [2026-10-08, C66 :
// la maintenance approfondie et la question du type sont retirées ; tout
// extincteur a l'annuelle et la décennale, et rien d'autre.]
const rythmesDeLExtincteur = (e: EtablissementMatching) =>
  rythmesDeLAppareil(e, "EXTINCTEUR");

// ~~« une annuelle et une décennale, une seule de chaque, quel que soit le
// régime »~~ — 2026-10-17 (ADR-042, décision de la propriétaire) : la
// révision en atelier hors ERP, dont les dix ans ne viennent que de la norme,
// passe au niveau audit. L'annuelle reste une et une seule partout ; la
// décennale reste une et une seule en ERP (MS 38 § 4), et n'est plus servie
// hors ERP. Jamais deux : la partition tient toujours.
describe("extincteur : une annuelle partout ; une décennale en ERP, aucune hors ERP", () => {
  for (const { nom, e } of PROFILS) {
    it(nom, () => {
      const rythmes = rythmesDeLExtincteur(e);
      expect(rythmes.filter((r) => r === "annuelle"), nom).toHaveLength(1);
      expect(rythmes.filter((r) => r === "decennale"), nom).toHaveLength(e.estERP ? 1 : 0);
    });
  }
});

/**
 * LA PARTITION TIENT ENCORE MARQUEUR LEVÉ (2026-10-17, revue indépendante).
 * Le niveau audit masquait la partition : retirer `erp: false` de la décennale
 * hors ERP, marqueur gardé, laissait tout vert — la ligne n'était servie nulle
 * part, donc jamais en double. Le jour où le marqueur se lève, elle doit
 * retrouver exactement sa place : une décennale et une seule, partout.
 */
const SANS_MARQUEUR: Obligation[] = obligationsConformite.map((o) =>
  o.id === "incendie-travail-extincteurs-revision-atelier-decennale"
    ? ({ ...o, niveau: undefined } as Obligation)
    : o,
);

describe("extincteur, marqueur levé : une décennale et une seule, quel que soit le régime", () => {
  for (const { nom, e } of PROFILS) {
    it(nom, () => {
      const rythmes = rythmesDeLAppareil(e, "EXTINCTEUR", null, SANS_MARQUEUR);
      expect(rythmes.filter((r) => r === "decennale"), nom).toHaveLength(1);
      expect(rythmes.filter((r) => r === "annuelle"), nom).toHaveLength(1);
    });
  }
});

/**
 * Même partition pour le RIA et le désenfumage (item 6 du lot 3) : en ERP,
 * MS 73 et DF 10 écrivent l'annuelle ; en lieu de travail hors ERP, Rojer
 * retient le défaut annuel de `R. 4224-17`. Une annuelle, une seule.
 */
describe("RIA et désenfumage : une annuelle et une seule, quel que soit le régime", () => {
  for (const categorie of ["RIA", "DESENFUMAGE"] as const) {
    for (const { nom, e } of PROFILS) {
      it(`${categorie} — ${nom}`, () => {
        const rythmes = rythmesDeLAppareil(e, categorie);
        expect(rythmes.filter((r) => r === "annuelle"), nom).toHaveLength(1);
      });
    }
  }
});

/**
 * ~~La maintenance additionnelle approfondie (NF S 61-919, tableau A.1) dépend
 * du TYPE d'extincteur~~ et ~~le halon : l'annuelle reste, la révision suit le
 * régime~~ — deux blocs retirés le 2026-10-08 (C66) avec l'obligation, la
 * question `typeExtincteur` et sa condition sur la décennale. Décision de la
 * propriétaire : « on s'en tient à ce que dit Julien », qui a fourni la norme
 * pour l'annuelle et la décennale dans tous les établissements. Le bloc du
 * haut tient désormais « une annuelle et une décennale » pour tout extincteur,
 * y compris s'il porte encore en base une ancienne valeur de type :
 */
describe("une ancienne valeur `typeExtincteur` en base est inerte", () => {
  for (const typeExtincteur of ["halon", "co2", "poudre_opercule_pression_permanente"]) {
    it(typeExtincteur, () => {
      // 2026-10-17 : ~~une décennale, deux rythmes~~ — hors ERP, la décennale
      // est au niveau audit (ADR-042) ; il reste l'annuelle seule.
      const rythmes = rythmesDeLAppareil(etab({}), "EXTINCTEUR", { typeExtincteur });
      expect(rythmes.filter((r) => r === "annuelle")).toHaveLength(1);
      expect(rythmes.filter((r) => r === "decennale")).toHaveLength(0);
      expect(rythmes).toHaveLength(1);
      // Le type reste inerte en ERP aussi, où la décennale est servie.
      const erp = rythmesDeLAppareil(
        etab({ estERP: true, categorieErp: "N3", typeErp: "M" }),
        "EXTINCTEUR",
        { typeExtincteur },
      );
      expect(erp.filter((r) => r === "decennale")).toHaveLength(1);
    });
  }
});

/**
 * Appareils de cuisson (C66, 2026-10-08) : en ERP, GC 22 écrit l'annuelle des
 * appareils et de leurs dispositifs de sécurité ; en lieu de travail hors
 * ERP, Rojer retient le défaut annuel de `R. 4224-17` (« idem code du
 * travail », le préventeur). Le même acte, une seule fois par appareil, quel
 * que soit le régime. Compté sur l'ACTE (fondement GC 22 ou R. 4224-17, rythme
 * annuel) : les autres annuelles de l'appareil — GZ 15, MS 73 — sont d'autres
 * actes.
 */
describe("appareil de cuisson : une annuelle de l'appareil et une seule, quel que soit le régime", () => {
  for (const { nom, e } of PROFILS) {
    it(nom, () => {
      const applicables = determineObligationsApplicables(e, [
        { id: "eq", libelle: "Four", categorie: "APPAREIL_CUISSON_ERP", caracteristiques: null },
      ]);
      const fondements = new Map(
        applicables.map((a) => [a.obligation.id, a.obligation.referencesLegales[0].article]),
      );
      const lignes = genererProchainesVerifications(applicables).filter(
        (l) =>
          l.equipementId === "eq" &&
          l.periodicite === "annuelle" &&
          ["GC 22", "R. 4224-17"].includes(fondements.get(l.obligationId) ?? ""),
      );
      expect(lignes, nom).toHaveLength(1);
    });
  }
});

/**
 * Équipement d'alarme (C66, 2026-10-08) : en ERP, MS 73 § 2 écrit la
 * vérification annuelle du SSI et de l'équipement d'alarme ; en lieu de
 * travail hors ERP, Rojer retient le défaut annuel de `R. 4224-17` (le
 * préventeur : « si présent maintenance vérification annuelle »). Le même
 * acte, une seule fois par alarme, quel que soit le régime. Compté sur l'ACTE
 * (fondement MS 73 ou R. 4224-17, rythme annuel) : l'essai semestriel des
 * signaux (arrêté du 4 novembre 1993, art. 15) est porté par l'établissement,
 * et la triennale ou l'hebdomadaire du SSI ne sont pas annuelles.
 */
describe("alarme : une annuelle de l'appareil et une seule, quel que soit le régime", () => {
  for (const { nom, e } of PROFILS) {
    it(nom, () => {
      const applicables = determineObligationsApplicables(e, [
        { id: "eq", libelle: "Alarme", categorie: "ALARME_INCENDIE", caracteristiques: null },
      ]);
      const fondements = new Map(
        applicables.map((a) => [a.obligation.id, a.obligation.referencesLegales[0].article]),
      );
      const lignes = genererProchainesVerifications(applicables).filter(
        (l) =>
          l.equipementId === "eq" &&
          l.periodicite === "annuelle" &&
          ["MS 73", "R. 4224-17"].includes(fondements.get(l.obligationId) ?? ""),
      );
      expect(lignes, nom).toHaveLength(1);
    });
  }
});

/**
 * Le retrait de la maintenance approfondie (C66, 2026-10-08) suit le chemin
 * du lot 5 : l'id est inscrit à `OBLIGATIONS_RETIREES`, sans absorbant, et la
 * réconciliation archive la ligne qui porte une trace, supprime l'autre.
 */
describe("maintenance approfondie retirée : archivée avec trace, supprimée sans", () => {
  const MAA = "incendie-travail-extincteurs-maintenance-approfondie";
  const NOW = new Date("2026-10-08T09:00:00Z");
  const ligne = (id: string, porteUnePreuve: boolean): OccurrenceExistante => ({
    id,
    obligationId: MAA,
    equipementId: "eq",
    libelleObligation: "Maintenance additionnelle approfondie",
    periodicite: "decennale",
    realisateurRequis: ["personne_competente", "personne_qualifiee"],
    datePrevue: new Date("2031-03-01T00:00:00Z"),
    statut: "a_planifier",
    porteUnePreuve,
    dernierResultat: null,
    suiviDepuis: NOW,
  });

  it("l'identifiant est retiré, sans absorbant, et n'est plus au référentiel", () => {
    expect(obligationParId(MAA)).toBeUndefined();
    expect(OBLIGATIONS_RETIREES[MAA]?.absorbePar).toBeNull();
  });

  it("la passe d'un extincteur de lieu de travail archive l'une et supprime l'autre", () => {
    const applicables = determineObligationsApplicables(etab({}), [
      { id: "eq", libelle: "Extincteur", categorie: "EXTINCTEUR", caracteristiques: { typeExtincteur: "poudre" } },
    ]);
    const plan = reconcilierCalendrier(
      [ligne("v-trace", true)],
      genererProchainesVerifications(applicables),
      { now: NOW, obligationsEncoreApplicables: clesApplicabilite(applicables) },
    );
    expect(plan.aArchiver).toEqual([{ id: "v-trace" }]);
    const plan2 = reconcilierCalendrier(
      [ligne("v-nue", false)],
      genererProchainesVerifications(applicables),
      { now: NOW, obligationsEncoreApplicables: clesApplicabilite(applicables) },
    );
    expect(plan2.aSupprimer).toEqual(["v-nue"]);
  });
});
