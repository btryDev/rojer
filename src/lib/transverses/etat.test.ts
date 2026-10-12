import { describe, expect, it } from "vitest";
import type { ReponsesFaitsActivite } from "@/lib/etablissements/faits-activite";
import { repondreAuxQuestionsTransverses } from "./etat";

const AUCUN_FAIT: ReponsesFaitsActivite = {
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
};

const parId = (actifs: string[], brut: unknown, faits = AUCUN_FAIT) =>
  Object.fromEntries(
    repondreAuxQuestionsTransverses(actifs, brut, faits).map((x) => [x.question.id, x.reponse]),
  );

describe("repondreAuxQuestionsTransverses — questions sans fait d'activité (ADR-038)", () => {
  it("lit « oui » sur le risque, « non » sur la colonne, et rien d'autre", () => {
    const r = parId(["trv-routier"], { "q-public": false });
    expect(r["q-routier"]).toBe("oui");
    expect(r["q-public"]).toBe("non");
    expect(r["q-isolement"]).toBe("sans_reponse");
  });

  it("ne replie jamais le silence sur « non » — un DUERP d'avant la colonne", () => {
    const r = parId(["trv-routier"], null);
    expect(Object.values(r)).not.toContain("non");
  });

  it("fait primer le risque sur un « non » resté dans la colonne", () => {
    expect(parId(["trv-routier"], { "q-routier": false })["q-routier"]).toBe("oui");
  });

  it("ignore ce qui n'est pas un booléen, et un `true` n'est pas un « oui »", () => {
    const r = parId([], { "q-public": "false", "q-isolement": true, "q-routier": 0 });
    expect(r["q-public"]).toBe("sans_reponse");
    expect(r["q-isolement"]).toBe("sans_reponse");
    expect(r["q-routier"]).toBe("sans_reponse");
  });
});

describe("repondreAuxQuestionsTransverses — questions qui posent un fait (ADR-041)", () => {
  it("lit la réponse sur l'établissement, pas sur le risque ni la colonne du DUERP", () => {
    // Le risque présent et le « non » du DUERP sont ignorés : seul le fait compte.
    const r = parId(["trv-charges"], { "q-ecran": false }, {
      ...AUCUN_FAIT,
      manutentionManuelle: false,
      travailSurEcran: true,
    });
    expect(r["q-charges"]).toBe("non");
    expect(r["q-ecran"]).toBe("oui");
  });

  it("un fait non déclaré est sans réponse, même si un risque existe", () => {
    expect(parId(["trv-conduite-engins"], null)["q-conduite-engins"]).toBe("sans_reponse");
  });
});
