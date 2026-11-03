import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Non-régression IDOR sur les server actions du DUERP (document et unités).
 *
 * `etablissementId`, `duerpId` et `uniteId` arrivent tous du client. Sans
 * garde, `supprimerUnite` détruisait l'unité de travail d'un autre client —
 * et avec elle, en cascade, tous ses risques. Il n'y a pas de RLS effective
 * en base : le contrôle applicatif est le seul rempart.
 *
 * Prisma est simulé, ses `findFirst` scopés ne ramènent rien (ce que produit
 * un id qui n'appartient pas au user, puisque le `where` porte
 * `entreprise.compteId`). Les vrais helpers de `lib/auth/scope` sont utilisés.
 */

const { prismaMock, requireUserMock } = vi.hoisted(() => {
  const modele = () => ({
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  });
  return {
    prismaMock: {
      etablissement: modele(),
      duerp: modele(),
      uniteTravail: modele(),
      risque: modele(),
    },
    requireUserMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
  getOptionalUser: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  ajouterUnite,
  choisirSecteur,
  creerDuerp,
  declarerAucunRisque,
  renommerUnite,
  supprimerUnite,
} from "./actions";

const USER = { id: "user-legitime", email: "dirigeant@exemple.fr" };

function estNotFound(e: unknown): boolean {
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.includes("404");
}

function aucuneEcriture(): void {
  for (const modele of Object.values(prismaMock)) {
    expect(modele.create).not.toHaveBeenCalled();
    expect(modele.update).not.toHaveBeenCalled();
    expect(modele.delete).not.toHaveBeenCalled();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue(USER);
  for (const modele of Object.values(prismaMock)) {
    modele.findFirst.mockResolvedValue(null);
    modele.findUnique.mockResolvedValue(null);
    modele.findMany.mockResolvedValue([]);
  }
});

describe("actions DUERP — identifiant d'un autre client", () => {
  it("creerDuerp refuse de créer un DUERP sur l'établissement d'un tiers", async () => {
    await expect(creerDuerp("etab-autre-client")).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("choisirSecteur refuse et n'écrit rien", async () => {
    await expect(
      choisirSecteur("duerp-autre-client", "restauration"),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("ajouterUnite refuse avant de lire le formulaire", async () => {
    const fd = new FormData();
    fd.set("nom", "Salle");
    await expect(
      ajouterUnite("duerp-autre-client", { status: "idle" }, fd),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("renommerUnite refuse et n'écrit rien", async () => {
    await expect(
      renommerUnite("unite-autre-client", "Nouveau nom"),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("supprimerUnite refuse et ne supprime rien (cascade sur les risques)", async () => {
    await expect(supprimerUnite("unite-autre-client")).rejects.toSatisfy(
      estNotFound,
    );
    expect(prismaMock.uniteTravail.delete).not.toHaveBeenCalled();
    aucuneEcriture();
  });

  it("declarerAucunRisque refuse et n'écrit rien", async () => {
    await expect(
      declarerAucunRisque("unite-autre-client", "Aucun risque identifié"),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });
});

describe("actions DUERP — chemin nominal", () => {
  // Contre-épreuve : le propriétaire doit toujours pouvoir travailler.
  it("supprimerUnite supprime l'unité du user", async () => {
    prismaMock.uniteTravail.findFirst.mockResolvedValue({
      id: "u1",
      duerpId: "d1",
      duerp: { id: "d1", etablissementId: "e1" },
    });

    await supprimerUnite("u1");

    expect(prismaMock.uniteTravail.delete).toHaveBeenCalledWith({
      where: { id: "u1" },
    });
  });
});
