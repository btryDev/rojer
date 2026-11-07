import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OUVERT_AUX_MOTEURS } from "@/lib/indexation";
import robots, { RACINES_EXCLUES, RACINES_INDEXABLES } from "./robots";

/**
 * Audit Next.js B11 : les pages publiques à lien, le registre d'accessibilité,
 * l'application et `/api` sont exclus de l'exploration.
 */
describe("robots.txt", () => {
  const disallow = [robots().rules].flat().flatMap((r) => [r.disallow ?? []].flat());

  it("fermé aux moteurs, interdit tout, accueil compris", () => {
    if (OUVERT_AUX_MOTEURS) return;
    expect(disallow).toEqual(["/"]);
  });

  it("exclut les pages publiques, l'application et /api", () => {
    if (!OUVERT_AUX_MOTEURS) return; // tout est déjà interdit
    for (const p of [
      "/acces/",
      "/accessibilite/",
      "/signe/",
      "/verifier/",
      "/etablissements/",
      "/duerp/",
      "/entreprises",
      "/api/",
    ]) {
      expect(disallow, p).toContain(p);
    }
  });

  it("ouvert aux moteurs, n'exclut pas l'accueil", () => {
    if (!OUVERT_AUX_MOTEURS) return;
    expect(disallow).not.toContain("/");
  });

  it("chaque racine de src/app est rangée, d'un côté ou de l'autre", () => {
    // Une racine ajoutée demain sans y penser serait explorable par défaut.
    const racines = readdirSync(join(process.cwd(), "src", "app"), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("("))
      .map((e) => `/${e.name}`);
    expect(racines.length).toBeGreaterThan(10);
    const rangees = [...RACINES_INDEXABLES, ...RACINES_EXCLUES].map((r) => r.replace(/\/$/, ""));
    const oubliees = racines.filter((r) => !rangees.includes(r));
    expect(oubliees).toEqual([]);
  });
});
