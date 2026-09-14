// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { DashboardBundle } from "../types";
import { WidgetMeteo } from "./meteo";

afterEach(cleanup);

const AUJOURDHUI = new Date("2026-09-14T10:00:00.000Z");
const JOUR = new Date("2026-09-14T00:00:00.000Z");

// Les fixtures suivent ce que `lecturesCalendrier` produit : une « à
// planifier » à venir porte le ton `warn` ET `sansEcheance` ; une échéance
// connue du jour porte le ton `ok`. Le premier jet de ce test combinait `warn`
// et une échéance connue — un cas que le flux ne produit jamais (relecture,
// 2026-09-14).
const evenement = (
  id: string,
  sansEcheance: boolean,
  tone: "alerte" | "warn" | "ok",
) => ({
  id,
  libelle: `Vérification ${id}`,
  date: JOUR,
  tone,
  sansEcheance,
  type: "verification" as const,
  contractuelle: false,
  equipement: "Tableau électrique",
  batiment: null,
});

const bundle = (evenements: ReturnType<typeof evenement>[]) =>
  ({ aujourdhui: AUJOURDHUI, evenementsMois: evenements }) as unknown as DashboardBundle;

const titres = (container: HTMLElement) =>
  [...container.querySelectorAll("[title]")].map((c) => c.getAttribute("title") ?? "");

describe("widget « 30 prochains jours »", () => {
  it("porte son nom, et plus « Météo »", () => {
    // Renommé le 2026-09-14 : « Météo » ne disait rien de ce que la grille montre.
    const { container } = render(<WidgetMeteo bundle={bundle([])} />);
    expect(container.textContent).toContain("30 prochains jours");
    expect(container.textContent).not.toContain("Météo");
  });

  it("une ligne sans échéance connue ne colore aucune case, mais reste comptée", () => {
    // Un appareil déclaré aujourd'hui : sa ligne « à planifier » est datée du
    // jour de sa génération. Elle peignait la case du jour en ambre, pour une
    // échéance que rien n'avait fixée.
    const { container } = render(
      <WidgetMeteo bundle={bundle([evenement("v-generee", true, "warn")])} />,
    );
    expect(titres(container).every((t) => t.endsWith("— libre"))).toBe(true);
    expect(container.textContent).toContain("1 sur la période");
    expect(container.textContent).toContain("1 sans date");
  });

  it("un retard sans échéance connue reste compté en retard, sans case ni double compte", () => {
    const { container } = render(
      <WidgetMeteo bundle={bundle([evenement("v-generee", true, "alerte")])} />,
    );
    expect(titres(container).every((t) => t.endsWith("— libre"))).toBe(true);
    expect(container.textContent).toContain("1 retard");
    expect(container.textContent).not.toContain("sans date");
  });

  it("une échéance connue du jour colore bien sa case", () => {
    const { container } = render(
      <WidgetMeteo bundle={bundle([evenement("v-connue", false, "ok")])} />,
    );
    expect(titres(container).some((t) => t.endsWith("— planifié"))).toBe(true);
  });
});
