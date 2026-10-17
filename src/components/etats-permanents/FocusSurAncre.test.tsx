// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { FocusSurAncre } from "./FocusSurAncre";

// Arriver du widget par `next/link` sur `…/etats-permanents#usage-…` : la
// section visée doit prendre le focus, comme sur un saut d'ancre natif.
//
// Éprouvé en cassant, chaque garde à son tour : l'effet vidé (le premier test
// rougit), le filtre par préfixe retiré (« une autre ancre » rougit), la garde
// du focus déjà posé retirée (« ne vole pas » rougit), et `decodeURIComponent`
// remis sur le hash (« mal encodée » rougit sur `URIError`).

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

const page = (
  <>
    <button type="button">déjà là</button>
    <section id="usage-incendie_secours" tabIndex={-1}>
      Incendie et secours
    </section>
    <section id="autre-chose" tabIndex={-1}>
      une section focalisable hors des familles
    </section>
    <FocusSurAncre />
  </>
);

const arriverSur = (hash: string) =>
  window.history.replaceState(null, "", `/etats-permanents${hash}`);

describe("FocusSurAncre", () => {
  it("pose le focus sur la famille que vise l'ancre de l'adresse", () => {
    arriverSur("#usage-incendie_secours");
    const { container } = render(page);
    expect(document.activeElement).toBe(
      container.querySelector("#usage-incendie_secours"),
    );
  });

  it("ne touche à rien sans ancre", () => {
    render(page);
    expect(document.activeElement).toBe(document.body);
  });

  it("ignore une autre ancre, même vers un élément focalisable", () => {
    arriverSur("#autre-chose");
    render(page);
    expect(document.activeElement).toBe(document.body);
  });

  it("ne vole pas un focus que l'utilisateur a déjà posé", () => {
    arriverSur("#usage-incendie_secours");
    // Hors de l'arbre React : un focus posé avant que la page ne monte.
    const champ = document.createElement("input");
    document.body.appendChild(champ);
    champ.focus();
    try {
      render(page);
      expect(document.activeElement).toBe(champ);
    } finally {
      champ.remove();
    }
  });

  it("une ancre mal encodée ne fait pas tomber la page", () => {
    arriverSur("#%E0%A4%A");
    expect(() => render(page)).not.toThrow();
    expect(document.activeElement).toBe(document.body);
  });
});
