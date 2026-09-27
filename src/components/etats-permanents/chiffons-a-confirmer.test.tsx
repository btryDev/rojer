// @vitest-environment jsdom
//
// C45, contre-lecture M1 : le silence de la question des chiffons retient la
// ligne de `R. 4227-26` « à confirmer » — et « Ce qui doit être en place »
// doit le DIRE, pas seulement la raison du moteur, que personne ne lit.
// Chaîne entière : le moteur, la lecture de l'écran (`listerEtatsPermanents`),
// puis le rendu de la ligne avec les props que la page lui passe.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

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
const { PHRASE_SANS_REPONSE } = await import("@/lib/matching/sans-reponse");

afterEach(cleanup);

const OBLIGATION = "incendie-travail-chiffons-impregnes-recipients-clos";

function etab(chiffonsImpregnes: boolean | null) {
  return {
    id: "etab-1",
    effectifSurSite: 4,
    effectifEntreprise: 4,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: false,
    estHabitation: false,
    typeErp: null,
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    chiffonsImpregnes,
  };
}

async function ligne(chiffons: boolean | null) {
  const d = await listerEtatsPermanents(etab(chiffons), []);
  return [...d.groupes.flatMap((g) => g.lignes), ...d.faits].find(
    (l) => l.obligation.id === OBLIGATION,
  );
}

/** Rendue comme la page la rend (`etats-permanents/page.tsx`). */
function rendre(l: NonNullable<Awaited<ReturnType<typeof ligne>>>) {
  return render(
    <LigneEtat
      etablissementId="etab-1"
      obligationId={l.obligation.id}
      libelle={l.obligation.libelle}
      mode={l.mode}
      pieceAttendue={l.pieceAttendue}
      declareLe={null}
      aConfirmer={null}
      questionsSansReponse={
        l.questionsSansReponse.length > 0
          ? { phrases: l.questionsSansReponse, hrefFiche: "/etablissements/etab-1/modifier" }
          : null
      }
      fondement={l.fondement}
    />,
  );
}

describe("« Ce qui doit être en place » — les chiffons, oui / silence / non", () => {
  it("silence : la ligne est là, « à confirmer », avec la phrase et le lien vers la fiche", async () => {
    const l = await ligne(null);
    expect(l).toBeDefined();
    expect(l!.questionsSansReponse).toEqual([PHRASE_SANS_REPONSE.chiffons_impregnes]);
    const { container, getByRole } = rendre(l!);
    expect(container.textContent).toContain("À confirmer.");
    expect(container.textContent).toContain(PHRASE_SANS_REPONSE.chiffons_impregnes);
    expect(getByRole("link", { name: /fiche de l'établissement/ }).getAttribute("href")).toBe(
      "/etablissements/etab-1/modifier",
    );
  });

  it("oui : la ligne est là, sans « à confirmer »", async () => {
    const l = await ligne(true);
    expect(l).toBeDefined();
    expect(l!.questionsSansReponse).toEqual([]);
    const { container } = rendre(l!);
    expect(container.textContent).not.toContain("À confirmer");
  });

  it("non : pas de ligne", async () => {
    expect(await ligne(false)).toBeUndefined();
  });
});
