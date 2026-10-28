// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PrescriptionActionState } from "@/lib/prescriptions/actions";
import { NouvellePrescription } from "./NouvellePrescription";

/**
 * Le formulaire vit dans une modal ouverte par le bouton du haut de page
 * (2026-10-28) : elle se ferme sur un enregistrement réussi, et reste
 * ouverte — erreurs visibles — sur un refus.
 */

afterEach(cleanup);

const souffler = () => new Promise((r) => setTimeout(r, 40));

function rendre(
  issue: PrescriptionActionState,
  ouvertAuDepart = false,
) {
  return render(
    <NouvellePrescription
      action={async () => issue}
      obligations={[]}
      equipements={[]}
      ouvertAuDepart={ouvertAuDepart}
    />,
  );
}

function soumettre() {
  document
    .querySelector("form")!
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

describe("NouvellePrescription", () => {
  it("fermée au départ, le bouton ouvre le formulaire", () => {
    rendre({ status: "success", prescriptionId: "p1" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter une prescription" }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Déclarer une prescription")).toBeTruthy();
    expect(document.querySelector("form")).toBeTruthy();
  });

  it("s'ouvre d'elle-même quand on arrive pour déclarer (?source=)", () => {
    rendre({ status: "success", prescriptionId: "p1" }, true);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("se ferme après un enregistrement réussi, et le dit", async () => {
    rendre({ status: "success", prescriptionId: "p1" }, true);
    soumettre();
    await souffler();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Prescription enregistrée.");
  });

  it("reste ouverte sur un refus, le message affiché", async () => {
    rendre(
      {
        status: "error",
        message: "Formulaire invalide",
        fieldErrors: { dateDocument: ["Format attendu : AAAA-MM-JJ"] },
      },
      true,
    );
    soumettre();
    await souffler();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Formulaire invalide")).toBeTruthy();
    expect(screen.getByText("Format attendu : AAAA-MM-JJ")).toBeTruthy();
  });

  it("modal large, formulaire à plat : pas de carte dans la carte", () => {
    rendre({ status: "success", prescriptionId: "p1" }, true);
    const panneau = document.querySelector("[data-largeur]") as HTMLElement;
    expect(panneau.dataset.largeur).toBe("large");
    expect(panneau.querySelector(".carte-board")).toBeNull();
  });

  it("la croix ferme la modal", () => {
    rendre({ status: "success", prescriptionId: "p1" }, true);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
