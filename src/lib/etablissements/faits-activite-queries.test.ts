// Cloisonnement de `chargerFaitsActivite` (ADR-005, ADR-041).
//
// Même méthode que `salaries/isolation.test.ts` : le faux Prisma ÉVALUE le
// `where` émis contre deux dossiers en mémoire, relation comprise, et
// l'assertion porte sur ce que la lecture rend. Une clause qui aurait l'air
// d'une portée sans en être une tombe ici. Bruyant sur ce qu'il ne comprend
// pas : un filtre d'une forme non gérée lève.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  type Ligne = Record<string, unknown>;
  const db = {
    entreprises: [
      { id: "ent-a", userId: "user-a" },
      { id: "ent-b", userId: "user-b" },
    ] as Ligne[],
    etablissements: [
      { id: "etab-a", entrepriseId: "ent-a", conduiteEngins: true, manutentionManuelle: false },
      { id: "etab-b", entrepriseId: "ent-b", conduiteEngins: false, manutentionManuelle: true },
    ] as Ligne[],
  };
  const RELATIONS: Record<string, (l: Ligne) => Ligne | undefined> = {
    entreprise: (e) => db.entreprises.find((en) => en.id === e.entrepriseId),
  };
  function correspond(ligne: Ligne, where: Ligne): boolean {
    for (const [cle, attendu] of Object.entries(where)) {
      const relation = RELATIONS[cle];
      if (relation) {
        const liee = relation(ligne);
        if (!liee || !correspond(liee, attendu as Ligne)) return false;
        continue;
      }
      if (attendu !== null && typeof attendu === "object") {
        throw new Error(`Faux Prisma : filtre non géré sur « ${cle} »`);
      }
      if (ligne[cle] !== attendu) return false;
    }
    return true;
  }
  const user = { id: "user-a" };
  const prisma = {
    etablissement: {
      findFirst: async ({ where, select }: { where: Ligne; select: Record<string, true> }) => {
        const e = db.etablissements.find((x) => correspond(x, where));
        if (!e) return null;
        return Object.fromEntries(Object.keys(select).map((k) => [k, e[k] ?? null]));
      },
    },
  };
  return { prisma, user };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => h.user,
  getOptionalUser: vi.fn(),
}));

const { chargerFaitsActivite } = await import("./faits-activite-queries");

beforeEach(() => {
  h.user.id = "user-a";
});

describe("chargerFaitsActivite — dossier voisin", () => {
  it("rend les faits de son propre établissement, silence compris", async () => {
    const r = await chargerFaitsActivite("etab-a");
    expect(r?.conduiteEngins).toBe(true);
    expect(r?.manutentionManuelle).toBe(false);
    expect(r?.travailSurEcran).toBeNull();
  });

  it("ne rend rien de l'établissement d'un autre utilisateur", async () => {
    // L'identifiant est valide : seule la clause d'appartenance peut l'écarter.
    expect(await chargerFaitsActivite("etab-b")).toBeNull();
  });
});
