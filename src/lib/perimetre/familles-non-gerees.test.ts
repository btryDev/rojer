// « Ce que Rojer ne gère pas » — les cinq familles (2026-10-17, ADR-046).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { enumerer, FAMILLES_NON_GEREES } from "./familles-non-gerees";
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

  it("tout élément d'une énumération passe par `nonPorte`, et le référentiel ne le dément pas", () => {
    // Revue indépendante du 2026-10-17 : « rayonnements ionisants », écrit
    // hors du marqueur, était démenti par le suivi renforcé de catégorie A.
    const vus = new Set(
      affirmationsDeNonCouverture(RACINE)
        .filter((a) => a.fichier === FICHIER)
        .map((a) => a.sujet),
    );
    let n = 0;
    for (const f of FAMILLES_NON_GEREES) {
      for (const el of f.liste) {
        n++;
        expect(vus.has(el), `${f.cle} : « ${el} » hors de nonPorte`).toBe(true);
        expect(obligationsRepondantA(el), el).toEqual([]);
      }
      if (f.liste.length > 0) {
        const dans = [enumerer(f.liste), enumerer(f.liste, "ou")].some((e) => f.phrase.includes(e));
        expect(dans, `${f.cle} : la phrase ne porte pas sa liste`).toBe(true);
      }
    }
    expect(n).toBeGreaterThan(0);
    // La forme, à la source : chaque élément des tableaux est un appel.
    const source = readFileSync(join(RACINE, FICHIER), "utf8");
    const tableaux = [...source.matchAll(/^const [A-Z_]+ = \[\n([\s\S]*?)\n\] as const;/gm)];
    expect(tableaux.length).toBeGreaterThan(0);
    for (const t of tableaux) {
      for (const ligne of t[1].split("\n").filter((l) => l.trim() !== "")) {
        expect(ligne.trim(), ligne).toMatch(/^nonPorte\("/);
      }
    }
  });

  it("aucune énumération n'est écrite hors de `liste`", () => {
    // Trois éléments courts séparés par des virgules, une fois retirés les
    // sujets `nonPorte` et la liste : c'est une énumération qui échappe au
    // balayage.
    const ENUMERATION_NUE = /(?:[^,;:.—]{1,30}, ){2,}[^,;:.—]{1,30}/;
    const sujets = affirmationsDeNonCouverture(RACINE)
      .filter((a) => a.fichier === FICHIER)
      .map((a) => a.sujet)
      .sort((a, b) => b.length - a.length);
    for (const f of FAMILLES_NON_GEREES) {
      let reste = f.phrase.replace(enumerer(f.liste, "ou"), " ").replace(enumerer(f.liste), " ");
      for (const s of sujets) reste = reste.split(s).join(" ");
      expect(reste, f.cle).not.toMatch(ENUMERATION_NUE);
    }
  });

  it("les ballons : gonflés avec un gaz inflammable (M 36), pas « au gaz »", () => {
    const conduite = FAMILLES_NON_GEREES.find((f) => f.cle === "regles_de_conduite")!;
    expect(conduite.phrase).toContain("gaz inflammable");
  });

  it("ne laisse pas croire que le suivi renforcé n'est pas suivi", () => {
    const risques = FAMILLES_NON_GEREES.find((f) => f.cle === "risques_specialises")!;
    expect(risques.phrase).toContain("le suivi individuel renforcé");
    expect(obligationsRepondantA("le suivi individuel renforcé").length).toBeGreaterThan(0);
    expect(risques.phrase).not.toMatch(/amiante|plomb|radon/i);
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
      expect(f.phrase, f.cle).not.toMatch(/extincteur|dotation|doté|nombre suffisant|défibrillateur|\bDAE\b/i);
    }
    // Revue du 2026-10-17 : « le type, l'emplacement » touchaient la dotation
    // et la détention du DAE, encodées. La famille dit la conception.
    const equipements = FAMILLES_NON_GEREES.find((f) => f.cle === "equipements_a_prevoir")!;
    expect(equipements.phrase).toMatch(/^Rojer ne conçoit pas vos installations de sécurité/);
    expect(equipements.phrase).not.toMatch(/\btype\b|emplacement/i);
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
