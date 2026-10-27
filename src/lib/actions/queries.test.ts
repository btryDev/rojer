import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Compteurs du plan d'actions. Deux défauts sont couverts ici :
 *
 *  - `echeance` était comparée à `new Date()` brut. Comme la date est
 *    stockée à minuit UTC (ADR-011), une action due **aujourd'hui**
 *    basculait « en retard » dès 02:00 heure de Paris, et le retard moyen
 *    — clampé à zéro — était dilué vers le bas par ces faux retards ;
 *  - une action ouverte **sans échéance** n'était comptée nulle part :
 *    ni au calendrier (qui ne montre que du daté), ni dans les retards
 *    (qui exigent une date passée). Elle disparaissait des radars.
 *
 * ~~Ce sont les clauses envoyées à la base qui portent la règle : on les
 * inspecte directement, prisma mocké et horloge injectée.~~ [2026-10-27, plan
 * performance, lot 1 : les compteurs se calculent en mémoire sur UNE lecture
 * des actions suivies ; on éprouve ce qu'ils rendent, prisma mocké et horloge
 * injectée, et la clause de cette lecture unique.]
 */

const { prismaMock, requireUserMock } = vi.hoisted(() => ({
  prismaMock: {
    action: {
      // Plus appelé : gardé pour éprouver que les compteurs ne comptent plus
      // en base (une seule lecture).
      count: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  requireUserMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
  getOptionalUser: vi.fn(),
}));

import { compterActions, statsActionsEnRetard } from "./queries";

/** 10 août 2026, 9 h à Paris. */
const NOW = new Date("2026-08-10T07:00:00Z");
/** Minuit civil de Paris ce jour-là. */
const DEBUT_DU_JOUR = new Date("2026-08-09T22:00:00Z");
/** Date civile telle que Prisma la rend. */
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

beforeEach(() => {
  prismaMock.action.count.mockClear();
  prismaMock.action.findMany.mockClear().mockResolvedValue([]);
  requireUserMock.mockResolvedValue({ id: "user-1" });
});

/** Une action telle que la lecture des actions suivies la rend. */
const action = (o: {
  statut: string;
  echeance?: Date | null;
  leveeLe?: Date | null;
  risqueId?: string | null;
  verificationId?: string | null;
  id?: string;
  libelle?: string;
}) => ({
  id: o.id ?? "a",
  libelle: o.libelle ?? "Action",
  statut: o.statut,
  echeance: o.echeance ?? null,
  leveeLe: o.leveeLe ?? null,
  risqueId: o.risqueId === undefined ? "r1" : o.risqueId,
  verificationId: o.verificationId ?? null,
});

describe("compterActions", () => {
  it("une seule lecture, bornée au compte, levées sur trente jours civils", async () => {
    await compterActions("etab-1", NOW);
    expect(prismaMock.action.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.action.count).not.toHaveBeenCalled();
    const where = prismaMock.action.findMany.mock.calls[0][0].where;
    expect(where.etablissementId).toBe("etab-1");
    expect(where.etablissement).toEqual({ entreprise: { userId: "user-1" } });
    expect(where.OR).toEqual([
      { statut: { in: ["ouverte", "en_cours"] } },
      { statut: "levee", leveeLe: { gte: new Date("2026-07-10T22:00:00.000Z") } },
    ]);
  });

  it("borne le retard au début du jour civil, pas à l'heure courante", async () => {
    prismaMock.action.findMany.mockResolvedValue([
      // Due aujourd'hui (minuit UTC = 02:00 à Paris) : pas en retard.
      action({ statut: "ouverte", echeance: jour("2026-08-10") }),
      action({ statut: "ouverte", echeance: jour("2026-08-09") }),
    ]);
    expect((await compterActions("etab-1", NOW)).enRetard).toBe(1);
    expect(jour("2026-08-10").getTime()).toBeGreaterThan(DEBUT_DU_JOUR.getTime());
  });

  it("dénombre les actions ouvertes sans échéance", async () => {
    prismaMock.action.findMany.mockResolvedValue([
      action({ statut: "ouverte" }),
      action({ statut: "en_cours" }),
      action({ statut: "ouverte", echeance: jour("2026-09-01") }),
    ]);
    const c = await compterActions("etab-1", NOW);
    expect(c.sansEcheance).toBe(2);
    expect(c.totalACouvrir).toBe(3);
  });

  it("filtre par origine sur la même lecture", async () => {
    prismaMock.action.findMany.mockResolvedValue([
      action({ statut: "ouverte", risqueId: "r1" }),
      action({ statut: "ouverte", risqueId: null, verificationId: "v1" }),
    ]);
    expect((await compterActions("etab-1", NOW, { origine: "duerp" })).ouvertes).toBe(1);
    expect((await compterActions("etab-1", NOW, { origine: "verification" })).ouvertes).toBe(1);
    expect((await compterActions("etab-1", NOW)).ouvertes).toBe(2);
  });

  it("compte les levées des trente derniers jours civils seulement", async () => {
    prismaMock.action.findMany.mockResolvedValue([
      action({ statut: "levee", leveeLe: new Date("2026-07-11T08:00:00Z") }),
      action({ statut: "levee", leveeLe: new Date("2026-07-09T08:00:00Z") }),
    ]);
    expect((await compterActions("etab-1", NOW)).leveesRecemment).toBe(1);
  });
});

describe("statsActionsEnRetard", () => {
  it("ne retient rien quand aucune échéance n'est dépassée", async () => {
    expect(await statsActionsEnRetard("etab-1", NOW)).toEqual({
      nb: 0,
      retardMoyenJours: 0,
      plusAncienne: null,
    });
  });

  it("exclut les actions dues aujourd'hui et celles closes", async () => {
    prismaMock.action.findMany.mockResolvedValue([
      action({ statut: "ouverte", echeance: jour("2026-08-10") }),
      action({ statut: "levee", echeance: jour("2026-08-01"), leveeLe: jour("2026-08-05") }),
    ]);
    expect((await statsActionsEnRetard("etab-1", NOW)).nb).toBe(0);
  });

  it("compte le retard en jours civils — la veille vaut 1, jamais 0", async () => {
    prismaMock.action.findMany.mockResolvedValue([
      action({ id: "a1", libelle: "Remplacer l'extincteur", statut: "ouverte", echeance: jour("2026-08-09") }),
    ]);
    const stats = await statsActionsEnRetard("etab-1", NOW);
    expect(stats.nb).toBe(1);
    expect(stats.retardMoyenJours).toBe(1);
    expect(stats.plusAncienne).toEqual({
      id: "a1",
      libelle: "Remplacer l'extincteur",
      joursRetard: 1,
    });
  });

  it("moyenne les retards sans les diluer par des zéros", async () => {
    prismaMock.action.findMany.mockResolvedValue([
      // Dans le désordre : la plus ancienne est retrouvée par tri.
      action({ id: "a2", libelle: "Récente", statut: "en_cours", echeance: jour("2026-08-08") }),
      action({ id: "a1", libelle: "Ancienne", statut: "ouverte", echeance: jour("2026-06-11") }),
    ]);
    const stats = await statsActionsEnRetard("etab-1", NOW);
    // 60 jours et 2 jours → 31 en moyenne.
    expect(stats.retardMoyenJours).toBe(31);
    expect(stats.plusAncienne?.joursRetard).toBe(60);
  });
});
