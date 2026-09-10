// Ce qui entre dans la section « Vérifications en attente ou programmées » du
// REGISTRE DE SÉCURITÉ — un document remis en contrôle.
//
// Le filtre ne portait que sur le statut. Or le statut d'une ligne archivée
// reste GELÉ dans son dernier état connu (ADR-012, l'enum Prisma n'a pas de
// valeur `archivee`) : une obligation qui ne s'applique plus y était donc
// imprimée « en attente ». Le dossier de conformité du MÊME ZIP, lui, passe
// par `repartirVerifications` et l'écartait déjà — les deux documents se
// contredisaient sur la même ligne.

import { describe, expect, it } from "vitest";
import { estEnAttenteDeRapport } from "./builders";

const LE_JOUR = new Date("2026-03-01T00:00:00Z");

const ligne = (statut: string, libelleObligation: string) => ({
  statut,
  datePrevue: LE_JOUR,
  dateRealisee: null,
  libelleObligation,
});

const ACTIVE = "Vérification du désenfumage";
const ARCHIVEE = "Ne s'applique plus — Vérification du désenfumage";

describe("registre de sécurité — vérifications en attente", () => {
  it("retient les trois statuts sans rapport", () => {
    for (const statut of ["a_planifier", "planifiee", "depassee"]) {
      expect(estEnAttenteDeRapport(ligne(statut, ACTIVE)), statut).toBe(true);
    }
  });

  it("écarte une ligne dont l'obligation ne s'applique plus", () => {
    // Le statut est le MÊME que celui du cas retenu ci-dessus : c'est le
    // libellé, et lui seul, qui doit faire la différence.
    expect(
      estEnAttenteDeRapport(ligne("depassee", ARCHIVEE)),
      "une obligation éteinte était imprimée « en attente » dans un document remis en contrôle",
    ).toBe(false);
  });

  it("écarte les lignes déjà réalisées, comme avant", () => {
    expect(estEnAttenteDeRapport(ligne("realisee_conforme", ACTIVE))).toBe(
      false,
    );
  });
});
