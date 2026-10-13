import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parserFichierDuerp, planifierImport } from "./parser";

function excel(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DUERP");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parserFichierDuerp", () => {
  it("détecte les colonnes avec des noms français standards", () => {
    const buf = excel([
      {
        "Unité de travail": "Cuisine",
        "Risque": "Coupure avec couteaux",
        "Description": "Manipulation régulière",
        "Gravité": 3,
        "Probabilité": 3,
        "Maîtrise": 2,
        "Mesures existantes": "Gants | Formation affûtage",
      },
    ]);
    const res = parserFichierDuerp(buf);
    expect(res.erreurs).toHaveLength(0);
    expect(res.lignes).toHaveLength(1);
    const l = res.lignes[0];
    expect(l.uniteTravail).toBe("Cuisine");
    expect(l.libelleRisque).toBe("Coupure avec couteaux");
    expect(l.gravite).toBe(3);
    expect(l.maitrise).toBe(2);
    expect(l.mesuresExistantes).toEqual(["Gants", "Formation affûtage"]);
  });

  it("accepte les variantes de nommage (accents/casse)", () => {
    const buf = excel([
      {
        unite: "Salle",
        risque: "TMS",
        gravite: 2,
        probabilite: 3,
        maitrise: 2,
      },
    ]);
    const res = parserFichierDuerp(buf);
    expect(res.erreurs).toHaveLength(0);
    expect(res.lignes[0].uniteTravail).toBe("Salle");
  });

  it("remonte les erreurs de cotation hors plage", () => {
    const buf = excel([
      {
        "Unité de travail": "Cuisine",
        Risque: "Brûlure",
        Gravité: 5,
        Probabilité: 2,
        Maîtrise: 2,
      },
    ]);
    const res = parserFichierDuerp(buf);
    expect(res.erreurs.some((e) => e.champ === "gravite")).toBe(true);
    expect(res.lignes).toHaveLength(0);
  });

  it("ignore les lignes totalement vides sans lever d'erreur", () => {
    const buf = excel([
      {
        "Unité de travail": "Cuisine",
        Risque: "Coupure",
        Gravité: 2,
        Probabilité: 2,
        Maîtrise: 2,
      },
      {
        "Unité de travail": "",
        Risque: "",
        Gravité: "",
        Probabilité: "",
        Maîtrise: "",
      },
    ]);
    const res = parserFichierDuerp(buf);
    expect(res.lignes).toHaveLength(1);
    expect(res.erreurs).toHaveLength(0);
  });

  it("regroupe par unité de travail dans le plan d'import", () => {
    const buf = excel([
      { unite: "Cuisine", risque: "A", gravite: 2, probabilite: 2, maitrise: 2 },
      { unite: "Cuisine", risque: "B", gravite: 3, probabilite: 2, maitrise: 2 },
      { unite: "Salle", risque: "C", gravite: 1, probabilite: 2, maitrise: 3 },
    ]);
    const res = parserFichierDuerp(buf);
    const plan = planifierImport(res.lignes);
    expect(plan.unites).toHaveLength(2);
    expect(plan.nbRisques).toBe(3);
    expect(
      plan.unites.find((u) => u.nom === "Cuisine")!.risques,
    ).toHaveLength(2);
  });
});

// Audit du 2026-10-12. Un CSV en UTF-8 sans BOM — celui de LibreOffice, de
// Google Sheets, de Numbers — ne s'importait pas ; avec BOM ou en
// Windows-1252 il passait. Et une colonne de mesures à mettre en œuvre était
// lue comme des mesures en place.
describe("parserFichierDuerp — encodage d'un CSV", () => {
  const csv =
    "Unité de travail;Risque;Gravité;Probabilité;Maîtrise;Mesures existantes\n" +
    "Cuisine;Brûlure;3;2;2;Gants\n";
  const attendu = {
    uniteTravail: "Cuisine",
    libelleRisque: "Brûlure",
    mesuresExistantes: ["Gants"],
  };

  it("UTF-8 sans BOM", () => {
    const res = parserFichierDuerp(Buffer.from(csv, "utf8"));
    expect(res.erreurs).toHaveLength(0);
    expect(res.lignes[0]).toMatchObject(attendu);
  });

  it("UTF-8 avec BOM", () => {
    const res = parserFichierDuerp(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(csv, "utf8")]),
    );
    expect(res.erreurs).toHaveLength(0);
    expect(res.lignes[0]).toMatchObject(attendu);
  });

  it("Windows-1252", () => {
    const res = parserFichierDuerp(Buffer.from(csv, "latin1"));
    expect(res.erreurs).toHaveLength(0);
    expect(res.lignes[0]).toMatchObject(attendu);
  });
});

