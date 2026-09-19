import { describe, expect, it } from "vitest";
import { TAILLE_MAX_IMPORT_OCTETS, validerFichierImport } from "./format";

const fichier = (nom: string, type: string, taille = 1024) =>
  new File([new Uint8Array(taille)], nom, { type });

describe("le format d'un import de DUERP", () => {
  // La régression elle-même : jusqu'au 2026-09-19, un tableur avec son vrai
  // type était refusé par le validateur des rapports. Ces trois cas sont ceux
  // que l'import doit servir, et le premier suffit à dire s'il est cassé.
  it("accepte un .xlsx, un .xls et un .csv envoyés avec leur type", () => {
    expect(validerFichierImport(fichier("duerp.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).ok).toBe(true);
    expect(validerFichierImport(fichier("duerp.xls", "application/vnd.ms-excel")).ok).toBe(true);
    expect(validerFichierImport(fichier("duerp.csv", "text/csv")).ok).toBe(true);
  });

  it("accepte un tableur dont le navigateur n'a pas su dire le type", () => {
    expect(validerFichierImport(fichier("duerp.csv", "")).ok).toBe(true);
    expect(validerFichierImport(fichier("duerp.xlsx", "application/octet-stream")).ok).toBe(true);
  });

  it("refuse un PDF, même renommé en tableur", () => {
    expect(validerFichierImport(fichier("duerp.pdf", "application/pdf")).ok).toBe(false);
    expect(validerFichierImport(fichier("duerp.xlsx", "application/pdf")).ok).toBe(false);
  });

  it("refuse ce qui n'est ni un tableur par son type, ni par son extension", () => {
    expect(validerFichierImport(fichier("rapport.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).ok).toBe(false);
    expect(validerFichierImport(fichier("photo.png", "image/png")).ok).toBe(false);
  });

  it("borne la taille : la limite passe, un octet de plus non", () => {
    expect(validerFichierImport(fichier("duerp.csv", "text/csv", TAILLE_MAX_IMPORT_OCTETS)).ok).toBe(true);
    expect(validerFichierImport(fichier("duerp.csv", "text/csv", TAILLE_MAX_IMPORT_OCTETS + 1)).ok).toBe(false);
  });

  it("refuse un fichier vide", () => {
    expect(validerFichierImport(fichier("duerp.csv", "text/csv", 0)).ok).toBe(false);
  });
});
