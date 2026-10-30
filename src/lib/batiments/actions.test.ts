// Les mutations de zone (ADR-029, qui remplace l'ADR-019) — base simulée.
//
// Ce fichier n'existait pas, et les invariants centraux de l'ADR ne tenaient
// qu'à la relecture : qu'aucune zone d'un autre établissement ne serve de
// destination, que la dernière zone ne se supprime pas, et que **tout** le
// contenu soit déplacé avant la suppression — équipements retirés du parc
// compris, points de relevé, permis, plans. Le dernier point est le plus
// coûteux à rattraper : un `SetNull` silencieux perd une information que
// l'utilisateur avait donnée, et rien ne le signale.
//
// Ce que ces tests prouvent : les décisions prises par l'action — refus,
// ordre des écritures, portée des filtres. Ce qu'ils ne prouvent pas : que
// PostgreSQL applique la transaction atomiquement.

import { beforeEach, describe, expect, it, vi } from "vitest";

type Appel = { table: string; args: unknown };

const h = vi.hoisted(() => {
  const db = {
    /** Ce que `trouverBatimentDuUser` rendra — `null` = hors périmètre. */
    batiment: null as { id: string; etablissementId: string; ordre: number } | null,
    /** Ce que la recherche de destination rendra. */
    destination: null as { id: string } | null,
    appels: [] as Appel[],
    ordreMax: 2 as number | null,
    /** Le nombre de zones déjà posées — ce que le plafond regarde. */
    nbZones: 3 as number,
  };

  // Le contenu de la zone se lit, puis se rattache à la destination par
  // `connect` (ADR-051, lot 2b : le client borné refuse un `updateMany` qui
  // change `batimentId`).
  const deplacement = (table: string) => ({
    findMany: async (args: unknown) => {
      db.appels.push({ table, args });
      return [{ id: `${table}-1` }];
    },
  });

  const tx = {
    equipement: deplacement("equipement"),
    pointReleve: deplacement("pointReleve"),
    permisFeu: deplacement("permisFeu"),
    planPrevention: deplacement("planPrevention"),
    batiment: {
      update: async (args: unknown) => {
        db.appels.push({ table: "batiment.update", args });
        return {};
      },
      delete: async (args: unknown) => {
        db.appels.push({ table: "batiment.delete", args });
        return {};
      },
    },
  };

  const prisma = {
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    batiment: {
      findFirst: vi.fn(async () => db.destination),
      aggregate: async () => ({ _max: { ordre: db.ordreMax }, _count: db.nbZones }),
      create: vi.fn(async ({ data }: { data: { ordre: number } }) => {
        db.appels.push({ table: "batiment.create", args: data });
        return { id: "b-neuf" };
      }),
      update: vi.fn(async () => ({})),
    },
  };

  return {
    db,
    prisma,
    requireUser: vi.fn(async () => ({ id: "user-1" })),
    assertEtablissementOwnership: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: h.requireUser }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: h.assertEtablissementOwnership,
  // La même garde, qui rend aussi le client borné (ADR-051) : ici, le client
  // simulé ; elle passe par la simulation d'origine, refus compris.
  assertEtablissementDuCompte: async (id: string) => {
    await (h.assertEtablissementOwnership as (x: string) => Promise<unknown>)(id);
    return { user: await h.requireUser(), db: h.prisma };
  },
}));

const { creerBatiment, modifierBatiment, supprimerBatiment } = await import(
  "./actions"
);

const ETAB = "etab-1";
const B = { id: "b-reserve", etablissementId: ETAB, ordre: 1 };

beforeEach(() => {
  h.db.batiment = { ...B };
  h.db.destination = { id: "b-principal" };
  h.db.appels = [];
  h.db.ordreMax = 2;
  h.db.nbZones = 0;
  h.prisma.batiment.findFirst.mockClear();
  h.prisma.batiment.create.mockClear();
  h.prisma.batiment.update.mockClear();
  // `trouverBatimentDuUser` et la recherche de destination passent tous deux
  // par `findFirst` : le premier appel rend la zone, le second la cible.
  h.prisma.batiment.findFirst
    .mockImplementationOnce(async () => h.db.batiment)
    .mockImplementation(async () => h.db.destination);
});

