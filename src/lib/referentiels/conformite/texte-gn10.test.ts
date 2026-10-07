// La phrase de `texte-gn10.ts` est lue par six descriptions. Si elle s'écarte
// du texte, les six s'en écartent ensemble : ce test la confronte au verbatim
// que le corpus consigne pour GN 10.

import { describe, expect, it } from "vitest";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import { CITATION_GN_10, DESCRIPTION_GN_10 } from "./texte-gn10";

describe("GN 10 écrit une fois, et dans ses mots", () => {
  it("la citation est celle du corpus, mot pour mot", () => {
    const verbatim = indexArticlesParRef().get("GN 10")?.article.citationCle ?? "";
    expect(verbatim.length).toBeGreaterThan(200);
    expect(CITATION_GN_10).toBe(verbatim);
  });

  it("la phrase de description la cite entre guillemets, entière", () => {
    expect(DESCRIPTION_GN_10).toContain(`« ${CITATION_GN_10} »`);
  });
});