describe("parserFichierDuerp — colonnes de mesures et de cotation", () => {
  const base = {
    "Unité de travail": "Cuisine",
    "Gravité": 3,
    "Probabilité": 2,
    "Maîtrise": 2,
  };

  it("« Mesures à mettre en œuvre » n'est jamais lue comme des mesures en place", () => {
    const res = parserFichierDuerp(
      excel([{ ...base, Risque: "Brûlure", "Mesures à mettre en œuvre": "Hotte" }]),
    );
    expect(res.mappingDetecte.mesures).toBeNull();
    expect(res.mappingDetecte.mesuresPrevues).toBe("Mesures à mettre en œuvre");
    expect(res.lignes[0].mesuresExistantes).toEqual([]);
    expect(res.lignes[0].mesuresPrevues).toEqual(["Hotte"]);
  });

  it("« Mesures de prévention proposées » à côté des mesures existantes", () => {
    const res = parserFichierDuerp(
      excel([
        {
          ...base,
          Risque: "Brûlure",
          "Mesures de prévention proposées": "Hotte",
          "Mesures existantes": "Gants",
        },
      ]),
    );
    expect(res.lignes[0].mesuresExistantes).toEqual(["Gants"]);
    expect(res.lignes[0].mesuresPrevues).toEqual(["Hotte"]);
  });

  it("deux colonnes à venir : la seconde n'est pas lue comme des mesures en place", () => {
    const res = parserFichierDuerp(
      excel([
        {
          ...base,
          Risque: "Brûlure",
          "Mesures proposées": "Hotte",
          "Mesures à prévoir": "Former l'équipe",
        },
      ]),
    );
    expect(res.mappingDetecte.mesures).toBeNull();
    expect(res.lignes[0].mesuresExistantes).toEqual([]);
  });

  // Relecture indépendante du 2026-10-12 : « à mettre en place » n'était pas
  // un marqueur ; seule, la colonne devenait des mesures EN PLACE, et à côté
  // des mesures existantes elle n'était pas importée.
  it.each(["Mesures à mettre en place", "Actions à mettre en place", "Mesures à planifier"])(
    "« %s » seule n'est jamais lue comme des mesures en place",
    (colonne) => {
      const res = parserFichierDuerp(excel([{ ...base, Risque: "Brûlure", [colonne]: "Hotte" }]));
      expect(res.mappingDetecte.mesures).toBeNull();
      expect(res.mappingDetecte.mesuresPrevues).toBe(colonne);
      expect(res.lignes[0].mesuresExistantes).toEqual([]);
      expect(res.lignes[0].mesuresPrevues).toEqual(["Hotte"]);
    },
  );

  it("« Mesures existantes » et « Mesures à mettre en place » : les deux colonnes s'importent", () => {
    const res = parserFichierDuerp(
      excel([
        {
          ...base,
          Risque: "Brûlure",
          "Mesures existantes": "Gants",
          "Mesures à mettre en place": "Hotte",
        },
      ]),
    );
    expect(res.mappingDetecte.mesures).toBe("Mesures existantes");
    expect(res.mappingDetecte.mesuresPrevues).toBe("Mesures à mettre en place");
    expect(res.lignes[0].mesuresExistantes).toEqual(["Gants"]);
    expect(res.lignes[0].mesuresPrevues).toEqual(["Hotte"]);
  });

  it("« Niveau de risque » n'est pas le libellé du risque", () => {
    const res = parserFichierDuerp(
      excel([{ ...base, "Niveau de risque": "Élevé", "Risques identifiés": "Brûlure" }]),
    );
    expect(res.mappingDetecte.libelleRisque).toBe("Risques identifiés");
    expect(res.lignes[0].libelleRisque).toBe("Brûlure");
  });
});
