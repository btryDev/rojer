import { describe, expect, it } from "vitest";
import {
  MESSAGE_SIRET_INVALIDE,
  MESSAGE_SIRET_REQUIS,
  estSiretValide,
  normaliserSiret,
  sirenDuSiret,
  siretSchema,
} from "./siret";

// SIRET publics : siège de l'INSEE et un bureau de La Poste.
const SIRET_INSEE = "12002701600357";
const SIRET_LA_POSTE = "35600000000048";
const SIRET_LA_POSTE_BUREAU = "35600000012345";

describe("estSiretValide", () => {
  it("accepte un SIRET dont la clé de Luhn est juste", () => {
    expect(estSiretValide(SIRET_INSEE)).toBe(true);
  });

  it("refuse le même SIRET avec un chiffre changé", () => {
    expect(estSiretValide("12002701600358")).toBe(false);
  });

  it("refuse ce qui n'a pas 14 chiffres", () => {
    expect(estSiretValide("1200270160035")).toBe(false);
    expect(estSiretValide("120027016003570")).toBe(false);
    expect(estSiretValide("1200270160035A")).toBe(false);
  });

  it("valide La Poste par la somme des chiffres multiple de 5", () => {
    expect(estSiretValide(SIRET_LA_POSTE)).toBe(true);
    // Somme 3+5+6+1+2+3+4+5 = 29 : pas un multiple de 5, et pas de Luhn.
    expect(estSiretValide(SIRET_LA_POSTE_BUREAU)).toBe(false);
    expect(estSiretValide("35600000012346")).toBe(true);
  });

  it("n'étend pas l'exception de La Poste aux autres SIREN", () => {
    // Somme multiple de 5, clé de Luhn fausse.
    expect(estSiretValide("12345678900005")).toBe(false);
  });
});

describe("normaliserSiret et sirenDuSiret", () => {
  it("retire les espaces et extrait les neuf premiers chiffres", () => {
    const siret = normaliserSiret("120 027 016 00357");
    expect(siret).toBe(SIRET_INSEE);
    expect(sirenDuSiret(siret)).toBe("120027016");
  });
});

describe("siretSchema", () => {
  it("rend le SIRET normalisé", () => {
    expect(siretSchema.parse(" 120 027 016 00357 ")).toBe(SIRET_INSEE);
  });

  it("exige une valeur", () => {
    for (const vide of ["", "   ", undefined]) {
      const r = siretSchema.safeParse(vide);
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe(MESSAGE_SIRET_REQUIS);
    }
  });

  it("refuse une clé fausse avec le message dédié", () => {
    const r = siretSchema.safeParse("12002701600358");
    expect(r.error?.issues[0]?.message).toBe(MESSAGE_SIRET_INVALIDE);
  });
});
