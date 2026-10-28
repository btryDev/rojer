// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { LABEL_ITEM } from "@/components/layout/sidebar-nav";

import { ChargementSection } from "./ChargementSection";
import { repliDeChargement } from "./repli-de-chargement";

afterEach(cleanup);

describe("ChargementSection", () => {
  it("annonce le chargement et porte le vrai titre de la page", () => {
    render(<ChargementSection item="calendrier" />);
    expect(screen.getByRole("status").textContent).toBe("Chargement…");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(LABEL_ITEM.calendrier);
  });

  it("garde la place de la bascule quand la page en porte une", () => {
    const avec = render(<ChargementSection item="calendrier" bascule />).container;
    const sans = render(<ChargementSection item="actions" />).container;
    expect(avec.querySelector("header .rounded-full")).not.toBeNull();
    expect(sans.querySelector("header .rounded-full")).toBeNull();
  });

  it("porte le panneau teinté de la section, sans dessin", () => {
    const { container } = render(<ChargementSection item="equipements" />);
    const panneau = container.querySelector("[data-teinte-section]") as HTMLElement;
    expect(panneau.style.backgroundColor).not.toBe("");
    expect(panneau.querySelector("svg, img")).toBeNull();
  });
});

describe("repliDeChargement", () => {
  it("lit la section sur l'adresse (sans paramètres : `usePathname` n'en rend pas)", () => {
    expect(repliDeChargement("/etablissements/e1/calendrier")).toEqual({
      item: "calendrier",
      bascule: true,
    });
    expect(repliDeChargement("/etablissements/e1/registre")).toEqual({ item: "registre" });
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
    // Une propriété héritée de l'objet n'est pas une page.
    expect(repliDeChargement("/etablissements/e1/constructor")).toBeNull();
    expect(repliDeChargement("/etablissements/e1/__proto__")).toBeNull();
  });
});
