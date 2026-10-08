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
const { obligationsNiveauAuditDuDossier } = await import("@/lib/perimetre/niveau-audit");
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

// ~~Les deux premiers cas ci-dessous gardaient la ligne « à confirmer » sur
// l'écran.~~ [2026-10-08, ADR-042 : les chiffons imprégnés passent au NIVEAU
// AUDIT — légaux, au référentiel, hors du quotidien. L'écran ne les porte plus,
// quelle que soit la réponse ; la question décide désormais de la rubrique
// « Niveau audit » de la page « Ce que Rojer ne couvre pas »
// (`perimetre/niveau-audit.ts`), gardée ici dans les trois cas. Le rendu
// « à confirmer » d'une question muette est gardé ci-dessous par la question
// des matières de R. 4227-22, dont le silence retient encore des lignes.]
describe("« Ce qui doit être en place » — les chiffons, oui / silence / non (niveau audit)", () => {
  it.each([null, true, false])(
    "réponse %s : pas de ligne sur l'écran",
    async (reponse) => {
      expect(await ligne(reponse)).toBeUndefined();
    },
  );

  it("silence et oui : nommés dans la rubrique « Niveau audit » ; non : absents", () => {
    const ids = (r: boolean | null) =>
      obligationsNiveauAuditDuDossier(etab(r), []).map((l) => l.id);
    expect(ids(null)).toContain(OBLIGATION);
    expect(ids(true)).toContain(OBLIGATION);
    expect(ids(false)).not.toContain(OBLIGATION);
  });
});

describe("« Ce qui doit être en place » — le rendu « à confirmer », par la question des matières", () => {
  it("silence : une ligne retenue dit « À confirmer », sa phrase et le lien vers la fiche", async () => {
    const d = await listerEtatsPermanents(etab(null), []);
    const l = [...d.groupes.flatMap((g) => g.lignes), ...d.faits].find((x) =>
      x.questionsSansReponse.includes(PHRASE_SANS_REPONSE.matieres_r4227_22),
    );
    expect(l).toBeDefined();
    const { container, getByRole } = render(
      <LigneEtat
        etablissementId="etab-1"
        obligationId={l!.obligation.id}
        libelle={l!.obligation.libelle}
        mode={l!.mode}
        pieceAttendue={l!.pieceAttendue}
        declareLe={null}
        aConfirmer={null}
        questionsSansReponse={{
          phrases: l!.questionsSansReponse,
          hrefFiche: "/etablissements/etab-1/modifier",
        }}
        fondement={l!.fondement}
      />,
    );
    expect(container.textContent).toContain("À confirmer.");
    expect(container.textContent).toContain(PHRASE_SANS_REPONSE.matieres_r4227_22);
    expect(
      getByRole("link", { name: /fiche de l'établissement/ }).getAttribute("href"),
    ).toBe("/etablissements/etab-1/modifier");
  });
});
