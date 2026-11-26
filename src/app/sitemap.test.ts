import { afterEach, describe, expect, it, vi } from "vitest";
import robots, { RACINES_INDEXABLES } from "./robots";
import sitemap, { PAGES_DU_PLAN } from "./sitemap";

/** Le plan du site et son annonce (2026-11-23). */
describe("sitemap.xml", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("annonce l'accueil, les conditions et les pages légales", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://rojer.exemple");
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain("https://rojer.exemple");
    expect(urls).toContain("https://rojer.exemple/conditions");
    expect(urls).toContain("https://rojer.exemple/legal/confidentialite");
  });

  it("n'annonce que des pages que robots.txt laisse explorer", () => {
    for (const chemin of PAGES_DU_PLAN) {
      const racine = RACINES_INDEXABLES.some((r) => chemin === r || (r !== "/" && chemin.startsWith(r)));
      expect(racine, chemin).toBe(true);
    }
  });

  it("adresse publique inconnue : plan vide, robots.txt sans plan — jamais localhost", () => {
    vi.stubEnv("PUBLIC_APP_URL", "");
    expect(sitemap()).toEqual([]);
    expect(robots().sitemap).toBeUndefined();
  });

  it("robots.txt annonce le plan quand l'adresse est connue", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://rojer.exemple/");
    expect(robots().sitemap).toBe("https://rojer.exemple/sitemap.xml");
  });
});
