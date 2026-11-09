import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  adresses: vi.fn(),
  sendMail: vi.fn(),
  enService: vi.fn(() => true),
  abonnements: vi.fn(),
  synchroniser: vi.fn(),
  versions: vi.fn(),
  expirer: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { abonnement: { findMany: m.findMany, updateMany: m.updateMany }, duerpVersion: { count: m.versions } },
}));
vi.mock("@/lib/stripe/parcours", () => ({ expirerSessionsOuvertes: m.expirer }));
vi.mock("@/lib/email", () => ({
  envoiEnService: m.enService,
  sendMail: m.sendMail,
  publicAppUrl: () => "https://rojer.test",
  motifErreur: (e: unknown) => (e instanceof Error ? e.message : "erreur"),
}));
vi.mock("./rappels", () => ({ adressesDesProprietaires: m.adresses }));
vi.mock("./saisie", () => ({ PAGE_ABONNEMENT: "/compte/abonnement" }));
vi.mock("@/lib/stripe/client", () => ({ OPTIONS_WEBHOOK: {} }));
vi.mock("@/lib/stripe/synchronisation", () => ({ synchroniserClientStripe: m.synchroniser }));
vi.mock("@/lib/suppression/fichiers", () => ({ clesDesEtablissements: vi.fn(), libererFichiers: vi.fn() }));

import { avertirAvantSuppression, finDuDelai, messageAvantSuppression, supprimerComptesEchus } from "./suppression";

const MAINTENANT = new Date("2027-10-20T09:00:00Z");
const JOUR = 86_400_000;

beforeEach(() => {
  vi.clearAllMocks();
  m.enService.mockReturnValue(true);
  m.findMany.mockResolvedValue([]);
  m.updateMany.mockResolvedValue({ count: 1 });
  m.adresses.mockResolvedValue(["dirigeant@exemple.fr"]);
  m.sendMail.mockResolvedValue(undefined);
  m.synchroniser.mockResolvedValue({ issue: "ecrit" });
  m.versions.mockResolvedValue(0);
  m.expirer.mockResolvedValue(undefined);
});

