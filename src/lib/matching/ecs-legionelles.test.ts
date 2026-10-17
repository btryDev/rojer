import { describe, expect, it } from "vitest";
import { genererProchainesVerifications } from "@/lib/calendrier/generateur";
import { estEtatADeclarer } from "@/lib/etats-permanents/regle";
import { obligationParId } from "@/lib/referentiels/conformite";
import { determineObligationsApplicables } from "./engine";
import type { EquipementMatching, EtablissementMatching } from "./types";

/**
 * Les légionelles au matériel (2026-10-17, sous-lot F, décision de la
 * propriétaire) : une installation `EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC`
 * déclarée en ERP fait naître la température mensuelle et l'analyse annuelle
 * de l'annexe 2 de l'arrêté du 1er février 2010, une ligne de chaque par
 * installation.
 *
 * Pas de liste exhaustive : une borne basse (l'hôtel de 5ᵉ catégorie, cas le
 * plus important de la cible, et un ERP d'un autre type et d'une autre
 * catégorie), une borne haute (un établissement de travail seul, un ERP sans
 * installation déclarée), et la couche voisine — le calendrier, la surface où
 * les lignes atterrissent. Chaque assertion a été éprouvée en cassant le
 * référentiel (commit du 2026-10-17).
 */

const ECS = ["ecs-legionelles-analyse-annuelle", "ecs-temperature-mensuelle"] as const;

const BASE: EtablissementMatching = {
  id: "etab",
  effectifSurSite: 6,
  effectifEntreprise: 6,
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
};

const hotelN5: EtablissementMatching = {
  ...BASE,
  estERP: true,
  typeErp: "O",
  categorieErp: "N5",
  comporteLocauxSommeilPublic: true,
};

const installation = (id: string): EquipementMatching => ({
  id,
  libelle: `Production ECS ${id}`,
  categorie: "EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC",
  caracteristiques: null,
});

function ecsServies(e: EtablissementMatching, parc: EquipementMatching[]): string[] {
  return determineObligationsApplicables(e, parc)
    .map((a) => a.obligation.id)
    .filter((id) => id.startsWith("ecs-"))
    .sort();
}

describe("légionelles — borne basse : un ERP qui déclare l'installation", () => {
  it("un hôtel (O) de 5ᵉ catégorie reçoit les deux lignes", () => {
    expect(ecsServies(hotelN5, [installation("a")])).toEqual([...ECS]);
  });

  it("une salle de sport (X) de 3ᵉ catégorie les reçoit aussi", () => {
    expect(
      ecsServies({ ...BASE, estERP: true, typeErp: "X", categorieErp: "N3" }, [installation("a")]),
    ).toEqual([...ECS]);
  });
});

describe("légionelles — borne haute : rien hors ERP, rien sans installation", () => {
  it("un établissement de travail seul qui déclare l'installation n'en reçoit aucune", () => {
    expect(ecsServies(BASE, [installation("a")])).toEqual([]);
  });

  it("un hôtel sans installation déclarée n'en reçoit aucune — pas de question à l'accueil", () => {
    expect(ecsServies(hotelN5, [])).toEqual([]);
  });
});

describe("légionelles — la surface : le calendrier, une ligne de chaque par installation", () => {
  it("deux installations : deux mensuelles et deux annuelles, aucune à l'écran « en place »", () => {
    const applicables = determineObligationsApplicables(hotelN5, [
      installation("a"),
      installation("b"),
    ]).filter((a) => a.obligation.id.startsWith("ecs-"));
    const lignes = genererProchainesVerifications(applicables);
    const par = (id: string) => lignes.filter((l) => l.obligationId === id);

    const temperature = par("ecs-temperature-mensuelle");
    expect(temperature.map((l) => l.equipementId).sort()).toEqual(["a", "b"]);
    expect(temperature.every((l) => l.periodicite === "mensuelle")).toBe(true);

    const analyse = par("ecs-legionelles-analyse-annuelle");
    expect(analyse.map((l) => l.equipementId).sort()).toEqual(["a", "b"]);
    expect(analyse.every((l) => l.periodicite === "annuelle")).toBe(true);

    for (const id of ECS) {
      expect(estEtatADeclarer(obligationParId(id)!), id).toBe(false);
    }
  });

  it("l'analyse est réalisée par un organisme accrédité, la température par l'exploitant", () => {
    expect(obligationParId("ecs-legionelles-analyse-annuelle")!.realisateurs).toEqual([
      "organisme_accredite",
    ]);
    expect(obligationParId("ecs-temperature-mensuelle")!.realisateurs).toEqual(["exploitant"]);
  });
});
