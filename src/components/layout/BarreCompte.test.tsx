// @vitest-environment jsdom
/**
 * Le choix du compte dans la gélule (ADR-054 § 7) : à partir de deux comptes,
 * le menu « Compte » les liste, le compte où l'on travaille coché. Chaque
 * entrée est un formulaire ouvert à la lecture seule (`data-saisie-ouverte`) :
 * changer de compte n'écrit rien dans le dossier.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/lib/auth/actions", () => ({ signOutAction: vi.fn() }));
vi.mock("@/lib/etablissements/actions", () => ({ choisirEtablissementActif: vi.fn() }));
vi.mock("@/lib/membres/actions", () => ({ choisirCompte: vi.fn() }));

import { BarreCompte } from "./BarreCompte";

afterEach(cleanup);

const ouvrirLeCompte = () => {
  fireEvent.click(screen.getByRole("button", { name: "Compte" }));
  return within(screen.getByRole("menu", { name: "Compte" }));
};

describe("BarreCompte — choix du compte", () => {
  it("à partir de deux comptes, les liste, le compte actif coché, en formulaires ouverts à la lecture seule", () => {
    render(
      <BarreCompte
        etablissementId="e1"
        email="a@exemple.test"
        comptes={[
          { compteId: "c1", nom: "Boulangerie" },
          { compteId: "c2", nom: "Cabinet du frère" },
        ]}
        compteActif="c2"
      />,
    );
    const menu = ouvrirLeCompte();
    const groupe = within(menu.getByRole("group", { name: "Comptes" }));
    const entrees = groupe.getAllByRole("menuitem");
    expect(entrees.map((e) => e.textContent)).toEqual(["Boulangerie", "Cabinet du frère"]);
    expect(entrees.map((e) => e.getAttribute("aria-current"))).toEqual([null, "true"]);
    for (const e of entrees) {
      const form = e.closest("form")!;
      expect(form.hasAttribute("data-saisie-ouverte")).toBe(true);
      expect(form.hasAttribute("data-ecriture")).toBe(false);
    }
    expect((entrees[0].closest("form")!.querySelector('input[name="compte"]') as HTMLInputElement).value).toBe("c1");
  });

  it("avec un seul compte, rien à choisir", () => {
    render(<BarreCompte etablissementId="e1" email="a@exemple.test" comptes={[{ compteId: "c1", nom: "Boulangerie" }]} compteActif="c1" />);
    expect(ouvrirLeCompte().queryByRole("group", { name: "Comptes" })).toBeNull();
  });

  it("« Ajouter un établissement » est masqué en lecture seule", () => {
    render(<BarreCompte etablissementId="e1" email="a@exemple.test" />);
    expect(ouvrirLeCompte().getByRole("menuitem", { name: /Ajouter un établissement/ }).hasAttribute("data-ecriture")).toBe(true);
  });
});
