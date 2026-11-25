import { beforeEach, describe, expect, it, vi } from "vitest";

// Le rendez-vous annuel (ADR-063) : réserver, déplacer, annuler — ce que
// l'action écrit, ce qu'elle envoie, et ce qu'elle refuse.

const CRENEAU = "4b7a1c1e-0000-4000-8000-000000000001";
const DEBUT = new Date("2026-12-02T08:00:00Z");
const FIN = new Date("2026-12-02T09:00:00Z");

const h = vi.hoisted(() => ({
  verifierSaisie: vi.fn(async () => "c1"),
  ligne: vi.fn(async () => ({ statut: "active", formule: "rojer_pro_annuel", debutPayantLe: new Date("2026-03-01T00:00:00Z") })),
  pro: vi.fn(() => true),
  verrou: vi.fn(async () => {}),
  prendre: vi.fn(),
  estPris: vi.fn(async () => true),
  rendre: vi.fn(async () => {}),
  trouver: vi.fn(),
  creer: vi.fn(async () => ({ id: "r9" })),
  modifier: vi.fn(async () => ({})),
  sendMail: vi.fn(async () => {}),
  consommer: vi.fn(async (): Promise<{ ok: true } | { ok: false; reessayerDansSecondes: number }> => ({ ok: true })),
  envoiEnService: vi.fn(() => true),
  revalidatePath: vi.fn(),
  /** Les transactions validées : une transaction qui lève n'y entre pas (elle est défaite). */
  valides: 0,
  requireEtablissement: vi.fn(async (id: string) => {
    if (id !== "e1") throw new Error("NEXT_NOT_FOUND");
    return {};
  }),
}));

const tx = {
  rendezVousAssistance: { findFirst: h.trouver, create: h.creer, update: h.modifier },
};

vi.mock("@/lib/auth/compte", () => ({
  requireCompte: vi.fn(async () => ({
    user: { id: "u1", email: "m.durand@example.fr", name: "Marie Durand" },
    compte: { compteId: "c1", role: "owner" },
    db: {
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
        const r = await fn(tx);
        h.valides++;
        return r;
      },
    },
  })),
}));
vi.mock("@/lib/auth/scope", () => ({ requireEtablissement: h.requireEtablissement }));
vi.mock("@/lib/abonnements/saisie", () => ({ verifierSaisie: h.verifierSaisie, ligneAbonnementDuCompte: h.ligne }));
vi.mock("@/lib/abonnements/assistance", () => ({ assistanceProOuverte: h.pro }));
vi.mock("@/lib/abonnements/quotas", async (orig) => ({
  ...(await orig<typeof import("@/lib/abonnements/quotas")>()),
  verrouillerLeCompte: h.verrou,
}));
vi.mock("./creneaux", () => ({ prendreLeCreneau: h.prendre, rendreLeCreneau: h.rendre, creneauEstPris: h.estPris }));
vi.mock("@/lib/contact/message", () => ({ CONTACT: "contact@rojer.test" }));
vi.mock("@/lib/securite/limite-debit", () => ({
  LIMITES: { rendezVousCompte: { max: 10, fenetreSecondes: 86_400 } },
  cleLimite: (a: string, d: string, v: string) => `${a}:${d}:${v}`,
  consommer: h.consommer,
  messageTropDeTentatives: () => "Trop de tentatives en peu de temps.",
}));
vi.mock("@/lib/email", () => ({
  sendMail: h.sendMail,
  envoiEnService: h.envoiEnService,
  publicAppUrl: () => "https://rojer.test",
  motifErreur: (e: unknown) => String(e),
}));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));

const { reserverRendezVous, annulerRendezVous, completerRendezVous } = await import("./rendez-vous-actions");
const L = await import("./rendez-vous-libelles");
const IDLE = { status: "idle" } as const;

/** « Maintenant » : le 2026-11-24 à 16 h UTC, plus de 24 h avant le créneau. */
const MAINTENANT = new Date("2026-11-24T16:00:00Z");

