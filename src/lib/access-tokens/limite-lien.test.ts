import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La limite par réseau des liens (2026-11-21) : la page et les actions d'un
 * lien comptent par IP réduite à son réseau, avant toute lecture du jeton,
 * et le refus est le même message pour tous.
 */

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({ verdict: { ok: true } as { ok: true } | { ok: false; reessayerDansSecondes: number }, cles: [] as string[] }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-rojer-ip-client": "203.0.113.7" }) }));
vi.mock("@/lib/securite/limite-debit", async (orig) => ({
  ...(await orig<typeof import("@/lib/securite/limite-debit")>()),
  consommer: vi.fn(async (demandes: { cle: string }[]) => {
    h.cles.push(...demandes.map((d) => d.cle));
    return h.verdict;
  }),
}));

import { limiterPageDuLien, refusActionDuLien } from "./limite-lien";
import { LIMITES } from "@/lib/securite/limite-debit";

beforeEach(() => {
  h.verdict = { ok: true };
  h.cles = [];
});

describe("limite des liens", () => {
  it("page : 30 par 10 minutes ; actions : 10 par 10 minutes", () => {
    expect(LIMITES.lienPageIp).toEqual({ max: 30, fenetreSecondes: 600 });
    expect(LIMITES.lienActionIp).toEqual({ max: 10, fenetreSecondes: 600 });
  });

  it("la page et les actions ont chacune leur compteur", async () => {
    await limiterPageDuLien();
    await refusActionDuLien();
    expect(h.cles[0]).toMatch(/^lien-page:ip:/);
    expect(h.cles[1]).toMatch(/^lien-action:ip:/);
  });

  it("au-delà : un message uniforme, sans rien dire du lien", async () => {
    h.verdict = { ok: false, reessayerDansSecondes: 120 };
    expect(await refusActionDuLien()).toBe("Trop de tentatives en peu de temps. Par sécurité, réessayez dans 2 minutes.");
    expect(await limiterPageDuLien()).toEqual({ ok: false, reessayerDansSecondes: 120 });
  });
});
