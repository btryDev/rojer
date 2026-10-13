import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "./engine";
import type { EquipementMatching, EtablissementMatching } from "./types";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/**
 * Deux lignes conditionnées à l'équipement réel (décisions de la propriétaire
 * du 2026-10-13, référentiel `2026-10-13.2`).
 *
 * 1. Le groupe électrogène de sécurité (EL 18 § 4) : les deux lignes ne
 *    naissent que d'un « oui » déclaré sur l'installation électrique. Le
 *    silence et le « non » n'en donnent aucune — ~~un groupe électrogène est un
 *    appareil, une propriété d'équipement absente dit qu'il n'y en a pas~~
 *    [motif rayé le 2026-10-13 : la réponse est exigée en ERP,
 *    `equipements/reponses-exigees.test.ts`].
 * 2. ~~L'annuelle~~ [2026-10-13, seconde décision : les deux lignes de
 *    l'article 7, annuelle et présence] des alimentations de secours de
 *    signalisation (arrêté du 4 novembre 1993, art. 15 et 7) : due seulement
 *    si une signalisation alimentée est déclarée — `siEquipementDeclare` :
 *    ALARME_INCENDIE, BAES ~~.~~, ASCENSEUR (art. 6, « signal d'appel »).
 *
 * Tout passe par `determineObligationsApplicables` : c'est le calendrier que
 * ces règles changent, pas une donnée du référentiel.
 */

const ALIM = "signalisation-etablissement-alimentations-secours-annuelle";
const PRESENCE = "signalisation-etablissement-alimentation-secours-presence";
const GE = [
  "elec-erp-groupe-electrogene-annuel",
  "elec-erp-groupe-electrogene-quinzaine",
];

const BUREAU: EtablissementMatching = {
  id: "etab",
  effectifSurSite: 6,
  effectifEntreprise: 6,
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
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
};

const ERP_N3: EtablissementMatching = {
  ...BUREAU,
  effectifSurSite: 8,
  effectifEntreprise: 8,
  estERP: true,
  typeErp: "N",
  categorieErp: "N3",
};

const appareil = (
  categorie: CategorieEquipement,
  id: string = categorie,
  caracteristiques: EquipementMatching["caracteristiques"] = null,
): EquipementMatching => ({ id, libelle: id, categorie, caracteristiques });

for (const ID of [ALIM, PRESENCE]) describe(`${ID} — sur un appareil alimenté déclaré`, () => {
  const lignes = (e: EtablissementMatching, eqs: EquipementMatching[]) =>
    determineObligationsApplicables(e, eqs).filter((a) => a.obligation.id === ID);

  it("bureau de six salariés sans aucun appareil : la ligne n'existe pas", () => {
    expect(lignes(BUREAU, [])).toHaveLength(0);
  });

  it("un BAES déclaré : la ligne existe, une seule, portée par l'établissement", () => {
    const l = lignes(BUREAU, [appareil("BAES")]);
    expect(l).toHaveLength(1);
    expect(l[0].porteur).toBe("etablissement");
  });

  it("une alarme incendie déclarée : la ligne existe", () => {
    expect(lignes(BUREAU, [appareil("ALARME_INCENDIE")])).toHaveLength(1);
  });

  it("un ascenseur déclaré : la ligne existe (art. 6, « signal d'appel », 2026-10-13)", () => {
    expect(lignes(BUREAU, [appareil("ASCENSEUR")])).toHaveLength(1);
  });

  it("un appareil AUTRE ne la fait pas naître (le faux négatif écrit dans les notes)", () => {
    expect(lignes(BUREAU, [appareil("AUTRE")])).toHaveLength(0);
  });

  it("trois BAES et une alarme : toujours UNE ligne", () => {
    expect(
      lignes(BUREAU, [
        appareil("BAES", "b1"),
        appareil("BAES", "b2"),
        appareil("BAES", "b3"),
        appareil("ALARME_INCENDIE", "a1"),
      ]),
    ).toHaveLength(1);
  });

  it("aucune autre catégorie du parc ne la fait naître", () => {
    const declencheuses = new Set<CategorieEquipement>(["ALARME_INCENDIE", "BAES", "ASCENSEUR"]);
    const autres = CATEGORIES_EQUIPEMENT.filter((c) => !declencheuses.has(c));
    // Borne basse : le parc a bien d'autres catégories que les trois.
    expect(autres.length).toBeGreaterThan(0);
    const fautives = autres.filter((c) => lignes(BUREAU, [appareil(c)]).length > 0);
    expect(fautives).toEqual([]);
  });

  it("reste due en ERP comme en lieu de travail, dès qu'un BAES est déclaré", () => {
    expect(lignes(ERP_N3, [])).toHaveLength(0);
    expect(lignes(ERP_N3, [appareil("BAES")])).toHaveLength(1);
  });
});

it("l'annuelle garde son rythme annuel", () => {
  const l = determineObligationsApplicables(BUREAU, [appareil("BAES")]).find(
    (a) => a.obligation.id === ALIM,
  );
  expect(l?.obligation.periodicite).toBe("annuelle");
});

describe("groupe électrogène de sécurité — sur un « oui » déclaré seulement", () => {
  const lignesGe = (eqs: EquipementMatching[]) =>
    determineObligationsApplicables(ERP_N3, eqs)
      .map((a) => a.obligation.id)
      .filter((id) => GE.includes(id))
      .sort();

  it("ERP de 3ᵉ catégorie, installation électrique sans réponse : aucune ligne", () => {
    expect(lignesGe([appareil("INSTALLATION_ELECTRIQUE")])).toEqual([]);
    expect(
      lignesGe([appareil("INSTALLATION_ELECTRIQUE", "el", { nombre: 1 })]),
    ).toEqual([]);
  });

  it("avec « oui » : les deux lignes d'EL 18 § 4", () => {
    expect(
      lignesGe([appareil("INSTALLATION_ELECTRIQUE", "el", { aGroupeElectrogene: true })]),
    ).toEqual(GE);
  });

  it("avec « non » : aucune", () => {
    expect(
      lignesGe([appareil("INSTALLATION_ELECTRIQUE", "el", { aGroupeElectrogene: false })]),
    ).toEqual([]);
  });

  it("une installation à « oui » parmi d'autres sans réponse : les deux lignes, sur celle-là", () => {
    const res = determineObligationsApplicables(ERP_N3, [
      appareil("INSTALLATION_ELECTRIQUE", "sans"),
      appareil("INSTALLATION_ELECTRIQUE", "avec", { aGroupeElectrogene: true }),
    ]).filter((a) => GE.includes(a.obligation.id));
    expect(res).toHaveLength(2);
    for (const a of res) {
      expect(a.equipementsConcernes.map((e) => e.id)).toEqual(["avec"]);
    }
  });
});
