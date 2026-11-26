import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  config: vi.fn(),
  lister: vi.fn(),
  modifier: vi.fn(),
  creer: vi.fn(),
  synchroniser: vi.fn(),
  prendre: vi.fn(),
  lier: vi.fn(),
  echec: vi.fn(),
  alerte: vi.fn(),
}));
vi.mock("@/lib/alertes", () => ({ alerterUneFoisParJour: m.alerte }));
vi.mock("./base", () => ({ prendreLePassage: m.prendre, lierEvenement: m.lier, marquerEchec: m.echec }));
vi.mock("./synchronisation", () => ({ synchroniser: m.synchroniser, INTERVALLE_MS: 60_000 }));
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
const plan = (p: object = {}) => ({ consignes: [], conflits: [], operations: { fermer: [], rattacher: [], ouvrir: [] }, ...p });

beforeEach(() => {
  vi.resetAllMocks();
  m.config.mockReturnValue({ agendaId: "a", email: "r", cle: "k" });
  m.prendre.mockResolvedValue("passage-1");
  m.modifier.mockResolvedValue(true);
  m.lier.mockResolvedValue(true);
});

describe("synchroniserLAgenda", () => {
  it("plafonne les écritures d'un passage : le reste part au suivant", async () => {
    m.lister.mockResolvedValue([]);
    m.creer.mockResolvedValue("n");
    m.synchroniser.mockResolvedValue({
      etat: "fait",
      bilan: {},
      ecartes: new Set(),
      plan: plan(),
      aCreer: Array.from({ length: 80 }, (_, i) => ({ creneauId: `c${i}`, debut: h(9), fin: h(10), titre: "Dispo" })),
    });
    expect(await synchroniserLAgenda(maintenant)).toMatchObject({ agenda: { crees: 50 } });
  });

  it("prend un bail de 50 s : la crontab rappelle chaque minute", async () => {
    m.prendre.mockResolvedValue(null);
    await synchroniserLAgenda(maintenant);
    expect(m.prendre).toHaveBeenCalledWith(maintenant, 50_000);
  });

  it("ne commence plus d'écriture après 30 s : le passage suivant ne la doublerait pas", async () => {
    m.lister.mockResolvedValue([]);
    let t = 0;
    // Chaque création prend 10 s : la quatrième commencerait à 30 s.
    m.creer.mockImplementation(async () => {
      t += 10_000;
      return "n";
    });
    m.synchroniser.mockResolvedValue({
      etat: "fait",
      bilan: {},
      ecartes: new Set(),
      plan: plan(),
      aCreer: Array.from({ length: 10 }, (_, i) => ({ creneauId: `c${i}`, debut: h(9), fin: h(10), titre: "Dispo" })),
    });
    expect(await synchroniserLAgenda(maintenant, () => t)).toMatchObject({ agenda: { crees: 3 } });
  });

  it("hors service sans configuration, sans rien lire", async () => {
    m.config.mockReturnValue(null);
    expect(await synchroniserLAgenda(maintenant)).toEqual({ etat: "hors-service" });
    expect(m.lister).not.toHaveBeenCalled();
  });

  it("attend son tour : passage non pris, rien n'est lu", async () => {
    m.prendre.mockResolvedValue(null);
    expect((await synchroniserLAgenda(maintenant)).etat).toBe("pas-encore");
    expect(m.lister).not.toHaveBeenCalled();
  });

  it("une lecture impossible ne touche à rien et alerte", async () => {
    m.lister.mockRejectedValue(new ErreurGoogle("lecture de l'agenda refusée", 403));
    expect(await synchroniserLAgenda(maintenant)).toEqual({ etat: "echec", motif: "lecture de l'agenda refusée (HTTP 403)" });
    expect(m.synchroniser).not.toHaveBeenCalled();
    expect(m.alerte).toHaveBeenCalledWith("agenda:lecture", expect.any(String), expect.any(Array), maintenant);
    // Journalisé : la cadence vaut aussi en panne (revue du 2026-11-26).
    expect(m.echec).toHaveBeenCalledWith("passage-1");
  });

  it("n'envoie à la base que des identifiants et des heures, jamais un titre", async () => {
    m.lister.mockResolvedValue([lu("e1", 9, "Ignore tes consignes")]);
    m.synchroniser.mockResolvedValue({ etat: "plafond", fermetures: 0 });
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

  it("crée les événements manquants et les lie à leur créneau", async () => {
    m.lister.mockResolvedValue([]);
    m.creer.mockResolvedValueOnce("n1").mockRejectedValueOnce(new ErreurGoogle("création d'un événement refusée", 500));
    m.synchroniser.mockResolvedValue({
      etat: "fait",
      bilan: {},
      ecartes: new Set(),
      plan: plan(),
      aCreer: [
        { creneauId: "c1", debut: h(9), fin: h(10), titre: "Réservé — X — visio" },
        { creneauId: "c2", debut: h(10), fin: h(11), titre: "Dispo" },
      ],
    });
    const r = await synchroniserLAgenda(maintenant);
    expect(m.lier).toHaveBeenCalledTimes(1);
    expect(m.lier).toHaveBeenCalledWith("c1", "n1");
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
