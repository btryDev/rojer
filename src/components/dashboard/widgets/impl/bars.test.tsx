// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { DonutStatuts } from "./bars";

afterEach(cleanup);

describe("widget « Obligations de l'année » — l'anneau", () => {
  /**
   * RELECTURE DU 2026-09-14. Depuis que « couvert » compte chaque rapport
   * réalisé, l'anneau additionnait des contrôles faits et des échéances dans
   * un même total en pourcentages. Scénario exécuté par la relecture : une
   * alarme hebdomadaire à 36 rapports, une échéance à venir, deux annuelles en
   * retard — « En retard (5 %) » sur 39, quand la veille on lisait 50 % sur 4.
   * Plus une ligne est contrôlée souvent, plus le retard des autres se diluait.
   */
  const totaux = { couvert: 36, aVenir: 2, retard: 2 };

  it("la part du retard se lit sur les échéances, pas sur les contrôles faits", () => {
    const { container } = render(<DonutStatuts totaux={totaux} />);
    const texte = container.textContent ?? "";
    expect(texte).toContain("En retard2(50%)");
    expect(texte).toContain("À venir2(50%)");
    // Le total au centre est celui des échéances.
    expect(texte).toMatch(/^4Échéances/);
  });

  it("les contrôles faits sont comptés, jamais mis en part", () => {
    const { container } = render(<DonutStatuts totaux={totaux} />);
    const texte = container.textContent ?? "";
    expect(texte).toContain("Contrôles faits36");
    expect(texte).not.toContain("Contrôles faits36(");
  });
});