function fd(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries({ creneauId: CRENEAU, mode: "telephone", telephone: "06 12 34 56 78", etablissementId: "e1", ...champs }))
    f.set(k, v);
  return f;
}
const mail = (i: number) => (h.sendMail.mock.calls[i] as unknown as [Record<string, string>])[0];

beforeEach(() => {
  vi.clearAllMocks();
  h.valides = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MAINTENANT);
  h.pro.mockReturnValue(true);
  h.envoiEnService.mockReturnValue(true);
  h.prendre.mockResolvedValue({ id: CRENEAU, debut: DEBUT, fin: FIN });
  h.trouver.mockResolvedValue(null);
  h.sendMail.mockResolvedValue(undefined);
  h.consommer.mockResolvedValue({ ok: true });
});

describe("reserverRendezVous", () => {
  it("prend le créneau sous le verrou du compte, enregistre, prévient l'équipe puis la personne", async () => {
    const r = await reserverRendezVous(IDLE, fd({ sujet: "La commission de mars" }));
    expect(r).toEqual({ status: "success", evenement: "reserve", email: "m.durand@example.fr", confirmation: true });
    expect(h.valides).toBe(1);
    expect(h.verifierSaisie).toHaveBeenCalled();
    expect(h.verrou).toHaveBeenCalledWith(tx, "c1");
    // Le créneau se prend dans le mois qui vient, à plus de 24 h de maintenant.
    expect(h.prendre).toHaveBeenCalledWith(tx, CRENEAU, {
      depuis: new Date("2026-11-25T16:00:00Z"),
      jusqua: new Date("2026-12-24T16:00:00Z"),
    });
    expect(h.creer).toHaveBeenCalledWith({
      data: {
        compteId: "c1",
        userId: "u1",
        creneauId: CRENEAU,
        debut: DEBUT,
        fin: FIN,
        mode: "telephone",
        telephone: "06 12 34 56 78",
        sujet: "La commission de mars",
      },
      select: { id: true },
    });
    expect(mail(0)).toMatchObject({ to: "contact@rojer.test", replyTo: "m.durand@example.fr" });
    expect(mail(0).subject).toContain("Rendez-vous réservé");
    expect(mail(1).to).toBe("m.durand@example.fr");
    expect(mail(1).text).toContain("https://rojer.test/etablissements/e1/assistance?onglet=rendez-vous");
    // L'invitation pour l'agenda est jointe à la confirmation.
    const pj = (h.sendMail.mock.calls[1] as unknown as [{ attachments: { name: string; content: string }[] }])[0].attachments;
    expect(pj[0].name).toBe("rendez-vous-rojer.ics");
    expect(Buffer.from(pj[0].content, "base64").toString("utf8")).toContain("DTSTART:20261202T080000Z");
  });

  it("cherche un autre rendez-vous dans l'année d'abonnement du créneau, depuis l'anniversaire du premier paiement", async () => {
    await reserverRendezVous(IDLE, fd({}));
    expect(h.trouver).toHaveBeenCalledWith({
      where: {
        annuleLe: null,
        debut: { gte: new Date("2026-03-01T00:00:00Z"), lt: new Date("2027-03-01T00:00:00Z") },
      },
      select: { id: true },
    });
  });

  it("en visio, le numéro est un secours, facultatif", async () => {
    await reserverRendezVous(IDLE, fd({ mode: "visio" }));
    expect((h.creer.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data).toMatchObject({
      mode: "visio",
      telephone: "06 12 34 56 78",
    });
    await reserverRendezVous(IDLE, fd({ mode: "visio", telephone: "" }));
    expect((h.creer.mock.calls[1] as unknown as [{ data: Record<string, unknown> }])[0].data).toMatchObject({
      mode: "visio",
      telephone: null,
    });
  });

  it("un numéro qui ne se lit pas est refusé", async () => {
    const r = await reserverRendezVous(IDLE, fd({ telephone: "appelez-moi" }));
    expect(r.status === "error" && r.fieldErrors?.telephone).toBeTruthy();
  });

  it("au téléphone, exige un numéro", async () => {
    const r = await reserverRendezVous(IDLE, fd({ telephone: "" }));
    expect(r.status === "error" && r.fieldErrors?.telephone).toBeTruthy();
    expect(h.prendre).not.toHaveBeenCalled();
  });

  it("refuse sans la formule Pro, avant toute écriture", async () => {
    h.pro.mockReturnValue(false);
    expect(await reserverRendezVous(IDLE, fd({}))).toEqual({ status: "error", message: L.MESSAGE_RENDEZ_VOUS_PRO });
    expect(h.verrou).not.toHaveBeenCalled();
  });

  it("refuse l'établissement d'un autre compte (404)", async () => {
    await expect(reserverRendezVous(IDLE, fd({ etablissementId: "autre" }))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.prendre).not.toHaveBeenCalled();
  });

  it("dit qu'un créneau pris entre-temps l'est, sans rien écrire ni envoyer, et relit la page", async () => {
    h.prendre.mockResolvedValue(null);
    expect(await reserverRendezVous(IDLE, fd({}))).toEqual({
      status: "error",
      message: L.MESSAGE_CRENEAU_PRIS,
      code: "creneau",
    });
    expect(h.creer).not.toHaveBeenCalled();
    expect(h.sendMail).not.toHaveBeenCalled();
    expect(h.revalidatePath).toHaveBeenCalled();
  });

  it("un créneau encore libre mais sorti de la fenêtre n'est pas dit « pris »", async () => {
    h.prendre.mockResolvedValue(null);
    h.estPris.mockResolvedValueOnce(false);
    expect(await reserverRendezVous(IDLE, fd({}))).toEqual({
      status: "error",
      message: L.MESSAGE_CRENEAU_HORS_FENETRE,
      code: "creneau",
    });
  });

  it("au-delà de dix gestes par jour pour le compte, refuse avant toute écriture", async () => {
    h.consommer.mockResolvedValueOnce({ ok: false, reessayerDansSecondes: 600 });
    expect(await reserverRendezVous(IDLE, fd({}))).toEqual({ status: "error", message: "Trop de tentatives en peu de temps." });
    expect(h.consommer).toHaveBeenCalledWith([
      { cle: "rendez-vous:compte:c1", limite: { max: 10, fenetreSecondes: 86_400 } },
    ]);
    expect(h.verrou).not.toHaveBeenCalled();
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("un créneau devenu imprenable revient avec le code qui ramène au choix du créneau", async () => {
    h.prendre.mockResolvedValue(null);
    const r = await reserverRendezVous(IDLE, fd({}));
    expect(r).toMatchObject({ status: "error", code: "creneau" });
  });

  it("un seul rendez-vous par année : un autre non annulé dans l'année refuse", async () => {
    // Passé (pas « à venir »), mais dans l'année du créneau.
    h.trouver.mockImplementation(async ({ where }: { where: { debut?: unknown } }) => (where.debut ? { id: "r0" } : null));
    expect(await reserverRendezVous(IDLE, fd({}))).toEqual({ status: "error", message: L.MESSAGE_ANNEE_PRISE });
    expect(h.creer).not.toHaveBeenCalled();
  });

  it("si l'équipe n'est pas prévenue, rien n'est réservé (la transaction est défaite) et la personne n'a rien", async () => {
    h.sendMail.mockRejectedValueOnce(new Error("panne"));
    expect(await reserverRendezVous(IDLE, fd({}))).toEqual({ status: "error", message: L.MESSAGE_ECHEC.reserver });
    expect(h.valides).toBe(0);
    expect(h.sendMail).toHaveBeenCalledTimes(1);
  });

  it("un rendez-vous déjà à venir pour le compte : une seconde réservation est refusée, même sur l'année suivante", async () => {
    h.trouver.mockImplementation(async ({ where }: { where: { fin?: unknown } }) => (where.fin ? { id: "r0" } : null));
    expect(await reserverRendezVous(IDLE, fd({}))).toEqual({ status: "error", message: L.MESSAGE_DEJA_A_VENIR });
    expect(h.trouver).toHaveBeenCalledWith({ where: { annuleLe: null, fin: { gt: MAINTENANT } }, select: { id: true } });
    expect(h.creer).not.toHaveBeenCalled();
  });

  it("la confirmation à la personne échoue : la réservation tient, l'écran ne dit pas qu'elle est partie", async () => {
    h.sendMail.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("panne"));
    expect(await reserverRendezVous(IDLE, fd({}))).toMatchObject({ status: "success", confirmation: false });
    expect(h.valides).toBe(1);
  });

  it("déplace le rendez-vous à venir : le nouveau créneau pris, l'ancien rendu", async () => {
    const ancien = {
      id: "r1",
      creneauId: "ancien",
      debut: new Date("2026-11-30T08:00:00Z"),
      fin: new Date("2026-11-30T09:00:00Z"),
    };
    h.trouver.mockImplementation(async ({ where }: { where: { id?: string } }) => (where.id === "r1" ? ancien : null));
    const r = await reserverRendezVous(IDLE, fd({ remplace: "r1" }));
    expect(r).toEqual({ status: "success", evenement: "deplace", email: "m.durand@example.fr", confirmation: true });
    expect(h.modifier).toHaveBeenCalledWith({ where: { id: "r1" }, data: expect.objectContaining({ creneauId: CRENEAU }) });
    expect(h.rendre).toHaveBeenCalledWith(tx, "ancien");
    expect(h.creer).not.toHaveBeenCalled();
    // L'année ne compte pas le rendez-vous qu'on déplace.
    expect(h.trouver).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ NOT: { id: "r1" } }) }));
    expect(mail(0).subject).toContain("Rendez-vous déplacé");
  });

  it("à moins de 24 h, ne déplace plus", async () => {
    h.trouver.mockResolvedValue({ id: "r1", creneauId: "ancien", debut: new Date("2026-11-25T08:00:00Z"), fin: FIN });
    expect(await reserverRendezVous(IDLE, fd({ remplace: "r1" }))).toEqual({ status: "error", message: L.MESSAGE_MOINS_DE_24H });
    expect(h.prendre).not.toHaveBeenCalled();
  });
});

