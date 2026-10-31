// La régénération lit par le client borné en session, à chaque passe, et
// n'écrit aucune clé que sa lecture n'a pas rendue (ADR-051, conception du
// calendrier, seconde lecture du 2026-10-30).

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanReconciliation } from "./generateur";
import type { LecturePasse } from "./passe";

const h = vi.hoisted(() => ({
  brut: {
    $transaction: vi.fn(),
    // Les opérations du lot ne sont que construites : la transaction simulée
    // rend les comptes.
    verification: { createMany: vi.fn(() => "createMany") },
    etablissement: { update: vi.fn(() => "update") },
  },
  borne: { nom: "client borné" },
  lecteurs: [] as unknown[],
  plan: null as unknown,
  lecture: null as unknown,
}));

vi.mock("@/lib/prisma", () => ({ prisma: h.brut }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementDuCompte: async () => ({ user: { id: "u" }, db: h.borne }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("./passe", () => ({
  lireEntrees: async (client: unknown) => {
    h.lecteurs.push(client);
    return h.lecture;
  },
  planifier: () => h.plan,
}));

const { regenererSansInvalider, regenererSansControleDeSession } = await import("./actions");
const { clesDuPlanDansLaLecture } = await import("./cles-du-plan");

function lecture(): LecturePasse {
  return {
    etab: {
      id: "e1",
      equipements: [{ id: "q1" }],
      prescriptionsParticulieres: [{ id: "p1" }],
      referentielVersionCalendrier: null,
    },
    titresBruts: [{ salarieId: "s1" }],
    existantes: [{ id: "v1" }],
  } as unknown as LecturePasse;
}

function plan(p: Partial<PlanReconciliation> = {}): PlanReconciliation {
  return {
    aCreer: [{ equipementId: "q1", salarieId: null, prescriptionId: "p1", cleUnique: "k1" }],
    aMettreAJour: [],
    aArchiver: [],
    aDesarchiver: [],
    aSupprimer: [],
    ...p,
  } as unknown as PlanReconciliation;
}

beforeEach(() => {
  h.lecteurs.length = 0;
  h.brut.$transaction.mockReset();
  h.lecture = lecture();
  h.plan = plan();
});

describe("la porte : les clés du plan viennent de la lecture de CET établissement", () => {
  it("un plan fait de la lecture passe ; prescriptionId null aussi", () => {
    expect(() => clesDuPlanDansLaLecture(plan(), lecture())).not.toThrow();
    expect(() =>
      clesDuPlanDansLaLecture(plan({ aMettreAJour: [{ id: "v1", prescriptionId: null }] as never }), lecture()),
    ).not.toThrow();
  });

  // Un équipement, un salarié, une prescription d'un AUTRE établissement du
  // MÊME compte : la borne au compte ne les voit pas, la porte si.
  it.each([
    ["équipement", { aCreer: [{ equipementId: "q-autre-etab", cleUnique: "k" }] }],
    ["salarié", { aCreer: [{ salarieId: "s-autre-etab", cleUnique: "k" }] }],
    ["prescription à créer", { aCreer: [{ prescriptionId: "p-autre-etab", cleUnique: "k" }] }],
    ["prescription à mettre à jour", { aMettreAJour: [{ id: "v1", prescriptionId: "p-autre-etab" }] }],
    ["ligne à mettre à jour", { aMettreAJour: [{ id: "v-autre", prescriptionId: null }] }],
    ["ligne à archiver", { aArchiver: [{ id: "v-autre" }] }],
    ["ligne à désarchiver", { aDesarchiver: [{ id: "v-autre" }] }],
    ["ligne à supprimer", { aSupprimer: ["v-autre"] }],
  ])("%s hors de la lecture : refusé", (_genre, p) => {
    expect(() => clesDuPlanDansLaLecture(plan(p as never), lecture())).toThrow(/Régénération refusée/);
  });
});

describe("le fil du client", () => {
  it("en session, chaque passe lit par le client borné, relance comprise", async () => {
    // Première passe : un compte court (la base a bougé) → seconde passe.
    h.brut.$transaction.mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([{ count: 1 }]);
    await regenererSansInvalider("e1");
    expect(h.lecteurs.length).toBe(2);
    expect(h.lecteurs.every((l) => l === h.borne)).toBe(true);
  });

  it("le script lit par le client brut", async () => {
    h.brut.$transaction.mockResolvedValueOnce([{ count: 1 }]);
    await regenererSansControleDeSession("e1");
    expect(h.lecteurs).toEqual([h.brut]);
  });

  it("un plan refusé n'écrit rien, dans les deux chemins", async () => {
    h.plan = plan({ aCreer: [{ equipementId: "q-autre-etab", cleUnique: "k" }] as never });
    await expect(regenererSansInvalider("e1")).rejects.toThrow(/Régénération refusée/);
    await expect(regenererSansControleDeSession("e1")).rejects.toThrow(/Régénération refusée/);
    expect(h.brut.$transaction).not.toHaveBeenCalled();
  });
});
