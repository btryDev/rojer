// Suppression d'un équipement — la version physique cascadait sur toutes ses
// vérifications, donc sur les rapports du registre de sécurité et sur les
// actions correctives. On vérifie ici l'arbitrage retenu (ADR-012) :
// suppression physique seulement si l'équipement ne porte aucune trace,
// désactivation sinon.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const db = {
    equipements: [{ id: "eq-1", etablissementId: "etab-1", actif: true }],
    /** Nombre de vérifications porteuses de trace pour l'équipement. */
    nbTraces: 0,
    supprimesPhysiquement: [] as string[],
  };

  const prisma = {
    equipement: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        db.equipements.find((e) => e.id === where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const e = db.equipements.find((x) => x.id === where.id);
        Object.assign(e as object, data);
        return e;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        db.supprimesPhysiquement.push(where.id);
        const e = db.equipements.find((x) => x.id === where.id);
        db.equipements = db.equipements.filter((x) => x.id !== where.id);
        return e;
      },
      create: async () => ({ id: "eq-nouveau" }),
      createMany: async ({ data }: { data: unknown[] }) => ({
        count: data.length,
      }),
    },
    verification: {
      count: async () => db.nbTraces,
    },
  };

  return {
    db,
    prisma,
    genererCalendrier: vi.fn(async () => ({})),
    marquerCalendrierPerime: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/lib/calendrier/actions", () => ({
  genererCalendrier: h.genererCalendrier,
}));
vi.mock("@/lib/calendrier/reconciliation", () => ({
  marquerCalendrierPerime: h.marquerCalendrierPerime,
}));

const { reactiverEquipement, supprimerEquipement } = await import("./actions");

beforeEach(() => {
  h.db.equipements = [{ id: "eq-1", etablissementId: "etab-1", actif: true }];
  h.db.nbTraces = 0;
  h.db.supprimesPhysiquement = [];
  h.genererCalendrier.mockClear();
  h.genererCalendrier.mockImplementation(async () => ({}));
  h.marquerCalendrierPerime.mockClear();
});

describe("supprimerEquipement", () => {
  it("supprime physiquement un équipement sans aucun historique", async () => {
    h.db.nbTraces = 0;

    const res = await supprimerEquipement("eq-1");

    expect(res).toEqual({ statut: "supprime" });
    expect(h.db.supprimesPhysiquement).toEqual(["eq-1"]);
  });

  it("désactive au lieu de supprimer dès qu'un rapport ou une action existe", async () => {
    h.db.nbTraces = 1;

    const res = await supprimerEquipement("eq-1");

    expect(res.statut).toBe("desactive");
    expect(h.db.supprimesPhysiquement).toEqual([]);
    expect(h.db.equipements[0].actif).toBe(false);
  });

  it("explique à l'utilisateur ce qui est conservé et pourquoi", async () => {
    h.db.nbTraces = 3;
    const res = await supprimerEquipement("eq-1");

    expect(res.statut).toBe("desactive");
    if (res.statut !== "desactive") return;
    expect(res.message).toContain("conservés");
    // La phrase dit « pouvoir les présenter » : c'est une conservation, donc
    // D. 4711-3. L. 4711-5 n'impose rien (relu à la source le 2026-09-20).
    expect(res.message).toContain("D. 4711-3");
  });

  it("régénère le calendrier dans les deux cas", async () => {
    await supprimerEquipement("eq-1");
    expect(h.genererCalendrier).toHaveBeenCalledWith("etab-1");
  });

  it("remonte l'échec de régénération au lieu de l'avaler", async () => {
    h.genererCalendrier.mockImplementation(async () => {
      throw new Error("base indisponible");
    });

    const res = await supprimerEquipement("eq-1");

    expect(res.statut).toBe("erreur");
    if (res.statut !== "erreur") return;
    // Le tableau de bord répare aussi à l'affichage depuis le 2026-09-14 : le
    // message nomme les deux portes, et non plus la seule page Calendrier.
    expect(res.message).toContain("tableau de bord ou du calendrier");
  });

  /**
   * C'est ici que se joue la promesse « ça se remet à jour tout seul ».
   *
   * Une régénération qui échoue derrière une mutation réussie laisse un
   * calendrier ni vide ni périmé en version : l'auto-réparation à
   * l'affichage ne le reprend pas, et sans marque il resterait faux
   * jusqu'à la prochaine modification d'équipement — sans que personne le
   * sache. Marquer l'établissement périmé le fait recalculer à la
   * prochaine ouverture du calendrier. Sans cette ligne, il faudrait
   * rendre la main à l'utilisateur — un bouton « recalculer », c'est-à-dire
   * lui demander de réparer nos pannes.
   */
  it("marque le calendrier périmé quand la régénération échoue", async () => {
    h.genererCalendrier.mockImplementation(async () => {
      throw new Error("base indisponible");
    });

    await supprimerEquipement("eq-1");

    expect(h.marquerCalendrierPerime).toHaveBeenCalledWith("etab-1");
  });

  it("ne marque rien quand la régénération passe", async () => {
    await supprimerEquipement("eq-1");

    expect(h.marquerCalendrierPerime).not.toHaveBeenCalled();
  });
});

describe("reactiverEquipement", () => {
  it("remet l'équipement en service et régénère les obligations", async () => {
    h.db.equipements[0].actif = false;

    const res = await reactiverEquipement("eq-1");

    expect(res).toEqual({ ok: true });
    expect(h.db.equipements[0].actif).toBe(true);
    expect(h.genererCalendrier).toHaveBeenCalledWith("etab-1");
  });
});
