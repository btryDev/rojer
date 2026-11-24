import { readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OUVERT_AUX_MOTEURS } from "@/lib/indexation";
import robots, { RACINES_EXCLUES, RACINES_INDEXABLES } from "./robots";

// L'hôte de la requête, lu par `robots()` et `sitemap()` (2026-11-24).
const requete = vi.hoisted(() => ({ hote: "rojer.exemple" as string | null }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(requete.hote ? { host: requete.hote } : {}),
}));

/**
 * Audit Next.js B11 : les pages publiques à lien, le registre d'accessibilité,
 * l'application et `/api` sont exclus de l'exploration.
 */
const interdits = async () => [(await robots()).rules].flat().flatMap((r) => [r.disallow ?? []].flat());

describe("robots.txt", () => {
  let disallow: string[];
  beforeEach(async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://rojer.exemple");
    requete.hote = "rojer.exemple";
    disallow = await interdits();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("fermé aux moteurs, interdit tout, accueil compris", () => {
    if (OUVERT_AUX_MOTEURS) return;
    expect(disallow).toEqual(["/"]);
  });

  it("exclut les pages publiques, l'application et /api", () => {
    if (!OUVERT_AUX_MOTEURS) return; // tout est déjà interdit
    for (const p of [
      "/acces/",
      "/accessibilite/",
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

  it("interdit tout sur un autre hôte que celui de l'adresse publique", async () => {
    for (const hote of ["app-818c5cef-038d-4b93-bf27-efc6a78b9e1c.cleverapps.io", "www.rojer.exemple", null]) {
      requete.hote = hote;
      expect(await interdits(), String(hote)).toEqual(["/"]);
      expect((await robots()).sitemap, String(hote)).toBeUndefined();
    }
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
