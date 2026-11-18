import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  alerter: vi.fn(),
  ligne: null as null | Record<string, unknown>,
  compte: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(async () => ({ name: "Bistrot" })), updateMany: vi.fn() },
  membres: vi.fn(async () => [{ user: { email: "membre@exemple.fr" } }]),
  proprietaires: vi.fn(async () => ["dirigeant@exemple.fr"]),
  sendMail: vi.fn<(message: { to: string; subject: string; text: string }) => Promise<undefined>>(async () => undefined),
  retrieve: vi.fn(),
  update: vi.fn(),
  synchroniser: vi.fn(async () => ({ issue: "ecrit" })),
  active: true,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    abonnement: { findUnique: async () => m.ligne },
    compte: m.compte,
    membre: { findMany: m.membres },
  },
}));
vi.mock("@/lib/email", () => ({
  sendMail: m.sendMail,
  publicAppUrl: () => "https://rojer.test",
  motifErreur: (e: unknown) => (e instanceof Error ? e.message : "erreur"),
}));
vi.mock("@/lib/abonnements/rappels", () => {
  const ecrire = (adresses: () => Promise<string[]>) => async (_c: string, message: { subject: string; text: string }) => {
    let echec = false;
    for (const to of await adresses()) await m.sendMail({ to, ...message }).catch(() => (echec = true));
    return { partis: 1, echec };
  };
  return {
    ecrireAuxProprietaires: ecrire(m.proprietaires),
    ecrireAuxMembres: ecrire(async () => (await m.membres()).map((x) => x.user.email)),
  };
});
vi.mock("@/lib/alertes", () => ({ alerter: m.alerter }));
vi.mock("@/lib/abonnements/suppression", async () => {
  const { ajouterJours, debutDuJour } = await import("@/lib/dates");
  return {
    SANS_PAIEMENT_EN_COURS: () => ({ OR: [] }),
    CONSERVATION_DUERP: "La conservation de votre DUERP (R. 4121-4) reste à la charge de l'employeur.",
    effacementDeLaDemande: (d: Date) => ajouterJours(debutDuJour(d), 7),
    paiementEnCours: (d: Date | null, maintenant: Date) => d != null && d.getTime() > maintenant.getTime() - 70 * 60_000,
  };
});
vi.mock("@/lib/stripe/config", () => ({ configurationStripe: () => ({ active: m.active }) }));
vi.mock("@/lib/stripe/client", () => ({ clientStripe: () => ({ subscriptions: { retrieve: m.retrieve, update: m.update } }) }));
vi.mock("@/lib/stripe/synchronisation", () => ({ synchroniserClientStripe: m.synchroniser }));

import { poserLaDemande, retirerLaDemande } from "./suppression";

