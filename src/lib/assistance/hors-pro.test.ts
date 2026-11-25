import { beforeEach, describe, expect, it, vi } from "vitest";

// ADR-063 § 7 : la tâche quotidienne annule le rendez-vous à venir d'un
// compte sorti de la formule Pro, rend son créneau, prévient l'équipe et le
// compte. La transaction simulée DÉFAIT ce qu'elle a écrit quand elle lève :
// seules les écritures validées sont lues par les tests (`valide`).

type Ecriture = { quoi: "annuler" | "rendre"; id: string };

const h = vi.hoisted(() => ({
  aVenir: vi.fn(),
  relire: vi.fn(),
  verrou: vi.fn(async () => {}),
  sendMail: vi.fn<(m: { to: string; text?: string; replyTo?: string }) => Promise<void>>(async () => {}),
  membres: vi.fn(),
  enCours: [] as Ecriture[],
  valide: [] as Ecriture[],
}));

const tx = {
  rendezVousAssistance: {
    findFirst: h.relire,
    updateMany: vi.fn(async ({ where }: { where: { id: string } }) => {
      h.enCours.push({ quoi: "annuler", id: where.id });
      return { count: 1 };
    }),
  },
};
vi.mock("@/lib/prisma", () => ({
  prisma: {
    rendezVousAssistance: { findMany: h.aVenir },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
      h.enCours = [];
      const r = await fn(tx); // une levée laisse `enCours` hors de `valide` : défait
      h.valide.push(...h.enCours);
      return r;
    },
  },
}));
vi.mock("@/lib/abonnements/quotas", () => ({ verrouillerLeCompte: h.verrou }));
vi.mock("@/lib/auth/membres", () => ({ membresDuCompte: h.membres }));
vi.mock("./creneaux", () => ({
  rendreLeCreneau: vi.fn(async (_t: unknown, id: string) => {
    h.enCours.push({ quoi: "rendre", id });
  }),
}));
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
const ESSENTIEL = { statut: "active", formule: "rojer_essentiel_annuel" };
const PRO = { statut: "active", formule: "rojer_pro_annuel" };
type Abo = { statut: string; formule: string } | null;
const rdv = (id: string, abonnement: Abo) => ({ id, compteId: `c-${id}`, userId: "u-marie", compte: { abonnement } });
const relu = (id: string, abonnement: Abo = ESSENTIEL) => ({
  creneauId: `k-${id}`,
  debut: DEBUT,
  fin: FIN,
  mode: "visio",
  telephone: null,
  sujet: null,
  compte: { abonnement },
});
const MARIE = { userId: "u-marie", nom: "Marie Durand", email: "m.durand@example.fr", role: "member" };
const PAUL = { userId: "u-paul", nom: "Paul Martin", email: "p.martin@example.fr", role: "owner" };
const destinataires = () => h.sendMail.mock.calls.map(([m]) => m.to);

beforeEach(() => {
  vi.clearAllMocks();
  h.enCours = [];
  h.valide = [];
  h.membres.mockResolvedValue([PAUL, MARIE]);
  h.relire.mockImplementation(async ({ where }: { where: { id: string } }) => relu(where.id));
});

describe("annulerRendezVousHorsPro", () => {
  it("sous le verrou du compte, annule, rend le créneau relu, prévient l'équipe puis la personne", async () => {
    h.aVenir.mockResolvedValue([rdv("r1", ESSENTIEL)]);
    expect(await annulerRendezVousHorsPro(MAINTENANT)).toEqual({ annules: 1 });
    expect(h.verrou).toHaveBeenCalledWith(tx, "c-r1");
    expect(tx.rendezVousAssistance.updateMany).toHaveBeenCalledWith({
      where: { id: "r1", annuleLe: null },
      data: { annuleLe: MAINTENANT },
    });
    expect(h.valide).toEqual([
      { quoi: "annuler", id: "r1" },
      { quoi: "rendre", id: "k-r1" },
    ]);
    expect(destinataires()).toEqual(["contact@rojer.test", "m.durand@example.fr"]);
    expect(h.sendMail.mock.calls[1][0].text).toContain("Votre formule Pro a pris fin");
  });

  it("l'e-mail à l'équipe échoue : rien n'est annulé, la passe du lendemain recommence", async () => {
    h.aVenir.mockResolvedValue([rdv("r1", ESSENTIEL), rdv("r2", ESSENTIEL)]);
    h.sendMail.mockImplementationOnce(async () => {
      throw new Error("Mailpace injoignable");
    });
    // Le premier compte échoue sans arrêter le second ; l'échec remonte
    // ensuite, pour que l'alerte du jour parte.
    await expect(annulerRendezVousHorsPro(MAINTENANT)).rejects.toThrow("1 annulation(s) hors Pro non faite(s), 1 faite(s)");
    expect(h.valide).toEqual([
      { quoi: "annuler", id: "r2" },
      { quoi: "rendre", id: "k-r2" },
    ]);
  });

  it("la personne qui avait réservé a quitté le compte : les propriétaires sont prévenus", async () => {
    h.membres.mockResolvedValue([PAUL]);
    h.aVenir.mockResolvedValue([rdv("r1", ESSENTIEL)]);
    await annulerRendezVousHorsPro(MAINTENANT);
    expect(destinataires()).toEqual(["contact@rojer.test", "p.martin@example.fr"]);
    expect(h.sendMail.mock.calls[0][0].replyTo).toBe("p.martin@example.fr");
  });

  it("laisse un compte en Pro, impayé compris", async () => {
    h.aVenir.mockResolvedValue([rdv("r1", PRO), rdv("r2", { statut: "past_due", formule: "rojer_pro_mensuel" })]);
    expect(await annulerRendezVousHorsPro(MAINTENANT)).toEqual({ annules: 0 });
    expect(h.valide).toEqual([]);
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("un compte repassé en Pro depuis la lecture : relu sous le verrou, il garde son rendez-vous", async () => {
    h.aVenir.mockResolvedValue([rdv("r1", ESSENTIEL)]);
    h.relire.mockResolvedValue(relu("r1", PRO));
    expect(await annulerRendezVousHorsPro(MAINTENANT)).toEqual({ annules: 0 });
    expect(h.valide).toEqual([]);
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("un rendez-vous annulé ou déplacé entre-temps : relu sous le verrou, il ne l'est pas deux fois", async () => {
    h.aVenir.mockResolvedValue([rdv("r1", null)]);
    h.relire.mockResolvedValue(null);
    expect(await annulerRendezVousHorsPro(MAINTENANT)).toEqual({ annules: 0 });
    expect(h.valide).toEqual([]);
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("ne lit que les rendez-vous à venir et non annulés", async () => {
    h.aVenir.mockResolvedValue([]);
    await annulerRendezVousHorsPro(MAINTENANT);
    expect(h.aVenir).toHaveBeenCalledWith(expect.objectContaining({ where: { annuleLe: null, debut: { gt: MAINTENANT } } }));
  });
});
