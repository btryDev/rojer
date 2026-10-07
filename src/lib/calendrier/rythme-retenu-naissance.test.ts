import { describe, expect, it } from "vitest";
import { debutDuJour } from "@/lib/dates";
import type { EquipementMatching, ObligationApplicable } from "@/lib/matching/types";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import {
  estPorteeParEquipement,
  porteurDe,
  type Obligation,
} from "@/lib/referentiels/conformite/types";
import { genererProchainesVerifications, reconcilierCalendrier } from "./generateur";

/**
 * Une ligne qui reçoit un rythme retenu naît « à planifier » (ADR-039 § 3,
 * ADR-036 règles 4 et 5) — C59 lot 3.
 *
 * Le lot 3 fait passer au calendrier des obligations qui n'y étaient pas :
 * états permanents (extincteur hors ERP, EPI) et échéances récurrentes sans
 * rythme (formation). Chez un dossier existant, la ligne est CRÉÉE à la
 * régénération suivante. La règle à tenir : aucun retard rétroactif. Un
 * extincteur mis en service en 2015 ne doit pas apparaître « en retard depuis
 * 2016 » le jour où Rojer commence à en dater la maintenance.
 *
 * Éprouvé sur TOUTES les obligations livrées qui portent un rythme retenu,
 * par le générateur PUIS le réconciliateur — pas sur une liste recopiée.
 */

const NOW = new Date("2026-10-07T09:00:00Z");
const ANCIENNE = new Date("2015-03-01T00:00:00Z");

function applicable(o: Obligation): ObligationApplicable {
  const porteur = porteurDe(o);
  const equipements: EquipementMatching[] =
    estPorteeParEquipement(o)
      ? [{ id: `eq-${o.id}`, libelle: "Appareil", categorie: o.categoriesEquipement[0], caracteristiques: null }]
      : [];
  return { obligation: o, equipementsConcernes: equipements, porteur, raisons: ["fixture"] };
}

const AVEC_RYTHME = obligationsConformite.filter(
  (o) => o.rythmeRetenu && porteurDe(o) !== "salarie",
);

describe("rythme retenu : la ligne naît à planifier, sans retard rétroactif", () => {
  it("le lot en pose (borne basse)", () => {
    expect(AVEC_RYTHME.length).toBeGreaterThan(0);
  });

  for (const o of AVEC_RYTHME) {
    it(`${o.id} : créée « à planifier » au jour du suivi, même mise en service en 2015`, () => {
      const generees = genererProchainesVerifications([applicable(o)], {
        misesEnService: new Map([[`eq-${o.id}`, ANCIENNE]]),
      });
      expect(generees).toHaveLength(1);
      expect(generees[0].periodicite).toBe(periodiciteEffective(o));

      const plan = reconcilierCalendrier([], generees, { now: NOW });
      expect(plan.aCreer).toHaveLength(1);
      const [ligne] = plan.aCreer;
      expect(ligne.statut).toBe("a_planifier");
      expect(ligne.datePrevue.getTime()).toBe(debutDuJour(NOW).getTime());
    });
  }
});
