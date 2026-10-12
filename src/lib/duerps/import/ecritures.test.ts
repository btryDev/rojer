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

/** Le résultat brut, refus compris (ADR-033). */
function construireBrut(
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

/** Les écritures, pour les cas qui passent la borne. */
function construire(
  unites: PlanImport["unites"],
  unitesExistantes: UniteExistante[] = [],
) {
  const r = construireBrut(unites, unitesExistantes);
  if (!r.ok) throw new Error(`Import refusé : ${r.message}`);
  return r.ecritures;
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

describe("construireEcrituresImport — le plafond de cinq unités (ADR-033)", () => {
  const fichier = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      nom: `Unité ${i + 1}`,
      risques: [ligne({ uniteTravail: `Unité ${i + 1}` })],
    }));

  it("laisse passer cinq unités", () => {
    const e = construire(fichier(5));
    expect(e.unitesACreer).toHaveLength(5);
    expect(e.risques).toHaveLength(5);
  });

  it("refuse sept unités, et le message nomme la limite", () => {
    const r = construireBrut(fichier(7));

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain("7 unités");
      expect(r.message).toContain("limite est de 5");
    }
  });

  it("ne tronque pas : un refus ne rend aucune écriture", () => {
    // Le point de la décision. Un import qui garderait les cinq premières
    // unités ferait perdre au dirigeant les risques des deux dernières, sans
    // qu'aucun écran ne le lui dise.
    const r = construireBrut(fichier(7));

    expect("ecritures" in r).toBe(false);
  });

  it("compte les unités déjà en base, pas seulement celles du fichier", () => {
    // Trois en base plus trois au fichier font six : la borne serait aveugle
    // si elle ne regardait que le document déposé.
    const r = construireBrut(fichier(3), [
      existante("Déjà 1", "u1"),
      existante("Déjà 2", "u2"),
      existante("Déjà 3", "u3"),
    ]);

    expect(r.ok).toBe(false);
  });

  it("ne compte pas une unité du fichier qui sera réutilisée", () => {
    // Cinq en base dont trois portées par le fichier : rien ne naît, donc
    // rien ne franchit la borne.
    const r = construireBrut(fichier(3), [
      existante("Unité 1", "u1"),
      existante("Unité 2", "u2"),
      existante("Unité 3", "u3"),
      existante("Autre A", "u4"),
      existante("Autre B", "u5"),
    ]);

    expect(r.ok).toBe(true);
  });

  it("ne compte pas l'unité transverse, et ne lui rattache rien", () => {
    // Cinq unités au fichier plus la transverse en base : ça passe. C'est le
    // cas du pré-remplissage restauration, parfaitement dans la cible.
    const transverse: UniteExistante = {
      id: "u-transverse",
      nom: "Risques transverses",
      estTransverse: true,
    };

    const e = construire(fichier(5), [transverse]);

    expect(e.unitesACreer).toHaveLength(5);
    expect(e.risques.some((r) => r.uniteId === "u-transverse")).toBe(false);
  });

  it("un DUERP ancien à huit unités n'est pas cassé : il refuse, il ne perd rien", () => {
    const huit = Array.from({ length: 8 }, (_, i) =>
      existante(`Ancienne ${i + 1}`, `u${i + 1}`),
    );

    const r = construireBrut(fichier(1), huit);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("9 unités");
  });
});
