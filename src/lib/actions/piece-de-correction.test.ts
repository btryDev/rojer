import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La pièce qui prouve la correction d'un point (ADR-048) : facultative,
 * réservée aux points à corriger, refusée sans stockage, validée comme le
 * fichier d'un rapport, et effacée si la base refuse.
 */
const h = vi.hoisted(() => ({
  action: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  stockageEnService: vi.fn(() => true),
  put: vi.fn(async () => {}),
  liberer: vi.fn(async () => ({ liberes: 1, echecs: 0 })),
  valider: vi.fn(
    async (): Promise<{ ok: true; mime: string; taille: number } | { ok: false; erreur: string }> => ({
      ok: true,
      mime: "application/pdf",
      taille: 4,
    }),
  ),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { action: h.action, rapportVerification: { findFirst: vi.fn() } } }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "u1" })),
  getOptionalUser: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/etablissements/epi-constate", () => ({ constaterEpi: vi.fn(async () => false) }));
vi.mock("@/lib/suppression/fichiers", () => ({ libererFichiers: h.liberer }));
vi.mock("@/lib/rapports/validator", () => ({ validerFichier: h.valider }));
vi.mock("@/lib/storage", () => ({
  stockageEnService: h.stockageEnService,
  getStorage: () => ({ put: h.put }),
  clePieceDePoint: (e: string, a: string, n: string) => `points/${e}/${a}-${n}`,
  MESSAGE_DEPOT_NON_CONFIGURE: "stockage absent",
  MESSAGE_ECHEC_ENREGISTREMENT: "écriture impossible",
}));

const { cloturerAction } = await import("./plan");

const POINT = { id: "a1", etablissementId: "e1", verificationId: "v1", risqueId: null, equipementId: null, statut: "ouverte" };

function formulaire(avecPiece: boolean): FormData {
  const fd = new FormData();
  fd.set("commentaire", "BAES remplacé par l'électricien");
  if (avecPiece) fd.set("piece", new File(["%PDF"], "facture.pdf", { type: "application/pdf" }));
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.action.findFirst.mockResolvedValue(POINT);
  h.action.update.mockResolvedValue({});
  h.stockageEnService.mockReturnValue(true);
});

describe("cloturerAction — la pièce d'un point corrigé", () => {
  it("sans pièce : corrige, sans rien écrire au stockage", async () => {
    const r = await cloturerAction("a1", { status: "idle" }, formulaire(false));
    expect(r.status).toBe("success");
    expect(h.put).not.toHaveBeenCalled();
    expect(h.action.update.mock.calls[0][0].data.leveeFichierCle).toBeUndefined();
  });

  it("avec pièce : la valide, l'écrit, puis l'enregistre", async () => {
    const r = await cloturerAction("a1", { status: "idle" }, formulaire(true));
    expect(r.status).toBe("success");
    expect(h.valider).toHaveBeenCalled();
    expect(h.put).toHaveBeenCalledWith("points/e1/a1-facture.pdf", expect.any(Buffer), "application/pdf");
    expect(h.action.update.mock.calls[0][0].data).toMatchObject({
      leveeFichierCle: "points/e1/a1-facture.pdf",
      leveeFichierNom: "facture.pdf",
      leveeFichierMime: "application/pdf",
      leveeFichierTaille: 4,
    });
  });

  it("refuse une pièce sur une mesure du DUERP", async () => {
    h.action.findFirst.mockResolvedValue({ ...POINT, verificationId: null, risqueId: "r1" });
    const r = await cloturerAction("a1", { status: "idle" }, formulaire(true));
    expect(r.status).toBe("error");
    expect(h.put).not.toHaveBeenCalled();
    expect(h.action.update).not.toHaveBeenCalled();
  });

  it("refuse une pièce quand le stockage n'est pas configuré", async () => {
    h.stockageEnService.mockReturnValue(false);
    const r = await cloturerAction("a1", { status: "idle" }, formulaire(true));
    expect(r).toMatchObject({ status: "error", message: "stockage absent" });
    expect(h.action.update).not.toHaveBeenCalled();
  });

  it("refuse un fichier que la validation rejette", async () => {
    h.valider.mockResolvedValueOnce({ ok: false, erreur: "Type de fichier refusé" });
    const r = await cloturerAction("a1", { status: "idle" }, formulaire(true));
    expect(r.status).toBe("error");
    expect(h.put).not.toHaveBeenCalled();
  });

  it("libère la pièce si la base refuse l'écriture", async () => {
    h.action.update.mockRejectedValue(new Error("base indisponible"));
    await expect(cloturerAction("a1", { status: "idle" }, formulaire(true))).rejects.toThrow("base indisponible");
    expect(h.liberer).toHaveBeenCalledWith(["points/e1/a1-facture.pdf"], "points/correction");
  });
});
