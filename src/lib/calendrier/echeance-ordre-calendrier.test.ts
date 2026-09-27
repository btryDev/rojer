//
// Cas NON couverts par la table de vérité au 2026-09-27 (lot 2, m34) :
//  - l'ordre titre > ponctuel (la table ne croise le titre qu'avec des cycliques) ;
//  - l'ordre à TROIS faits : rapport propre > héritage > mise en service ;
//  - la règle 4 (mise en service + premier pas) sur un 29 février en ANNUEL et
//    sur une fin de mois en trimestriel (la table n'a que 29/02 + 4 ans et
//    31/01 + 1 mois) ;
//  - la règle 4 à travers le passage à l'heure d'été, à l'instant exact.
//
// Éprouvé en cassant (2026-09-28) : le titre qui cède sur un ponctuel soldé,
// l'héritage lu avant le rapport, l'écrêtage de fin de mois retiré
// d'`ajouterMois`, un pas de six mois ajouté en UTC — chaque fois rouge. Sous
// la première casse, `echeance-de-ligne.test.ts` restait vert.
import { describe, expect, it } from "vitest";
import { cleJourCivil, depuisCleJourCivil as J } from "@/lib/dates";
import type { Periodicite } from "@/lib/referentiels/types-communs";
import { echeanceDeLigne, type FaitsDeLigne } from "./echeance-de-ligne";

function faits(p: Partial<FaitsDeLigne> & { periodicite?: Periodicite }): FaitsDeLigne {
  const periodicite = p.periodicite ?? "annuelle";
  return {
    periodicite,
    premierPas: p.premierPas ?? periodicite,
    dateDuTitre: null,
    realisation: null,
    realisationHeritee: null,
    miseEnService: null,
    origine: J("2026-01-01"),
    ...p,
  };
}

describe("echeanceDeLigne — ordre des règles (cas croisés non couverts)", () => {
  it("règle 1 > règle 2 : un titre prime sur un PONCTUEL soldé", () => {
    const r = echeanceDeLigne(
      faits({
        periodicite: "mise_en_service_uniquement",
        dateDuTitre: J("2027-05-01"),
        realisation: { date: J("2026-02-01"), resultat: "conforme" },
      }),
    );
    expect([cleJourCivil(r.datePrevue), r.statut, r.source]).toEqual(["2027-05-01", "planifiee", "titre"]);
  });

  it("règle 3 à trois faits : rapport propre > héritage > mise en service", () => {
    const r = echeanceDeLigne(
      faits({
        realisation: { date: J("2026-01-10"), resultat: "conforme" },
        realisationHeritee: J("2025-05-01"),
        miseEnService: J("2026-06-01"),
      }),
    );
    expect([cleJourCivil(r.datePrevue), r.source]).toEqual(["2027-01-10", "rapport"]);
    // Sans le rapport propre, l'héritage — et non la mise en service, postérieure.
    const h = echeanceDeLigne(
      faits({ realisationHeritee: J("2025-05-01"), miseEnService: J("2026-06-01") }),
    );
    expect([cleJourCivil(h.datePrevue), h.source]).toEqual(["2026-05-01", "heritage"]);
  });
});

describe("echeanceDeLigne — règle 4 et calendrier civil de Paris", () => {
  it("mise en service le 29/02/2024, ANNUELLE : première échéance le 28/02/2025", () => {
    const r = echeanceDeLigne(faits({ miseEnService: J("2024-02-29"), origine: J("2024-03-01") }));
    expect([cleJourCivil(r.datePrevue), r.statut, r.source]).toEqual(["2025-02-28", "planifiee", "mise_en_service"]);
  });

  it("mise en service le 31/03, TRIMESTRIELLE : le 30/06, pas le 01/07", () => {
    const r = echeanceDeLigne(
      faits({ periodicite: "trimestrielle", miseEnService: J("2026-03-31"), origine: J("2026-03-31") }),
    );
    expect(cleJourCivil(r.datePrevue)).toBe("2026-06-30");
  });

  it("mise en service le jour du passage à l'heure d'été : minuit de Paris six mois plus tard", () => {
    const r = echeanceDeLigne(
      faits({ periodicite: "semestrielle", miseEnService: J("2026-03-29"), origine: J("2026-03-01") }),
    );
    expect(r.datePrevue.toISOString()).toBe(J("2026-09-29").toISOString());
  });
});
