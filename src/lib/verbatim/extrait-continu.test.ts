import { describe, expect, it } from "vitest";
import { ecartsDeCitation } from "./extrait-continu";
import { CITATION_GN_10 } from "@/lib/referentiels/conformite/texte-gn10";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";

// 2026-10-17, sous-lot C : le signe « § » du règlement de sécurité ouvre une
// proposition ; son numéro se confronte au texte comme un mot (relecture de
// c6 : ~~effacer « § n. » en entier~~ laissait passer un numéro faux).
describe("le repère de paragraphe « § n. »", () => {
  it("une citation qui garde ses repères est reconnue dans son verbatim", () => {
    expect(ecartsDeCitation(CITATION_GN_10, [CITATION_GN_10])).toEqual([]);
  });

  it("un numéro de paragraphe faux est refusé (GN 10 cité en « § 2. A l'exception… »)", () => {
    expect(
      ecartsDeCitation(
        "§ 2. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants.",
        [CITATION_GN_10],
      ),
    ).not.toEqual([]);
  });

  it("un numéro de paragraphe inventé est refusé (MS 66 cité en « § 9. La temporisation… »)", () => {
    const ms66 = indexArticlesParRef().get("MS 66")?.article.citationCle ?? "";
    expect(ms66).toContain("§ 5. La temporisation");
    expect(
      ecartsDeCitation(
        "§ 9. La temporisation ne doit être admise que lorsque l'établissement dispose, pendant la présence du public, d'un personnel qualifié pour exploiter immédiatement l'alarme restreinte.",
        [ms66],
      ),
    ).not.toEqual([]);
    // Le bon numéro, lui, passe.
    expect(
      ecartsDeCitation(
        "§ 5. La temporisation ne doit être admise que lorsque l'établissement dispose, pendant la présence du public, d'un personnel qualifié pour exploiter immédiatement l'alarme restreinte.",
        [ms66],
      ),
    ).toEqual([]);
  });

  it("effacer le repère n'ouvre pas de passe-droit : ce qui suit doit être du texte", () => {
    expect(
      ecartsDeCitation("§ 1. Le présent règlement s'applique aux établissements existants.", [
        CITATION_GN_10,
      ]),
    ).not.toEqual([]);
  });
});
