// Un minimum ET un maximum par point de relevé (2026-10-14,
// `docs/chantiers-ouverts.md` point 5). L'article 36 de l'arrêté du 23 juin
// 1978 fixe des maximums contre la brûlure et des minimums contre les
// légionelles ; un seul seuil minimal lisait « dans la plage » une douche à
// 58 °C. Base simulée pour les actions : on relève ce qu'elles écrivent.

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
  return { prisma, appels, reponses };
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

import { ajouterReleve, creerPointReleve, modifierPointReleve } from "./actions";
import {
  RESEAU_DU_TYPE_POINT,
  SEUILS_TYPE_POINT,
  TYPES_POINT,
  estReleveConforme,
  libelleSeuils,
  pointReleveSchema,
} from "./schema";
import { cleJourCivil } from "@/lib/dates";

const ops = (op: string) => h.appels.filter((a) => a.op === op);
const fd = (champs: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
};
const idle = { status: "idle" } as const;
const point = (typePoint: string, seuils: Record<string, string>) =>
  fd({ nom: "Point", localisation: "", batimentId: "", typePoint, ...seuils });

beforeEach(() => {
  h.appels.length = 0;
  for (const k of Object.keys(h.reponses)) delete h.reponses[k];
});

describe("estReleveConforme — au-dessus du minimum, au-dessous du maximum", () => {
  it("une douche à 58 °C sort de la plage : le maximum contre la brûlure est lu", () => {
    const douche = SEUILS_TYPE_POINT.PUISAGE_TOILETTE;
    expect(estReleveConforme(58, douche)).toBe(false);
    expect(estReleveConforme(50, douche)).toBe(true); // « au plus » : borne incluse
    // Pas de minimum au robinet : les tubes finaux sont exceptés du § 2.
    expect(estReleveConforme(30, douche)).toBe(true);
  });

  it("une sortie de stockage sous 55 °C sort de la plage, au-dessus y reste", () => {
    const sortie = SEUILS_TYPE_POINT.SORTIE_STOCKAGE;
    expect(estReleveConforme(54.5, sortie)).toBe(false);
    expect(estReleveConforme(55, sortie)).toBe(true); // « au moins » : borne incluse
    expect(estReleveConforme(70, sortie)).toBe(true);
  });

  it("l'eau froide passe au maximum explicite", () => {
    const froide = SEUILS_TYPE_POINT.EAU_FROIDE;
    expect(estReleveConforme(21, froide)).toBe(false);
    expect(estReleveConforme(12, froide)).toBe(true);
  });

  it("un point aux deux bornes est lu des deux côtés", () => {
    const deux = { seuilMinCelsius: 50, seuilMaxCelsius: 60 };
    expect(estReleveConforme(49, deux)).toBe(false);
    expect(estReleveConforme(61, deux)).toBe(false);
    expect(estReleveConforme(55, deux)).toBe(true);
  });

  it("un point d'avant le type garde son sens : minimum seul, pas de plafond", () => {
    const ancien = { seuilMinCelsius: 50, seuilMaxCelsius: null };
    expect(estReleveConforme(65, ancien)).toBe(true);
    expect(estReleveConforme(49, ancien)).toBe(false);
  });
});

describe("le type de point — ce qu'il préremplit et ce qu'il donne", () => {
  it("aucun point de puisage n'a de minimum, et chacun a un maximum", () => {
    for (const t of ["PUISAGE_TOILETTE", "PUISAGE_AUTRE"] as const) {
      expect(SEUILS_TYPE_POINT[t].seuilMinCelsius, t).toBeNull();
      expect(SEUILS_TYPE_POINT[t].seuilMaxCelsius, t).not.toBeNull();
    }
    // Le plafond des pièces de toilette est plus bas que celui des autres.
    expect(SEUILS_TYPE_POINT.PUISAGE_TOILETTE.seuilMaxCelsius).toBeLessThan(
      SEUILS_TYPE_POINT.PUISAGE_AUTRE.seuilMaxCelsius!,
    );
  });

  it("le réseau et la sortie de stockage ont un minimum et pas de maximum", () => {
    for (const t of ["SORTIE_STOCKAGE", "RETOUR_BOUCLE"] as const) {
      expect(SEUILS_TYPE_POINT[t].seuilMaxCelsius, t).toBeNull();
      expect(SEUILS_TYPE_POINT[t].seuilMinCelsius, t).not.toBeNull();
    }
  });

  it("seule l'eau froide donne le réseau EFS", () => {
    const efs = TYPES_POINT.filter((t) => RESEAU_DU_TYPE_POINT[t] === "EFS");
    expect(efs).toEqual(["EAU_FROIDE"]);
  });

  it("le type donne le réseau, quel que soit le réseau reçu", () => {
    const r = pointReleveSchema.safeParse({
      nom: "Douche",
      typePoint: "PUISAGE_TOILETTE",
      typeReseau: "EFS",
      seuilMaxCelsius: "50",
    });
    expect(r.success && r.data.typeReseau).toBe("ECS");
  });

  it("le libellé dit les bornes présentes, et elles seules", () => {
    const f = (c: number) => `${c} °C`;
    expect(libelleSeuils(SEUILS_TYPE_POINT.PUISAGE_TOILETTE, f)).toBe("max 50 °C");
    expect(libelleSeuils({ seuilMinCelsius: 50, seuilMaxCelsius: 60 }, f)).toBe("min 50 °C · max 60 °C");
  });
});

