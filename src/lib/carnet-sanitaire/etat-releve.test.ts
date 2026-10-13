import { describe, expect, it } from "vitest";
import { etatDernierReleve, libelleReleveAncien } from "./etat-releve";

/** Le 13 octobre 2026, à midi à Paris. */
const NOW = new Date("2026-10-13T10:00:00.000Z");
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("etatDernierReleve", () => {
  it("aucun relevé : sansReleve", () => {
    expect(etatDernierReleve(null, NOW)).toEqual({ nature: "sansReleve" });
  });

  it("le cas du contrôle visuel : 70 jours, dans la plage → ancien, jamais vert", () => {
    expect(etatDernierReleve({ dateReleve: jour("2026-08-04"), conforme: true }, NOW)).toEqual({
      nature: "ancien",
      joursDepuis: 70,
    });
  });

  it("borne du mois : le 13 septembre est encore dans le rythme le 13 octobre", () => {
    expect(etatDernierReleve({ dateReleve: jour("2026-09-13"), conforme: true }, NOW)).toEqual({
      nature: "dansLaPlage",
    });
    expect(etatDernierReleve({ dateReleve: jour("2026-09-12"), conforme: true }, NOW).nature).toBe(
      "ancien",
    );
  });

  it("un relevé de 8 jours n'est pas ancien : le texte dit un mois, pas une semaine", () => {
    expect(etatDernierReleve({ dateReleve: jour("2026-10-05"), conforme: true }, NOW).nature).toBe(
      "dansLaPlage",
    );
  });

  it("récent et hors plage : horsPlage", () => {
    expect(etatDernierReleve({ dateReleve: jour("2026-10-10"), conforme: false }, NOW)).toEqual({
      nature: "horsPlage",
    });
  });

  it("sur tout un domaine de dates et de valeurs, aucun chemin ne mène au vert après un mois", () => {
    for (let j = 0; j <= 400; j++) {
      const d = new Date(NOW.getTime() - j * 86_400_000);
      for (const conforme of [true, false]) {
        const e = etatDernierReleve({ dateReleve: d, conforme }, NOW);
        if (j > 31) expect(e.nature).toBe("ancien");
        if (e.nature === "dansLaPlage") expect(conforme).toBe(true);
      }
    }
  });
});

describe("libelleReleveAncien — un fait, pas un verdict", () => {
  it("dit l'âge du relevé", () => {
    expect(libelleReleveAncien(70)).toBe("Relevé vieux de 70 jours");
  });

  it("ne dit ni retard ni conformité", () => {
    expect(libelleReleveAncien(70)).not.toMatch(/retard|conform|plage/i);
  });
});
