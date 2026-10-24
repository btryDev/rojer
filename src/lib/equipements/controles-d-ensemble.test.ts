import { describe, expect, it, vi } from "vitest";

// Les contrôles d'ensemble rangés par domaine (points à corriger, lot 2) :
// un contrôle sous SON domaine, « aussi » sous les autres domaines qu'il
// couvre, compté une fois.

const h = vi.hoisted(() => ({ lignes: [] as Record<string, unknown>[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { verification: { findMany: vi.fn(async () => h.lignes) } } }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));
vi.mock("@/lib/rapports/joindre-realisations", () => ({
  joindreDernieresRealisations: async (l: object[]) => l.map((x) => ({ ...x, derniereRealisation: null, dernierResultat: null })),
}));

const { controlesDEnsemble } = await import("./controles-d-ensemble");

const ligne = (over: Record<string, unknown>) => ({
  id: "v1",
  obligationId: "aeration-controle-installations-r4222-20",
  libelleObligation: "Contrôle annuel des installations d'aération",
  statut: "planifiee",
  datePrevue: new Date("2027-03-01T00:00:00Z"),
  periodicite: "annuelle",
  archiveLe: null,
  graceJusquAu: null,
  suiviDepuis: new Date("2026-01-01T00:00:00Z"),
  _count: { actions: 2 },
  ...over,
});

describe("controlesDEnsemble", () => {
  it("range l'aération sous son domaine, et sous la cuisson en « aussi » (les hottes)", async () => {
    h.lignes = [ligne({})];
    const [c] = await controlesDEnsemble("e1", new Date("2026-10-24T10:00:00Z"));
    expect(c).toMatchObject({ domaine: "aeration", pointsOuverts: 2 });
    expect(c.aussi).toContain("cuisson_hotte");
    expect(c.aussi).not.toContain("aeration");
  });

  it("écarte un état permanent (sans rendez-vous) : il se tient ailleurs", async () => {
    h.lignes = [ligne({ periodicite: "autre", statut: "a_planifier" })];
    const r = await controlesDEnsemble("e1", new Date("2026-10-24T10:00:00Z"));
    expect(r.every((c) => c.etat !== "sansRendezVous")).toBe(true);
  });

  it("écarte une ligne d'établissement qui ne vise aucun appareil, et une obligation inconnue", async () => {
    h.lignes = [ligne({ obligationId: "obligation-qui-n-existe-pas" })];
    expect(await controlesDEnsemble("e1", new Date())).toEqual([]);
  });
});
