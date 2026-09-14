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

import { BlocAFaire } from "./board";

afterEach(cleanup);

const AUJOURDHUI = new Date("2026-09-14T10:00:00.000Z");

const bundle = (recommandations: unknown[]) =>
  ({
    etablissementId: "etab-1",
    aujourdhui: AUJOURDHUI,
    dashboard: { recommandations },
    echeances: { sous30j: { total: 0 }, retards: { total: recommandations.length } },
  }) as unknown as DashboardBundle;

describe("bloc « À faire » — un retard sans échéance connue", () => {
  /**
   * Contrôle visuel en production, 2026-09-14 : la ligne voisine affichait
   * « 57 j de retard », celle-ci rien — ni pastille, ni raison.
   */
  it("porte la pastille « En retard » et dit pourquoi, sans compter de jours", () => {
    const { container } = render(
      <BlocAFaire
        bundle={bundle([
          {
            kind: "verif_depassee",
            cle: "verif-depassee:v1",
            titre: "Vérification initiale des installations électriques",
            href: "/etablissements/etab-1/verifications/v1",
            priorite: 1,
            date: undefined,
          },
          {
            kind: "verif_depassee",
            cle: "verif-depassee:v2",
            titre: "Visite d'information et de prévention",
            href: "/etablissements/etab-1/verifications/v2",
            priorite: 1,
            date: new Date("2026-07-19T00:00:00.000Z"),
          },
        ])}
      />,
    );
    const texte = container.textContent ?? "";
    expect(texte).toContain("Vérification · aucune vérification enregistrée");
    expect(texte).toContain("En retard");
    // La ligne datée garde son compte de jours.
    expect(texte).toContain("57 j de retard");
  });
});
