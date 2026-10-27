// Le registre se lit une année à la fois (plan performance, lot 1a) : la
// clause envoyée à la base, les années proposées, et la place des points sans
// rapport d'origine — sous le plus récent de TOUT l'historique, jamais sous un
// rapport de chaque année consultée.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const h = vi.hoisted(() => ({
  prisma: {
    rapportVerification: { findMany: vi.fn() },
    action: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));

import { anneesDuRegistre, listerRapportsDeLEtablissement } from "./queries";
import { instantCivil } from "@/lib/dates";

const rapport = (id: string, verificationId: string, iso: string) => ({
  id,
  verificationId,
  dateRapport: new Date(iso),
  pointsACorriger: [] as unknown[],
  organismeVerif: null,
  commentaires: null,
  verification: { obligationId: "o", libelleObligation: "L", equipement: null, salarie: null },
});

beforeEach(() => {
  vi.clearAllMocks();
  h.prisma.action.findMany.mockResolvedValue([]);
});

describe("listerRapportsDeLEtablissement — par année", () => {
  it("borne la lecture à l'année civile de Paris", async () => {
    h.prisma.rapportVerification.findMany.mockResolvedValue([]);
    await listerRapportsDeLEtablissement("e1", { annee: 2024 });
    const { where } = h.prisma.rapportVerification.findMany.mock.calls[0][0];
    expect(where.dateRapport).toEqual({
      gte: instantCivil(2024, 1, 1),
      lt: instantCivil(2025, 1, 1),
    });
    // La portée au compte n'est pas perdue en route.
    expect(where.etablissement).toEqual({ entreprise: { userId: "u1" } });
  });

  it("sans année : tout l'historique (les exports)", async () => {
    h.prisma.rapportVerification.findMany.mockResolvedValue([]);
    await listerRapportsDeLEtablissement("e1");
    const { where } = h.prisma.rapportVerification.findMany.mock.calls[0][0];
    expect(where.dateRapport).toBeUndefined();
  });

  it("un point sans origine ne se pose que sous le plus récent de tout l'historique", async () => {
    // Année 2024 consultée ; le contrôle v1 a un rapport plus récent en 2025.
    h.prisma.rapportVerification.findMany.mockResolvedValue([rapport("r2024", "v1", "2024-06-01")]);
    h.prisma.action.findMany.mockResolvedValue([{ id: "p1", verificationId: "v1" }]);
    // Le dernier rapport de v1, dans tout l'historique : celui de 2025.
    h.prisma.$queryRaw.mockResolvedValue([
      { verificationId: "v1", id: "r2025", dateRapport: new Date("2025-03-01"), resultat: "conforme" },
    ]);
    const [r] = await listerRapportsDeLEtablissement("e1", { annee: 2024 });
    expect(r.pointsACorriger).toHaveLength(0);

    // L'année du plus récent : le point y est.
    h.prisma.rapportVerification.findMany.mockResolvedValue([rapport("r2025", "v1", "2025-03-01")]);
    const [r2] = await listerRapportsDeLEtablissement("e1", { annee: 2025 });
    expect(r2.pointsACorriger).toHaveLength(1);
  });
});

describe("anneesDuRegistre", () => {
  it("les années réelles et l'année en cours, de la plus récente à la plus ancienne", async () => {
    h.prisma.$queryRaw.mockResolvedValue([{ annee: 2023 }, { annee: 2005 }, { annee: 2026 }]);
    // Aucune année comblée entre 2005 et 2023 : un rapport isolé n'ouvre pas de
    // pastilles vides.
    expect(await anneesDuRegistre("e1", 2026)).toEqual([2026, 2023, 2005]);
  });

  it("une année future ouverte par un rapport reste proposée", async () => {
    h.prisma.$queryRaw.mockResolvedValue([{ annee: 2030 }]);
    expect(await anneesDuRegistre("e1", 2026)).toEqual([2030, 2026]);
  });

  it("aucun rapport : l'année en cours seule", async () => {
    h.prisma.$queryRaw.mockResolvedValue([]);
    expect(await anneesDuRegistre("e1", 2026)).toEqual([2026]);
  });
});
