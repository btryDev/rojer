// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { EtablissementForm } from "./EtablissementForm";

// Filtre à l'accueil (2026-10-17) : sur la fiche, la question de l'accueil
// d'enfants n'est posée qu'à l'ENTRÉE du type R.

afterEach(cleanup);

const action = async () => ({ status: "idle" as const });
const entreprise = { id: "ent", effectif: 10 };

function fiche(typeErp: string, typesErpAutres: string[] = []) {
  return render(
    <EtablissementForm
      action={action}
      libelleSubmit="Enregistrer"
      entreprise={entreprise}
      valeursInitiales={{ raisonDisplay: "É", estEtablissementTravail: true, estERP: true, typeErp, typesErpAutres, categorieErp: "N5" }}
    />,
  );
}

const question = (c: HTMLElement) => c.querySelector('select[name="accueilEnfants"]');

describe("fiche : la question de l'accueil d'enfants", () => {
  it("un établissement déjà R n'est pas réinterrogé", () => {
    expect(question(fiche("R").container)).toBeNull();
  });

  it("un restaurant qui passe en R : la question apparaît, réponse exigée", () => {
    const { container } = fiche("N");
    expect(question(container)).toBeNull();
    fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="typeErp"]')!, { target: { value: "R" } });
    const q = question(container) as HTMLSelectElement | null;
    expect(q).not.toBeNull();
    expect(q!.required).toBe(true);
  });
});
