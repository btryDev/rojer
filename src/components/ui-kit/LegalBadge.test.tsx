// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LegalBadge } from "./LegalBadge";

// Le composant commun de toutes les pastilles d'article (second contrôle
// visuel du 2026-10-16). jsdom ne mesure rien : on tient la règle de forme par
// ses classes — aligné à gauche, rayon fixe de bloc en board —, et le lien
// vers la source par ce qu'il annonce au lecteur d'écran.

afterEach(cleanup);

const REFERENCE =
  "R. 157-1, 1° (obligation de détenir un défibrillateur automatisé externe dans les ERP des catégories 1 à 4)";

describe("LegalBadge — la forme d'une référence longue (F2)", () => {
  it("en board : texte aligné à gauche, rayon fixe de bloc, jamais `rounded-full`", () => {
    render(<LegalBadge charte="board" reference={REFERENCE} href="https://www.legifrance.gouv.fr/x" />);
    const bouton = screen.getByRole("button");
    expect(bouton.className).toContain("text-left");
    expect(bouton.className).toContain("rounded-[18px]");
    expect(bouton.className).not.toContain("rounded-full");
  });
});
