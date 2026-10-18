import { describe, expect, it } from "vitest";
import { obligationsConformite } from ".";
import { CORPUS } from "@/lib/referentiels/corpus";

// Relecture de c6, 2026-10-18 : l'article 9 de l'arrêté du 21 décembre 1993
// était cité par une version close au 2008-05-01 (LEGIARTI000006679563), sous
// deux obligations et au corpus. La version en vigueur est
// LEGIARTI000054109592, contre-vérifiée le même jour (PISTE, bac à sable).
// Une obligation de portes qui cite un article du corpus cite LA MÊME version.

const idLegi = (url: string | undefined) => url?.match(/LEGIARTI\d+/)?.[0] ?? null;

const ARTICLES_CORPUS = new Map(
  CORPUS.filter((c) => c.id === "arrete-1993-12-21-portes" || c.id === "code-travail-portes").flatMap((c) =>
    c.articles.map((a) => [a.ref, idLegi(a.url)] as const),
  ),
);

describe("portes et portails : l'obligation et le corpus citent la même version (2026-10-18)", () => {
  const refs = obligationsConformite
    .filter((o) => o.domaine === "porte_portail")
    .flatMap((o) => o.referencesLegales.map((r) => ({ id: o.id, article: r.article ?? "", legi: idLegi(r.url) })))
    .filter((r) => r.legi && ARTICLES_CORPUS.get(r.article));

  it("borne basse : l'art. 9 est bien cité sous deux obligations", () => {
    expect(refs.filter((r) => r.article === "Arrêté 1993-12-21 art. 9").length).toBeGreaterThanOrEqual(2);
  });

  it("chaque LEGIARTI d'obligation est celui du corpus", () => {
    for (const r of refs) expect(r.legi, `${r.id} — ${r.article}`).toBe(ARTICLES_CORPUS.get(r.article));
  });

  it("l'art. 9 est cité par sa version en vigueur, jamais par la version close", () => {
    expect(ARTICLES_CORPUS.get("Arrêté 1993-12-21 art. 9")).toBe("LEGIARTI000054109592");
    expect(refs.some((r) => r.legi === "LEGIARTI000006679563")).toBe(false);
  });
});
