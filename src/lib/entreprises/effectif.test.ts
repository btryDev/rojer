import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({
  regenererApresMutation: vi.fn(async () => true),
}));

const { EFFECTIF_MAX } = await import("@/lib/etablissements/schema");
const {
  accueillirSite,
  ecrireEffectifs,
  effectifSuitLesFiches,
  recalculerEffectifEntreprise,
  RefusBorneEffectif,
} = await import("./effectif");
const { effectifEntrepriseDesSites, effectifsSchema } = await import("./effectif-calcul");

type Site = { id: string; entrepriseId: string; effectifSurSite: number; apprentisSurSite: number };
type Ent = { id: string; effectif: number; effectifHorsRojer: number };

/** Une base en mémoire, juste ce que lit le module. */
function base(entreprise: Partial<Ent>, sites: Omit<Site, "entrepriseId">[], actifs = 0) {
  const ent: Ent = { id: "ent", effectif: 0, effectifHorsRojer: 0, ...entreprise };
  const etabs: Site[] = sites.map((s) => ({ ...s, entrepriseId: ent.id }));
  const verrous: string[] = [];
  const tx = {
    entreprise: {
      findUniqueOrThrow: async () => ({
        ...ent,
        etablissements: etabs.map((s) => ({ ...s })),
      }),
      findUnique: async () => ({ id: ent.id }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        // L'écriture sans effet du verrou (`increment: 0`).
        if (typeof data.effectif === "object") {
          verrous.push(ent.id);
          return { id: ent.id };
        }
        return Object.assign(ent, data);
      },
    },
    etablissement: {
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const s = etabs.find((e) => e.id === where.id);
        if (!s) throw new Error("introuvable");
        return { ...s };
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Site> }) => {
        const s = etabs.find((e) => e.id === where.id)!;
        for (const [k, v] of Object.entries(data)) if (v !== undefined) Object.assign(s, { [k]: v });
        return s;
      },
    },
    salarie: { count: async () => actifs },
  };
  return { tx: tx as never, ent, etabs, verrous };
}

describe("effectifEntrepriseDesSites — la somme, apprentis non compris (L. 1111-3)", () => {
  it("additionne les sites sans leurs apprentis, plus les salariés hors Rojer", () => {
    expect(
      effectifEntrepriseDesSites(
        [
          { effectifSurSite: 12, apprentisSurSite: 2 },
          { effectifSurSite: 25, apprentisSurSite: 0 },
        ],
        5,
      ),
    ).toBe(40);
  });
});

describe("ecrireEffectifs — la borne de Rojer, dans Équipe", () => {
  it("recalcule la société et la verrouille avant de lire", async () => {
    const b = base({ effectif: 30 }, [
      { id: "a", effectifSurSite: 30, apprentisSurSite: 0 },
      { id: "b", effectifSurSite: 0, apprentisSurSite: 0 },
    ]);
    const r = await ecrireEffectifs(b.tx, "b", { effectifSurSite: 10, apprentisSurSite: 2 });
    expect(r.entreprise).toBe(38);
    expect(b.ent.effectif).toBe(38);
    expect(b.verrous).toEqual(["ent"]);
  });

  it("refuse le site qui fait passer la société au-delà de la borne", async () => {
    // 30 + 25 = 55 : c'est la question de la propriétaire, deux sites d'un même SIREN.
    const b = base({ effectif: 30 }, [
      { id: "a", effectifSurSite: 30, apprentisSurSite: 0 },
      { id: "b", effectifSurSite: 0, apprentisSurSite: 0 },
    ]);
    await expect(ecrireEffectifs(b.tx, "b", { effectifSurSite: 25 })).rejects.toThrow(
      RefusBorneEffectif,
    );
  });

  it("à la borne pile, passe ; une personne de plus, refuse", async () => {
    const b = base({}, [{ id: "a", effectifSurSite: 0, apprentisSurSite: 0 }]);
    await expect(ecrireEffectifs(b.tx, "a", { effectifSurSite: EFFECTIF_MAX })).resolves.toEqual({
      entreprise: EFFECTIF_MAX,
      site: EFFECTIF_MAX,
    });
    await expect(ecrireEffectifs(b.tx, "a", { effectifHorsRojer: 1 })).rejects.toMatchObject({
      champ: "effectifHorsRojer",
    });
  });

  it("les apprentis ne comptent pas pour la société, mais le site reste borné", async () => {
    const b = base({}, [{ id: "a", effectifSurSite: 40, apprentisSurSite: 0 }]);
    // 52 travailleurs dont 4 apprentis : la société en compte 48, mais le site
    // dépasse à lui seul.
    await expect(
      ecrireEffectifs(b.tx, "a", { effectifSurSite: 52, apprentisSurSite: 4 }),
    ).rejects.toMatchObject({ champ: "effectifSurSite" });
    await expect(
      ecrireEffectifs(b.tx, "a", { effectifSurSite: 49, apprentisSurSite: 4 }),
    ).resolves.toEqual({ entreprise: 45, site: 49 });
  });

  it("baisser n'est jamais refusé, même au-delà de la borne (dossier ancien)", async () => {
    const b = base({ effectif: 70, effectifHorsRojer: 40 }, [
      { id: "a", effectifSurSite: 30, apprentisSurSite: 0 },
    ]);
    await expect(ecrireEffectifs(b.tx, "a", { effectifSurSite: 28 })).resolves.toEqual({
      entreprise: 68,
      site: 28,
    });
  });
});

