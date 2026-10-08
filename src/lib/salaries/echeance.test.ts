import { describe, expect, it } from "vitest";
import { echeanceDuTitre } from "./echeance";
import { classerTitre, etatDuTitre } from "./queries";
import { titreParId } from "./catalogue";
import {
  genererVerificationsDepuisTitres,
  reconcilierCalendrier,
} from "@/lib/calendrier/generateur";
import { estVerificationEnRetard } from "@/lib/dates/retard";
import type { Obligation } from "@/lib/referentiels/conformite";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";

/**
 * Une seule échéance pour un titre, et les deux lecteurs d'accord sur elle.
 *
 * Le défaut que ce fichier ferme (relecture système du 2026-09-14) : le
 * générateur écrivait `echeanceLe ?? delivreLe + périodicité`, l'écran Équipe
 * classait sur `echeanceLe` seul. Tester `echeanceDuTitre` isolément ne suffit
 * pas à le garder fermé — la divergence tenait à ce qu'un lecteur ne l'appelait
 * pas. Chaque cas ci-dessous interroge donc AUSSI le générateur et le
 * classement de l'écran, et exige qu'ils disent la même date.
 *
 * Les obligations sont celles du référentiel livré, pas des fixtures : si la
 * VIP cessait d'être quinquennale ou l'habilitation d'être sans durée, le cas
 * ne prouverait plus ce qu'il annonce, et l'assertion de garde le dit.
 */

const VIP = titreParId("sante-travail-salarie-vip");
const HABILITATION = titreParId("elec-salarie-habilitation");
// Le titre SANS durée, depuis que l'habilitation a reçu la sienne (C66,
// 2026-10-08 : triennale, relevée par le préventeur, ADR-039 § 8).
// L'autorisation de conduite : R. 4323-56 n'écrit aucune durée.
const SANS_DUREE_ID = "conduite-salarie-autorisation";
const SANS_DUREE = titreParId(SANS_DUREE_ID);

/** Dates civiles à midi UTC, comme `titreSchema` les écrit. */
const civile = (jour: string) => new Date(`${jour}T12:00:00.000Z`);

/**
 * La ligne que le calendrier CRÉE pour un titre unique, avec le référentiel
 * réel : le générateur la décrit, le réconciliateur la date par
 * `echeanceDeLigne` (ADR-036 — le générateur ne date plus rien).
 */
function ligneDuCalendrier(
  obligationId: string,
  titre: { delivreLe: Date; echeanceLe: Date | null },
) {
  const decrites = genererVerificationsDepuisTitres(
    new Map([
      [obligationId, [{ salarieId: "sal-1", libelle: "Claire Martin", ...titre }]],
    ]),
    (id) => titreParId(id) as Obligation | undefined,
  );
  return reconcilierCalendrier([], decrites, {
    now: new Date("2026-09-14T10:00:00+02:00"),
  }).aCreer;
}

describe("garde : le référentiel porte encore les deux cas", () => {
  it("la VIP est quinquennale, l'autorisation de conduite sans durée, l'habilitation triennale retenue", () => {
    expect(VIP?.periodicite, "la VIP a changé de rythme : relire ce fichier").toBe(
      "quinquennale",
    );
    // ~~l'habilitation sans durée écrite~~ — 2026-10-08 (C66) : le TEXTE
    // reste sans durée, le rythme retenu est triennal.
    expect(HABILITATION?.periodicite).toBe("autre");
    expect(HABILITATION && periodiciteEffective(HABILITATION)).toBe("triennale");
    expect(
      SANS_DUREE && periodiciteEffective(SANS_DUREE),
      "l'autorisation de conduite a reçu une durée : relire le cas « pas de périodicité »",
    ).toBe("autre");
  });
});

describe("le scénario de la relecture : une VIP délivrée le 1er juin 2020, sans date de fin", () => {
  const titre = { delivreLe: civile("2020-06-01"), echeanceLe: null };
  const NOW = new Date("2026-09-14T10:00:00+02:00");

  it("son échéance est le 1er juin 2025 — cinq ans calendaires, pas 1 825 jours", () => {
    expect(echeanceDuTitre(titre, VIP?.periodicite)).toEqual(civile("2025-06-01"));
  });

  it("le classement de l'écran Équipe la dit en retard, comme le calendrier", () => {
    // Le cœur du défaut : `classerTitre(null)` rendait « à planifier », et la
    // fiche peignait « Sans terme écrit » une visite échue depuis quinze mois.
    expect(classerTitre(titre, VIP?.periodicite, NOW)).toBe("enRetard");

    const lignes = ligneDuCalendrier("sante-travail-salarie-vip", titre);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].datePrevue).toEqual(echeanceDuTitre(titre, VIP?.periodicite));
    expect(estVerificationEnRetard({ ...lignes[0], archiveLe: null, graceJusquAu: null }, NOW)).toBe(true);
  });

  it("le jour de l'échéance, ni l'un ni l'autre ne la dit en retard (ADR-011)", () => {
    // Le 1er juin 2025 à 22 h à Paris — soit 20 h UTC, APRÈS l'échéance
    // stockée à minuit UTC. À 8 h (6 h UTC), une comparaison d'instants bruts
    // disait aussi « pas en retard », et la mutation que ce test vise survivait
    // (relecture du lot, 2026-09-14). Le soir, seul le jour civil la sauve.
    const leJourMeme = new Date("2025-06-01T22:00:00+02:00");
    expect(classerTitre(titre, VIP?.periodicite, leJourMeme)).toBe("proche");
    const [ligne] = ligneDuCalendrier("sante-travail-salarie-vip", titre);
    expect(estVerificationEnRetard({ ...ligne, archiveLe: null, graceJusquAu: null }, leJourMeme)).toBe(false);
  });
});

