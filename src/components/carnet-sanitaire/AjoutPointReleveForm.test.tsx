// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * Le type de point préremplit les seuils (2026-10-14, chantier § 5), qui
 * restent modifiables ; un point d'avant le type peut le rester.
 */

vi.mock("@/lib/carnet-sanitaire/actions", () => ({
  creerPointReleve: vi.fn(async () => ({ status: "success" })),
  modifierPointReleve: vi.fn(async () => ({ status: "success" })),
}));

import { AIDE_SEUIL_TEMPERATURE, AjoutPointReleveForm } from "./AjoutPointReleveForm";
import { LABEL_TYPE_POINT } from "@/lib/carnet-sanitaire/schema";

afterEach(cleanup);
const souffler = () => new Promise((r) => setTimeout(r, 20));

const champ = (nom: string) => document.querySelector<HTMLInputElement>(`[name="${nom}"]`)!;
async function choisirType(valeur: string) {
  const select = document.querySelector<HTMLSelectElement>('select[name="typePoint"]')!;
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")!.set!.call(select, valeur);
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await souffler();
}

describe("AjoutPointReleveForm — le type préremplit la plage", () => {
  it("un point neuf n'a ni type ni seuil tant qu'on n'a pas dit où il est", async () => {
    render(<AjoutPointReleveForm etablissementId="e1" />);
    screen.getByRole("button", { name: /Ajouter un point de relevé/ }).click();
    await souffler();
    const select = document.querySelector<HTMLSelectElement>('select[name="typePoint"]')!;
    expect(select.value).toBe("");
    expect(select.required).toBe(true);
    expect(champ("seuilMinCelsius").value).toBe("");
    expect(champ("seuilMaxCelsius").value).toBe("");
  });

  it("douche : maximum 50, pas de minimum ; sortie de stockage : minimum 55, pas de maximum", async () => {
    render(<AjoutPointReleveForm etablissementId="e1" />);
    screen.getByRole("button", { name: /Ajouter un point de relevé/ }).click();
    await souffler();

    await choisirType("PUISAGE_TOILETTE");
    expect(champ("seuilMinCelsius").value).toBe("");
    expect(champ("seuilMaxCelsius").value).toBe("50");

    await choisirType("SORTIE_STOCKAGE");
    expect(champ("seuilMinCelsius").value).toBe("55");
    expect(champ("seuilMaxCelsius").value).toBe("");

    await choisirType("EAU_FROIDE");
    expect(champ("seuilMaxCelsius").value).toBe("20");
  });

  it("un point d'avant le type s'ouvre « non précisé », avec son réseau et son minimum", async () => {
    render(
      <AjoutPointReleveForm
        etablissementId="e1"
        point={{
          id: "p1",
          nom: "Retour",
          localisation: null,
          batimentId: null,
          typeReseau: "ECS_BOUCLAGE",
          typePoint: null,
          seuilMinCelsius: 55,
          seuilMaxCelsius: null,
        }}
      />,
    );
    screen.getByRole("button", { name: /Modifier le point/ }).click();
    await souffler();
    const select = document.querySelector<HTMLSelectElement>('select[name="typePoint"]')!;
    expect(select.value).toBe("");
    expect(select.required).toBe(false);
    expect(champ("typeReseau").value).toBe("ECS_BOUCLAGE");
    expect(champ("seuilMinCelsius").value).toBe("55");
    expect(champ("seuilMaxCelsius").value).toBe("");

    // Préciser le type propose ses seuils, et le réseau n'est plus envoyé à part.
    await choisirType("RETOUR_BOUCLE");
    expect(champ("seuilMinCelsius").value).toBe("50");
    expect(document.querySelector('[name="typeReseau"]')).toBeNull();
  });

  it("l'aide cite l'article 36, ses conditions, son alternative, et le repère de Rojer", async () => {
    render(<AjoutPointReleveForm etablissementId="e1" />);
    screen.getByRole("button", { name: /Ajouter un point de relevé/ }).click();
    await souffler();
    const aide = document.getElementById("aide-seuils")!.textContent!;
    expect(aide).toContain("article 36 de l'arrêté du 23 juin 1978");
    expect(aide).toContain("plus de 3 litres");
    expect(aide).toContain("tubes finaux");
    expect(aide).toContain("400 litres");
    expect(aide).toContain("à l'exclusion des ballons de préchauffage");
    expect(aide).toContain("au moins une fois par 24 heures");
    expect(aide).toContain("repère de Rojer");
    expect(aide).toContain("dans les autres pièces");
    expect(aide).toContain("des établissements recevant du public");
  });

  it("chaque passage entre guillemets de l'aide est mot pour mot dans l'article 36", () => {
    const passages = [...AIDE_SEUIL_TEMPERATURE.matchAll(/« ([^»]+) »/g)].map((m) => m[1]);
    expect(passages.length).toBeGreaterThanOrEqual(6);
    const article = ARTICLE_36_API.replace(/\s+/g, " ");
    for (const p of passages) expect(article, p).toContain(p.replace(/\s+/g, " "));
  });
});

