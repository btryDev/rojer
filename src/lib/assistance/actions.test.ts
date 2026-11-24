import { beforeEach, describe, expect, it, vi } from "vitest";

// L'assistance (ADR-050, amendée le 2026-11-24) : ce que la demande envoie,
// ce qu'elle enregistre, et ce qu'elle refuse.

const h = vi.hoisted(() => ({
  consommer: vi.fn(async (): Promise<{ ok: true } | { ok: false; reessayerDansSecondes: number }> => ({ ok: true })),
  create: vi.fn(async () => ({ id: "d1" })),
  supprimer: vi.fn(async () => ({})),
  sendMail: vi.fn(async () => {}),
  envoiEnService: vi.fn(() => true),
  formule: vi.fn(async () => ({ pro: true, libelle: "Pro" })),
  requireEtablissement: vi.fn(async (id: string) => {
    if (id !== "e1") throw new Error("NEXT_NOT_FOUND");
    return { etablissement: { id: "e1", raisonDisplay: "Boulangerie Durand — Lyon 3e" } };
  }),
}));

vi.mock("@/lib/auth/compte", () => ({
  requireCompte: vi.fn(async () => ({
    user: { id: "u1", email: "m.durand@example.fr", name: "Marie Durand" },
    compte: { compteId: "c1", role: "owner" },
    db: { demandeAssistance: { create: h.create, delete: h.supprimer } },
  })),
}));
vi.mock("@/lib/abonnements/gel-saisie", () => ({ ouvrirAuGel: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "user-agent": "Mozilla/5.0 (Test)" })),
}));
vi.mock("@/lib/auth/scope", () => ({ requireEtablissement: h.requireEtablissement }));
vi.mock("@/lib/assistance/formule", () => ({ formuleDAssistance: h.formule }));
vi.mock("@/lib/contact/message", () => ({ CONTACT: "contact@rojer.test", ENVOI_IMPOSSIBLE: "Votre message n'a pas pu partir." }));
vi.mock("@/lib/securite/limite-debit", () => ({
  LIMITES: { assistanceCompte: { max: 10, fenetreSecondes: 86_400 } },
  cleLimite: (a: string, d: string, v: string) => `${a}:${d}:${v}`,
  consommer: h.consommer,
}));
vi.mock("@/lib/email", () => ({
  sendMail: h.sendMail,
  envoiEnService: h.envoiEnService,
  motifErreur: (e: unknown) => String(e),
}));

const { demanderAssistance } = await import("./actions");
const { TOUT_LE_COMPTE } = await import("./libelles");
const IDLE = { status: "idle" } as const;

