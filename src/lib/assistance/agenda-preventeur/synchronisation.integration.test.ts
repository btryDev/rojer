// La synchronisation de l'agenda du préventeur (ADR-064) contre un VRAI
// PostgreSQL : le SQL paramétré (heures UTC, `ANY(text[])`, écritures
// conditionnelles), l'anti-rejeu sous verrou et le plafond de dégâts ne se
// voient pas avec un faux client.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `AGENDA_INTEGRATION_URL` pointe une
// base LOCALE migrée (jamais la préproduction) — en CI, `integration.yml`.
// Ses créneaux sont en 2099, ses envois datés de son lancement ; il les efface.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

const URL_BASE = process.env.AGENDA_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("synchronisation de l'agenda — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { synchroniser, PLAFOND_FERMETURES } = await import("./synchronisation");

  const H = 60 * 60 * 1000;
  const T0 = Date.parse("2099-03-02T08:00:00Z");
  const a = (heure: number) => new Date(T0 + heure * H);
  const fenetre = { depuis: a(-1), jusqua: a(24 * 60) };
  const debutDuTest = new Date();
  let tic = 0;
  // Chaque envoi est postérieur au précédent : l'anti-rejeu ne s'en mêle pas.
  const envoi = (evenements: { id: string; heure: number; duree?: number }[]) => ({
    envoyeLe: new Date(debutDuTest.getTime() + ++tic * 1000),
    fenetre,
    evenements: evenements.map((e) => ({ id: e.id, debut: a(e.heure), fin: a(e.heure + (e.duree ?? 1)) })),
  });
  const maintenant = new Date();

  const nettoyer = async () => {
    await prisma.$executeRaw`DELETE FROM "CreneauAssistance" WHERE "debut" >= '2099-01-01' AND "debut" < '2100-01-01'`;
    await prisma.$executeRaw`DELETE FROM "ImportAgenda" WHERE "recuLe" >= ${debutDuTest}`;
  };
  const creneaux = () =>
    prisma.$queryRaw<{ debut: Date; evenementAgendaId: string | null; reserve: boolean }[]>`
      SELECT "debut", "evenementAgendaId", ("reserveLe" IS NOT NULL) AS "reserve" FROM "CreneauAssistance"
      WHERE "debut" >= '2099-01-01' AND "debut" < '2100-01-01' ORDER BY "debut"`;
  const reserver = (evenementId: string) =>
    prisma.$executeRaw`UPDATE "CreneauAssistance" SET "reserveLe" = now() WHERE "evenementAgendaId" = ${evenementId}`;

  beforeEach(nettoyer);
  afterAll(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });

  it("ouvre, et le même état renvoyé ne change rien", async () => {
    const r1 = await synchroniser(envoi([{ id: "e1", heure: 2 }, { id: "e2", heure: 5 }]), maintenant);
    expect(r1.statut).toBe(200);
    expect(r1.statut === 200 && r1.corps.bilan.ouverts).toBe(2);
    expect((await creneaux()).map((c) => [c.debut.toISOString(), c.evenementAgendaId])).toEqual([
      [a(2).toISOString(), "e1"],
      [a(5).toISOString(), "e2"],
    ]);
    const r2 = await synchroniser(envoi([{ id: "e1", heure: 2 }, { id: "e2", heure: 5 }]), maintenant);
    expect(r2.statut === 200 && r2.corps.bilan).toEqual({ ouverts: 0, deplaces: 0, fermes: 0, rattaches: 0, conflits: 0 });
  });

  it("déplace et ferme les libres ; un réservé ne bouge ni ne disparaît", async () => {
    await synchroniser(envoi([{ id: "e1", heure: 2 }, { id: "e2", heure: 5 }, { id: "e3", heure: 8 }]), maintenant);
    await reserver("e3");
    const r = await synchroniser(envoi([{ id: "e1", heure: 3 }]), maintenant);
    expect(r.statut === 200 && r.corps.bilan).toEqual({ ouverts: 0, deplaces: 1, fermes: 1, rattaches: 0, conflits: 1 });
    expect(r.statut === 200 && r.corps.aCreer).toEqual([{ debut: a(8).toISOString(), fin: a(9).toISOString(), titre: "Réservé" }]);
    expect((await creneaux()).map((c) => [c.debut.toISOString(), c.reserve])).toEqual([
      [a(3).toISOString(), false],
      [a(8).toISOString(), true],
    ]);
    // L'événement recréé par l'agent se rattache au réservé.
    const r2 = await synchroniser(envoi([{ id: "e1", heure: 3 }, { id: "e3bis", heure: 8 }]), maintenant);
    expect(r2.statut === 200 && r2.corps.bilan.rattaches).toBe(1);
    expect((await creneaux()).find((c) => c.reserve)?.evenementAgendaId).toBe("e3bis");
  });

  it("refuse un rejeu, et ne garde qu'un des deux envois simultanés de même heure", async () => {
    const e = envoi([{ id: "e1", heure: 2 }]);
    const [x, y] = await Promise.all([synchroniser(e, maintenant), synchroniser(e, maintenant)]);
    expect([x.statut, y.statut].sort()).toEqual([200, 409]);
    expect(await creneaux()).toHaveLength(1);
  });

  it("refuse un envoi qui fermerait trop de créneaux, sans rien fermer", async () => {
    const nombre = PLAFOND_FERMETURES + 1;
    await synchroniser(envoi(Array.from({ length: nombre + 1 }, (_, i) => ({ id: `e${i}`, heure: 2 * i + 2 }))), maintenant);
    const r = await synchroniser(envoi([{ id: "e0", heure: 2 }]), maintenant);
    expect(r).toEqual({ statut: 422, corps: { erreur: "plafond" } });
    expect(await creneaux()).toHaveLength(nombre + 1);
  });

  it("refuse un envoi vide qui viderait l'agenda", async () => {
    await synchroniser(envoi([{ id: "e1", heure: 2 }, { id: "e2", heure: 4 }, { id: "e3", heure: 6 }]), maintenant);
    const r = await synchroniser(envoi([]), maintenant);
    expect(r.statut).toBe(422);
    expect(await creneaux()).toHaveLength(3);
  });
});
