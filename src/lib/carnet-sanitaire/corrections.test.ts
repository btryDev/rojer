// Corriger le carnet sanitaire (2026-10-12, audit des modules, B6 et « dates
// futures acceptées »). Base et stockage simulés : on relève ce que chaque
// action écrit, dans quel périmètre, et ce qu'elle libère.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const appels: { op: string; args: unknown }[] = [];
  const reponses: Record<string, (args: unknown) => unknown> = {};
  const modele = (nom: string) =>
    new Proxy(
      {},
      {
        get: (_u, op: string) => (args: unknown) => {
          appels.push({ op: `${nom}.${op}`, args });
          const r = reponses[`${nom}.${op}`];
          return Promise.resolve(r ? r(args) : { count: 1 });
        },
      },
    );
  const prisma = new Proxy(
    {},
    {
      get: (_t, nom: string) =>
        nom === "$transaction" ? (ops: Promise<unknown>[]) => Promise.all(ops) : modele(nom),
    },
  );
  const stockage = {
    liberes: [] as string[],
    put: async () => {},
    delete: async (cle: string) => void stockage.liberes.push(cle),
  };
  return { prisma, appels, reponses, stockage };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "u1" })),
  // La garde rend aussi le client borné (ADR-051) : ici, le client simulé.
  assertEtablissementDuCompte: async (...a: unknown[]) => ({
    user: (await (vi.fn(async () => ({ id: "u1" })) as (...x: unknown[]) => unknown)(...a)) ?? { id: "u1" },
    db: (await import("@/lib/prisma")).prisma,
  }),
}));
vi.mock("@/lib/batiments/queries", () => ({
  resoudreBatimentOptionnel: vi.fn(async () => ({ ok: true, id: null })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/storage", async (original) => ({
  ...(await original<typeof import("@/lib/storage")>()),
  stockageEnService: () => true,
  getStorage: () => h.stockage,
}));

import {
  modifierAnalyseLegionelle,
  modifierPointReleve,
  modifierReleve,
  supprimerAnalyseLegionelle,
  supprimerReleve,
} from "./actions";
import { analyseLegionelleSchema, releveTemperatureSchema } from "./schema";
import { cleJourCivil } from "@/lib/dates";

const ops = (op: string) => h.appels.filter((a) => a.op === op);
const fd = (champs: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
};
const idle = { status: "idle" } as const;

beforeEach(() => {
  h.appels.length = 0;
  h.stockage.liberes.length = 0;
  for (const k of Object.keys(h.reponses)) delete h.reponses[k];
});

describe("une date de relevé ou d'analyse n'est jamais dans le futur", () => {
  const demain = cleJourCivil(new Date(Date.now() + 2 * 86_400_000));
  const aujourdhui = cleJourCivil(new Date());

  it("relevé : demain refusé sur son champ, aujourd'hui accepté", () => {
    const champs = { pointReleveId: "pt_1", temperatureCelsius: "52" };
    const futur = releveTemperatureSchema.safeParse({ ...champs, dateReleve: demain });
    expect(futur.success).toBe(false);
    if (!futur.success) expect(futur.error.flatten().fieldErrors.dateReleve).toBeDefined();
    expect(releveTemperatureSchema.safeParse({ ...champs, dateReleve: aujourdhui }).success).toBe(true);
  });

  it("analyse : demain refusé sur son champ, aujourd'hui accepté", () => {
    const futur = analyseLegionelleSchema.safeParse({ dateAnalyse: demain });
    expect(futur.success).toBe(false);
    if (!futur.success) expect(futur.error.flatten().fieldErrors.dateAnalyse).toBeDefined();
    expect(analyseLegionelleSchema.safeParse({ dateAnalyse: aujourdhui }).success).toBe(true);
  });
});

describe("modifierPointReleve", () => {
  it("le seuil et le type recalculent la plage de chaque relevé du point", async () => {
    h.reponses["pointReleve.findFirst"] = () => ({
      id: "pt_1",
      typePoint: null,
      releves: [
        { id: "r_52", temperatureCelsius: 52 },
        { id: "r_53", temperatureCelsius: 53 },
      ],
    });
    // Seuil remonté de 50 à 53 °C : 52 sort de la plage, 53 y reste.
    const r = await modifierPointReleve(
      "e1",
      "pt_1",
      idle,
      fd({ nom: "Douche", localisation: "", batimentId: "", typeReseau: "ECS", seuilMinCelsius: "53" }),
    );
    expect(r).toEqual({ status: "success" });
    const plages = Object.fromEntries(
      ops("releveTemperature.update").map((a) => {
        const { where, data } = a.args as { where: { id: string }; data: { conforme: boolean } };
        return [where.id, data.conforme];
      }),
    );
    expect(plages).toEqual({ r_52: false, r_53: true });
    // Le point est cherché dans le carnet de l'établissement, actif.
    expect(ops("pointReleve.findFirst")[0].args).toMatchObject({
      where: { id: "pt_1", actif: true, carnet: { etablissementId: "e1" } },
    });
  });

  it("un point hors du carnet de l'établissement est introuvable, rien n'est écrit", async () => {
    h.reponses["pointReleve.findFirst"] = () => null;
    const r = await modifierPointReleve(
      "e1",
      "pt_x",
      idle,
      fd({ nom: "Douche", localisation: "", batimentId: "", typeReseau: "ECS", seuilMinCelsius: "50" }),
    );
    expect(r).toEqual({ status: "error", message: "Point de relevé introuvable" });
    expect(ops("pointReleve.update")).toEqual([]);
  });
});

describe("modifierReleve / supprimerReleve", () => {
  it("la plage du relevé corrigé se recalcule sur le seuil de son point", async () => {
    h.reponses["releveTemperature.findFirst"] = () => ({
      id: "r_1",
      pointReleveId: "pt_1",
      pointReleve: { seuilMinCelsius: 50, seuilMaxCelsius: null },
    });
    const r = await modifierReleve(
      "e1",
      "r_1",
      idle,
      fd({ dateReleve: cleJourCivil(new Date()), temperatureCelsius: "45", operateur: "", commentaire: "" }),
    );
    expect(r).toEqual({ status: "success" });
    const { data } = ops("releveTemperature.update")[0].args as { data: Record<string, unknown> };
    expect(data.conforme).toBe(false);
    expect(data.operateur).toBeNull();
  });

  it("supprimer ne vise que les relevés du carnet de l'établissement", async () => {
    await supprimerReleve("e1", "r_1");
    expect(ops("releveTemperature.deleteMany")[0].args).toEqual({
      where: { id: "r_1", pointReleve: { carnet: { etablissementId: "e1" } } },
    });
  });
});

describe("modifierAnalyseLegionelle / supprimerAnalyseLegionelle", () => {
  it("une valeur vidée s'efface : l'analyse redevient « valeur non saisie », pas « sous la limite »", async () => {
    h.reponses["analyseLegionelle.findFirst"] = () => ({ id: "a_1", rapportCle: null });
    const r = await modifierAnalyseLegionelle(
      "e1",
      "a_1",
      idle,
      fd({ dateAnalyse: cleJourCivil(new Date()), valeurUfcParL: "", laboratoire: "", commentaire: "" }),
    );
    expect(r).toEqual({ status: "success" });
    const { data } = ops("analyseLegionelle.update")[0].args as { data: Record<string, unknown> };
    expect(data.valeurUfcParL).toBeNull();
    expect(data.laboratoire).toBeNull();
    expect(data.conforme).toBe(false);
  });

  it("supprimer libère le rapport de laboratoire, après la base", async () => {
    h.reponses["analyseLegionelle.findFirst"] = () => ({ id: "a_1", rapportCle: "rapports/e1/legio.pdf" });
    await supprimerAnalyseLegionelle("e1", "a_1");
    expect(ops("analyseLegionelle.findFirst")[0].args).toMatchObject({
      where: { id: "a_1", carnet: { etablissementId: "e1" } },
    });
    expect(ops("analyseLegionelle.delete")).toHaveLength(1);
    expect(h.stockage.liberes).toEqual(["rapports/e1/legio.pdf"]);
  });
});
