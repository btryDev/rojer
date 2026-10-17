// Deux lignes qu'un type d'ERP sépare se rejoignent chez l'établissement qui
// groupe les deux exploitations (ADR-045, GN 2 § 3). L'anti-doublon de
// `conformite.test.ts` ne compare que des lignes au même article fondateur et
// au même rythme ; or chaque chapitre de type cite son propre article, et un
// doublon par type peut porter un autre rythme (PE 4 / PO 1 § 3). Ce test-ci
// ne regarde ni l'article ni le rythme : toute paire disjointe pour un seul
// type qui se rejoint pour deux, au même porteur et aux mêmes conditions,
// partage un `groupeExclusif` ou est déclarée, famille par famille, avec son
// motif.
//
// Éprouvé en cassant (commit du lot) : (a) un clone du contrôle biennal de
// PO borné à L, même article, sans groupe ; (b) le même clone avec un article
// fictif — seul ce test le voit ; (c) `groupeExclusif` retiré de PE 4 § 2,
// le doublon réel à rythme différent (PE 4 triennal / PO 1 § 3 biennal) ;
// (d) une copie de la consigne des chambres, tous types sauf O, sans groupe,
// nommée « incendie-erp-visite-commission-consigne-chambres-bis » — que le
// motif ouvert d'une famille couvrait. Les quatre rougissent ici.
import { describe, expect, it } from "vitest";
import { matchTypologie } from "@/lib/matching/engine";
import type { EtablissementMatching } from "@/lib/matching/types";
import {
  CATEGORIES_ERP,
  TYPES_ERP,
  type CategorieErp,
  type TypeErp,
} from "@/lib/referentiels/types-communs";
import { obligationsConformite } from "./index";
import { estPorteeParEquipement, porteurDe, type Obligation } from "./types";

