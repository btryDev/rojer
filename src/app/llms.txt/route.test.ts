import { afterEach, describe, expect, it, vi } from "vitest";
import * as indexation from "@/lib/indexation";
import { cheminPublic } from "@/lib/auth/proxy-session";
import { GET } from "./route";
import { texteLlms } from "./texte";

describe("llms.txt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("suit le format de llmstxt.org : titre, citation, liens absolus", () => {
    const texte = texteLlms("https://rojer.exemple");
    const lignes = texte.split("\n");
    expect(lignes[0]).toBe("# Rojer");
    expect(lignes[2]).toMatch(/^> /);
    expect(texte).toContain("- [Accueil](https://rojer.exemple)");
    expect(texte).toContain("(https://rojer.exemple/legal/mentions-legales)");
    expect(texte).not.toMatch(/vous êtes conforme|garanti/i);
  });

  it("est servi sans session", () => {
    expect(cheminPublic("/llms.txt")).toBe(true);
  });

  it("adresse publique inconnue : 404, jamais localhost", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "");
    expect(GET().status).toBe(404);
  });

  it("adresse connue : texte brut", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://rojer.exemple");
    const r = GET();
    expect(r.headers.get("Content-Type")).toMatch(/^text\/plain/);
    expect(await r.text()).toContain("https://rojer.exemple/conditions");
  });

  it("site fermé aux moteurs : 404", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://rojer.exemple");
    // La constante est typée `true` tant que le site est ouvert : on la lit
    // comme un booléen pour simuler la fermeture.
    vi.spyOn(indexation as { OUVERT_AUX_MOTEURS: boolean }, "OUVERT_AUX_MOTEURS", "get").mockReturnValue(false);
    expect(GET().status).toBe(404);
  });
});