describe("ecrireEffectifs — un dossier ancien que le seul recalcul fait passer la borne", () => {
  // Données d'avant la règle : société déclarée à 45, deux sites de 30 et 25.
  // Le remplissage laisse les salariés hors Rojer à 0 ; la somme vaut 55.
  const ancien = () =>
    base({ effectif: 45 }, [
      { id: "a", effectifSurSite: 30, apprentisSurSite: 0 },
      { id: "b", effectifSurSite: 25, apprentisSurSite: 0 },
    ]);

  it("une saisie qui ne fait rien croître passe, et la société prend sa somme", async () => {
    const b = ancien();
    // La borne compare la somme AVANT et APRÈS la saisie, jamais la colonne
    // stockée : 55 → 55 n'est pas une croissance.
    await expect(
      ecrireEffectifs(b.tx, "a", { effectifSurSite: 30, apprentisSurSite: 0, effectifHorsRojer: 0 }),
    ).resolves.toEqual({ entreprise: 55, site: 30 });
    expect(b.ent.effectif).toBe(55);
  });

  it("baisser passe ; croître d'une personne est refusé", async () => {
    const b = ancien();
    await expect(ecrireEffectifs(b.tx, "b", { apprentisSurSite: 3 })).resolves.toEqual({
      entreprise: 52,
      site: 25,
    });
    // Le refus se rend sous le nombre qui a fait croître : ici, les apprentis.
    await expect(ecrireEffectifs(b.tx, "b", { apprentisSurSite: 2 })).rejects.toMatchObject({
      champ: "apprentisSurSite",
    });
  });

  it("le recalcul d'une suppression ou d'un changement de société ne refuse jamais", async () => {
    const b = ancien();
    await expect(recalculerEffectifEntreprise(b.tx, "ent")).resolves.toBe(55);
  });
});

describe("accueillirSite — l'onboarding", () => {
  it("seul site : l'écart sous le site est fait d'apprentis, et la somme retombe sur le déclaré", async () => {
    const b = base({ effectif: 8 }, [{ id: "a", effectifSurSite: 10, apprentisSurSite: 0 }]);
    await accueillirSite(b.tx, "a", 8);
    expect(b.etabs[0].apprentisSurSite).toBe(2);
    expect(b.ent.effectifHorsRojer).toBe(0);
    expect(effectifEntrepriseDesSites(b.etabs, b.ent.effectifHorsRojer)).toBe(8);
  });

  it("seul site : l'écart au-dessus travaille hors de Rojer", async () => {
    const b = base({ effectif: 40 }, [{ id: "a", effectifSurSite: 10, apprentisSurSite: 0 }]);
    await accueillirSite(b.tx, "a", 40);
    expect(b.etabs[0].apprentisSurSite).toBe(0);
    expect(b.ent.effectifHorsRojer).toBe(30);
    expect(b.ent.effectif).toBe(40);
  });

  it("société suivie : le site s'ajoute, la valeur postée est ignorée", async () => {
    const b = base({ effectif: 30 }, [
      { id: "a", effectifSurSite: 30, apprentisSurSite: 0 },
      { id: "b", effectifSurSite: 12, apprentisSurSite: 0 },
    ]);
    await accueillirSite(b.tx, "b", 1);
    expect(b.ent.effectif).toBe(42);
  });

  it("société suivie : refuse si la somme dépasse la borne", async () => {
    const b = base({ effectif: 30 }, [
      { id: "a", effectifSurSite: 30, apprentisSurSite: 0 },
      { id: "b", effectifSurSite: 25, apprentisSurSite: 0 },
    ]);
    await expect(accueillirSite(b.tx, "b", 0)).rejects.toThrow(RefusBorneEffectif);
  });
});

describe("effectifSuitLesFiches — une fiche est une personne", () => {
  it("ne touche à rien tant que les fiches restent sous l'effectif", async () => {
    const b = base({}, [{ id: "a", effectifSurSite: 5, apprentisSurSite: 0 }], 5);
    expect(await effectifSuitLesFiches(b.tx, "a")).toBeNull();
  });

  it("monte l'effectif du site aux fiches actives", async () => {
    const b = base({ effectif: 5 }, [{ id: "a", effectifSurSite: 5, apprentisSurSite: 0 }], 6);
    expect(await effectifSuitLesFiches(b.tx, "a")).toBe(6);
    expect(b.ent.effectif).toBe(6);
  });

  it("refuse la fiche qui ferait passer la société au-delà de la borne", async () => {
    const b = base(
      { effectif: EFFECTIF_MAX },
      [{ id: "a", effectifSurSite: EFFECTIF_MAX, apprentisSurSite: 0 }],
      EFFECTIF_MAX + 1,
    );
    await expect(effectifSuitLesFiches(b.tx, "a")).rejects.toThrow(RefusBorneEffectif);
  });
});

describe("recalculerEffectifEntreprise — sans refus", () => {
  it("rend la somme et l'écrit", async () => {
    const b = base({ effectif: 99, effectifHorsRojer: 3 }, [
      { id: "a", effectifSurSite: 10, apprentisSurSite: 1 },
    ]);
    expect(await recalculerEffectifEntreprise(b.tx, "ent")).toBe(12);
    expect(b.ent.effectif).toBe(12);
  });
});

describe("effectifsSchema — la saisie dans Équipe", () => {
  const ok = { effectifSurSite: "12", apprentisSurSite: "2", effectifHorsRojer: "0" };
  it("accepte zéro, refuse le vide", () => {
    expect(effectifsSchema.safeParse({ ...ok, effectifHorsRojer: "0" }).success).toBe(true);
    expect(effectifsSchema.safeParse({ ...ok, effectifHorsRojer: "" }).success).toBe(false);
  });
  it("refuse plus d'apprentis que de travailleurs", () => {
    expect(effectifsSchema.safeParse({ ...ok, apprentisSurSite: "13" }).success).toBe(false);
  });
});
