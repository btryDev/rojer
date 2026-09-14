// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { DashboardBundle } from "../types";

// Le lien de provenance lit l'URL courante par `next/navigation`, absent hors
// du routeur : un lien nu suffit à ce que ces tests regardent.
vi.mock("@/components/navigation/LienProvenance", () => ({
  LienProvenance: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { WidgetProchainesEcheances } from "./echeances";

afterEach(cleanup);

/** Le 14 septembre 2026, à midi à Paris. */
const AUJOURDHUI = new Date("2026-09-14T10:00:00.000Z");
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const ligne = (id: string, iso: string, statut = "planifiee") => ({
  id,
  libelleObligation: `Obligation ${id}`,
  datePrevue: jour(iso),
  statut,
  periodicite: "annuelle",
  archiveLe: null,
  equipement: { libelle: `Appareil ${id}` },
  prescription: null,
});

const bundle = (lignes: ReturnType<typeof ligne>[]) =>
  ({
    etablissementId: "etab-1",
    aujourdhui: AUJOURDHUI,
    prochainesVerifs: lignes,
  }) as unknown as DashboardBundle;

const occurrences = (texte: string, motif: string) => texte.split(motif).length - 1;

describe("widget « Prochaines échéances » — les libellés d'une ligne sans échéance connue", () => {
  /**
   * RELECTURE DES LIBELLÉS DU 2026-09-14. Une « à planifier » du jour
   * affichait « — » à la place de la date, puis « À planifier » deux fois :
   * sous forme de délai, et dans la pastille. Là où une date s'afficherait, la
   * phrase partagée ; le mot du statut, une fois.
   */
  it("dit « Sans échéance connue » à la place de la date, et « À planifier » une seule fois", () => {
    const { container } = render(
      <WidgetProchainesEcheances
        bundle={bundle([ligne("v1", "2026-09-14", "a_planifier")])}
        variant="liste"
      />,
    );
    const texte = container.textContent ?? "";
    expect(occurrences(texte, "Sans échéance connue")).toBe(1);
    expect(occurrences(texte, "À planifier")).toBe(1);
    expect(texte).not.toContain("—");
  });

  it("en retard, garde la raison : aucune vérification enregistrée", () => {
    const { container } = render(
      <WidgetProchainesEcheances
        bundle={bundle([ligne("v1", "2026-09-01", "a_planifier")])}
        variant="liste"
      />,
    );
    const texte = container.textContent ?? "";
    expect(texte).toContain("Sans échéance connue");
    expect(texte).toContain("Aucune vérification enregistrée");
    expect(texte).not.toContain("À planifier");
  });
});
