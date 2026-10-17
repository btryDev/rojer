import { describe, expect, it } from "vitest";
import {
  decompteStatuts,
  lireAnnexeRelecture,
  lireArguments,
  lirePropositionsAudit,
  propositionsADecider,
} from "./entrees-grille-relecture";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";

const IDS = new Set(["a", "b", "c"]);
const AUDIT = new Set(["c"]);

describe("lirePropositionsAudit", () => {
  it("indexe les propositions par id", () => {
    const m = lirePropositionsAudit(
      [{ id: "a", motif: " Un écrit fait une fois. " }],
      IDS,
    );
    expect(m.get("a")).toEqual({ id: "a", motif: "Un écrit fait une fois." });
    expect(m.has("b")).toBe(false);
  });

  it("refuse un id absent du référentiel : la ligne proposée n'apparaîtrait nulle part", () => {
    expect(() => lirePropositionsAudit([{ id: "z", motif: "m" }], IDS)).toThrow(
      /n'est pas au référentiel/,
    );
  });

  // ~~« refuse une ligne déjà au niveau audit »~~ — 2026-10-17 : une
  // proposition décidée n'est pas une erreur du fichier ; elle sort des
  // propositions (`propositionsADecider`, plus bas).
  it("refuse un doublon, un motif vide", () => {
    expect(() =>
      lirePropositionsAudit(
        [
          { id: "a", motif: "m" },
          { id: "a", motif: "m" },
        ],
        IDS,
      ),
    ).toThrow(/deux fois/);
    expect(() => lirePropositionsAudit([{ id: "a", motif: " " }], IDS)).toThrow(/motif/);
    expect(() => lirePropositionsAudit({ id: "a" }, IDS)).toThrow(/tableau/);
  });

  it("lit une proposition déjà décidée, sans échouer", () => {
    expect(lirePropositionsAudit([{ id: "c", motif: "m" }], IDS).has("c")).toBe(true);
  });
});

describe("propositionsADecider — une proposition décidée n'est jamais présentée comme non décidée (2026-10-17)", () => {
  it("écarte les lignes déjà au niveau audit, garde les autres", () => {
    const lues = lirePropositionsAudit(
      [
        { id: "a", motif: "m" },
        { id: "c", motif: "m" },
      ],
      IDS,
    );
    const ouvertes = propositionsADecider(lues, AUDIT);
    expect([...ouvertes.keys()]).toEqual(["a"]);
    expect(ouvertes.has("c")).toBe(false);
  });

  it("sur le référentiel réel : aucune proposition rendue n'est au niveau audit", () => {
    const dejaAudit = obligationsConformite.filter(estNiveauAudit).map((o) => o.id);
    expect(dejaAudit.length).toBeGreaterThan(0);
    const lues = lirePropositionsAudit(
      dejaAudit.map((id) => ({ id, motif: "proposée avant d'être décidée" })),
      new Set(obligationsConformite.map((o) => o.id)),
    );
    expect(lues.size).toBe(dejaAudit.length);
    const ouvertes = propositionsADecider(lues, new Set(dejaAudit));
    for (const id of ouvertes.keys()) {
      const o = obligationsConformite.find((x) => x.id === id)!;
      expect(estNiveauAudit(o), id).toBe(false);
    }
    expect(ouvertes.size).toBe(0);
  });

  it("le script de la grille passe ses propositions par ce tri", () => {
    const script = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "scripts", "generer-grille-equipements.tsx"),
      "utf8",
    );
    expect(script).toMatch(
      /const propositions = options\.has\("propositions-audit"\)\s*\?\s*propositionsADecider\(\s*lirePropositionsAudit\(/,
    );
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
