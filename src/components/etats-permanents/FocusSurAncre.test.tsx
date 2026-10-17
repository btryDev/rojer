// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { FocusSurAncre } from "./FocusSurAncre";

// Arriver du widget par `next/link` sur `…/etats-permanents#usage-…` : la
// section visée doit prendre le focus, comme sur un saut d'ancre natif.
// Éprouvé en cassant : l'effet vidé, le premier test rougit.

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

const page = (
  <>
    <a href="#ailleurs">avant</a>
    <section id="usage-incendie_secours" tabIndex={-1}>
      Incendie et secours
    </section>
    <div id="pas-focalisable">texte</div>
    <FocusSurAncre />
  </>
);

describe("FocusSurAncre", () => {
  it("pose le focus sur la section que vise l'ancre de l'adresse", () => {
    window.history.replaceState(null, "", "/etats-permanents#usage-incendie_secours");
    const { container } = render(page);
    expect(document.activeElement).toBe(
      container.querySelector("#usage-incendie_secours"),
    );
  });

  it("ne touche à rien sans ancre, ni quand l'ancre vise un élément non focalisable", () => {
    render(page);
    expect(document.activeElement).toBe(document.body);
    cleanup();
    window.history.replaceState(null, "", "/etats-permanents#pas-focalisable");
    render(page);
    expect(document.activeElement).toBe(document.body);
  });
});
