// @vitest-environment jsdom
/**
 * Le formulaire « S'abonner » (ADR-053 § 9, amendé le 2026-11-16) : une
 * formule et un rythme, un seul bouton vers la page de Stripe, et le montant
 * prélevé aujourd'hui dit avant le clic.
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

const base = { offres: OFFRES, quand: "Quand.", compteId: "c1" } as const;
const formuleEnvoyee = (c: HTMLElement) => (c.querySelector('input[name="formule"]') as HTMLInputElement).value;
const bouton = () => screen.getByRole("button", { name: "Continuer vers le paiement" }) as HTMLButtonElement;

afterEach(cleanup);

describe("FormulaireAbonnement", () => {
  it("sans présélection : Essentiel mensuel, un seul bouton, ouvert, et le montant du jour TTC", () => {
    const { container } = render(<FormulaireAbonnement {...base} />);
    expect(formuleEnvoyee(container)).toBe("rojer_essentiel_mensuel");
    expect(bouton().disabled).toBe(false);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText(/Prélevé aujourd.hui : 29\s€ TTC/)).toBeTruthy();
    expect(container.querySelector('input[name="immediat"]')).toBeNull();
  });

  it("part de la présélection (offre choisie, abonnement passé) ; le montant suit la sélection", () => {
    const { container } = render(<FormulaireAbonnement {...base} courante={{ formule: "pro", periodicite: "annuel" }} />);
    expect(formuleEnvoyee(container)).toBe("rojer_pro_annuel");
    expect(screen.getByText(/Prélevé aujourd.hui : 899\s€ TTC/)).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /Mensuel/ }));
    expect(formuleEnvoyee(container)).toBe("rojer_pro_mensuel");
    expect(screen.getByText(/Prélevé aujourd.hui : 89\s€ TTC/)).toBeTruthy();
  });

  it("prix indisponible : le bouton reste fermé", () => {
    const sansPrix: Offres = OFFRES.map((o) => ({ ...o, prix: { mensuel: { ...o.prix.mensuel, centimes: null }, annuel: o.prix.annuel } }));
    render(<FormulaireAbonnement {...base} offres={sansPrix} />);
    expect(bouton().disabled).toBe(true);
  });
});
