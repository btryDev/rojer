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
  transaction: vi.fn(),
  membres: vi.fn(),
  file: { findMany: vi.fn(), deleteMany: vi.fn(), update: vi.fn(), count: vi.fn() },
  stockage: { delete: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    abonnement: { findMany: m.findMany, updateMany: m.updateMany },
    duerpVersion: { count: m.versions },
    membre: { findMany: m.membres },
    fichierALiberer: m.file,
    $transaction: m.transaction,
  },
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
vi.mock("@/lib/suppression/fichiers", () => ({ clesDesEtablissements: vi.fn() }));
vi.mock("@/lib/storage", () => ({ getStorage: () => m.stockage }));
const { alerter } = vi.hoisted(() => ({ alerter: vi.fn() }));
vi.mock("@/lib/alertes", () => ({ alerter }));

import { ajouterJours, ajouterMois } from "@/lib/dates";
import {
  avertirAvantSuppression,
  dateDeSuppressionPrevue,
  finDuDelai,
  libererFichiersEnAttente,
  messageAuxMembres,
  messageAvantSuppression,
  supprimerComptesEchus,
} from "./suppression";

const MAINTENANT = new Date("2027-10-20T09:00:00Z");

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
  m.membres.mockResolvedValue([]);
  m.file.count.mockResolvedValue(0);
  m.file.deleteMany.mockResolvedValue({ count: 1 });
  m.file.update.mockResolvedValue({});
  m.stockage.delete.mockResolvedValue(undefined);
});

