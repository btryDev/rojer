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
import { estEnAttenteDeRapport, ligneVerif } from "./builders";
import type { VerificationListee } from "@/lib/calendrier/queries";

const LE_JOUR = new Date("2026-03-01T00:00:00Z");

const ligne = (
  statut: string,
  archiveLe: Date | null,
  periodicite: string = "annuelle",
) => ({
  statut,
  datePrevue: LE_JOUR,
  periodicite,
  archiveLe,
  // Un libellé NORMAL des deux côtés : depuis l'ADR-034 (N3) il ne porte plus
  // aucun marqueur, et c'est précisément ce que ces cas doivent éprouver.
  libelleObligation: "Vérification du désenfumage",
});

const ACTIVE = null;
const ARCHIVEE = new Date("2026-02-10T00:00:00Z");

describe("registre de sécurité — vérifications en attente", () => {
  it("retient les trois statuts sans rapport", () => {
    for (const statut of ["a_planifier", "planifiee", "depassee"]) {
      expect(estEnAttenteDeRapport(ligne(statut, ACTIVE)), statut).toBe(true);
    }
  });

  it("écarte une ligne dont l'obligation ne s'applique plus", () => {
    // Le statut est le MÊME que celui du cas retenu ci-dessus : c'est
    // `archiveLe`, et lui seul, qui doit faire la différence.
    expect(
      estEnAttenteDeRapport(ligne("depassee", ARCHIVEE)),
      "une obligation éteinte était imprimée « en attente » dans un document remis en contrôle",
    ).toBe(false);
  });

  it("écarte une ligne réalisée SANS rendez-vous suivant, et elle seule", () => {
    // Un statut réalisé ne purge que sur une obligation sans rendez-vous
    // suivant (`estVerificationRealisee`) : la mise en service faite n'attend
    // plus de rapport.
    expect(
      estEnAttenteDeRapport(
        ligne("realisee_conforme", ACTIVE, "mise_en_service_uniquement"),
      ),
    ).toBe(false);
    // LA MÊME LIGNE EN « ANNUELLE » ATTEND — c'est la rangée d'avant l'ADR-034,
    // gelée sur « réalisée » avec le rendez-vous suivant dans `datePrevue`. La
    // liste locale de statuts ouverts qui vivait ici la laissait hors du
    // tableau « en attente » du registre remis en contrôle (2026-09-13).
    expect(estEnAttenteDeRapport(ligne("realisee_conforme", ACTIVE))).toBe(true);
  });
});

describe("registre de sécurité — la ligne imprimée dit l'état du jour", () => {
  /**
   * RELECTURE DU 2026-09-13, premier bloquant. Le tableau « en attente » du
   * registre remis en contrôle imprimait la colonne STATUT brute : une rangée
   * périodique gelée sur « réalisée », échéance dépassée, sortait « Conforme ».
   * Et une ligne roulée restée « planifiée » après sa date, « Planifiée ».
   */
  const NOW = new Date("2026-08-19T10:00:00.000Z");
  const lue = (over: Record<string, unknown>) =>
    ({
      id: "v1",
      obligationId: "incendie-extincteurs-verification-annuelle",
      libelleObligation: "Vérification annuelle des extincteurs",
      periodicite: "annuelle",
      statut: "planifiee",
      datePrevue: new Date("2026-03-01T00:00:00Z"),
      archiveLe: null,
      salarieId: null,
      equipement: { libelle: "Extincteurs RDC", batiment: { id: "b1", nom: "Principal" } },
      salarie: null,
      prescription: null,
      derniereRealisation: null,
      ...over,
    }) as unknown as VerificationListee;

  it("« dépassée » sur une rangée gelée « réalisée » dont l'échéance est passée", () => {
    const l = ligneVerif(
      lue({
        statut: "realisee_conforme",
        derniereRealisation: new Date("2025-03-01T00:00:00Z"),
      }),
      false,
      NOW,
    );
    expect(l.statut).toBe("depassee");
  });

  it("« dépassée » sur une ligne roulée restée « planifiée » après sa date", () => {
    expect(ligneVerif(lue({}), false, NOW).statut).toBe("depassee");
  });
});