describe("creerPointReleve — un point neuf dit où il est, et porte une plage", () => {
  it("sans type, refusé sur le champ du type ; rien n'est écrit", async () => {
    const r = await creerPointReleve(
      "e1",
      idle,
      fd({ nom: "Douche", localisation: "", batimentId: "", typeReseau: "ECS", seuilMinCelsius: "50" }),
    );
    expect(r).toMatchObject({ status: "error", fieldErrors: { typePoint: expect.any(Array) } });
    expect(ops("pointReleve.create")).toEqual([]);
  });

  it("sans aucun seuil, refusé : tout relevé serait « dans la plage »", async () => {
    const r = await creerPointReleve("e1", idle, point("PUISAGE_AUTRE", {}));
    expect(r).toMatchObject({ status: "error", fieldErrors: { seuilMinCelsius: expect.any(Array) } });
    expect(ops("pointReleve.create")).toEqual([]);
  });

  it("un maximum sous le minimum est refusé", async () => {
    const r = await creerPointReleve(
      "e1",
      idle,
      point("RETOUR_BOUCLE", { seuilMinCelsius: "55", seuilMaxCelsius: "50" }),
    );
    expect(r).toMatchObject({ status: "error", fieldErrors: { seuilMaxCelsius: expect.any(Array) } });
  });

  it("une douche s'écrit avec son type, son réseau et son seul maximum", async () => {
    h.reponses["carnetSanitaire.findUnique"] = () => ({ id: "cs_1" });
    const r = await creerPointReleve(
      "e1",
      idle,
      point("PUISAGE_TOILETTE", { seuilMinCelsius: "", seuilMaxCelsius: "50" }),
    );
    expect(r).toEqual({ status: "success" });
    expect((ops("pointReleve.create")[0].args as { data: unknown }).data).toMatchObject({
      typePoint: "PUISAGE_TOILETTE",
      typeReseau: "ECS",
      seuilMinCelsius: null,
      seuilMaxCelsius: 50,
    });
  });
});

describe("les actions lisent le maximum", () => {
  it("ajouterReleve : une douche à 58 °C est écrite hors de la plage", async () => {
    h.reponses["pointReleve.findUnique"] = () => ({
      seuilMinCelsius: null,
      seuilMaxCelsius: 50,
      carnet: { etablissementId: "e1" },
    });
    const r = await ajouterReleve(
      "e1",
      idle,
      fd({ pointReleveId: "pt_1", dateReleve: cleJourCivil(new Date()), temperatureCelsius: "58", operateur: "", commentaire: "" }),
    );
    expect(r).toEqual({ status: "success" });
    expect((ops("releveTemperature.create")[0].args as { data: { conforme: boolean } }).data.conforme).toBe(false);
  });

  it("modifierPointReleve : préciser le type d'un point recalcule ses relevés sur le maximum", async () => {
    h.reponses["pointReleve.findFirst"] = () => ({
      id: "pt_1",
      typePoint: null,
      releves: [
        { id: "r_45", temperatureCelsius: 45 },
        { id: "r_58", temperatureCelsius: 58 },
      ],
    });
    const r = await modifierPointReleve(
      "e1",
      "pt_1",
      idle,
      point("PUISAGE_TOILETTE", { seuilMinCelsius: "", seuilMaxCelsius: "50" }),
    );
    expect(r).toEqual({ status: "success" });
    const plages = Object.fromEntries(
      ops("releveTemperature.update").map((a) => {
        const { where, data } = a.args as { where: { id: string }; data: { conforme: boolean } };
        return [where.id, data.conforme];
      }),
    );
    expect(plages).toEqual({ r_45: true, r_58: false });
    expect((ops("pointReleve.update")[0].args as { data: unknown }).data).toMatchObject({
      typePoint: "PUISAGE_TOILETTE",
      seuilMinCelsius: null,
      seuilMaxCelsius: 50,
    });
  });

  it("modifierPointReleve : le type d'un point typé ne se retire pas, rien n'est écrit", async () => {
    h.reponses["pointReleve.findFirst"] = () => ({
      id: "pt_1",
      typePoint: "PUISAGE_TOILETTE",
      releves: [{ id: "r_58", temperatureCelsius: 58 }],
    });
    // Envoi forgé : le formulaire ne propose pas « non précisé » à un point typé.
    const r = await modifierPointReleve(
      "e1",
      "pt_1",
      idle,
      fd({ nom: "Douche", localisation: "", batimentId: "", typePoint: "", typeReseau: "ECS", seuilMinCelsius: "50" }),
    );
    expect(r).toMatchObject({ status: "error", fieldErrors: { typePoint: expect.any(Array) } });
    expect(ops("pointReleve.update")).toEqual([]);
    expect(ops("releveTemperature.update")).toEqual([]);
  });

  it("modifierPointReleve : un point d'avant le type peut le rester, et garde son réseau", async () => {
    h.reponses["pointReleve.findFirst"] = () => ({ id: "pt_1", typePoint: null, releves: [] });
    const r = await modifierPointReleve(
      "e1",
      "pt_1",
      idle,
      fd({ nom: "Retour", localisation: "", batimentId: "", typePoint: "", typeReseau: "ECS_BOUCLAGE", seuilMinCelsius: "50" }),
    );
    expect(r).toEqual({ status: "success" });
    expect((ops("pointReleve.update")[0].args as { data: unknown }).data).toMatchObject({
      typePoint: null,
      typeReseau: "ECS_BOUCLAGE",
      seuilMinCelsius: 50,
      seuilMaxCelsius: null,
    });
  });
});
