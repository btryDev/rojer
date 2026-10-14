import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  rendu: vi.fn(async () => Buffer.from("%PDF-1.7 test")),
  liberer: vi.fn(),
  place: undefined as undefined | (() => Promise<unknown>),
}));

vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: h.rendu }));
vi.mock("@/lib/exports/limite", () => ({
  reserverPlaceExport: () => (h.place ? h.place() : Promise.resolve(h.liberer)),
}));

const { reponsePdf } = await import("./reponse");
const doc = {} as Parameters<typeof reponsePdf>[0];

beforeEach(() => {
  h.rendu.mockClear();
  h.liberer.mockClear();
  h.place = undefined;
});

describe("reponsePdf", () => {
  it("rend les trois en-têtes que les cinq routes écrivaient, et seulement eux", async () => {
    const r = await reponsePdf(doc, "Registre_securite_Le_Comptoir.pdf");
    expect(r.status).toBe(200);
    expect(Object.fromEntries(r.headers)).toEqual({
      "cache-control": "no-store",
      "content-disposition": 'inline; filename="Registre_securite_Le_Comptoir.pdf"',
      "content-type": "application/pdf",
    });
    expect(await r.text()).toBe("%PDF-1.7 test");
  });

  it("libère sa place après le rendu, y compris quand le rendu échoue", async () => {
    await reponsePdf(doc, "a.pdf");
    expect(h.liberer).toHaveBeenCalledTimes(1);
    h.rendu.mockRejectedValueOnce(new Error("mise en page"));
    await expect(reponsePdf(doc, "a.pdf")).rejects.toThrow("mise en page");
    expect(h.liberer).toHaveBeenCalledTimes(2);
  });

  it("file pleine : rend le 503 sans rien mettre en page", async () => {
    const sature = new Response("plein", { status: 503, headers: { "Retry-After": "5" } });
    h.place = async () => sature;
    const r = await reponsePdf(doc, "a.pdf");
    expect(r).toBe(sature);
    expect(h.rendu).not.toHaveBeenCalled();
  });
});
