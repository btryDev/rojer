// La réconciliation appliquée en base (ADR-064) contre un VRAI PostgreSQL : le
// SQL paramétré (heures UTC, `ANY(text[])`, écritures conditionnelles), la
// cadence sous verrou et le plafond de dégâts ne se voient pas avec un faux
// client.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `AGENDA_INTEGRATION_URL` pointe une
// base LOCALE migrée — en CI, `integration.yml`. Ses créneaux sont en 2099 ;
// il efface ses créneaux et le journal qu'il a écrit.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

const URL_BASE = process.env.AGENDA_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("synchronisation de l'agenda — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { synchroniser, PLAFOND_FERMETURES, INTERVALLE_MS } = await import("./synchronisation");

  const H = 60 * 60 * 1000;
  const T0 = Date.parse("2099-03-02T08:00:00Z");
  const a = (heure: number) => new Date(T0 + heure * H);
  const fenetre = { depuis: a(-1), jusqua: a(24 * 60) };
  const debutDuTest = new Date();
  // Chaque passage est espacé du précédent d'un intervalle : la cadence ne s'en mêle pas.
  let tic = 0;
  const passage = (evenements: { id: string; heure: number; duree?: number }[]) =>
    synchroniser(
      { fenetre, evenements: evenements.map((e) => ({ id: e.id, debut: a(e.heure), fin: a(e.heure + (e.duree ?? 1)) })) },
      new Date(debutDuTest.getTime() + ++tic * INTERVALLE_MS),
    );

  const nettoyer = async () => {
    await prisma.$executeRaw`DELETE FROM "CreneauAssistance" WHERE "debut" >= '2099-01-01' AND "debut" < '2100-01-01'`;
    await prisma.$executeRaw`DELETE FROM "ImportAgenda" WHERE "recuLe" >= ${debutDuTest}`;
  };
  const creneaux = () =>
    prisma.$queryRaw<{ id: string; debut: Date; evenementAgendaId: string | null; reserve: boolean }[]>`
      SELECT "id", "debut", "evenementAgendaId", ("reserveLe" IS NOT NULL) AS "reserve" FROM "CreneauAssistance"
      WHERE "debut" >= '2099-01-01' AND "debut" < '2100-01-01' ORDER BY "debut"`;
  const reserver = (evenementId: string) =>
    prisma.$executeRaw`UPDATE "CreneauAssistance" SET "reserveLe" = now() WHERE "evenementAgendaId" = ${evenementId}`;

  beforeEach(nettoyer);
  afterAll(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });

  it("ouvre, et le même état relu ne change rien", async () => {
    const r1 = await passage([{ id: "e1", heure: 2 }, { id: "e2", heure: 5 }]);
    expect(r1.etat === "fait" && r1.bilan.ouverts).toBe(2);
    const r2 = await passage([{ id: "e1", heure: 2 }, { id: "e2", heure: 5 }]);
    expect(r2.etat === "fait" && r2.bilan).toEqual({ ouverts: 0, deplaces: 0, fermes: 0, rattaches: 0, conflits: 0 });
    expect(r2.etat === "fait" && r2.aCreer).toEqual([]);
  });

  it("une plage découpée : les heures suivantes sont à créer, puis se lient", async () => {
    const r = await passage([{ id: "e1", heure: 2, duree: 3 }]);
    expect(r.etat === "fait" && r.aCreer.map((c) => [c.debut.toISOString(), c.ancien, c.titre])).toEqual([
      [a(3).toISOString(), null, "Dispo"],
      [a(4).toISOString(), null, "Dispo"],
    ]);
    expect((await creneaux()).map((c) => c.evenementAgendaId)).toEqual(["e1", null, null]);
  });

  it("deux libres échangent leurs heures en un passage, sous de nouveaux identifiants", async () => {
    await passage([{ id: "e1", heure: 2 }, { id: "e2", heure: 3 }]);
    const avant = (await creneaux()).map((c) => c.id);
    const r = await passage([{ id: "e1", heure: 3 }, { id: "e2", heure: 2 }]);
    expect(r.etat === "fait" && r.bilan.deplaces).toBe(2);
    const apres = await creneaux();
    expect(apres.map((c) => [c.debut.toISOString(), c.evenementAgendaId])).toEqual([
      [a(2).toISOString(), "e2"],
      [a(3).toISOString(), "e1"],
    ]);
    // Un client qui avait choisi l'ancien créneau ne le prend plus : son identifiant n'existe plus.
    expect(apres.some((c) => avant.includes(c.id))).toBe(false);
  });

  it("un réservé ne bouge ni ne disparaît ; supprimé de l'agenda, il est à recréer à la place de l'ancien", async () => {
    await passage([{ id: "e1", heure: 2 }, { id: "e2", heure: 5 }, { id: "e3", heure: 8 }]);
    await reserver("e3");
    const r = await passage([{ id: "e1", heure: 3 }]);
    expect(r.etat === "fait" && r.bilan).toEqual({ ouverts: 0, deplaces: 1, fermes: 1, rattaches: 0, conflits: 1 });
    expect(r.etat === "fait" && r.aCreer.map((c) => [c.debut.toISOString(), c.ancien])).toEqual([[a(8).toISOString(), "e3"]]);
    expect((await creneaux()).map((c) => [c.debut.toISOString(), c.reserve])).toEqual([
      [a(3).toISOString(), false],
      [a(8).toISOString(), true],
    ]);
  });

  it("deux passages à la même minute : un seul fait le travail", async () => {
    const lecture = { fenetre, evenements: [{ id: "e1", debut: a(2), fin: a(3) }] };
    const maintenant = new Date(debutDuTest.getTime() + 999 * INTERVALLE_MS);
    const [x, y] = await Promise.all([synchroniser(lecture, maintenant), synchroniser(lecture, maintenant)]);
    expect([x.etat, y.etat].sort()).toEqual(["deja-fait", "fait"]);
    expect(await creneaux()).toHaveLength(1);
  });

  it("refuse un passage qui fermerait trop de créneaux, sans rien fermer", async () => {
    const nombre = PLAFOND_FERMETURES + 1;
    await passage(Array.from({ length: nombre + 1 }, (_, i) => ({ id: `e${i}`, heure: 2 * i + 2 })));
    const r = await passage([{ id: "e0", heure: 2 }]);
    expect(r).toEqual({ etat: "plafond", fermetures: nombre });
    expect(await creneaux()).toHaveLength(nombre + 1);
  });

  it("refuse un agenda vide qui viderait les créneaux", async () => {
    await passage([{ id: "e1", heure: 2 }, { id: "e2", heure: 4 }, { id: "e3", heure: 6 }]);
    expect((await passage([])).etat).toBe("plafond");
    expect(await creneaux()).toHaveLength(3);
  });
});
