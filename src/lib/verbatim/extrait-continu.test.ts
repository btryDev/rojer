import { describe, expect, it } from "vitest";
import { ecartsDeCitation } from "./extrait-continu";
import { CITATION_GN_10 } from "@/lib/referentiels/conformite/texte-gn10";

// 2026-10-17, sous-lot C : les repères « § n. » du règlement de sécurité sont
// des repères, pas des mots — comme la numérotation « III.- » de Légifrance.
describe("le repère de paragraphe « § n. »", () => {
  it("une citation qui garde ses repères est reconnue dans son verbatim", () => {
    expect(ecartsDeCitation(CITATION_GN_10, [CITATION_GN_10])).toEqual([]);
  });

  it("effacer le repère n'ouvre pas de passe-droit : ce qui suit doit être du texte", () => {
    expect(
      ecartsDeCitation("§ 1. Le présent règlement s'applique aux établissements existants.", [
        CITATION_GN_10,
      ]),
    ).not.toEqual([]);
  });
});
