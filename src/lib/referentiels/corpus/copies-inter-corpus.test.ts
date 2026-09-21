import { describe, expect, it } from "vitest";
import { CORPUS } from "./index";

/**
 * UN MÊME ARTICLE DANS DEUX CORPUS NE PEUT PAS DIRE DEUX CHOSES (2026-09-21).
 *
 * La duplication inter-corpus est prévue et bornée : un article peut être
 * repris dans un second corpus pour que celui-ci puisse se déclarer
 * `integral` (`R. 4121-4`), ou parce que deux domaines s'y adossent
 * (`L. 4711-5`, `R. 4226-19`). `corpus.test.ts` exige que les copies portent
 * le même STATUT. Rien n'exigeait qu'elles portent la même VERSION ni le même
 * VERBATIM : le jour où la veille met à jour une copie et pas l'autre, le
 * dépôt affirme deux versions d'un même texte sans que rien ne rougisse.
 *
 * C'est une déformation silencieuse, la pire espèce pour un produit dont la
 * base est l'exactitude des textes. Ce test la rend bruyante.
 */

type Copie = { corpus: string; version?: string; citation?: string };

const parRef = new Map<string, Copie[]>();
for (const c of CORPUS)
  for (const a of c.articles) {
    const l = parRef.get(a.ref) ?? [];
    l.push({ corpus: c.id, version: a.versionEnVigueur, citation: a.citationCle });
    parRef.set(a.ref, l);
  }
const dupliques = [...parRef.entries()].filter(([, l]) => l.length > 1);

describe("un article repris dans plusieurs corpus", () => {
  it("n'apparaît jamais deux fois dans le MÊME corpus", () => {
    const doubles: string[] = [];
    for (const c of CORPUS) {
      const vus = new Set<string>();
      for (const a of c.articles) {
        if (vus.has(a.ref)) doubles.push(`${c.id} · ${a.ref}`);
        vus.add(a.ref);
      }
    }
    expect(doubles).toEqual([]);
  });

  it("porte la même version en vigueur dans chacune de ses copies", () => {
    const divergents = dupliques
      .filter(([, l]) => new Set(l.map((x) => x.version)).size > 1)
      .map(([ref, l]) => `${ref} : ${l.map((x) => `${x.corpus}=${x.version}`).join(" / ")}`);
    expect(divergents).toEqual([]);
  });

  it("porte le même verbatim partout où il en porte un", () => {
    // Une copie de rappel peut n'avoir AUCUNE citation — c'est le cas voulu de
    // `R. 4121-4` dans `code-travail-duerp`, qui renvoie au dépouillement
    // d'origine. Deux citations DIFFÉRENTES, en revanche, sont deux textes.
    const divergents = dupliques
      .filter(([, l]) => new Set(l.map((x) => x.citation).filter(Boolean)).size > 1)
      .map(([ref]) => ref);
    expect(divergents).toEqual([]);
  });

  it("la garde regarde quelque chose : il existe des articles dupliqués", () => {
    // Sans ce plancher, un `CORPUS` vide ou une clé mal lue rendrait les trois
    // tests précédents verts en ne comparant rien.
    expect(dupliques.map(([ref]) => ref).sort()).toEqual(
      expect.arrayContaining(["L. 4711-5", "R. 4121-4", "R. 4226-19"]),
    );
  });
});
