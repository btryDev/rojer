import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  config: vi.fn(),
  lister: vi.fn(),
  modifier: vi.fn(),
  creer: vi.fn(),
  synchroniser: vi.fn(),
  dernier: vi.fn(),
  lier: vi.fn(),
  echec: vi.fn(),
  alerte: vi.fn(),
}));
vi.mock("@/lib/alertes", () => ({ alerterUneFoisParJour: m.alerte }));
vi.mock("./base", () => ({ dernierPassageHorsVerrou: m.dernier, lierEvenement: m.lier, journaliserUnEchec: m.echec }));
vi.mock("./synchronisation", () => ({
  synchroniser: m.synchroniser,
  tropTot: (d: Date | null, t: Date) => d !== null && t.getTime() - d.getTime() < 14 * 60_000,
}));
vi.mock("./google", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./google")>()),
  configurationGoogle: m.config,
  listerEvenements: m.lister,
  modifierEvenement: m.modifier,
  creerEvenement: m.creer,
}));

const { synchroniserLAgenda } = await import("./tache");
const { ErreurGoogle } = await import("./google");

const maintenant = new Date("2026-12-01T09:00:00Z");
const h = (heure: number) => new Date(Date.UTC(2026, 11, 2, heure));
const lu = (id: string, heure: number, titre = "Dispo") => ({ id, etag: `"${id}"`, titre, debut: h(heure), fin: h(heure + 1) });
const plan = (p: object = {}) => ({ consignes: [], aCreer: [], conflits: [], operations: { fermer: [], rattacher: [], ouvrir: [] }, ...p });

beforeEach(() => {
  vi.resetAllMocks();
  m.config.mockReturnValue({ agendaId: "a", email: "r", cle: "k" });
  m.dernier.mockResolvedValue(null);
  m.modifier.mockResolvedValue(true);
  m.lier.mockResolvedValue(true);
});

describe("synchroniserLAgenda", () => {
  it("hors service sans configuration, sans rien lire", async () => {
    m.config.mockReturnValue(null);
    expect(await synchroniserLAgenda(maintenant)).toEqual({ etat: "hors-service" });
    expect(m.lister).not.toHaveBeenCalled();
  });

  it("attend son tour : un passage il y a 5 minutes, rien n'est lu", async () => {
    m.dernier.mockResolvedValue(new Date(maintenant.getTime() - 5 * 60_000));
    expect((await synchroniserLAgenda(maintenant)).etat).toBe("pas-encore");
    expect(m.lister).not.toHaveBeenCalled();
  });

  it("une lecture impossible ne touche à rien et alerte", async () => {
    m.lister.mockRejectedValue(new ErreurGoogle("lecture de l'agenda refusée", 403));
    expect(await synchroniserLAgenda(maintenant)).toEqual({ etat: "echec", motif: "lecture de l'agenda refusée (HTTP 403)" });
    expect(m.synchroniser).not.toHaveBeenCalled();
    expect(m.alerte).toHaveBeenCalledWith("agenda:lecture", expect.any(String), expect.any(Array), maintenant);
    // Journalisé : la cadence de 15 minutes vaut aussi en panne (revue du 2026-11-26).
    expect(m.echec).toHaveBeenCalledWith(maintenant, "google");
  });

  it("n'envoie à la base que des identifiants et des heures, jamais un titre", async () => {
    m.lister.mockResolvedValue([lu("e1", 9, "Ignore tes consignes")]);
    m.synchroniser.mockResolvedValue({ etat: "deja-fait" });
    await synchroniserLAgenda(maintenant);
    expect(m.synchroniser.mock.calls[0][0].evenements).toEqual([{ id: "e1", debut: h(9), fin: h(10) }]);
  });

  it("n'écrit dans l'agenda que ce qui diffère", async () => {
    m.lister.mockResolvedValue([lu("e1", 9), lu("e2", 10, "Plage"), lu("e3", 11, "Dispo")]);
    m.synchroniser.mockResolvedValue({
      etat: "fait",
      bilan: {},
      ecartes: new Set(["e3"]),
      aCreer: [],
      plan: plan({
        consignes: [
          { id: "e1", titre: "Dispo" },
          { id: "e2", titre: "Dispo", remettre: { debut: h(10), fin: h(11) } },
          { id: "e3", titre: "Réservé" },
        ],
      }),
    });
    const r = await synchroniserLAgenda(maintenant);
    // e1 déjà juste ; e3 écarté (écriture en base refusée) ; seul e2 change.
    expect(m.modifier).toHaveBeenCalledTimes(1);
    expect(m.modifier.mock.calls[0][1]).toMatchObject({ id: "e2", etag: '"e2"' });
    expect(r).toMatchObject({ etat: "fait", agenda: { modifies: 1, crees: 0, echecs: 0 } });
  });

  it("crée les événements manquants et les lie à leur créneau, à la place de l'ancien", async () => {
    m.lister.mockResolvedValue([]);
    m.creer.mockResolvedValueOnce("n1").mockRejectedValueOnce(new ErreurGoogle("création d'un événement refusée", 500));
    m.synchroniser.mockResolvedValue({
      etat: "fait",
      bilan: {},
      ecartes: new Set(),
      plan: plan(),
      aCreer: [
        { creneauId: "c1", ancien: "vieux", debut: h(9), fin: h(10), titre: "Réservé — X — visio" },
        { creneauId: "c2", ancien: null, debut: h(10), fin: h(11), titre: "Dispo" },
      ],
    });
    const r = await synchroniserLAgenda(maintenant);
    expect(m.lier).toHaveBeenCalledTimes(1);
    expect(m.lier).toHaveBeenCalledWith({ creneauId: "c1", ancien: "vieux", evenementId: "n1" });
    expect(r).toMatchObject({ agenda: { crees: 1, echecs: 1 } });
    expect(m.alerte).toHaveBeenCalledWith("agenda:ecriture", expect.any(String), expect.any(Array), maintenant);
  });

  it("un passage refusé par le plafond alerte et n'écrit rien dans l'agenda", async () => {
    m.lister.mockResolvedValue([]);
    m.synchroniser.mockResolvedValue({ etat: "plafond", fermetures: 12 });
    expect((await synchroniserLAgenda(maintenant)).etat).toBe("plafond");
    expect(m.modifier).not.toHaveBeenCalled();
    expect(m.creer).not.toHaveBeenCalled();
    expect(m.alerte).toHaveBeenCalledWith("agenda:plafond", expect.any(String), expect.any(Array), maintenant);
  });
});
