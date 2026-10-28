// Le bloc « Évaluez les risques » d'Équipe, RENDU : cadre ambre tant qu'une
// question reste sans réponse, rien sinon.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EvaluerRisquesACompleter } from "./EvaluerRisquesACompleter";

const rendre = (sansReponse: string[]) =>
  renderToStaticMarkup(<EvaluerRisquesACompleter sansReponse={sansReponse} href="/e/1/equipe/risques" />).replace(
    /&#x27;/g,
    "'",
  );

describe("le bloc Évaluez les risques de vos salariés", () => {
  it("porte le cadre ambre partagé des Équipements et nomme les questions", () => {
    const html = rendre(["manutention", "écran", "électricité", "engins", "CMR"]);
    expect(html).toContain("bg-[color:var(--board-amber-wash)]");
    expect(html).toContain("Ce qu'il reste à faire");
    expect(html).toContain("Évaluez les risques de vos salariés");
    expect(html).toContain("5 questions sans réponse : manutention, écran, électricité, engins et CMR.");
    expect(html).toContain('href="/e/1/equipe/risques"');
    expect(html).not.toContain("carte-board");
  });

  it("accorde au singulier", () => {
    expect(rendre(["CMR"])).toContain("1 question sans réponse : CMR.");
  });

  it("ne se pose pas quand tout est répondu", () => {
    expect(rendre([])).toBe("");
  });
});
