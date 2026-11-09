import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  rappels: vi.fn(),
  avertir: vi.fn(),
  supprimer: vi.fn(),
  fichiers: vi.fn(),
  traces: vi.fn(),
  lancee: { v: true },
}));
vi.mock("@/lib/abonnements/lancement", () => ({ contexteDroits: () => ({}), offreLancee: () => m.lancee.v }));
vi.mock("@/lib/abonnements/rappels", () => ({ rappelerLaVeilleDeLaFinDEssai: m.rappels }));
vi.mock("@/lib/abonnements/suppression", () => ({
  avertirAvantSuppression: m.avertir,
  supprimerComptesEchus: m.supprimer,
  libererFichiersEnAttente: m.fichiers,
  purgerTracesEchues: m.traces,
}));
vi.mock("@/lib/stripe/config", () => ({ configurationStripe: () => ({ active: false }) }));
vi.mock("@/lib/stripe/client", () => ({ clientStripe: vi.fn() }));

import { appelAutorise, secretDesTaches } from "./quotidiennes";
import { POST } from "@/app/api/taches/quotidiennes/route";

const SECRET = "s".repeat(40);
const appel = (entete?: string) =>
  POST(new Request("https://rojer.test/api/taches/quotidiennes", { method: "POST", headers: entete ? { authorization: entete } : {} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  m.lancee.v = true;
  m.rappels.mockResolvedValue({ envoyes: 2, echecs: 0 });
  m.avertir.mockResolvedValue({ j30: { envoyes: 0, echecs: 0 }, j7: { envoyes: 0, echecs: 0 }, membresPrevenus: 0 });
  m.supprimer.mockResolvedValue({ supprimes: 0, reportes: 0 });
  m.fichiers.mockResolvedValue({ liberes: 3, echecs: 0, restants: 0 });
  m.traces.mockResolvedValue({ effacees: 1 });
});

describe("tâches quotidiennes", () => {
  it("le secret : absent ou vide = aucun ; espaces retirés", () => {
    expect(secretDesTaches({})).toBeNull();
    expect(secretDesTaches({ TACHES_SECRET: "  " })).toBeNull();
    expect(secretDesTaches({ TACHES_SECRET: ` ${SECRET} ` })).toBe(SECRET);
  });

  it("seul « Bearer <secret> » exact est autorisé", () => {
    expect(appelAutorise(`Bearer ${SECRET}`, SECRET)).toBe(true);
    for (const faux of [null, "", SECRET, `Bearer ${SECRET}x`, `bearer ${SECRET}`, `Bearer ${SECRET.slice(1)}`]) {
      expect(appelAutorise(faux, SECRET)).toBe(false);
    }
  });

  it("route sans secret configuré : 404, rien n'est lancé", async () => {
    vi.stubEnv("TACHES_SECRET", "");
    expect((await appel(`Bearer ${SECRET}`)).status).toBe(404);
    expect(m.rappels).not.toHaveBeenCalled();
  });

  it("route au mauvais secret : 401 ; au bon : les tâches tournent et rendent leur bilan", async () => {
    vi.stubEnv("TACHES_SECRET", SECRET);
    expect((await appel("Bearer autre")).status).toBe(401);
    expect(m.rappels).not.toHaveBeenCalled();
    const ok = await appel(`Bearer ${SECRET}`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(await ok.json()).toEqual({
      rappelsVeilleFinEssai: { envoyes: 2, echecs: 0 },
      avertissementsAvantSuppression: { j30: { envoyes: 0, echecs: 0 }, j7: { envoyes: 0, echecs: 0 }, membresPrevenus: 0 },
      suppressions: { supprimes: 0, reportes: 0 },
      fichiersALiberer: { liberes: 3, echecs: 0, restants: 0 },
      tracesPurgees: { effacees: 1 },
    });
    // Sans Stripe actif, la suppression reçoit `null` (elle ne supprime rien).
    expect(m.supprimer).toHaveBeenCalledWith(expect.any(Date), null);
  });

  it("offre pas lancée : rien ne se rappelle, rien ne s'avertit, rien ne se supprime ; le ménage se fait", async () => {
    vi.stubEnv("TACHES_SECRET", SECRET);
    m.lancee.v = false;
    expect(await (await appel(`Bearer ${SECRET}`)).json()).toEqual({
      offreLancee: false,
      fichiersALiberer: { liberes: 3, echecs: 0, restants: 0 },
      tracesPurgees: { effacees: 1 },
    });
    expect(m.rappels).not.toHaveBeenCalled();
    expect(m.avertir).not.toHaveBeenCalled();
    expect(m.supprimer).not.toHaveBeenCalled();
  });

  it("une tâche qui échoue n'empêche pas les suivantes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("TACHES_SECRET", SECRET);
    m.rappels.mockRejectedValue(new Error("panne"));
    const corps = await (await appel(`Bearer ${SECRET}`)).json();
    expect(corps.rappelsVeilleFinEssai).toEqual({ erreur: true });
    expect(m.avertir).toHaveBeenCalled();
    expect(m.supprimer).toHaveBeenCalled();
  });
});
