import { describe, expect, it } from "vitest";
import { historiqueJusqua } from "./historique";

// Audit du 2026-10-12 : le PDF de la v1, rouvert après la v3, listait la v2 et
// la v3 dans son « Historique des versions ».

const versions = [3, 2, 1].map((numero) => ({
  numero,
  createdAt: new Date(`2026-0${numero}-01T10:00:00Z`),
  motif: `motif ${numero}`,
}));

describe("historiqueJusqua", () => {
  it("le PDF d'une version ne cite aucune version postérieure", () => {
    const h = historiqueJusqua(versions, 1);
    expect(h.every((v) => v.numero <= 1)).toBe(true);
  });

  it("il cite la version elle-même et celles qui la précèdent", () => {
    const numeros = historiqueJusqua(versions, 2).map((v) => v.numero);
    expect(numeros).toContain(2);
    expect(numeros).toContain(1);
  });
});
