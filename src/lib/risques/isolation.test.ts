import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Non-régression IDOR sur les server actions du DUERP (risques).
 *
 * Chaque action reçoit un identifiant *du client* (`uniteId`, `risqueId`) et
 * écrivait en base sans vérifier à qui l'objet appartient. Un utilisateur
 * authentifié pouvait donc supprimer les risques d'un autre client en
 * rejouant l'appel avec un id volé. Il n'y a pas de RLS effective en base
 * pour rattraper ça : ces tests sont le filet.
 *
 * Montage : Prisma est simulé et ses `findFirst` scopés ne ramènent rien
 * (c'est exactement ce qui se passe pour l'id d'un autre client, puisque le
 * `where` porte `entreprise.userId`). Les vrais helpers de `lib/auth/scope`
 * sont utilisés — on teste la chaîne complète, pas un mock de garde.
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
      action: modele(),
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
  ajouterRisqueCustom,
  ajouterRisqueReferentiel,
  enregistrerCotation,
  modifierRisqueCustom,
  supprimerRisque,
} from "./actions";

const USER = { id: "user-legitime", email: "dirigeant@exemple.fr" };

function estNotFound(e: unknown): boolean {
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.includes("404");
}

/** Aucun `create` / `update` / `delete`, sur aucun modèle. */
function aucuneEcriture(): void {
  for (const modele of Object.values(prismaMock)) {
    expect(modele.create).not.toHaveBeenCalled();
    expect(modele.update).not.toHaveBeenCalled();
    expect(modele.delete).not.toHaveBeenCalled();
  }
}

function formulaireRisque(): FormData {
  const fd = new FormData();
  fd.set("libelle", "Chute de plain-pied");
  fd.set("description", "Sol glissant en plonge");
  return fd;
}

function formulaireCotation(): FormData {
  const fd = new FormData();
  fd.set("gravite", "1");
  fd.set("probabilite", "1");
  fd.set("maitrise", "4");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue(USER);
  // Rien n'appartient au user : toutes les requêtes scopées font chou blanc.
  for (const modele of Object.values(prismaMock)) {
    modele.findFirst.mockResolvedValue(null);
    modele.findUnique.mockResolvedValue(null);
    modele.findMany.mockResolvedValue([]);
  }
});

describe("actions sur les risques — identifiant d'un autre client", () => {
  it("ajouterRisqueReferentiel refuse et n'écrit rien", async () => {
    await expect(
      ajouterRisqueReferentiel("unite-autre-client", "chute_plain_pied"),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("ajouterRisqueCustom refuse avant même de lire le formulaire", async () => {
    await expect(
      ajouterRisqueCustom("unite-autre-client", { status: "idle" }, formulaireRisque()),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("supprimerRisque refuse et ne supprime rien", async () => {
    await expect(supprimerRisque("risque-autre-client")).rejects.toSatisfy(
      estNotFound,
    );
    expect(prismaMock.risque.delete).not.toHaveBeenCalled();
    aucuneEcriture();
  });

  it("modifierRisqueCustom refuse et n'écrit rien", async () => {
    await expect(
      modifierRisqueCustom(
        "risque-autre-client",
        { status: "idle" },
        formulaireRisque(),
      ),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("enregistrerCotation refuse et n'écrit rien", async () => {
    await expect(
      enregistrerCotation(
        "risque-autre-client",
        { status: "idle" },
        formulaireCotation(),
      ),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });
});

describe("actions sur les risques — chemin nominal", () => {
  // Contre-épreuve : le garde ne doit pas bloquer le propriétaire, sinon les
  // tests ci-dessus passeraient avec une implémentation qui refuse tout.
  it("supprimerRisque supprime bien le risque du user", async () => {
    prismaMock.risque.findFirst.mockResolvedValue({
      id: "r1",
      uniteId: "u1",
      unite: { id: "u1", duerpId: "d1", duerp: { etablissementId: "e1" } },
    });

    await supprimerRisque("r1");

    expect(prismaMock.risque.delete).toHaveBeenCalledWith({
      where: { id: "r1" },
    });
  });
});
