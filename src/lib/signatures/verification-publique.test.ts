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
  cles: [] as string[],
  /** Si posée, chaque lecture attend cette promesse (recalcul « en cours »). */
  porte: null as Promise<void> | null,
  ip: "203.0.113.7",
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": h.ip }),
}));
vi.mock("@/lib/securite/limite-debit", async (original) => ({
  ...(await original<typeof import("@/lib/securite/limite-debit")>()),
  consommer: async (demandes: { cle: string }[]) => {
    h.cles.push(...demandes.map((d) => d.cle));
    return h.verdict;
  },
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

const { verifierSousLimite, lireSignatureSousLimite } = await import("./verification-publique");

beforeEach(() => {
  h.verdict = { ok: true };
  h.lue = 0;
  h.cles = [];
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

  it("une IPv6 compte pour son /64, sur les deux pages (audit du 2026-11-10)", async () => {
    for (const ip of ["2001:db8:1:2::a", "2001:db8:1:2:ffff::b"]) {
      h.ip = ip;
      await lireSignatureSousLimite("sig_1");
      await verifierSousLimite("sig_1");
    }
    const [signe1, verifier1, signe2, verifier2] = h.cles;
    expect(signe2).toBe(signe1);
    expect(verifier2).toBe(verifier1);
  });

  it("greffée sur une vérification refusée « service occupé », une demande tente sa propre place", async () => {
    vi.useFakeTimers();
    try {
      let ouvrir!: () => void;
      h.porte = new Promise<void>((r) => (ouvrir = r));
      const occupees = ["203.0.113.1", "203.0.113.2"].map((ip, i) => {
        h.ip = ip;
        return verifierSousLimite(`sig_occupe_${i}`);
      });
      await vi.advanceTimersByTimeAsync(0);
      h.ip = "203.0.113.3";
      const premiere = verifierSousLimite("sig_X");
      await vi.advanceTimersByTimeAsync(0);
      h.ip = "203.0.113.4";
      const greffee = verifierSousLimite("sig_X");
      await vi.advanceTimersByTimeAsync(0);
      // La première attend sa place au-delà du délai : refusée.
      await vi.advanceTimersByTimeAsync(10_001);
      expect(await premiere).toEqual({ ok: false, raison: "serveur_occupe", reessayerDansSecondes: 5 });
      // La greffée ne reprend pas ce refus : elle attend sa place, et l'obtient.
      ouvrir();
      await vi.advanceTimersByTimeAsync(0);
      expect(await greffee).toEqual({ ok: false, raison: "inexistante" });
      await Promise.all(occupees);
    } finally {
      vi.useRealTimers();
    }
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

  it("chaque page a son compteur, au même plafond", async () => {
    await verifierSousLimite("sig_1");
    await lireSignatureSousLimite("sig_1");
    expect(h.cles).toHaveLength(2);
    expect(h.cles[0]).not.toBe(h.cles[1]);
  });

  it("la même signature demandée ensemble : un seul recalcul, partagé", async () => {
    let ouvrir!: () => void;
    h.porte = new Promise<void>((r) => (ouvrir = r));
    const enCours = Array.from({ length: 10 }, () => verifierSousLimite("sig_1"));
    await new Promise((r) => setTimeout(r, 0));
    expect(h.lue).toBe(1);
    ouvrir();
    expect(await Promise.all(enCours)).toEqual(Array(10).fill({ ok: false, raison: "inexistante" }));
    expect(h.lue).toBe(1);
    // Terminée, elle se recalcule de nouveau à la demande suivante.
    await verifierSousLimite("sig_1");
    expect(h.lue).toBe(2);
  });

  it("une adresse ne tient que deux recalculs : au-delà, refus sans lecture (audit du 2026-11-10)", async () => {
    let ouvrir!: () => void;
    h.porte = new Promise<void>((r) => (ouvrir = r));
    const enCours = [verifierSousLimite("sig_1"), verifierSousLimite("sig_2")];
    await new Promise((r) => setTimeout(r, 0));
    expect(h.lue).toBe(2);
    expect(await verifierSousLimite("sig_3")).toEqual({
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
      (ip, i) => {
        h.ip = ip;
        return verifierSousLimite(`sig_${i}`);
      },
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(h.lue).toBe(2);
    h.ip = "203.0.113.99";
    expect(await verifierSousLimite("sig_99")).toEqual({
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
