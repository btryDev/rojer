// Les fenêtres d'événements du tableau de bord (7 j, 30 j, frise) lisent les
// mêmes lignes, une fois par rendu (plan performance, lot 1) : la requête est
// bornée à la frise, l'horizon de chaque fenêtre se pose en mémoire.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { verification: { findMany: h.findMany } } }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));
vi.mock("@/lib/etablissements/marques-du-rendu", () => ({
  marquesAConfirmerDuRendu: async () => ({ parObligation: new Map(), entrepriseId: null, questions: [] }),
}));

import { listerEvenementsFenetre } from "./queries";

const NOW = new Date("2026-08-10T07:00:00Z");
const ligne = (id: string, iso: string) => ({
  id,
  obligationId: "incendie-erp-extincteurs-annuelle",
  libelleObligation: "Vérification des extincteurs",
  datePrevue: new Date(`${iso}T00:00:00.000Z`),
  statut: "planifiee",
  periodicite: "annuelle",
  archiveLe: null,
  graceJusquAu: null,
  prescriptionId: null,
  prescription: null,
  equipementId: "e1",
  equipement: { libelle: "Extincteur", batiment: null },
  salarieId: null,
  salarie: null,
  suiviDepuis: new Date("2026-01-01T00:00:00.000Z"),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  h.findMany.mockReset().mockResolvedValue([ligne("proche", "2026-08-14"), ligne("loin", "2026-08-30")]);
});
afterEach(() => vi.useRealTimers());

describe("listerEvenementsFenetre", () => {
  it("borne l'horizon en mémoire : 7 jours, puis 30", async () => {
    expect((await listerEvenementsFenetre("e1", 7)).map((e) => e.id)).toEqual(["proche"]);
    expect((await listerEvenementsFenetre("e1", 30)).map((e) => e.id)).toEqual(["proche", "loin"]);
  });

  it("une lecture bornée à la frise, la même pour toutes les fenêtres, portée au compte", async () => {
    await listerEvenementsFenetre("e1", 7);
    await listerEvenementsFenetre("e1", 30);
    const [w7, w30] = h.findMany.mock.calls.map((c) => JSON.stringify(c[0].where));
    // Même requête pour 7 et 30 jours : c'est elle que le rendu partage.
    expect(w7).toBe(w30);
    // 730 jours après le début du jour civil (10 août 2026 à Paris).
    expect(w7).toContain('"datePrevue":{"lte":"2028-08-08T22:00:00.000Z"}');
    expect(w7).toContain('"userId":"u1"');
  });

  it("refuse une fenêtre plus longue que la frise", async () => {
    await expect(listerEvenementsFenetre("e1", 731)).rejects.toThrow(/au-delà de la frise/);
  });
});
