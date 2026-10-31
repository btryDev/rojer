import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le BRANCHEMENT du silence du carnet dans la matrice du tableau de bord
 * (2026-10-17, revue indépendante du sous-lot F).
 *
 * `obligations.test.ts` tient la règle (`suiviParLeCalendrier` vrai → « na ») ;
 * ce fichier tient la lecture : `getModulesMatrice` doit transmettre la réponse
 * de `eauChaudeSuivieParLeCalendrier`. Un `suiviParLeCalendrier: false` écrit
 * en dur laissait tous les tests verts.
 *
 * Prisma rend le vide partout ; le prédicat est mocké.
 */

const { prismaMock, suivie } = vi.hoisted(() => {
  const vide = (methode: string) =>
    vi.fn(async () =>
      methode === "findMany" ? [] : methode === "count" ? 0 : null,
    );
  const modele = () =>
    new Proxy({} as Record<string, unknown>, {
      get: (t, m: string) => (t[m] ??= vide(m)),
    });
  // Les comptages agrégés des modules passent par une requête brute
  // (`comptesModulesDuRendu`) : des comptes à zéro.
  const queryRaw = vi.fn(async () => [{ total: BigInt(0), echus: BigInt(0), sansInspection: BigInt(0) }]);
  const prismaMock = new Proxy({} as Record<string, unknown>, {
    get: (t, m: string) => (m === "$queryRaw" ? queryRaw : (t[m] ??= modele())),
  });
  return { prismaMock, suivie: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: "u1" }),
  getOptionalUser: vi.fn(),
}));
vi.mock("@/lib/carnet-sanitaire/suivi-calendrier", () => ({
  eauChaudeSuivieParLeCalendrier: (...a: unknown[]) => suivie(...a),
}));

import { getModulesMatrice } from "./queries";

beforeEach(() => suivie.mockReset());

describe("getModulesMatrice — le carnet suit le prédicat partagé", () => {
  it("installation déclarée : `suiviParLeCalendrier` vrai", async () => {
    suivie.mockResolvedValue(true);
    const m = await getModulesMatrice("etab-1", true);
    expect(m.carnetSanitaire.suiviParLeCalendrier).toBe(true);
  });

  it("sans installation : faux", async () => {
    suivie.mockResolvedValue(false);
    const m = await getModulesMatrice("etab-1", true);
    expect(m.carnetSanitaire.suiviParLeCalendrier).toBe(false);
  });

  it("le prédicat est lu dans le périmètre du compte", async () => {
    suivie.mockResolvedValue(false);
    await getModulesMatrice("etab-1", true);
    // Le client borné de la session (ADR-051), puis la portée.
    expect(suivie).toHaveBeenCalledWith(expect.anything(), {
      etablissementId: "etab-1",
      etablissement: { entreprise: { userId: "u1" } },
    });
  });
});
