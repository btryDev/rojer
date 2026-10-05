// Cloisonnement de `chargerReponsesTransverses` (ADR-005, ADR-038).
//
// Même méthode que `salaries/isolation.test.ts` : le faux Prisma ÉVALUE le
// `where` émis contre deux dossiers en mémoire, chaîne de relations comprise,
// et l'assertion porte sur ce que la lecture rend — pas sur la forme de la
// clause. Une clause qui aurait l'air d'une portée sans en être une tombe ici.
// Bruyant sur ce qu'il ne comprend pas : un filtre d'une forme non gérée lève.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  type Ligne = Record<string, unknown>;
  const db = {
    entreprises: [
      { id: "ent-a", userId: "user-a" },
      { id: "ent-b", userId: "user-b" },
    ] as Ligne[],
    etablissements: [
      { id: "etab-a", entrepriseId: "ent-a" },
      { id: "etab-b", entrepriseId: "ent-b" },
    ] as Ligne[],
    duerps: [
      { id: "duerp-a", etablissementId: "etab-a", reponsesTransverses: { "q-routier": false } },
      { id: "duerp-b", etablissementId: "etab-b", reponsesTransverses: { "q-ecran": false } },
    ] as Ligne[],
    unites: [
      { duerpId: "duerp-a", estTransverse: true, risques: [{ referentielId: "trv-conduite-engins" }] },
      { duerpId: "duerp-b", estTransverse: true, risques: [{ referentielId: "trv-operations-electriques" }] },
    ] as Ligne[],
  };
  const RELATIONS: Record<string, (l: Ligne) => Ligne | undefined> = {
    etablissement: (d) => db.etablissements.find((e) => e.id === d.etablissementId),
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
    duerp: {
      findFirst: async ({ where }: { where: Ligne }) => {
        const d = db.duerps.find((x) => correspond(x, where));
        if (!d) return null;
        return {
          id: d.id,
          reponsesTransverses: d.reponsesTransverses,
          unites: db.unites.filter((u) => u.duerpId === d.id && u.estTransverse),
        };
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

const { chargerReponsesTransverses } = await import("./queries");

beforeEach(() => {
  h.user.id = "user-a";
});

describe("chargerReponsesTransverses — dossier voisin", () => {
  it("rend les réponses de son propre DUERP", async () => {
    const r = await chargerReponsesTransverses("etab-a");
    expect(r?.duerpId).toBe("duerp-a");
    const parId = Object.fromEntries(r!.repondues.map((x) => [x.question.id, x.reponse]));
    expect(parId["q-conduite-engins"]).toBe("oui");
    expect(parId["q-routier"]).toBe("non");
  });

  it("ne rend rien de l'établissement d'un autre utilisateur", async () => {
    // L'identifiant d'établissement est valide et a un DUERP : seule la
    // clause d'appartenance peut l'écarter.
    expect(await chargerReponsesTransverses("etab-b")).toBeNull();
  });
});
