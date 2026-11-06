// @vitest-environment jsdom
// La saisie fermée annoncée dès l'ouverture (ADR-053 § 14, lot D) : un
// formulaire qui écrit ne part plus pour être refusé après coup ; la lecture
// et les gestes ouverts restent possibles.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createPortal } from "react-dom";
import { FermerLaSaisie, VerrouDeLaPage, formulaireQuiEcrit } from "./FermerLaSaisie";

afterEach(cleanup);

const envoye = vi.fn((e: React.FormEvent) => e.preventDefault());

function Formulaires() {
  return (
    <>
      <form method="post" data-testid="ecrit" onSubmit={envoye}>
        <button type="submit">Créer</button>
      </form>
      <form method="get" data-testid="filtre" onSubmit={envoye}>
        <button type="submit">Filtrer</button>
      </form>
      <form method="post" data-saisie-ouverte data-testid="ouvert" onSubmit={envoye}>
        <button type="submit">Se déconnecter</button>
      </form>
    </>
  );
}

describe("formulaireQuiEcrit", () => {
  it("une server action (POST, ou l'action `javascript:` de React), sauf un formulaire ouvert", () => {
    const f = (attr: string, valeur: string) => {
      const form = document.createElement("form");
      form.setAttribute(attr, valeur);
      return form;
    };
    const ouvert = f("method", "post");
    ouvert.setAttribute("data-saisie-ouverte", "");
    expect(
      [f("method", "POST"), f("action", "javascript:throw new Error('React form')"), f("method", "get"), ouvert].map(formulaireQuiEcrit),
    ).toEqual([true, true, false, false]);
  });
});

describe("FermerLaSaisie (sa zone, rendue côté serveur)", () => {
  it("fermée : le motif est dit, l'écriture ne part pas, la lecture et le geste ouvert si", () => {
    envoye.mockClear();
    const { container } = render(
      <FermerLaSaisie motif="Votre formule Essentiel couvre 10 prestataires.">
        <Formulaires />
      </FermerLaSaisie>,
    );
    expect(screen.getAllByText("Votre formule Essentiel couvre 10 prestataires.").length).toBeGreaterThan(0);
    expect(container.querySelector("[data-saisie-fermee]")).not.toBeNull();
    // Dès l'ouverture : le bouton d'envoi est désactivé, et dit pourquoi à un lecteur d'écran.
    const creer = screen.getByText("Créer");
    expect(creer.getAttribute("aria-disabled")).toBe("true");
    expect(document.getElementById(creer.getAttribute("aria-describedby")!)?.textContent).toBe("Votre formule Essentiel couvre 10 prestataires.");
    expect(screen.getByText("Filtrer").hasAttribute("aria-disabled")).toBe(false);
    expect(screen.getByText("Se déconnecter").hasAttribute("aria-disabled")).toBe(false);
    fireEvent.submit(screen.getByTestId("ecrit"));
    expect(envoye).not.toHaveBeenCalled();
    // Au clic : une alerte, près du bouton.
    expect(screen.getByRole("alert").textContent).toBe("Non envoyé : Votre formule Essentiel couvre 10 prestataires.");
    fireEvent.submit(screen.getByTestId("filtre"));
    fireEvent.submit(screen.getByTestId("ouvert"));
    expect(envoye).toHaveBeenCalledTimes(2);
  });

  it("ouverte : rien ne change, rien n'est dit", () => {
    envoye.mockClear();
    const { container } = render(
      <FermerLaSaisie motif={null}>
        <Formulaires />
      </FermerLaSaisie>,
    );
    expect(container.querySelector("[data-saisie-fermee]")).toBeNull();
    fireEvent.submit(screen.getByTestId("ecrit"));
    expect(envoye).toHaveBeenCalledTimes(1);
  });
});

describe("VerrouDeLaPage (frère des pages d'une mise en page)", () => {
  it("ferme la page, panneaux en portail compris ; pas ce qui est hors de la zone", () => {
    envoye.mockClear();
    render(
      <>
        <form method="post" data-testid="hors-zone" onSubmit={envoye}>
          <button type="submit">Déconnexion (barre du compte)</button>
        </form>
        <div data-zone-saisie data-testid="zone">
          <VerrouDeLaPage motif="Accès en lecture seule." />
          <form method="post" data-testid="page" onSubmit={envoye}>
            <button type="submit">Enregistrer</button>
          </form>
          {createPortal(
            <div data-portail-saisie>
              <form method="post" data-testid="panneau" onSubmit={envoye}>
                <button type="submit">Ajouter</button>
              </form>
            </div>,
            document.body,
          )}
        </div>
      </>,
    );
    expect(screen.getByTestId("zone").hasAttribute("data-saisie-fermee")).toBe(true);
    fireEvent.submit(screen.getByTestId("page"));
    fireEvent.submit(screen.getByTestId("panneau"));
    expect(envoye).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByTestId("hors-zone"));
    expect(envoye).toHaveBeenCalledTimes(1);
  });
});
