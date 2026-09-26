// Les phrases de `textes-duerp.ts` sont montrées comme le texte : elles le
// sont, mot pour mot, ou ce test rougit.

import { describe, expect, it } from "vitest";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import {
  ANNEXE_EXPOSITION_DONNEES,
  RENOUVELLEMENT_MESURAGE_BRUIT,
  TRANSMISSION_DUERP_SPST,
} from "./textes-duerp";

const cle = (ref: string) => indexArticlesParRef().get(ref)?.article.citationCle ?? "";

describe("textes du document unique, dans leurs mots", () => {
  it.each([
    ["L. 4121-3-1", TRANSMISSION_DUERP_SPST],
    ["R. 4121-1-1", ANNEXE_EXPOSITION_DONNEES],
    ["R. 4433-2", RENOUVELLEMENT_MESURAGE_BRUIT],
  ])("%s : mot pour mot dans le verbatim du corpus", (ref, texte) => {
    expect(cle(ref).length).toBeGreaterThan(50);
    expect(cle(ref)).toContain(texte);
  });

  // Les référentiels sectoriels écrivent la phrase en littéral : ce test les
  // oblige à rester égaux à la constante.
  it("les trois risques bruit citent le renouvellement du mesurage mot pour mot", async () => {
    const { restauration } = await import("@/lib/referentiels/restauration");
    const { commerce } = await import("@/lib/referentiels/commerce");
    const { bureau } = await import("@/lib/referentiels/bureau");
    const risques = [restauration, commerce, bureau]
      .flatMap((r) => r.risques)
      .filter((r) => ["resto-bruit", "com-bruit", "bur-bruit-openspace"].includes(r.id));
    expect(risques).toHaveLength(3);
    for (const r of risques) expect(r.description).toContain(`« ${RENOUVELLEMENT_MESURAGE_BRUIT} »`);
  });
});
