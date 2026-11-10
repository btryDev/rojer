// Après un refus du garde-fou, la place d'export est rendue : avec la VRAIE
// file (`exports/limite.ts` : une place, deux par demandeur), une place
// perdue ferait attendre puis refuser les exports suivants (429 ou 503
// « Trop d'exports »). Lot pdf-b0, relecture du 2026-11-10.

import { describe, expect, it, vi } from "vitest";
import type { DemandePdf } from "./documents";

const h = vi.hoisted(() => ({ rendu: vi.fn<(demande: unknown) => Promise<Buffer>>() }));
// Le refus est simulé AU RENDU, donc après la prise de place : c'est là
// qu'une place pourrait se perdre. La pesée d'avant la file passe.
vi.mock("./rendre", async (importOriginal) => {
  const vrai = await importOriginal<typeof import("./rendre")>();
  return { ...vrai, rendrePdf: h.rendu, controlerPoids: () => ({ total: 1, plusGrosBloc: 1 }) };
});

const { reponsePdf } = await import("./reponse");
const { PdfTropVolumineux } = await import("./rendre");
const demande = { type: "registre", props: { data: {} } } as unknown as DemandePdf;

describe("reponsePdf avec la vraie file d'export", () => {
  it("trois refus de suite, puis un export qui passe : aucune place n'est perdue", async () => {
    const refus = new PdfTropVolumineux("registre", { total: 9_999, plusGrosBloc: 1 });
    h.rendu
      .mockRejectedValueOnce(refus)
      .mockRejectedValueOnce(refus)
      .mockRejectedValueOnce(refus)
      .mockResolvedValueOnce(Buffer.from("%PDF"));

    const statuts: number[] = [];
    const textes: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await reponsePdf(demande, "a.pdf", "u-1");
      statuts.push(r.status);
      textes.push(await r.text());
    }
    expect(statuts).toEqual([503, 503, 503, 200]);
    // Les trois 503 sont ceux du garde-fou, pas ceux de la file pleine.
    for (const t of textes.slice(0, 3)) expect(t).toMatch(/trop volumineux/);
    expect(textes[3]).toBe("%PDF");
  });
});