const sonde = (
  categorieErp: CategorieErp | null,
  types: TypeErp[],
  comporteLocauxSommeilPublic: boolean | null,
): EtablissementMatching => ({
  id: "sonde",
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

const SOMMEIL = [true, false, null] as const;
const MONO: EtablissementMatching[] = [];
const DUO: EtablissementMatching[] = [];
for (const c of [...CATEGORIES_ERP, null] as const) {
  for (const h of SOMMEIL) {
    MONO.push(sonde(c, [], h));
    for (let i = 0; i < TYPES_ERP.length; i++) {
      MONO.push(sonde(c, [TYPES_ERP[i]], h));
      for (let k = i + 1; k < TYPES_ERP.length; k++) {
        DUO.push(sonde(c, [TYPES_ERP[i], TYPES_ERP[k]], h));
      }
    }
  }
}

/** Les indices des sondes que l'obligation atteint. */
const atteint = (o: Obligation, sondes: EtablissementMatching[]) =>
  new Set(sondes.flatMap((e, i) => (matchTypologie(o.typologies, e).ok ? [i] : [])));

const seRecouvrent = (a: Set<number>, b: Set<number>) => {
  for (const i of a) if (b.has(i)) return true;
  return false;
};

const signatureConditions = (o: Obligation) =>
  JSON.stringify((o.conditions ?? []).map((c) => JSON.stringify(c)).sort());

/** Même porteur, mêmes conditions, et — pour deux lignes d'appareil — une catégorie commune. */
const memeCible = (a: Obligation, b: Obligation) => {
  if (porteurDe(a) !== porteurDe(b)) return false;
  if (signatureConditions(a) !== signatureConditions(b)) return false;
  if (estPorteeParEquipement(a) && estPorteeParEquipement(b)) {
    return a.categoriesEquipement.some((c) => b.categoriesEquipement.includes(c));
  }
  return true;
};

/** Les paires que seul un établissement à deux types réunit, hors groupe exclusif commun. */
function pairesSepareesParLeType(obligations: Obligation[]): [string, string][] {
  const mono = obligations.map((o) => atteint(o, MONO));
  const duo = obligations.map((o) => atteint(o, DUO));
  const out: [string, string][] = [];
  for (let i = 0; i < obligations.length; i++) {
    for (let j = i + 1; j < obligations.length; j++) {
      const a = obligations[i];
      const b = obligations[j];
      if (a.groupeExclusif !== undefined && a.groupeExclusif === b.groupeExclusif) continue;
      if (!memeCible(a, b)) continue;
      if (seRecouvrent(mono[i], mono[j])) continue;
      if (!seRecouvrent(duo[i], duo[j])) continue;
      out.push([a.id, b.id].sort() as [string, string]);
    }
  }
  return out;
}

/**
 * Les familles de paires que deux types réunissent sans que ce soit un
 * doublon : deux actes distincts, que l'établissement doit tous deux.
 * Chaque famille dit pourquoi, et nomme ses deux côtés.
 */
const FAMILLES_DECLAREES: {
  famille: string;
  motif: string;
  /**
   * Les deux côtés de la famille, chacun ANCRÉ sur des identifiants nommés
   * (`^…$`) : une paire en relève si chaque ligne est d'un côté. Jamais un
   * motif ouvert — un identifiant qui contiendrait la chaîne serait couvert
   * sans avoir été lu (relecture du 2026-10-17 : `/visite-commission/` aurait
   * couvert une copie de la consigne des chambres nommée « …-visite-commission-… »).
   */
  cotes: [RegExp, RegExp][];
}[] = [
  {
    famille: "visite de commission ↔ disposition particulière d'un type",
    motif:
      "La visite périodique de la commission de sécurité (GE 4 § 1) est un contrôle de l'administration, à son rythme ; les dispositions particulières des chapitres de type (titre II : personnel désigné, interdiction de fumer affichée, schéma d'organisation, consigne des chambres, plans par niveau) sont des actes de l'exploitant, sans rythme. Deux types les réunissent parce que la ligne de visite retenue dépend du type (tableau de GE 4) et que la disposition aussi — l'établissement doit les deux, ce ne sont pas deux lignes pour un acte.",
    cotes: [
      [
        // Les sept visites de commission du tableau de GE 4 § 1 qui forment une
        // paire aujourd'hui, nommées une à une.
        /^incendie-erp-visite-commission-(cat1-2-quinquennale|cat3-triennale|cat3-quinquennale|cat4-triennale|cat4-quinquennale|cat4-r-avec-hebergement-triennale|cat4-r-sans-hebergement-quinquennale)$/,
        /^incendie-erp-(hotel-consigne-chambres|hotel-plans-evacuation-niveaux|interdiction-fumer-affichee|personnel-designe-moyens-secours|schema-organisation-securite)$/,
      ],
    ],
  },
  {
    famille: "dispositions particulières de deux types",
    motif:
      "M 31 (schéma d'organisation globale de la sécurité, annexé au registre) et O 21 (consigne dans les chambres, plans d'évacuation par niveau) sont deux chapitres de type différents et trois pièces différentes. Un magasin qui comporte un hôtel les doit toutes (GN 2 § 3 : « les dispositions particulières propres aux différents types d'exploitations groupées […] sont applicables »).",
    cotes: [
      [
        /^incendie-erp-schema-organisation-securite$/,
        /^incendie-erp-hotel-(consigne-chambres|plans-evacuation-niveaux)$/,
      ],
    ],
  },
  {
    famille: "5ᵉ catégorie : une paire générale/hôtel croisée avec l'autre",
    motif:
      "Deux groupes exclusifs vivent en 5ᵉ : entretien des installations techniques (PE 4 § 2 / PO 1 § 3) et instruction du personnel (PE 27 § 5 / PO 7). Leurs membres se départagent DANS chaque groupe. Croisés — l'instruction générale avec le contrôle biennal de l'hôtel, l'entretien général avec l'instruction semestrielle de l'hôtel —, ce sont deux actes différents, l'un sur les installations, l'autre sur le personnel. Paires nommées une à une : une famille plus large couvrirait le doublon réel d'un même groupe dont on aurait retiré le `groupeExclusif`.",
    cotes: [
      [/^incendie-erp-5-instruction-personnel$/, /^incendie-hotel-po-controle-biennal-installations$/],
      [/^incendie-erp-pe4-entretien-installations-techniques$/, /^incendie-hotel-po-instruction-personnel-semestrielle$/],
    ],
  },
  {
    famille: "code du sport (type X) ↔ règlement de sécurité d'un autre type",
    motif:
      "La trousse, le moyen d'alerte et le tableau des secours de R. 322-4 (code du sport, établissement où se pratiquent des activités physiques ou sportives, lu sur le type X) ne sont aucun des actes du règlement de sécurité qu'un autre type fait naître : visite de la commission, consignes et plans, personnel désigné, interdiction de fumer, schéma d'organisation, contrat d'entretien du SDI, contrôle et instruction de l'hôtel. Une salle de sport qui comporte un hôtel ou un magasin doit les deux textes (sous-lot E, 2026-10-17). Identifiants nommés un à un.",
    cotes: [
      [
        /^sport-etablissement-secours-r322-4$/,
        /^incendie-erp-(5-sommeil-avis-controle-affiche|5-sommeil-consigne-chambres|5-sommeil-contrat-entretien-sdi|5-sommeil-plans-affiches|5-visite-commission|hotel-consigne-chambres|hotel-plans-evacuation-niveaux|interdiction-fumer-affichee|personnel-designe-moyens-secours|schema-organisation-securite|visite-commission-cat1-2-quinquennale|visite-commission-cat3-triennale|visite-commission-cat4-r-avec-hebergement-triennale|visite-commission-cat4-r-sans-hebergement-quinquennale|visite-commission-cat4-triennale)$/,
      ],
      [
        /^sport-etablissement-secours-r322-4$/,
        /^incendie-hotel-po-(controle-biennal-installations|instruction-personnel-semestrielle)$/,
      ],
    ],
  },
];

const declaree = ([a, b]: [string, string]) =>
  FAMILLES_DECLAREES.find(({ cotes }) =>
    cotes.some(([x, y]) => (x.test(a) && y.test(b)) || (x.test(b) && y.test(a))),
  );

describe("doublons par type d'ERP (ADR-045)", () => {
  it("toute paire que deux types réunissent partage un groupe exclusif, ou est déclarée", () => {
    const nonDeclarees = pairesSepareesParLeType(obligationsConformite)
      .filter((p) => declaree(p) === undefined)
      .map((p) => p.join(" ↔ "));
    expect(
      nonDeclarees,
      "Ces lignes, disjointes pour un seul type, sont servies ensemble à un " +
        "établissement qui en déclare deux. Si c'est le même acte, donnez-leur " +
        "le même `groupeExclusif` ; sinon, déclarez la famille avec son motif.",
    ).toEqual([]);
  });

  it("chaque famille déclarée a encore au moins une paire, et dit pourquoi", () => {
    const paires = pairesSepareesParLeType(obligationsConformite);
    for (const f of FAMILLES_DECLAREES) {
      expect(paires.some((p) => declaree(p) === f), f.famille).toBe(true);
      expect(f.motif.length, f.famille).toBeGreaterThan(80);
    }
  });
});
