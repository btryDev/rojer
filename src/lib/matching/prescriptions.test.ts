import { describe, expect, it } from "vitest";
import { obligationsIncendie } from "@/lib/referentiels/conformite";
import { MARQUAGE_CONTRACTUEL } from "@/lib/prescriptions/sources";
import {
  porteurDe,
  type Obligation,
} from "@/lib/referentiels/conformite/types";
import {
  appliquerPrescriptions,
  estObligationSurMesure,
  estPeriodicitePlusStricte,
  estPrescriptionLevee,
  prescriptionEnVigueur,
  PREFIXE_PRESCRIPTION,
} from "./prescriptions";
import type {
  EquipementMatching,
  ObligationApplicable,
  PrescriptionMatching,
} from "./types";

const NOW = new Date("2026-08-25T10:00:00Z");

const extincteur: EquipementMatching = {
  id: "eq-ext",
  libelle: "Extincteurs RDC",
  categorie: "EXTINCTEUR",
  caracteristiques: null,
};
const extincteur2: EquipementMatching = {
  id: "eq-ext-2",
  libelle: "Extincteurs étage",
  categorie: "EXTINCTEUR",
  caracteristiques: null,
};
const alarme: EquipementMatching = {
  id: "eq-alarme",
  libelle: "SSI",
  categorie: "ALARME_INCENDIE",
  caracteristiques: null,
};

const extincteursAnnuelle = obligationsIncendie.find(
  (o) => o.id === "incendie-erp-extincteurs-annuelle",
) as Obligation;
const registre = obligationsIncendie.find(
  (o) => o.id === "incendie-registre-securite",
) as Obligation;

function applicable(
  o: Obligation,
  equipements: EquipementMatching[],
): ObligationApplicable {
  return {
    obligation: o,
    equipementsConcernes: equipements,
    porteur: porteurDe(o),
    raisons: ["ERP"],
  };
}

function prescription(
  partial: Partial<PrescriptionMatching> & Pick<PrescriptionMatching, "id" | "effet">,
): PrescriptionMatching {
  return {
    source: "arrete_municipal",
    reference: "AM 2026-12",
    autorite: "Mairie",
    dateDocument: new Date("2026-03-01T00:00:00Z"),
    dateFin: null,
    obligationId: null,
    libelle: null,
    description: null,
    periodicite: "semestrielle",
    realisateurRequis: ["personne_qualifiee"],
    categorieEquipement: null,
    equipementId: null,
    ...partial,
  };
}

describe("prescriptions — estPeriodicitePlusStricte", () => {
  it("semestrielle est plus stricte qu'annuelle, pas l'inverse ni l'égal", () => {
    expect(estPeriodicitePlusStricte("semestrielle", "annuelle")).toBe(true);
    expect(estPeriodicitePlusStricte("annuelle", "semestrielle")).toBe(false);
    expect(estPeriodicitePlusStricte("annuelle", "annuelle")).toBe(false);
  });

  it("toute périodicité datée renforce une obligation sans échéance", () => {
    expect(estPeriodicitePlusStricte("annuelle", "autre")).toBe(true);
    expect(
      estPeriodicitePlusStricte("annuelle", "mise_en_service_uniquement"),
    ).toBe(true);
    expect(estPeriodicitePlusStricte("autre", "annuelle")).toBe(false);
    expect(estPeriodicitePlusStricte("autre", "autre")).toBe(false);
  });
});

