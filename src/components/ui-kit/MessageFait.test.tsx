// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MessageFait } from "./MessageFait";

afterEach(cleanup);

describe("MessageFait — la ligne « enregistré »", () => {
  it("une région `status`, une taille, l'encre « Fait »", () => {
    render(<MessageFait>Rapport enregistré.</MessageFait>);
    const ligne = screen.getByRole("status");
    expect(ligne.textContent).toBe("Rapport enregistré.");
    expect(ligne.className).toContain("text-[12.5px]");
    expect(ligne.className).toContain("text-[color:var(--board-green-ink)]");
  });

  it("vide, la région reste posée — c'est elle qui annoncera le message", () => {
    render(<MessageFait>{null}</MessageFait>);
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
