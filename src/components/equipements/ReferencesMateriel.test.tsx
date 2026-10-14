// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ReferencesMateriel } from "./ReferencesMateriel";
import { materielNonCouvert } from "@/lib/equipements/materiels-non-couverts";

// Le composant que rendent l'encart du formulaire ET la fiche de l'équipement
// (revue du lot, point 3) : il nomme chaque texte, sans rien en omettre.

afterEach(cleanup);

describe("ReferencesMateriel", () => {
  it("rend chaque texte du matériel, l'escalier mécanique avec AS 10", () => {
    const { container } = render(
      <ReferencesMateriel references={materielNonCouvert("escalier_mecanique")!.references} />,
    );
    expect(container.textContent).toContain("Arrêté du 25 juin 1980, art. AS 10");
  });

  it("l'eau : R. 1321-60 et les cinq articles de l'arrêté du 10 septembre 2021", () => {
    const refs = materielNonCouvert("reservoir_eau")!.references;
    const { container } = render(<ReferencesMateriel references={refs} />);
    expect(container.querySelectorAll("li")).toHaveLength(refs.length);
    expect(container.textContent).toContain("art. R. 1321-60");
    expect(container.textContent).toContain("Arrêté du 10 septembre 2021, art. 4");
  });

  it("sans référence, rien", () => {
    const { container } = render(<ReferencesMateriel references={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
