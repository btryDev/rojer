// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PastilleFondement } from "./PastilleFondement";

// Le fondement d'un établissement à plusieurs types (ADR-045) : un article
// principal et un complément PAR type. Éprouvé en ne rendant que le premier
// complément : rouge.
afterEach(cleanup);

const ligne = (reference: string) => ({ reference, href: null, extrait: null });

describe("PastilleFondement — plusieurs compléments", () => {
  it("rend le principal et chacun des compléments", () => {
    const { container } = render(
      <PastilleFondement
        fondement={{ ...ligne("art. N 17"), complement: [ligne("art. O 18"), ligne("art. W 13")] }}
      />,
    );
    expect(container.textContent).toContain("art. N 17");
    expect(container.textContent).toContain("art. O 18");
    expect(container.textContent).toContain("art. W 13");
  });
});
