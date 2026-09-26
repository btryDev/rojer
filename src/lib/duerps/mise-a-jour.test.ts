import { describe, expect, it } from "vitest";
import { EFFECTIF_MAJ_ANNUELLE } from "@/lib/dashboard/duerp";
import {
  CHAPEAU_MISE_A_JOUR,
  declencheursMiseAJour,
  PIED_MISE_A_JOUR,
} from "./mise-a-jour";

const tous = (effectif: number) =>
  declencheursMiseAJour({ entreprise: effectif, site: effectif });
const rang = (effectif: number, r: "1°" | "2°" | "3°") => {
  const d = tous(effectif).find((x) => x.rang === r);
  if (!d) throw new Error(`rang ${r} absent`);
  return d;
};

describe("les trois cas de mise à jour de l'art. R. 4121-2", () => {
  it("énonce les trois, dans l'ordre de l'article, quel que soit l'effectif", () => {
    // Le défaut corrigé ici est un SILENCE : la page ne servait que le 1°.
    // Masquer un cas parce qu'il ne s'applique pas ferait de l'écran un
    // résumé de situation ; on veut une lecture de l'article.
    for (const effectif of [1, EFFECTIF_MAJ_ANNUELLE, 400]) {
      expect(tous(effectif).map((d) => d.rang)).toEqual(["1°", "2°", "3°"]);
    }
  });
});

describe("la condition d'effectif ne porte que sur le 1°", () => {
  it("bascule exactement au seuil, et pas un salarié avant", () => {
    expect(rang(EFFECTIF_MAJ_ANNUELLE - 1, "1°").applicable).toBe(false);
    expect(rang(EFFECTIF_MAJ_ANNUELLE, "1°").applicable).toBe(true);
  });

  it("laisse les 2° et 3° dus au plus petit effectif comme au plus grand", () => {
    // C'est le cœur du défaut : sous onze salariés, ces deux cas sont les
    // SEULES règles de mise à jour. Une condition d'effectif qui déborderait
    // sur eux effacerait tout ce que le produit a à dire à la majeure partie
    // de sa cible.
    for (const effectif of [1, 10, 11, 5000]) {
      expect(rang(effectif, "2°").applicable).toBe(true);
      expect(rang(effectif, "3°").applicable).toBe(true);
    }
  });
});

describe("aucun rendez-vous n'est fabriqué sur les 2° et 3°", () => {
  it("les déclare non datables, à tout effectif", () => {
    // Aucune donnée du dossier ne dit quand un aménagement important
    // survient. `datable: true` ici autoriserait un appelant à leur poser une
    // échéance dans un calendrier qui porte de vraies dates à côté.
    for (const effectif of [3, 11, 90]) {
      expect(rang(effectif, "2°").datable).toBe(false);
      expect(rang(effectif, "3°").datable).toBe(false);
    }
  });

  it("n'écrit ni date ni périodicité dans ce qu'ils disent", () => {
    const motsDeCalendrier =
      /\b(chaque année|annuel|tous les|d'ici|avant le|échéance le|\d{1,2}\/\d{1,2}\/\d{2,4})\b/i;
    for (const d of tous(4)) {
      if (d.datable) continue;
      expect(`${d.quand} ${d.portee}`).not.toMatch(motsDeCalendrier);
    }
  });
});

describe("ce que lit le dirigeant sous le seuil", () => {
  it("ne s'arrête pas à « ne s'applique pas »", () => {
    // Une page qui dit seulement « la mise à jour annuelle ne vous concerne
    // pas » se lit « vous n'avez rien à faire » — l'inverse exact de
    // l'article. La phrase doit renvoyer sur ce qui reste dû.
    expect(rang(4, "1°").portee).toMatch(/rest\w+ dus?/i);
  });

  it("nomme le seuil de l'article plutôt qu'un chiffre écrit à la main", () => {
    expect(rang(4, "1°").portee).toContain(`${EFFECTIF_MAJ_ANNUELLE} salariés`);
  });

  it("accorde le décompte au singulier comme au pluriel", () => {
    expect(rang(1, "1°").portee).toContain("1 salarié :");
    expect(rang(2, "1°").portee).toContain("2 salariés");
  });
});

describe("le registre — un rappel d'obligation, jamais un verdict", () => {
  it("ne qualifie jamais la situation au regard du droit", () => {
    const textes = [
      CHAPEAU_MISE_A_JOUR,
      PIED_MISE_A_JOUR,
      ...tous(4).flatMap((d) => [d.quand, d.portee]),
      ...tous(40).flatMap((d) => [d.quand, d.portee]),
    ];
    for (const t of textes) {
      // « mise à jour » est le nom de l'obligation ; « est à jour » serait le
      // verdict. Seul le second est proscrit.
      expect(t).not.toMatch(/conforme|en règle|en infraction|est à jour/i);
    }
  });

  it("dit d'où vient l'obligation", () => {
    expect(CHAPEAU_MISE_A_JOUR).toContain("R. 4121-2");
  });
});
