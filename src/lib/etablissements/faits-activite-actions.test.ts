// `repondreFaitActivite` — ce qu'une action serveur appelée par le client doit
// refuser avant toute écriture (ADR-005, ADR-041) : l'établissement d'un
// autre, une colonne que le registre ne connaît pas, une valeur qui n'est ni
// oui, ni non, ni rien.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  ecrits: [] as unknown[][],
  appartient: true,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => {
    if (!h.appartient) throw Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  }),
}));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({
  regenererApresMutation: async () => true,
  MESSAGE_REGEN_ECHEC: "regen",
}));
vi.mock("./faits-activite-ecriture", () => ({
  ecrireFaitActivite: async (...a: unknown[]) => {
    h.ecrits.push(a);
    return { conserve: false };
  },
}));

const { repondreFaitActivite } = await import("./faits-activite-actions");

beforeEach(() => {
  h.ecrits = [];
  h.appartient = true;
});

describe("repondreFaitActivite — refus avant écriture", () => {
  it("refuse l'établissement d'un autre", async () => {
    h.appartient = false;
    await expect(repondreFaitActivite("e-autre", "conduiteEngins", true)).rejects.toThrow();
    expect(h.ecrits).toEqual([]);
  });

  it("refuse une colonne que le registre ne connaît pas", async () => {
    const r = await repondreFaitActivite("e1", "estERP" as never, true);
    expect(r.status).toBe("error");
    expect(h.ecrits).toEqual([]);
  });

  it("refuse une valeur qui n'est ni oui, ni non, ni rien", async () => {
    const r = await repondreFaitActivite("e1", "conduiteEngins", "oui" as never);
    expect(r.status).toBe("error");
    expect(h.ecrits).toEqual([]);
  });

  it("écrit oui, non et le silence, en « si_vierge »", async () => {
    for (const v of [true, false, null]) {
      expect((await repondreFaitActivite("e1", "conduiteEngins", v)).status).toBe("success");
    }
    expect(h.ecrits.map((a) => [a[2], a[3]])).toEqual([
      [true, "si_vierge"],
      [false, "si_vierge"],
      [null, "si_vierge"],
    ]);
  });
});
