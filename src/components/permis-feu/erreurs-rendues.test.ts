import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Un refus serveur sur un champ sans `err()` rendu restait muet (vérification
// du 2026-09-26). La liste des champs rendus à côté d'eux est écrite à la
// main dans le formulaire : ce test la confronte aux `err("…")` du source,
// pour qu'elle ne mente ni dans un sens ni dans l'autre.
const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "FormulairePermisFeu.tsx"), "utf8");

describe("les erreurs de champ du formulaire de permis de feu ne se perdent pas", () => {
  it("la liste des champs rendus est exactement celle des err() du formulaire", () => {
    const rendus = new Set([...source.matchAll(/err\("([^"]+)"\)/g)].map((m) => m[1]));
    const bloc = /CHAMPS_AVEC_ERREUR_RENDUE = new Set\(\[([\s\S]*?)\]\)/.exec(source)![1];
    const declares = new Set([...bloc.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
    expect([...declares].sort()).toEqual([...rendus].sort());
  });

  it("le message général ne se masque plus dès qu'il y a des erreurs de champ", () => {
    expect(source).not.toMatch(/state\.status === "error" && !state\.fieldErrors && \(/);
  });
});
