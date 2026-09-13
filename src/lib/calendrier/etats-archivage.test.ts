// L'état d'une ligne de suivi, quand elle est éteinte ou consommée.
//
// Ces cas vivent dans leur propre fichier plutôt qu'à la suite d'`etats.test`
// parce qu'ils gardent des correctifs nommés — le lot 3 du § 11, puis l'ADR-034.
//
// CE QUI A CHANGÉ AU N4. Ce fichier éprouvait `etatDuRendezVous`, qui
// distinguait l'état d'une LIGNE de celui de sa DATE : une rangée soldée disait
// « fait le 22/01/2026 » et « prochaine le 22/01/2027 », et la fiche peignait la
// seconde date de l'état de la première — une tuile verte « faite » sur une
// échéance à venir. La fonction n'existe plus : une ligne ne porte qu'une date
// depuis que le dépôt la fait rouler, donc l'état de la ligne EST celui de sa
// date. Les garanties qui survivent sont ici, portées par `classerVerification`.

import { describe, expect, it } from "vitest";
import { classerVerification } from "./etats";

const NOW = new Date("2026-08-19T10:00:00.000Z");
const jours = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

/**
 * L'archivage est une DATE depuis l'ADR-034 (N3), plus un préfixe de libellé :
 * le jour où l'obligation a cessé de s'appliquer à cette ligne. Le libellé des
 * fixtures archivées est donc NORMAL — c'est le champ, et lui seul, qui archive.
 */
const ARCHIVE_LE = new Date("2026-07-01T00:00:00.000Z");

/** Une ligne ROULÉE par un dépôt : elle ne porte que son échéance ouverte. */
const roulee = {
  statut: "planifiee",
  archiveLe: null,
  datePrevue: jours(120),
  libelleObligation: "Vérification périodique",
  periodicite: "annuelle",
};

/** La rangée SOLDÉE d'avant l'ADR-034 : statut du contrôle passé, rendez-vous
 *  suivant dans `datePrevue`. Toutes les lignes existantes sont de ce modèle
 *  tant qu'une migration ne les a pas remises au nouveau. */
const soldee = {
  statut: "realisee_conforme",
  archiveLe: null,
  datePrevue: jours(120),
  libelleObligation: "Vérification périodique",
  periodicite: "annuelle",
};

describe("l'état d'une ligne roulée est celui de sa date", () => {
  it("ne peint pas « faite » une échéance à venir — sur la rangée SOLDÉE", () => {
    // LE DÉFAUT D'ORIGINE, sur la fixture d'origine. Le N4 avait remplacé
    // `soldee` par `roulee` ici, et le test ne pouvait plus échouer pour la
    // raison qu'il nomme : une ligne « planifiée » se classe par sa date par
    // construction. C'est la rangée qui porte un statut RÉALISÉ et une date à
    // venir que toute surface peignait en vert un an trop tôt — et depuis les
    // corrections du 2026-09-13, c'est `estVerificationRealisee` qui l'en
    // empêche : sur une obligation périodique, la date décide.
    expect(classerVerification(soldee, NOW)).toBe("lointain");
    // Et la ligne roulée, évidemment.
    expect(classerVerification(roulee, NOW)).toBe("lointain");
  });

  it("suit la fenêtre à l'approche, et le retard quand la date est passée", () => {
    expect(classerVerification({ ...roulee, datePrevue: jours(10) }, NOW)).toBe(
      "proche",
    );
    expect(classerVerification({ ...roulee, datePrevue: jours(-10) }, NOW)).toBe(
      "enRetard",
    );
  });

  it("une ligne sans rendez-vous arrêté se range à part, pas en retard", () => {
    expect(
      classerVerification(
        { ...roulee, statut: "a_planifier", datePrevue: jours(10) },
        NOW,
      ),
    ).toBe("aPlanifier");
  });
});

describe("ce qui ne réclame plus rien", () => {
  it("un one-shot accompli est « faite », jamais en retard", () => {
    // Une obligation PONCTUELLE — mise en service, « autre » — n'a pas de
    // rendez-vous suivant : sa `datePrevue` reste son échéance d'origine, donc
    // passée. Sans la garde du statut, la fiche peignait « dépassée » un acte
    // accompli, pendant que le prédicat partagé le disait à jour. C'est le seul
    // cas où un statut réalisé subsiste sur une ligne (ADR-034).
    const oneShot = {
      statut: "realisee_conforme",
      archiveLe: null,
      datePrevue: jours(-185),
      libelleObligation: "Vérification à la mise en service",
      periodicite: "mise_en_service_uniquement",
    };
    expect(classerVerification(oneShot, NOW)).toBe("faite");
  });

  it("une ligne archivée reste archivée, quelle que soit sa date", () => {
    // L'archivage passe AVANT tout le reste : le statut d'une ligne éteinte est
    // gelé dans son dernier état connu, souvent « dépassée », et sans cette
    // priorité elle se lisait « en retard » à perpétuité — jusque dans le
    // registre remis en contrôle.
    expect(
      classerVerification({ ...roulee, archiveLe: ARCHIVE_LE }, NOW),
    ).toBe("archivee");
    expect(
      classerVerification(
        { ...roulee, archiveLe: ARCHIVE_LE, datePrevue: jours(-10) },
        NOW,
      ),
    ).toBe("archivee");
  });
});
