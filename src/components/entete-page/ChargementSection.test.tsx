// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { LABEL_ITEM } from "@/components/layout/sidebar-nav";

import { ChargementSection } from "./ChargementSection";
import { repliDeChargement } from "./repli-de-chargement";

afterEach(cleanup);

describe("ChargementSection", () => {
  it("annonce le chargement et porte le vrai titre de la page", () => {
    const { container } = render(<ChargementSection item="calendrier" />);
    expect(screen.getByRole("status").textContent).toBe("Chargement…");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(LABEL_ITEM.calendrier);
    expect(container.querySelector("main")?.getAttribute("aria-busy")).toBe("true");
  });

  it("porte le panneau teinté de la section, sans dessin", () => {
    const { container } = render(<ChargementSection item="equipements" />);
    const panneau = container.querySelector("[data-teinte-section]") as HTMLElement;
    expect(panneau.style.backgroundColor).not.toBe("");
    expect(panneau.querySelector("svg, img")).toBeNull();
  });
});

describe("repliDeChargement", () => {
  it("lit la section sur l'adresse, paramètres compris", () => {
    expect(repliDeChargement("/etablissements/e1/calendrier")).toEqual({ item: "calendrier" });
    expect(repliDeChargement("/etablissements/e1/duerp/import")).toEqual({
      item: "duerp",
      titre: "Importer un DUERP",
    });
  });

  it("rend le repli neutre hors des pages d'entrée", () => {
    expect(repliDeChargement("/etablissements/e1")).toBeNull();
    expect(repliDeChargement("/etablissements/e1/equipements/abc")).toBeNull();
    expect(repliDeChargement("/etablissements/e1/equipements/nouveau")).toBeNull();
    expect(repliDeChargement("/onboarding")).toBeNull();
  });
});
