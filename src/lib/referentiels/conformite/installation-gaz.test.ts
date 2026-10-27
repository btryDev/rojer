import { describe, expect, it } from "vitest";
import {
  determineObligationsApplicables,
  type EtablissementMatching,
} from "@/lib/matching";
import { obligationParId } from "./index";
import { estPorteeParEquipement } from "./types";
import type { CategorieErp } from "@/lib/referentiels/types-communs";

// 2026-10-14, décision de la propriétaire : la vérification annuelle de
// GZ 15 vise toutes les installations de gaz des ERP des quatre premières
// catégories, pas seulement la cuisine. Le défaut n° 1 de
// `docs/chantiers-ouverts.md` (« Gaz sans cuisine ») était : un commerce de
// 3ᵉ catégorie chauffé au gaz, sans appareil de cuisson déclaré, ne recevait
// rien. Éprouvé en retirant `INSTALLATION_GAZ` de `categoriesEquipement` : le
// premier test rougit.

const GZ15 = "cuisson-gaz-installations-annuelle";

function commerce(categorieErp: CategorieErp | null): EtablissementMatching {
  return {
    id: "etab",
    effectifSurSite: 6,
    effectifEntreprise: 6,
    estEtablissementTravail: true,
    estERP: categorieErp !== null,
    estIGH: false,
    estHabitation: false,
    typeErp: categorieErp !== null ? "M" : null,
    typesErpAutres: [],
    categorieErp,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    effectifPublicAdmis: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
    ssiCategorieAouB: null,
  };
}

const chaufferieGaz = [
  { id: "gaz", libelle: "x", categorie: "INSTALLATION_GAZ" as const, caracteristiques: null },
];

const ids = (etab: EtablissementMatching) =>
  determineObligationsApplicables(etab, chaufferieGaz).map((a) => a.obligation.id);

describe("Installation de gaz (2026-10-14) : GZ 15 sans cuisine", () => {
  it("un commerce de 3ᵉ catégorie qui déclare son installation de gaz reçoit la vérification annuelle", () => {
    expect(ids(commerce("N3"))).toContain(GZ15);
  });

  it("borne : ni en 5ᵉ catégorie, ni hors ERP — GZ 15 relève du livre II", () => {
    expect(ids(commerce("N5"))).not.toContain(GZ15);
    expect(ids(commerce(null))).not.toContain(GZ15);
  });

  it("l'appareil de cuisson garde sa ligne : la catégorie s'ajoute, elle ne remplace pas", () => {
    const o = obligationParId(GZ15)!;
    expect(estPorteeParEquipement(o) ? o.categoriesEquipement : null).toEqual([
      "APPAREIL_CUISSON_ERP",
      "INSTALLATION_GAZ",
    ]);
  });

  it("le libellé ne parle pas de cuisson : GZ 15 vise toutes les installations de gaz", () => {
    const o = obligationParId(GZ15)!;
    expect(`${o.libelle} ${o.description}`).not.toMatch(/cuisson|cuisine/i);
  });
});
