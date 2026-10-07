import { describe, expect, it } from "vitest";
import { obligationsConformite, obligationParId } from "../conformite";
import { referencesCitees } from "../conformite/rythme-retenu";
import type { Obligation } from "../conformite/types";
import { CORPUS, indexArticlesParRef, liensNormesRompus } from "./index";
import { NORMES } from "./normes";
import type { Corpus } from "./types";

/**
 * Le corpus des normes et la source `NORME` (ADR-039).
 *
 * Une norme peut désormais donner un rythme. Ce qui la garde de passer pour du
 * droit tient en trois contrôles : elle est rangée sous sa source, elle a été
 * lue et entrée ici, et le lien entre elle et les obligations qui la citent
 * tient dans les deux sens. Chaque garde est éprouvée sur une copie mutée.
 */

/** Une obligation fabriquée qui retient le rythme de NF S 61-919. */
function avecNorme(): Obligation {
  const base = obligationParId("incendie-travail-extincteurs-dotation")!;
  return {
    ...base,
    id: "fixture-extincteurs-maintenance-norme",
    rythmeRetenu: {
      motif: "norme",
      periodicite: "annuelle",
      norme: "NF S 61-919",
      reference: {
        source: "NORME",
        reference: "NF S 61-919 (août 2001), § 5.1.1",
        article: "NF S 61-919 § 5.1.1",
      },
    },
  } as Obligation;
}

describe("corpus des normes (ADR-039)", () => {
  it("toute référence NORME désigne une entrée `norme` de ce corpus", () => {
    const index = indexArticlesParRef();
    const fautives: string[] = [];
    for (const o of obligationsConformite) {
      for (const r of referencesCitees(o)) {
        if (r.source !== "NORME") continue;
        const e = r.article ? index.get(r.article) : undefined;
        if (!e || e.corpusId !== NORMES.id || e.article.statut !== "norme") {
          fautives.push(`${o.id} → ${r.article ?? "(sans clé)"}`);
        }
      }
    }
    expect(fautives).toEqual([]);
  });

  it("le corpus ne porte que des normes, lues, sans adresse d'article, et dit pourquoi", () => {
    for (const a of NORMES.articles) {
      expect(a.ref, a.ref).toMatch(/^(NF|EN|ISO)\s/);
      expect(a.statut, a.ref).toBe("norme");
      // Une norme n'a pas d'adresse d'article ; une URL Légifrance ici la ferait
      // lire comme du droit.
      expect(a.url, a.ref).toBeUndefined();
      expect(a.luLe, a.ref).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.lecture, a.ref).toBeDefined();
      if (a.statut === "norme") expect(a.motif.length, a.ref).toBeGreaterThan(20);
    }
  });

  it("aucune norme n'est rangée dans un autre corpus, ni un autre statut dans celui-ci", () => {
    for (const c of CORPUS) {
      for (const a of c.articles) {
        if (a.statut === "norme") expect(c.id, a.ref).toBe(NORMES.id);
      }
    }
  });

  it("NF S 61-919 porte le rythme annuel lu au § 5.1.1, et NF C 18-510 n'est pas lue", () => {
    // Deux constats à ne pas perdre : le premier est le seul chiffre que la
    // norme écrive pour la maintenance ; le second empêche qu'on lui prête un
    // triennal qu'aucun relevé n'a vu.
    const s = NORMES.articles.find((a) => a.ref === "NF S 61-919 § 5.1.1")!;
    expect(s.citationCle).toContain(
      "La personne compétente doit effectuer tous les ans, avec une tolérance de plus ou moins deux mois, la maintenance",
    );
    const c = NORMES.articles.find((a) => a.ref === "NF C 18-510")!;
    expect(c.lecture).toBe("indirect");
    expect(c.citationCle).toBeUndefined();
  });

  it("le lien norme ↔ obligation tient dans les deux sens", () => {
    expect(liensNormesRompus()).toEqual([]);
  });

  it("les deux sens sont gardés : chacun rougit sur une copie mutée", () => {
    // Sens 1 : une obligation cite la norme, l'entrée ne la nomme pas.
    const o = avecNorme();
    const sens1 = liensNormesRompus(CORPUS, [...obligationsConformite, o]);
    expect(sens1.map((r) => r.obligation)).toContain(o.id);

    // Sens 2 : l'entrée nomme une obligation qui ne la cite pas.
    const corpusMute: Corpus[] = CORPUS.map((c) =>
      c.id !== NORMES.id
        ? c
        : {
            ...c,
            articles: c.articles.map((a) =>
              a.ref === "NF S 61-919 § 5.1.1" && a.statut === "norme"
                ? { ...a, obligations: ["incendie-travail-extincteurs-dotation"] }
                : a,
            ),
          },
    );
    const sens2 = liensNormesRompus(corpusMute, obligationsConformite);
    expect(sens2.map((r) => r.obligation)).toContain(
      "incendie-travail-extincteurs-dotation",
    );

    // Et les deux réunis ferment la boucle. L'entrée garde les obligations
    // livrées qui la citent (depuis le lot 3, C55) et nomme la fixture en plus.
    expect(
      liensNormesRompus(
        CORPUS.map((c) =>
          c.id !== NORMES.id
            ? c
            : {
                ...c,
                articles: c.articles.map((a) =>
                  a.ref === "NF S 61-919 § 5.1.1" && a.statut === "norme"
                    ? { ...a, obligations: [...a.obligations, o.id] }
                    : a,
                ),
              },
        ),
        [...obligationsConformite, o],
      ),
    ).toEqual([]);
  });
});
