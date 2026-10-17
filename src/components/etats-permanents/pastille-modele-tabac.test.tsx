// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PastilleFondement } from "./PastilleFondement";
import { fondementDe } from "@/lib/etats-permanents/fondement";
import { obligationParId, type Obligation } from "@/lib/referentiels/conformite";

// Contrôle visuel du sous-lot D (2026-10-17) : la description d'une ligne ne
// s'affiche pas sur « Ce qui doit être en place ». Le modèle de signalisation
// de l'arrêté du 21 juillet 2025 et son format se lisent donc dans la pastille
// de R. 3512-7, sur la ligne elle-même.

afterEach(cleanup);

const rendu = (o = obligationParId("signalisation-interdiction-fumer-csp")!) =>
  render(<PastilleFondement fondement={fondementDe(o)!} />).container.textContent ?? "";

describe("signalisation de l'interdiction de fumer : le modèle se voit sur la ligne", () => {
  it("la pastille nomme l'arrêté du 21 juillet 2025 et le format A5", () => {
    const texte = rendu();
    expect(texte).toContain("21 juillet 2025");
    expect(texte).toContain("A5");
  });

  it("cassure : une référence fondatrice muette sur le modèle ne le montre plus", () => {
    const o = obligationParId("signalisation-interdiction-fumer-csp")!;
    const [premiere, ...reste] = o.referencesLegales;
    const casse = {
      ...o,
      referencesLegales: [{ ...premiere, reference: "Code de la santé publique, art. R. 3512-7" }, ...reste],
    } as Obligation;
    const texte = rendu(casse);
    expect(texte).not.toContain("21 juillet 2025");
  });
});