describe("completerRendezVous", () => {
  const rdv = { id: "r1", creneauId: CRENEAU, debut: DEBUT, fin: FIN, mode: "visio", telephone: null, sujet: null };
  const completer = (sujet: string) => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ rendezVousId: "r1", etablissementId: "e1", sujet })) f.set(k, v);
    return f;
  };

  it("enregistre ce qui est à aborder et le transmet à l'équipe", async () => {
    h.trouver.mockResolvedValue(rdv);
    expect(await completerRendezVous(IDLE, completer("Le plan d'actions"))).toEqual({
      status: "success",
      evenement: "complete",
      email: "m.durand@example.fr",
      confirmation: false,
    });
    // Sous le verrou du compte, comme les autres gestes.
    expect(h.verrou).toHaveBeenCalledWith(tx, "c1");
    expect(h.modifier).toHaveBeenCalledWith({ where: { id: "r1" }, data: { sujet: "Le plan d'actions" } });
    expect(mail(0).subject).toContain("Rendez-vous à préparer");
  });

  it("rien de changé : rien n'est écrit ni transmis", async () => {
    h.trouver.mockResolvedValue({ ...rdv, sujet: "Le plan d'actions" });
    expect((await completerRendezVous(IDLE, completer("Le plan d'actions"))).status).toBe("success");
    expect(h.modifier).not.toHaveBeenCalled();
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("si l'équipe n'est pas prévenue, rien n'est écrit, et l'écran dit que le texte est conservé", async () => {
    h.trouver.mockResolvedValue(rdv);
    h.sendMail.mockRejectedValueOnce(new Error("panne"));
    expect(await completerRendezVous(IDLE, completer("x"))).toEqual({ status: "error", message: L.MESSAGE_ECHEC.completer });
    expect(h.valides).toBe(0);
  });

  it("demande la formule Pro", async () => {
    h.pro.mockReturnValue(false);
    expect(await completerRendezVous(IDLE, completer("x"))).toEqual({ status: "error", message: L.MESSAGE_RENDEZ_VOUS_PRO });
    expect(h.modifier).not.toHaveBeenCalled();
  });

  it("à moins de 24 h, ne se complète plus", async () => {
    h.trouver.mockResolvedValue({ ...rdv, debut: new Date("2026-11-25T08:00:00Z") });
    expect(await completerRendezVous(IDLE, completer("x"))).toEqual({ status: "error", message: L.MESSAGE_MOINS_DE_24H });
    expect(h.modifier).not.toHaveBeenCalled();
  });
});

