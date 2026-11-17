import { describe, expect, it } from "vitest";
import { ecritureAutomatiqueAutorisee, environnementApp } from "./environnement";

// La garde qui empêche une préversion de réécrire le calendrier (audit Next.js
// du 2026-10-14, H5). Ce qu'on éprouve ici : la préversion n'écrit pas, et le
// doute non plus.

describe("environnementApp", () => {
  it("lit APP_ENV", () => {
    expect(environnementApp({ APP_ENV: "preview", NODE_ENV: "production" })).toBe("preview");
    expect(environnementApp({ APP_ENV: "production", NODE_ENV: "production" })).toBe("production");
  });

  it("une valeur d'APP_ENV inconnue est indéterminée", () => {
    expect(environnementApp({ APP_ENV: "prod", NODE_ENV: "production" })).toBeNull();
  });

  it("VERCEL_ENV n'est plus lue (Vercel retiré, 2026-11-17)", () => {
    expect(environnementApp({ VERCEL_ENV: "production", NODE_ENV: "production" })).toBeNull();
  });

  it("un serveur de production qui ne dit pas ce qu'il est est indéterminé", () => {
    expect(environnementApp({ NODE_ENV: "production" })).toBeNull();
  });

  it("hors build de production et sans rien de posé : développement", () => {
    expect(environnementApp({ NODE_ENV: "development" })).toBe("development");
    expect(environnementApp({ NODE_ENV: "test" })).toBe("development");
  });
});

describe("ecritureAutomatiqueAutorisee", () => {
  it("n'écrit pas depuis une préversion", () => {
    expect(ecritureAutomatiqueAutorisee({ APP_ENV: "preview", NODE_ENV: "production" })).toBe(
      false,
    );
  });

  it("n'écrit pas dans le doute : production sans APP_ENV", () => {
    expect(ecritureAutomatiqueAutorisee({ NODE_ENV: "production" })).toBe(false);
  });

  it("écrit en production déclarée", () => {
    expect(ecritureAutomatiqueAutorisee({ APP_ENV: "production", NODE_ENV: "production" })).toBe(
      true,
    );
  });

  it("écrit en développement local", () => {
    expect(ecritureAutomatiqueAutorisee({ NODE_ENV: "development" })).toBe(true);
  });
});
