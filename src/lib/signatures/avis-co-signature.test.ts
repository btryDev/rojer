// L'avis « signé par toutes les parties » porte le PDF du plan de prévention
// (2026-11-19, ADR-061 § 7) ; sans PDF, il part quand même.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

const h = vi.hoisted(() => ({
  sendMail: vi.fn(async () => {}),
  pieceJointe: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  envoiEnService: () => true,
  motifErreur: (e: unknown) => (e instanceof Error ? e.message : "erreur inconnue"),
  publicAppUrl: () => "https://rojer.example",
  sendMail: h.sendMail,
}));
vi.mock("@/lib/pdf/piece-jointe-plan-prevention", () => ({
  pieceJointePlanPrevention: h.pieceJointe,
}));
vi.mock("./libelle-document", () => ({
  libelleDocumentSignable: async () => "Plan de prévention PP-001",
}));

const { envoyerAvisCoSignature } = await import("./avis-co-signature");

const SIGNATURES = [
  {
    id: "sig_1",
    partie: "entreprise_utilisatrice",
    signataireNom: "Claire",
    signataireEmail: "claire@exemple.test",
    hashDocument: "a".repeat(64),
    horodatageIso: new Date("2026-11-19T09:00:00Z"),
  },
  {
    id: "sig_2",
    partie: "entreprise_exterieure",
    signataireNom: "Paul",
    signataireEmail: "paul@exemple.test",
    hashDocument: "b".repeat(64),
    horodatageIso: new Date("2026-11-19T10:00:00Z"),
  },
];
const db = {
  signature: { findMany: vi.fn(async () => SIGNATURES) },
} as unknown as Prisma.TransactionClient;

const PIECE = { name: "Plan_prevention_PP-001_X.pdf", content: "JVBERi0=", contentType: "application/pdf" };

beforeEach(() => {
  h.sendMail.mockClear();
  h.pieceJointe.mockReset();
});

describe("envoyerAvisCoSignature — pièce jointe", () => {
  it("plan de prévention : le PDF, rendu une fois, est joint à chaque avis", async () => {
    h.pieceJointe.mockResolvedValue(PIECE);
    await envoyerAvisCoSignature(db, "plan_prevention", "plan-1", "etab-1");
    expect(h.pieceJointe).toHaveBeenCalledTimes(1);
    expect(h.pieceJointe).toHaveBeenCalledWith(db, "etab-1", "plan-1");
    expect(h.sendMail).toHaveBeenCalledTimes(2);
    for (const [payload] of h.sendMail.mock.calls as unknown as [{ attachments?: unknown }][]) {
      expect(payload.attachments).toEqual([PIECE]);
    }
  });

  it("le PDF n'a pas pu être produit : l'avis part sans pièce", async () => {
    h.pieceJointe.mockResolvedValue(null);
    await envoyerAvisCoSignature(db, "plan_prevention", "plan-1", "etab-1");
    expect(h.sendMail).toHaveBeenCalledTimes(2);
    for (const [payload] of h.sendMail.mock.calls as unknown as [object][]) {
      expect(payload).not.toHaveProperty("attachments");
    }
  });

  it("permis de feu : aucun PDF n'est demandé ni joint", async () => {
    await envoyerAvisCoSignature(db, "permis_feu", "permis-1", "etab-1");
    expect(h.pieceJointe).not.toHaveBeenCalled();
    for (const [payload] of h.sendMail.mock.calls as unknown as [object][]) {
      expect(payload).not.toHaveProperty("attachments");
    }
  });
});
