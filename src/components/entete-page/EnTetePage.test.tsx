// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import {
  LABEL_ITEM,
  categorieDeItem,
  type SidebarItemId,
} from "@/components/layout/sidebar-nav";

import { EnTetePage } from "./EnTetePage";
import { ITEMS_ILLUSTRES } from "./illustrations";
import { TEINTE_SECTION } from "./teintes";

afterEach(cleanup);

const ETAB = { id: "e1", raisonDisplay: "Le Comptoir des Halles" };

describe("EnTetePage", () => {
  it("déduit le titre et le fil de l'entrée du rail", () => {
    render(<EnTetePage item="calendrier" etablissement={ETAB} description="Une phrase." />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(LABEL_ITEM.calendrier);
    const fil = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    expect(fil.textContent).toContain(ETAB.raisonDisplay);
    expect(fil.textContent).toContain(LABEL_ITEM.calendrier);
    expect(screen.getByRole("link", { name: ETAB.raisonDisplay }).getAttribute("href")).toBe(
      "/etablissements/e1",
    );
  });

  it("le panneau de l'illustration porte la teinte de la section", () => {
    const { container } = render(
      <EnTetePage item="equipe" etablissement={ETAB} description="Une phrase." />,
    );
    const panneau = container.querySelector("[data-teinte-section]") as HTMLElement;
    // jsdom normalise la couleur en rgb() : on compare sur la même forme.
    const attendu = document.createElement("div");
    attendu.style.backgroundColor = TEINTE_SECTION["sante-securite"] as string;
    expect(panneau.style.backgroundColor).toBe(attendu.style.backgroundColor);
  });

  it("deux pages d'une même section portent la même teinte", () => {
    expect(categorieDeItem("calendrier")).toBe(categorieDeItem("etats-permanents"));
    const fond = (item: "calendrier" | "etats-permanents") => {
      const { container } = render(
        <EnTetePage item={item} etablissement={ETAB} description="x" />,
      );
      const valeur = (container.querySelector("[data-teinte-section]") as HTMLElement).style.backgroundColor;
      cleanup();
      return valeur;
    };
    expect(fond("calendrier")).toBe(fond("etats-permanents"));
  });

  it("un fil fourni remplace le fil par défaut (onglet à adresse propre)", () => {
    render(
      <EnTetePage
        item="etats-permanents"
        etablissement={ETAB}
        crumbs={[{ href: "/a", label: "A" }, { href: "/b", label: "B" }, { label: "C" }]}
        description="x"
      />,
    );
    const fil = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    expect(fil.textContent).toBe("A›B›C");
  });

  it("rend ce que la page y ajoute, sous le descriptif", () => {
    render(
      <EnTetePage item="actions" etablissement={ETAB} description="x">
        <button type="button">Exporter PDF</button>
      </EnTetePage>,
    );
    expect(screen.getByRole("button", { name: "Exporter PDF" })).toBeTruthy();
  });

  it("l'illustration est décorative : masquée aux lecteurs d'écran", () => {
    const { container } = render(
      <EnTetePage item="actions" etablissement={ETAB} description="x" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("les teintes de section", () => {
  // Chaque page illustrée appartient à une section teintée — une page qui
  // tomberait hors des sections (`categorieDeItem` → tableau) aurait un
  // en-tête blanc sans que rien ne le signale.
  it.each(ITEMS_ILLUSTRES)("%s : sa section a une teinte", (item) => {
    const section = categorieDeItem(item as SidebarItemId) ?? "tableau";
    expect(TEINTE_SECTION[section]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("le tableau de bord n'a pas de teinte", () => {
    expect(TEINTE_SECTION.tableau).toBeNull();
  });

  it("deux sections ne partagent pas une teinte", () => {
    const teintes = Object.values(TEINTE_SECTION).filter(Boolean);
    expect(new Set(teintes).size).toBe(teintes.length);
  });

  // La règle qui empêche le carnaval : une teinte de section ne doit pas se
  // lire comme un état. On la confronte aux champs des trois états qui
  // portent un sens fort — en retard (rose), proche (paille), fait (vert) —,
  // lus dans `globals.css` et non recopiés. Elle passe si sa teinte (hue)
  // s'écarte d'au moins 25°, ou si elle est nettement plus éteinte (moins de
  // 60 % de la saturation de l'état) : le sable reste du côté du papier, pas
  // du « bientôt dû ».
  const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
  const jeton = (nom: string) => {
    const m = css.match(new RegExp(`--${nom}:\\s*(#[0-9a-fA-F]{6})`));
    if (!m) throw new Error(`jeton --${nom} introuvable dans globals.css`);
    return m[1];
  };
  const hsl = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return { h, s };
  };
  const ecartTeinte = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const etats = ["board-signal", "board-amber", "board-green"].map((n) => [n, jeton(n)] as const);
  const sections = Object.entries(TEINTE_SECTION).filter(
    (e): e is [string, string] => e[1] !== null,
  );

  it.each(sections)("%s ne se lit comme aucun état", (_section, teinte) => {
    const t = hsl(teinte);
    for (const [nom, champ] of etats) {
      const e = hsl(champ);
      const lisibleCommeEtat = ecartTeinte(t.h, e.h) < 25 && t.s >= 0.6 * e.s;
      expect(lisibleCommeEtat, `${teinte} trop proche de --${nom} (${champ})`).toBe(false);
    }
  });
});
