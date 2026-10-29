// @vitest-environment jsdom
/**
 * La vue mois du téléphone (décision 4A du 2026-10-29) : des points dans la
 * grille, et la liste du jour touché dessous.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { construireGrilleMois, type EvenementGrille } from "@/lib/calendrier/grille";

vi.mock("@/components/navigation/LienProvenance", () => ({
  LienProvenance: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { GrilleTelephone } from "./VueMois";

afterEach(cleanup);

// Midi en heure locale : le jour civil ne dépend pas du fuseau du processus.
const AUJOURDHUI = new Date(2026, 9, 29, 12); // jeudi 29 octobre 2026

const evt = (id: string, jour: number, libelle: string, tone: EvenementGrille["tone"]): EvenementGrille => ({
  id,
  libelle,
  equipement: "Cuisine",
  tone,
  date: new Date(2026, 9, jour, 12),
});

const rendre = (evenements: EvenementGrille[], aujourdhui = AUJOURDHUI) =>
  render(
    <GrilleTelephone
      grille={construireGrilleMois({ mois: new Date(2026, 9, 1, 12), evenements, aujourdhui })}
      aujourdhui={aujourdhui}
      hrefEvenement={(e) => `/v/${e.id}`}
    />,
  );

describe("GrilleTelephone", () => {
  it("ouvre sur aujourd'hui, et liste ses échéances", () => {
    rendre([evt("a", 29, "Vérification des BAES", "warn"), evt("b", 15, "Extincteurs", "alerte")]);
    expect(screen.getByText(/^Aujourd'hui, jeudi 29 octobre 2026$/)).toBeDefined();
    const liens = screen.getAllByRole("link");
    expect(liens.map((a) => a.textContent)).toEqual(["Vérification des BAESCuisine"]);
    expect(liens[0].getAttribute("href")).toBe("/v/a");
  });

  it("toucher un autre jour liste les siennes", () => {
    rendre([evt("a", 29, "Vérification des BAES", "warn"), evt("b", 15, "Extincteurs", "alerte")]);
    const quinze = screen.getByRole("button", { name: /^Jeudi 15 octobre 2026, 1 échéance$/ });
    fireEvent.click(quinze);
    expect(quinze.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Jeudi 15 octobre 2026")).toBeDefined();
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/v/b"]);
  });

  it("un jour sans échéance le dit", () => {
    rendre([evt("b", 15, "Extincteurs", "alerte")]);
    expect(screen.getByText("Aucune échéance ce jour-là.")).toBeDefined();
  });

  it("hors du mois, ouvre sur le premier jour qui porte une échéance", () => {
    rendre([evt("c", 22, "Hotte", "ok"), evt("b", 15, "Extincteurs", "alerte")], new Date(2026, 11, 1, 12));
    expect(screen.getByText("Jeudi 15 octobre 2026")).toBeDefined();
  });

  it("un point par échéance, trois au plus, et un « + » au-delà", () => {
    rendre([1, 2, 3, 4].map((n) => evt(`x${n}`, 8, `Ligne ${n}`, "ok")));
    const huit = screen.getByRole("button", { name: /^Jeudi 8 octobre 2026, 4 échéances$/ });
    expect(within(huit).getByText("8")).toBeDefined();
    expect(huit.querySelectorAll("[data-point]")).toHaveLength(3);
    expect(huit.querySelector("[data-plus]")).not.toBeNull();
  });

  it("le retard passe devant : il ne se perd pas derrière trois autres points", () => {
    rendre([
      evt("a", 8, "A", "ok"),
      evt("b", 8, "B", "ok"),
      evt("c", 8, "C", "ok"),
      evt("d", 8, "D", "alerte"),
    ]);
    const huit = screen.getByRole("button", { name: /^Jeudi 8 octobre 2026/ });
    const premier = huit.querySelector<HTMLElement>("[data-point]")!;
    expect(premier.style.background).toBe("var(--board-signal)");
  });
});
