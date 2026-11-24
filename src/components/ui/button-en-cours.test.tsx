// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Button, buttonVariants } from "./button";

afterEach(cleanup);

// Apple HIG, « Buttons » (2026-11-24) : une action qui n'est pas instantanée
// montre une roue DANS le bouton ; le bouton se ferme et se dit occupé.
describe("Button — enCours", () => {
  it("au repos : ni roue, ni aria-busy, ouvert", () => {
    render(<Button>Enregistrer</Button>);
    const b = screen.getByRole("button", { name: "Enregistrer" });
    expect(b.getAttribute("aria-busy")).toBeNull();
    expect(b.hasAttribute("disabled")).toBe(false);
    expect(b.querySelector("[data-roue]")).toBeNull();
  });

  it("en cours : la roue en tête, fermé, occupé, sans pâlir", () => {
    render(<Button enCours>Enregistrement…</Button>);
    const b = screen.getByRole("button", { name: "Enregistrement…" });
    expect(b.getAttribute("aria-busy")).toBe("true");
    expect(b.hasAttribute("disabled")).toBe(true);
    expect(b.firstElementChild?.hasAttribute("data-roue")).toBe(true);
    expect(b.className).toContain("disabled:opacity-100");
    expect(b.className).not.toContain("disabled:opacity-50");
  });

  it("un `disabled` de l'appelant reste lu quand rien n'est en cours", () => {
    render(<Button disabled>Valider</Button>);
    const b = screen.getByRole("button", { name: "Valider" });
    expect(b.hasAttribute("disabled")).toBe(true);
    expect(b.getAttribute("aria-busy")).toBeNull();
  });

  it("la cible tactile de 44 px : pilules oui, petits formats non", () => {
    expect(buttonVariants({ size: "board" })).toContain("cible-tactile");
    expect(buttonVariants({ size: "boardSm" })).toContain("cible-tactile");
    expect(buttonVariants({ size: "sm" })).not.toContain("cible-tactile");
    expect(buttonVariants({ size: "icon-xs" })).not.toContain("cible-tactile");
  });
});

describe("BoutonOccupe — le même contrat pour un bouton fait main", () => {
  it("en cours : roue, fermé, occupé ; au repos : rien", async () => {
    const { BoutonOccupe } = await import("./bouton-occupe");
    const { rerender } = render(<BoutonOccupe enCours>Envoi…</BoutonOccupe>);
    let b = screen.getByRole("button", { name: "Envoi…" });
    expect(b.getAttribute("aria-busy")).toBe("true");
    expect(b.hasAttribute("disabled")).toBe(true);
    expect(b.querySelector("[data-roue]")).not.toBeNull();
    rerender(<BoutonOccupe disabled={false}>Envoyer</BoutonOccupe>);
    b = screen.getByRole("button", { name: "Envoyer" });
    expect(b.getAttribute("aria-busy")).toBeNull();
    expect(b.hasAttribute("disabled")).toBe(false);
    expect(b.querySelector("[data-roue]")).toBeNull();
  });
});
