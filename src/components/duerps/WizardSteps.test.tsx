import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WizardSteps, type Etape } from "./WizardSteps";

const ETAPES: Etape[] = [
  { id: "a", libelle: "Secteur", href: "/a", atteinte: true, faite: true },
  { id: "b", libelle: "Unités", href: "/b", atteinte: true, faite: false, actuelle: true },
  { id: "t", libelle: "Transverses", href: "/t", atteinte: true, faite: false },
  { id: "c", libelle: "Synthèse", href: "/c", atteinte: false, faite: false },
];

describe("WizardSteps — la frise Progression", () => {
  const html = renderToStaticMarkup(<WizardSteps etapes={ETAPES} />);

  it("est posée sur une carte board, pas sur le canvas", () => {
    expect(html).toMatch(/<nav[^>]*class="carte-board /);
  });

  it("une étape aux prérequis manquants n'est pas un lien mort", () => {
    expect(html).not.toContain('href="#"');
    expect(html).not.toContain("aria-disabled");
    expect(html).toContain('href="/b"');
    expect(html).not.toContain('href="/c"');
  });

  it("l'étape courante déjà faite dit « Fait »", () => {
    const h = renderToStaticMarkup(
      <WizardSteps
        etapes={[{ id: "u", libelle: "Unités", href: "/u", atteinte: true, faite: true, actuelle: true }]}
      />,
    );
    expect(h).toContain(">Fait<");
    expect(h).not.toContain("En cours");
  });

  it("trois mots seulement : En cours, Fait, À faire — plus « Ouvert » ni « À venir »", () => {
    expect(html).toContain("En cours");
    expect(html.match(/>Fait</g)).toHaveLength(1);
    // Accessible mais pas faite, et bloquée : les deux disent « À faire ».
    expect(html.match(/>À faire</g)).toHaveLength(2);
    expect(html).not.toContain("Ouvert");
    expect(html).not.toContain("À venir");
  });

  it("le compteur compte les étapes faites, pas la position", () => {
    expect(html).toMatch(/>1<\/span>.*>4<\/span>.*faite</);
    expect(html).toContain('aria-valuenow="1"');
  });

  it("aucune encre en `--board-slate` (interdit 5)", () => {
    expect(html).not.toContain("text-[color:var(--board-slate)]");
  });
});