describe("suppression d'un compte sans abonnement (ADR-058)", () => {
  it("la date dite au compte : celle du premier avertissement ; avant, la fin du délai, jamais moins de 30 jours", () => {
    const posee = new Date("2027-12-01T00:00:00Z");
    expect(dateDeSuppressionPrevue(new Date("2025-01-01T00:00:00Z"), posee, MAINTENANT)).toEqual(posee);
    // Délai dépassé sans avertissement (offre relancée) : 30 jours au moins, comme le premier e-mail.
    expect(dateDeSuppressionPrevue(new Date("2025-01-01T00:00:00Z"), null, MAINTENANT)).toEqual(ajouterJours(MAINTENANT, 30));
    const recent = new Date("2027-06-01T00:00:00Z");
    expect(dateDeSuppressionPrevue(recent, null, MAINTENANT)).toEqual(finDuDelai(recent));
  });

  it("douze mois civils après l'horloge, au jour civil (ADR-011)", () => {
    const fin = finDuDelai(new Date("2026-11-15T10:00:00Z"));
    expect(fin).toEqual(ajouterMois(new Date("2026-11-15T10:00:00Z"), 12));
    expect(fin.getUTCFullYear()).toBe(2027);
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
    const prevue = ajouterJours(MAINTENANT, 30);
    expect(m.updateMany.mock.calls[0][0]).toEqual({
      where: { id: "ab1", avertiSuppression30Le: null, sansAbonnementDepuis: horloge },
      data: { avertiSuppression30Le: MAINTENANT, suppressionPrevueLe: prevue },
    });
    expect(m.sendMail.mock.calls[0][0].subject).toBe("Vos données Rojer seront supprimées le 19 novembre 2027");
    // Requête : comptes fermés, sans premier avertissement, dont le délai finit d'ici 30 jours.
    const where = m.findMany.mock.calls[0][0].where;
    expect(where.avertiSuppression30Le).toBeNull();
    expect(where.sansAbonnementDepuis.lte).toEqual(ajouterMois(ajouterJours(MAINTENANT, 30), -12));
  });

  it("J-7 : sept jours avant la date, repoussée si le rappel part en retard ; jamais avancée", async () => {
    const prevue = ajouterJours(MAINTENANT, 3); // le rappel part en retard
    m.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "ab1", compteId: "c1", suppressionPrevueLe: prevue, debutPayantLe: new Date(), compte: { name: "Chez Lulu" } }]);
    m.membres.mockResolvedValue([{ user: { email: "serveur@exemple.fr" } }]);
    const bilan = await avertirAvantSuppression(MAINTENANT);
    expect(m.updateMany.mock.calls[0][0]).toEqual({
      where: { id: "ab1", avertiSuppression7Le: null, suppressionPrevueLe: prevue },
      data: { avertiSuppression7Le: MAINTENANT, suppressionPrevueLe: ajouterJours(MAINTENANT, 7) },
    });
    expect(m.sendMail.mock.calls[0][0].subject).toMatch(/^Rappel : /);
    // Les autres membres sont prévenus aussi, par un message à eux : seul un propriétaire peut réabonner.
    expect(m.membres.mock.calls[0][0].where).toEqual({ compteId: "c1", role: { not: "owner" } });
    expect(m.sendMail.mock.calls[1][0]).toMatchObject({ to: "serveur@exemple.fr", subject: expect.stringMatching(/« Chez Lulu »/) });
    expect(bilan.membresPrevenus).toBe(1);
  });

  it("le message aux membres : la date, le propriétaire seul peut réabonner, aucun lien d'abonnement", () => {
    const { subject, text } = messageAuxMembres("Chez Lulu", new Date("2027-11-19T12:00:00Z"));
    expect(subject).toBe("Le compte Rojer « Chez Lulu » sera supprimé le 19 novembre 2027");
    expect(text).toMatch(/Seul un propriétaire/);
    expect(text).not.toMatch(/compte\/abonnement|stripe/i);
  });

  it("la file des fichiers : un fichier retiré la quitte ; un échec y reste, compté, sans arrêter les autres", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.file.findMany.mockResolvedValue([
      { cle: "a", contexte: "comptes/suppression" },
      { cle: "b", contexte: "comptes/suppression" },
    ]);
    m.stockage.delete.mockImplementation(async (cle: string) => {
      if (cle === "a") throw new Error("stockage en panne");
    });
    m.file.count.mockResolvedValue(1);
    expect(await libererFichiersEnAttente()).toEqual({ liberes: 1, echecs: 1, restants: 1 });
    expect(m.file.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { cle: "b" } });
    expect(m.file.update).toHaveBeenCalledExactlyOnceWith({ where: { cle: "a" }, data: { tentatives: { increment: 1 } } });
    // Les moins tentés d'abord : un fichier qui échoue toujours ne bloque pas la file.
    expect(m.file.findMany.mock.calls[0][0].orderBy).toEqual([{ tentatives: "asc" }, { noteLe: "asc" }]);
  });

  it("rien n'est parti : la marque est rendue, et la date d'avant avec", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const prevue = ajouterJours(MAINTENANT, 5);
    m.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "ab1", compteId: "c1", suppressionPrevueLe: prevue, debutPayantLe: null }]);
    m.sendMail.mockRejectedValue(new Error("refusé"));
    const bilan = await avertirAvantSuppression(MAINTENANT);
    expect(bilan.j7).toEqual({ envoyes: 0, echecs: 1 });
    expect(m.updateMany).toHaveBeenLastCalledWith({
      where: { id: "ab1", avertiSuppression7Le: MAINTENANT },
      data: { avertiSuppression7Le: null, suppressionPrevueLe: prevue },
    });
  });

  it("aucun propriétaire joignable : rien n'est parti, la marque est rendue (ADR-058 § 2)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const horloge = new Date("2026-11-10T00:00:00Z");
    m.findMany.mockResolvedValueOnce([{ id: "ab1", compteId: "c1", sansAbonnementDepuis: horloge, debutPayantLe: null }]).mockResolvedValueOnce([]);
    m.adresses.mockResolvedValue([]);
    const bilan = await avertirAvantSuppression(MAINTENANT);
    expect(bilan.j30).toEqual({ envoyes: 0, echecs: 0 });
    expect(m.updateMany).toHaveBeenLastCalledWith({
      where: { id: "ab1", avertiSuppression30Le: MAINTENANT },
      data: { avertiSuppression30Le: null, suppressionPrevueLe: null },
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
    expect(await supprimerComptesEchus(MAINTENANT, null)).toEqual({ supprimes: 0, reportes: 0 });
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
    // Le compte reporté passe derrière les autres : il ne bloque pas la file.
    expect(m.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ compteId: "c1", suppressionPrevueLe: { lte: MAINTENANT } }),
      data: { suppressionPrevueLe: MAINTENANT },
    });
  });

  it("client Stripe SUPPRIMÉ (Stripe le dit) : rien à résilier, la suppression suit ; « introuvable » sans plus (mauvaise clé) : le compte attend", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.findMany.mockResolvedValue([{ compteId: "c1", stripeCustomerId: "cus_parti" }]);
    const introuvable = Object.assign(new Error("No such customer"), { code: "resource_missing" });
    m.expirer.mockRejectedValue(introuvable);
    m.transaction.mockResolvedValue(["cle-1"]);
    const retrieve = vi.fn();
    const cancel = vi.fn();
    const stripe = {
      customers: { retrieve },
      subscriptions: { cancel, list: () => ({ autoPagingToArray: m.abonnements }) },
    } as unknown as Parameters<typeof supprimerComptesEchus>[1];

    retrieve.mockResolvedValue({ id: "cus_parti", deleted: true });
    expect(await supprimerComptesEchus(MAINTENANT, stripe)).toEqual({ supprimes: 1, reportes: 0 });
    expect(cancel).not.toHaveBeenCalled();

    // Clé de test en production, autre compte Stripe : le client est introuvable
    // aussi à la relecture — l'abonnement réel facture peut-être : rien n'est effacé,
    // et c'est signalé (sinon le compte attendrait chaque jour en silence).
    m.transaction.mockClear();
    retrieve.mockRejectedValue(introuvable);
    expect(await supprimerComptesEchus(MAINTENANT, stripe)).toEqual({ supprimes: 0, reportes: 1 });
    expect(alerter).toHaveBeenCalledWith(expect.stringMatching(/client Stripe introuvable/), expect.any(Array));
    // Un client lisible et non supprimé : de même.
    retrieve.mockResolvedValue({ id: "cus_parti" });
    expect(await supprimerComptesEchus(MAINTENANT, stripe)).toEqual({ supprimes: 0, reportes: 1 });
    // Une autre erreur ne vaut pas absence.
    m.expirer.mockRejectedValue(Object.assign(new Error("rate limit"), { code: "rate_limit" }));
    expect(await supprimerComptesEchus(MAINTENANT, stripe)).toMatchObject({ supprimes: 0, reportes: 1 });
    expect(m.transaction).not.toHaveBeenCalled();
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

  it("un premier paiement en cours (incomplete) : rien n'est résilié ni effacé, le compte attend", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.findMany.mockResolvedValue([{ compteId: "c1", stripeCustomerId: "cus_1" }]);
    const cancel = vi.fn();
    const stripe = {
      subscriptions: { cancel, list: () => ({ autoPagingToArray: m.abonnements }) },
    } as unknown as Parameters<typeof supprimerComptesEchus>[1];
    m.abonnements.mockResolvedValue([
      { id: "sub_vieux", status: "canceled" },
      { id: "sub_neuf", status: "incomplete" },
    ]);
    expect(await supprimerComptesEchus(MAINTENANT, stripe)).toMatchObject({ supprimes: 0, reportes: 1 });
    expect(cancel).not.toHaveBeenCalled();
  });
});
