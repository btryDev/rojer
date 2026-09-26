import { describe, expect, it } from "vitest";
import { faitAttenteVide, faitRetards } from "./fait-retards";

describe("les trois pièces disent la même chose du même état (contre-lecture du 2026-09-26)", () => {
  const perime = { etat: "perime", sceauPose: "a", sceauAttendu: "b" } as const;
  const vide = { motif: "Aucun équipement n'est déclaré pour cet établissement." };

  it("calendrier à recalculer ET inventaire vide : le README, le dossier et le registre disent « à recalculer »", () => {
    // Le défaut : `faitRetards` testait l'incertitude d'abord, `faitAttenteVide`
    // l'inventaire d'abord — deux phrases pour le même dossier.
    expect(faitRetards({ nbEnRetard: 0, calendrier: perime, inventaire: vide }).texte).toContain("à recalculer");
    expect(faitAttenteVide({ calendrier: perime, inventaire: vide })).toContain("à recalculer");
  });

  it("un retard constaté se dit avant tout, même sur un calendrier noté jamais calculé", () => {
    expect(faitRetards({ nbEnRetard: 1, calendrier: { etat: "jamais_genere" }, inventaire: null }).coche).toBe("!");
  });

  it("le motif de l'inventaire est repris tel quel", () => {
    expect(faitAttenteVide({ calendrier: { etat: "a_jour" }, inventaire: vide })).toBe(vide.motif);
  });
});
