// Un document bâti pour un compte se lit avec CE compte (report main → cc du
// 2026-11-06, relecture) : quand l'appelant passe le compte et son client,
// `listerEtatsPermanents` les prend tels quels et ne relit pas la session. Une
// session relue pourrait désigner un autre compte (changement de compte dans
// un autre onglet) : le registre et le ZIP diraient alors les écrits manquants.

import { describe, expect, it, vi } from "vitest";
import type { AccesCompte } from "@/lib/auth/compte";

const h = vi.hoisted(() => ({
  requireCompte: vi.fn(async () => {
    throw new Error("la session ne doit pas être relue");
  }),
}));

vi.mock("@/lib/auth/compte", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/compte")>()),
  requireCompte: h.requireCompte,
}));

const { listerEtatsPermanents } = await import("./queries");

const etab = {
  id: "etab-1",
  effectifSurSite: 6,
  effectifEntreprise: 6,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  typesErpAutres: [],
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
} as unknown as Parameters<typeof listerEtatsPermanents>[0];

describe("listerEtatsPermanents — le compte reçu", () => {
  it("lit les déclarations par le client reçu, filtrées sur le compte reçu, sans relire la session", async () => {
    const declarations = vi.fn(async (_args: unknown) => []);
    const acces = {
      compte: { compteId: "compte-A" },
      db: {
        declarationEtatPermanent: { findMany: declarations },
        titreSalarie: { findMany: vi.fn(async () => []) },
        pieceEtatPermanent: { findMany: vi.fn(async () => []) },
      },
    } as unknown as AccesCompte;

    await listerEtatsPermanents(etab, [], undefined, new Date("2026-11-06T10:00:00Z"), acces);

    expect(h.requireCompte).not.toHaveBeenCalled();
    expect(declarations).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(declarations.mock.calls[0]![0])).toContain('"compteId":"compte-A"');
  });
});
