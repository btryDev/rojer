import { describe, expect, it } from "vitest";
import { ESPACE_UNITE, formaterMesure, formaterNombreFr } from "./mesures";

const NBSP = "\u00A0";

describe("formaterNombreFr", () => {
  it("rend une virgule décimale, jamais un point", () => {
    expect(formaterNombreFr(53, 1)).toBe("53,0");
    expect(formaterNombreFr(52.46, 1)).toBe("52,5");
    expect(formaterNombreFr(53.5, 1)).not.toContain(".");
  });

  it("sépare les milliers par une espace insécable (fine), pas par une espace sécable", () => {
    const r = formaterNombreFr(1000);
    expect(r.replace(/\D/g, "")).toBe("1000");
    expect(r).not.toContain(" ");
    expect(r).toMatch(/^1[\u00A0\u202F]000$/);
  });

  it("sans décimale demandée, arrondit à l'entier", () => {
    expect(formaterNombreFr(67.4)).toBe("67");
  });

  it("un seuil au demi-degré garde sa décimale avec (0, 1), sans en ajouter à l'entier", () => {
    // Revue du 2026-10-13 : « 55,5 » rendu « 56 » à côté d'un relevé de 55,8.
    expect(formaterNombreFr(55.5, 0, 1)).toBe("55,5");
    expect(formaterNombreFr(24.5, 0, 1)).toBe("24,5");
    expect(formaterNombreFr(55, 0, 1)).toBe("55");
    expect(formaterMesure(25.5, "°C", 0, 1)).toBe(`25,5${NBSP}°C`);
  });
});

describe("formaterMesure — l'unité séparée par une espace insécable", () => {
  it("l'espace d'unité est U+00A0", () => {
    expect(ESPACE_UNITE).toBe(NBSP);
  });

  it.each([
    [53, "°C", 1, `53,0${NBSP}°C`],
    [67, "%", 0, `67${NBSP}%`],
    [320, "UFC/L", 0, `320${NBSP}UFC/L`],
    [50, "°C", 0, `50${NBSP}°C`],
  ] as const)("%s %s → %s", (valeur, unite, decimales, attendu) => {
    expect(formaterMesure(valeur, unite, decimales)).toBe(attendu);
  });

  it("ne colle jamais l'unité au nombre, ni ne l'en sépare par une espace sécable", () => {
    for (const unite of ["°C", "%", "UFC/L"] as const) {
      const r = formaterMesure(12, unite);
      expect(r).not.toMatch(/\d(°|%|U)/);
      expect(r).not.toContain(" ");
    }
  });
});
