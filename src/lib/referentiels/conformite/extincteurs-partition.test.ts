import { describe, expect, it } from "vitest";
import { genererProchainesVerifications } from "@/lib/calendrier/generateur";
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

// Un extincteur au CO2 : le tableau A.1 ne lui donne que l'annuelle et la
// révision à dix ans — pas de maintenance approfondie, dont le rythme effectif
// (décennal après un premier pas de cinq ans) se compterait sinon ici. Elle a
// son propre bloc plus bas.
const rythmesDeLExtincteur = (e: EtablissementMatching) =>
  rythmesDeLAppareil(e, "EXTINCTEUR", { typeExtincteur: "co2" });

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
 * La maintenance additionnelle approfondie (NF S 61-919, tableau A.1) dépend
 * du TYPE d'extincteur (item 3 du lot 3) : eau, mousse, poudre → à 5 et
 * 15 ans ; CO2 → aucune ; poudre à opercule scellé → 15 ans seulement, non
 * datée. Au silence, la ligne reste : la règle la plus exigeante survit.
 */
describe("maintenance additionnelle approfondie : le type décide", () => {
  const MAA = "incendie-travail-extincteurs-maintenance-approfondie";
  const lignes = (typeExtincteur: string | undefined) => {
    const applicables = determineObligationsApplicables(etab({}), [
      {
        id: "eq",
        libelle: "Extincteur",
        categorie: "EXTINCTEUR",
        caracteristiques: typeExtincteur ? { typeExtincteur } : null,
      },
    ]);
    return genererProchainesVerifications(applicables, {
      misesEnService: new Map([["eq", new Date("2026-03-01T00:00:00Z")]]),
    }).filter((l) => l.obligationId === MAA);
  };

  it.each([
    ["eau_mousse", 1],
    ["poudre", 1],
    [undefined, 1],
    ["co2", 0],
    ["poudre_opercule_pression_permanente", 0],
  ] as const)("type %s → %i ligne", (type, n) => {
    expect(lignes(type)).toHaveLength(n);
  });

  it("premier pas de cinq ans, puis dix : « à 5 et 15 ans »", () => {
    const [l] = lignes("poudre");
    expect(l.periodicite).toBe("decennale");
    expect(l.sources.premierPas).toBe("quinquennale");
  });
});
