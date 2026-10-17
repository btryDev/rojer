// « Ce que Rojer ne gère pas » — les cinq familles (2026-10-17, ADR-046).

import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { FAMILLES_NON_GEREES } from "./familles-non-gerees";
import {
  affirmationsDeNonCouverture,
  obligationsRepondantA,
} from "./non-couverture-balayage";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FICHIER = join("src", "lib", "perimetre", "familles-non-gerees.ts");

describe("les cinq familles", () => {
  it("cinq familles, une phrase chacune", () => {
    expect(FAMILLES_NON_GEREES).toHaveLength(5);
    for (const f of FAMILLES_NON_GEREES) {
      expect(f.phrase, f.cle).toMatch(/^Rojer ne .+\.$/);
      // Une phrase : un seul point final, hors abréviations.
      expect(f.phrase.slice(0, -1), f.cle).not.toMatch(/\.\s+\p{Lu}/u);
    }
  });

  it("chaque famille passe par `nonPorte`, et le référentiel ne la dément pas", () => {
    const deLaFamille = affirmationsDeNonCouverture(RACINE).filter((a) => a.fichier === FICHIER);
    for (const f of FAMILLES_NON_GEREES) {
      const sujets = deLaFamille.filter((a) => f.phrase.includes(a.sujet));
      expect(sujets.length, `${f.cle} : aucun sujet nonPorte`).toBeGreaterThan(0);
      for (const s of sujets) expect(obligationsRepondantA(s.sujet), s.sujet).toEqual([]);
    }
  });

  it("se suffit à elle-même : aucun renvoi au document ni à une autre partie", () => {
    // Le dirigeant n'a pas accès au PDF du référentiel complet (Q1).
    for (const f of FAMILLES_NON_GEREES) {
      expect(f.phrase, f.cle).not.toMatch(/PDF|annexe|référentiel complet|ci-dessous|ci-dessus|voir /i);
    }
  });

  it("« mise en accessibilité du bâtiment », jamais « accessibilité » seul", () => {
    const tout = FAMILLES_NON_GEREES.map((f) => f.phrase).join(" ");
    expect(tout).toContain("mise en accessibilité du bâtiment");
    const seuls = [...tout.matchAll(/accessibilité/g)].filter(
      (m) => tout.slice(Math.max(0, m.index! - 8), m.index) !== "mise en ",
    );
    expect(seuls).toHaveLength(0);
  });

  it("ne promet rien sur la dotation de R. 4227-29, qui est encodée", () => {
    // La dotation d'extincteurs est servie : aucune famille ne doit en parler,
    // ni pour la dire non suivie, ni pour la promettre.
    expect(
      obligationsConformite.some((o) => o.id === "incendie-travail-extincteurs-dotation"),
    ).toBe(true);
    for (const f of FAMILLES_NON_GEREES) {
      expect(f.phrase, f.cle).not.toMatch(/extincteur|dotation|doté|nombre suffisant/i);
    }
  });

  it("ne qualifie jamais, ne compte rien, ne cite aucune référence", () => {
    for (const f of FAMILLES_NON_GEREES) {
      const p = f.phrase.toLowerCase();
      for (const interdit of ["conforme", "en règle", "en infraction", "vous devez", "pensez à"]) {
        expect(p, `${f.cle} : ${interdit}`).not.toContain(interdit);
      }
      expect(f.phrase).not.toMatch(/%|\b[LRD]\.\s?\d{3,4}-\d/);
    }
  });
});
