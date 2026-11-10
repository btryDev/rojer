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
  /** Si posée, chaque lecture attend cette promesse (recalcul « en cours »). */
  porte: null as Promise<void> | null,
  ip: "203.0.113.7",
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": h.ip }),
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
        if (h.porte) await h.porte;
        return null;
      },
    },
  },
}));

const { verifierSousLimite } = await import("./verification-publique");

beforeEach(() => {
  h.verdict = { ok: true };
  h.lue = 0;
  h.porte = null;
  h.ip = "203.0.113.7";
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

  it("une adresse ne tient que deux recalculs : au-delà, refus sans lecture (audit du 2026-11-10)", async () => {
    let ouvrir!: () => void;
    h.porte = new Promise<void>((r) => (ouvrir = r));
    const enCours = [verifierSousLimite("sig_1"), verifierSousLimite("sig_1")];
    await new Promise((r) => setTimeout(r, 0));
    expect(h.lue).toBe(2);
    expect(await verifierSousLimite("sig_1")).toEqual({
      ok: false,
      raison: "trop_de_demandes",
      reessayerDansSecondes: 5,
    });
    ouvrir();
    expect(await Promise.all(enCours)).toEqual(Array(2).fill({ ok: false, raison: "inexistante" }));
  });

  it("deux recalculs à la fois, quatre en attente, toutes adresses confondues : au-delà, « service occupé »", async () => {
    let ouvrir!: () => void;
    h.porte = new Promise<void>((r) => (ouvrir = r));
    const enCours = ["203.0.113.1", "203.0.113.2", "203.0.113.3", "203.0.113.4", "203.0.113.5", "203.0.113.6"].map(
      (ip) => {
        h.ip = ip;
        return verifierSousLimite("sig_1");
      },
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(h.lue).toBe(2);
    h.ip = "203.0.113.99";
    expect(await verifierSousLimite("sig_1")).toEqual({
      ok: false,
      raison: "serveur_occupe",
      reessayerDansSecondes: 5,
    });
    ouvrir();
    expect(await Promise.all(enCours)).toEqual(Array(6).fill({ ok: false, raison: "inexistante" }));
    expect(h.lue).toBe(6);
  });

  it("n'est exportée d'aucun module \"use server\"", () => {
    const actions = readFileSync(join(process.cwd(), "src/lib/signatures/actions.ts"), "utf8");
    expect(actions).not.toMatch(/export async function verifierIntegriteSignature/);
    const ici = readFileSync(join(process.cwd(), "src/lib/signatures/verification-publique.ts"), "utf8");
    expect(ici).not.toMatch(/^["']use server["']/m);
  });
});
