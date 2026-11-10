import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  membres: vi.fn(),
  sendMail: vi.fn(),
  enService: vi.fn(() => true),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { abonnement: { findMany: m.findMany, updateMany: m.updateMany }, membre: { findMany: m.membres } },
}));
vi.mock("@/lib/email", () => ({
  envoiEnService: m.enService,
  sendMail: m.sendMail,
  publicAppUrl: () => "https://rojer.test",
  motifErreur: (e: unknown) => (e instanceof Error ? e.message : "erreur"),
}));
vi.mock("./saisie", () => ({ PAGE_ABONNEMENT: "/compte/abonnement" }));
const st = vi.hoisted(() => ({ baisse: vi.fn(), retrieve: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ OPTIONS_WEBHOOK: {} }));
vi.mock("@/lib/stripe/parcours", () => ({ baissePrevue: st.baisse }));

import {
  FENETRE_VEILLE_MS,
  JOURS_AVANT_RENOUVELLEMENT,
  messageRenouvellementAnnuel,
  messageVeilleFinEssai,
  rappelerLaVeilleDeLaFinDEssai,
  rappelerLeRenouvellementAnnuel,
} from "./rappels";
import { ajouterJours } from "@/lib/dates";

const MAINTENANT = new Date("2026-11-20T08:00:00Z");
const FIN = new Date("2026-11-21T10:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  m.enService.mockReturnValue(true);
  m.findMany.mockResolvedValue([{ id: "ab1", compteId: "c1", finEssai: FIN }]);
  m.updateMany.mockResolvedValue({ count: 1 });
  m.membres.mockResolvedValue([{ user: { email: "dirigeant@exemple.fr" } }]);
  m.sendMail.mockResolvedValue(undefined);
});

describe("rappel de la veille de la fin de l'essai", () => {
  it("cherche les essais sans rappel ni résiliation qui finissent dans les 36 heures", async () => {
    await rappelerLaVeilleDeLaFinDEssai(MAINTENANT);
    expect(m.findMany.mock.calls[0][0].where).toEqual({
      statut: "trialing",
      rappelVeilleEssaiLe: null,
      resilieEnFinDePeriode: false,
      finPrevueLe: null,
      finEssai: { gt: MAINTENANT, lte: new Date(MAINTENANT.getTime() + FENETRE_VEILLE_MS) },
    });
    expect(FENETRE_VEILLE_MS).toBe(36 * 3_600_000);
  });

  it("pose la marque AVANT d'envoyer, puis écrit aux propriétaires du compte, avec la date et le lien", async () => {
    const ordre: string[] = [];
    m.updateMany.mockImplementation(async () => (ordre.push("marque"), { count: 1 }));
    m.sendMail.mockImplementation(async () => void ordre.push("envoi"));
    expect(await rappelerLaVeilleDeLaFinDEssai(MAINTENANT)).toEqual({ envoyes: 1, echecs: 0 });
    expect(ordre).toEqual(["marque", "envoi"]);
    expect(m.updateMany).toHaveBeenCalledWith({ where: { id: "ab1", rappelVeilleEssaiLe: null }, data: { rappelVeilleEssaiLe: MAINTENANT } });
    expect(m.membres).toHaveBeenCalledWith(expect.objectContaining({ where: { compteId: "c1", role: "owner" } }));
    const mail = m.sendMail.mock.calls[0][0];
    expect(mail.to).toBe("dirigeant@exemple.fr");
    expect(mail.subject).toBe("Votre essai gratuit de Rojer se termine le 21 novembre 2026");
    expect(mail.text).toContain("https://rojer.test/compte/abonnement");
  });

  it("une autre instance a déjà pris la ligne : rien n'est envoyé", async () => {
    m.updateMany.mockResolvedValue({ count: 0 });
    expect(await rappelerLaVeilleDeLaFinDEssai(MAINTENANT)).toEqual({ envoyes: 0, echecs: 0 });
    expect(m.sendMail).not.toHaveBeenCalled();
  });

  it("l'envoi échoue : la marque est rendue à vide, pour la passe suivante", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.sendMail.mockRejectedValue(new Error("refusé"));
    expect(await rappelerLaVeilleDeLaFinDEssai(MAINTENANT)).toEqual({ envoyes: 0, echecs: 1 });
    expect(m.updateMany).toHaveBeenLastCalledWith({ where: { id: "ab1", rappelVeilleEssaiLe: MAINTENANT }, data: { rappelVeilleEssaiLe: null } });
  });

  it("e-mails hors service : rien n'est lu ni marqué", async () => {
    m.enService.mockReturnValue(false);
    expect(await rappelerLaVeilleDeLaFinDEssai(MAINTENANT)).toEqual({ envoyes: 0, echecs: 0, horsService: true });
    expect(m.findMany).not.toHaveBeenCalled();
    expect(m.updateMany).not.toHaveBeenCalled();
  });

  it("plusieurs propriétaires, un envoi échoue : la marque reste (pas de doublon pour qui l'a reçu), l'échec est compté", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.membres.mockResolvedValue([{ user: { email: "a@exemple.fr" } }, { user: { email: "b@exemple.fr" } }]);
    m.sendMail.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("refusé"));
    expect(await rappelerLaVeilleDeLaFinDEssai(MAINTENANT)).toEqual({ envoyes: 1, echecs: 1 });
    expect(m.updateMany).toHaveBeenCalledTimes(1);
  });

  it("aucune adresse de propriétaire : rien n'est compté comme envoyé", async () => {
    m.membres.mockResolvedValue([]);
    expect(await rappelerLaVeilleDeLaFinDEssai(MAINTENANT)).toEqual({ envoyes: 0, echecs: 0 });
  });

  it("le message ne nomme pas Stripe, et ne promet pas l'export (un compte qui n'a jamais payé n'y a pas droit)", () => {
    const { text } = messageVeilleFinEssai(FIN, "https://rojer.test/compte/abonnement");
    expect(text).not.toMatch(/stripe/i);
    expect(text).not.toMatch(/export/i);
    expect(text).toMatch(/consultables pendant 12 mois/);
  });
});

