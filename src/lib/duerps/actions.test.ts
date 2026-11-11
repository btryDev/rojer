import { trouverReferentielParId } from "@/lib/referentiels";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * L'écriture des unités de travail aux points qui vivent ici — la création du
 * DUERP, le choix du secteur, l'ajout manuel. ~~Le plafond de cinq unités
 * (ADR-033)~~ est levé le 2026-11-11 (ADR-033 amendée) : seule la limite de
 * l'essai borne encore leur nombre.
 *
 * Prisma est simulé et les vrais helpers de `lib/auth/scope` sont utilisés,
 * comme dans `isolation.test.ts` : ce qui est en cause ici est la décision de
 * l'action, pas l'atomicité de la transaction.
 */

const { prismaMock, requireUserMock, redirectMock } = vi.hoisted(() => {
  const modele = () => ({
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: "cree" }),
    createMany: vi.fn().mockResolvedValue({ count: 1 }),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  });
  const prismaMock = {
    etablissement: modele(),
    duerp: modele(),
    uniteTravail: modele(),
    risque: modele(),
    // La transaction rend ce qu'on lui donne (tableau d'opérations) ou exécute
    // son corps contre le même faux client : ce sont les appels enregistrés
    // par les mocks qui font foi.
    $transaction: vi.fn(async (ops: unknown): Promise<unknown> =>
      typeof ops === "function" ? (ops as (t: unknown) => unknown)(prismaMock) : ops,
    ),
  };
  return {
    prismaMock,
    requireUserMock: vi.fn(),
    redirectMock: vi.fn(() => {
      // `redirect` lève en production ; on l'imite pour que le code après
      // l'appel ne s'exécute pas non plus dans le test.
      throw new Error("REDIRECT");
    }),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
  getOptionalUser: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async (importer) => ({
  ...(await importer<typeof import("next/navigation")>()),
  redirect: redirectMock,
}));

import { ajouterUnite, choisirSecteur, creerDuerp } from "./actions";

const USER = { id: "user-1", email: "dirigeant@exemple.fr" };
const DUERP = { id: "d1", etablissementId: "e1", referentielSecteurId: null };

const unite = (nom: string) => ({ nom, estTransverse: false });
const TRANSVERSE = { nom: "Risques transverses", estTransverse: true };

/** Les noms d'unités que la transaction du choix de secteur ferait créer. */
function unitesCreeesParLeSecteur(): string[] {
  return prismaMock.uniteTravail.create.mock.calls.map(
    (appel) => (appel[0] as { data: { nom: string } }).data.nom,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue(USER);
  prismaMock.etablissement.findFirst.mockResolvedValue({
    id: "e1",
    entrepriseId: "ent-1",
  });
  prismaMock.duerp.findFirst.mockResolvedValue(DUERP);
  prismaMock.uniteTravail.findMany.mockResolvedValue([]);
  prismaMock.uniteTravail.create.mockImplementation(
    async ({ data }: { data: { nom: string } }) => ({ id: `u-${data.nom}` }),
  );
});

describe("creerDuerp — l'unité transverse ne consomme aucune place", () => {
  it("la crée toujours à l'ouverture, sans regarder le plafond", async () => {
    prismaMock.duerp.findFirst.mockResolvedValue(null);
    prismaMock.duerp.create.mockResolvedValue({ id: "d-neuf" });

    await expect(creerDuerp("e1")).rejects.toThrow("REDIRECT");

    const data = prismaMock.duerp.create.mock.calls[0][0] as {
      data: { unites: { create: { nom: string; estTransverse: boolean } } };
    };
    expect(data.data.unites.create).toMatchObject({
      nom: "Risques transverses",
      estTransverse: true,
    });
  });
});

describe("creerDuerp — reprend les faits d'activité déjà déclarés (ADR-041)", () => {
  it("naît avec le risque d'un fait déclaré « oui », et avec lui seul", async () => {
    prismaMock.duerp.findFirst.mockResolvedValue(null);
    prismaMock.duerp.create.mockResolvedValue({ id: "d-neuf" });
    prismaMock.etablissement.findFirst.mockResolvedValue({
      id: "e1",
      entrepriseId: "ent1",
      entreprise: { id: "ent1" },
      conduiteEngins: true,
      manutentionManuelle: false,
      travailSurEcran: null,
      operationsElectriques: null,
      expositionCMR: true,
    });
    prismaMock.uniteTravail.findFirst.mockResolvedValue({ id: "u-transverse" });
    prismaMock.risque.createMany.mockClear();

    await expect(creerDuerp("e1")).rejects.toThrow("REDIRECT");

    const crees = prismaMock.risque.createMany.mock.calls.map(
      (c) => (c[0] as { data: { referentielId: string }[] }).data[0].referentielId,
    );
    // Le CMR n'a pas de question transverse : aucun risque de plus.
    expect(crees).toEqual(["trv-conduite-engins"]);
  });
});

