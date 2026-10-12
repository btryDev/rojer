import { describe, expect, it } from "vitest";
import {
  CATEGORIES_A_REPONSE_EXIGEE,
  QUESTIONS_EXIGEES_PAR_DECISION,
  REGIME_TRAVAIL,
  appareilsMuets,
  messageReponseExigee,
  questionsExigeesPour,
  reponsesExigeesManquantes,
  rythmeServi,
  type RegimeExigence,
} from "./reponses-exigees";
import { equipementSchema } from "./schema";
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

const ERP = (
  categorieErp: RegimeExigence["categorieErp"],
  ssiCategorieAouB: boolean | null = null,
): RegimeExigence => ({ estERP: true, typeErp: "M", categorieErp, ssiCategorieAouB });

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
    const exigees = questionsExigeesPour(categorie, REGIME_TRAVAIL);
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

  it("hors des décisions, aucune catégorie n'exige de réponse", () => {
    // [2026-10-12 : « hors de la décision » — la seconde décision, le
    // désenfumage, est éprouvée plus bas, régime par régime.]
    const parDecision = QUESTIONS_EXIGEES_PAR_DECISION.map((d) => d.categorie);
    for (const c of CATEGORIES_EQUIPEMENT.filter(
      (c) => !CATEGORIES_A_REPONSE_EXIGEE.includes(c) && !parDecision.includes(c),
    )) {
      for (const regime of [REGIME_TRAVAIL, ERP("N2")]) {
        expect(questionsExigeesPour(c, regime), c).toEqual([]);
      }
    }
  });
});

describe("appareilsMuets : la relance du tableau de bord", () => {
  const LEVAGE = CATEGORIES_A_REPONSE_EXIGEE[0];
  const exigees = questionsExigeesPour(LEVAGE, REGIME_TRAVAIL);

  it("un appareil de levage muet donne une étape par question exigée ; répondu, aucune", () => {
    const muet = appareilsMuets([{ id: "p1", libelle: "Palan", categorie: LEVAGE, caracteristiques: null }], REGIME_TRAVAIL);
    expect(muet.map((m) => m.champ)).toEqual([...exigees]);
    const repondu = Object.fromEntries(exigees.map((c) => [c, false]));
    expect(appareilsMuets([{ id: "p1", libelle: "Palan", categorie: LEVAGE, caracteristiques: repondu }], REGIME_TRAVAIL)).toEqual([]);
  });

  it("une réponse partielle ne relance que ce qui manque", () => {
    const [premiere, ...reste] = exigees;
    const muet = appareilsMuets([
      { id: "p1", libelle: "Palan", categorie: LEVAGE, caracteristiques: { [premiere]: true } },
    ], REGIME_TRAVAIL);
    expect(muet.map((m) => m.champ)).toEqual(reste);
  });

  it("un appareil hors de la décision n'est jamais relancé", () => {
    expect(appareilsMuets([{ id: "x", libelle: "Extincteur", categorie: "EXTINCTEUR", caracteristiques: null }], REGIME_TRAVAIL)).toEqual([]);
  });
});

describe("décision du 2026-10-08 : « désenfumage mécanique », réponse exigée là où elle fait naître DF 10 § 3", () => {
  // « comme D29 pour le levage » : le silence ne sert pas la triennale par
  // organisme agréé, et personne ne verrait qu'elle manque. Exigée là où le
  // « oui » ajoute une ligne — ERP des quatre premières catégories, sauf
  // « non » au SSI A/B sur la fiche ; facultative ailleurs (C41).
  const exigee = (regime: RegimeExigence) =>
    questionsExigeesPour("DESENFUMAGE", regime).includes("estDesenfumageMecanique");

  it("exigée en N1 à N4, SSI A/B oui ou pas répondu", () => {
    for (const c of ["N1", "N2", "N3", "N4"] as const) {
      expect(exigee(ERP(c, null)), c).toBe(true);
      expect(exigee(ERP(c, true)), c).toBe(true);
    }
  });

  it("facultative en 5ᵉ catégorie, hors ERP, et quand la fiche dit « non » au SSI A/B", () => {
    expect(exigee(ERP("N5"))).toBe(false);
    expect(exigee(REGIME_TRAVAIL)).toBe(false);
    expect(exigee(ERP("N2", false))).toBe(false);
  });

  it("la porte du serveur refuse le silence avec le motif de DF 10 § 3, et laisse passer une réponse", () => {
    const val = (mecanique?: string) => {
      const r = equipementSchema.safeParse({
        libelle: "Désenfumage",
        categorie: "DESENFUMAGE",
        ...(mecanique === undefined ? {} : { estDesenfumageMecanique: mecanique }),
      });
      if (!r.success) throw new Error("schéma");
      return r.data;
    };
    expect(reponsesExigeesManquantes(val(), ERP("N3"))).toEqual({
      estDesenfumageMecanique: [messageReponseExigee("estDesenfumageMecanique")],
    });
    expect(messageReponseExigee("estDesenfumageMecanique")).toContain("DF 10 § 3");
    expect(reponsesExigeesManquantes(val("non"), ERP("N3"))).toBeNull();
    expect(reponsesExigeesManquantes(val(), ERP("N5"))).toBeNull();
  });

  it("un désenfumage muet d'un ERP N2 est relancé ; d'un ERP N5, non", () => {
    const d = [{ id: "d", libelle: "Désenfumage", categorie: "DESENFUMAGE", caracteristiques: null }];
    expect(appareilsMuets(d, ERP("N2")).map((m) => m.champ)).toEqual(["estDesenfumageMecanique"]);
    expect(appareilsMuets(d, ERP("N5"))).toEqual([]);
  });
});
