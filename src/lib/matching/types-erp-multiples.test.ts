// Plusieurs types d'ERP (ADR-045, lot 1). Un établissement qui groupe
// plusieurs exploitations reçoit les lignes de chacun de ses types (GN 2 § 3),
// et un seul membre de chaque groupe exclusif, le plus exigeant.
//
// Éprouvé en cassant (commit du lot) : la résolution retirée de
// `determineObligationsApplicables` (« chaque groupe sort au plus un
// membre », l'hôtel O + N + L et l'hôtel-restaurant de 5ᵉ rougissent) ;
// `matchTypologie` réduit au premier type (la borne basse, la permutation,
// l'hôtel-restaurant de 5ᵉ et le sommeil rougissent — pas l'hôtel O + N + L,
// que O, déclaré en premier, sert déjà en entier) ; `groupeExclusif`
// retiré d'une ligne à `typesExclus` (le test de structure rougit) ; le
// critère « établi » du départage retiré (`lEmporte` rend `false` à rythme
// égal : le test des membres synthétiques rougit).
import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { porteurDe } from "@/lib/referentiels/conformite/types";
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import {
  CATEGORIES_EQUIPEMENT,
  type CategorieErp,
  type TypeErp,
} from "@/lib/referentiels/types-communs";
import { determineObligationsApplicables, evaluerObligation } from "./engine";
import type { EquipementMatching, EtablissementMatching } from "./types";
import { typesErpDe } from "./types-erp";
import { projeterEtablissement } from "./projection";

const TYPES: TypeErp[] = [
  "J", "L", "M", "N", "O", "P", "R", "S", "T", "U", "V", "W", "X", "Y",
  "PA", "CTS", "SG", "PS", "REF", "GA", "OA", "EF",
];
const CATEGORIES: CategorieErp[] = ["N1", "N2", "N3", "N4", "N5"];
const SOMMEIL = [true, false, null] as const;

const erp = (
  types: TypeErp[],
  categorieErp: CategorieErp,
  comporteLocauxSommeilPublic: boolean | null = null,
): EtablissementMatching => ({
  id: "etab",
  effectifSurSite: 12,
  effectifEntreprise: 12,
  estEtablissementTravail: true,
  estERP: true,
  estIGH: false,
  estHabitation: false,
  typeErp: types[0] ?? null,
  typesErpAutres: types.slice(1),
  categorieErp,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
});

const PARC: EquipementMatching[] = CATEGORIES_EQUIPEMENT.map((categorie, i) => ({
  id: `e${i}`,
  libelle: categorie,
  categorie,
  caracteristiques: null,
}));

const ids = (e: EtablissementMatching, eq: EquipementMatching[] = []) =>
  new Set(determineObligationsApplicables(e, eq).map((a) => a.obligation.id));

const GROUPES = new Map<string, string[]>();
for (const o of obligationsConformite) {
  if (o.groupeExclusif === undefined) continue;
  GROUPES.set(o.groupeExclusif, [...(GROUPES.get(o.groupeExclusif) ?? []), o.id]);
}

const PAIRES: TypeErp[][] = TYPES.flatMap((a, i) => TYPES.slice(i + 1).map((b) => [a, b]));
const TRIPLETS: TypeErp[][] = TYPES.flatMap((a, i) =>
  TYPES.slice(i + 1).flatMap((b, j) => TYPES.slice(i + j + 2).map((c) => [a, b, c])),
);

describe("les groupes exclusifs — la structure", () => {
  it("toute obligation à `typesExclus` appartient à un groupe", () => {
    const orphelines = obligationsConformite.filter(
      (o) =>
        typeof o.typologies.erp === "object" &&
        (o.typologies.erp.typesExclus?.length ?? 0) > 0 &&
        o.groupeExclusif === undefined,
    );
    expect(
      orphelines.map((o) => o.id),
      "Une ligne à `typesExclus` est le membre général d'une paire : sans groupe, " +
        "un établissement qui déclare un type de chaque côté reçoit les deux (ADR-045).",
    ).toEqual([]);
  });

  it("un groupe a au moins deux membres, tous portés par l'établissement et servis au quotidien", () => {
    expect(GROUPES.size).toBeGreaterThan(0);
    for (const [g, membres] of GROUPES) {
      expect(membres.length, g).toBeGreaterThanOrEqual(2);
      for (const id of membres) {
        const o = obligationsConformite.find((x) => x.id === id)!;
        expect(porteurDe(o), id).toBe("etablissement");
        expect(estNiveauAudit(o), id).toBe(false);
      }
    }
  });
});

