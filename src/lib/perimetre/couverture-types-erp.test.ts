import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import { NOM_TYPE_ERP_PLURIEL, TYPES_ERP_DISPOSITIONS_PARTICULIERES } from "./couverture";

// La phrase de l'axe `categorie_erp` nomme les types dont Rojer porte des
// dispositions particulières (sous-lot D, 2026-10-17). La liste est écrite
// dans `couverture.ts`, module pur ; ce test la DÉRIVE du référentiel : un
// type est servi si une ligne suivie, bornée à ce type, cite un article de
// son chapitre (« N 17 », « P 21 »…).

const CHAPITRE = /^([A-Z]+) \d/;

function typesDerives(obligations = obligationsConformite): string[] {
  const servis = new Set<string>();
  for (const o of obligations) {
    if (estNiveauAudit(o)) continue;
    const erp = o.typologies.erp;
    if (typeof erp !== "object" || !erp.types) continue;
    for (const r of o.referencesLegales) {
      const t = CHAPITRE.exec(r.article ?? "")?.[1];
      if (t && (erp.types as readonly string[]).includes(t)) servis.add(t);
    }
  }
  return [...servis].sort();
}

describe("axe categorie_erp — les types nommés sont ceux que le référentiel sert", () => {
  it("la liste de la phrase est celle que le référentiel donne", () => {
    expect([...TYPES_ERP_DISPOSITIONS_PARTICULIERES].sort()).toEqual(typesDerives());
  });

  it("chaque type nommé a son nom au pluriel", () => {
    expect(TYPES_ERP_DISPOSITIONS_PARTICULIERES.filter((t) => !NOM_TYPE_ERP_PLURIEL[t])).toEqual([]);
  });

  it("borne basse : P, S, T, X et Y servis depuis le sous-lot D", () => {
    expect(typesDerives()).toEqual(expect.arrayContaining(["M", "N", "O", "W", "P", "S", "T", "X", "Y"]));
  });

  it("cassure : une ligne qui perd un type le fait sortir de la dérivation", () => {
    const sansY = obligationsConformite.map((o) =>
      o.id === "incendie-erp-personnel-designe-moyens-secours" && typeof o.typologies.erp === "object"
        ? { ...o, typologies: { ...o.typologies, erp: { ...o.typologies.erp, types: (o.typologies.erp.types ?? []).filter((t) => t !== "Y") } } }
        : o,
    );
    expect(typesDerives(sansY)).not.toContain("Y");
    expect([...TYPES_ERP_DISPOSITIONS_PARTICULIERES].sort()).not.toEqual(typesDerives(sansY));
  });
});