describe("annulerRendezVous", () => {
  const rdv = { id: "r1", creneauId: CRENEAU, debut: DEBUT, fin: FIN, mode: "visio", telephone: null, sujet: null };
  const annulation = (champs: Record<string, string> = {}) => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ rendezVousId: "r1", etablissementId: "e1", ...champs })) f.set(k, v);
    return f;
  };

  it("annule, rend le créneau, prévient l'équipe et la personne", async () => {
    h.trouver.mockResolvedValue(rdv);
    const r = await annulerRendezVous(IDLE, annulation());
    expect(r).toEqual({ status: "success", evenement: "annule", email: "m.durand@example.fr", confirmation: true });
    // L'annulation a son propre compteur : des gestes refusés ne la bloquent pas.
    expect(h.consommer).toHaveBeenCalledWith([
      { cle: "rendez-vous-annulation:compte:c1", limite: { max: 10, fenetreSecondes: 86_400 } },
    ]);
    expect(h.modifier).toHaveBeenCalledWith({ where: { id: "r1" }, data: { annuleLe: MAINTENANT } });
    expect(h.rendre).toHaveBeenCalledWith(tx, CRENEAU);
    expect(mail(0).subject).toContain("Rendez-vous annulé");
    expect(mail(1).to).toBe("m.durand@example.fr");
    // L'annulation joint de quoi retirer l'événement de l'agenda.
    const pj = (h.sendMail.mock.calls[1] as unknown as [{ attachments: { content: string; contentType: string }[] }])[0]
      .attachments[0];
    expect(pj.contentType).toContain("method=CANCEL");
    expect(Buffer.from(pj.content, "base64").toString("utf8")).toContain("STATUS:CANCELLED");
  });

  it("ne demande pas la formule Pro : un compte qui l'a perdue rend encore son créneau", async () => {
    h.pro.mockReturnValue(false);
    h.trouver.mockResolvedValue(rdv);
    expect((await annulerRendezVous(IDLE, annulation())).status).toBe("success");
  });

  it("si l'équipe n'est pas prévenue, rien n'est annulé", async () => {
    h.trouver.mockResolvedValue(rdv);
    h.sendMail.mockRejectedValueOnce(new Error("panne"));
    expect(await annulerRendezVous(IDLE, annulation())).toEqual({ status: "error", message: L.MESSAGE_ECHEC.annuler });
    expect(h.valides).toBe(0);
  });

  it("à moins de 24 h, n'annule plus", async () => {
    h.trouver.mockResolvedValue({ ...rdv, debut: new Date("2026-11-25T08:00:00Z") });
    expect(await annulerRendezVous(IDLE, annulation())).toEqual({ status: "error", message: L.MESSAGE_MOINS_DE_24H });
    expect(h.modifier).not.toHaveBeenCalled();
    expect(h.rendre).not.toHaveBeenCalled();
  });

  it("un rendez-vous introuvable (autre compte, déjà annulé) ne fait rien", async () => {
    h.trouver.mockResolvedValue(null);
    expect(await annulerRendezVous(IDLE, annulation())).toEqual({
      status: "error",
      message: L.MESSAGE_RENDEZ_VOUS_INTROUVABLE,
    });
    expect(h.sendMail).not.toHaveBeenCalled();
  });
});
