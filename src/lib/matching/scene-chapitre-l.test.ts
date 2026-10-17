import { describe, expect, it } from "vitest";
import { obligationParId, obligationsConformite } from "@/lib/referentiels/conformite";
import type { Obligation } from "@/lib/referentiels/conformite";
import type { CategorieErp, TypeErp } from "@/lib/referentiels/types-communs";
import { determineObligationsApplicables } from "./engine";
import type { EquipementMatching, EtablissementMatching } from "./types";

/**
 * Le chapitre L (sous-lot G, 2026-10-17) : la scène déclarée et ce qu'elle
 * fait naître, mesuré en appelant le moteur sur le référentiel réel.
 *
 * Pas de liste exhaustive : une borne basse (la salle L de 3ᵉ avec une scène,
 * la salle de danse P, L en type supplémentaire), une borne haute (5ᵉ
 * catégorie, autre type, salle SANS scène), et la couche voisine (une ligne
 * par établissement, une par scène). Chaque garde est éprouvée en cassant le
 * référentiel (bloc « cassures »).
 *
 * L'exigence de la propriétaire (« on n'alourdit pas ») : une salle L ou P
 * sans scène déclarée ne reçoit AUCUNE ligne du sous-lot G, sauf le personnel
 * désigné (L 14), dû à toute salle L des catégories 1 à 4.
 */

const TRIENNALE = "scene-erp-verifications-triennales-organisme-agree";
const DEPOUSSIERAGE = "scene-erp-depoussierage-annuel";
const MATERIEL = "scene-erp-materiels-installations-temporaires-annuelle";
const PRESENCE_N3 = "elec-erp-presence-personne-qualifiee-scene-n3";
const PERSONNEL = "incendie-erp-personnel-designe-moyens-secours";
const LIGNES_SCENE = [DEPOUSSIERAGE, MATERIEL, TRIENNALE] as const;
const LIGNES_G = [...LIGNES_SCENE, PRESENCE_N3] as const;

function salle(
  typeErp: TypeErp,
  categorieErp: CategorieErp,
  typesErpAutres: TypeErp[] = [],
): EtablissementMatching {
  return {
    id: `salle-${typeErp}-${categorieErp}`,
    effectifSurSite: 6,
    effectifEntreprise: 6,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp,
    typesErpAutres,
    categorieErp,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: typeErp === "O" ? true : null,
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
    ssiCategorieAouB: null,
  };
}

const scene = (id: string): EquipementMatching => ({
  id,
  libelle: `Scène ${id}`,
  categorie: "SCENE",
  caracteristiques: null,
});

/** Les identifiants servis, filtrés sur le sous-lot G et le personnel désigné. */
function servies(
  e: EtablissementMatching,
  parc: EquipementMatching[],
  obligations?: Obligation[],
): string[] {
  return determineObligationsApplicables(e, parc, obligations ? { obligations } : undefined)
    .map((a) => a.obligation.id)
    .filter((id) => (LIGNES_G as readonly string[]).includes(id) || id === PERSONNEL)
    .sort();
}

/**
 * Le nombre de lignes de calendrier qu'une obligation engendre : une par
 * équipement déclencheur si elle est portée par l'équipement, une seule si
 * elle l'est par l'établissement (`ObligationApplicable.porteur`, ADR-022).
 */
function nombre(e: EtablissementMatching, parc: EquipementMatching[], id: string): number {
  const a = determineObligationsApplicables(e, parc).find((x) => x.obligation.id === id);
  if (!a) return 0;
  return a.porteur === "equipement" ? a.equipementsConcernes.length : 1;
}

describe("chapitre L — borne basse : une salle avec une scène déclarée", () => {
  it("une salle L de 3ᵉ catégorie reçoit les quatre lignes et le personnel désigné", () => {
    expect(servies(salle("L", "N3"), [scene("a")])).toEqual([...LIGNES_G, PERSONNEL].sort());
  });

  it("une salle L de 1ʳᵉ, 2ᵉ ou 4ᵉ catégorie reçoit les trois lignes de la scène, sans la présence de 3ᵉ", () => {
    for (const c of ["N1", "N2", "N4"] as const) {
      expect(servies(salle("L", c), [scene("a")]), c).toEqual([...LIGNES_SCENE, PERSONNEL].sort());
    }
  });

  it("une salle de danse (type P) de 3ᵉ avec une scène reçoit les lignes de la scène (L 1 § 3), et le personnel désigné (P 21, sous-lot D)", () => {
    expect(servies(salle("P", "N3"), [scene("a")])).toEqual([...LIGNES_G, PERSONNEL].sort());
  });

  it("un hôtel (O) qui déclare L en type supplémentaire et une scène les reçoit (GN 2, ADR-045)", () => {
    expect(servies(salle("O", "N3", ["L"]), [scene("a")])).toEqual([...LIGNES_G, PERSONNEL].sort());
  });
});

describe("chapitre L — borne haute : ni scène hors du champ, ni ligne sans scène", () => {
  it("SANS SCÈNE DÉCLARÉE, une salle L ne reçoit que le personnel désigné (« on n'alourdit pas »)", () => {
    for (const c of ["N1", "N2", "N3", "N4"] as const) {
      expect(servies(salle("L", c), []), c).toEqual([PERSONNEL]);
    }
  });

  it("SANS SCÈNE DÉCLARÉE, une salle de danse P ne reçoit aucune ligne du sous-lot G (le personnel désigné lui vient de P 21)", () => {
    for (const c of ["N1", "N2", "N3", "N4"] as const) {
      expect(servies(salle("P", c), []), c).toEqual([PERSONNEL]);
    }
  });

  it("en 5ᵉ catégorie, une scène ne fait rien naître (PE 1 § 1)", () => {
    expect(servies(salle("L", "N5"), [scene("a")])).toEqual([]);
    expect(servies(salle("P", "N5"), [scene("a")])).toEqual([]);
  });

  it("un autre type qui déclare une scène ne reçoit rien (un restaurant N de 3ᵉ)", () => {
    expect(servies(salle("N", "N3"), [scene("a")])).toEqual([PERSONNEL]);
  });
});