const MAINTENANT = new Date("2027-03-01T10:00:00Z");
const ABONNE = { stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", statut: "active", paiementOuvertLe: null };
const abonnement = (echeance: string, autres: Record<string, unknown> = {}) => ({
  id: "sub_1",
  status: "active",
  schedule: null,
  cancel_at_period_end: false,
  items: { data: [{ current_period_end: Date.parse(echeance) / 1000 }] },
  ...autres,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.ligne = null;
  m.active = true;
  m.compte.updateMany.mockResolvedValue({ count: 1 });
});

describe("poser la demande de suppression (ADR-058 § 8)", () => {
  it("sans abonnement : la date posée, rien chez Stripe, un e-mail aux propriétaires (le lien d'annulation) et aux membres", async () => {
    expect(await poserLaDemande("c1", "dirigeant@exemple.fr", MAINTENANT)).toEqual({ ok: true });
    expect(m.compte.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", suppressionDemandeeLe: null, OR: [] },
      data: { suppressionDemandeeLe: MAINTENANT, suppressionDemandeePar: "dirigeant@exemple.fr", suppressionFinPosee: false },
    });
    expect(m.retrieve).not.toHaveBeenCalled();
    const envois = m.sendMail.mock.calls.map((c) => (c as unknown as [{ to: string; text: string }])[0]);
    expect(envois.map((e) => e.to)).toEqual(["dirigeant@exemple.fr", "membre@exemple.fr"]);
    expect(envois[0].text).toContain("https://rojer.test/compte/suppression");
    expect(envois[0].text).toMatch(/0?8 mars 2027/);
    expect(envois[0].text).toMatch(/R\. 4121-4/);
    expect(envois[1].text).not.toContain("https://rojer.test/compte/suppression");
  });

  it("un abonnement qui se renouvelle APRÈS la date : rien n'est résilié ni programmé (annuler remettra tout comme avant)", async () => {
    m.ligne = ABONNE;
    m.retrieve.mockResolvedValue(abonnement("2027-03-20T00:00:00Z"));
    expect(await poserLaDemande("c1", "d@e.fr", MAINTENANT)).toEqual({ ok: true });
    expect(m.update).not.toHaveBeenCalled();
    expect(m.compte.updateMany.mock.calls[0][0].data.suppressionFinPosee).toBe(false);
  });

  it("un renouvellement AVANT la date : la fin programmée à l'échéance, notée — pas de période prélevée pour un compte qui disparaît", async () => {
    m.ligne = ABONNE;
    m.retrieve.mockResolvedValue(abonnement("2027-03-05T00:00:00Z"));
    expect(await poserLaDemande("c1", "d@e.fr", MAINTENANT)).toEqual({ ok: true });
    expect(m.compte.updateMany.mock.calls[0][0].data.suppressionFinPosee).toBe(true);
    expect(m.update).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true });
    expect(m.synchroniser).toHaveBeenCalled();
    // L'e-mail dit que l'abonnement s'arrêtera avant la date, et ce que l'annulation n'y change pas.
    const texte = (m.sendMail.mock.calls[0] as unknown as [{ text: string }])[0].text;
    expect(texte).toMatch(/s'arrêtera ce jour-là au lieu de se renouveler/);
  });

  it("une fin déjà prévue par le propriétaire reste la sienne : ni reposée, ni notée ; prévue APRÈS le renouvellement, la demande est refusée", async () => {
    m.ligne = ABONNE;
    m.retrieve.mockResolvedValue(abonnement("2027-03-05T00:00:00Z", { cancel_at: Date.parse("2027-03-05T00:00:00Z") / 1000 }));
    expect(await poserLaDemande("c1", "d@e.fr", MAINTENANT)).toEqual({ ok: true });
    expect(m.update).not.toHaveBeenCalled();
    expect(m.compte.updateMany.mock.calls[0][0].data.suppressionFinPosee).toBe(false);

    m.retrieve.mockResolvedValue(abonnement("2027-03-05T00:00:00Z", { cancel_at: Date.parse("2027-06-05T00:00:00Z") / 1000 }));
    expect(await poserLaDemande("c1", "d@e.fr", MAINTENANT)).toEqual({ refus: expect.stringMatching(/déjà prévue après/) });
  });

  it("des e-mails qui ne partent pas : la demande reste posée, et c'est signalé", async () => {
    m.sendMail.mockRejectedValueOnce(new Error("smtp"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await poserLaDemande("c1", "d@e.fr", MAINTENANT)).toEqual({ ok: true });
    expect(m.alerter).toHaveBeenCalledWith(expect.stringMatching(/e-mails ne sont pas partis/), expect.any(Array));
  });

  it("Stripe refuse la fin programmée : la demande est retirée, rien n'est posé à moitié", async () => {
    m.ligne = ABONNE;
    m.retrieve.mockResolvedValue(abonnement("2027-03-05T00:00:00Z"));
    m.update.mockRejectedValueOnce(new Error("injoignable"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await poserLaDemande("c1", "d@e.fr", MAINTENANT)).toEqual({ refus: expect.stringMatching(/rien n'a été fait/) });
    expect(m.compte.updateMany).toHaveBeenLastCalledWith({
      where: { id: "c1", suppressionDemandeeLe: MAINTENANT },
      data: { suppressionDemandeeLe: null, suppressionDemandeePar: null, suppressionFinPosee: false },
    });
    expect(m.sendMail).not.toHaveBeenCalled();
  });

  it("refusée : paiement ouvert, changement de formule planifié, demande déjà posée", async () => {
    m.ligne = { ...ABONNE, paiementOuvertLe: new Date(MAINTENANT.getTime() - 10 * 60_000) };
    expect(await poserLaDemande("c1", "d@e.fr", MAINTENANT)).toEqual({ refus: expect.stringMatching(/paiement est en cours/) });

    m.ligne = ABONNE;
    m.retrieve.mockResolvedValue(abonnement("2027-03-05T00:00:00Z", { schedule: "sub_sched_1" }));
    expect(await poserLaDemande("c1", "d@e.fr", MAINTENANT)).toEqual({ refus: expect.stringMatching(/changement de formule/) });

    m.ligne = null;
    m.compte.updateMany.mockResolvedValue({ count: 0 });
    expect(await poserLaDemande("c1", "d@e.fr", MAINTENANT)).toEqual({ refus: expect.stringMatching(/déjà demandée/) });
    expect(m.sendMail).not.toHaveBeenCalled();
  });
});

describe("annuler la demande", () => {
  it("la fin programmée par la demande est retirée chez Stripe, puis la demande ; e-mail à tous", async () => {
    m.compte.findUnique.mockResolvedValue({
      suppressionDemandeeLe: MAINTENANT,
      suppressionFinPosee: true,
      abonnement: { stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" },
    });
    m.retrieve.mockResolvedValue(abonnement("2027-03-05T00:00:00Z", { cancel_at_period_end: true }));
    expect(await retirerLaDemande("c1", "d@e.fr")).toEqual({ ok: true });
    expect(m.update).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: false });
    expect(m.update.mock.invocationCallOrder[0]).toBeLessThan(m.compte.updateMany.mock.invocationCallOrder[0]);
    expect(m.compte.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", suppressionDemandeeLe: MAINTENANT },
      data: { suppressionDemandeeLe: null, suppressionDemandeePar: null, suppressionFinPosee: false },
    });
    expect(m.sendMail).toHaveBeenCalledTimes(2);
  });

  it("une fin qui n'était pas de la demande (résiliation du dirigeant) reste ; Stripe injoignable : rien n'est retiré", async () => {
    m.compte.findUnique.mockResolvedValue({ suppressionDemandeeLe: MAINTENANT, suppressionFinPosee: false, abonnement: { stripeSubscriptionId: "sub_1" } });
    expect(await retirerLaDemande("c1", "d@e.fr")).toEqual({ ok: true });
    expect(m.retrieve).not.toHaveBeenCalled();

    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.compte.findUnique.mockResolvedValue({ suppressionDemandeeLe: MAINTENANT, suppressionFinPosee: true, abonnement: { stripeSubscriptionId: "sub_1" } });
    m.retrieve.mockRejectedValue(new Error("injoignable"));
    expect(await retirerLaDemande("c1", "d@e.fr")).toEqual({ refus: expect.any(String) });
    expect(m.compte.updateMany).not.toHaveBeenCalled();
  });
});
