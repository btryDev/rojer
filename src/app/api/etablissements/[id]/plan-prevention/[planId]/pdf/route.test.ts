// La route PDF d'un plan de prévention (2026-11-19) : la garde
// d'appartenance d'abord, le plan relu dans l'établissement ensuite.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  requireEtablissement: vi.fn(),
  plan: null as Record<string, unknown> | null,
  lectures: [] as unknown[],
}));

vi.mock("@/lib/auth/scope", () => ({ requireEtablissement: h.requireEtablissement }));

const PLAN = {
  numero: 4,
  statut: "brouillon",
  entrepriseExterieureRaison: "Clim Services",
  entrepriseExterieureSiret: null,
  efChefNom: "Paul Durand",
  efEffectifIntervenant: 2,
  euChefNom: "Claire Martin",
  euChefFonction: null,
  dateDebut: new Date("2026-11-20T07:00:00Z"),
  dateFin: new Date("2026-11-21T16:00:00Z"),
  dureeHeuresEstimee: 12,
  heuresPrevisiblesRevisees: null,
  heuresPrevisiblesReviseesLe: null,
  lieux: "Cuisine",
  naturesTravaux: "Groupe froid",
  travauxDangereux: false,
  inspectionDate: null,
  inspectionParticipants: null,
  lignes: [],
  phasesDangereuses: [],
  adaptationMateriels: null,
  instructionsTravailleurs: null,
  organisationSecours: null,
  participationCroisee: null,
};

const db = {
  etablissement: {
    findFirst: vi.fn(async () => ({
      raisonDisplay: "Le Comptoir",
      adresse: "1 rue des Lilas",
      siret: null,
      entreprise: { raisonSociale: "Btry SAS" },
    })),
  },
  planPrevention: {
    findFirst: vi.fn(async (args: unknown) => {
      h.lectures.push(args);
      return h.plan;
    }),
  },
  signature: { findMany: vi.fn(async () => []) },
  accessToken: { count: vi.fn(async () => 0) },
};

const { GET } = await import("./route");

const appel = (id: string, planId: string) =>
  GET(new Request("http://localhost/x"), { params: Promise.resolve({ id, planId }) });

beforeEach(() => {
  h.requireEtablissement.mockReset();
  h.lectures = [];
  h.plan = null;
});

describe("GET /api/etablissements/[id]/plan-prevention/[planId]/pdf", () => {
  it("un établissement d'un autre compte : la garde refuse, rien n'est lu", async () => {
    h.requireEtablissement.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;404"));
    await expect(appel("etab-autrui", "plan-1")).rejects.toThrow(/404/);
    expect(h.lectures).toHaveLength(0);
  });

  it("un plan d'un autre compte sous mon établissement : 404, le plan cherché dans MON établissement", async () => {
    h.requireEtablissement.mockResolvedValue({ db, user: { id: "u1" } });
    const r = await appel("etab-moi", "plan-autrui");
    expect(r.status).toBe(404);
    expect(h.lectures[0]).toMatchObject({ where: { id: "plan-autrui", etablissementId: "etab-moi" } });
  });

  it("mon plan : un PDF, inline, jamais en cache", async () => {
    h.requireEtablissement.mockResolvedValue({ db, user: { id: "u1" } });
    h.plan = PLAN;
    const r = await appel("etab-moi", "plan-1");
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("application/pdf");
    expect(r.headers.get("Content-Disposition")).toBe(
      'inline; filename="Plan_prevention_PP-004_Le_Comptoir.pdf"',
    );
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    const corps = Buffer.from(await r.arrayBuffer());
    expect(corps.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);
});