describe("supprimerBatiment — le contenu part avant le lieu", () => {
  it("déplace les quatre relations, puis supprime", async () => {
    const res = await supprimerBatiment(B.id, "b-principal");

    expect(res.status).toBe("success");
    expect(h.db.appels.map((a) => a.table)).toEqual([
      "equipement",
      "pointReleve",
      "permisFeu",
      "planPrevention",
      "batiment.update",
      "batiment.delete",
    ]);
  });

  it("déplace sans filtrer sur `actif` : un appareil retiré garde son lieu", () => {
    // Le filet du filet : un `where` qui ne verrait que les équipements en
    // service laisserait les retirés pointer vers une zone supprimée — et
    // ils portent des rapports (ADR-012).
    return supprimerBatiment(B.id, "b-principal").then(() => {
      const eq = h.db.appels.find((a) => a.table === "equipement");
      expect(eq?.args).toEqual({
        where: { batimentId: B.id },
        select: { id: true },
      });
      const rattache = h.db.appels.find((a) => a.table === "batiment.update");
      expect(rattache?.args).toEqual({
        where: { id: "b-principal" },
        data: {
          equipements: { connect: [{ id: "equipement-1" }] },
          pointsReleve: { connect: [{ id: "pointReleve-1" }] },
          permisFeu: { connect: [{ id: "permisFeu-1" }] },
          plansPrevention: { connect: [{ id: "planPrevention-1" }] },
        },
      });
    });
  });

  it("refuse une zone hors périmètre, sans rien écrire", async () => {
    h.db.batiment = null;
    h.prisma.batiment.findFirst.mockReset();
    h.prisma.batiment.findFirst.mockImplementation(async () => null);

    const res = await supprimerBatiment(B.id, "b-principal");

    expect(res).toEqual({ status: "error", message: "Zone introuvable" });
    expect(h.db.appels).toEqual([]);
  });

  it("refuse une destination qui n'est pas du même établissement", async () => {
    // La recherche de destination est bornée à `etablissementId` : un id
    // d'un autre dossier ne résout rien.
    h.db.destination = null;

    const res = await supprimerBatiment(B.id, "b-dun-autre");

    expect(res.status).toBe("error");
    expect(h.db.appels).toEqual([]);
  });

  it("refuse la dernière zone, faute de destination possible", async () => {
    h.db.destination = null;

    const res = await supprimerBatiment(B.id, B.id);

    expect(res.status).toBe("error");
    if (res.status === "error") {
      expect(res.message).toContain("autre zone");
    }
    expect(h.db.appels).toEqual([]);
  });

  it("cherche la destination dans le même établissement et hors du supprimé", async () => {
    await supprimerBatiment(B.id, "b-principal");

    const calls = h.prisma.batiment.findFirst.mock.calls as unknown as Array<
      [{ where: Record<string, unknown> }]
    >;
    const recherche = calls.at(-1)![0];
    expect(recherche.where).toMatchObject({
      id: "b-principal",
      etablissementId: ETAB,
      NOT: { id: B.id },
    });
  });
});

describe("creerBatiment — l'ordre", () => {
  it("place la nouvelle zone après la dernière", async () => {
    const fd = new FormData();
    fd.set("nom", "Annexe");

    const res = await creerBatiment(ETAB, { status: "idle" }, fd);

    expect(res.status).toBe("success");
    const cree = h.db.appels.find((a) => a.table === "batiment.create");
    expect((cree?.args as { ordre: number }).ordre).toBe(3);
  });

  it("part de zéro quand l'établissement n'a encore aucune zone", async () => {
    h.db.ordreMax = null;
    const fd = new FormData();
    fd.set("nom", "Bâtiment principal");

    await creerBatiment(ETAB, { status: "idle" }, fd);

    const cree = h.db.appels.find((a) => a.table === "batiment.create");
    expect((cree?.args as { ordre: number }).ordre).toBe(0);
  });

  it("refuse un formulaire invalide avant toute écriture", async () => {
    const fd = new FormData();
    fd.set("nom", "");

    const res = await creerBatiment(ETAB, { status: "idle" }, fd);

    expect(res.status).toBe("error");
    expect(h.prisma.batiment.create).not.toHaveBeenCalled();
  });

  it("passe par le contrôle d'appartenance de l'établissement", async () => {
    const fd = new FormData();
    fd.set("nom", "Annexe");

    await creerBatiment(ETAB, { status: "idle" }, fd);

    expect(h.assertEtablissementOwnership).toHaveBeenCalledWith(ETAB);
  });
});

