import { beforeEach, describe, expect, it, vi } from "vitest";

// Le prestataire attitré et le rendez-vous d'un contrôle (ADR-049) : ce que
// l'action écrit, et ce qu'elle refuse.

const h = vi.hoisted(() => ({
  ligne: { id: "v1", etablissementId: "e1", archiveLe: null as Date | null, salarieId: null as string | null },
  updateMany: vi.fn(async () => ({ count: 1 })),
  resoudre: vi.fn(async (_e: string, id: string | null | undefined) =>
    !id ? { ok: true as const, id: null } : id === "presta-e1" ? { ok: true as const, id } : { ok: false as const },
  ),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { verification: { updateMany: h.updateMany } } }));
vi.mock("@/lib/auth/scope", () => ({
  requireVerification: vi.fn(async () => ({ verification: h.ligne, etablissementId: "e1" })),
}));
vi.mock("@/lib/prestataires/queries", () => ({ resoudrePrestataireOptionnel: h.resoudre }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { enregistrerSuiviControle } = await import("./actions");

function fd(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
}
const IDLE = { status: "idle" } as const;
const data = () => (h.updateMany.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;

beforeEach(() => {
  vi.clearAllMocks();
  h.ligne.archiveLe = null;
  h.ligne.salarieId = null;
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

  it("refuse le prestataire d'un autre établissement, sans rien écrire", async () => {
    const r = await enregistrerSuiviControle("v1", IDLE, fd({ prestataireId: "presta-autre" }));
    expect(r.status).toBe("error");
    expect(h.updateMany).not.toHaveBeenCalled();
  });

  it("des champs vidés retirent prestataire et rendez-vous ; une note sans rendez-vous ne s'écrit pas", async () => {
    await enregistrerSuiviControle("v1", IDLE, fd({ prestataireId: "", rendezVousLe: "", rendezVousNote: "orpheline" }));
    expect(data()).toEqual({ prestataireId: null, rendezVousLe: null, rendezVousNote: null });
  });

  it("refuse une date-heure qui n'existe pas", async () => {
    const r = await enregistrerSuiviControle("v1", IDLE, fd({ rendezVousLe: "2026-02-30T09:00" }));
    expect(r.status).toBe("error");
    expect(h.updateMany).not.toHaveBeenCalled();
  });

  it("refuse une ligne éteinte et l'échéance d'une personne", async () => {
    h.ligne.archiveLe = new Date();
    expect((await enregistrerSuiviControle("v1", IDLE, fd({}))).status).toBe("error");
    h.ligne.archiveLe = null;
    h.ligne.salarieId = "s1";
    expect((await enregistrerSuiviControle("v1", IDLE, fd({}))).status).toBe("error");
    expect(h.updateMany).not.toHaveBeenCalled();
  });
});
