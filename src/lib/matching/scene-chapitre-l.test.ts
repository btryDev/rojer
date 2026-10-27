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
    effectifPublicAdmis: null,
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

describe("chapitre L — les gardes portent sur le référentiel lui-même", () => {
  // ~~Cassures sur une COPIE du référentiel~~ — 2026-10-17, revue du sous-lot G
  // (R2) : une copie modifiée dans le test ne prouve rien du référentiel servi.
  // Ce bloc lit les lignes réelles ; chaque garde a été éprouvée en cassant
  // `scene.ts` ou `electricite.ts` (commit de la revue), et rougit.
  const LIGNES = LIGNES_G.map((id) => obligationParId(id)!);

  it("toute ligne d'établissement du sous-lot G n'est due que si une scène est déclarée", () => {
    const sansScene = LIGNES.filter(
      (o) =>
        o.porteur === "etablissement" &&
        !((o as { siEquipementDeclare?: readonly string[] }).siEquipementDeclare ?? []).includes("SCENE"),
    ).map((o) => o.id);
    expect(sansScene).toEqual([]);
  });

  it("toute ligne du sous-lot G est bornée aux catégories 1 à 4 et aux types L et P", () => {
    const horsBorne = LIGNES.filter((o) => {
      const erp = o.typologies.erp;
      if (typeof erp !== "object") return true;
      const cat = erp.categories ?? [];
      const types = erp.types ?? [];
      return (
        cat.length === 0 ||
        !cat.every((c) => ["N1", "N2", "N3", "N4"].includes(c)) ||
        types.length === 0 ||
        !types.every((t) => t === "L" || t === "P")
      );
    }).map((o) => o.id);
    expect(horsBorne).toEqual([]);
  });

  it("un hôtel qui ne déclare pas L ne reçoit rien du sous-lot G, même avec une scène (reste le personnel désigné, dû par O 18)", () => {
    expect(servies(salle("O", "N3", []), [scene("a")])).toEqual([PERSONNEL]);
  });

  it("le prédicat du levage voit une ligne fondée sur L 57 § 1 c (contre-épreuve du prédicat, pas du référentiel)", () => {
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
  it("une salle L voit L 14 cité avec sa phrase du corpus, et pas la mention GN 10", async () => {
    // ~~« cite L 14 et dit l'aggravation » par comparaison d'une copie de
    // texte~~ — revue de G (R2) : on lit ce que l'écran reçoit.
    const { fondementDe, contexteFondementDe } = await import("@/lib/etats-permanents/fondement");
    const { indexArticlesParRef } = await import("@/lib/referentiels/corpus");
    const f = fondementDe(
      obligationParId(PERSONNEL)!,
      contexteFondementDe({ estERP: true, typeErp: "L", typesErpAutres: [], categorieErp: "N3" }),
    )!;
    expect(f.reference).toContain("art. L 14");
    expect(f.extrait).toBe(indexArticlesParRef().get("L 14")?.article.citationCle);
    expect(f.gn10).toBeUndefined();
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

describe("revue indépendante du sous-lot G (2026-10-17) — chaque correction tenue", () => {
  const entree = async (ref: string) => {
    const { indexArticlesParRef } = await import("@/lib/referentiels/corpus");
    return indexArticlesParRef().get(ref)?.article;
  };
  const texteDe = (a: unknown): string => {
    const x = a as { motif?: string; prescrit?: string; reserve?: string };
    return [x?.motif, x?.prescrit, x?.reserve].filter(Boolean).join(" ");
  };

  it("(1) une entrée scindée de L 57 dit le rythme de SON paragraphe, pas celui de l'article", async () => {
    const PARENT = "« tous les trois ans » (§ 1 a), « annuelle » (§ 1 b)";
    for (const ref of [
      "L 57 § 1 b — vérification annuelle des déversoirs et des rideaux d'eau",
      "L 57 § 3 — dépoussiérage annuel de l'espace scénique",
      "L 57 § 4 — inspection avant l'ouverture au public",
      "L 57 § 7 — présence d'une personne qualifiée en 3e catégorie",
    ]) {
      const t = texteDe(await entree(ref));
      expect(t, ref).toContain("Rythme");
      expect(t, ref).not.toContain(PARENT);
    }
  });

  it("(3) l'aide du type L dit L 32 § 1 pour la cabine de projection, et (R6) le faux négatif de L 13", async () => {
    const { AIDE_TYPE_ERP } = await import("@/lib/etablissements/aide-type-erp");
    expect(AIDE_TYPE_ERP.L).toContain("cabine de projection (art. L 32 § 1)");
    expect(AIDE_TYPE_ERP.L).toContain("Sans scène déclarée, Rojer ne suit pas non plus");
  });

  it("(4) le matériel temporaire ne tranche pas à l'écran qui doit faire vérifier", () => {
    expect(obligationParId(MATERIEL)!.description).not.toMatch(/c'est son rapport/);
    expect(obligationParId(MATERIEL)!.description).toContain("Le texte ne dit pas qui doit faire vérifier");
  });

  it("(5) le personnel désigné dit l'agent de 2ᵉ catégorie et le service de représentation jusqu'en 4ᵉ", () => {
    const d = obligationParId(PERSONNEL)!.description ?? "";
    expect(d).toContain("un agent de sécurité incendie et deux personnes désignées");
    expect(d).toContain("de la 1ʳᵉ à la 4ᵉ catégorie, il ajoute un service de représentation");
  });

  it("(6) L 5 est classé comme ses sœurs EC 4 et MS 3", async () => {
    const [l5, ec4, ms3] = await Promise.all(["L 5", "EC 4", "MS 3"].map(entree));
    for (const a of [l5, ec4, ms3]) {
      expect(a?.statut).toBe("hors_perimetre");
      expect((a as { motif?: string }).motif).toBe((ec4 as { motif?: string }).motif);
    }
  });

  it("(R3) la présence de 3ᵉ dit la sur-application au type P", () => {
    expect(obligationParId(PRESENCE_N3)!.description).toContain("art. L 1 § 3");
  });

  it("(R8) le libellé du personnel désigné ne liste pas les secteurs", () => {
    expect(obligationParId(PERSONNEL)!.libelle).toBe(
      "Personnel désigné et entraîné aux moyens de secours (ERP des catégories 1 à 4)",
    );
  });
});
