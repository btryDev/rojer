import { describe, expect, it } from "vitest";
import { complementsParPlace, complementsRemplis, precisionsLigne } from "./complements";

/** Les champs repris de RiskBoard, lus une fois pour toutes les surfaces (2026-11-21). */

describe("complementsRemplis", () => {
  it("rien de rempli : rien, même avec des clés absentes, nulles ou blanches", () => {
    expect(complementsRemplis({})).toEqual([]);
    expect(complementsRemplis({ horaires: null, cseAssocie: null, moyensFournis: "   " })).toEqual([]);
  });

  it("dans l'ordre des libellés, le texte rogné, le CSE en « Oui » ou « Non »", () => {
    const r = complementsRemplis({
      autresObservations: " Accès par la cour ",
      cseAssocie: false,
      horaires: "8 h – 17 h",
    });
    expect(r).toEqual([
      { cle: "horaires", libelle: "Horaires de travail", texte: "8 h – 17 h" },
      { cle: "cseAssocie", libelle: "CSE associé à l'opération", texte: "Non" },
      { cle: "autresObservations", libelle: "Observations particulières", texte: "Accès par la cour" },
    ]);
    expect(complementsRemplis({ cseAssocie: true })[0].texte).toBe("Oui");
  });
});

describe("complementsParPlace", () => {
  it("horaires et CSE à part, les textes longs ensemble", () => {
    const r = complementsParPlace({ horaires: "8 h", cseAssocie: true, qualificationsRequises: "B1V", moyensFournis: "Vestiaire" });
    expect(r.horaires?.texte).toBe("8 h");
    expect(r.cse?.texte).toBe("Oui");
    expect(r.autres.map((x) => x.cle)).toEqual(["qualificationsRequises", "moyensFournis"]);
  });

  it("absents : non renseignés", () => {
    expect(complementsParPlace({})).toEqual({ horaires: undefined, cse: undefined, autres: [] });
  });
});

describe("precisionsLigne", () => {
  it("une ligne libre sans lieu ni fréquence : rien", () => {
    expect(precisionsLigne({ risque: "Bruit" })).toEqual([]);
    expect(precisionsLigne({ risque: "Bruit", famille: null, lieu: " ", frequence: null })).toEqual([]);
  });

  it("la famille ne se répète pas quand le risque est son libellé", () => {
    expect(precisionsLigne({ risque: "chutes en hauteur", famille: "CHUTES_HAUTEUR" })).toEqual([]);
  });

  it("la famille se dit quand le risque a été réécrit, puis le lieu et la fréquence", () => {
    expect(
      precisionsLigne({ risque: "Dalles de sol", famille: "AMIANTE", lieu: " Réserve ", frequence: "Une fois" }),
    ).toEqual(["Famille : Amiante", "Lieu : Réserve", "Fréquence : Une fois"]);
  });

  it("une famille inconnue de la liste se dit par son code", () => {
    expect(precisionsLigne({ risque: "X", famille: "RETIREE" })).toEqual(["Famille : RETIREE"]);
  });
});
