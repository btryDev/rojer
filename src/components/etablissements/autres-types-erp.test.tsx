// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { EtablissementForm } from "./EtablissementForm";

// Plusieurs types d'ERP à la fiche établissement (ADR-045, lot 3). La règle
// de la propriétaire contre le zèle : la majorité, à un seul type, ne voit
// rien de plus qu'un lien replié, et aucun champ obligatoire n'est ajouté.
//
// Éprouvé en cassant (commit du lot) : `<details open>` par défaut — le
// premier test rougit ; la question du sommeil lue sur le premier type seul —
// le dernier rougit.

afterEach(cleanup);

const action = async () => ({ status: "idle" as const });
const entreprise = { id: "ent", effectif: 10 };

function fiche(typeErp: string, typesErpAutres: string[], comporteLocauxSommeilPublic: boolean | null = null) {
  return render(
    <EtablissementForm
      action={action}
      libelleSubmit="Enregistrer"
      entreprise={entreprise}
      valeursInitiales={{
        raisonDisplay: "Le Port",
        estEtablissementTravail: true,
        estERP: true,
        typeErp,
        typesErpAutres,
        categorieErp: "N3",
        comporteLocauxSommeilPublic,
      }}
    />,
  );
}

const sommeil = (c: HTMLElement) => c.querySelector('select[name="comporteLocauxSommeilPublic"]');

describe("fiche établissement : les autres types d'ERP", () => {
  it("un seul type : un lien replié, aucune case cochée, rien d'obligatoire", () => {
    const { container, getByText } = fiche("N", []);
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    expect(getByText(/plusieurs types/)).toBeTruthy();
    const cases = [...container.querySelectorAll<HTMLInputElement>('input[name="typesErpAutres"]')];
    expect(cases.length).toBe(21); // les 22 types, moins le premier
    expect(cases.some((c) => c.checked || c.required)).toBe(false);
    // Le témoin est posté : des cases toutes décochées disent « aucun ».
    expect(container.querySelector('input[type="hidden"][name="typesErpAutresAffiche"]')).not.toBeNull();
  });

  it("des autres types enregistrés : le lien s'ouvre et les montre cochés", () => {
    const { container } = fiche("N", ["O"]);
    expect(container.querySelector("details")!.open).toBe(true);
    const o = container.querySelector<HTMLInputElement>('input[name="typesErpAutres"][value="O"]')!;
    expect(o.checked).toBe(true);
  });

  it("le premier type n'est pas proposé parmi les autres, et en sort s'il y était", () => {
    const { container } = fiche("N", ["O"]);
    expect(container.querySelector('input[name="typesErpAutres"][value="N"]')).toBeNull();
    fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="typeErp"]')!, {
      target: { value: "O" },
    });
    expect(container.querySelector('input[name="typesErpAutres"][value="O"]')).toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[name="typesErpAutres"][value="N"]')!.checked).toBe(false);
  });

  it("la question du sommeil apparaît dès qu'un des types l'appelle", () => {
    const { container } = fiche("N", []);
    expect(sommeil(container)).toBeNull();
    fireEvent.click(container.querySelector<HTMLInputElement>('input[name="typesErpAutres"][value="O"]')!);
    expect(sommeil(container)).not.toBeNull();
    // Et un N + O enregistré l'a d'emblée, avec sa réponse.
    cleanup();
    const { container: c2 } = fiche("N", ["O"], true);
    expect((sommeil(c2) as HTMLSelectElement).value).toBe("oui");
  });
});
