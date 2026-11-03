import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const tx = { salarie: { count: vi.fn(async () => 3) } };
  return {
    tx,
    db: { $transaction: async (f: (t: unknown) => unknown) => f(tx) },
    ecrireEffectifs: vi.fn(async () => ({ societe: true, site: true })),
    regenererLaSociete: vi.fn(async () => true),
    regenererSite: vi.fn(async () => true),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({
  MESSAGE_REGEN_ECHEC: "pas recalculé",
  regenererApresMutation: h.regenererSite,
}));
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
  RefusSousLesFiches: class RefusSousLesFiches extends Error {
    constructor(readonly actifs: number) {
      super(`Vous suivez ${actifs} personnes`);
    }
  },
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

  it("l'effectif sous les fiches actives : refus sous le champ du site", async () => {
    const { RefusSousLesFiches } = await import("./effectif");
    h.ecrireEffectifs.mockRejectedValueOnce(new RefusSousLesFiches(3));
    const r = await modifierEffectifs("etab-1", { status: "idle" }, formulaire({ effectifSurSite: "2", apprentisSurSite: "0" }));
    expect(r.status === "error" && r.fieldErrors?.effectifSurSite?.[0]).toMatch(/3 personnes/);
  });

  it("seuls les nombres du site ont bougé : ce site seul se recalcule", async () => {
    h.ecrireEffectifs.mockResolvedValueOnce({ societe: false, site: true } as never);
    await modifierEffectifs("etab-1", { status: "idle" }, formulaire({}));
    expect(h.regenererSite).toHaveBeenCalledWith("etab-1", expect.any(String));
    expect(h.regenererLaSociete).not.toHaveBeenCalled();
  });

  it("rien n'a bougé : rien ne se recalcule", async () => {
    h.ecrireEffectifs.mockResolvedValueOnce({ societe: false, site: false } as never);
    await modifierEffectifs("etab-1", { status: "idle" }, formulaire({}));
    expect(h.regenererSite).not.toHaveBeenCalled();
    expect(h.regenererLaSociete).not.toHaveBeenCalled();
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

  it("un calendrier non recalculé ne se tait pas derrière « Enregistré »", async () => {
    h.regenererLaSociete.mockResolvedValueOnce(false);
    expect(await modifierEffectifs("etab-1", { status: "idle" }, formulaire({}))).toEqual({
      status: "success_avec_avertissement",
      message: "pas recalculé",
    });
  });

  it("après un refus, rend ce qui a été saisi", async () => {
    h.ecrireEffectifs.mockRejectedValueOnce(new RefusBorneEffectif("trop", "effectifHorsRojer"));
    const r = await modifierEffectifs("etab-1", { status: "idle" }, formulaire({ effectifHorsRojer: "43" }));
    expect(r.status === "error" && r.saisie?.effectifHorsRojer).toBe("43");
  });
});