describe("un seul type : la sortie d'avant l'ADR-045", () => {
  // La résolution des groupes est la seule étape nouvelle sur ce chemin. Si,
  // pour un seul type, aucun groupe n'a plus d'un membre AVANT elle, elle ne
  // retire rien, et la sortie est l'évaluation par type, inchangée.
  // `evaluerObligation` est l'évaluation avant la résolution.
  it("aucun groupe n'a deux membres applicables, sur toute la grille", () => {
    for (const t of TYPES) {
      for (const c of CATEGORIES) {
        for (const s of SOMMEIL) {
          const e = erp([t], c, s);
          for (const [g, membres] of GROUPES) {
            const n = membres.filter((id) =>
              evaluerObligation(obligationsConformite.find((o) => o.id === id)!, e, []) !== null,
            ).length;
            expect(n, `${g} — ${t} ${c} sommeil=${s}`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
});

describe("plusieurs types : l'union, puis un membre par groupe", () => {
  it("chaque groupe sort au plus un membre, pour toute paire de types", () => {
    for (const ts of PAIRES) {
      for (const c of CATEGORIES) {
        for (const s of SOMMEIL) {
          const sortie = ids(erp(ts, c, s));
          for (const [g, membres] of GROUPES) {
            const n = membres.filter((id) => sortie.has(id)).length;
            expect(n, `${g} — ${ts.join("+")} ${c} sommeil=${s}`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  // Délai explicite (2026-10-17) : 1 540 triplets × 5 catégories × 3 réponses
  // sommeil, soit ~23 000 appels du moteur — environ 5 s en CI, au bord du
  // délai par défaut de vitest (5 s), qui a fait échouer la PR #50 sans erreur
  // de logique. Ce n'est pas un palliatif : la grille est le contenu du test.
  it("chaque groupe sort au plus un membre, pour tout triplet de types", () => {
    expect(TRIPLETS.length).toBe(1540);
    for (const ts of TRIPLETS) {
      for (const c of CATEGORIES) {
        for (const s of SOMMEIL) {
          const sortie = ids(erp(ts, c, s));
          for (const [g, membres] of GROUPES) {
            const n = membres.filter((id) => sortie.has(id)).length;
            expect(n, `${g} — ${ts.join("+")} ${c} sommeil=${s}`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  }, 60_000);

  it("l'union dépasse au moins une fois chacun des types déclarés seuls (borne basse)", () => {
    // M + O en 3ᵉ catégorie : M seul n'a ni la consigne des chambres ni les
    // plans par niveau (O 21) ; O seul n'a pas le schéma d'organisation (M 31).
    const union = ids(erp(["M", "O"], "N3", true));
    for (const t of ["M", "O"] as const) {
      const seul = ids(erp([t], "N3", true));
      expect([...union].some((id) => !seul.has(id)), `${t} seul`).toBe(true);
    }
  });

  it("le premier type déclaré ne décide de rien : permuter rend les mêmes lignes", () => {
    for (const [a, b] of PAIRES) {
      for (const c of CATEGORIES) {
        expect([...ids(erp([a, b], c, true), PARC)].sort(), `${a}+${b} ${c}`).toEqual(
          [...ids(erp([b, a], c, true), PARC)].sort(),
        );
      }
    }
  });

  it("l'hôtel O + N + L de 3ᵉ catégorie : une seule visite de commission, la triennale", () => {
    const sortie = ids(erp(["O", "N", "L"], "N3", true));
    expect(sortie.has("incendie-erp-visite-commission-cat3-triennale")).toBe(true);
    expect(sortie.has("incendie-erp-visite-commission-cat3-quinquennale")).toBe(false);
    // Les lignes de type de l'hôtel sont là, celles du restaurant aussi.
    expect(sortie.has("incendie-erp-hotel-consigne-chambres")).toBe(true);
    expect(sortie.has("incendie-erp-personnel-designe-moyens-secours")).toBe(true);
  });

  it("un magasin et un restaurant de 3ᵉ, sans type triennal : la quinquennale", () => {
    const sortie = ids(erp(["M", "N"], "N3"));
    expect(sortie.has("incendie-erp-visite-commission-cat3-quinquennale")).toBe(true);
    expect(sortie.has("incendie-erp-visite-commission-cat3-triennale")).toBe(false);
  });

  it("l'hôtel-restaurant de 5ᵉ : les lignes de l'hôtel, pas les lignes générales qu'elles absorbent", () => {
    const sortie = ids(erp(["N", "O"], "N5", true));
    expect(sortie.has("incendie-hotel-po-controle-biennal-installations")).toBe(true);
    expect(sortie.has("incendie-erp-pe4-entretien-installations-techniques")).toBe(false);
    expect(sortie.has("incendie-hotel-po-instruction-personnel-semestrielle")).toBe(true);
    expect(sortie.has("incendie-erp-5-instruction-personnel")).toBe(false);
    // Le sommeil se lit sur l'ensemble des types : O le rend plausible.
    expect(sortie.has("incendie-erp-5-visite-commission")).toBe(true);
  });

  it("à rythme égal, le membre établi l'emporte, quel que soit l'ordre du référentiel", () => {
    // Deux membres SYNTHÉTIQUES d'un même groupe, au même rythme : l'un borné
    // à R et aux locaux à sommeil (retenu « à confirmer » quand le sommeil
    // n'est pas renseigné), l'autre borné à O (établi). Présentés dans les
    // deux ordres, c'est l'établi qui sort : l'ordre ne décide pas, la règle
    // décide. Dans le référentiel, l'ordre donne déjà la bonne réponse, et le
    // test sur les vraies lignes ci-dessous ne peut pas voir le critère.
    const modele = obligationsConformite.find(
      (o) => o.id === "incendie-erp-visite-commission-cat4-triennale",
    )!;
    const aConfirmer = {
      ...modele,
      id: "synthetique-a-confirmer",
      groupeExclusif: "synthetique",
      typologies: { erp: { categories: ["N4"], types: ["R"] }, locauxSommeilPublic: true },
    } as typeof modele;
    const etabli = {
      ...modele,
      id: "synthetique-etabli",
      groupeExclusif: "synthetique",
      typologies: { erp: { categories: ["N4"], types: ["O"] } },
    } as typeof modele;
    for (const obligations of [[aConfirmer, etabli], [etabli, aConfirmer]]) {
      const sortie = determineObligationsApplicables(erp(["R", "O"], "N4", null), [], { obligations });
      const ordre = obligations.map((o) => o.id).join(" puis ");
      expect(sortie.map((a) => a.obligation.id), ordre).toEqual(["synthetique-etabli"]);
    }
    // Les deux membres sortent bien, chacun de son côté : sans quoi le test
    // ne départagerait rien.
    const r = determineObligationsApplicables(erp(["R"], "N4", null), [], { obligations: [aConfirmer] });
    expect(r.map((a) => a.sansReponse?.length ?? 0)).toEqual([1]);
    expect(
      determineObligationsApplicables(erp(["O"], "N4", null), [], { obligations: [etabli] }),
    ).toHaveLength(1);
  });

  it("à rythme égal, le membre établi l'emporte sur celui que retient le silence", () => {
    // R + O de 4ᵉ, sommeil non renseigné : R seul donne la triennale « avec
    // hébergement » à confirmer, O la triennale établie. Les deux sont à trois
    // ans ; la ligne servie ne doit pas porter la question sans réponse.
    for (const ts of [["R", "O"], ["O", "R"], ["R", "J"]] as TypeErp[][]) {
      const visites = determineObligationsApplicables(erp(ts, "N4", null), []).filter(
        (a) => a.obligation.groupeExclusif === "ge4-visite-cat4",
      );
      expect(visites.map((a) => a.obligation.id), ts.join("+")).toEqual([
        "incendie-erp-visite-commission-cat4-triennale",
      ]);
      expect(visites[0].sansReponse ?? [], ts.join("+")).toEqual([]);
    }
  });

  it("le sommeil n'est pas plausible pour un restaurant seul, il l'est dès qu'O est déclaré", () => {
    expect(ids(erp(["N"], "N5", true)).has("incendie-erp-5-visite-commission")).toBe(false);
    expect(ids(erp(["N", "O"], "N5", true)).has("incendie-erp-5-visite-commission")).toBe(true);
  });
});

describe("typesErpDe", () => {
  it("le premier type, puis les autres, sans doublon", () => {
    expect(typesErpDe({ typeErp: "O", typesErpAutres: ["N", "O", "L"] })).toEqual(["O", "N", "L"]);
    expect(typesErpDe({ typeErp: null, typesErpAutres: [] })).toEqual([]);
  });

  it("un autre type sans premier type vaut ce type seul", () => {
    expect([...ids({ ...erp([], "N4"), typesErpAutres: ["M"] })].sort()).toEqual(
      [...ids(erp(["M"], "N4"))].sort(),
    );
  });
});

describe("la projection porte les autres types enregistrés (lot 2)", () => {
  it("un restaurant déclaré N, avec O parmi les autres types, reçoit les lignes de l'hôtel", () => {
    const { effectifEntreprise, ...ligne } = erp(["N"], "N3", true);
    const projete = projeterEtablissement({
      ...ligne,
      typesErpAutres: ["O"],
      entreprise: { effectif: effectifEntreprise },
    });
    expect(projete.typesErpAutres).toEqual(["O"]);
    expect(ids(projete).has("incendie-erp-hotel-consigne-chambres")).toBe(true);
    expect(ids(erp(["N"], "N3", true)).has("incendie-erp-hotel-consigne-chambres")).toBe(false);
  });
});

describe("hors ERP, les autres types gardés en base ne décident de rien (2026-10-17)", () => {
  // Décocher « ERP » garde les autres types, comme `typeErp` (symétrie
  // décidée le 2026-10-17). Le moteur doit alors les ignorer.
  const horsErp = (types: TypeErp[], autresTypes: TypeErp[]): EtablissementMatching => ({
    ...erp(types, "N3", true),
    estERP: false,
    typesErpAutres: autresTypes,
  });

  it("sur le référentiel, un non-ERP qui garde des types reçoit les mêmes lignes que sans", () => {
    for (const t of [[], ["N"], ["O"]] as TypeErp[][]) {
      for (const autres of [["O"], ["M", "W"], TYPES.filter((x) => !t.includes(x))] as TypeErp[][]) {
        expect([...ids(horsErp(t, autres), PARC)].sort(), `${t} + ${autres}`).toEqual(
          [...ids(horsErp(t, []), PARC)].sort(),
        );
      }
    }
  });

  it("même une ligne qui lit le sommeil sans critère ERP ne sort pas par un type gardé", () => {
    // Le référentiel n'en porte pas aujourd'hui : c'est ce qui rendrait la
    // garde invisible sur les vraies lignes. Une obligation synthétique la
    // rend observable.
    const modele = obligationsConformite.find((o) => o.id === "incendie-erp-5-visite-commission")!;
    const sommeil = {
      ...modele,
      id: "synthetique-sommeil-sans-erp",
      typologies: { travail: true, locauxSommeilPublic: true },
    } as typeof modele;
    const sortie = determineObligationsApplicables(horsErp(["N"], ["O"]), [], { obligations: [sommeil] });
    expect(sortie).toEqual([]);
    // Et ERP, O parmi les autres types, elle sort : la garde ne vise que le hors-ERP.
    const erpO = determineObligationsApplicables({ ...horsErp(["N"], ["O"]), estERP: true }, [], {
      obligations: [sommeil],
    });
    expect(erpO).toHaveLength(1);
  });
});