describe("rappel du renouvellement annuel (décision du 2026-11-10)", () => {
  const ECHEANCE = new Date("2026-12-10T09:00:00Z");
  const annuel = (o: object = {}) => ({
    id: "ab2",
    compteId: "c2",
    formule: "rojer_pro_annuel",
    finPeriode: ECHEANCE,
    rappelRenouvellementPour: null,
    stripeSubscriptionId: "sub_2",
    ...o,
  });
  const stripe = { subscriptions: { retrieve: st.retrieve } } as unknown as Parameters<typeof rappelerLeRenouvellementAnnuel>[1];
  beforeEach(() => {
    st.retrieve.mockResolvedValue({ id: "sub_2", schedule: null });
    st.baisse.mockResolvedValue(null);
  });

  it("cherche les annuels actifs, sans résiliation prévue, qui se renouvellent dans les 30 jours — jamais les mensuels", async () => {
    m.findMany.mockResolvedValue([]);
    await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe);
    expect(m.findMany.mock.calls[0][0].where).toEqual({
      statut: "active",
      formule: { endsWith: "_annuel" },
      resilieEnFinDePeriode: false,
      finPrevueLe: null,
      finPeriode: { gt: MAINTENANT, lte: ajouterJours(MAINTENANT, 30) },
    });
    expect(JOURS_AVANT_RENOUVELLEMENT).toBe(30);
  });

  it("pose la marque (l'échéance) AVANT d'envoyer ; le message dit la formule, la date, le lien, et ne nomme pas le prestataire de paiement", async () => {
    const ordre: string[] = [];
    m.findMany.mockResolvedValue([annuel()]);
    m.updateMany.mockImplementation(async () => (ordre.push("marque"), { count: 1 }));
    m.sendMail.mockImplementation(async () => void ordre.push("envoi"));
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe)).toEqual({ envoyes: 1, echecs: 0 });
    expect(ordre).toEqual(["marque", "envoi"]);
    expect(m.updateMany.mock.calls[0][0]).toEqual({
      where: { id: "ab2", finPeriode: ECHEANCE, OR: [{ rappelRenouvellementPour: null }, { NOT: { rappelRenouvellementPour: ECHEANCE } }] },
      data: { rappelRenouvellementPour: ECHEANCE },
    });
    const mail = m.sendMail.mock.calls[0][0];
    expect(mail.subject).toBe("Votre abonnement Rojer se renouvelle le 10 décembre 2026");
    expect(mail.text).toContain("(formule Pro)");
    expect(mail.text).toContain("https://rojer.test/compte/abonnement");
    expect(mail.text).not.toMatch(/stripe/i);
  });

  it("une échéance déjà rappelée n'est pas rappelée deux fois ; l'échéance suivante l'est", async () => {
    m.findMany.mockResolvedValue([annuel({ rappelRenouvellementPour: ECHEANCE })]);
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe)).toEqual({ envoyes: 0, echecs: 0 });
    expect(m.sendMail).not.toHaveBeenCalled();
    m.findMany.mockResolvedValue([annuel({ rappelRenouvellementPour: new Date("2025-12-10T09:00:00Z") })]);
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe)).toEqual({ envoyes: 1, echecs: 0 });
  });

  it("marque déjà prise par une autre passe : rien n'est envoyé ; rien n'est parti sur échec : la marque d'avant est rendue", async () => {
    m.findMany.mockResolvedValue([annuel()]);
    m.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe)).toEqual({ envoyes: 0, echecs: 0 });
    expect(m.sendMail).not.toHaveBeenCalled();

    vi.spyOn(console, "error").mockImplementation(() => {});
    m.sendMail.mockRejectedValue(new Error("panne"));
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe)).toEqual({ envoyes: 0, echecs: 1 });
    expect(m.updateMany).toHaveBeenLastCalledWith({
      where: { id: "ab2", rappelRenouvellementPour: ECHEANCE },
      data: { rappelRenouvellementPour: null },
    });
  });

  it("une baisse planifiée vers le mensuel : pas de rappel ; vers une formule annuelle plus petite : le message dit celle qui sera facturée", async () => {
    m.findMany.mockResolvedValue([annuel()]);
    st.baisse.mockResolvedValue({ priceId: "price_m", lookupKey: "rojer_pro_mensuel", le: ECHEANCE });
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe)).toEqual({ envoyes: 0, echecs: 0 });
    expect(m.updateMany).not.toHaveBeenCalled();
    expect(m.sendMail).not.toHaveBeenCalled();
    st.baisse.mockResolvedValue({ priceId: "price_e", lookupKey: "rojer_essentiel_annuel", le: ECHEANCE });
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe)).toEqual({ envoyes: 1, echecs: 0 });
    expect(m.sendMail.mock.calls[0][0].text).toContain("(formule Essentiel)");
    // Une baisse planifiée à une autre date que cette échéance ne la change pas.
    m.sendMail.mockClear();
    st.baisse.mockResolvedValue({ priceId: "price_m", lookupKey: "rojer_pro_mensuel", le: new Date("2027-12-10T09:00:00Z") });
    await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe);
    expect(m.sendMail.mock.calls[0][0].text).toContain("(formule Pro)");
  });

  it("résilié chez le prestataire mais pas encore dans la copie : pas de rappel", async () => {
    m.findMany.mockResolvedValue([annuel()]);
    st.retrieve.mockResolvedValue({ id: "sub_2", schedule: null, cancel_at_period_end: true, cancel_at: null });
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe)).toEqual({ envoyes: 0, echecs: 0 });
    expect(m.sendMail).not.toHaveBeenCalled();
  });

  it("abonnement illisible chez le prestataire, ou sans client Stripe : rien ne part, rien n'est marqué, la passe suivante réessaie", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.findMany.mockResolvedValue([annuel()]);
    st.retrieve.mockRejectedValue(new Error("délai"));
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe)).toEqual({ envoyes: 0, echecs: 1 });
    expect(m.updateMany).not.toHaveBeenCalled();
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, null)).toEqual({ envoyes: 0, echecs: 0 });
  });

  it("rien n'est parti sur échec : la marque rendue est celle d'avant (l'échéance de l'an dernier), pas null", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const anDernier = new Date("2025-12-10T09:00:00Z");
    m.findMany.mockResolvedValue([annuel({ rappelRenouvellementPour: anDernier })]);
    m.sendMail.mockRejectedValue(new Error("panne"));
    await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe);
    expect(m.updateMany).toHaveBeenLastCalledWith({
      where: { id: "ab2", rappelRenouvellementPour: ECHEANCE },
      data: { rappelRenouvellementPour: anDernier },
    });
  });

  it("sans pilote d'envoi : rien n'est lu", async () => {
    m.enService.mockReturnValue(false);
    expect(await rappelerLeRenouvellementAnnuel(MAINTENANT, stripe)).toEqual({ envoyes: 0, echecs: 0, horsService: true });
    expect(m.findMany).not.toHaveBeenCalled();
  });

  it("une formule inconnue : le message ne nomme pas de formule", () => {
    expect(messageRenouvellementAnnuel("autre", ECHEANCE, "u").text).not.toContain("(formule ");
  });
});
