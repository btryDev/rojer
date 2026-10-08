import { describe, expect, it } from "vitest";
import {
  decompteStatuts,
  lireAnnexeRelecture,
  lireArguments,
  lirePropositionsAudit,
} from "./entrees-grille-relecture";

const IDS = new Set(["a", "b", "c"]);
const AUDIT = new Set(["c"]);

describe("lirePropositionsAudit", () => {
  it("indexe les propositions par id", () => {
    const m = lirePropositionsAudit(
      [{ id: "a", motif: " Un écrit fait une fois. " }],
      IDS,
      AUDIT,
    );
    expect(m.get("a")).toEqual({ id: "a", motif: "Un écrit fait une fois." });
    expect(m.has("b")).toBe(false);
  });

  it("refuse un id absent du référentiel : la ligne proposée n'apparaîtrait nulle part", () => {
    expect(() => lirePropositionsAudit([{ id: "z", motif: "m" }], IDS, AUDIT)).toThrow(
      /n'est pas au référentiel/,
    );
  });

  it("refuse une ligne déjà au niveau audit, un doublon, un motif vide", () => {
    expect(() => lirePropositionsAudit([{ id: "c", motif: "m" }], IDS, AUDIT)).toThrow(
      /déjà au niveau audit/,
    );
    expect(() =>
      lirePropositionsAudit(
        [
          { id: "a", motif: "m" },
          { id: "a", motif: "m" },
        ],
        IDS,
        AUDIT,
      ),
    ).toThrow(/deux fois/);
    expect(() => lirePropositionsAudit([{ id: "a", motif: " " }], IDS, AUDIT)).toThrow(
      /motif/,
    );
    expect(() => lirePropositionsAudit({ id: "a" }, IDS, AUDIT)).toThrow(/tableau/);
  });
});

describe("lireAnnexeRelecture", () => {
  const remarque = {
    page: "Grille p. 4",
    remarque: "IGH non traité",
    fait: "Retirée.",
    statut: "Appliqué",
  };

  it("lit remarques et questions, et compte les statuts", () => {
    const a = lireAnnexeRelecture({
      remarques: [remarque, { ...remarque, statut: "Niveau audit" }],
      questions: ["Levage ?"],
    });
    expect(a.remarques).toHaveLength(2);
    expect(a.questions).toEqual(["Levage ?"]);
    expect(decompteStatuts(a.remarques)).toEqual([
      ["Appliqué", 1],
      ["Niveau audit", 1],
      ["Question en retour", 0],
    ]);
  });

  it("refuse un statut hors des trois, et une annexe sans remarque", () => {
    expect(() =>
      lireAnnexeRelecture({ remarques: [{ ...remarque, statut: "Fait" }] }),
    ).toThrow(/statut « Fait » inconnu/);
    expect(() => lireAnnexeRelecture({ remarques: [] })).toThrow(/non vide/);
  });
});

describe("lireArguments", () => {
  it("sépare le chemin de sortie des valeurs d'options", () => {
    const { options, drapeaux, positionnels } = lireArguments(
      ["sortie.pdf", "--propositions-audit", "p.json", "--annexe-relecture=r.json", "--detail"],
      ["propositions-audit", "annexe-relecture"],
    );
    expect(positionnels).toEqual(["sortie.pdf"]);
    expect(options.get("propositions-audit")).toBe("p.json");
    expect(options.get("annexe-relecture")).toBe("r.json");
    expect(drapeaux.has("detail")).toBe(true);
  });

  it("refuse une option sans valeur", () => {
    expect(() =>
      lireArguments(["--propositions-audit", "--detail"], ["propositions-audit"]),
    ).toThrow(/attend une valeur/);
  });
});
