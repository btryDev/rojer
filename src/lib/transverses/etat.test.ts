import { describe, expect, it } from "vitest";
import { repondreAuxQuestionsTransverses } from "./etat";

const parId = (actifs: string[], brut: unknown) =>
  Object.fromEntries(
    repondreAuxQuestionsTransverses(actifs, brut).map((x) => [x.question.id, x.reponse]),
  );

describe("repondreAuxQuestionsTransverses — trois états", () => {
  it("lit « oui » sur le risque, « non » sur la colonne, et rien d'autre", () => {
    const r = parId(["trv-routier"], { "q-ecran": false });
    expect(r["q-routier"]).toBe("oui");
    expect(r["q-ecran"]).toBe("non");
    expect(r["q-charges"]).toBe("sans_reponse");
  });

  it("ne replie jamais le silence sur « non » — un DUERP d'avant la colonne", () => {
    // Colonne NULL : ce que portent tous les DUERP existants à la migration.
    // Les questions ajoutées depuis leur validation ne leur ont jamais été
    // posées ; elles ne peuvent pas valoir un refus.
    const r = parId(["trv-routier"], null);
    expect(r["q-operations-electriques"]).toBe("sans_reponse");
    expect(r["q-conduite-engins"]).toBe("sans_reponse");
    expect(Object.values(r)).not.toContain("non");
  });

  it("fait primer le risque sur un « non » resté dans la colonne", () => {
    const r = parId(["trv-conduite-engins"], { "q-conduite-engins": false });
    expect(r["q-conduite-engins"]).toBe("oui");
  });

  it("ignore ce qui n'est pas un booléen, et un `true` n'est pas un « oui »", () => {
    // Le « oui » ne se lit que sur le risque : un `true` écrit à la main ne
    // fabrique pas un risque que le document n'imprime pas.
    const r = parId([], { "q-ecran": "false", "q-charges": true, "q-routier": 0 });
    expect(r["q-ecran"]).toBe("sans_reponse");
    expect(r["q-charges"]).toBe("sans_reponse");
    expect(r["q-routier"]).toBe("sans_reponse");
  });
});
