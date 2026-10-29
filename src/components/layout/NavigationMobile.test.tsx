// @vitest-environment jsdom
/**
 * La navigation du téléphone (2026-10-29) : les cinq entrées du rail en bas,
 * le même geste — un appui ouvre la feuille de la catégorie sans naviguer —,
 * et les mêmes règles de repli que le panneau de l'ordinateur.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const nav = vi.hoisted(() => ({ chemin: "/etablissements/e1/calendrier" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.chemin,
  useSearchParams: () => new URLSearchParams(),
}));

import { AppSidebar } from "./AppSidebar";

// Un écran de téléphone : la feuille n'existe que sous 48rem.
beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q === "(width < 48rem)",
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ETAB = { id: "e1", raisonDisplay: "Le Comptoir des Halles", adresse: "1 rue", effectifSurSite: 4, entrepriseId: "ent-1" };
const COUNTS = { enRetardTotal: 3, calendrierAMettreAJour: false };
const barre = (active: "calendrier" | "registre") => (
  <AppSidebar etablissement={ETAB} active={active} counts={COUNTS} />
);
const basDePage = () =>
  within(screen.getByRole("navigation", { name: "Navigation principale" }));
const feuille = () => screen.queryByRole("dialog");

describe("NavigationMobile", () => {
  it("porte les cinq entrées du rail, et allume celle de la page", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    render(barre("calendrier"));
    const boutons = basDePage().getAllByRole("button");
    expect(boutons.map((b) => b.textContent)).toEqual([
      "À faire",
      "Sécurité",
      "Équipement",
      "Documents",
      "Paramètres",
    ]);
    expect(boutons[0].getAttribute("aria-current")).toBe("page");
    expect(boutons[1].getAttribute("aria-current")).toBeNull();
  });

  it("un appui ouvre la feuille sans naviguer, un second la referme", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    render(barre("calendrier"));
    expect(feuille()).toBeNull();

    const securite = basDePage().getByRole("button", { name: /Sécurité/ });
    expect(securite.getAttribute("href")).toBeNull();
    fireEvent.click(securite);
    const f = feuille()!;
    expect(f.getAttribute("aria-label")).toBe("Santé-sécurité");
    expect(within(f).getAllByRole("link").some((a) => a.textContent?.includes("DUERP"))).toBe(true);
    expect(securite.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(securite);
    expect(feuille()).toBeNull();
  });

  it("Échap referme la feuille et rend le focus à son onglet", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    render(barre("calendrier"));
    const aFaire = basDePage().getByRole("button", { name: /À faire/ });
    fireEvent.click(aFaire);
    // Le focus est entré dans la feuille, sur sa première entrée.
    expect(feuille()!.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(feuille()).toBeNull();
    expect(document.activeElement).toBe(aFaire);
  });

  it("la navigation suivante la referme", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    const { rerender } = render(barre("calendrier"));
    fireEvent.click(basDePage().getByRole("button", { name: /Équipement/ }));
    expect(feuille()).not.toBeNull();
    nav.chemin = "/etablissements/e1/registre";
    rerender(barre("registre"));
    expect(feuille()).toBeNull();
  });

  it("la marque ramène au tableau de bord et nomme l'établissement", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    render(barre("calendrier"));
    const marques = screen
      .getAllByRole("link")
      .filter((a) => a.textContent?.includes("Le Comptoir des Halles"));
    expect(marques).toHaveLength(1);
    expect(marques[0].getAttribute("href")).toBe("/etablissements/e1");
  });

  it("Échap laisse la feuille ouverte sous une fenêtre ouverte depuis elle", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    render(barre("calendrier"));
    fireEvent.click(basDePage().getByRole("button", { name: /À faire/ }));
    const fenetre = document.createElement("div");
    fenetre.setAttribute("data-panneau-modal", "");
    document.body.appendChild(fenetre);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(feuille()).not.toBeNull();
    fenetre.remove();
  });

  it("un lien vers la page où l'on est referme la feuille", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    render(barre("calendrier"));
    fireEvent.click(basDePage().getByRole("button", { name: /À faire/ }));
    const calendrier = within(feuille()!)
      .getAllByRole("link")
      .find((a) => a.getAttribute("href") === "/etablissements/e1/calendrier")!;
    fireEvent.click(calendrier);
    expect(feuille()).toBeNull();
  });

  it("un Cmd-clic, qui ouvre un nouvel onglet, laisse la feuille ouverte", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    render(barre("calendrier"));
    fireEvent.click(basDePage().getByRole("button", { name: /À faire/ }));
    const calendrier = within(feuille()!)
      .getAllByRole("link")
      .find((a) => a.getAttribute("href") === "/etablissements/e1/calendrier")!;
    fireEvent.click(calendrier, { metaKey: true });
    expect(feuille()).not.toBeNull();
  });

  it("sur ordinateur, pas de feuille : le panneau du rail suffit", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    nav.chemin = "/etablissements/e1/calendrier";
    render(barre("calendrier"));
    fireEvent.click(basDePage().getByRole("button", { name: /À faire/ }));
    expect(feuille()).toBeNull();
  });

  it("le voile referme la feuille", () => {
    nav.chemin = "/etablissements/e1/calendrier";
    const { container } = render(barre("calendrier"));
    fireEvent.click(basDePage().getByRole("button", { name: /Documents/ }));
    const voile = container.querySelector("[data-voile]");
    expect(voile).not.toBeNull();
    fireEvent.click(voile!);
    expect(feuille()).toBeNull();
  });
});
