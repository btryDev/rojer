// @vitest-environment jsdom
//
// Contrôle visuel de c6 (2026-10-17) : la phrase GN 10 était dans la
// description, que l'écran « Ce qui doit être en place » n'affiche pas. Une
// ligne qui cite GN 10 le dit désormais sous son article. Chaîne entière : le
// référentiel (`porteGn10`), la lecture de l'écran (`listerEtatsPermanents` →
// `fondementDe`), puis le rendu de la ligne avec les props que la page lui
// passe.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

vi.mock("@/lib/prisma", () => ({
  prisma: { declarationEtatPermanent: { findMany: vi.fn(async () => []) } },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/lib/etats-permanents/actions", () => ({
  declarerEnPlace: vi.fn(),
  retirerDeclaration: vi.fn(),
}));

const { listerEtatsPermanents } = await import("@/lib/etats-permanents/queries");
const { LigneEtat } = await import("./LigneEtat");
const { obligationsConformite } = await import("@/lib/referentiels/conformite");
const { fondementDe } = await import("@/lib/etats-permanents/fondement");
const { porteGn10, MENTION_GN_10, CITATION_GN_10 } = await import(
  "@/lib/referentiels/conformite/texte-gn10"
);

afterEach(cleanup);

function erp(categorieErp: string, typeErp = "N", comporteLocauxSommeilPublic: boolean | null = null) {
  return {
    id: "etab-1",
    effectifSurSite: 8,
    effectifEntreprise: 8,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp,
    typesErpAutres: [],
    categorieErp,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic,
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
    ssiCategorieAouB: null,
  } as never;
}

async function lignes(e: never) {
  const d = await listerEtatsPermanents(e, []);
  return [...d.familles.flatMap((f) => f.blocs.flatMap((b) => b.lignes)), ...d.faits];
}

function rendre(l: Awaited<ReturnType<typeof lignes>>[number]) {
  return render(
    <LigneEtat
      etablissementId="etab-1"
      obligationId={l.obligation.id}
      libelle={l.obligation.libelle}
      mode={l.mode}
      pieceAttendue={l.pieceAttendue}
      declareLe={null}
      fondement={l.fondement}
    />,
  );
}

describe("GN 10 à l'écran — une ligne qui le cite le dit", () => {
  it("toute obligation qui porte GN 10 a un fondement marqué, et seulement elle", () => {
    for (const o of obligationsConformite) {
      expect(fondementDe(o)?.gn10 === true, o.id).toBe(porteGn10(o));
    }
  });

  it("borne basse : les lignes anciennes et nouvelles sont vues", () => {
    const ids = obligationsConformite.filter(porteGn10).map((o) => o.id);
    for (const id of [
      "incendie-erp-5-consignes-affichees", // PE 27, 5ᵉ, ancienne
      "incendie-erp-personnel-designe-moyens-secours", // titre II, 14/10
      "incendie-erp-plan-intervention-entrees", // titre Ier, sous-lot C
      "cuisson-erp-consignes-arret-urgence", // hors incendie.ts
    ]) {
      expect(ids, id).toContain(id);
    }
  });

  it("à l'écran d'un restaurant de 3ᵉ, d'un restaurant de 5ᵉ et d'un hôtel de 5ᵉ : chaque ligne qui porte GN 10 affiche la mention, les autres non", async () => {
    let vues = 0;
    for (const e of [erp("N3"), erp("N5"), erp("N5", "O", true)]) {
      for (const l of await lignes(e)) {
        const { container, unmount } = rendre(l);
        const affiche = (container.textContent ?? "").includes(MENTION_GN_10);
        expect(affiche, l.obligation.id).toBe(porteGn10(l.obligation));
        if (affiche) vues += 1;
        unmount();
      }
    }
    expect(vues).toBeGreaterThanOrEqual(8);
  });

  it("la pastille GN 10 déplie le texte entier", async () => {
    const l = (await lignes(erp("N3"))).find(
      (x) => x.obligation.id === "incendie-erp-plan-intervention-entrees",
    )!;
    const { getByRole, container } = rendre(l);
    fireEvent.click(getByRole("button", { name: /GN 10/ }));
    expect(container.textContent).toContain(CITATION_GN_10);
  });
});
