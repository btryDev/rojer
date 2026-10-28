// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PrescriptionActionState } from "@/lib/prescriptions/actions";
import { PrescriptionForm } from "./PrescriptionForm";

/**
 * Le champ et le bandeau disent la même chose, toujours.
 *
 * React 19 remet un `<form action={…}>` à blanc dès que l'action rend la
 * main. Le `<select>` piloté par l'état ne suivait pas : après un
 * enregistrement, il revenait à « Arrêté préfectoral » pendant que le bandeau
 * ambre « Engagement d'assurance… » restait affiché en dessous. L'un des deux
 * est le marquage que l'ADR-032 rend obligatoire ; l'autre dit qu'il ne
 * s'applique pas.
 */

afterEach(cleanup);

const obligations = [
  { id: "o1", libelle: "Vérification annuelle", periodicite: "annuelle" },
];
const equipements = [
  { id: "eq1", libelle: "Extincteur hall", categorie: "extincteur" },
];

function rendre(
  issue: PrescriptionActionState = { status: "success", prescriptionId: "p1" },
) {
  return render(
    <PrescriptionForm
      action={async () => issue}
      obligations={obligations}
      equipements={equipements}
    />,
  );
}

function choisirSource(valeur: string) {
  const select = screen.getByLabelText(/Nature de l'acte/) as HTMLSelectElement;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value",
  )!.set!;
  setter.call(select, valeur);
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return select;
}

const souffler = () => new Promise((r) => setTimeout(r, 40));

describe("le marquage contractuel suit le champ qui le déclenche", () => {
  it("après enregistrement, le champ ET le bandeau repartent ensemble", async () => {
    // 2026-10-18 : le défaut est la demande de l'assureur. On choisit
    // « Autre », le bandeau disparaît ; après l'enregistrement, le formulaire
    // repart sur l'assureur, ET le bandeau revient avec lui.
    const { container } = rendre();
    const select = choisirSource("autre");
    await souffler();
    expect(screen.queryByText(/Engagement d'assurance/)).toBeNull();

    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await souffler();

    const apres = screen.getByLabelText(
      /Nature de l'acte/,
    ) as HTMLSelectElement;
    expect(apres.value).toBe("demande_assureur");
    expect(screen.getByText(/Engagement d'assurance/)).toBeTruthy();
    // Le champ a bien été reconstruit : c'est le remontage qui remet les deux
    // d'accord, pas une remise à zéro de l'un des deux.
    expect(apres).not.toBe(select);
  });

  it("après un refus, le champ ET le bandeau gardent le choix ensemble", async () => {
    const { container } = rendre({
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: { dateDocument: ["Format attendu : AAAA-MM-JJ"] },
    });
    choisirSource("autre");
    await souffler();

    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await souffler();

    const apres = screen.getByLabelText(
      /Nature de l'acte/,
    ) as HTMLSelectElement;
    expect(apres.value).toBe("autre");
    expect(screen.queryByText(/Engagement d'assurance/)).toBeNull();
  });
});

describe("un assureur n'est pas une autorité (ADR-032)", () => {
  // 2026-10-18, décision de la propriétaire : le défaut est la demande de
  // l'assureur ; un acte d'autorité se saisit en « Autre acte ».
  it("le champ s'appelle « Assureur » par défaut, la source étant la demande de l'assureur", () => {
    rendre();
    expect(screen.getByLabelText("Assureur")).toBeTruthy();
    expect(screen.queryByLabelText("Autorité")).toBeNull();
  });

  it("et « Autorité » pour un acte saisi en « Autre »", async () => {
    rendre();
    choisirSource("autre");
    await souffler();
    expect(screen.getByLabelText("Autorité")).toBeTruthy();
  });

  it("le sélecteur ne propose que deux sources, l'assureur d'abord", () => {
    rendre();
    const select = document.querySelector<HTMLSelectElement>('select[name="source"]')!;
    expect([...select.options].map((o) => o.value)).toEqual(["demande_assureur", "autre"]);
  });
});

describe("l'exemple de référence suit la source (revue du 2026-10-18)", () => {
  const exemple = () => (screen.getByLabelText(/Référence/) as HTMLInputElement).placeholder;

  it("sous l'assureur (le défaut), pas d'arrêté préfectoral en exemple", () => {
    rendre();
    expect(exemple()).not.toMatch(/^AP /);
    expect(exemple()).toMatch(/Avenant/);
  });

  it("sous « Autre acte », l'exemple redevient un arrêté", async () => {
    rendre();
    choisirSource("autre");
    await souffler();
    expect(exemple()).toMatch(/^AP /);
  });
});


describe("présentation : cartes sur une page, à plat dans une modal", () => {
  it("par défaut, deux sections `carte-board`", () => {
    const { container } = rendre();
    expect(container.querySelectorAll("section.carte-board")).toHaveLength(2);
  });

  it("`aPlat` : aucune carte dans la carte, la seconde section sous un filet", () => {
    const { container } = render(
      <PrescriptionForm
        action={async () => ({ status: "idle" })}
        obligations={obligations}
        equipements={equipements}
        aPlat
      />,
    );
    const sections = container.querySelectorAll("section");
    expect(sections).toHaveLength(2);
    expect(container.querySelector(".carte-board")).toBeNull();
    expect(sections[1].className).toContain("border-t");
  });
});
