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

import { FENETRE_VEILLE_MS, messageVeilleFinEssai, rappelerLaVeilleDeLaFinDEssai } from "./rappels";

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
