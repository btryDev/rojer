// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { LABEL_ITEM } from "@/components/layout/sidebar-nav";

import { ChargementSection } from "./ChargementSection";
import { EnTetePage } from "./EnTetePage";

afterEach(cleanup);

describe("ChargementSection", () => {
  it("annonce le chargement et porte le vrai titre de la page", () => {
    const { container } = render(<ChargementSection item="calendrier" />);
    expect(screen.getByRole("status").textContent).toBe("Chargement…");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(LABEL_ITEM.calendrier);
    expect(container.querySelector("main")?.getAttribute("aria-busy")).toBe("true");
  });

  it("garde la place du dessin sans le montrer, et la teinte de la section", () => {
    const { container } = render(<ChargementSection item="equipements" />);
    const panneau = container.querySelector("[data-teinte-section]") as HTMLElement;
    expect(panneau.style.backgroundColor).not.toBe("");
    const enveloppe = panneau.firstElementChild as HTMLElement;
    expect(enveloppe.className).toBe("invisible");
    // Le dessin y est bien : c'est lui qui donne sa hauteur au panneau.
    expect(enveloppe.firstElementChild).not.toBeNull();
  });

  it("la page, elle, montre son dessin", () => {
    const { container } = render(<EnTetePage item="equipements" description="Une phrase." />);
    const panneau = container.querySelector("[data-teinte-section]") as HTMLElement;
    expect(panneau.querySelector(".invisible")).toBeNull();
  });
});