describe("chapitre L — une ligne par établissement, une par scène", () => {
  it("deux scènes : deux dépoussiérages, une seule triennale, un seul matériel, une seule présence", () => {
    const e = salle("L", "N3");
    const parc = [scene("a"), scene("b")];
    expect(nombre(e, parc, DEPOUSSIERAGE)).toBe(2);
    expect(nombre(e, parc, TRIENNALE)).toBe(1);
    expect(nombre(e, parc, MATERIEL)).toBe(1);
    expect(nombre(e, parc, PRESENCE_N3)).toBe(1);
  });

  it("les rythmes viennent du texte : 3 ans (L 57 § 1 a), 1 an (L 57 § 3), 1 an (L 13 § 5)", () => {
    expect(obligationParId(TRIENNALE)?.periodicite).toBe("triennale");
    expect(obligationParId(DEPOUSSIERAGE)?.periodicite).toBe("annuelle");
    expect(obligationParId(MATERIEL)?.periodicite).toBe("annuelle");
    expect(obligationParId(PRESENCE_N3)?.nature).toBe("etat_permanent");
  });

  it("pas de doublon avec le levage : aucune ligne ne se fonde sur L 57 § 1 c", () => {
    expect(levageEncodeSurL57(obligationsConformite)).toEqual([]);
  });
});

/** Une obligation qui se fonderait sur L 57 § 1 c (le levage) — déjà portée par les lignes de levage. */
function levageEncodeSurL57(obligations: readonly Obligation[]): string[] {
  return obligations
    .filter((o) => o.referencesLegales.some((r) => r.article === "L 57" && /§ 1 c/.test(r.reference)))
    .map((o) => o.id);
}

describe("chapitre L — cassures : chaque garde rougit quand on retire ce qu'elle garde", () => {
  /** Le référentiel avec une obligation remplacée. */
  const avec = (id: string, change: (o: Obligation) => Obligation): Obligation[] =>
    obligationsConformite.map((o) => (o.id === id ? change(o) : o));

  it("retirer `siEquipementDeclare` de la triennale la sert à une salle L sans scène", () => {
    const casse = avec(TRIENNALE, (o) => ({ ...o, siEquipementDeclare: undefined }) as Obligation);
    expect(servies(salle("L", "N3"), [], casse)).toContain(TRIENNALE);
  });

  it("retirer la borne de catégorie sert le dépoussiérage en 5ᵉ", () => {
    const casse = avec(DEPOUSSIERAGE, (o) => ({ ...o, typologies: { erp: { types: ["L", "P"] } } }) as Obligation);
    expect(servies(salle("L", "N5"), [scene("a")], casse)).toContain(DEPOUSSIERAGE);
  });

  it("retirer la borne de type sert le matériel temporaire à un restaurant avec scène", () => {
    const casse = avec(MATERIEL, (o) => ({ ...o, typologies: { erp: { categories: ["N1", "N2", "N3", "N4"] } } }) as Obligation);
    expect(servies(salle("N", "N3"), [scene("a")], casse)).toContain(MATERIEL);
  });

  it("retirer L des autres types d'un hôtel : plus rien du sous-lot G (reste le personnel désigné, dû par O 18)", () => {
    expect(servies(salle("O", "N3", []), [scene("a")])).toEqual([PERSONNEL]);
  });

  it("encoder L 57 § 1 c est vu par la garde du levage", () => {
    const temoin = {
      ...obligationParId(DEPOUSSIERAGE)!,
      id: "temoin-levage-l57",
      referencesLegales: [
        { source: "ARRETE", reference: "Arrêté du 25 juin 1980, art. L 57 § 1 c (levage)", article: "L 57" },
      ],
    } as Obligation;
    expect(levageEncodeSurL57([...obligationsConformite, temoin])).toEqual(["temoin-levage-l57"]);
  });
});

describe("L 14 — le personnel désigné, servi au type L", () => {
  it("cite L 14 et dit l'aggravation de GN 10 pour le type L", () => {
    const o = obligationParId(PERSONNEL)!;
    expect(o.referencesLegales.map((r) => r.article)).toContain("L 14");
    expect(o.description).toContain("Pour le type L, ce même article écrit qu'il s'applique aussi aux établissements existants");
  });
});

describe("chapitre L — l'écran « Ce qui doit être en place » cite le texte", () => {
  // Une référence qui nomme deux articles (« L 14 … GN 10 ») perd son extrait
  // (`referenceNommeLArticle`) : relevé le 2026-10-17 sur L 14 et L 57 § 7,
  // références réécrites pour ne nommer que leur article.
  it("la présence de 3ᵉ cite L 57 § 7, mot pour mot", async () => {
    // ~~Limite : aucun extrait pour une entrée scindée~~ — corrigée le
    // 2026-10-17 dans `fondement.ts` (décision de c6) : la clé « L 57 § 7 — … »
    // désigne L 57, et l'extrait est celui de l'entrée scindée.
    const { fondementDe } = await import("@/lib/etats-permanents/fondement");
    const f = fondementDe(obligationParId(PRESENCE_N3)!);
    expect(f?.reference).toContain("art. L 57 § 7");
    expect(f?.extrait).toContain("En aggravation, les dispositions de l'article EL 18 (§ 2)");
  });
});
