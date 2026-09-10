// Ce que la dérive en jours faisait, cas par cas, et ce que le calendrier fait
// à sa place. Chaque cas ci-dessous a été mesuré rouge avec l'ancienne
// arithmétique avant d'être posé ici — c'est l'audit du 2026-09-09 (constat 3)
// et la contre-expertise du 2026-09-10 qui les ont établis.
//
// Les dates sont posées à minuit UTC, comme le produit les stocke
// (`new Date("AAAA-MM-JJ")`) : c'est le cas qui révèle les glissements de
// fuseau, et `lib/dates` doit rendre le même jour civil quel que soit le TZ
// du processus (garde-fuseau.test.ts).

import { describe, expect, it } from "vitest";
import { cleJourCivil } from "@/lib/dates";
import { PERIODICITES } from "@/lib/referentiels/types-communs";
import { estCyclique, prochaineEcheance } from "./periodicite";

const j = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * Le JOUR CIVIL à Paris du résultat — c'est lui qu'on compare, jamais
 * l'instant. `ajouterMois` conserve l'heure civile de Paris, donc une date
 * stockée à minuit UTC en hiver (01:00 à Paris) ressort à 01:00 à Paris en
 * été, soit 23:00 UTC la veille : l'instant a bougé d'une heure, le jour n'a
 * pas bougé. Comparer les instants ici, c'est refaire l'erreur que l'ADR-011
 * a fermée — et c'est exactement ce que la première rédaction de ce fichier
 * faisait, avant de rougir sur deux changements d'heure.
 */
const jour = (d: Date | null) => (d === null ? null : cleJourCivil(d));

describe("prochaineEcheance — les rythmes longs se comptent en calendrier", () => {
  it("annuelle : le même jour l'année suivante, même à travers un 29 février", () => {
    // 2023-03-01 + 365 j = 2024-02-29 : c'est le cas exact du constat n°3.
    expect(prochaineEcheance(j("2023-03-01"), "annuelle")).toEqual(
      j("2024-03-01"),
    );
  });

  it("quinquennale : le 1er juin reste le 1er juin, pas le 31 mai", () => {
    // 1825 j = 5 × 365, et tout intervalle de cinq ans contient un
    // 29 février : l'ancienne arithmétique dérivait TOUJOURS ici. C'est aussi
    // le cas rouge de `continuite-identite.test.ts` (branche ge4-r) : attendu
    // 2030-06-01, reçu 2030-05-31.
    expect(prochaineEcheance(j("2025-06-01"), "quinquennale")).toEqual(
      j("2030-06-01"),
    );
  });

  it("triennale : 2025-06-01 → 2028-06-01, l'autre cas rouge de ge4-r", () => {
    expect(prochaineEcheance(j("2025-06-01"), "triennale")).toEqual(
      j("2028-06-01"),
    );
  });

  it("quadriennale : dérivait toujours, et l'auditeur l'avait omise", () => {
    expect(prochaineEcheance(j("2025-12-01"), "quadriennale")).toEqual(
      j("2029-12-01"),
    );
  });

  it("décennale : deux ou trois jours de dérive avant, zéro maintenant", () => {
    expect(prochaineEcheance(j("2020-01-15"), "decennale")).toEqual(
      j("2030-01-15"),
    );
  });

  it("écrête en fin de mois plutôt que de déborder sur le mois suivant", () => {
    // 29 février + 1 an n'existe pas : 28 février, jamais 1er mars. C'est la
    // convention de `ajouterMois` (ADR-011), et c'est la lecture prudente : une
    // échéance ne recule jamais parce que le mois cible est plus court.
    expect(prochaineEcheance(j("2028-02-29"), "annuelle")).toEqual(
      j("2029-02-28"),
    );
    // 31 août + 6 mois : février n'a pas de 31.
    expect(jour(prochaineEcheance(j("2026-08-31"), "semestrielle"))).toBe(
      "2027-02-28",
    );
  });

  it("mensuelle : le même jour le mois suivant, pas trente jours plus tard", () => {
    // 30 j après le 31 janvier tombait le 2 mars, et l'écart se cumulait à
    // chaque cycle. « Tous les mois » veut dire le même jour.
    expect(prochaineEcheance(j("2026-01-31"), "mensuelle")).toEqual(
      j("2026-02-28"),
    );
    // Hiver → été : l'instant recule d'une heure, le jour est le bon.
    expect(jour(prochaineEcheance(j("2026-03-15"), "mensuelle"))).toBe(
      "2026-04-15",
    );
  });
});

describe("prochaineEcheance — les rythmes courts restent en jours, et c'est exact", () => {
  it("hebdomadaire et bimensuelle retombent le même jour de la semaine", () => {
    // Un mardi. 7 et 14 jours plus tard : un mardi. C'est la raison pour
    // laquelle `bimensuelle` vaut quatorze jours et non quinze (EL 18 § 4).
    const mardi = j("2026-09-08");
    expect(prochaineEcheance(mardi, "hebdomadaire")?.getUTCDay()).toBe(
      mardi.getUTCDay(),
    );
    expect(prochaineEcheance(mardi, "bimensuelle")?.getUTCDay()).toBe(
      mardi.getUTCDay(),
    );
  });

  it("six semaines font quarante-deux jours, comme l'arrêté le compte", () => {
    expect(prochaineEcheance(j("2026-01-01"), "six_semaines")).toEqual(
      j("2026-02-12"),
    );
  });
});

describe("prochaineEcheance — l'heure civile ne bouge pas", () => {
  it("une réalisation à minuit reste à minuit à travers un changement d'heure", () => {
    // Stockée à minuit UTC en hiver = 01:00 à Paris. Six mois plus tard, en
    // été, `ajouterMois` reconstruit 01:00 heure de Paris — soit 23:00 UTC la
    // veille. Le JOUR CIVIL à Paris est le bon : c'est lui qui compte, et
    // c'est ce que `composantesCiviles` doit rendre.
    const hiver = j("2026-01-15");
    const ete = prochaineEcheance(hiver, "semestrielle");
    expect(ete).not.toBeNull();
    const fmt = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    expect(fmt.format(ete as Date)).toBe("15/07/2026");
  });
});

describe("estCyclique", () => {
  it("les deux périodicités sans rythme ne produisent rien", () => {
    expect(estCyclique("mise_en_service_uniquement")).toBe(false);
    expect(estCyclique("autre")).toBe(false);
    expect(prochaineEcheance(j("2026-01-01"), "autre")).toBeNull();
    expect(
      prochaineEcheance(j("2026-01-01"), "mise_en_service_uniquement"),
    ).toBeNull();
  });

  it("toutes les autres en produisent un, et la table est exhaustive", () => {
    // `Record<Periodicite, …>` le garantit au compilateur ; ce test le dit
    // au lecteur, et rougit si une périodicité neuve oubliait sa valeur.
    for (const p of PERIODICITES) {
      if (p === "autre" || p === "mise_en_service_uniquement") continue;
      expect(estCyclique(p), p).toBe(true);
      expect(prochaineEcheance(j("2026-01-01"), p), p).not.toBeNull();
    }
  });
});
