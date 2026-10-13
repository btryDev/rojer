import { describe, expect, it } from "vitest";
import { CCH_CLASSEMENT_ERP_IGH } from "@/lib/referentiels/corpus/cch-classement-erp-igh";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import {
  AIDE_HABITATION,
  AIDE_IGH,
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
