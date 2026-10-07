import { describe, expect, it } from "vitest";
import { genererProchainesVerifications } from "@/lib/calendrier/generateur";
import { determineObligationsApplicables } from "@/lib/matching";
import type { EtablissementMatching } from "@/lib/matching";
import { CATEGORIES_ERP, type Periodicite } from "../types-communs";

/**
 * Un extincteur, un seul rythme par acte — quel que soit le régime (C55 lot 3,
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

function rythmesDeLExtincteur(e: EtablissementMatching): Periodicite[] {
  const applicables = determineObligationsApplicables(e, [
    { id: "eq-ext", libelle: "Extincteur", categorie: "EXTINCTEUR", caracteristiques: null },
  ]);
  return genererProchainesVerifications(applicables)
    .filter((l) => l.equipementId === "eq-ext")
    .map((l) => l.periodicite);
}

describe("extincteur : une annuelle et une décennale, une seule de chaque, quel que soit le régime", () => {
  for (const { nom, e } of PROFILS) {
    it(nom, () => {
      const rythmes = rythmesDeLExtincteur(e);
      expect(rythmes.filter((r) => r === "annuelle"), nom).toHaveLength(1);
      expect(rythmes.filter((r) => r === "decennale"), nom).toHaveLength(1);
    });
  }
});
