import { describe, expect, it } from "vitest";
import {
  autresMembresDuGeste,
  obligationParId,
  obligationsConformite,
} from "@/lib/referentiels/conformite";
import { gesteDe, intervenantsCommuns } from "@/lib/referentiels/conformite/geste";
import { estPorteeParEquipement } from "@/lib/referentiels/conformite/types";
import {
  CATEGORIES_EQUIPEMENT,
  type CategorieEquipement,
} from "@/lib/referentiels/types-communs";
import {
  clesApplicabilite,
  genererProchainesVerifications,
  reconcilierCalendrier,
  type OccurrenceExistante,
} from "@/lib/calendrier/generateur";
import { determineObligationsApplicables, obligationsSuivies } from "./engine";
import { appliquerPrescriptions } from "./prescriptions";
import type {
  EquipementMatching,
  EtablissementMatching,
  PrescriptionMatching,
} from "./types";

/**
 * Un geste, une ligne par appareil (ADR-057, décisions de la propriétaire du
 * 2026-11-05). Les régimes se cumulent ; quand ils demandent le même acte sur
 * le même appareil, et qu'un même intervenant peut le faire pour tous, le
 * dirigeant ne voit qu'une ligne : le rythme le plus court, toutes les
 * références, l'intervenant que tous les textes admettent. Restent deux
 * lignes : l'électricité du Code du travail et celle de l'ERP, les contrôles
 * de l'ascenseur.
 */

const etab = (o: Partial<EtablissementMatching> = {}): EtablissementMatching => ({
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
  ...o,
});

const TRAVAIL = etab();
const ERP_N5 = etab({ estERP: true, typeErp: "N", categorieErp: "N5" });
const ERP_N3 = etab({ estERP: true, typeErp: "N", categorieErp: "N3" });

const appareil = (categorie: CategorieEquipement, id = "eq"): EquipementMatching => ({
  id,
  libelle: id,
  categorie,
  caracteristiques: null,
});

/** Les lignes de calendrier d'un appareil, telles que le générateur les rend. */
function lignesDe(e: EtablissementMatching, categorie: CategorieEquipement) {
  const applicables = determineObligationsApplicables(e, [appareil(categorie)]);
  return genererProchainesVerifications(applicables, { autresMembresDuGeste })
    .filter((l) => l.equipementId === "eq");
}

describe("le geste — la structure du référentiel", () => {
  const membres = obligationsConformite.filter((o) => gesteDe(o) !== null);

  it("des membres existent, tous portés par l'appareil", () => {
    expect(membres.length).toBeGreaterThan(0);
    for (const o of membres) expect(estPorteeParEquipement(o), o.id).toBe(true);
  });

  it("sur chaque catégorie, un intervenant au moins est admis par tous les membres", () => {
    // La règle de la propriétaire : deux textes qu'aucun intervenant ne
    // satisfait à la fois ne forment pas un geste. Éprouvée sur l'ensemble des
    // membres de chaque catégorie — plus strict que les seuls membres qu'un
    // établissement réunit.
    for (const categorie of CATEGORIES_EQUIPEMENT) {
      const surLaCategorie = membres.filter(
        (o) => estPorteeParEquipement(o) && o.categoriesEquipement.includes(categorie),
      );
      if (surLaCategorie.length < 2) continue;
      expect(intervenantsCommuns(surLaCategorie), categorie).not.toEqual([]);
    }
  });

  it("les vérifications que la propriétaire garde distinctes ne portent pas de geste", () => {
    for (const id of [
      // Électricité : Code du travail et ERP, deux lignes.
      "elec-travail-periodique-annuelle",
      "elec-erp-cat1-4-annuelle",
      // Ascenseur : CCH et AS 9, deux lignes.
      "ascenseur-controle-technique-quinquennal",
      "ascenseur-erp-verification-quinquennale-as9",
      "ascenseur-examen-annuel-securite",
      // Organisme agréé seul, ou essais de l'exploitant : d'autres actes.
      "incendie-erp-ssi-triennale",
      "incendie-erp-alarme-verification-hebdomadaire",
      "incendie-erp-desenfumage-triennale-mecanique-ssi",
      "incendie-erp-eclairage-securite-essai-mensuel",
      "incendie-erp-baes-annuelle",
    ]) {
      expect(gesteDe(obligationParId(id)!), id).toBeNull();
    }
  });

  it("autresMembresDuGeste : les autres membres, jamais l'obligation elle-même", () => {
    const pe4 = obligationParId("incendie-erp-pe4-entretien-installations-techniques")!;
    const autres = autresMembresDuGeste(pe4);
    expect(autres).toContain("incendie-erp-extincteurs-annuelle");
    expect(autres).not.toContain(pe4.id);
    expect(autresMembresDuGeste(obligationParId("elec-travail-periodique-annuelle")!)).toEqual([]);
  });
});

