import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le seuil des 400 heures atteint EN COURS de chantier — R. 4512-7, 1°,
 * seconde phrase : « Il en est de même dès lors qu'il apparaît, en cours
 * d'exécution des travaux, que le nombre d'heures de travail doit atteindre
 * 400 heures » (2026-10-12).
 */
type Ligne = Record<string, unknown>;
const { db } = vi.hoisted(() => ({ db: { plans: [] as Ligne[] } }));
const correspond = (l: Ligne, w: Ligne) => Object.entries(w).every(([k, v]) => l[k] === v);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    planPrevention: {
      findUnique: vi.fn(async ({ where }: { where: Ligne }) => db.plans.find((p) => correspond(p, where)) ?? null),
      updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
        const t = db.plans.filter((x) => correspond(x, where));
        t.forEach((p) => Object.assign(p, data));
        return { count: t.length };
      }),
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async (e: string) => {
    if (e !== "etab-a-moi") throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/lib/batiments/queries", () => ({ resoudreBatimentOptionnel: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn() }));

import { diagnostiquerPlan } from "./schema";
import { noterHeuresRevisees } from "./actions";
import { lignesR4512_12Zip } from "./annonces-zip";
import { depuisCleJourCivil, formaterDateFr } from "@/lib/dates";

const LE = depuisCleJourCivil("2026-10-05");

describe("diagnostiquerPlan — la révision en cours de chantier", () => {
  it("120 h estimées, 450 h revues : écrit obligatoire au titre de la seconde phrase, et d'elle seule", () => {
    const d = diagnostiquerPlan({
      dureeHeuresEstimee: 120,
      travauxDangereux: false,
      heuresPrevisiblesRevisees: 450,
      heuresPrevisiblesReviseesLe: LE,
    });
    expect(d.ecritObligatoire).toBe(true);
    expect(d.seuil400).toBe(false);
    expect(d.seuil400EnCours).toBe(true);
    expect(d.raisons).toEqual([
      "Heures prévisibles revues : 450 h, seuil de 400 h noté le 05/10/2026. Art. R. 4512-7, 1° : « Il en est de même dès lors qu'il apparaît, en cours d'exécution des travaux, que le nombre d'heures de travail doit atteindre 400 heures ».",
    ]);
  });

  it("450 h estimées, 300 h revues : la baisse ne retire pas l'obligation née de l'estimation", () => {
    const d = diagnostiquerPlan({
      dureeHeuresEstimee: 450,
      travauxDangereux: false,
      heuresPrevisiblesRevisees: 300,
      heuresPrevisiblesReviseesLe: LE,
    });
    expect(d.ecritObligatoire).toBe(true);
    expect(d.seuil400).toBe(true);
    expect(d.seuil400EnCours).toBe(false);
  });

  it("aucune estimation, 300 h revues : Rojer sait, l'écrit n'est pas imposé", () => {
    const d = diagnostiquerPlan({
      dureeHeuresEstimee: null,
      travauxDangereux: false,
      heuresPrevisiblesRevisees: 300,
      heuresPrevisiblesReviseesLe: LE,
    });
    expect(d.ecrit).toBe("non_impose");
    expect(d.recommandation).toMatch(/^Heures prévisibles revues le 05\/10\/2026 : 300 h ; /);
  });

  it("le ZIP cite R. 4512-12 sous un plan dont seule la révision atteint 400 h", () => {
    const lignes = lignesR4512_12Zip(
      {
        dureeHeuresEstimee: 120,
        travauxDangereux: false,
        inspectionTravailInformeeLe: null,
        heuresPrevisiblesRevisees: 400,
        heuresPrevisiblesReviseesLe: LE,
      },
      formaterDateFr,
    );
    expect(lignes.join("\n")).toContain("Art. R. 4512-12");
  });
});

function plan(extra: Ligne = {}): Ligne {
  return {
    id: "pp-1",
    etablissementId: "etab-a-moi",
    statut: "valide",
    heuresPrevisiblesRevisees: null,
    heuresPrevisiblesReviseesLe: null,
    ...extra,
  };
}

const noter = (heures: string, le: string, correction = false) => {
  const fd = new FormData();
  fd.set("heuresPrevisiblesRevisees", heures);
  fd.set("heuresPrevisiblesReviseesLe", le);
  if (correction) fd.set("correctionSaisie", "on");
  return noterHeuresRevisees("pp-1", { status: "idle" }, fd);
};

describe("noterHeuresRevisees", () => {
  beforeEach(() => {
    db.plans = [];
  });

  it("note la valeur et sa date, même sur un plan signé (hors empreinte)", async () => {
    db.plans.push(plan());
    expect(await noter("450", "2026-10-05")).toEqual({ status: "success" });
    expect(db.plans[0].heuresPrevisiblesRevisees).toBe(450);
    expect(db.plans[0].heuresPrevisiblesReviseesLe).toEqual(LE);
  });

  it("la dernière valeur remplace la précédente", async () => {
    db.plans.push(plan({ heuresPrevisiblesRevisees: 200, heuresPrevisiblesReviseesLe: LE }));
    await noter("350", "2026-10-06");
    expect(db.plans[0].heuresPrevisiblesRevisees).toBe(350);
  });

  it("une baisse sous 400 h, une fois les 400 h notées, est refusée comme révision", async () => {
    db.plans.push(plan({ heuresPrevisiblesRevisees: 420, heuresPrevisiblesReviseesLe: LE }));
    const r = await noter("390", "2026-10-06");
    expect(r).toEqual({
      status: "error",
      message:
        "Les 400 heures ont déjà été notées : l'écrit est dû depuis, et une révision à la baisse ne le retire pas. S'il s'agissait d'une erreur de saisie, cochez « Je corrige une erreur de saisie ».",
    });
    expect(db.plans[0].heuresPrevisiblesRevisees).toBe(420);
  });

  // Relecture indépendante du 2026-10-12 : la faute de frappe était
  // incorrigible, et la date réécrite à chaque saisie.
  it("la correction de saisie déclarée remplace la valeur ET la date", async () => {
    db.plans.push(plan({ heuresPrevisiblesRevisees: 4500, heuresPrevisiblesReviseesLe: LE }));
    const r = await noter("450", "2026-10-06", true);
    expect(r).toEqual({ status: "success" });
    expect(db.plans[0].heuresPrevisiblesRevisees).toBe(450);
    expect(db.plans[0].heuresPrevisiblesReviseesLe).toEqual(depuisCleJourCivil("2026-10-06"));

    db.plans[0].heuresPrevisiblesRevisees = 4500;
    expect(await noter("45", "2026-10-07", true)).toEqual({ status: "success" });
    expect(db.plans[0].heuresPrevisiblesRevisees).toBe(45);
  });

  it("la date retenue est la PREMIÈRE où 400 h ont été notées, et ne bouge plus au-dessus", async () => {
    db.plans.push(plan({ heuresPrevisiblesRevisees: 200, heuresPrevisiblesReviseesLe: LE }));
    await noter("420", "2026-10-06");
    expect(db.plans[0].heuresPrevisiblesReviseesLe).toEqual(depuisCleJourCivil("2026-10-06"));

    await noter("600", "2026-10-09");
    expect(db.plans[0].heuresPrevisiblesRevisees).toBe(600);
    expect(db.plans[0].heuresPrevisiblesReviseesLe).toEqual(depuisCleJourCivil("2026-10-06"));
  });

  it("sous 400 h, la date suit la révision", async () => {
    db.plans.push(plan({ heuresPrevisiblesRevisees: 200, heuresPrevisiblesReviseesLe: LE }));
    await noter("300", "2026-10-08");
    expect(db.plans[0].heuresPrevisiblesReviseesLe).toEqual(depuisCleJourCivil("2026-10-08"));
  });

  it.each([
    ["0", "2026-10-05"],
    ["100000", "2026-10-05"],
    ["12.5", "2026-10-05"],
    ["450", ""],
    ["450", "2099-01-01"],
  ])("refuse %s h le « %s »", async (heures, le) => {
    db.plans.push(plan());
    expect((await noter(heures, le)).status).toBe("error");
    expect(db.plans[0].heuresPrevisiblesRevisees).toBeNull();
  });

  it.each(["clos", "annule"])("refuse sur un plan %s", async (statut) => {
    db.plans.push(plan({ statut }));
    expect((await noter("450", "2026-10-05")).status).toBe("error");
    expect(db.plans[0].heuresPrevisiblesRevisees).toBeNull();
  });

  it("traversée : le plan d'un autre client ne se note pas", async () => {
    db.plans.push(plan({ etablissementId: "etab-voisin" }));
    await expect(noter("450", "2026-10-05")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
