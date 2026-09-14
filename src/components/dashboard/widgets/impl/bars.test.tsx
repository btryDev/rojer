// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { DashboardBundle } from "../types";
import { DonutStatuts, WidgetBarsObligations } from "./bars";

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

describe("widget « Obligations de l'année » — les lignes sans échéance connue", () => {
  /**
   * RELECTURE DU 2026-09-14. Les lignes « à planifier » ont quitté les barres
   * (leur date est une date de génération) ; le premier jet les avait retirées
   * de tout. Sur un dossier neuf de douze appareils, tous en retard, l'anneau
   * passait de « En retard 12 » à l'état vide « Le calendrier se remplit dès
   * que vous déclarez vos équipements », sous un bandeau « 12 en retard ».
   */
  const moisVides = Array.from({ length: 12 }, (_, mois) => ({
    mois,
    annee: 2026,
    couvert: 0,
    aVenir: 0,
    retard: 0,
  }));
  const bundle = {
    aujourdhui: new Date("2026-09-14T10:00:00.000Z"),
    moisCourant: 8,
    barsData: moisVides,
    barsSansEcheance: { aVenir: 0, retard: 12 },
    barsRetardsAnterieurs: 0,
  } as unknown as DashboardBundle;

  it("l'anneau garde les retards sans date, et ne se dit pas vide", () => {
    const { container } = render(
      <WidgetBarsObligations bundle={bundle} variant="radial" />,
    );
    const texte = container.textContent ?? "";
    expect(texte).toContain("En retard12(100%)");
    expect(texte).toContain("dont 12 sans échéance connue");
    expect(texte).not.toContain("Le calendrier se remplit");
  });

  it("les barres ne se disent pas vides non plus, et disent pourquoi", () => {
    const { container } = render(
      <WidgetBarsObligations bundle={bundle} variant="bars" />,
    );
    const texte = container.textContent ?? "";
    expect(texte).not.toContain("Le calendrier se remplit");
    expect(texte).toContain("12 lignes sans échéance connue");
    expect(texte).toContain("12 sans échéance connue, hors des mois");
  });

  it("un retard d'une année passée compte dans l'anneau et se dit hors des mois", () => {
    // Relecture système du 2026-09-14 : l'anneau 2026 disait « 0 en retard »
    // sous un bandeau « 1 en retard » pour une échéance manquée en 2025.
    const anterieur = {
      ...bundle,
      barsSansEcheance: { aVenir: 0, retard: 0 },
      barsRetardsAnterieurs: 1,
    } as unknown as DashboardBundle;
    const anneau = render(<WidgetBarsObligations bundle={anterieur} variant="radial" />);
    expect(anneau.container.textContent).toContain("En retard1(100%)");
    expect(anneau.container.textContent).toContain("dont 1 retard d'une année passée");
    expect(anneau.container.textContent).not.toContain("Le calendrier se remplit");
    cleanup();
    const barres = render(<WidgetBarsObligations bundle={anterieur} variant="bars" />);
    expect(barres.container.textContent).toContain("1 retard d'avant 2026, hors des mois");
    expect(barres.container.textContent).toContain("Aucune échéance datée cette année.");
  });

  it("le jour de la déclaration, les lignes sans échéance sont dites sous « À venir », pas sous « En retard »", () => {
    // Relecture des libellés du 2026-09-14 : un seul « dont 12 sans échéance
    // connue » placé sous « En retard 0 » attribuait au retard les douze
    // lignes du jour.
    const { container } = render(
      <WidgetBarsObligations
        bundle={{ ...bundle, barsSansEcheance: { aVenir: 12, retard: 0 } }}
        variant="radial"
      />,
    );
    const texte = container.textContent ?? "";
    expect(texte).toContain("À venir12(100%)dont 12 sans échéance connueEn retard0(0%)");
  });

  it("l'état vide reste celui d'un dossier sans rien", () => {
    const { container } = render(
      <WidgetBarsObligations
        bundle={{ ...bundle, barsSansEcheance: { aVenir: 0, retard: 0 } }}
        variant="radial"
      />,
    );
    expect(container.textContent).toContain("Le calendrier se remplit");
  });
});
