// Les créneaux du rendez-vous annuel (ADR-063) contre un VRAI PostgreSQL : le
// SQL de `creneaux.ts` — que les tests unitaires remplacent par des doubles —
// tient ses trois promesses. Un créneau libre ne se prend qu'une fois, même par
// deux transactions concurrentes ; seuls les créneaux de la fenêtre se lisent
// et se prennent (bornes comprises au début, exclues à la fin) ; un créneau
// rendu redevient libre.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `RENDEZ_VOUS_INTEGRATION_URL` pointe
// une base LOCALE migrée. Il n'efface que ses propres créneaux (année 2031).

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const URL_BASE = process.env.RENDEZ_VOUS_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("créneaux du rendez-vous annuel — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { creneauEstPris, creneauxLibres, prendreLeCreneau, rendreLeCreneau } = await import("./creneaux");

  const d = (iso: string) => new Date(iso);
  const DEPUIS = d("2031-03-10T09:00:00Z");
  const JUSQUA = d("2031-04-10T09:00:00Z");
  const FENETRE = { depuis: DEPUIS, jusqua: JUSQUA };
  const heure = (debut: Date) => new Date(debut.getTime() + 3_600_000);
  const ANNEE_2031 = { gte: d("2031-01-01T00:00:00Z"), lt: d("2032-01-01T00:00:00Z") };

  async function ouvrir(debut: Date, reserveLe: Date | null = null): Promise<string> {
    const c = await prisma.creneauAssistance.create({ data: { debut, fin: heure(debut), reserveLe }, select: { id: true } });
    return c.id;
  }
  const menage = () => prisma.creneauAssistance.deleteMany({ where: { debut: ANNEE_2031 } });

  beforeEach(menage);
  afterAll(async () => {
    await menage();
    await prisma.$disconnect();
  });

  it("ne lit que les créneaux libres de la fenêtre, début compris, fin exclue, dans l'ordre", async () => {
    await ouvrir(d("2031-03-10T08:59:59Z")); // juste avant
    const auDebut = await ouvrir(DEPUIS);
    const dedans = await ouvrir(d("2031-03-20T09:00:00Z"));
    await ouvrir(d("2031-03-21T09:00:00Z"), d("2031-03-01T00:00:00Z")); // déjà pris
    await ouvrir(JUSQUA); // à la fin : exclu
    const libres = await creneauxLibres(prisma, FENETRE);
    expect(libres.map((c) => c.id)).toEqual([auDebut, dedans]);
    expect(libres[0].debut).toEqual(DEPUIS);
  });

  it("un créneau se prend une fois : le second preneur reçoit `null`, et le créneau se dit pris", async () => {
    const id = await ouvrir(d("2031-03-20T09:00:00Z"));
    const premier = await prisma.$transaction((tx) => prendreLeCreneau(tx, id, FENETRE));
    expect(premier).toEqual({ id, debut: d("2031-03-20T09:00:00Z"), fin: d("2031-03-20T10:00:00Z") });
    expect(await prisma.$transaction((tx) => prendreLeCreneau(tx, id, FENETRE))).toBeNull();
    expect(await prisma.$transaction((tx) => creneauEstPris(tx, id))).toBe(true);
    expect(await creneauxLibres(prisma, FENETRE)).toEqual([]);
  });

  it("deux transactions concurrentes sur le même créneau : une seule le prend", async () => {
    const id = await ouvrir(d("2031-03-20T09:00:00Z"));
    const prises = await Promise.all(
      [0, 1].map(() =>
        prisma.$transaction(async (tx) => {
          const c = await prendreLeCreneau(tx, id, FENETRE);
          // Tient la transaction ouverte : l'autre attend le verrou de la ligne.
          await new Promise((r) => setTimeout(r, 100));
          return c;
        }),
      ),
    );
    expect(prises.filter(Boolean)).toHaveLength(1);
  });

  it("hors de la fenêtre, rien ne se prend : un créneau libre mais trop proche, ou trop loin", async () => {
    const tropTot = await ouvrir(d("2031-03-10T08:00:00Z"));
    const tropTard = await ouvrir(JUSQUA);
    for (const id of [tropTot, tropTard]) {
      expect(await prisma.$transaction((tx) => prendreLeCreneau(tx, id, FENETRE))).toBeNull();
      expect(await prisma.$transaction((tx) => creneauEstPris(tx, id))).toBe(false);
    }
  });

  it("un créneau inconnu : ni pris ni prenable", async () => {
    const inconnu = "00000000-0000-4000-8000-00000000c0de";
    expect(await prisma.$transaction((tx) => prendreLeCreneau(tx, inconnu, FENETRE))).toBeNull();
    expect(await prisma.$transaction((tx) => creneauEstPris(tx, inconnu))).toBeNull();
  });

  it("un créneau rendu redevient libre, et se reprend", async () => {
    const id = await ouvrir(d("2031-03-20T09:00:00Z"));
    await prisma.$transaction((tx) => prendreLeCreneau(tx, id, FENETRE));
    await prisma.$transaction((tx) => rendreLeCreneau(tx, id));
    expect((await creneauxLibres(prisma, FENETRE)).map((c) => c.id)).toEqual([id]);
    expect(await prisma.$transaction((tx) => prendreLeCreneau(tx, id, FENETRE))).not.toBeNull();
  });
});
