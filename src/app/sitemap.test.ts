import { afterEach, describe, expect, it, vi } from "vitest";
import robots, { RACINES_INDEXABLES } from "./robots";
import sitemap, { PAGES_DU_PLAN } from "./sitemap";

// L'hôte de la requête, lu par `robots()` et `sitemap()` (2026-11-24).
const requete = vi.hoisted(() => ({ hote: "rojer.exemple" as string | null }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(requete.hote ? { host: requete.hote } : {}),
}));

/** Le plan du site et son annonce (2026-11-23). */
describe("sitemap.xml", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    requete.hote = "rojer.exemple";
  });

  it("annonce l'accueil, la page d'attente, les conditions et les pages légales", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://rojer.exemple");
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("https://rojer.exemple");
    expect(urls).toContain("https://rojer.exemple/bientot");
    expect(urls).toContain("https://rojer.exemple/conditions");
    expect(urls).toContain("https://rojer.exemple/legal/confidentialite");
  });

  it("n'annonce que des pages que robots.txt laisse explorer", () => {
    for (const chemin of PAGES_DU_PLAN) {
      const racine = RACINES_INDEXABLES.some((r) => chemin === r || (r !== "/" && chemin.startsWith(r)));
      expect(racine, chemin).toBe(true);
    }
  });

  it("adresse publique inconnue : plan vide, robots.txt sans plan — jamais localhost", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "");
    expect(await sitemap()).toEqual([]);
    expect((await robots()).sitemap).toBeUndefined();
  });

  it("robots.txt annonce le plan quand l'adresse est connue", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://rojer.exemple/");
    expect((await robots()).sitemap).toBe("https://rojer.exemple/sitemap.xml");
  });

  it("plan vide sur un autre hôte que celui de l'adresse publique", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://rojer.exemple");
    requete.hote = "app-818c5cef-038d-4b93-bf27-efc6a78b9e1c.cleverapps.io";
    expect(await sitemap()).toEqual([]);
  });
});