describe("prescriptions — renforce_periodicite", () => {
  it("resserre la périodicité sur tous les équipements déclencheurs, avec la raison", () => {
    const res = appliquerPrescriptions(
      [applicable(extincteursAnnuelle, [extincteur, extincteur2])],
      [
        prescription({
          id: "p1",
          effet: "renforce_periodicite",
          obligationId: extincteursAnnuelle.id,
          periodicite: "semestrielle",
        }),
      ],
      [extincteur, extincteur2],
      NOW,
    );
    expect(res.ignorees).toHaveLength(0);
    const s = res.applicables[0].surcharges!;
    expect(s["eq-ext"].periodicite).toBe("semestrielle");
    expect(s["eq-ext-2"].periodicite).toBe("semestrielle");
    expect(s["eq-ext"].prescriptionId).toBe("p1");
    expect(s["eq-ext"].raison).toContain("arrêté municipal AM 2026-12");
  });

  it("ne surcharge qu'un seul équipement quand `equipementId` est renseigné", () => {
    const res = appliquerPrescriptions(
      [applicable(extincteursAnnuelle, [extincteur, extincteur2])],
      [
        prescription({
          id: "p1",
          effet: "renforce_periodicite",
          obligationId: extincteursAnnuelle.id,
          equipementId: "eq-ext-2",
        }),
      ],
      [extincteur, extincteur2],
      NOW,
    );
    const s = res.applicables[0].surcharges!;
    expect(s["eq-ext"]).toBeUndefined();
    expect(s["eq-ext-2"].periodicite).toBe("semestrielle");
  });

  it("refuse un rythme égal ou plus souple — rattrapé par le référentiel", () => {
    const res = appliquerPrescriptions(
      [applicable(extincteursAnnuelle, [extincteur])],
      [
        prescription({
          id: "p1",
          effet: "renforce_periodicite",
          obligationId: extincteursAnnuelle.id,
          periodicite: "biennale",
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res.applicables[0].surcharges).toBeUndefined();
    expect(res.ignorees).toHaveLength(1);
    expect(res.ignorees[0].raison).toContain("rattrapée par le référentiel");
  });

  it("accepte n'importe quel rythme sur une obligation permanente (`autre`)", () => {
    const res = appliquerPrescriptions(
      [applicable(registre, [extincteur])],
      [
        prescription({
          id: "p1",
          effet: "renforce_periodicite",
          obligationId: registre.id,
          periodicite: "annuelle",
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res.applicables[0].surcharges!["eq-ext"].periodicite).toBe(
      "annuelle",
    );
  });

  it("ignore une prescription qui cible une obligation non applicable ici", () => {
    const res = appliquerPrescriptions(
      [],
      [
        prescription({
          id: "p1",
          effet: "renforce_periodicite",
          obligationId: extincteursAnnuelle.id,
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res.ignorees).toHaveLength(1);
    expect(res.ignorees[0].raison).toContain("ne s'applique pas");
  });

  it("deux prescriptions sur le même couple : la plus courte gagne, l'autre est signalée", () => {
    const res = appliquerPrescriptions(
      [applicable(extincteursAnnuelle, [extincteur])],
      [
        prescription({
          id: "p-longue",
          effet: "renforce_periodicite",
          obligationId: extincteursAnnuelle.id,
          periodicite: "semestrielle",
          dateDocument: new Date("2026-01-01T00:00:00Z"),
        }),
        prescription({
          id: "p-courte",
          effet: "renforce_periodicite",
          obligationId: extincteursAnnuelle.id,
          periodicite: "trimestrielle",
          dateDocument: new Date("2026-02-01T00:00:00Z"),
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res.applicables[0].surcharges!["eq-ext"].prescriptionId).toBe(
      "p-courte",
    );
    expect(res.ignorees).toHaveLength(0);

    // Ordre inversé de lecture : même résultat (déterminisme).
    const res2 = appliquerPrescriptions(
      [applicable(extincteursAnnuelle, [extincteur])],
      [
        prescription({
          id: "p-courte",
          effet: "renforce_periodicite",
          obligationId: extincteursAnnuelle.id,
          periodicite: "trimestrielle",
          dateDocument: new Date("2026-01-01T00:00:00Z"),
        }),
        prescription({
          id: "p-longue",
          effet: "renforce_periodicite",
          obligationId: extincteursAnnuelle.id,
          periodicite: "semestrielle",
          dateDocument: new Date("2026-02-01T00:00:00Z"),
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res2.applicables[0].surcharges!["eq-ext"].prescriptionId).toBe(
      "p-courte",
    );
    expect(res2.ignorees).toHaveLength(1);
    expect(res2.ignorees[0].prescription.id).toBe("p-longue");
  });

  it("une prescription levée (dateFin passée) est ignorée et le dit", () => {
    const res = appliquerPrescriptions(
      [applicable(extincteursAnnuelle, [extincteur])],
      [
        prescription({
          id: "p1",
          effet: "renforce_periodicite",
          obligationId: extincteursAnnuelle.id,
          dateFin: new Date("2026-06-30T00:00:00Z"),
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res.applicables[0].surcharges).toBeUndefined();
    expect(res.ignorees[0].raison).toContain("levée");
  });

  it("vigueur et levée se lisent en JOUR CIVIL de Paris (2026-09-15)", () => {
    // « Cesse de produire effet le 01/06 » : en vigueur la veille, levée le
    // jour même, quelle que soit l'heure. Une fin stockée à minuit UTC (1 h ou
    // 2 h à Paris) et une horloge à 0 h 30 à Paris le même jour : en instants,
    // la prescription était encore en vigueur ; en jours, elle est levée.
    const fin = { dateFin: new Date("2026-06-01T00:00:00Z") };
    const aMinuitTrente = new Date("2026-05-31T22:30:00Z");
    expect(prescriptionEnVigueur(fin, aMinuitTrente)).toBe(false);
    expect(prescriptionEnVigueur(fin, new Date("2026-05-31T12:00:00Z"))).toBe(true);
    expect(estPrescriptionLevee({ ...fin, actif: true }, aMinuitTrente)).toBe(true);
    expect(estPrescriptionLevee({ dateFin: null, actif: false }, aMinuitTrente)).toBe(true);
    expect(estPrescriptionLevee({ dateFin: null, actif: true }, aMinuitTrente)).toBe(false);
  });

  it("ne mute pas le résultat du moteur", () => {
    const entree = applicable(extincteursAnnuelle, [extincteur]);
    appliquerPrescriptions(
      [entree],
      [
        prescription({
          id: "p1",
          effet: "renforce_periodicite",
          obligationId: extincteursAnnuelle.id,
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(entree.surcharges).toBeUndefined();
  });
});

describe("prescriptions — obligation_sur_mesure", () => {
  it("par catégorie : tous les équipements de la catégorie déclenchent", () => {
    const res = appliquerPrescriptions(
      [],
      [
        prescription({
          id: "p1",
          effet: "obligation_sur_mesure",
          libelle: "Essai de la colonne sèche",
          categorieEquipement: "EXTINCTEUR",
        }),
      ],
      [extincteur, extincteur2, alarme],
      NOW,
    );
    expect(res.surMesure).toHaveLength(1);
    expect(res.surMesure[0].equipementsConcernes.map((e) => e.id)).toEqual([
      "eq-ext",
      "eq-ext-2",
    ]);
    expect(res.surMesure[0].raisons[0]).toContain(
      "Prescription propre à votre établissement",
    );
  });

  it("par équipement : seul l'équipement visé déclenche", () => {
    const res = appliquerPrescriptions(
      [],
      [
        prescription({
          id: "p1",
          effet: "obligation_sur_mesure",
          libelle: "Contrôle du SSI par organisme",
          equipementId: "eq-alarme",
        }),
      ],
      [extincteur, alarme],
      NOW,
    );
    expect(res.surMesure[0].equipementsConcernes.map((e) => e.id)).toEqual([
      "eq-alarme",
    ]);
  });

  it("sans déclencheur déclaré : ignorée avec raison", () => {
    const res = appliquerPrescriptions(
      [],
      [
        prescription({
          id: "p1",
          effet: "obligation_sur_mesure",
          libelle: "X",
          categorieEquipement: "ASCENSEUR",
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res.surMesure).toHaveLength(0);
    expect(res.ignorees[0].raison).toContain("Aucun équipement");
  });
});

describe("prescriptions — namespace des obligations sur mesure", () => {
  it("le préfixe distingue une ligne sur mesure d'une ligne du référentiel", () => {
    expect(estObligationSurMesure(`${PREFIXE_PRESCRIPTION}abc`)).toBe(true);
    expect(estObligationSurMesure("incendie-erp-extincteurs-annuelle")).toBe(
      false,
    );
  });
});

describe("prescriptions — marquage des sources contractuelles (ADR-032)", () => {
  it("la raison d'une obligation sur mesure d'assureur porte le marquage", () => {
    const res = appliquerPrescriptions(
      [],
      [
        prescription({
          id: "p1",
          effet: "obligation_sur_mesure",
          source: "demande_assureur",
          reference: "Contrat 88-421",
          libelle: "Thermographie du tableau électrique",
          categorieEquipement: "EXTINCTEUR",
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res.surMesure[0].raisons[0]).toContain(MARQUAGE_CONTRACTUEL);
  });

  it("la raison d'une surcharge de périodicité d'assureur porte le marquage", () => {
    const res = appliquerPrescriptions(
      [applicable(extincteursAnnuelle, [extincteur])],
      [
        prescription({
          id: "p1",
          effet: "renforce_periodicite",
          source: "demande_assureur",
          obligationId: extincteursAnnuelle.id,
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res.applicables[0].surcharges!["eq-ext"].raison).toContain(
      MARQUAGE_CONTRACTUEL,
    );
  });

  it("un acte d'autorité ne porte AUCUN marquage : il n'a rien à nuancer", () => {
    // La borne haute. Coller la mention sur un arrêté du maire sous-dirait
    // une obligation qui, elle, est bien opposable — l'erreur symétrique, et
    // celle que personne ne viendrait relever.
    const res = appliquerPrescriptions(
      [applicable(extincteursAnnuelle, [extincteur])],
      [
        prescription({
          id: "p1",
          effet: "renforce_periodicite",
          source: "arrete_municipal",
          obligationId: extincteursAnnuelle.id,
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res.applicables[0].surcharges!["eq-ext"].raison).not.toContain(
      "assurance",
    );
  });

  it("la source est nommée, jamais rabattue sur le mot générique", () => {
    // `libelleSource` fermait sur `?? "prescription"` : une source sans
    // libellé s'affichait comme n'importe quelle autre, et une demande
    // d'assureur s'y serait fondue. La table est désormais typée par source,
    // donc exhaustive — ce test vérifie que ce qu'elle rend arrive bien
    // jusqu'à la raison que l'utilisateur lit.
    const res = appliquerPrescriptions(
      [],
      [
        prescription({
          id: "p1",
          effet: "obligation_sur_mesure",
          source: "demande_assureur",
          libelle: "Contrôle de hotte trimestriel",
          categorieEquipement: "EXTINCTEUR",
        }),
      ],
      [extincteur],
      NOW,
    );
    expect(res.surMesure[0].raisons[0]).toContain("demande de votre assureur");
  });

  it("aucune référence légale n'est fabriquée pour une ligne d'assureur", () => {
    // ADR-032 : « une prescription d'assureur ne cite pas d'article, et le
    // produit ne doit pas lui en chercher un pour faire bonne figure ». Une
    // obligation sur mesure ne vient d'aucun texte : rien de ce qu'elle rend
    // ne doit ressembler à une citation d'article.
    const res = appliquerPrescriptions(
      [],
      [
        prescription({
          id: "p1",
          effet: "obligation_sur_mesure",
          source: "demande_assureur",
          libelle: "Vérification annuelle du désenfumage",
          categorieEquipement: "EXTINCTEUR",
        }),
      ],
      [extincteur],
      NOW,
    );
    const ligne = res.surMesure[0];
    expect(ligne.prescription.obligationId).toBeNull();
    // Un article du Code s'écrit « L. 4121-1 », « R. 4227-34 », « D. 4711-1 ».
    expect(ligne.raisons.join(" ")).not.toMatch(/\b[LRD]\.\s?\d{3,}/);
  });
});
