// @vitest-environment jsdom
/**
 * Le formulaire de l'abonnement (audit du 2026-11-16) : il part de la
 * formule en cours — un clic sans rien changer ne remplace pas Pro annuel
 * par Essentiel mensuel —, et le montant prélevé aujourd'hui est dit avant
 * tout paiement immédiat.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/abonnements/actions", () => ({ sAbonnerAction: vi.fn() }));

const { FormulaireAbonnement } = await import("./FormulaireAbonnement");
type Offres = Parameters<typeof FormulaireAbonnement>[0]["offres"];

const OFFRES: Offres = [
  {
    formule: "essentiel",
    libelle: "Essentiel",
    pourQui: "un site",
    points: [],
    prix: { mensuel: { cle: "rojer_essentiel_mensuel", centimes: 2_900 }, annuel: { cle: "rojer_essentiel_annuel", centimes: 29_500 } },
  },
  {
    formule: "pro",
    libelle: "Pro",
    pourQui: "plusieurs sites",
    points: [],
    prix: { mensuel: { cle: "rojer_pro_mensuel", centimes: 8_900 }, annuel: { cle: "rojer_pro_annuel", centimes: 89_900 } },
  },
];

const base = { offres: OFFRES, quand: "Quand.", compteId: "c1", libelle: "Changer de formule" } as const;
const formuleEnvoyee = (c: HTMLElement) => (c.querySelector('input[name="formule"]') as HTMLInputElement).value;
const principal = () => screen.getByRole("button", { name: base.libelle }) as HTMLButtonElement;

afterEach(cleanup);

describe("FormulaireAbonnement", () => {
  it("part de la formule et du rythme en cours ; le bouton reste fermé tant que rien ne change", () => {
    const { container } = render(
      <FormulaireAbonnement {...base} mode="changer" courante={{ formule: "pro", periodicite: "annuel" }} />,
    );
    expect(formuleEnvoyee(container)).toBe("rojer_pro_annuel");
    expect(principal().disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /Mensuel/ }));
    expect(formuleEnvoyee(container)).toBe("rojer_pro_mensuel");
    expect(principal().disabled).toBe(false);
  });

  it("sans formule en cours : Essentiel mensuel, bouton ouvert", () => {
    const { container } = render(<FormulaireAbonnement {...base} mode="enregistrer" />);
    expect(formuleEnvoyee(container)).toBe("rojer_essentiel_mensuel");
    expect(principal().disabled).toBe(false);
  });

  it("pendant l'essai : « Payer maintenant » porte immediat=oui et dit le montant du jour, TTC", () => {
    render(<FormulaireAbonnement {...base} mode="enregistrer" courante={{ formule: "pro", periodicite: "mensuel" }} proposerPayerMaintenant />);
    const payer = screen.getByRole("button", { name: "Payer maintenant" });
    expect(payer.getAttribute("name")).toBe("immediat");
    expect(payer.getAttribute("value")).toBe("oui");
    expect(screen.getByText(/lève les limites de l'essai/).textContent).toMatch(/89\s€ TTC prélevés aussitôt pour le premier mois/);
  });

  it("paiement imposé : le montant prélevé aujourd'hui est écrit, selon la sélection ; immediat=oui envoyé ; pas de second bouton", () => {
    render(<FormulaireAbonnement {...base} mode="payer" courante={{ formule: "essentiel", periodicite: "mensuel" }} />);
    expect(screen.getByText(/Prélevé aujourd'hui/).textContent).toMatch(/29\s€ TTC, pour le premier mois/);
    fireEvent.click(screen.getByRole("radio", { name: /Annuel/ }));
    expect(screen.getByText(/Prélevé aujourd'hui/).textContent).toMatch(/295\s€ TTC, pour la première année/);
    expect(screen.queryByRole("button", { name: "Payer maintenant" })).toBeNull();
    expect((document.querySelector('input[name="immediat"]') as HTMLInputElement).value).toBe("oui");
  });
});
