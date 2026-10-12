import { describe, expect, it } from "vitest";
import {
  actionVerificationSchema,
  cloturerActionSchema,
} from "./schema";

describe("actionVerificationSchema", () => {
  const base = {
    libelle: "Remplacer le BAES défectueux",
    type: "reduction_source",
  };

  it("accepte une saisie minimale", () => {
    const res = actionVerificationSchema.safeParse(base);
    expect(res.success).toBe(true);
  });

  it("refuse un libellé vide", () => {
    const res = actionVerificationSchema.safeParse({ ...base, libelle: "" });
    expect(res.success).toBe(false);
  });

  it("refuse un type hors hiérarchie L. 4121-2", () => {
    const res = actionVerificationSchema.safeParse({
      ...base,
      type: "autre",
    });
    expect(res.success).toBe(false);
  });

  it("refuse une criticité hors [1..5]", () => {
    const res = actionVerificationSchema.safeParse({
      ...base,
      criticite: 7,
    });
    expect(res.success).toBe(false);
  });

  it("accepte une criticité valide", () => {
    const res = actionVerificationSchema.safeParse({ ...base, criticite: 3 });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.criticite).toBe(3);
  });

  it("parse une échéance au format ISO court", () => {
    const res = actionVerificationSchema.safeParse({
      ...base,
      echeance: "2026-06-15",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.echeance).toBeInstanceOf(Date);
  });

  it("refuse une échéance au format FR", () => {
    const res = actionVerificationSchema.safeParse({
      ...base,
      echeance: "15/06/2026",
    });
    expect(res.success).toBe(false);
  });
});

describe("cloturerActionSchema", () => {
  it("refuse un commentaire trop court (< 5)", () => {
    expect(
      cloturerActionSchema.safeParse({ commentaire: "ok" }).success,
    ).toBe(false);
  });

  it("accepte un commentaire de 5 caractères", () => {
    expect(
      cloturerActionSchema.safeParse({ commentaire: "OK OK" }).success,
    ).toBe(true);
  });

  it("conserve un rapportId facultatif", () => {
    const res = cloturerActionSchema.safeParse({
      commentaire: "Remis en état",
      rapportId: "rap_123",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.rapportId).toBe("rap_123");
  });

  it("met à undefined un rapportId vide", () => {
    const res = cloturerActionSchema.safeParse({
      commentaire: "ok ok",
      rapportId: "",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.rapportId).toBeUndefined();
  });
});
