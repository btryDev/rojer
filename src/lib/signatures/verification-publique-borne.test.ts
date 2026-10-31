// La vérification publique recalcule l'empreinte par le client borné au
// compte propriétaire de l'établissement que porte la signature (ADR-051,
// `compte-hors-session.ts`, module réel ici) : elle réussit à travers lui,
// et un établissement sans propriétaire rend « document introuvable ».

import { beforeEach, describe, expect, it, vi } from "vitest";
import { correspond, type Ligne } from "@/test/prisma-where";
import { sha256Hex } from "./hash";

const CONTENU = Buffer.from("le rapport tel qu'il a été signé");

const h = vi.hoisted(() => ({
  signature: null as Ligne | null,
  proprietaire: "user-1" as string | null,
  rapports: [] as Ligne[],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    signature: { findUnique: async () => h.signature },
    etablissement: {
      findUnique: async () => ({ entreprise: { userId: h.proprietaire } }),
    },
    rapportVerification: {
      findFirst: async ({ where }: { where: Ligne }) => h.rapports.find((r) => correspond(r, where)) ?? null,
    },
  },
}));
vi.mock("@/lib/storage", () => ({
  getStorage: () => ({ get: async () => CONTENU }),
  StockageNonConfigure: class extends Error {},
}));

const { verifierIntegriteSignature } = await import("./verification-publique");

const PREUVE = {
  id: "sig_1",
  signataireNom: "Jean Dupond",
  signataireEmail: "jean@exemple-externe.fr",
  signataireRole: null,
  horodatageIso: new Date("2026-10-01T10:00:00Z"),
  methode: "otp_email",
  hashDocument: sha256Hex(CONTENU),
  nomDocument: "rapport.pdf",
};

beforeEach(() => {
  h.proprietaire = "user-1";
  h.rapports = [{ id: "r1", etablissementId: "e1", fichierCle: "r1.pdf", fichierNomOriginal: "rapport.pdf" }];
  h.signature = {
    ...PREUVE,
    objetType: "rapport_verification",
    objetId: "r1",
    etablissementId: "e1",
    ipAddress: "203.0.113.7",
  };
});

describe("vérification publique par le client borné du propriétaire", () => {
  it("réussit, et ne rend que la preuve", async () => {
    expect(await verifierIntegriteSignature("sig_1")).toEqual({ ok: true, signature: PREUVE });
  });

  it("un établissement sans propriétaire rend « document introuvable »", async () => {
    h.proprietaire = null;
    expect(await verifierIntegriteSignature("sig_1")).toEqual({ ok: false, raison: "document_introuvable" });
  });
});
