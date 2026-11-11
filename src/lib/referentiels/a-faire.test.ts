// Les ajouts d'un « oui » (ADR-060), par invariant : chaque activité de
// chaque secteur, sans liste recopiée.
import { describe, expect, it } from "vitest";
import { questionsDetectionTransverses, referentielsSectoriels } from "./index";

const cas = referentielsSectoriels.flatMap((ref) =>
  ref.activitesNonCouvertes.map((a) => [`${ref.id} / ${a.id}`, ref, a] as const),
);

describe("activités hors référentiel — ce qu'un « oui » ajoute", () => {
  it("il y a des activités à vérifier", () => {
    expect(cas.length).toBeGreaterThan(0);
  });

  it.each(cas)("%s : l'unité existante est une unité type du même secteur", (_, ref, a) => {
    expect(ref.unitesTravailSuggerees.map((u) => u.id)).toContain(a.aFaire.uniteExistante);
  });

  it.each(cas)("%s : deux à quatre risques, distincts et non vides", (_, __, a) => {
    const r = a.aFaire.risques;
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r.length).toBeLessThanOrEqual(4);
    expect(new Set(r).size).toBe(r.length);
    for (const l of r) expect(l.trim()).toBe(l), expect(l.length).toBeGreaterThan(0);
  });

  it.each(cas)("%s : les questions transverses existent", (_, __, a) => {
    const ids = new Set(questionsDetectionTransverses.map((q) => q.id));
    for (const q of a.aFaire.questionsTransverses ?? []) expect(ids).toContain(q);
  });

  it.each(cas)("%s : l'unité dédiée tient dans un nom d'unité (100 caractères)", (_, ref, a) => {
    const d = a.aFaire.uniteDediee;
    if (!d) return;
    expect(d.nom.length).toBeLessThanOrEqual(100);
    expect(d.description.length).toBeLessThanOrEqual(300);
    // Pas un doublon d'une unité type : elle serait recréée sous le même nom.
    expect(ref.unitesTravailSuggerees.map((u) => u.nom.toLowerCase())).not.toContain(d.nom.toLowerCase());
  });
});
