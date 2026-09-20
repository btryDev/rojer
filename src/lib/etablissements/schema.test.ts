import { describe, expect, it } from "vitest";
import { cleJourCivil } from "@/lib/dates";
import {
  etablissementCreationSchema,
  etablissementSchema,
} from "./schema";

const base = {
  raisonDisplay: "Restaurant du Marché",
  adresse: "12 rue des Halles, 75001 Paris",
  effectifSurSite: 8,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
};

describe("etablissementSchema — typologie (ADR-004)", () => {
  it("accepte un établissement de travail simple", () => {
    const res = etablissementSchema.safeParse(base);
    expect(res.success).toBe(true);
  });

  it("refuse un ERP sans type + sans catégorie", () => {
    const res = etablissementSchema.safeParse({
      ...base,
      estERP: true,
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const champs = res.error.issues.map((i) => i.path[0]);
      expect(champs).toContain("typeErp");
      expect(champs).toContain("categorieErp");
    }
  });

  it("accepte un ERP restaurant cat. 4", () => {
    const res = etablissementSchema.safeParse({
      ...base,
      estERP: true,
      typeErp: "N",
      categorieErp: "N4",
      personnesPresentesHabituellement: 120,
    });
    expect(res.success).toBe(true);
  });

  it("refuse typeErp/categorieErp si l'établissement n'est pas ERP", () => {
    const res = etablissementSchema.safeParse({
      ...base,
      estERP: false,
      typeErp: "N",
      categorieErp: "N4",
    });
    expect(res.success).toBe(false);
  });

  // « refuse un IGH sans classe » a vécu ici jusqu'au 2026-09-03. La classe
  // n'est plus demandée : elle ne bornait aucune obligation, et l'arrêté du
  // 30 décembre 2011 met ses vérifications à la charge des « propriétaires »
  // sans les moduler par classe. Le régime IGH se déclare seul.
  it("accepte un IGH qui ne dit rien de plus que son régime", () => {
    const res = etablissementSchema.safeParse({ ...base, estIGH: true });
    expect(res.success).toBe(true);
  });

  it("accepte ERP + IGH cumulés (régimes non exclusifs)", () => {
    const res = etablissementSchema.safeParse({
      ...base,
      estERP: true,
      typeErp: "W",
      categorieErp: "N2",
      estIGH: true,
    });
    expect(res.success).toBe(true);
  });

  it("refuse un établissement sans aucun régime coché", () => {
    const res = etablissementSchema.safeParse({
      ...base,
      estEtablissementTravail: false,
    });
    expect(res.success).toBe(false);
  });

  it("refuse un code NAF invalide", () => {
    const res = etablissementSchema.safeParse({
      ...base,
      codeNaf: "invalide",
    });
    expect(res.success).toBe(false);
  });

  it("accepte un code NAF vide (hérite de l'entreprise)", () => {
    const res = etablissementSchema.safeParse({
      ...base,
      codeNaf: "",
    });
    expect(res.success).toBe(true);
  });
});

describe("etablissementSchema — dates civiles (registre, fiche renseignements)", () => {
  // Ces quatre cas viennent d'une revue : `depuisCleJourCivil` jette sur une
  // chaîne mal formée, et dans un `z.preprocess` ce throw traversait
  // `safeParse`. Les deux actions serveur l'appellent hors de tout try/catch —
  // une date « 26/08/2026 » faisait donc planter l'action et perdre le
  // formulaire entier au lieu d'afficher le message de format.
  it("rend une erreur de validation sur une date mal formée, sans jeter", () => {
    const parse = () =>
      etablissementSchema.safeParse({
        ...base,
        dateAutorisationOuverture: "26/08/2026",
      });
    expect(parse).not.toThrow();
    expect(parse().success).toBe(false);
  });

  it("nomme le champ fautif plutôt que de faire échouer tout le formulaire", () => {
    const res = etablissementSchema.safeParse({
      ...base,
      dateCertificatConformite: "pas une date",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.map((i) => i.path[0])).toContain(
        "dateCertificatConformite",
      );
    }
  });

  it("accepte une date bien formée et l'ancre dans le fuseau de référence", () => {
    const res = etablissementSchema.safeParse({
      ...base,
      dateAutorisationOuverture: "2026-08-26",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      const d = res.data.dateAutorisationOuverture;
      expect(d).toBeInstanceOf(Date);
      // ADR-011 : le jour civil, pas minuit UTC — qui serait la veille à Paris.
      // Lu dans le fuseau de référence, pas celui de la machine : `getDate()`
      // passait sur un poste à Paris et tombait sur un runner en UTC
      // (2026-09-15, premier passage de la suite en CI).
      expect(d && cleJourCivil(d)).toBe("2026-08-26");
      // Et l'instant exact : minuit à Paris en été. `cleJourCivil` seul
      // accepterait aussi minuit UTC, qui tombe à 2 h le même jour à Paris.
      expect(d?.toISOString()).toBe("2026-08-25T22:00:00.000Z");
    }
  });

  it("accepte l'absence de date et la chaîne vide", () => {
    expect(etablissementSchema.safeParse(base).success).toBe(true);
    expect(
      etablissementSchema.safeParse({ ...base, dateAutorisationOuverture: "" })
        .success,
    ).toBe(true);
  });
});

/**
 * LA FAMILLE D'HABITATION N'EST PLUS DEMANDÉE — 2026-09-03.
 *
 * Quatre tests occupaient cette place depuis le 2026-09-01. Ils gravaient une
 * dissymétrie soignée : la création EXIGEAIT la famille, la modification ne
 * l'exigeait pas, pour qu'un dossier d'habitation ouvert avant cette date
 * reste modifiable — sans quoi son propriétaire n'aurait plus pu changer même
 * son adresse tant qu'il n'aurait pas retrouvé sa famille. Les deux moitiés
 * étaient testées, précisément pour qu'on ne puisse pas réparer l'une en
 * supprimant l'autre.
 *
 * La règle tombe entière, et pas parce qu'elle était mal faite : l'arrêté du
 * 31 janvier 1986 a été dépouillé et ne conditionne aucune obligation
 * d'entretien à la famille. Exiger à la création une donnée qui ne décide de
 * rien ajoutait une étape et une occasion d'abandon.
 *
 * Ce qui garde le retrait vit désormais dans
 * `src/lib/referentiels/familles-habitation.test.ts` : aucune famille ne peut
 * plus être écrite, par aucun des deux schémas, et un dossier d'habitation
 * sans famille est accepté à la création.
 */

/**
 * Les refus de périmètre sur la PORTE, pas sur le parcours (ADR-031).
 *
 * Depuis l'ADR-028, un second établissement se crée par `/etablissements/nouveau`
 * et non par le wizard. Une règle posée sur le parcours se contournerait donc
 * en changeant de parcours — c'est exactement ce qui a failli arriver : les
 * deux lots ayant été écrits en parallèle, ce chemin est resté un instant sur
 * le schéma de modification, et un dossier refusé à l'onboarding se serait créé
 * en deux clics par l'autre porte.
 */
describe("refus de périmètre — création seulement", () => {
  it("refuse plus de 50 travailleurs à la création", () => {
    const res = etablissementCreationSchema.safeParse({
      ...base,
      effectifSurSite: 51,
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.effectifSurSite).toBeDefined();
    }
  });

  it("accepte 50 travailleurs", () => {
    expect(
      etablissementCreationSchema.safeParse({ ...base, effectifSurSite: 50 })
        .success,
    ).toBe(true);
  });

  it("laisse un dossier existant dépasser 50 en modification", () => {
    // Un client qui embauche ne perd pas son dossier : il porte un manque de
    // couverture, il ne se ferme pas.
    expect(
      etablissementSchema.safeParse({ ...base, effectifSurSite: 60 }).success,
    ).toBe(true);
  });

  it("ne borne pas sur le public reçu", () => {
    // La catégorie mesure le public, la borne mesure les salariés. Les
    // confondre reviendrait à refuser la cible du produit.
    expect(
      etablissementCreationSchema.safeParse({
        ...base,
        effectifSurSite: 8,
        estERP: true,
        typeErp: "N",
        categorieErp: "N1",
      }).success,
    ).toBe(true);
  });

  it("refuse un ERP situé dans un IGH", () => {
    const res = etablissementCreationSchema.safeParse({
      ...base,
      estERP: true,
      typeErp: "M",
      categorieErp: "N5",
      estIGH: true,
    });
    expect(res.success).toBe(false);
  });

  it("accepte un IGH qui n'est pas un ERP", () => {
    expect(
      etablissementCreationSchema.safeParse({
        ...base,
        estIGH: true,
      }).success,
    ).toBe(true);
  });
});

describe("etablissementSchema — nombre de personnes (2026-09-21)", () => {
  const restaurant = { ...base, estERP: true, typeErp: "N", categorieErp: "N5" };

  it("l'exige d'un ERP sous les deux bornes — la seconde porte de création passe par ici", () => {
    const res = etablissementSchema.safeParse(restaurant);
    expect(res.success).toBe(false);
    if (!res.success)
      expect(
        res.error.flatten().fieldErrors.personnesPresentesHabituellement,
      ).toBeDefined();
  });

  it("ne l'exige ni d'un établissement de travail seul, ni d'une 3ᵉ catégorie", () => {
    expect(etablissementSchema.safeParse(base).success).toBe(true);
    expect(
      etablissementSchema.safeParse({ ...restaurant, categorieErp: "N3" }).success,
    ).toBe(true);
  });

  it("l'accepte de tous : sur la fiche, un nombre déclaré tranche dans les deux sens", () => {
    expect(
      etablissementSchema.safeParse({
        ...base,
        personnesPresentesHabituellement: 12,
      }).success,
    ).toBe(true);
  });
});
