import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Un identifiant de permis ne dit pas s'il existe chez un autre client (audit
 * du 2026-10-13, B5).
 *
 * Les actions lisaient le permis par son seul `id`, puis vérifiaient
 * l'établissement : un id absent rendait une réponse (rien, ou « Permis
 * introuvable »), un id d'un autre client une autre (404). La différence
 * suffit à sonder l'existence d'un permis chez autrui. Absent et hors
 * périmètre doivent répondre pareil, et rien ne doit s'écrire.
 */
type Ligne = Record<string, unknown>;

const { db } = vi.hoisted(() => ({
  db: {
    permis: [] as Ligne[],
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
  const client: Record<string, unknown> = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(client),
    $queryRaw: async () => [],
    permisFeu: {
      findUnique: vi.fn(async ({ where }: { where: Ligne }) => db.permis.find((p) => visible(p, where)) ?? null),
      findFirst: vi.fn(async ({ where }: { where: Ligne }) => db.permis.find((p) => visible(p, where)) ?? null),
      updateMany: vi.fn(async ({ where }: { where: Ligne }) => {
        const t = db.permis.filter((p) => visible(p, where));
        if (t.length) db.ecritures.push("updateMany");
        return { count: t.length };
      }),
      update: vi.fn(async () => {
        db.ecritures.push("update");
        return {};
      }),
      delete: vi.fn(async () => {
        db.ecritures.push("delete");
        return {};
      }),
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
vi.mock("./queries", () => ({ nextNumeroPermisFeu: vi.fn(async () => 2) }));

import { marquerEnCours, marquerTermine, modifierPermisFeu, supprimerPermisFeu } from "./actions";

async function issue(f: () => Promise<unknown>): Promise<unknown> {
  try {
    return { rend: await f() };
  } catch (e) {
    return { leve: (e as Error).message };
  }
}

beforeEach(() => {
  db.ecritures = [];
  db.permis = [
    { id: "pf-voisin", etablissementId: "etab-voisin", numero: 7, statut: "valide" },
    { id: "pf-a-moi", etablissementId: "etab-a-moi", numero: 1, statut: "valide" },
  ];
});

const ACTIONS: [string, (id: string) => Promise<unknown>][] = [
  ["marquerEnCours", (id) => marquerEnCours(id)],
  ["marquerTermine", (id) => marquerTermine(id)],
  ["supprimerPermisFeu", (id) => supprimerPermisFeu(id)],
  ["modifierPermisFeu", (id) => modifierPermisFeu(id, { status: "idle" }, new FormData())],
];

describe.each(ACTIONS)("%s", (_nom, action) => {
  it("répond pareil pour un id absent et pour le permis d'un autre client, sans rien écrire", async () => {
    const absent = await issue(() => action("pf-inexistant"));
    const voisin = await issue(() => action("pf-voisin"));
    expect(voisin).toEqual(absent);
    expect(db.ecritures).toEqual([]);
    expect(db.permis.find((p) => p.id === "pf-voisin")?.statut).toBe("valide");
  });
});

describe("son propre permis reste atteignable", () => {
  it("marquerEnCours fait passer un permis validé en cours", async () => {
    await marquerEnCours("pf-a-moi");
    expect(db.ecritures).toEqual(["updateMany"]);
  });
});
