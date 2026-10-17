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
// retiré d'une ligne à `typesExclus` (le test de structure rougit).
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
