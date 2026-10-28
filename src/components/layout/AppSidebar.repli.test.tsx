// @vitest-environment jsdom
/**
 * Le panneau est replié à l'arrivée sur chaque page, et rien n'est mémorisé
 * (décision du 2026-10-28) : un clic sur une entrée du rail le déplie sans
 * naviguer — c'est l'entrée choisie dans le panneau qui mène à une page —,
 * et la navigation suivante le replie.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ chemin: "/etablissements/e1/calendrier" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.chemin,
  useSearchParams: () => new URLSearchParams(),
}));

import { AppSidebar } from "./AppSidebar";

afterEach(cleanup);

const ETAB = { id: "e1", raisonDisplay: "Le Comptoir", adresse: "1 rue", effectifSurSite: 4, entrepriseId: "ent-1" };
const COUNTS = { enRetardTotal: 0, calendrierAMettreAJour: false };
const barre = (active: "calendrier" | "equipements" | "registre") => (
  <AppSidebar etablissement={ETAB} active={active} counts={COUNTS} />
);
// Replié : le panneau est inerte, et n'affiche aucune entrée.
const replie = () => document.querySelector("[inert]") !== null;

describe("AppSidebar — repli du panneau", () => {
  it("replié à l'arrivée ; une entrée de rail l'ouvre sans naviguer, un second clic le referme", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    render(barre("calendrier"));
    expect(replie()).toBe(true);

    const securite = screen.getByRole("button", { name: /Sécurité/ });
    expect(securite.getAttribute("href")).toBeNull();
    fireEvent.click(securite);
    expect(replie()).toBe(false);
    expect(securite.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("link").some((a) => a.textContent?.includes("DUERP"))).toBe(true);

    fireEvent.click(securite);
    expect(replie()).toBe(true);
    expect(securite.getAttribute("aria-expanded")).toBe("false");
  });

  it("la navigation suivante le replie", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    const { rerender } = render(barre("calendrier"));
    fireEvent.click(screen.getByRole("button", { name: /Équipement/ }));
    expect(replie()).toBe(false);
    nav.chemin = "/etablissements/e1/registre";
    rerender(barre("registre"));
    expect(replie()).toBe(true);
  });

  it("le bouton de l'en-tête du panneau le replie", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    render(barre("calendrier"));
    fireEvent.click(screen.getByRole("button", { name: /Sécurité/ }));
    expect(replie()).toBe(false);
    fireEvent.click(screen.getByLabelText("Replier le panneau"));
    expect(replie()).toBe(true);
  });
});
