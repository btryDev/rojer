import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WizardSteps, type Etape } from "./WizardSteps";

const ETAPES: Etape[] = [
  { id: "a", libelle: "Votre activité", href: "/a", atteinte: true, faite: true, avancement: 1 },
  { id: "b", libelle: "Unités", href: "/b", atteinte: true, faite: false, actuelle: true, avancement: 0.5 },
  { id: "t", libelle: "Transverses", href: "/t", atteinte: true, faite: false, avancement: 0 },
  { id: "c", libelle: "Synthèse", href: "/c", atteinte: false, faite: false, avancement: 0 },
];

describe("WizardSteps — le fil au pied de l'en-tête (2026-11-12)", () => {
  const html = renderToStaticMarkup(<WizardSteps etapes={ETAPES} />);

  it("n'est pas une carte", () => {
    expect(html).not.toContain("carte-board");
  });

  it("une étape aux prérequis manquants n'est pas un lien mort", () => {
    expect(html).not.toContain('href="#"');
    expect(html).toContain('href="/b"');
    expect(html).not.toContain('href="/c"');
  });

  it("l'état se dit en mots : ✓ pour une étape faite, le numéro sinon, aria-current pour la courante", () => {
    expect(html).toContain("✓ Votre activité");
    expect(html).toContain("02 · Unités");
    expect(html).toContain('aria-current="step"');
  });

  it("le segment courant se remplit de sa part, une étape faite est pleine", () => {
    expect(html).toContain("width:50%");
    expect(html).toContain("width:100%");
    expect(html.match(/width:/g)).toHaveLength(2);
  });

  it("aucune encre en `--board-slate` (interdit 5)", () => {
    expect(html).not.toContain("text-[color:var(--board-slate)]");
  });
});
