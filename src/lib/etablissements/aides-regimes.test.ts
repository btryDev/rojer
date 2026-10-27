import { describe, expect, it } from "vitest";
import { CCH_CLASSEMENT_ERP_IGH } from "@/lib/referentiels/corpus/cch-classement-erp-igh";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { matchTypologie } from "@/lib/matching/engine";
import type { EtablissementMatching } from "@/lib/matching/types";
import {
  CATEGORIES_ERP,
  TYPES_ERP_A_SOMMEIL_PLAUSIBLE,
  type CategorieErp,
  type TypeErp,
} from "@/lib/referentiels/types-communs";
import {
  AIDE_HABITATION,
  AIDE_IGH,
  AIDE_LOCAUX_SOMMEIL,
  CE_QUE_CHANGE_SOMMEIL,
  CE_QUE_DECLENCHE_HABITATION,
  CITATION_R146_3,
} from "./aides-regimes";

/**
 * Les deux aides de régime confrontées à leur source (audit du 2026-10-12,
 * B1 et constat « habitation ») : la citation de R. 146-3 au corpus, la liste
 * de ce que déclenche « habitation » au référentiel.
 */

/** Le verbatim du corpus, mis à plat : retours à la ligne et tirets de liste. */
function aPlat(t: string): string {
  return t.replace(/\n- /g, " ").replace(/\s+/g, " ");
}

describe("IGH — l'aide cite R. 146-3, mot pour mot", () => {
  const r1463 = CCH_CLASSEMENT_ERP_IGH.articles.find((a) => a.ref === "CCH R. 146-3");

  it("chaque fragment de la citation figure dans le verbatim du corpus", () => {
    expect(r1463?.citationCle).toBeDefined();
    const source = aPlat(r1463!.citationCle!);
    const fragments = CITATION_R146_3.split("[…]").map((f) => f.trim());
    expect(fragments.length).toBe(2);
    for (const f of fragments) expect(source, f).toContain(f);
  });

  it("50 mètres pour l'habitation, 28 pour le reste — dans cet ordre", () => {
    // Le défaut corrigé était une inversion : la garde la nomme.
    const i50 = AIDE_IGH.indexOf("50 mètres pour les immeubles à usage d'habitation");
    const i28 = AIDE_IGH.indexOf("28 mètres pour tous les autres immeubles");
    expect(i50).toBeGreaterThan(-1);
    expect(i28).toBeGreaterThan(i50);
    expect(AIDE_IGH).toContain("plancher bas du dernier niveau");
    expect(AIDE_IGH).not.toMatch(/étages/);
  });
});

describe("Habitation — l'aide dit ce que la réponse déclenche", () => {
  // Dérivé du référentiel : les obligations dont la SEULE typologie est
  // l'habitation. Celles qui valent aussi en travail ou en ERP (ascenseurs)
  // ne naissent pas de la réponse.
  const declenchees = obligationsConformite.filter((o) => {
    const t = o.typologies as Record<string, unknown>;
    return Boolean(t.habitation) && Object.keys(t).every((k) => k === "habitation" || !t[k]);
  });

  it("la liste de l'aide est exactement celle du référentiel", () => {
    expect(new Set(CE_QUE_DECLENCHE_HABITATION.map((c) => c.obligationId))).toEqual(
      new Set(declenchees.map((o) => o.id)),
    );
  });

  it("une ligne d'équipement est annoncée sous condition d'équipement, une d'établissement d'emblée", () => {
    for (const c of CE_QUE_DECLENCHE_HABITATION) {
      const o = declenchees.find((x) => x.id === c.obligationId)!;
      const parEquipement = (o.categoriesEquipement ?? []).length > 0;
      expect(c.siEquipement !== null, c.obligationId).toBe(parEquipement);
      expect(AIDE_HABITATION).toContain(c.quoi);
    }
  });

  it("ne promet plus ce qu'aucune ligne ne porte", () => {
    expect(AIDE_HABITATION).not.toMatch(/ramonage|paratonnerre|ascenseur/i);
  });
});

describe("Locaux à sommeil — l'aide dit ce que « oui » change, dans chaque catégorie", () => {
  // Contrôle visuel du lot 3 (ADR-045, 2026-10-17) : l'aide ne parlait que de
  // la 5ᵉ, et s'affichait aussi à un ERP de 3ᵉ. Éprouvé en cassant : la liste
  // de la 5ᵉ privée d'une ligne, le type R de la 4ᵉ remplacé par O, et N3
  // retiré de `sansEffet` — chacun rougit ici ; l'aide remise à « Si oui, et
  // en 5ᵉ catégorie » rougit le dernier test.
  const sonde = (categorieErp: CategorieErp, typeErp: TypeErp, h: boolean): EtablissementMatching => ({
    id: "sonde",
    effectifSurSite: 8,
    effectifEntreprise: 8,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp,
    typesErpAutres: [],
    categorieErp,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    effectifPublicAdmis: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: h,
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
    ssiCategorieAouB: null,
  });
  const ids = (e: EtablissementMatching) =>
    new Set(obligationsConformite.filter((o) => matchTypologie(o.typologies, e).ok).map((o) => o.id));
  /** Ce que « oui » ajoute et retire par rapport à « non ». */
  const ecart = (c: CategorieErp, t: TypeErp) => {
    const oui = ids(sonde(c, t, true));
    const non = ids(sonde(c, t, false));
    return {
      entre: [...oui].filter((i) => !non.has(i)).sort(),
      sort: [...non].filter((i) => !oui.has(i)).sort(),
    };
  };

  it("couvre les cinq catégories, chacune une fois", () => {
    expect(new Set(["N5", "N4", ...CE_QUE_CHANGE_SOMMEIL.sansEffet])).toEqual(new Set(CATEGORIES_ERP));
  });

  it("en 5ᵉ, les quatre lignes des locaux à sommeil, pour chaque type à qui la question est posée", () => {
    for (const t of TYPES_ERP_A_SOMMEIL_PLAUSIBLE) {
      expect(ecart("N5", t), t).toEqual({ entre: [...CE_QUE_CHANGE_SOMMEIL.N5].sort(), sort: [] });
    }
  }, 60_000);

  it("en 4ᵉ, la seule visite d'un type R ; rien pour les autres types", () => {
    const { type, entre, sort } = CE_QUE_CHANGE_SOMMEIL.N4;
    for (const t of TYPES_ERP_A_SOMMEIL_PLAUSIBLE) {
      expect(ecart("N4", t), t).toEqual(t === type ? { entre: [entre], sort: [sort] } : { entre: [], sort: [] });
    }
  }, 60_000);

  it("dans les trois premières catégories, rien", () => {
    for (const c of CE_QUE_CHANGE_SOMMEIL.sansEffet) {
      for (const t of TYPES_ERP_A_SOMMEIL_PLAUSIBLE) {
        expect(ecart(c, t), `${c} ${t}`).toEqual({ entre: [], sort: [] });
      }
    }
  }, 60_000);

  it("l'aide parle de chaque catégorie, et pas seulement de la 5ᵉ", () => {
    expect(AIDE_LOCAUX_SOMMEIL).not.toContain("Si oui, et en 5ᵉ catégorie");
    expect(AIDE_LOCAUX_SOMMEIL).toContain("en 5ᵉ catégorie");
    expect(AIDE_LOCAUX_SOMMEIL).toContain("en 4ᵉ catégorie, un établissement d'enseignement (type R)");
    expect(AIDE_LOCAUX_SOMMEIL).toContain("Dans les trois premières catégories, la réponse ne change pas votre calendrier.");
  });
});
