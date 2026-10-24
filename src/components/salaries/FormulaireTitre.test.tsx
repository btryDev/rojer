// Le rendu, pas la table : un titre écarté par le droit sort de la liste,
// mais l'écran doit encore le nommer — sinon le dirigeant qui le cherche
// conclut que Rojer ne le connaît pas (retour de la propriétaire, 2026-10-24).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormulaireTitre } from "./FormulaireTitre";

const titre = (id: string, libelle: string, bloquePar?: { libelle: string; motif: string }) => ({
  id,
  libelle,
  pieceMedicale: true,
  periodicite: "quinquennale" as const,
  groupe: "medical" as const,
  dessin: { src: "/x.png", fond: "#fff" },
  rythme: "Tous les 5 ans",
  bloquePar,
});

const VIP = { libelle: "Visite d'information et de prévention (VIP)", motif: "R. 4624-24 : se substitue à la VIP." };

const rendre = () =>
  renderToStaticMarkup(
    <FormulaireTitre
      catalogue={[
        titre("vip", "Visite d'information et de prévention (VIP)"),
        titre("sir", "Suivi individuel renforcé", VIP),
        titre("sir-a", "Suivi renforcé, catégorie A", VIP),
      ]}
      action={async () => ({ status: "idle" })}
      dejaDeclares={["vip"]}
    />,
  );

describe("les titres que le droit écarte", () => {
  it("ne sont plus proposés au choix", () => {
    const html = rendre();
    expect(html).toContain('value="vip"');
    expect(html).not.toContain('value="sir"');
    expect(html).not.toContain('value="sir-a"');
  });

  it("restent nommés, avec le motif et le geste qui débloque", () => {
    const html = rendre();
    expect(html).toContain("2 titres ne sont pas proposés");
    expect(html).toContain("Suivi individuel renforcé");
    expect(html).toContain("R. 4624-24");
    expect(html).toContain("retirez d&#x27;abord");
  });
});
