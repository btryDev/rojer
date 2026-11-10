import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DemandePdf } from "./documents";

const h = vi.hoisted(() => ({
  rendu: vi.fn<(demande: unknown) => Promise<Buffer>>(async () => Buffer.from("%PDF-1.7 test")),
  controle: vi.fn<(demande: unknown) => unknown>(() => ({ total: 1, plusGrosBloc: 1 })),
  reserve: vi.fn(),
  liberer: vi.fn(),
  place: undefined as undefined | (() => Promise<unknown>),
}));

// `controlerPoids` et `mettreEnPage` sont simulés ; la classe d'erreur et le
// message restent les vrais.
vi.mock("./rendre", async (importOriginal) => {
  const vrai = await importOriginal<typeof import("./rendre")>();
  return { ...vrai, mettreEnPage: h.rendu, controlerPoids: h.controle };
});
vi.mock("@/lib/exports/limite", () => ({
  reserverPlaceExport: () => {
    h.reserve();
    return h.place ? h.place() : Promise.resolve(h.liberer);
  },
}));

const { reponsePdf } = await import("./reponse");
const { PdfTropVolumineux } = await import("./rendre");
const demande = { type: "registre", props: { data: {} } } as unknown as DemandePdf;

beforeEach(() => {
  h.rendu.mockClear();
  h.liberer.mockClear();
  h.controle.mockClear();
  h.reserve.mockClear();
  h.place = undefined;
});

describe("reponsePdf", () => {
  it("rend les trois en-têtes que les routes écrivaient, et seulement eux", async () => {
    const r = await reponsePdf(demande, "Registre_securite_Le_Comptoir.pdf", "u-1");
    expect(r.status).toBe(200);
    expect(Object.fromEntries(r.headers)).toEqual({
      "cache-control": "no-store",
      "content-disposition": 'inline; filename="Registre_securite_Le_Comptoir.pdf"',
      "content-type": "application/pdf",
    });
    expect(await r.text()).toBe("%PDF-1.7 test");
    expect(h.rendu).toHaveBeenCalledWith(demande, { total: 1, plusGrosBloc: 1 });
  });

  it("libère sa place après le rendu, y compris quand le rendu échoue", async () => {
    await reponsePdf(demande, "a.pdf", "u-1");
    expect(h.liberer).toHaveBeenCalledTimes(1);
    h.rendu.mockRejectedValueOnce(new Error("mise en page"));
    await expect(reponsePdf(demande, "a.pdf", "u-1")).rejects.toThrow("mise en page");
    expect(h.liberer).toHaveBeenCalledTimes(2);
  });

  it("file pleine : rend le 503 sans rien mettre en page", async () => {
    const sature = new Response("plein", { status: 503, headers: { "Retry-After": "5" } });
    h.place = async () => sature;
    const r = await reponsePdf(demande, "a.pdf", "u-1");
    expect(r).toBe(sature);
    expect(h.rendu).not.toHaveBeenCalled();
  });

  it("trop volumineux : refusé AVANT la file d'export, sans place prise ni rendu", async () => {
    h.controle.mockImplementationOnce(() => {
      throw new PdfTropVolumineux("dossier-conformite", { total: 9_999, plusGrosBloc: 10 });
    });
    const r = await reponsePdf(demande, "a.pdf", "u-1");
    expect(r.status).toBe(503);
    expect(r.headers.get("Retry-After")).toBeNull();
    expect(await r.text()).toMatch(/^Le dossier de conformité est trop volumineux/);
    expect(h.reserve).not.toHaveBeenCalled();
    expect(h.rendu).not.toHaveBeenCalled();
  });
});