/**
 * L'article 36 de l'arrêté du 23 juin 1978 tel que l'API Légifrance le rend
 * (LEGIARTI000006828036, version du 2006-12-15), `texteHtml` découpé en
 * paragraphes et recollé le 2026-10-14. C'est la source contre laquelle les
 * guillemets de l'aide se vérifient — pas l'aide recopiée.
 */
const ARTICLE_36_API = `
1. Afin de limiter le risque de brûlure :
- dans les pièces destinées à la toilette, la température maximale de l'eau chaude sanitaire est fixée à 50 °C aux points de puisage ;
- dans les autres pièces, la température de l'eau chaude sanitaire est limitée à 60 °C aux points de puisage ;
- dans les cuisines et les buanderies des établissements recevant du public, la température de l'eau distribuée pourra être portée au maximum à 90 °C en certains points faisant l'objet d'une signalisation particulière.
2. Les points de puisage à risque définis dans le présent alinéa sont les points susceptibles d'engendrer l'exposition d'une ou plusieurs personnes à un aérosol d'eau ; il s'agit notamment des douches.
Afin de limiter le risque lié au développement des légionelles dans les systèmes de distribution d'eau chaude sanitaire sur lesquels sont susceptibles d'être raccordés des points de puisage à risque, les exigences suivantes doivent être respectées pendant l'utilisation des systèmes de production et de distribution d'eau chaude sanitaire et dans les 24 heures précédant leur utilisation :
- lorsque le volume entre le point de mise en distribution et le point de puisage le plus éloigné est supérieur à 3 litres, la température de l'eau doit être supérieure ou égale à 50 °C en tout point du système de distribution, à l'exception des tubes finaux d'alimentation des points de puisage. Le volume de ces tubes finaux d'alimentation est le plus faible possible, et dans tous les cas inférieur ou égal à 3 litres ;
- lorsque le volume total des équipements de stockage est supérieur ou égal à 400 litres, l'eau contenue dans les équipements de stockage, à l'exclusion des ballons de préchauffage, doit :
- être en permanence à une température supérieure ou égale à 55 °C à la sortie des équipements ;
- ou être portée à une température suffisante au moins une fois par 24 heures, sous réserve du respect permanent des dispositions prévues au premier alinéa du présent article. L'annexe 1 indique le temps minimum de maintien de la température de l'eau à respecter.
`;

describe("les libellés des types suivent l'article 36", () => {
  it("la toilette admet baignoire, l'autre pièce dit la pièce, la sortie dit le volume total", () => {
    expect(LABEL_TYPE_POINT.PUISAGE_TOILETTE).toMatch(/pièce de toilette/);
    expect(LABEL_TYPE_POINT.PUISAGE_TOILETTE).toMatch(/baignoire/);
    expect(LABEL_TYPE_POINT.PUISAGE_AUTRE).toMatch(/autre pièce/);
    expect(LABEL_TYPE_POINT.SORTIE_STOCKAGE).toMatch(/400 L ou plus au total/);
    expect(LABEL_TYPE_POINT.SORTIE_STOCKAGE).toMatch(/hors ballon de préchauffage/);
    expect(LABEL_TYPE_POINT.SORTIE_STOCKAGE).not.toMatch(/production/);
  });
});