describe("un geste, une ligne par appareil", () => {
  it("extincteur en ERP de 5ᵉ : une annuelle, l'ERP titulaire, PE 4 et le Code du travail cités, personne compétente", () => {
    const annuelles = lignesDe(ERP_N5, "EXTINCTEUR");
    expect(annuelles).toHaveLength(1);
    const [l] = annuelles;
    expect(l.obligationId).toBe("incendie-erp-extincteurs-annuelle");
    expect(l.periodicite).toBe("annuelle");
    expect(l.fondeeAussiPar).toEqual([
      "incendie-erp-pe4-entretien-installations-techniques",
      "incendie-travail-moyens-lutte",
    ]);
    expect(l.realisateurRequis).toEqual(["personne_competente"]);
  });

  it("extincteur hors ERP : la ligne du Code du travail, seule", () => {
    const [l, ...reste] = lignesDe(TRAVAIL, "EXTINCTEUR");
    expect(reste).toEqual([]);
    expect(l.obligationId).toBe("incendie-travail-moyens-lutte");
    expect(l.fondeeAussiPar).toBeUndefined();
  });

  it("à rythme égal, le rythme écrit par le texte l'emporte sur celui de la norme (ERP N3)", () => {
    // Sans le rang du rythme, l'annuelle du Code du travail (norme), placée
    // plus haut dans le référentiel, prendrait la ligne.
    const [l] = lignesDe(ERP_N3, "EXTINCTEUR");
    expect(l.obligationId).toBe("incendie-erp-extincteurs-annuelle");
    expect(l.fondeeAussiPar).toEqual(["incendie-travail-moyens-lutte"]);
  });

  it("alarme en ERP de 3ᵉ : une annuelle (personne qualifiée), l'hebdomadaire et la triennale à part", () => {
    const lignes = lignesDe(ERP_N3, "ALARME_INCENDIE");
    const annuelles = lignes.filter((l) => l.periodicite === "annuelle");
    expect(annuelles).toHaveLength(1);
    expect(annuelles[0].obligationId).toBe("incendie-erp-ssi-annuelle");
    expect(annuelles[0].fondeeAussiPar).toEqual([
      "incendie-travail-alarme-entretien-verification",
    ]);
    expect(annuelles[0].realisateurRequis).toEqual(["personne_qualifiee"]);
    expect(lignes.map((l) => l.periodicite)).toContain("hebdomadaire");
  });

  it("VMC chez un employeur en ERP : R. 4222-20 et CH 58 sur une seule ligne", () => {
    const annuelles = lignesDe(ERP_N3, "VMC").filter((l) => l.periodicite === "annuelle");
    expect(annuelles).toHaveLength(1);
    expect([annuelles[0].obligationId, ...(annuelles[0].fondeeAussiPar ?? [])].sort()).toEqual([
      "aeration-controle-installations-r4222-20",
      "aeration-erp-chauffage-ventilation-annuelle",
    ]);
    expect(annuelles[0].realisateurRequis).toEqual(["personne_qualifiee"]);
  });

  it("hotte : R. 4222-20 seul, sur l'appareil", () => {
    const ids = lignesDe(TRAVAIL, "HOTTE_PRO").map((l) => l.obligationId);
    expect(ids).toEqual(["aeration-controle-installations-r4222-20"]);
  });

  it("électricité en ERP de 5ᵉ : la vérification du Code du travail et PE 4 restent deux lignes", () => {
    const recurrentes = lignesDe(ERP_N5, "INSTALLATION_ELECTRIQUE").filter((l) =>
      ["annuelle", "triennale"].includes(l.periodicite),
    );
    expect(recurrentes.map((l) => l.obligationId).sort()).toEqual([
      "elec-travail-periodique-annuelle",
      "incendie-erp-pe4-entretien-installations-techniques",
    ]);
    for (const l of recurrentes) expect(l.fondeeAussiPar).toBeUndefined();
  });

  it("ascenseur en ERP de 5ᵉ : PE 4 fait sa ligne, à côté de celles du CCH", () => {
    const ids = lignesDe(ERP_N5, "ASCENSEUR").map((l) => l.obligationId);
    expect(ids).toContain("incendie-erp-pe4-entretien-installations-techniques");
    expect(ids).toContain("ascenseur-controle-technique-quinquennal");
  });

  it("une obligation absorbée n'est pas perdue : `obligationsSuivies` la rend", () => {
    const applicables = determineObligationsApplicables(ERP_N5, [appareil("EXTINCTEUR")]);
    const lignes = applicables.map((a) => a.obligation.id);
    const suivies = obligationsSuivies(applicables).map((o) => o.id);
    expect(lignes).not.toContain("incendie-travail-moyens-lutte");
    expect(suivies).toContain("incendie-travail-moyens-lutte");
    expect(suivies).toContain("incendie-erp-pe4-entretien-installations-techniques");
  });
});

