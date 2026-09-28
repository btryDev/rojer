import { describe, expect, it } from "vitest";
import {
  CATEGORIES_A_REPONSE_EXIGEE,
  appareilsMuets,
  questionsExigeesPour,
  rythmeServi,
} from "./reponses-exigees";
import { questionsTriEtatPour, type ChampTriEtat } from "./schema";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";

// D29 (a), décision de la propriétaire du 2026-09-28 : les réponses dont le
// silence change le rythme d'un appareil de levage sont exigées. Ce qui est
// tenu ici, sans liste recopiée — les questions viennent de la table du schéma,
// les rythmes du moteur :
//   - COMPLÉTUDE : une fois les réponses exigées données, aucun silence sur les
//     autres questions ne change plus le rythme de l'appareil — plus aucun
//     défaut n'est retenu faute de réponse ;
//   - MINIMALITÉ : chaque question exigée l'est pour une raison, une
//     combinaison où son silence change le rythme.
// Éprouvé en retirant une question de la dérivation (voir le commit).

type Reponses = Partial<Record<ChampTriEtat, boolean>>;

function combinaisons(champs: readonly ChampTriEtat[], silence: boolean): Reponses[] {
  return champs.reduce<Reponses[]>(
    (acc, c) =>
      acc.flatMap((r) => [
        { ...r, [c]: true },
        { ...r, [c]: false },
        ...(silence ? [{ ...r }] : []),
      ]),
    [{}],
  );
}

describe("D29 (a) : les réponses exigées d'un appareil de levage", () => {
  for (const categorie of CATEGORIES_A_REPONSE_EXIGEE) {
    const toutes = questionsTriEtatPour(categorie).map((q) => q.champ);
    const exigees = questionsExigeesPour(categorie);
    const autres = toutes.filter((c) => !exigees.includes(c));

    it(`${categorie} : bornes — des questions exigées, et la force humaine en est`, () => {
      expect(exigees.length).toBeGreaterThan(0);
      // La décision la nomme : elle est la raison des trois mois au silence.
      expect(exigees).toContain("estMuParForceHumaine");
    });

    it(`${categorie} : complétude — réponses exigées données, aucun silence ne change plus le rythme`, () => {
      const ecarts: string[] = [];
      for (const r of combinaisons(exigees, false)) {
        const reference = rythmeServi(categorie, r);
        for (const a of combinaisons(autres, true)) {
          const v = rythmeServi(categorie, { ...r, ...a });
          if (v !== reference) ecarts.push(`${JSON.stringify({ ...r, ...a })} → ${v} ≠ ${reference}`);
        }
      }
      expect(ecarts.slice(0, 5), `${ecarts.length} écart(s)`).toEqual([]);
    });

    it(`${categorie} : minimalité — chaque question exigée change le rythme au silence, une fois au moins`, () => {
      for (const champ of exigees) {
        const reste = toutes.filter((c) => c !== champ);
        const change = combinaisons(reste, true).some((r) =>
          [true, false].some((v) => rythmeServi(categorie, { ...r, [champ]: v }) !== rythmeServi(categorie, r)),
        );
        expect(change, champ).toBe(true);
      }
    });
  }

  it("hors de la décision, aucune catégorie n'exige de réponse", () => {
    for (const c of CATEGORIES_EQUIPEMENT.filter((c) => !CATEGORIES_A_REPONSE_EXIGEE.includes(c))) {
      expect(questionsExigeesPour(c), c).toEqual([]);
    }
  });
});

describe("appareilsMuets : la relance du tableau de bord", () => {
  const LEVAGE = CATEGORIES_A_REPONSE_EXIGEE[0];
  const exigees = questionsExigeesPour(LEVAGE);

  it("un appareil de levage muet donne une étape par question exigée ; répondu, aucune", () => {
    const muet = appareilsMuets([{ id: "p1", libelle: "Palan", categorie: LEVAGE, caracteristiques: null }]);
    expect(muet.map((m) => m.champ)).toEqual([...exigees]);
    const repondu = Object.fromEntries(exigees.map((c) => [c, false]));
    expect(appareilsMuets([{ id: "p1", libelle: "Palan", categorie: LEVAGE, caracteristiques: repondu }])).toEqual([]);
  });

  it("une réponse partielle ne relance que ce qui manque", () => {
    const [premiere, ...reste] = exigees;
    const muet = appareilsMuets([
      { id: "p1", libelle: "Palan", categorie: LEVAGE, caracteristiques: { [premiere]: true } },
    ]);
    expect(muet.map((m) => m.champ)).toEqual(reste);
  });

  it("un appareil hors de la décision n'est jamais relancé", () => {
    expect(appareilsMuets([{ id: "x", libelle: "Extincteur", categorie: "EXTINCTEUR", caracteristiques: null }])).toEqual([]);
  });
});
