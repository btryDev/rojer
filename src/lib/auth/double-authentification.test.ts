import { describe, expect, it } from "vitest";
import { codeSaisi } from "./double-authentification";

describe("codeSaisi", () => {
  it("six chiffres : un code de l'application, espaces et tirets ignorés", () => {
    expect(codeSaisi("123456")).toEqual({ genre: "application", valeur: "123456" });
    expect(codeSaisi(" 123 456 ")).toEqual({ genre: "application", valeur: "123456" });
    expect(codeSaisi("123-456")).toEqual({ genre: "application", valeur: "123456" });
  });

  it("dix lettres et chiffres : un code de secours, sous la forme gardée par Better Auth, casse comprise", () => {
    expect(codeSaisi("AbCdE-12345")).toEqual({ genre: "secours", valeur: "AbCdE-12345" });
    expect(codeSaisi("AbCdE12345")).toEqual({ genre: "secours", valeur: "AbCdE-12345" });
    expect(codeSaisi("0123456789")).toEqual({ genre: "secours", valeur: "01234-56789" });
  });

  it("rien d'autre", () => {
    for (const brut of ["", "12345", "1234567", "abcdef", "AbCdE-1234", "AbCdE-123456", "12345é7890", "<script>"]) {
      expect(codeSaisi(brut), brut).toBeNull();
    }
  });
});
