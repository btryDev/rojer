import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests des gardes de cloisonnement entre clients.
 *
 * Rappel du contexte : les migrations activent bien `ROW LEVEL SECURITY` sur
 * 18 tables mais ne déclarent aucune `POLICY`, et Prisma se connecte avec un
 * rôle qui contourne RLS de toute façon. **Tout** le cloisonnement est donc
 * applicatif et repose sur ces helpers. Deux choses sont vérifiées ici :
 *
 *  1. le `where` envoyé à Prisma remonte bien la chaîne complète jusqu'à
 *     `Entreprise.compteId` — un helper qui filtrerait seulement sur l'`id`
 *     passerait tous les tests fonctionnels tout en ne cloisonnant rien ;
 *  2. quand la requête scopée ne ramène rien, le helper appelle `notFound()`
 *     et n'a donc *rien* retourné à l'appelant — on répond 404 plutôt que
 *     403 pour ne pas révéler l'existence de l'objet d'un autre client.
 *
 * Prisma est simulé : ces tests portent sur la forme des requêtes et sur le
 * comportement de refus, pas sur PostgreSQL.
 */

const { prismaMock, requireUserMock } = vi.hoisted(() => {
  const modele = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  });
  return {
    prismaMock: {
      entreprise: modele(),
      etablissement: modele(),
      duerp: modele(),
      uniteTravail: modele(),
      risque: modele(),
      action: modele(),
      verification: modele(),
    },
    requireUserMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("./require-user", () => ({
  requireUser: requireUserMock,
  getOptionalUser: vi.fn(),
}));

import {
  requireAction,
  requireMesure,
  requireRisque,
  requireUnite,
  requireVerification,
} from "./scope";

const USER = { id: "user-legitime", email: "dirigeant@exemple.fr" };

/** `notFound()` de Next lève une erreur porteuse d'un digest 404. */
function estNotFound(e: unknown): boolean {
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.includes("404");
}

/** Exécute `fn` et affirme qu'elle a bien refusé via `notFound()`. */
async function attendNotFound(fn: () => Promise<unknown>): Promise<void> {
  await expect(fn()).rejects.toSatisfy(estNotFound);
}

/** Sérialise le `where` du premier appel pour y chercher le filtre de compte (`compteId`, ADR-054). */
function whereDuPremierAppel(mock: { mock: { calls: unknown[][] } }): string {
  return JSON.stringify(
    (mock.mock.calls[0][0] as { where: unknown }).where,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue(USER);
});

describe("requireUnite", () => {
  it("filtre sur l'entreprise du user via duerp → établissement", async () => {
    prismaMock.uniteTravail.findFirst.mockResolvedValue({
      id: "u1",
      duerpId: "d1",
      duerp: { id: "d1", etablissementId: "e1" },
    });

    const res = await requireUnite("u1");

    const where = whereDuPremierAppel(prismaMock.uniteTravail.findFirst);
    expect(where).toContain(USER.id);
    expect(where).toContain("compteId");
    expect(res.duerpId).toBe("d1");
    expect(res.etablissementId).toBe("e1");
  });

  it("répond 404 quand l'unité est celle d'un autre client", async () => {
    prismaMock.uniteTravail.findFirst.mockResolvedValue(null);
    await attendNotFound(() => requireUnite("unite-autre-client"));
  });
});

describe("requireRisque", () => {
  it("remonte les trois jointures risque → unité → duerp → établissement", async () => {
    prismaMock.risque.findFirst.mockResolvedValue({
      id: "r1",
      uniteId: "u1",
      unite: { id: "u1", duerpId: "d1", duerp: { etablissementId: "e1" } },
    });

    const res = await requireRisque("r1");

    const where = whereDuPremierAppel(prismaMock.risque.findFirst);
    expect(where).toContain(USER.id);
    expect(res.uniteId).toBe("u1");
    expect(res.duerpId).toBe("d1");
    expect(res.etablissementId).toBe("e1");
  });

  it("répond 404 quand le risque est celui d'un autre client", async () => {
    prismaMock.risque.findFirst.mockResolvedValue(null);
    await attendNotFound(() => requireRisque("risque-autre-client"));
  });
});

describe("requireAction", () => {
  it("filtre sur l'entreprise du user via l'établissement", async () => {
    prismaMock.action.findFirst.mockResolvedValue({
      id: "a1",
      etablissementId: "e1",
    });

    const res = await requireAction("a1");

    expect(whereDuPremierAppel(prismaMock.action.findFirst)).toContain(USER.id);
    expect(res.etablissementId).toBe("e1");
  });

  it("répond 404 quand l'action est celle d'un autre client", async () => {
    prismaMock.action.findFirst.mockResolvedValue(null);
    await attendNotFound(() => requireAction("action-autre-client"));
  });

  it("requireMesure est le même garde (ADR-002 : la mesure est une Action)", () => {
    expect(requireMesure).toBe(requireAction);
  });
});

describe("requireVerification", () => {
  it("filtre sur l'entreprise du user via l'établissement", async () => {
    prismaMock.verification.findFirst.mockResolvedValue({
      id: "v1",
      etablissementId: "e1",
    });

    const res = await requireVerification("v1");

    expect(whereDuPremierAppel(prismaMock.verification.findFirst)).toContain(
      USER.id,
    );
    expect(res.etablissementId).toBe("e1");
  });

  it("répond 404 quand la vérification est celle d'un autre client", async () => {
    prismaMock.verification.findFirst.mockResolvedValue(null);
    await attendNotFound(() => requireVerification("verif-autre-client"));
  });
});

describe("aucun helper n'utilise findUnique", () => {
  // `findUnique` ne sait filtrer que sur une clé unique : il ne peut pas
  // porter la condition `entreprise.compteId`. Un helper qui l'emploierait
  // aurait forcément laissé le contrôle de propriété au code appelant —
  // exactement la faille qu'on vient de fermer.
  it("les gardes passent tous par findFirst", async () => {
    prismaMock.uniteTravail.findFirst.mockResolvedValue({
      id: "u1",
      duerpId: "d1",
      duerp: { id: "d1", etablissementId: "e1" },
    });
    prismaMock.action.findFirst.mockResolvedValue({
      id: "a1",
      etablissementId: "e1",
    });

    await requireUnite("u1");
    await requireAction("a1");

    expect(prismaMock.uniteTravail.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.action.findUnique).not.toHaveBeenCalled();
  });
});
