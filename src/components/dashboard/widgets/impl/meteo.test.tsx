// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { DashboardBundle } from "../types";
import { WidgetMeteo } from "./meteo";

afterEach(cleanup);

const AUJOURDHUI = new Date("2026-09-14T10:00:00.000Z");
const JOUR = new Date("2026-09-14T00:00:00.000Z");

const evenement = (id: string, sansEcheance: boolean) => ({
  id,
  libelle: `Vérification ${id}`,
  date: JOUR,
  tone: "warn" as const,
  sansEcheance,
  type: "verification" as const,
  contractuelle: false,
  equipement: "Tableau électrique",
  batiment: null,
});

const bundle = (evenements: ReturnType<typeof evenement>[]) =>
  ({ aujourdhui: AUJOURDHUI, evenementsMois: evenements }) as unknown as DashboardBundle;

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
      <WidgetMeteo bundle={bundle([evenement("v-generee", true)])} />,
    );
    const cases = [...container.querySelectorAll("[title]")];
    expect(cases.some((c) => c.getAttribute("title")?.includes("à planifier"))).toBe(false);
    expect(container.textContent).toContain("1 sur la période");
  });

  it("une échéance connue du jour colore bien sa case", () => {
    const { container } = render(
      <WidgetMeteo bundle={bundle([evenement("v-connue", false)])} />,
    );
    const cases = [...container.querySelectorAll("[title]")];
    expect(cases.some((c) => c.getAttribute("title")?.includes("à planifier"))).toBe(true);
  });
});