describe("prescription qui vise une obligation absorbée (ADR-035 × ADR-057)", () => {
  const prescription = (
    obligationId: string,
    periodicite: PrescriptionMatching["periodicite"],
  ): PrescriptionMatching => ({
    id: "p-1",
    source: "autre",
    effet: "renforce_periodicite",
    reference: "Arrêté n° 1",
    autorite: "Préfecture",
    dateDocument: new Date("2026-01-01T00:00:00Z"),
    dateFin: null,
    obligationId,
    libelle: null,
    description: null,
    periodicite,
    realisateurRequis: [],
    categorieEquipement: null,
    equipementId: null,
  });
  const MAINTENANT = new Date("2026-11-06T08:00:00Z");
  const parc = [appareil("EXTINCTEUR")];
  const applicables = determineObligationsApplicables(ERP_N5, parc);

  it("plus stricte que la ligne : elle s'applique à la ligne du titulaire", () => {
    const r = appliquerPrescriptions(
      applicables,
      [prescription("incendie-erp-pe4-entretien-installations-techniques", "semestrielle")],
      parc,
      MAINTENANT,
    );
    expect(r.ignorees).toEqual([]);
    const titulaire = r.applicables.find(
      (a) => a.obligation.id === "incendie-erp-extincteurs-annuelle",
    )!;
    expect(titulaire.surcharges?.eq?.periodicite).toBe("semestrielle");
  });

  it("plus stricte que l'obligation visée, mais pas que la ligne : ignorée, avec son motif", () => {
    const r = appliquerPrescriptions(
      applicables,
      [prescription("incendie-erp-pe4-entretien-installations-techniques", "biennale")],
      parc,
      MAINTENANT,
    );
    expect(r.ignorees).toHaveLength(1);
    expect(r.ignorees[0].raison).toContain("rythme au moins aussi strict");
    expect(
      r.applicables.find((a) => a.obligation.id === "incendie-erp-extincteurs-annuelle")!
        .surcharges,
    ).toBeUndefined();
  });
});

describe("le titulaire change : la rangée est reprise, pas barrée", () => {
  it("un lieu de travail devient ERP : la ligne du Code du travail est reprise par l'annuelle ERP", () => {
    const NOW = new Date("2026-11-06T08:00:00Z");
    const existante: OccurrenceExistante = {
      id: "v-ext",
      obligationId: "incendie-travail-moyens-lutte",
      equipementId: "eq",
      libelleObligation: "Maintenance annuelle de l'extincteur",
      periodicite: "annuelle",
      realisateurRequis: ["personne_qualifiee", "personne_competente"],
      datePrevue: new Date("2027-03-01T00:00:00Z"),
      derniereRealisation: new Date("2026-03-01T00:00:00Z"),
      dernierResultat: "conforme",
      statut: "planifiee",
      porteUnePreuve: true,
      suiviDepuis: new Date("2025-01-01T00:00:00Z"),
    };
    const applicables = determineObligationsApplicables(ERP_N3, [appareil("EXTINCTEUR")]);
    const plan = reconcilierCalendrier(
      [existante],
      genererProchainesVerifications(applicables, { autresMembresDuGeste }),
      { now: NOW, obligationsEncoreApplicables: clesApplicabilite(applicables) },
    );
    // Rien ne naît ni ne se barre sur l'appareil (les lignes d'établissement
    // de l'ERP naissent, elles, ce n'est pas le sujet).
    expect(plan.aCreer.filter((c) => c.equipementId === "eq")).toEqual([]);
    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    const maj = plan.aMettreAJour.find((m) => m.id === "v-ext")!;
    expect(maj.obligationId).toBe("incendie-erp-extincteurs-annuelle");
    expect(maj.fondeeAussiPar).toEqual(["incendie-travail-moyens-lutte"]);
  });
});
