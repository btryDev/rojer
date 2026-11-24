import { beforeEach, describe, expect, it, vi } from "vitest";

// ADR-063 § 7 : la tâche quotidienne annule le rendez-vous à venir d'un
// compte sorti de la formule Pro, rend son créneau, prévient les deux côtés.

const h = vi.hoisted(() => ({
  aVenir: vi.fn(),
  relire: vi.fn(),
  annuler: vi.fn(async () => ({ count: 1 })),
  verrou: vi.fn(async () => {}),
  rendre: vi.fn(async () => {}),
  sendMail: vi.fn(async () => {}),
}));

const tx = { rendezVousAssistance: { findFirst: h.relire, updateMany: h.annuler } };
vi.mock("@/lib/prisma", () => ({
  prisma: {
    rendezVousAssistance: { findMany: h.aVenir },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  },
}));
vi.mock("@/lib/abonnements/quotas", () => ({ verrouillerLeCompte: h.verrou }));
vi.mock("./creneaux", () => ({ rendreLeCreneau: h.rendre }));
vi.mock("@/lib/contact/message", () => ({ CONTACT: "contact@rojer.test" }));
vi.mock("@/lib/email", () => ({
  sendMail: h.sendMail,
  envoiEnService: () => true,
  publicAppUrl: () => "https://rojer.test",
  motifErreur: (e: unknown) => String(e),
}));

const { annulerRendezVousHorsPro } = await import("./hors-pro");

const MAINTENANT = new Date("2026-11-24T05:00:00Z");
const DEBUT = new Date("2026-12-03T09:00:00Z");
const FIN = new Date("2026-12-03T10:00:00Z");
const rdv = (id: string, abonnement: { statut: string; formule: string } | null) => ({
  id,
  compteId: `c-${id}`,
  creneauId: `k-${id}`,
  debut: DEBUT,
  fin: FIN,
  mode: "visio",
  telephone: null,
  sujet: null,
  user: { name: "Marie Durand", email: "m.durand@example.fr" },
  compte: { abonnement },
});

beforeEach(() => {
  vi.clearAllMocks();
  h.relire.mockImplementation(async ({ where }: { where: { id: string } }) => ({
    creneauId: `k-${where.id}`,
    debut: DEBUT,
    fin: FIN,
    mode: "visio",
    telephone: null,
    sujet: null,
  }));
});

describe("annulerRendezVousHorsPro", () => {
  it("sous le verrou du compte, annule, rend le créneau relu, prévient l'équipe et la personne", async () => {
    h.aVenir.mockResolvedValue([rdv("r1", { statut: "active", formule: "rojer_essentiel_annuel" })]);
    expect(await annulerRendezVousHorsPro(MAINTENANT)).toEqual({ annules: 1 });
    expect(h.verrou).toHaveBeenCalledWith(tx, "c-r1");
    expect(h.annuler).toHaveBeenCalledWith({ where: { id: "r1", annuleLe: null }, data: { annuleLe: MAINTENANT } });
    expect(h.rendre).toHaveBeenCalledWith(tx, "k-r1");
    const envois = h.sendMail.mock.calls.map((c) => (c as unknown as [Record<string, string>])[0]);
    expect(envois.map((e) => e.to)).toEqual(["contact@rojer.test", "m.durand@example.fr"]);
    expect(envois[1].text).toContain("Votre formule Pro a pris fin");
  });

  it("laisse un compte en Pro, impayé compris", async () => {
    h.aVenir.mockResolvedValue([
      rdv("r1", { statut: "active", formule: "rojer_pro_annuel" }),
      rdv("r2", { statut: "past_due", formule: "rojer_pro_mensuel" }),
    ]);
    expect(await annulerRendezVousHorsPro(MAINTENANT)).toEqual({ annules: 0 });
    expect(h.annuler).not.toHaveBeenCalled();
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("un rendez-vous annulé ou déplacé entre-temps : relu sous le verrou, il ne l'est pas deux fois", async () => {
    h.aVenir.mockResolvedValue([rdv("r1", null)]);
    h.relire.mockResolvedValue(null);
    expect(await annulerRendezVousHorsPro(MAINTENANT)).toEqual({ annules: 0 });
    expect(h.annuler).not.toHaveBeenCalled();
    expect(h.rendre).not.toHaveBeenCalled();
    expect(h.sendMail).not.toHaveBeenCalled();
  });
});
