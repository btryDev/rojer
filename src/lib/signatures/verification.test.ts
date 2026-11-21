import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * « Vérifier » dans l'application (2026-11-21, ADR-006 amendée) : la
 * signature se relit dans l'établissement demandé seulement, l'empreinte se
 * recalcule, et une signature révoquée se vérifie aussi, en le disant.
 */

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({ hash: "v2:aaa" as string | null }));
vi.mock("./hash-objet", async (orig) => ({
  ...(await orig<typeof import("./hash-objet")>()),
  calculerHashObjet: vi.fn(async () =>
    h.hash === null ? { ok: false, raison: "objet_introuvable" } : { ok: true, hash: h.hash, nomDocument: null },
  ),
}));

import { verifierSignature } from "./verification";

type Ligne = { id: string; etablissementId: string; objetType: string; objetId: string; hashDocument: string; active: true | null; revoqueLe: Date | null };
let lignes: Ligne[] = [];
const db = {
  signature: {
    findFirst: vi.fn(async ({ where }: { where: { id: string; etablissementId: string } }) =>
      lignes.find((l) => l.id === where.id && l.etablissementId === where.etablissementId) ?? null,
    ),
  },
} as never;

const sig = (extra: Partial<Ligne> = {}): Ligne => ({
  id: "sig_1",
  etablissementId: "etab-a",
  objetType: "plan_prevention",
  objetId: "pp-1",
  hashDocument: "v2:aaa",
  active: true,
  revoqueLe: null,
  ...extra,
});

beforeEach(() => {
  lignes = [sig()];
  h.hash = "v2:aaa";
});

describe("verifierSignature", () => {
  it("empreinte identique : intacte", async () => {
    expect(await verifierSignature(db, "etab-a", "sig_1", "u1")).toEqual({ etat: "intacte", revoqueLe: null });
  });

  it("empreinte différente : le document a changé", async () => {
    h.hash = "v2:bbb";
    expect(await verifierSignature(db, "etab-a", "sig_1", "u1")).toMatchObject({ etat: "modifiee", hashAttendu: "v2:aaa", hashActuel: "v2:bbb" });
  });

  it("forme d'empreinte antérieure : ni modifiée ni intacte", async () => {
    lignes = [sig({ hashDocument: "0".repeat(64) })];
    expect(await verifierSignature(db, "etab-a", "sig_1", "u1")).toMatchObject({ etat: "version_anterieure" });
  });

  it("la signature d'un autre établissement est introuvable, sans recalcul", async () => {
    expect(await verifierSignature(db, "etab-b", "sig_1", "u1")).toEqual({ etat: "introuvable" });
  });

  it("une signature révoquée se vérifie, et le verdict porte sa date de révocation", async () => {
    const le = new Date("2026-11-20T10:00:00Z");
    lignes = [sig({ active: null, revoqueLe: le })];
    h.hash = "v2:bbb";
    expect(await verifierSignature(db, "etab-a", "sig_1", "u1")).toMatchObject({ etat: "modifiee", revoqueLe: le.toISOString() });
  });

  it("l'objet signé n'existe plus : introuvable", async () => {
    h.hash = null;
    expect(await verifierSignature(db, "etab-a", "sig_1", "u1")).toEqual({ etat: "introuvable" });
  });
});