describe("suppression d'un compte sans abonnement (ADR-058)", () => {
  it("douze mois civils après l'horloge", () => {
    expect(finDuDelai(new Date("2026-11-15T10:00:00Z"))).toEqual(new Date("2027-11-15T10:00:00Z"));
  });

  it("J-30 : la date posée est la fin du délai, au moins 30 jours après l'e-mail ; marque avant l'envoi", async () => {
    const horloge = new Date("2026-11-10T00:00:00Z"); // délai fini le 2027-11-10, dans 21 jours
    m.findMany.mockResolvedValueOnce([{ id: "ab1", compteId: "c1", sansAbonnementDepuis: horloge, debutPayantLe: null }]).mockResolvedValueOnce([]);
    const ordre: string[] = [];
    m.updateMany.mockImplementation(async () => (ordre.push("marque"), { count: 1 }));
    m.sendMail.mockImplementation(async () => void ordre.push("envoi"));
    const bilan = await avertirAvantSuppression(MAINTENANT);
    expect(bilan.j30).toEqual({ envoyes: 1, echecs: 0 });
    expect(ordre).toEqual(["marque", "envoi"]);
    const prevue = new Date(MAINTENANT.getTime() + 30 * JOUR);
    expect(m.updateMany.mock.calls[0][0]).toEqual({
      where: { id: "ab1", avertiSuppression30Le: null, sansAbonnementDepuis: horloge },
      data: { avertiSuppression30Le: MAINTENANT, suppressionPrevueLe: prevue },
    });
    expect(m.sendMail.mock.calls[0][0].subject).toBe("Vos données Rojer seront supprimées le 19 novembre 2027");
    // Requête : comptes fermés, sans premier avertissement, dont le délai finit d'ici 30 jours.
    const where = m.findMany.mock.calls[0][0].where;
    expect(where.avertiSuppression30Le).toBeNull();
    expect(where.sansAbonnementDepuis.lte).toEqual(new Date("2026-11-19T09:00:00Z"));
  });

  it("J-7 : sept jours avant la date, repoussée si le rappel part en retard ; jamais avancée", async () => {
    const prevue = new Date(MAINTENANT.getTime() + 3 * JOUR); // le rappel part en retard
    m.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "ab1", compteId: "c1", suppressionPrevueLe: prevue, debutPayantLe: new Date() }]);
    await avertirAvantSuppression(MAINTENANT);
    expect(m.updateMany.mock.calls[0][0]).toEqual({
      where: { id: "ab1", avertiSuppression7Le: null, suppressionPrevueLe: prevue },
      data: { avertiSuppression7Le: MAINTENANT, suppressionPrevueLe: new Date(MAINTENANT.getTime() + 7 * JOUR) },
    });
    expect(m.sendMail.mock.calls[0][0].subject).toMatch(/^Rappel : /);
  });

  it("rien n'est parti : la marque est rendue, et la date d'avant avec", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const prevue = new Date(MAINTENANT.getTime() + 5 * JOUR);
    m.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "ab1", compteId: "c1", suppressionPrevueLe: prevue, debutPayantLe: null }]);
    m.sendMail.mockRejectedValue(new Error("refusé"));
    const bilan = await avertirAvantSuppression(MAINTENANT);
    expect(bilan.j7).toEqual({ envoyes: 0, echecs: 1 });
    expect(m.updateMany).toHaveBeenLastCalledWith({
      where: { id: "ab1", avertiSuppression7Le: MAINTENANT },
      data: { avertiSuppression7Le: null, suppressionPrevueLe: prevue },
    });
  });

  it("e-mails hors service : rien n'est lu ni marqué", async () => {
    m.enService.mockReturnValue(false);
    expect((await avertirAvantSuppression(MAINTENANT)).horsService).toBe(true);
    expect(m.findMany).not.toHaveBeenCalled();
  });

  it("le message : la date, le lien ; ce qui se garde selon le compte ; la conservation du DUERP à l'employeur ; jamais « Stripe »", () => {
    const le = new Date("2027-11-19T12:00:00Z");
    const depuis = new Date("2026-11-19T12:00:00Z");
    const msg = (versionsDuerp: boolean, aPaye: boolean) =>
      messageAvantSuppression("j30", le, depuis, { versionsDuerp, aPaye }, "https://rojer.test").text;
    const paye = msg(true, true);
    const versionsSansPaiement = msg(true, false); // validé avant le lancement, jamais payé
    const rien = msg(false, false);
    expect(paye).toMatch(/19 novembre 2027/);
    expect(paye).toMatch(/depuis le 19 novembre 2026/);
    expect(paye).toContain("https://rojer.test/compte/abonnement");
    expect(paye).toMatch(/Préparer un contrôle/);
    expect(versionsSansPaiement).toMatch(/téléchargez-les/);
    expect(versionsSansPaiement).not.toMatch(/Préparer un contrôle/);
    expect(versionsSansPaiement).not.toMatch(/aucun document validé/);
    expect(rien).toMatch(/aucun document validé/);
    for (const t of [paye, versionsSansPaiement, rien]) {
      expect(t).toMatch(/R\. 4121-4/);
      expect(t).not.toMatch(/stripe/i);
    }
  });

  it("sans Stripe, aucune suppression ; Stripe injoignable : le compte attend la passe suivante", async () => {
    expect(await supprimerComptesEchus(MAINTENANT, null)).toEqual({ supprimes: 0, reportes: 0, fichiers: { liberes: 0, echecs: 0 } });
    expect(m.findMany).not.toHaveBeenCalled();

    vi.spyOn(console, "error").mockImplementation(() => {});
    m.findMany.mockResolvedValue([{ compteId: "c1", stripeCustomerId: "cus_1" }]);
    m.abonnements.mockRejectedValue(new Error("injoignable"));
    const stripe = {
      subscriptions: { cancel: vi.fn(), list: () => ({ autoPagingToArray: m.abonnements }) },
    } as unknown as Parameters<typeof supprimerComptesEchus>[1];
    expect(await supprimerComptesEchus(MAINTENANT, stripe)).toMatchObject({ supprimes: 0, reportes: 1 });
    // La sélection : date atteinte et les deux avertissements partis.
    const where = m.findMany.mock.calls[0][0].where;
    expect(where.suppressionPrevueLe).toEqual({ lte: MAINTENANT });
    expect(where.avertiSuppression30Le).toEqual({ not: null });
    expect(where.avertiSuppression7Le).toEqual({ not: null });
  });

  it("notre copie est en retard (webhook perdu) : un abonnement ouvert chez Stripe → rien n'est résilié ni effacé, la copie est relue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.findMany.mockResolvedValue([{ compteId: "c1", stripeCustomerId: "cus_1" }]);
    const cancel = vi.fn();
    const stripe = {
      subscriptions: { cancel, list: () => ({ autoPagingToArray: m.abonnements }) },
    } as unknown as Parameters<typeof supprimerComptesEchus>[1];
    for (const ouvert of ["active", "trialing", "past_due"]) {
      m.abonnements.mockResolvedValue([
        { id: "sub_vieux", status: "paused" },
        { id: "sub_neuf", status: ouvert },
      ]);
      expect(await supprimerComptesEchus(MAINTENANT, stripe)).toMatchObject({ supprimes: 0, reportes: 1 });
    }
    expect(cancel).not.toHaveBeenCalled();
    expect(m.synchroniser).toHaveBeenCalledWith(stripe, "cus_1");
    // Les paiements en cours sur Checkout sont arrêtés avant la relecture.
    expect(m.expirer).toHaveBeenCalledWith(stripe, "cus_1");
  });
});
