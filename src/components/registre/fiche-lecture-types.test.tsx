// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { FicheLecture } from "./FicheLecture";
import { CHAMPS_PAR_SECTION, type ChampEtablissement } from "@/lib/registre/champs";

// La fiche « Renseignements ERP » du registre : « Type » passe au pluriel quand
// l'établissement en déclare plusieurs (ADR-045, revue du lot 3, R2).
// Éprouvé en retirant `libellePluriel` du champ : rouge.
// La catégorie : « 3ᵉ catégorie », pas « N3 » — `valeurs-etablissement.test.ts`.
afterEach(cleanup);

const section = CHAMPS_PAR_SECTION["renseignements-erp"];
const champs = (section.forme === "etablissement" ? section.champs : []) as readonly ChampEtablissement[];

describe("registre, Renseignements ERP — le libellé du type", () => {
  it("« Type » pour un seul, « Types » pour plusieurs", () => {
    const un = render(<FicheLecture champs={champs} valeurs={{ typeErp: "N" }} hrefEdition="/e" />);
    expect(un.container.textContent).toMatch(/Type\s*N/);
    expect(un.container.textContent).not.toMatch(/Types/);
    cleanup();
    const deux = render(
      <FicheLecture champs={champs} valeurs={{ typeErp: "N, O" }} nombres={{ typeErp: 2 }} hrefEdition="/e" />,
    );
    expect(deux.container.textContent).toMatch(/Types\s*N, O/);
  });

  it("le pluriel suit le NOMBRE fourni, pas une virgule dans la valeur (revue de c6)", () => {
    // Éprouvé en remettant `valeur.includes(", ")` : rouge.
    const r = render(
      <FicheLecture champs={champs} valeurs={{ typeErp: "N, O" }} nombres={{ typeErp: 1 }} hrefEdition="/e" />,
    );
    expect(r.container.textContent).not.toMatch(/Types/);
  });
});
