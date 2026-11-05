// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/etablissements/e/verifications/v",
  useSearchParams: () => new URLSearchParams(),
}));
const { SuiviControle } = await import("./SuiviControle");

// Le contrôle réservé à un organisme agréé (2026-11-05) : l'annuaire se range
// par agrément, et un prestataire non déclaré agréé est signalé, sans bloquer.

afterEach(cleanup);

const action = async () => ({ status: "idle" as const });
const apave = { id: "p1", raisonSociale: "Apave", couvre: false, estOrganismeAgree: true };
const martin = { id: "p2", raisonSociale: "Élec Martin", couvre: true, estOrganismeAgree: false };
const fiche = {
  id: "p2",
  raisonSociale: "Élec Martin",
  contactNom: "M. Martin",
  contactTelephone: null,
  contactEmail: "m@exemple.fr",
  estOrganismeAgree: false,
};

function rendre(agrementExige: boolean, prestataire: typeof fiche | null = null) {
  return render(
    <SuiviControle
      action={action}
      prestataire={prestataire}
      rendezVousLe={null}
      rendezVousNote={null}
      enAttenteDeRapport={false}
      proposables={[apave, martin]}
      hrefNouveauPrestataire="/n"
      hrefPrestataire={prestataire ? "/etablissements/e/prestataires/p2" : null}
      echeance={null}
      agrementExige={agrementExige}
    />,
  );
}

const groupes = (c: HTMLElement) =>
  [...c.querySelectorAll("optgroup")].map((g) => [g.label, [...g.querySelectorAll("option")].map((o) => o.textContent)]);
const ALERTE = /n'est pas déclaré agréé/;

describe("SuiviControle : l'agrément du prestataire", () => {
  it("contrôle réservé : les organismes agréés d'abord, puis les autres", () => {
    const { container } = rendre(true);
    fireEvent.click(screen.getByRole("button", { name: /Choisir un prestataire/ }));
    expect(groupes(container)).toEqual([
      ["Organismes agréés", ["Apave"]],
      ["Non déclarés agréés", ["Élec Martin"]],
    ]);
  });

  it("sinon, l'annuaire reste rangé par domaine couvert", () => {
    const { container } = rendre(false);
    fireEvent.click(screen.getByRole("button", { name: /Choisir un prestataire/ }));
    expect(groupes(container)).toEqual([
      ["Couvrent ce contrôle", ["Élec Martin"]],
      ["Autres prestataires", ["Apave"]],
    ]);
  });

  it("choisir un prestataire non déclaré agréé le signale au choix, et l'alerte part avec un agréé", () => {
    rendre(true);
    fireEvent.click(screen.getByRole("button", { name: /Choisir un prestataire/ }));
    const select = screen.getByLabelText("Prestataire attitré");
    expect(screen.queryByText(ALERTE)).toBeNull();
    fireEvent.change(select, { target: { value: "p2" } });
    expect(screen.getAllByText(ALERTE)).toHaveLength(1);
    fireEvent.change(select, { target: { value: "p1" } });
    expect(screen.queryByText(ALERTE)).toBeNull();
  });

  it("l'attitré non déclaré agréé est signalé sur la carte, une seule fois même formulaire ouvert", () => {
    rendre(true, fiche);
    expect(screen.getAllByText(ALERTE)).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Modifier sa fiche" }).getAttribute("href")).toBe(
      "/etablissements/e/prestataires/p2/modifier",
    );
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    expect(screen.getAllByText(ALERTE)).toHaveLength(1);
  });

  it("rien à signaler quand le contrôle admet un autre réalisateur", () => {
    rendre(false, fiche);
    expect(screen.queryByText(ALERTE)).toBeNull();
  });
});