// ADR-033 amendée le 2026-11-11 : plus de plafond de cinq unités ; seule la
// limite de l'essai (ADR-053 § 14) borne encore le nombre d'unités.
describe("choisirSecteur — le pré-remplissage installe toutes les unités du secteur", () => {
  it("installe les unités de la restauration à côté de la transverse", async () => {
    prismaMock.uniteTravail.findMany.mockResolvedValue([TRANSVERSE]);

    await expect(choisirSecteur("d1", "restauration")).rejects.toThrow(
      "REDIRECT",
    );

    expect(unitesCreeesParLeSecteur()).toHaveLength(
      trouverReferentielParId("restauration")!.unitesTravailSuggerees.length,
    );
  });

  it("n'en retire aucune parce que d'autres unités sont déjà là", async () => {
    prismaMock.uniteTravail.findMany.mockResolvedValue([
      TRANSVERSE,
      ...["A", "B", "C", "D", "E"].map(unite),
    ]);

    await expect(choisirSecteur("d1", "restauration")).rejects.toThrow(
      "REDIRECT",
    );

    expect(unitesCreeesParLeSecteur()).toHaveLength(
      trouverReferentielParId("restauration")!.unitesTravailSuggerees.length,
    );
  });
});

describe("choisirSecteur — reconfirmer le même secteur ne refait rien (2026-11-11)", () => {
  const VALIDEE = "2026-11-10T10:00:00.000Z";
  const ecrit = () =>
    (prismaMock.duerp.update.mock.calls[0][0] as { data: { etapesValidees: Record<string, string> } })
      .data.etapesValidees;

  it("ne recrée pas les unités supprimées, ne retire aucune validation", async () => {
    prismaMock.duerp.findFirst.mockResolvedValue({
      ...DUERP,
      referentielSecteurId: "restauration",
      etapesValidees: { activite: VALIDEE, unites: VALIDEE },
    });
    prismaMock.uniteTravail.findMany.mockResolvedValue([TRANSVERSE]);

    await expect(choisirSecteur("d1", "restauration")).rejects.toThrow("REDIRECT");

    expect(unitesCreeesParLeSecteur()).toEqual([]);
    // Secteur à précisions : rien n'est écrit, aucune validation ne bouge.
    expect(prismaMock.duerp.update).not.toHaveBeenCalled();
  });

  it("un changement de secteur remet unités et risques à valider", async () => {
    prismaMock.duerp.findFirst.mockResolvedValue({
      ...DUERP,
      referentielSecteurId: "bureau",
      etapesValidees: { unites: VALIDEE, risques: VALIDEE, transverses: VALIDEE },
    });
    prismaMock.uniteTravail.findMany.mockResolvedValue([TRANSVERSE]);

    await expect(choisirSecteur("d1", "restauration")).rejects.toThrow("REDIRECT");

    expect(ecrit()).toEqual({ transverses: VALIDEE });
  });

  it("un changement de secteur retire les ajouts non touchés des activités de l'ancien (ADR-060)", async () => {
    prismaMock.duerp.findFirst.mockResolvedValue({ ...DUERP, referentielSecteurId: "bureau" });
    prismaMock.uniteTravail.findMany.mockResolvedValue([TRANSVERSE]);

    await expect(choisirSecteur("d1", "restauration")).rejects.toThrow("REDIRECT");

    const where = prismaMock.risque.deleteMany.mock.calls[0][0].where as { activiteId: { in: string[] } };
    expect(where.activiteId.in).toContain("bur-teletravail");
    expect(where.activiteId.in.every((id) => id.startsWith("bur-"))).toBe(true);
  });

  it("reconfirmer le même secteur ne retire aucun ajout", async () => {
    prismaMock.risque.deleteMany.mockClear();
    prismaMock.duerp.findFirst.mockResolvedValue({ ...DUERP, referentielSecteurId: "restauration" });
    prismaMock.uniteTravail.findMany.mockResolvedValue([TRANSVERSE]);

    await expect(choisirSecteur("d1", "restauration")).rejects.toThrow("REDIRECT");

    expect(prismaMock.risque.deleteMany).not.toHaveBeenCalled();
  });
});

describe("ajouterUnite — plus de plafond de cinq", () => {
  it("accepte une sixième unité", async () => {
    prismaMock.uniteTravail.findMany.mockResolvedValue([
      TRANSVERSE,
      ...["A", "B", "C", "D", "E"].map(unite),
    ]);
    const fd = new FormData();
    fd.set("nom", "Terrasse");

    const res = await ajouterUnite("d1", { status: "idle" }, fd);

    expect(res.status).toBe("success");
    expect(prismaMock.uniteTravail.create).toHaveBeenCalled();
  });
});
