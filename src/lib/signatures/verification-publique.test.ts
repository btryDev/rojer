import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * La vérification publique d'une signature (audit OWASP B14, 2026-10-14) :
 *   - n'est plus une action serveur (elle était exportée d'un module
 *     `"use server"`, donc appelable par POST sur n'importe quelle page) ;
 *   - passe par la limite par IP avant de lire la signature.
 */

const h = vi.hoisted(() => ({
  verdict: { ok: true } as { ok: true } | { ok: false; reessayerDansSecondes: number },
  lue: 0,
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));
vi.mock("@/lib/securite/limite-debit", async (original) => ({
  ...(await original<typeof import("@/lib/securite/limite-debit")>()),
  consommer: async () => h.verdict,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    signature: {
      findUnique: async () => {
        h.lue += 1;
        return null;
      },
    },
  },
}));

const { verifierSousLimite } = await import("./verification-publique");

beforeEach(() => {
  h.verdict = { ok: true };
  h.lue = 0;
});

describe("vérification publique sous limite", () => {
  it("au-delà de la limite, refuse sans lire la signature", async () => {
    h.verdict = { ok: false, reessayerDansSecondes: 300 };
    expect(await verifierSousLimite("sig_1")).toEqual({
      ok: false,
      raison: "trop_de_demandes",
      reessayerDansSecondes: 300,
    });
    expect(h.lue).toBe(0);
  });

  it("sous la limite, vérifie", async () => {
    expect(await verifierSousLimite("sig_1")).toEqual({ ok: false, raison: "inexistante" });
    expect(h.lue).toBe(1);
  });

  it("n'est exportée d'aucun module \"use server\"", () => {
    const actions = readFileSync(join(process.cwd(), "src/lib/signatures/actions.ts"), "utf8");
    expect(actions).not.toMatch(/export async function verifierIntegriteSignature/);
    const ici = readFileSync(join(process.cwd(), "src/lib/signatures/verification-publique.ts"), "utf8");
    expect(ici).not.toMatch(/^["']use server["']/m);
  });
});