describe("creerBatiment — le plafond de trois zones (ADR-029)", () => {
  const ajouter = async (nom: string) => {
    const fd = new FormData();
    fd.set("nom", nom);
    return creerBatiment(ETAB, { status: "idle" }, fd);
  };

  it("laisse passer les trois premières", async () => {
    for (const dejaPosees of [0, 1, 2]) {
      h.db.nbZones = dejaPosees;
      expect((await ajouter(`Zone ${dejaPosees}`)).status).toBe("success");
    }
    expect(h.prisma.batiment.create).toHaveBeenCalledTimes(3);
  });

  it("refuse la quatrième, et le message nomme la limite", async () => {
    h.db.nbZones = 3;

    const res = await ajouter("Annexe");

    expect(res.status).toBe("error");
    // Le nombre est dans la phrase : « ce n'est pas possible » laisserait
    // l'utilisateur réessayer sans savoir ce qu'il doit défaire d'abord.
    if (res.status === "error") expect(res.message).toContain("3 zones");
    expect(h.prisma.batiment.create).not.toHaveBeenCalled();
  });

  it("refuse avant d'écrire, pas après", async () => {
    h.db.nbZones = 3;

    await ajouter("Annexe");

    expect(h.db.appels).toEqual([]);
  });

  it("porte l'erreur sur le champ « nom », que le formulaire affiche", async () => {
    // Sans `fieldErrors.nom`, `BatimentsManager` range le message dans la
    // branche « autres » et l'utilisateur le lit loin du champ qu'il vient
    // de remplir.
    h.db.nbZones = 3;

    const res = await ajouter("Annexe");

    // Le `status` s'affirme avant le `fieldErrors` : sous un simple
    // `if (res.status === "error")`, retirer le plafond aurait rendu ce
    // test vert en n'exécutant plus aucune assertion.
    expect(res.status).toBe("error");
    if (res.status === "error") {
      expect(res.fieldErrors?.nom?.[0]).toBe(res.message);
    }
  });
});

describe("un dossier ancien qui porte déjà quatre lieux (ADR-029)", () => {
  // Le plafond vaut à l'ajout. Un dossier antérieur à la règle ne perd rien
  // et reste manœuvrable : c'est la moitié de la décision, et c'est celle
  // qu'une contrainte de base aurait cassée.
  beforeEach(() => {
    h.db.nbZones = 4;
  });

  it("ne peut plus en ajouter", async () => {
    const fd = new FormData();
    fd.set("nom", "Cinquième");

    expect((await creerBatiment(ETAB, { status: "idle" }, fd)).status).toBe(
      "error",
    );
  });

  it("garde ses quatre zones : rien n'est fusionné ni supprimé", async () => {
    const fd = new FormData();
    fd.set("nom", "Cinquième");

    await creerBatiment(ETAB, { status: "idle" }, fd);

    expect(h.db.appels).toEqual([]);
  });

  it("renomme encore une zone au-dessus du plafond", async () => {
    const fd = new FormData();
    fd.set("nom", "Réserve nord");

    const res = await modifierBatiment(B.id, { status: "idle" }, fd);

    expect(res.status).toBe("success");
    expect(h.prisma.batiment.update).toHaveBeenCalled();
  });

  it("en supprime encore une, et redescend ainsi sous le plafond", async () => {
    const res = await supprimerBatiment(B.id, "b-principal");

    expect(res.status).toBe("success");
  });
});
