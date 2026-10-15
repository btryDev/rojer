// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { InvitationTypePoint } from "./InvitationTypePoint";

afterEach(cleanup);

describe("InvitationTypePoint — préciser le type d'un point d'avant le type", () => {
  it("s'affiche quand le type est inconnu, champ et encre ambre ensemble (charte § 1.5)", () => {
    const { container } = render(<InvitationTypePoint typePoint={null} />);
    const p = container.querySelector("p")!;
    expect(p.textContent).toContain("Type de point non précisé");
    expect(p.textContent).toContain("Modifier le point");
    expect(p.className).toContain("bg-[color:var(--board-amber)]");
    expect(p.className).toContain("text-[color:var(--board-amber-ink)]");
  });

  it("ne s'affiche pas pour un point typé", () => {
    const { container } = render(<InvitationTypePoint typePoint="PUISAGE_TOILETTE" />);
    expect(container.innerHTML).toBe("");
  });
});
