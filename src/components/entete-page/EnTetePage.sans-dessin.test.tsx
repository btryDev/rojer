// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

// Une page dont le dessin n'existe pas encore. Simulée plutôt que prise dans
// le rail : une fois toutes les pages illustrées, aucune n'en manquerait et
// le cas ne serait plus jamais vérifié.
// [2026-10-28] La règle « dessin ou pas » vit dans `illustrations/liste`,
// lue aussi par le repli de chargement : c'est ce module qu'on simule.
vi.mock("./illustrations/liste", () => ({
  aUneIllustration: () => false,
  ITEMS_ILLUSTRES: [],
}));

import { ChargementSection } from "./ChargementSection";
import { EnTetePage } from "./EnTetePage";

afterEach(cleanup);

describe("EnTetePage sans illustration", () => {
  it("n'ouvre pas de panneau teinté vide", () => {
    const { container } = render(<EnTetePage item="calendrier" description="x" />);
    expect(container.querySelector("[data-teinte-section]")).toBeNull();
  });

  it("garde le liseré de la teinte sur téléphone", () => {
    const { container } = render(<EnTetePage item="calendrier" description="x" />);
    expect(container.querySelector("header > div[aria-hidden]")).not.toBeNull();
  });

  // Même règle pour le repli : un panneau dans l'attente, aucun à l'arrivée,
  // et l'en-tête changerait de forme.
  it("son repli de chargement n'en ouvre pas non plus", () => {
    const { container } = render(<ChargementSection item="calendrier" />);
    expect(container.querySelector("[data-teinte-section]")).toBeNull();
  });
});
