import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const tx = { salarie: { count: vi.fn(async () => 3) } };
  return {
    tx,
    db: { $transaction: async (f: (t: unknown) => unknown) => f(tx) },
    ecrireEffectifs: vi.fn(async () => ({ entreprise: 12, site: 12 })),
    regenererLaSociete: vi.fn(async () => {}),
  };
});
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementDuCompte: async () => ({ user: { id: "u" }, db: h.db }),
}));
vi.mock("./effectif", () => ({
  RefusBorneEffectif: class RefusBorneEffectif extends Error {
    constructor(message: string, readonly champ: string) {
      super(message);
    }
  },
  ecrireEffectifs: h.ecrireEffectifs,
  regenererLaSociete: h.regenererLaSociete,
}));

const { modifierEffectifs } = await import("./effectif-actions");
const { RefusBorneEffectif } = await import("./effectif");

function formulaire(v: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, x] of Object.entries({
    effectifSurSite: "12",
    apprentisSurSite: "2",
    effectifHorsRojer: "0",
    ...v,
  }))
    fd.set(k, x);
  return fd;
}

beforeEach(() => vi.clearAllMocks());

describe("modifierEffectifs — l'effectif se déclare dans Équipe (2026-11-03)", () => {
  it("écrit les trois nombres et recalcule chaque site de la société", async () => {
    expect(await modifierEffectifs("etab-1", { status: "idle" }, formulaire({}))).toEqual({
      status: "success",
    });
    expect(h.ecrireEffectifs).toHaveBeenCalledWith(h.tx, "etab-1", {
      effectifSurSite: 12,
      apprentisSurSite: 2,
      effectifHorsRojer: 0,
    });
    expect(h.regenererLaSociete).toHaveBeenCalledWith(h.db, "etab-1");
  });

  it("l'effectif ne descend pas sous les fiches actives", async () => {
    const r = await modifierEffectifs("etab-1", { status: "idle" }, formulaire({ effectifSurSite: "2", apprentisSurSite: "0" }));
    expect(r.status === "error" && r.fieldErrors?.effectifSurSite?.[0]).toMatch(/3 personnes/);
    expect(h.ecrireEffectifs).not.toHaveBeenCalled();
  });

  it("la borne refuse, sous le champ qu'elle vise, et rien n'est recalculé", async () => {
    h.ecrireEffectifs.mockRejectedValueOnce(
      new RefusBorneEffectif("Votre société compterait 55 salariés", "effectifHorsRojer"),
    );
    const r = await modifierEffectifs("etab-1", { status: "idle" }, formulaire({ effectifHorsRojer: "43" }));
    expect(r.status === "error" && r.fieldErrors?.effectifHorsRojer).toEqual([
      "Votre société compterait 55 salariés",
    ]);
    expect(h.regenererLaSociete).not.toHaveBeenCalled();
  });
});
