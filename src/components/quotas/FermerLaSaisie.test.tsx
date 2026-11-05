// @vitest-environment jsdom
// La saisie fermée annoncée dès l'ouverture (ADR-053 § 14, lot D) : un
// formulaire qui écrit ne part plus pour être refusé après coup ; la lecture
// et les gestes ouverts restent possibles.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FermerLaSaisie, formulaireQuiEcrit } from "./FermerLaSaisie";

afterEach(cleanup);

function Ecran({ motif, annonce }: { motif: string | null; annonce?: boolean }) {
  return (
    <div data-zone-saisie data-testid="zone">
      <FermerLaSaisie motif={motif} annonce={annonce} />
      <form method="post" data-testid="ecrit" onSubmit={envoye}>
        <button type="submit">Créer</button>
      </form>
      <form method="get" data-testid="filtre" onSubmit={envoye}>
        <button type="submit">Filtrer</button>
      </form>
      <form method="post" data-saisie-ouverte data-testid="aide" onSubmit={envoye}>
        <button type="submit">Demander de l&apos;aide</button>
      </form>
    </div>
  );
}
const envoye = vi.fn((e: React.FormEvent) => e.preventDefault());

describe("FermerLaSaisie", () => {
  it("un formulaire qui écrit : une server action (POST, ou l'action `javascript:` de React)", () => {
    const f = () => document.createElement("form");
    const post = f();
    post.setAttribute("method", "POST");
    const action = f();
    action.setAttribute("action", "javascript:throw new Error('React form')");
    const get = f();
    get.setAttribute("method", "get");
    expect([formulaireQuiEcrit(post), formulaireQuiEcrit(action), formulaireQuiEcrit(get)]).toEqual([true, true, false]);
  });

  it("fermée : l'écriture ne part pas, la lecture et le geste ouvert si ; le motif est dit", () => {
    envoye.mockClear();
    render(<Ecran motif="Votre formule Essentiel couvre 10 prestataires." annonce />);
    expect(screen.getByText("Votre formule Essentiel couvre 10 prestataires.")).toBeTruthy();
    expect(screen.getByTestId("zone").hasAttribute("data-saisie-fermee")).toBe(true);
    fireEvent.submit(screen.getByTestId("ecrit"));
    expect(envoye).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByTestId("filtre"));
    fireEvent.submit(screen.getByTestId("aide"));
    expect(envoye).toHaveBeenCalledTimes(2);
  });

  it("ouverte : rien ne change, rien n'est dit", () => {
    envoye.mockClear();
    render(<Ecran motif={null} annonce />);
    expect(screen.getByTestId("zone").hasAttribute("data-saisie-fermee")).toBe(false);
    fireEvent.submit(screen.getByTestId("ecrit"));
    expect(envoye).toHaveBeenCalledTimes(1);
  });
});
