// L'état d'une DATE, et l'état d'une LIGNE — deux questions distinctes que la
// fiche de vérification confondait.
//
// Ces cas vivent dans leur propre fichier plutôt qu'à la suite d'`etats.test`
// parce qu'ils gardent un correctif nommé (lot 3 du § 11), pas le
// comportement général du classement.

import { describe, expect, it } from "vitest";
import { classerVerification, etatDuRendezVous } from "./etats";

const NOW = new Date("2026-08-19T10:00:00.000Z");
const jours = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

const ARCHIVEE = "Ne s'applique plus — Vérification périodique";

/**
 * Un cycle SOLDÉ : réalisée il y a 245 jours, prochaine échéance dans 120.
 * La ligne dit deux choses — « fait le … » et « prochaine le … » —, et c'est
 * cette dualité qui fait toute la difficulté.
 */
const soldee = {
  statut: "realisee_conforme",
  dateRealisee: jours(-245),
  datePrevue: jours(120),
  libelleObligation: "Vérification périodique",
  periodicite: "annuelle",
};

describe("etatDuRendezVous", () => {
  it("ne peint pas « faite » un rendez-vous à venir", () => {
    // LE DÉFAUT QUE CE TEST GARDE. `classerVerification` répond sur la LIGNE,
    // donc « faite ». La fiche posait la date du RENDEZ-VOUS avec cet état-là :
    // une tuile verte « faite » sur une échéance dans 120 jours. Texte juste,
    // couleur fausse — et c'est mot pour mot le défaut que
    // `lecturesCalendrier` a supprimé du calendrier en dépliant la ligne.
    expect(classerVerification(soldee, NOW)).toBe("faite");
    expect(
      etatDuRendezVous(soldee, NOW),
      "la tuile porte la date du rendez-vous : elle doit porter l'état de CETTE date",
    ).toBe("lointain");
  });

  it("suit la fenêtre à l'approche, et le retard quand la date est passée", () => {
    expect(etatDuRendezVous({ ...soldee, datePrevue: jours(10) }, NOW)).toBe(
      "proche",
    );
    expect(etatDuRendezVous({ ...soldee, datePrevue: jours(-10) }, NOW)).toBe(
      "enRetard",
    );
  });

  it("sur un cycle NON soldé, il ne change rien au classement", () => {
    const ouverte = {
      statut: "planifiee",
      dateRealisee: null,
      datePrevue: jours(10),
      libelleObligation: "Vérification périodique",
      periodicite: "annuelle",
    };
    expect(etatDuRendezVous(ouverte, NOW)).toBe(
      classerVerification(ouverte, NOW),
    );
  });

  it("ne peint jamais un one-shot accompli en retard", () => {
    // LE DÉFAUT SYMÉTRIQUE, trouvé en relecture. Une obligation PONCTUELLE —
    // « mise en service », « autre » — n'a pas de rendez-vous suivant : la
    // réconciliation laisse sa `datePrevue` sur l'échéance d'origine. Un
    // contrôle réalisé EN AVANCE satisfait alors `datePrevue > dateRealisee`
    // sans qu'aucun rendez-vous n'existe, et la fiche peignait « dépassée » un
    // acte accompli — pendant que la même page, par le prédicat partagé, le
    // disait à jour. Deux lectures contradictoires sur un écran, c'est-à-dire
    // exactement ce que ce lot supprime.
    const oneShot = {
      statut: "realisee_conforme",
      dateRealisee: jours(-200),
      datePrevue: jours(-185),
      libelleObligation: "Vérification à la mise en service",
      periodicite: "mise_en_service_uniquement",
    };
    expect(classerVerification(oneShot, NOW)).toBe("faite");
    expect(
      etatDuRendezVous(oneShot, NOW),
      "un one-shot accompli n'a pas de rendez-vous suivant : rien à classer en retard",
    ).toBe("faite");
  });

  it("une ligne archivée reste archivée, quelle que soit sa date", () => {
    expect(
      etatDuRendezVous({ ...soldee, libelleObligation: ARCHIVEE }, NOW),
    ).toBe("archivee");
  });
});

describe("classerVerification — lignes archivées", () => {
  it("rend « archivee » plutôt qu'un retard sur une ligne gelée", () => {
    // Le chemin ordinaire vers cet état : un rapport « non vérifiable » ne
    // pose aucune date de réalisation et repasse la ligne en `depassee` ;
    // l'appareil est ensuite retiré du parc, la ligne est archivée — et son
    // statut reste GELÉ, faute de valeur `archivee` dans l'enum (ADR-012).
    expect(
      classerVerification(
        {
          statut: "depassee",
          datePrevue: jours(-30),
          dateRealisee: null,
          libelleObligation: ARCHIVEE,
        },
        NOW,
      ),
    ).toBe("archivee");
  });

  it("la même ligne NON archivée est bien « enRetard »", () => {
    expect(
      classerVerification(
        {
          statut: "depassee",
          datePrevue: jours(-30),
          dateRealisee: null,
          libelleObligation: "Vérification périodique",
        },
        NOW,
      ),
    ).toBe("enRetard");
  });
});
