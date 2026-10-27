import { describe, expect, it } from "vitest";
import { estEtatADeclarer } from "@/lib/etats-permanents/regle";
import { obligationParId } from "@/lib/referentiels/conformite";
import { determineObligationsApplicables } from "./engine";
import type { EquipementMatching, EtablissementMatching } from "./types";

/**
 * Le code du sport (2026-10-17, sous-lot E, décisions de la propriétaire) :
 * deux lignes d'établissement.
 *   - R. 322-4 (trousse, moyen d'alerte, tableau des secours) : type d'ERP X,
 *     toutes catégories ;
 *   - R. 322-25 (plan de vérification et registre des buts et paniers) : tout
 *     établissement qui déclare la catégorie `BUT_PANIER_SPORTIF`.
 *
 * Borne basse (une salle X en 5ᵉ et en 2ᵉ, un hôtel avec un terrain), borne
 * haute (un restaurant, un établissement de travail seul, une salle X sans
 * but), couche voisine (l'écran « en place »). Chaque assertion a été éprouvée
 * en cassant le référentiel (commit du 2026-10-17).
 */

const SECOURS = "sport-etablissement-secours-r322-4";
const BUTS = "sport-etablissement-buts-plan-verification";

const BASE: EtablissementMatching = {
  id: "etab",
  effectifSurSite: 4,
  effectifEntreprise: 4,
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

const erp = (typeErp: "X" | "N" | "O", categorieErp: "N2" | "N5"): EtablissementMatching => ({
  ...BASE,
  estERP: true,
  typeErp,
  categorieErp,
});

const but: EquipementMatching = {
  id: "b1",
  libelle: "Cage de handball",
  categorie: "BUT_PANIER_SPORTIF",
  caracteristiques: null,
};

const sport = (e: EtablissementMatching, parc: EquipementMatching[] = []) =>
  determineObligationsApplicables(e, parc)
    .map((a) => a.obligation.id)
    .filter((id) => id.startsWith("sport-"))
    .sort();

describe("code du sport — borne basse", () => {
  it("une salle de sport (X) de 5ᵉ catégorie sans but : la ligne des secours seule", () => {
    expect(sport(erp("X", "N5"))).toEqual([SECOURS]);
  });

  it("une salle X de 2ᵉ catégorie qui déclare un but : les deux lignes", () => {
    expect(sport(erp("X", "N2"), [but])).toEqual([BUTS, SECOURS].sort());
  });

  it("un hôtel (O) avec un terrain qui déclare un but : la ligne des buts, pas celle des secours", () => {
    expect(sport(erp("O", "N5"), [but])).toEqual([BUTS]);
  });

  it("un établissement de travail seul qui déclare un but : la ligne des buts (champ de R. 322-19 non borné)", () => {
    expect(sport(BASE, [but])).toEqual([BUTS]);
  });

  it("X déclaré en second type suffit pour les secours (ADR-045)", () => {
    expect(sport({ ...erp("N", "N5"), typesErpAutres: ["X"] })).toEqual([SECOURS]);
  });
});

describe("code du sport — borne haute", () => {
  it("un restaurant (N) sans but : aucune ligne", () => {
    expect(sport(erp("N", "N5"))).toEqual([]);
  });

  it("un établissement de travail seul sans but : aucune ligne", () => {
    expect(sport(BASE)).toEqual([]);
  });
});

describe("code du sport — la surface", () => {
  it("les deux lignes se déclarent « en place », sans rythme inventé", () => {
    for (const id of [SECOURS, BUTS]) {
      const o = obligationParId(id)!;
      expect(estEtatADeclarer(o), id).toBe(true);
      expect(o.periodicite, id).toBe("autre");
      expect((o as { rythmeRetenu?: unknown }).rythmeRetenu, id).toBeUndefined();
    }
  });
});
