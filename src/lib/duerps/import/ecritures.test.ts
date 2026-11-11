import { describe, expect, it } from "vitest";
import {
  construireEcrituresImport,
  criticiteImportee,
  type UniteExistante,
} from "./ecritures";
import type { LigneParsee, PlanImport } from "./parser";

const MAINTENANT = new Date("2026-08-12T00:00:00.000Z");

function ligne(over: Partial<LigneParsee> = {}): LigneParsee {
  return {
    ligne: 1,
    uniteTravail: "Cuisine",
    libelleRisque: "Brûlure",
    description: null,
    gravite: 3,
    probabilite: 2,
    maitrise: 1,
    mesuresExistantes: [],
    mesuresPrevues: [],
    ...over,
  };
}

function plan(unites: PlanImport["unites"]): PlanImport {
  const nbRisques = unites.reduce((n, u) => n + u.risques.length, 0);
  const nbMesures = unites.reduce(
    (n, u) => n + u.risques.reduce((m, r) => m + r.mesuresExistantes.length, 0),
    0,
  );
  const nbMesuresPrevues = unites.reduce(
    (n, u) => n + u.risques.reduce((m, r) => m + r.mesuresPrevues.length, 0),
    0,
  );
  return { unites, nbRisques, nbMesures, nbMesuresPrevues };
}

/** Générateur déterministe : `unit-1`, `risq-1`, `risq-2`… */
function compteur() {
  const n = new Map<string, number>();
  return (prefixe: string) => {
    const suivant = (n.get(prefixe) ?? 0) + 1;
    n.set(prefixe, suivant);
    return `${prefixe}-${suivant}`;
  };
}

/** Une unité déjà en base — non transverse sauf mention contraire. */
function existante(nom: string, id: string): UniteExistante {
  return { id, nom, estTransverse: false };
}

/** Les écritures d'un plan. */
function construire(
  unites: PlanImport["unites"],
  unitesExistantes: UniteExistante[] = [],
) {
  return construireEcrituresImport({
    plan: plan(unites),
    unitesExistantes,
    duerpId: "duerp-1",
    etablissementId: "etab-1",
    genererId: compteur(),
    maintenant: MAINTENANT,
  });
}

describe("criticiteImportee", () => {
  it("multiplie gravité et probabilité, divisées par la maîtrise", () => {
    expect(criticiteImportee(3, 2, 1)).toBe(6);
    expect(criticiteImportee(4, 4, 2)).toBe(8);
  });

  it("borne à 1 en bas — une ligne mal remplie ne sort pas de l'échelle", () => {
    expect(criticiteImportee(1, 1, 4)).toBe(1);
  });

  it("borne à 16 en haut", () => {
    expect(criticiteImportee(10, 10, 1)).toBe(16);
  });
});

describe("construireEcrituresImport — résolution des unités", () => {
  it("réutilise une unité existante et n'en crée pas de doublon", () => {
    const e = construire([{ nom: "Cuisine", risques: [ligne()] }], [
      existante("Cuisine", "unite-deja-la"),
    ]);

    expect(e.unitesACreer).toHaveLength(0);
    expect(e.risques[0].uniteId).toBe("unite-deja-la");
  });

  it("crée l'unité absente et y rattache ses risques", () => {
    const e = construire([
      { nom: "Salle", risques: [ligne({ uniteTravail: "Salle" })] },
    ]);

    expect(e.unitesACreer).toEqual([
      { id: "unit-1", duerpId: "duerp-1", nom: "Salle" },
    ]);
    expect(e.risques[0].uniteId).toBe("unit-1");
  });

  it("ne crée qu'une ligne pour deux unités homonymes du même plan", () => {
    const e = construire([
      { nom: "Cuisine", risques: [ligne()] },
      { nom: "Cuisine", risques: [ligne({ libelleRisque: "Coupure" })] },
    ]);

    expect(e.unitesACreer).toHaveLength(1);
    expect(e.risques.map((r) => r.uniteId)).toEqual(["unit-1", "unit-1"]);
  });

  it("départage deux unités existantes homonymes par la première", () => {
    const e = construire(
      [{ nom: "Cuisine", risques: [ligne()] }],
      [
        existante("Cuisine", "premiere"),
        existante("Cuisine", "seconde"),
      ],
    );

    expect(e.risques[0].uniteId).toBe("premiere");
  });
});

