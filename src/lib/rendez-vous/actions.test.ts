import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Le prestataire attitré et le rendez-vous d'un contrôle (ADR-049) : ce que
// l'action écrit, et ce qu'elle refuse.

const h = vi.hoisted(() => ({
  ligne: {
    id: "v1",
    etablissementId: "e1",
    archiveLe: null as Date | null,
    salarieId: null as string | null,
    rendezVousLe: null as Date | null,
  },
  update: vi.fn(async () => ({ count: 1 })),
  // La ligne existe-t-elle encore après un P2025 ? 0 : supprimée entre-temps.
  count: vi.fn(async () => 0),
  resoudre: vi.fn(async (_e: string, id: string | null | undefined) =>
    !id ? { ok: true as const, id: null } : id === "presta-e1" ? { ok: true as const, id } : { ok: false as const },
  ),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { verification: { update: h.update, count: h.count } } }));
vi.mock("@/lib/auth/scope", async () => {
  // La garde rend le client borné (ADR-051) : ici, le client simulé.
  const { prisma } = await import("@/lib/prisma");
  return {
    requireVerification: vi.fn(async () => ({ db: prisma, verification: h.ligne, etablissementId: "e1" })),
  };
});
vi.mock("@/lib/prestataires/queries", () => ({ resoudrePrestataireOptionnel: h.resoudre }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { enregistrerSuiviControle } = await import("./actions");

function fd(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
}
const IDLE = { status: "idle" } as const;
const data = () => (h.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;

beforeEach(() => {
  vi.clearAllMocks();
  // Les bornes de date se lisent sur l'horloge : on la fixe.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-24T10:00:00Z"));
  h.ligne.archiveLe = null;
  h.ligne.salarieId = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("enregistrerSuiviControle", () => {
  it("écrit le prestataire, le rendez-vous (heure de Paris) et la note", async () => {
    const r = await enregistrerSuiviControle(
      "v1",
      IDLE,
      fd({ prestataireId: "presta-e1", rendezVousLe: "2026-11-12T09:30", rendezVousNote: "accès par la cour" }),
    );
    expect(r.status).toBe("success");
    expect(data()).toMatchObject({ prestataireId: "presta-e1", rendezVousNote: "accès par la cour" });
    expect((data().rendezVousLe as Date).toISOString()).toBe("2026-11-12T08:30:00.000Z");
  });

  it("une ligne supprimée entre la garde et l'écriture : l'action aboutit, comme avec l'ancien updateMany", async () => {
    const { Prisma } = await import("@prisma/client");
    h.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("introuvable", { code: "P2025", clientVersion: "6" }),
    );
    const r = await enregistrerSuiviControle("v1", IDLE, fd({ prestataireId: "presta-e1" }));
    expect(r.status).toBe("success");
  });

  it("le prestataire disparu entre sa résolution et l'écriture : erreur, pas « Enregistré »", async () => {
    const { Prisma } = await import("@prisma/client");
    h.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("introuvable", { code: "P2025", clientVersion: "6" }),
    );
    // La ligne est toujours là : c'est le `connect` borné du prestataire qui a échoué.
    h.count.mockResolvedValueOnce(1);
    const r = await enregistrerSuiviControle("v1", IDLE, fd({ prestataireId: "presta-e1" }));
    expect(r).toEqual({ status: "error", message: "Prestataire introuvable" });
  });

  it("une autre erreur de la base remonte", async () => {
    h.update.mockRejectedValueOnce(new Error("base indisponible"));
    await expect(enregistrerSuiviControle("v1", IDLE, fd({ prestataireId: "presta-e1" }))).rejects.toThrow(
      "base indisponible",
    );
  });

  it("refuse le prestataire d'un autre établissement, sans rien écrire", async () => {
    const r = await enregistrerSuiviControle("v1", IDLE, fd({ prestataireId: "presta-autre" }));
    expect(r.status).toBe("error");
    expect(h.update).not.toHaveBeenCalled();
  });

  it("des champs vidés retirent prestataire et rendez-vous ; une note sans rendez-vous ne s'écrit pas", async () => {
    await enregistrerSuiviControle("v1", IDLE, fd({ prestataireId: "", rendezVousLe: "", rendezVousNote: "orpheline" }));
    expect(data()).toEqual({ prestataireId: null, rendezVousLe: null, rendezVousNote: null });
  });

  it("refuse une date absurde (plus d'un mois passé, plus de deux ans d'ici), accepte une date gênante", async () => {
    expect((await enregistrerSuiviControle("v1", IDLE, fd({ rendezVousLe: "2026-09-01T09:00" }))).status).toBe("error");
    expect((await enregistrerSuiviControle("v1", IDLE, fd({ rendezVousLe: "2029-01-01T09:00" }))).status).toBe("error");
    expect(h.update).not.toHaveBeenCalled();
    // Après l'échéance ou très en avance : accepté, l'écran le signale.
    expect((await enregistrerSuiviControle("v1", IDLE, fd({ rendezVousLe: "2028-06-01T09:00" }))).status).toBe("success");
  });

  it("un rendez-vous déjà enregistré, même manqué depuis longtemps, ne bloque pas la modification", async () => {
    Object.assign(h.ligne, { rendezVousLe: new Date("2026-09-01T07:00:00Z") });
    const r = await enregistrerSuiviControle("v1", IDLE, fd({ prestataireId: "presta-e1", rendezVousLe: "2026-09-01T09:00" }));
    expect(r.status).toBe("success");
    Object.assign(h.ligne, { rendezVousLe: null });
  });

  it("refuse une date-heure qui n'existe pas", async () => {
    const r = await enregistrerSuiviControle("v1", IDLE, fd({ rendezVousLe: "2026-02-30T09:00" }));
    expect(r.status).toBe("error");
    expect(h.update).not.toHaveBeenCalled();
  });

  it("refuse une ligne éteinte et l'échéance d'une personne", async () => {
    h.ligne.archiveLe = new Date();
    expect((await enregistrerSuiviControle("v1", IDLE, fd({}))).status).toBe("error");
    h.ligne.archiveLe = null;
    h.ligne.salarieId = "s1";
    expect((await enregistrerSuiviControle("v1", IDLE, fd({}))).status).toBe("error");
    expect(h.update).not.toHaveBeenCalled();
  });
});
