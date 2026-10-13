import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Un identifiant de plan ne dit pas s'il existe chez un autre client (audit
 * du 2026-10-13, même défaut que les permis de feu).
 *
 * Les actions lisaient le plan par son seul `id`, puis vérifiaient
 * l'établissement : un id absent rendait « Plan introuvable » (ou rien), un
 * id d'un autre client le 404 du contrôle. Absent et hors périmètre doivent
 * répondre pareil, et rien ne doit s'écrire.
 */
type Ligne = Record<string, unknown>;

const { db } = vi.hoisted(() => ({
  db: {
    plans: [] as Ligne[],
    proprietaires: { "etab-a-moi": "u1", "etab-voisin": "u2" } as Record<string, string>,
    ecritures: [] as string[],
  },
}));

function visible(p: Ligne, where: Ligne): boolean {
  const { etablissement, ...reste } = where as {
    etablissement?: { entreprise?: { userId?: string } };
  } & Ligne;
  if (!Object.entries(reste).every(([k, v]) => p[k] === v)) return false;
  const userId = etablissement?.entreprise?.userId;
  return userId === undefined || db.proprietaires[p.etablissementId as string] === userId;
}

vi.mock("@/lib/prisma", () => {
  const ecrit = (quoi: string) =>
    vi.fn(async () => {
      db.ecritures.push(quoi);
      return { count: 1 };
    });
  const client: Record<string, unknown> = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(client),
    $queryRaw: async () => [],
    planPrevention: {
      findUnique: vi.fn(async ({ where }: { where: Ligne }) => db.plans.find((p) => visible(p, where)) ?? null),
      findFirst: vi.fn(async ({ where }: { where: Ligne }) => db.plans.find((p) => visible(p, where)) ?? null),
      update: ecrit("update"),
      updateMany: ecrit("updateMany"),
      delete: ecrit("delete"),
    },
    signature: { count: vi.fn(async () => 0) },
    accessToken: { updateMany: vi.fn(async () => ({ count: 0 })) },
  };
  return { prisma: client };
});
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (u: string) => {
    throw new Error(`NEXT_REDIRECT ${u}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async (e: string) => {
    if (db.proprietaires[e] !== "u1") throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/lib/signatures/trace", () => ({ porteUneTraceDeSignature: vi.fn(async () => false) }));
vi.mock("@/lib/access-tokens/revocation", () => ({ revoquerLiensEnVol: vi.fn(async () => undefined) }));
vi.mock("./queries", () => ({ nextNumeroPlan: vi.fn(async () => 2) }));

import {
  cloturerPlan,
  modifierPlanPrevention,
  noterHeuresRevisees,
  noterInformationInspection,
  supprimerPlan,
} from "./actions";

async function issue(f: () => Promise<unknown>): Promise<unknown> {
  try {
    return { rend: await f() };
  } catch (e) {
    return { leve: (e as Error).message };
  }
}

function saisie(champs: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(champs)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  db.ecritures = [];
  db.plans = [
    { id: "pp-voisin", etablissementId: "etab-voisin", numero: 7, statut: "attente_signatures" },
    { id: "pp-a-moi", etablissementId: "etab-a-moi", numero: 1, statut: "attente_signatures" },
  ];
});

const ACTIONS: [string, (id: string) => Promise<unknown>][] = [
  ["modifierPlanPrevention", (id) => modifierPlanPrevention(id, { status: "idle" }, new FormData())],
  ["cloturerPlan", (id) => cloturerPlan(id)],
  ["supprimerPlan", (id) => supprimerPlan(id)],
  [
    "noterInformationInspection",
    (id) => noterInformationInspection(id, { status: "idle" }, saisie({ inspectionTravailInformeeLe: "2026-10-01" })),
  ],
  [
    "noterHeuresRevisees",
    (id) =>
      noterHeuresRevisees(
        id,
        { status: "idle" },
        saisie({ heuresPrevisiblesRevisees: "450", heuresPrevisiblesReviseesLe: "2026-10-01" }),
      ),
  ],
];

describe.each(ACTIONS)("%s", (_nom, action) => {
  it("répond pareil pour un id absent et pour le plan d'un autre client, sans rien écrire", async () => {
    const absent = await issue(() => action("pp-inexistant"));
    const voisin = await issue(() => action("pp-voisin"));
    expect(voisin).toEqual(absent);
    expect(voisin).toEqual({ leve: "NEXT_NOT_FOUND" });
    expect(db.ecritures).toEqual([]);
    expect(db.plans.find((p) => p.id === "pp-voisin")?.statut).toBe("attente_signatures");
  });
});

describe("son propre plan reste atteignable", () => {
  it("cloturerPlan clôt un plan du compte", async () => {
    await cloturerPlan("pp-a-moi");
    expect(db.ecritures).toEqual(["update"]);
  });
});
