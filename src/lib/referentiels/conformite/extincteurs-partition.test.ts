import { describe, expect, it } from "vitest";
import {
  clesApplicabilite,
  genererProchainesVerifications,
  reconcilierCalendrier,
  type OccurrenceExistante,
} from "@/lib/calendrier/generateur";
import { obligationParId, OBLIGATIONS_RETIREES } from "./index";
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
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  chiffonsImpregnes: null,
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
): Periodicite[] {
  const applicables = determineObligationsApplicables(e, [
    { id: "eq", libelle: categorie, categorie, caracteristiques },
  ]);
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

describe("extincteur : une annuelle et une décennale, une seule de chaque, quel que soit le régime", () => {
  for (const { nom, e } of PROFILS) {
    it(nom, () => {
      const rythmes = rythmesDeLExtincteur(e);
      expect(rythmes.filter((r) => r === "annuelle"), nom).toHaveLength(1);
      expect(rythmes.filter((r) => r === "decennale"), nom).toHaveLength(1);
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
      const rythmes = rythmesDeLAppareil(etab({}), "EXTINCTEUR", { typeExtincteur });
      expect(rythmes.filter((r) => r === "annuelle")).toHaveLength(1);
      expect(rythmes.filter((r) => r === "decennale")).toHaveLength(1);
      expect(rythmes).toHaveLength(2);
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
