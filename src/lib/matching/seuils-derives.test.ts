//
// Bornes de chaque seuil, DÉRIVÉES du référentiel (aucune liste recopiée) :
// effectifMin/effectifMax à la maille écrite, personnesPresentesMin ; puis
// l'anomalie A1 du lot 2 (maillon 3), corrigée le 2026-09-27 (`Math.max` de
// `evaluerPersonnesPresentes`) et tenue ici. ~~L'anomalie A2 (deux VGP de
// levage sur le silence) n'est pas tenue : elle attend la décision D7
// (`docs/revues/decisions-a-prendre-2026-09-27.md`).~~ [2026-09-28 : D7
// tranchée, A2 tenue par `levage-un-rythme.test.ts`, sur les 27 combinaisons.]
//
// Éprouvé en cassant (2026-09-28) : `n < effectifMin` devenu `<=` (engine.ts)
// et le total ramené au seul nombre déclaré (personnes-presentes.ts) — rouge.
import { describe, expect, it } from "vitest";
import { matchTypologie } from "./engine";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import type { EtablissementMatching } from "./types";

const etab = (p: Partial<EtablissementMatching> = {}): EtablissementMatching => ({
  id: "e", effectifSurSite: 10, effectifEntreprise: 10, estEtablissementTravail: true,
  estERP: false, estIGH: false, estHabitation: false, typeErp: null, categorieErp: null,
  classeIgh: null, familleHabitation: null, personnesPresentesHabituellement: null,
  manipuleMatieresR422722: false, comporteLocauxSommeilPublic: null, chiffonsImpregnes: null, ...p,
});
const ok = (id: string, e: EtablissementMatching) => {
  const o = obligationsConformite.find((x) => x.id === id)!;
  return matchTypologie(o.typologies, e);
};

const aSeuil = obligationsConformite.filter(
  (o) => o.typologies.effectifMin !== undefined || o.typologies.effectifMax !== undefined,
);
const aPersonnes = obligationsConformite.filter((o) => o.typologies.personnesPresentesMin !== undefined);

describe("seuils d'effectif, bornes dérivées du référentiel", () => {
  it("borne basse : il y a des seuils à éprouver", () => {
    expect(aSeuil.length).toBeGreaterThan(0);
    expect(aPersonnes.length).toBeGreaterThan(0);
  });

  it.each(aSeuil.map((o) => [o.id, o.typologies] as const))("%s", (id, t) => {
    const ent = t.effectifMaille === "entreprise";
    const n = (v: number) => etab(ent ? { effectifEntreprise: v, effectifSurSite: 0 } : { effectifSurSite: v, effectifEntreprise: 0 });
    if (t.effectifMin !== undefined) {
      expect(ok(id, n(t.effectifMin - 1)).ok, "seuil − 1").toBe(false);
      expect(ok(id, n(t.effectifMin)).ok, "seuil").toBe(true);
      expect(ok(id, n(t.effectifMin + 1)).ok, "seuil + 1").toBe(true);
      if (ent) {
        const s = t.effectifMin;
        const r = ok(id, etab({ effectifEntreprise: s - 1, effectifSurSite: s }));
        expect(r.ok && r.effectifAConfirmer !== undefined, "entreprise sous, site au seuil : à confirmer").toBe(true);
        const r2 = ok(id, etab({ effectifEntreprise: s, effectifSurSite: s - 1 }));
        expect(r2.ok && r2.effectifAConfirmer === undefined, "entreprise au seuil, site sous : dû").toBe(true);
      }
    }
    if (t.effectifMax !== undefined) {
      expect(ok(id, n(t.effectifMax)).ok, "max").toBe(true);
      expect(ok(id, n(t.effectifMax + 1)).ok, "max + 1").toBe(false);
    }
  });

  it.each(aPersonnes.map((o) => [o.id, o.typologies] as const))("personnes présentes — %s", (id, t) => {
    const p = t.personnesPresentesMin!;
    const e = (v: number) => etab({ effectifSurSite: 1, personnesPresentesHabituellement: v, manipuleMatieresR422722: false });
    const dansLeChamp = t.horsChampR422734 !== true;
    expect(ok(id, e(p - 1)).ok, "seuil − 1").toBe(!dansLeChamp);
    expect(ok(id, e(p)).ok, "seuil").toBe(dansLeChamp);
  });
});

describe("anomalie A1 du 2026-09-27, corrigée", () => {
  it("A1 — un nombre de personnes déclaré SOUS l'effectif du site ne retire pas le champ de R. 4227-34", () => {
    const e = etab({ effectifSurSite: 60, effectifEntreprise: 60, personnesPresentesHabituellement: 40 });
    for (const o of aPersonnes.filter((o) => o.typologies.horsChampR422734 !== true)) {
      expect(ok(o.id, e).ok, o.id).toBe(true);
    }
  });
});
