import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La liste des risques du référentiel n'ajoute que (relecture indépendante du
 * 2026-10-12). La bascule supprimait un risque déjà retenu — cotation et
 * actions, levées comprises — sans confirmation, depuis un onglet périmé.
 */
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    risque: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({
  // La garde rend le client borné (ADR-051) : ici, le client simulé.
  requireUnite: vi.fn(async () => ({ db: prismaMock, unite: { id: "u1", duerpId: "d1" } })),
  requireRisque: vi.fn(),
}));

import { ajouterRisqueReferentiel } from "./actions";
import { tousRisquesConnus } from "@/lib/referentiels";
import { detailSuppressionRisque } from "@/components/duerps/suppression-risque";

const REF = [...tousRisquesConnus().keys()][0];

beforeEach(() => vi.clearAllMocks());

describe("ajouterRisqueReferentiel", () => {
  it("un risque déjà retenu n'est jamais supprimé : rien ne s'écrit", async () => {
    prismaMock.risque.findUnique.mockResolvedValue({ id: "r1" });

    await ajouterRisqueReferentiel("u1", REF);

    expect(prismaMock.risque.delete).not.toHaveBeenCalled();
    expect(prismaMock.risque.create).not.toHaveBeenCalled();
  });

  it("un risque non retenu est ajouté", async () => {
    prismaMock.risque.findUnique.mockResolvedValue(null);

    await ajouterRisqueReferentiel("u1", REF);

    expect(prismaMock.risque.create).toHaveBeenCalledTimes(1);
  });
});

describe("la question « Retirer ce risque » dit ce qui part", () => {
  it("cotation, actions, et les levées avec leur justificatif", () => {
    expect(detailSuppressionRisque({ referentiel: true, nbActions: 3, nbLevees: 1 })).toBe(
      "Sa cotation et ses 3 actions — dont 1 levée avec son justificatif — sont supprimées avec lui ; il retourne parmi les autres risques du référentiel. Le DUERP n'en gardera pas trace.",
    );
  });

  it("sans action, la cotation seule", () => {
    expect(detailSuppressionRisque({ referentiel: false, nbActions: 0, nbLevees: 0 })).toBe(
      "Sa cotation est supprimée avec lui. Le DUERP n'en gardera pas trace.",
    );
  });
});
