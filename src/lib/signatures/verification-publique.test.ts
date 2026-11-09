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

const { verifierSousLimite, lireSignatureSousLimite } = await import("./verification-publique");

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

  it("/signe passe par la même limite : au-delà, refuse sans lire la signature", async () => {
    h.verdict = { ok: false, reessayerDansSecondes: 120 };
    expect(await lireSignatureSousLimite("sig_1")).toEqual({
      ok: false,
      raison: "trop_de_demandes",
      reessayerDansSecondes: 120,
    });
    expect(h.lue).toBe(0);
  });

  it("/signe sous la limite lit la signature", async () => {
    expect(await lireSignatureSousLimite("sig_1")).toEqual({ ok: true, signature: null });
    expect(h.lue).toBe(1);
  });

  it("la page /signe ne lit la signature que par la limite", () => {
    // Commentaires retirés : la page raconte encore l'ancienne lecture.
    const page = readFileSync(join(process.cwd(), "src/app/signe/[signatureId]/page.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(page).toMatch(/\blireSignatureSousLimite\(/);
    expect(page).not.toMatch(/\bgetSignature\b/);
  });

  it("n'est exportée d'aucun module \"use server\"", () => {
    const actions = readFileSync(join(process.cwd(), "src/lib/signatures/actions.ts"), "utf8");
    expect(actions).not.toMatch(/export async function verifierIntegriteSignature/);
    const ici = readFileSync(join(process.cwd(), "src/lib/signatures/verification-publique.ts"), "utf8");
    expect(ici).not.toMatch(/^["']use server["']/m);
  });
});
