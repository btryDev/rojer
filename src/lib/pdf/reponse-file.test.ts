// Après un refus du garde-fou, la place d'export est rendue : avec la VRAIE
// file (`exports/limite.ts` : une place, deux par demandeur), une place
// perdue ferait attendre puis refuser les exports suivants (429 ou 503
// « Trop d'exports »). Lot pdf-b0, relecture du 2026-11-10.

import { describe, expect, it, vi } from "vitest";
import type { DemandePdf } from "./documents";

const h = vi.hoisted(() => ({
  controle: vi.fn<(demande: unknown) => unknown>(),
  rendu: vi.fn<(demande: unknown, poids: unknown) => Promise<Buffer>>(async () => Buffer.from("%PDF")),
}));
// La pesée et la mise en page sont simulées ; la file d'export est la vraie.
vi.mock("./rendre", async (importOriginal) => {
  const vrai = await importOriginal<typeof import("./rendre")>();
  return { ...vrai, controlerPoids: h.controle, mettreEnPage: h.rendu };
});

const { reponsePdf } = await import("./reponse");
const { PdfTropVolumineux } = await import("./rendre");
const demande = { type: "registre", props: { data: {} } } as unknown as DemandePdf;

describe("reponsePdf avec la vraie file d'export", () => {
  it("des refus puis des exports, en alternance : la file sert toujours", async () => {
    const refus = new PdfTropVolumineux("registre", { total: 9_999, plusGrosBloc: 1 });
    const admis = { total: 1, plusGrosBloc: 1 };
    // Refus, admis, refus, admis, échec de rendu, admis : six demandes d'un
    // même utilisateur, une place, deux par demandeur.
    for (const issue of [refus, admis, refus, admis, admis, admis]) {
      if (issue instanceof Error) h.controle.mockImplementationOnce(() => { throw issue; });
      else h.controle.mockReturnValueOnce(issue);
    }
    h.rendu
      .mockResolvedValueOnce(Buffer.from("%PDF"))
      .mockResolvedValueOnce(Buffer.from("%PDF"))
      .mockRejectedValueOnce(new Error("mise en page"))
      .mockResolvedValueOnce(Buffer.from("%PDF"));

    const statuts: (number | string)[] = [];
    for (let i = 0; i < 6; i++) {
      try {
        statuts.push((await reponsePdf(demande, "a.pdf", "u-1")).status);
      } catch {
        statuts.push("échec");
      }
    }
    // Une place perdue rendrait 429 ou 503 « Trop d'exports » après 20 s.
    expect(statuts).toEqual([503, 200, 503, 200, "échec", 200]);
  });
});
