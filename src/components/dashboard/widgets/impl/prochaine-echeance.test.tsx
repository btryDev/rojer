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

import { BlocProchaineEcheance } from "./board";
import { echeancesDuTableauDeBord } from "@/lib/calendrier/prochaine-echeance";

afterEach(cleanup);

const AUJOURDHUI = new Date("2026-09-10T10:00:00.000Z");
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

/** Le bundle réduit à ce que lit le widget : le reste n'est pas consulté. */
const bundle = (lignes: ReturnType<typeof ligne>[]) =>
  ({
    etablissementId: "etab-1",
    aujourdhui: AUJOURDHUI,
    ...echeancesDuTableauDeBord(lignes, AUJOURDHUI),
  }) as unknown as DashboardBundle;

describe("BlocProchaineEcheance", () => {
  it("affiche l'échéance du 15/10 quand cinq « à planifier » la précèdent", () => {
    // LE SCÉNARIO DE LA RELECTURE DE CONTRÔLE DU LOT C : le widget filtrait
    // les cinq déjà coupées et disait « Sans échéance connue pour l'instant ».
    const { container } = render(
      <BlocProchaineEcheance
        bundle={bundle([
          ligne("p1", "2026-09-01", "a_planifier"),
          ligne("p2", "2026-09-02", "a_planifier"),
          ligne("p3", "2026-09-20", "a_planifier"),
          ligne("p4", "2026-09-21", "a_planifier"),
          ligne("p5", "2026-10-01", "a_planifier"),
          ligne("vraie", "2026-10-15"),
        ])}
      />,
    );
    expect(container.textContent).toContain("Obligation vraie");
    expect(container.textContent).not.toContain("Sans échéance connue");
  });

  it("dit « sans échéance connue » quand aucune ligne n'en a", () => {
    const { container } = render(
      <BlocProchaineEcheance
        bundle={bundle([ligne("p1", "2026-09-20", "a_planifier")])}
      />,
    );
    expect(container.textContent).toContain("Sans échéance connue");
  });
});
