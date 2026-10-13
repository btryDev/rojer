// @vitest-environment jsdom
/**
 * Un seul idiome pour dire où vit une page d'entrée de registre (ADR-014).
 *
 * Contrôle visuel du 2026-10-13 : « ← LE COMPTOIR DES HALLES » sur les permis
 * de feu, les plans de prévention et les zones, un fil d'Ariane sur le carnet
 * sanitaire — la même relation dite de deux façons. Le lien vers
 * l'établissement dit où la page est RANGÉE : c'est un fil d'Ariane, pas un
 * retour (le retour dit d'où l'on vient).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FilAriane } from "./FilAriane";

afterEach(cleanup);

describe("FilAriane", () => {
  it("le parent est un lien, la page courante ne l'est pas", () => {
    render(
      <FilAriane
        crumbs={[
          { href: "/etablissements/e1", label: "Le Comptoir des Halles" },
          { href: "/ignore", label: "Permis de feu" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    const liens = nav.querySelectorAll("a");
    expect(liens).toHaveLength(1);
    expect(liens[0].getAttribute("href")).toBe("/etablissements/e1");
    expect(nav.textContent).toContain("Permis de feu");
    expect(nav.textContent).not.toContain("←");
  });
});

describe("les registres frères disent leur rangement par un fil d'Ariane", () => {
  const RACINE = path.resolve(__dirname, "../../app/etablissements/[id]");
  // Les quatre pages nommées par le contrôle — les frères du carnet. Les
  // autres pages d'entrée qui portent encore « ← Établissement » sont une
  // incohérence connue, hors de ce lot.
  it.each(["permis-feu", "plan-prevention", "batiments", "carnet-sanitaire"])(
    "%s : un fil d'Ariane vers l'établissement, aucune flèche de retour en dur",
    (dossier) => {
      const source = readFileSync(path.join(RACINE, dossier, "page.tsx"), "utf8");
      expect(source).toMatch(/<FilAriane|crumbs=\{/);
      expect(source).not.toContain("ArrowLeft");
    },
  );
});