function fd(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries({ categorie: "rapport", message: "Que faire ?", page: "/etablissements/e1", ...champs }))
    f.set(k, v);
  return f;
}
const ecrit = () => (h.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
const envoye = () => (h.sendMail.mock.calls[0] as unknown as [Record<string, string>])[0];

beforeEach(() => {
  vi.clearAllMocks();
  h.consommer.mockResolvedValue({ ok: true });
  h.envoiEnService.mockReturnValue(true);
  h.formule.mockResolvedValue({ pro: true, libelle: "Pro" });
});

describe("demanderAssistance", () => {
  it("envoie la demande à la boîte de Rojer, réponse à la personne, puis l'enregistre", async () => {
    const r = await demanderAssistance(IDLE, fd({ etablissementId: "e1", contexte: "BAES" }));
    expect(r).toEqual({ status: "success", email: "m.durand@example.fr" });
    expect(envoye()).toMatchObject({ to: "contact@rojer.test", replyTo: "m.durand@example.fr" });
    expect(envoye().subject).toContain("Un rapport de contrôle — Boulangerie Durand — Lyon 3e");
    expect(envoye().text).toContain("Que faire ?");
    // Une question de prévention n'emporte pas le navigateur.
    expect(envoye().text).not.toContain("Navigateur");
    expect(ecrit()).toMatchObject({
      compteId: "c1",
      userId: "u1",
      etablissementId: "e1",
      categorie: "rapport",
      message: "Que faire ?",
      contexte: "BAES",
      page: "/etablissements/e1",
    });
    expect(ecrit()).not.toHaveProperty("telephone");
  });

  it("un problème de l'application emporte le navigateur, pour le reproduire", async () => {
    await demanderAssistance(IDLE, fd({ categorie: "ecran" }));
    expect(envoye().text).toContain("Navigateur : Mozilla/5.0 (Test)");
  });

  it("une question de prévention demande la formule Pro ; un sujet de l'application, non", async () => {
    h.formule.mockResolvedValue({ pro: false, libelle: "Essentiel" });
    const refus = await demanderAssistance(IDLE, fd({ categorie: "duerp" }));
    expect(refus.status).toBe("error");
    expect(h.sendMail).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();

    expect((await demanderAssistance(IDLE, fd({ categorie: "ecran" }))).status).toBe("success");
    expect((await demanderAssistance(IDLE, fd({ categorie: "diagnostic" }))).status).toBe("success");
    expect(envoye().subject).toContain("[Assistance Rojer · Essentiel]");
  });

  it("sans établissement donné, celui de la page est retenu, s'il est du compte", async () => {
    await demanderAssistance(IDLE, fd({ page: "/etablissements/e1/modifier" }));
    expect(ecrit().etablissementId).toBe("e1");
    vi.clearAllMocks();
    await expect(demanderAssistance(IDLE, fd({ page: "/etablissements/autre/modifier" }))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("« Tout le compte » ne retient aucun établissement, pas même celui de la page", async () => {
    await demanderAssistance(IDLE, fd({ etablissementId: TOUT_LE_COMPTE, page: "/etablissements/e1/assistance" }));
    expect(ecrit().etablissementId).toBeNull();
    expect(envoye().subject).toMatch(/— tout le compte$/);
  });

  it("l'établissement d'un autre compte n'est ni envoyé ni écrit (404)", async () => {
    await expect(demanderAssistance(IDLE, fd({ etablissementId: "autre" }))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.sendMail).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
  });

  it("une page qui n'est pas un chemin de ce site n'est pas gardée", async () => {
    await demanderAssistance(IDLE, fd({ page: "https://ailleurs.example/x" }));
    expect(ecrit().page).toBe("");
  });

  it("un contexte trop long se tronque au lieu de rendre la demande impossible", async () => {
    const r = await demanderAssistance(IDLE, fd({ contexte: "x".repeat(400), page: "/" + "p".repeat(600) }));
    expect(r.status).toBe("success");
    expect((ecrit().contexte as string).length).toBe(300);
    expect(ecrit().page).toBe("");
  });

  it("refuse un message vide et un sujet inconnu", async () => {
    expect((await demanderAssistance(IDLE, fd({ message: "   " }))).status).toBe("error");
    expect((await demanderAssistance(IDLE, fd({ categorie: "pirate" }))).status).toBe("error");
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("au-delà du plafond du jour, rien ne part", async () => {
    h.consommer.mockResolvedValue({ ok: false, reessayerDansSecondes: 600 });
    expect((await demanderAssistance(IDLE, fd({}))).status).toBe("error");
    expect(h.consommer).toHaveBeenCalledWith([
      { cle: "assistance:compte:c1", limite: { max: 10, fenetreSecondes: 86_400 } },
    ]);
    expect(h.create).not.toHaveBeenCalled();
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("la ligne s'écrit avant l'envoi, et s'en va si l'envoi échoue", async () => {
    h.sendMail.mockRejectedValueOnce(new Error("Mailpace 500"));
    const r = await demanderAssistance(IDLE, fd({}));
    expect(r.status).toBe("error");
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(h.supprimer).toHaveBeenCalledWith({ where: { id: "d1" } });
  });

  it("sans envoi en service, rien ne s'écrit", async () => {
    h.envoiEnService.mockReturnValue(false);
    expect((await demanderAssistance(IDLE, fd({}))).status).toBe("error");
    expect(h.create).not.toHaveBeenCalled();
    expect(h.sendMail).not.toHaveBeenCalled();
  });
});
