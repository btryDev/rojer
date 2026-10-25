// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

// Une page dont le dessin n'existe pas encore. Simulée plutôt que prise dans
// le rail : une fois toutes les pages illustrées, aucune n'en manquerait et
// le cas ne serait plus jamais vérifié.
vi.mock("./illustrations", () => ({
  aUneIllustration: () => false,
  IllustrationEnTete: () => null,
}));

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
});
