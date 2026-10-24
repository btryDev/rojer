import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Corriger, rouvrir, abandonner une action du plan (audit du 2026-10-12).
 *
 * `modifierActionPlan` et `rouvrirAction` existaient sans écran : une action
 * mal saisie ne se corrigeait qu'en la supprimant, une clôture par erreur ne
 * se défaisait pas, et le statut « abandonnée » n'était atteint par rien. Ce
 * fichier tient les règles des trois gestes ; l'appartenance (404 sur l'id
 * d'un autre client) est dans `isolation.test.ts`.
 */

const { prismaMock, requireUserMock, redirectMock } = vi.hoisted(() => ({
  prismaMock: {
    action: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn<(a: { where: Record<string, unknown> }) => Promise<{ count: number }>>(
        async () => ({ count: 1 }),
      ),
    },
  },
  requireUserMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
  getOptionalUser: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const { liberer } = vi.hoisted(() => ({ liberer: vi.fn(async () => ({ liberes: 1, echecs: 0 })) }));
vi.mock("@/lib/suppression/fichiers", () => ({ libererFichiers: liberer }));
vi.mock("@/lib/etablissements/epi-constate", () => ({ constaterEpi: vi.fn(async () => false) }));
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<typeof import("next/navigation")>()),
  redirect: redirectMock,
}));

import { abandonnerAction, modifierActionPlan, rouvrirAction } from "./plan";

const IDLE = { status: "idle" } as const;

function action(over: Record<string, unknown> = {}) {
  return {
    id: "a1",
    etablissementId: "e1",
    risqueId: null,
    verificationId: "v1",
    statut: "ouverte",
    echeance: null,
    ...over,
  };
}

function formulaire(champs: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base = {
    libelle: "Remplacer le bloc de secours",
    description: "",
    type: "protection_collective",
    criticite: "",
    echeance: "",
    responsable: "",
    ...champs,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({ id: "u1" });
});

describe("modifierActionPlan — le formulaire de la création", () => {
  it("reprend les validations de la création : libellé vide refusé, rien d'écrit", async () => {
    prismaMock.action.findFirst.mockResolvedValue(action());
    const res = await modifierActionPlan("a1", IDLE, formulaire({ libelle: "" }));
    expect(res.status).toBe("error");
    if (res.status === "error") expect(res.fieldErrors?.libelle).toBeDefined();
    expect(prismaMock.action.update).not.toHaveBeenCalled();
  });

  it("un champ vidé redevient vide en base, et la fiche se rouvre", async () => {
    prismaMock.action.findFirst.mockResolvedValue(
      action({ responsable: "DAF", criticite: 4 }),
    );
    await modifierActionPlan("a1", IDLE, formulaire());
    const data = prismaMock.action.update.mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({
      libelle: "Remplacer le bloc de secours",
      responsable: null,
      criticite: null,
      echeance: null,
      description: null,
    });
    // Le statut ne se change que par un geste nommé (clôturer, rouvrir,
    // abandonner), jamais par la correction.
    expect(data).not.toHaveProperty("statut");
    expect(redirectMock).toHaveBeenCalledWith("/etablissements/e1/actions/a1");
  });

  it("refuse une mesure du DUERP, qui se corrige dans le DUERP", async () => {
    prismaMock.action.findFirst.mockResolvedValue(
      action({ risqueId: "r1", verificationId: null }),
    );
    const res = await modifierActionPlan("a1", IDLE, formulaire());
    expect(res.status).toBe("error");
    expect(prismaMock.action.update).not.toHaveBeenCalled();
  });

  it("refuse une action levée : on la rouvre d'abord", async () => {
    prismaMock.action.findFirst.mockResolvedValue(action({ statut: "levee" }));
    const res = await modifierActionPlan("a1", IDLE, formulaire());
    expect(res.status).toBe("error");
    expect(prismaMock.action.update).not.toHaveBeenCalled();
  });
});

describe("rouvrirAction", () => {
  it("une action levée redevient ouverte, sans son justificatif", async () => {
    prismaMock.action.findFirst.mockResolvedValue(
      action({ statut: "levee", leveeRapportId: "rap1" }),
    );
    await rouvrirAction("a1");
    expect(prismaMock.action.updateMany).toHaveBeenCalledWith({
      where: { id: "a1", statut: "levee", leveeFichierCle: undefined },
      data: {
        statut: "ouverte",
        leveeLe: null,
        leveeCommentaire: null,
        leveeRapportId: null,
        leveeFichierCle: null,
        leveeFichierNom: null,
        leveeFichierMime: null,
        leveeFichierTaille: null,
      },
    });
    expect(liberer).not.toHaveBeenCalled();
  });

  it("la pièce de la correction défaite est libérée, après la base (ADR-048)", async () => {
    prismaMock.action.findFirst.mockResolvedValue(
      action({ statut: "levee", leveeFichierCle: "points/e1/a1-x-facture.pdf" }),
    );
    await rouvrirAction("a1");
    expect(liberer).toHaveBeenCalledWith(["points/e1/a1-x-facture.pdf"], "points/reouverture");
    expect(prismaMock.action.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      liberer.mock.invocationCallOrder[0],
    );
  });

  it("rien n'est libéré si le point a changé entre-temps (rouvert puis recorrigé avec une autre pièce)", async () => {
    prismaMock.action.findFirst.mockResolvedValue(
      action({ statut: "levee", leveeFichierCle: "points/e1/a1-x-facture.pdf" }),
    );
    prismaMock.action.updateMany.mockResolvedValueOnce({ count: 0 });
    await rouvrirAction("a1");
    expect(prismaMock.action.updateMany.mock.calls[0]?.[0]?.where).toMatchObject({
      leveeFichierCle: "points/e1/a1-x-facture.pdf",
    });
    expect(liberer).not.toHaveBeenCalled();
  });

  it("ne touche pas une action déjà ouverte", async () => {
    prismaMock.action.findFirst.mockResolvedValue(action({ statut: "en_cours" }));
    await rouvrirAction("a1");
    expect(prismaMock.action.updateMany).not.toHaveBeenCalled();
  });
});

describe("abandonnerAction", () => {
  it("une action ouverte d'une vérification passe à « abandonnée »", async () => {
    prismaMock.action.findFirst.mockResolvedValue(action());
    await abandonnerAction("a1");
    expect(prismaMock.action.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { statut: "abandonnee" },
    });
  });

  it("refuse une mesure du DUERP, que la version figée imprimerait « prévue »", async () => {
    prismaMock.action.findFirst.mockResolvedValue(
      action({ risqueId: "r1", verificationId: null }),
    );
    await expect(abandonnerAction("a1")).rejects.toThrow();
    expect(prismaMock.action.update).not.toHaveBeenCalled();
  });

  it("ne touche pas une action levée", async () => {
    prismaMock.action.findFirst.mockResolvedValue(action({ statut: "levee" }));
    await abandonnerAction("a1");
    expect(prismaMock.action.update).not.toHaveBeenCalled();
  });
});