describe("construireEcrituresImport — risques et mesures", () => {
  it("cote le risque et le marque comme saisi", () => {
    const e = construire([
      { nom: "Cuisine", risques: [ligne({ gravite: 4, probabilite: 3, maitrise: 2 })] },
    ]);

    expect(e.risques[0]).toMatchObject({
      libelle: "Brûlure",
      gravite: 4,
      probabilite: 3,
      maitrise: 2,
      criticite: 6,
      cotationSaisie: true,
    });
  });

  it("crée une action levée par mesure existante, rattachée à son risque", () => {
    const e = construire([
      {
        nom: "Cuisine",
        risques: [
          ligne({ mesuresExistantes: ["Gants", "Formation"] }),
          ligne({ libelleRisque: "Chute", mesuresExistantes: ["Sol antidérapant"] }),
        ],
      },
    ]);

    expect(e.actions).toHaveLength(3);
    expect(e.actions.slice(0, 2).every((a) => a.risqueId === e.risques[0].id)).toBe(true);
    expect(e.actions[2].risqueId).toBe(e.risques[1].id);
    expect(e.actions[0]).toMatchObject({
      etablissementId: "etab-1",
      libelle: "Gants",
      type: "organisationnelle",
      statut: "levee",
      leveeLe: MAINTENANT,
    });
  });

  it("une mesure à mettre en œuvre devient une action OUVERTE, jamais levée", () => {
    const e = construire([
      {
        nom: "Cuisine",
        risques: [
          ligne({
            mesuresExistantes: ["Gants"],
            mesuresPrevues: ["Hotte à remplacer"],
          }),
        ],
      },
    ]);
    const prevue = e.actions.find((a) => a.libelle === "Hotte à remplacer");
    expect(prevue).toMatchObject({ statut: "ouverte", leveeLe: null });
    expect(e.actions.find((a) => a.libelle === "Gants")?.statut).toBe("levee");
  });

  it("un risque sans mesure ne produit aucune action", () => {
    const e = construire([{ nom: "Cuisine", risques: [ligne()] }]);
    expect(e.actions).toHaveLength(0);
  });
});

describe("construireEcrituresImport — invariants du lot", () => {
  it("tous les identifiants sont distincts", () => {
    const e = construire([
      {
        nom: "Cuisine",
        risques: [
          ligne({ mesuresExistantes: ["A", "B"] }),
          ligne({ libelleRisque: "Coupure", mesuresExistantes: ["C"] }),
        ],
      },
      { nom: "Salle", risques: [ligne({ uniteTravail: "Salle" })] },
    ]);

    const ids = [
      ...e.unitesACreer.map((u) => u.id),
      ...e.risques.map((r) => r.id),
      ...e.actions.map((a) => a.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("aucune écriture ne référence un identifiant absent du lot ou de la base", () => {
    const e = construire(
      [
        { nom: "Cuisine", risques: [ligne({ mesuresExistantes: ["Gants"] })] },
        { nom: "Salle", risques: [ligne({ uniteTravail: "Salle" })] },
      ],
      [existante("Cuisine", "unite-deja-la")],
    );

    const unitesConnues = new Set([
      "unite-deja-la",
      ...e.unitesACreer.map((u) => u.id),
    ]);
    const risquesConnus = new Set(e.risques.map((r) => r.id));

    expect(e.risques.every((r) => unitesConnues.has(r.uniteId))).toBe(true);
    expect(e.actions.every((a) => risquesConnus.has(a.risqueId))).toBe(true);
  });

  it("un plan vide ne produit aucune écriture", () => {
    const e = construire([]);
    expect(e).toEqual({ unitesACreer: [], risques: [], actions: [] });
  });
});

describe("construireEcrituresImport — plus de plafond de cinq (ADR-033 amendée)", () => {
  const fichier = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      nom: `Unité ${i + 1}`,
      risques: [ligne({ uniteTravail: `Unité ${i + 1}` })],
    }));

  it("importe sept unités", () => {
    const e = construire(fichier(7));
    expect(e.unitesACreer).toHaveLength(7);
  });

  it("ne rattache rien à l'unité transverse", () => {
    const transverse: UniteExistante = {
      id: "u-transverse",
      nom: "Risques transverses",
      estTransverse: true,
    };
    const e = construire(fichier(5), [transverse]);
    expect(e.risques.some((r) => r.uniteId === "u-transverse")).toBe(false);
  });
});