describe("l'échéance saisie prime sur le calcul", () => {
  // Le médecin du travail a fixé trois ans : la pièce dit 1er juin 2023, le
  // plafond du texte dirait 2025. Le 1er janvier 2024, la saisie est échue et
  // le calcul lointain — c'est ce qui rend le cas discriminant.
  const titre = { delivreLe: civile("2020-06-01"), echeanceLe: civile("2023-06-01") };
  const NOW = new Date("2024-01-01T10:00:00+01:00");

  it("la date de la pièce est l'échéance, même plus tôt que le plafond", () => {
    expect(echeanceDuTitre(titre, VIP?.periodicite)).toEqual(civile("2023-06-01"));
    expect(classerTitre(titre, VIP?.periodicite, NOW)).toBe("enRetard");
    expect(
      ligneDuCalendrier("sante-travail-salarie-vip", titre)[0].datePrevue,
    ).toEqual(civile("2023-06-01"));
  });

  it("et reste l'échéance quand l'obligation ne résout plus au référentiel", () => {
    // Un titre déclaré sur une obligation retirée : la pièce n'a pas changé
    // parce que le catalogue a changé — sa date reste sa date.
    //
    // L'ÉTAT, LUI, SUIT LE CALENDRIER DEPUIS LE 2026-09-15. Le générateur ne
    // produit aucune ligne pour une obligation qu'il ne connaît plus ; la page
    // Équipe disait pourtant la pièce « échéance déclarée dépassée », et le
    // badge du rail la comptait. Ce n'est pas une incertitude : le retrait
    // d'une obligation est une décision du référentiel. Le titre se lit
    // « Ne s'applique plus », comme la ligne archivée du calendrier.
    expect(echeanceDuTitre(titre, undefined)).toEqual(civile("2023-06-01"));
    expect(etatDuTitre(titre, undefined, true, NOW)).toBe("archivee");
    expect(etatDuTitre(titre, VIP, true, NOW)).toBe("enRetard");
  });
});

describe("pas de périodicité, pas d'échéance", () => {
  const titre = { delivreLe: civile("2020-06-01"), echeanceLe: null };
  const NOW = new Date("2026-09-14T10:00:00+02:00");

  it("un titre sans durée ni date de fin n'a pas de rendez-vous", () => {
    // ~~L'habilitation électrique~~ (jusqu'au 2026-10-08, C66) : l'exemple
    // passe à l'autorisation de conduite, dont R. 4323-56 n'écrit aucune
    // durée — un rouge ici serait une non-conformité inventée.
    const p = SANS_DUREE && periodiciteEffective(SANS_DUREE);
    expect(echeanceDuTitre(titre, p)).toBeNull();
    expect(classerTitre(titre, p, NOW)).toBe("aPlanifier");
    expect(ligneDuCalendrier(SANS_DUREE_ID, titre)).toEqual([]);
  });

  it("une mise en service seule n'en produit pas davantage", () => {
    expect(echeanceDuTitre(titre, "mise_en_service_uniquement")).toBeNull();
  });

  it("une obligation introuvable ne fait rien inventer", () => {
    expect(echeanceDuTitre(titre, undefined)).toBeNull();
    expect(classerTitre(titre, undefined, NOW)).toBe("aPlanifier");
  });
});

/**
 * L'EFFET SUR LES TITRES D'HABILITATION EXISTANTS (C66, 2026-10-08). Le rythme
 * triennal relevé par le préventeur (ADR-039 § 8) donne une échéance à tout
 * titre sans date de fin : délivrance + 3 ans. Un titre délivré il y a plus de
 * trois ans passe EN RETARD à la passe suivante, sans délai de grâce : la
 * grâce de l'ADR-040 ne vaut que pour une ligne née « à planifier », et la
 * ligne d'un titre naît datée (`sources.dateDuTitre`, règle 1). Une date de
 * fin saisie prime, comme avant.
 */
describe("habilitation électrique : délivrance + 3 ans (C66)", () => {
  const NOW = new Date("2026-10-08T10:00:00+02:00");

  it("délivrée le 1er juin 2020 sans date de fin : échéance le 1er juin 2023, en retard, sans grâce", () => {
    const titre = { delivreLe: civile("2020-06-01"), echeanceLe: null };
    const p = HABILITATION && periodiciteEffective(HABILITATION);
    expect(echeanceDuTitre(titre, p)).toEqual(civile("2023-06-01"));
    expect(classerTitre(titre, p, NOW)).toBe("enRetard");
    const [ligne] = ligneDuCalendrier("elec-salarie-habilitation", titre);
    expect(ligne.datePrevue).toEqual(civile("2023-06-01"));
    expect(ligne.statut).toBe("planifiee");
    expect(estVerificationEnRetard({ ...ligne, archiveLe: null, graceJusquAu: null }, NOW)).toBe(true);
  });

  it("délivrée le 1er décembre 2023 : échéance le 1er décembre 2026, pas encore due", () => {
    const titre = { delivreLe: civile("2023-12-01"), echeanceLe: null };
    const p = HABILITATION && periodiciteEffective(HABILITATION);
    expect(echeanceDuTitre(titre, p)).toEqual(civile("2026-12-01"));
    expect(classerTitre(titre, p, NOW)).not.toBe("enRetard");
  });

  it("une date de fin saisie prime sur les 3 ans", () => {
    const titre = { delivreLe: civile("2020-06-01"), echeanceLe: civile("2027-01-01") };
    const p = HABILITATION && periodiciteEffective(HABILITATION);
    expect(echeanceDuTitre(titre, p)).toEqual(civile("2027-01-01"));
  });
});
