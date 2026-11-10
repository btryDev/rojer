import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  rappels: vi.fn(),
  renouvellement: vi.fn(),
  avertir: vi.fn(),
  supprimer: vi.fn(),
  fichiers: vi.fn(),
  traces: vi.fn(),
  lancee: { v: true },
  prendreLeJour: vi.fn(),
  terminerLeJour: vi.fn(),
  file: vi.fn(),
  apres: [] as (() => Promise<unknown>)[],
}));
vi.mock("next/server", () => ({ after: (f: () => Promise<unknown>) => m.apres.push(f) }));
vi.mock("./jour", () => ({ prendreLeJour: m.prendreLeJour, terminerLeJour: m.terminerLeJour }));
vi.mock("@/lib/stripe/traitement", () => ({ traiterLaFileIci: m.file, etatDeLaFile: vi.fn() }));
vi.mock("@/lib/stripe/rapprochement", () => ({ rapprocher: vi.fn() }));
vi.mock("@/lib/stripe/evenements", () => ({ oublierLesAnciens: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/alertes", () => ({ alerter: vi.fn() }));
vi.mock("@/lib/abonnements/lancement", () => ({ contexteDroits: () => ({}), offreLancee: () => m.lancee.v }));
vi.mock("@/lib/abonnements/rappels", () => ({ rappelerLaVeilleDeLaFinDEssai: m.rappels, rappelerLeRenouvellementAnnuel: m.renouvellement }));
vi.mock("@/lib/abonnements/suppression", () => ({
  avertirAvantSuppression: m.avertir,
  supprimerComptesEchus: m.supprimer,
  libererFichiersEnAttente: m.fichiers,
  purgerTracesEchues: m.traces,
}));
vi.mock("@/lib/stripe/config", () => ({ configurationStripe: () => ({ active: false }) }));
vi.mock("@/lib/stripe/client", () => ({ clientStripe: vi.fn(), clientStripeWebhook: vi.fn() }));

import { appelAutorise, lancerTachesDuJour, lancerTachesQuotidiennes, secretDesTaches } from "./quotidiennes";
import { POST } from "@/app/api/taches/chaque-minute/route";

const SECRET = "s".repeat(40);
const appel = (entete?: string) =>
  POST(new Request("https://rojer.test/api/taches/chaque-minute", { method: "POST", headers: entete ? { authorization: entete } : {} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  m.lancee.v = true;
  m.rappels.mockResolvedValue({ envoyes: 2, echecs: 0 });
  m.renouvellement.mockResolvedValue({ envoyes: 1, echecs: 0 });
  m.avertir.mockResolvedValue({ j30: { envoyes: 0, echecs: 0 }, j7: { envoyes: 0, echecs: 0 }, membresPrevenus: 0 });
  m.supprimer.mockResolvedValue({ supprimes: 0, reportes: 0 });
  m.fichiers.mockResolvedValue({ liberes: 3, echecs: 0, restants: 0 });
  m.traces.mockResolvedValue({ effacees: 1 });
  m.apres.length = 0;
  m.prendreLeJour.mockResolvedValue(7);
  m.terminerLeJour.mockResolvedValue(true);
});

/** Un instant de Paris, l'hiver (UTC+1). */
const aParis = (heure: number) => new Date(Date.UTC(2026, 10, 10, heure - 1, 30));

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

  it("route au mauvais secret : 401 ; au bon : 202 tout de suite, le travail suit la réponse", async () => {
    vi.stubEnv("TACHES_SECRET", SECRET);
    expect((await appel("Bearer autre")).status).toBe(401);
    expect(m.apres).toHaveLength(0);
    const ok = await appel(`Bearer ${SECRET}`);
    expect(ok.status).toBe(202);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(m.apres).toHaveLength(1);
    expect(m.rappels).not.toHaveBeenCalled();
  });

  it("le bilan des tâches du jour", async () => {
    expect(await lancerTachesQuotidiennes(aParis(9))).toEqual({
      rappelsVeilleFinEssai: { envoyes: 2, echecs: 0 },
      rappelsRenouvellementAnnuel: { envoyes: 1, echecs: 0 },
      avertissementsAvantSuppression: { j30: { envoyes: 0, echecs: 0 }, j7: { envoyes: 0, echecs: 0 }, membresPrevenus: 0 },
      suppressions: { supprimes: 0, reportes: 0 },
      fichiersALiberer: { liberes: 3, echecs: 0, restants: 0 },
      tracesPurgees: { effacees: 1 },
      evenementsOublies: undefined,
    });
    // Sans Stripe actif, la suppression reçoit `null` (elle ne supprime rien).
    expect(m.supprimer).toHaveBeenCalledWith(expect.any(Date), null);
  });

  it("une fois par jour civil de Paris, dès 9 h : avant, rien ; déjà prise, rien ; sinon lancée puis marquée finie", async () => {
    expect(await lancerTachesDuJour(aParis(8))).toEqual({ etat: "pas-encore" });
    expect(m.prendreLeJour).not.toHaveBeenCalled();

    m.prendreLeJour.mockResolvedValueOnce(null);
    expect(await lancerTachesDuJour(aParis(9))).toEqual({ etat: "en-cours-ailleurs", jour: "2026-11-10" });
    expect(m.rappels).not.toHaveBeenCalled();

    vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await lancerTachesDuJour(aParis(15))).toMatchObject({ etat: "faite", jour: "2026-11-10" });
    expect(m.prendreLeJour).toHaveBeenLastCalledWith("2026-11-10", aParis(15));
    expect(m.terminerLeJour).toHaveBeenCalledWith("2026-11-10", 7, expect.any(Date), expect.objectContaining({ suppressions: expect.anything() }));
    // Fini ici : les minutes suivantes du même jour ne touchent plus la base.
    m.prendreLeJour.mockClear();
    expect(await lancerTachesDuJour(aParis(16))).toEqual({ etat: "deja-faite", jour: "2026-11-10" });
    expect(m.prendreLeJour).not.toHaveBeenCalled();
  });

  it("offre pas lancée : rien ne se rappelle, rien ne s'avertit, rien ne se supprime ; le ménage se fait", async () => {
    m.lancee.v = false;
    expect(await lancerTachesQuotidiennes(aParis(9))).toEqual({
      offreLancee: false,
      fichiersALiberer: { liberes: 3, echecs: 0, restants: 0 },
      tracesPurgees: { effacees: 1 },
      evenementsOublies: undefined,
    });
    expect(m.rappels).not.toHaveBeenCalled();
    expect(m.renouvellement).not.toHaveBeenCalled();
    expect(m.avertir).not.toHaveBeenCalled();
    expect(m.supprimer).not.toHaveBeenCalled();
  });

  it("une tâche qui échoue n'empêche pas les suivantes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.rappels.mockRejectedValue(new Error("panne"));
    const bilan = await lancerTachesQuotidiennes(aParis(9));
    expect(bilan).toMatchObject({ rappelsVeilleFinEssai: { erreur: true } });
    expect(m.avertir).toHaveBeenCalled();
    expect(m.supprimer).toHaveBeenCalled();
  });
});
