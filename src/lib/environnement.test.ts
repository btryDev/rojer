import { describe, expect, it } from "vitest";
import { ecritureAutomatiqueAutorisee, environnementApp } from "./environnement";

// La garde qui empêche une préversion de réécrire le calendrier (audit Next.js
// du 2026-10-14, H5). Elle lisait `VERCEL_ENV` seul : chez Clever Cloud, où la
// variable n'existe pas, une préversion aurait écrit. Ce qu'on éprouve ici :
// la préversion n'écrit pas, quel que soit l'hébergeur, et le doute non plus.

describe("environnementApp", () => {
  it("APP_ENV prime sur VERCEL_ENV", () => {
    expect(
      environnementApp({ APP_ENV: "preview", VERCEL_ENV: "production", NODE_ENV: "production" }),
    ).toBe("preview");
  });

  it("à défaut d'APP_ENV, lit VERCEL_ENV : la production Vercel n'a rien à configurer", () => {
    expect(environnementApp({ VERCEL_ENV: "production", NODE_ENV: "production" })).toBe(
      "production",
    );
  });

  it("une valeur d'APP_ENV inconnue est indéterminée, sans repli sur VERCEL_ENV", () => {
    expect(
      environnementApp({ APP_ENV: "prod", VERCEL_ENV: "production", NODE_ENV: "production" }),
    ).toBeNull();
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
  it("n'écrit pas depuis une préversion Clever Cloud (APP_ENV, sans VERCEL_ENV)", () => {
    expect(ecritureAutomatiqueAutorisee({ APP_ENV: "preview", NODE_ENV: "production" })).toBe(
      false,
    );
  });

  it("n'écrit pas depuis une préversion Vercel", () => {
    expect(ecritureAutomatiqueAutorisee({ VERCEL_ENV: "preview", NODE_ENV: "production" })).toBe(
      false,
    );
  });

  it("n'écrit pas dans le doute : production sans APP_ENV ni VERCEL_ENV", () => {
    expect(ecritureAutomatiqueAutorisee({ NODE_ENV: "production" })).toBe(false);
  });

  it("écrit en production déclarée, chez l'un comme chez l'autre", () => {
    expect(ecritureAutomatiqueAutorisee({ APP_ENV: "production", NODE_ENV: "production" })).toBe(
      true,
    );
    expect(
      ecritureAutomatiqueAutorisee({ VERCEL_ENV: "production", NODE_ENV: "production" }),
    ).toBe(true);
  });

  it("écrit en développement local", () => {
    expect(ecritureAutomatiqueAutorisee({ NODE_ENV: "development" })).toBe(true);
  });
});
