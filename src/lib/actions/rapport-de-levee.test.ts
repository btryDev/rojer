import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le rapport choisi comme justificatif de clôture (`cloturerAction`) était
 * enregistré dans `leveeRapportId` et affiché nulle part (audit du
 * 2026-10-12). `getAction` le relit pour la fiche — borné à l'établissement
 * de l'action, comme à l'écriture.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    action: { findFirst: vi.fn() },
    rapportVerification: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "u1" }),
  getOptionalUser: vi.fn(),
}));

import { getAction } from "./queries";

beforeEach(() => vi.clearAllMocks());

describe("getAction — rapport de levée", () => {
  it("relit le rapport choisi, borné à l'établissement de l'action", async () => {
    prismaMock.action.findFirst.mockResolvedValue({
      id: "a1",
      etablissementId: "e1",
      leveeRapportId: "rap1",
    });
    const rapport = {
      id: "rap1",
      dateRapport: new Date("2026-10-01T00:00:00Z"),
      fichierNomOriginal: "rapport.pdf",
    };
    prismaMock.rapportVerification.findFirst.mockResolvedValue(rapport);

    const a = await getAction("a1");

    expect(prismaMock.rapportVerification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rap1", etablissementId: "e1" },
      }),
    );
    expect(a?.leveeRapport).toEqual(rapport);
  });

  it("sans rapport choisi, ne cherche rien", async () => {
    prismaMock.action.findFirst.mockResolvedValue({
      id: "a1",
      etablissementId: "e1",
      leveeRapportId: null,
    });
    const a = await getAction("a1");
    expect(prismaMock.rapportVerification.findFirst).not.toHaveBeenCalled();
    expect(a?.leveeRapport).toBeNull();
  });
});
