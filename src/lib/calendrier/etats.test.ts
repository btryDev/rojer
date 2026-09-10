import { describe, expect, it } from "vitest";
import {
  aUnRendezVous,
  classerDate,
  classerVerification,
  lecturesCalendrier,
} from "./etats";

// L'horloge est injectée partout (ADR-011) : midi à Paris, un jour sans
// piège de fuseau — les cas de bascule de minuit vivent dans
// `lib/dates/retard.test.ts`, pas ici.
const NOW = new Date("2026-08-19T10:00:00.000Z");

const jours = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe("classerDate", () => {
  it("hier est en retard, aujourd'hui non", () => {
    expect(classerDate(jours(-1), NOW)).toBe("enRetard");
    expect(classerDate(NOW, NOW)).toBe("proche");
  });

  /**
   * La frontière proche/lointain est LA raison d'être de ce module : la
   * lib possède un `estVerificationAVenir` qui désigne l'intérieur de la
   * fenêtre de 30 jours, et le calendrier a failli nommer `aVenir` son
   * extérieur. Le trentième jour appartient au proche, bornes incluses —
   * même convention que la pilule « sous 30 jours » de l'en-tête.
   */
  it("le trentième jour est proche, le trente-et-unième est lointain", () => {
    expect(classerDate(jours(30), NOW)).toBe("proche");
    expect(classerDate(jours(31), NOW)).toBe("lointain");
  });
});

describe("classerVerification", () => {
  const planifiee = (datePrevue: Date) => ({
    statut: "planifiee",
    datePrevue,
    dateRealisee: null,
    // Libellé nu = ligne ACTIVE. Le marqueur d'archivage se lit désormais
    // dans `classerVerification` lui-même, donc le champ est requis.
    libelleObligation: "Vérification périodique",
  });

  it("suit la fenêtre pour une occurrence planifiée", () => {
    expect(classerVerification(planifiee(jours(-3)), NOW)).toBe("enRetard");
    expect(classerVerification(planifiee(jours(10)), NOW)).toBe("proche");
    expect(classerVerification(planifiee(jours(200)), NOW)).toBe("lointain");
  });

  it("« à planifier » à date passée est un retard — doctrine de retard.ts", () => {
    // Le contrôle n'a pas été fait dans les temps, rendez-vous pris ou
    // non : c'est la convention de `estVerificationEnRetard`, celle que
    // comptent l'en-tête, le PDF et le serveur MCP. La page calendrier a
    // contredit les trois pendant une journée — ce test est là pour que
    // ça ne revienne pas.
    expect(
      classerVerification(
        { statut: "a_planifier", datePrevue: jours(-40), dateRealisee: null, libelleObligation: "Vérification périodique" },
        NOW,
      ),
    ).toBe("enRetard");
    // À date future, en revanche, elle attend son rendez-vous : sa date
    // de génération ne la classe ni proche ni lointaine.
    expect(
      classerVerification(
        { statut: "a_planifier", datePrevue: jours(10), dateRealisee: null, libelleObligation: "Vérification périodique" },
        NOW,
      ),
    ).toBe("aPlanifier");
  });

  it("une vérification réalisée n'est jamais en retard", () => {
    expect(
      classerVerification(
        {
          statut: "realisee_conforme",
          datePrevue: jours(-40),
          dateRealisee: jours(-2),
          libelleObligation: "Vérification périodique",
        },
        NOW,
      ),
    ).toBe("faite");
    // Statut réalisé sans dateRealisee renseignée : le statut suffit.
    expect(
      classerVerification(
        {
          statut: "realisee_ecart_majeur",
          datePrevue: jours(-40),
          dateRealisee: null,
          libelleObligation: "Vérification périodique",
        },
        NOW,
      ),
    ).toBe("faite");
  });

  it("le statut « depassee » l'emporte même sur une date future", () => {
    // Une occurrence marquée dépassée en base reste un retard, quelle que
    // soit la date affichée — même règle que `estVerificationEnRetard`.
    expect(
      classerVerification(
        { statut: "depassee", datePrevue: jours(5), dateRealisee: null, libelleObligation: "Vérification périodique" },
        NOW,
      ),
    ).toBe("enRetard");
  });
});

describe("aUnRendezVous", () => {
  // Le défaut qu'il ferme : sur une ligne « à planifier » générée le jour
  // même, la fiche annonçait « prochaine échéance 1ᵉʳ sept. » et « échéance
  // aujourd'hui », pendant que le calendrier comptait la même ligne parmi les
  // « à planifier », hors de ses barres, et la marquait « à dater ».
  it("refuse le rendez-vous à une ligne que personne n'a datée", () => {
    // Sa `datePrevue` est la date de GÉNÉRATION — ici, aujourd'hui même.
    expect(
      aUnRendezVous(
        { statut: "a_planifier", datePrevue: NOW, dateRealisee: null, libelleObligation: "Vérification périodique" },
        NOW,
      ),
    ).toBe(false);
  });

  it("le refuse aussi à une date future, qui est le cas trompeur", () => {
    // Une date à venir ressemble à un rendez-vous ; c'est précisément là que
    // la fiche se trompait, et pas seulement sur la date du jour.
    expect(
      aUnRendezVous(
        { statut: "a_planifier", datePrevue: jours(10), dateRealisee: null, libelleObligation: "Vérification périodique" },
        NOW,
      ),
    ).toBe(false);
  });

  it("l'accorde à une occurrence planifiée, proche ou lointaine", () => {
    // Borne basse : le prédicat ne doit pas effacer les dates réelles.
    for (const d of [jours(1), jours(10), jours(200)]) {
      expect(
        aUnRendezVous(
          { statut: "planifiee", datePrevue: d, dateRealisee: null, libelleObligation: "Vérification périodique" },
          NOW,
        ),
      ).toBe(true);
    }
  });

  it("l'accorde à une ligne « à planifier » dont la date est passée", () => {
    // Elle est en retard, pas sans rendez-vous — `classerVerification` la
    // classe « enRetard », et la fiche doit continuer d'afficher son retard.
    expect(
      aUnRendezVous(
        { statut: "a_planifier", datePrevue: jours(-3), dateRealisee: null, libelleObligation: "Vérification périodique" },
        NOW,
      ),
    ).toBe(true);
  });
});

describe("lecturesCalendrier", () => {
  it("un cycle non soldé donne une seule lecture, telle quelle", () => {
    expect(
      lecturesCalendrier(
        {
          statut: "planifiee",
          datePrevue: jours(10),
          dateRealisee: null,
          libelleObligation: "Vérification périodique",
          periodicite: "annuelle",
        },
        NOW,
      ),
    ).toEqual([
      { date: jours(10), registre: "proche", lecture: "courante" },
    ]);
    expect(
      lecturesCalendrier(
        {
          statut: "a_planifier",
          datePrevue: jours(60),
          dateRealisee: null,
          libelleObligation: "Vérification périodique",
          periodicite: "annuelle",
        },
        NOW,
      ),
    ).toEqual([
      { date: jours(60), registre: "aPlanifier", lecture: "courante" },
    ]);
  });

  /**
   * LE cas qui a motivé la fonction : un contrôle annuel soldé porte
   * `dateRealisee` = jour du contrôle et `datePrevue` = rendez-vous
   * suivant, un an plus tard. Lu d'un bloc à `datePrevue`, il peignait la
   * prochaine échéance en vert « faite » — un an trop tôt.
   */
  it("un cycle annuel soldé se déplie en fait + prochain rendez-vous", () => {
    expect(
      lecturesCalendrier(
        {
          statut: "realisee_conforme",
          datePrevue: jours(300),
          dateRealisee: jours(-65),
          libelleObligation: "Vérification périodique",
          periodicite: "annuelle",
        },
        NOW,
      ),
    ).toEqual([
      { date: jours(-65), registre: "faite", lecture: "realisation" },
      { date: jours(300), registre: "lointain", lecture: "prochaine" },
    ]);
  });

  it("un rendez-vous suivant sous 30 jours est proche", () => {
    const lectures = lecturesCalendrier(
      {
        statut: "realisee_conforme",
        datePrevue: jours(20),
        dateRealisee: jours(-345),
        libelleObligation: "Vérification périodique",
        periodicite: "annuelle",
      },
      NOW,
    );
    expect(lectures[1]).toEqual({
      date: jours(20),
      registre: "proche",
      lecture: "prochaine",
    });
  });

  it("un contrôle sans périodicité soldé n'a pas de rendez-vous suivant", () => {
    // Sa datePrevue est l'ancienne échéance, pas un engagement — même
    // future (contrôle réalisé en avance), elle ne doit rien poser.
    expect(
      lecturesCalendrier(
        {
          statut: "realisee_conforme",
          datePrevue: jours(30),
          dateRealisee: jours(-3),
          libelleObligation: "Vérification périodique",
          periodicite: "mise_en_service_uniquement",
        },
        NOW,
      ),
    ).toEqual([
      { date: jours(-3), registre: "faite", lecture: "realisation" },
    ]);
  });

  it("un statut réalisé sans dateRealisee reste une seule lecture", () => {
    // Rien ne permet de dater le fait ailleurs qu'à datePrevue, et aucun
    // rendez-vous suivant ne peut être affirmé.
    expect(
      lecturesCalendrier(
        {
          statut: "realisee_observations",
          datePrevue: jours(-40),
          dateRealisee: null,
          libelleObligation: "Vérification périodique",
          periodicite: "annuelle",
        },
        NOW,
      ),
    ).toEqual([
      { date: jours(-40), registre: "faite", lecture: "realisation" },
    ]);
  });
});


describe("lecturesCalendrier — lignes archivées (ADR-012)", () => {
  // Une ligne dont l'obligation ne s'applique plus est marquée, pas
  // supprimée : elle porte un rapport. Mais son statut reste **gelé** dans
  // son dernier état connu — l'enum Prisma n'a pas de valeur `archivee` —,
  // si bien qu'un cycle soldé continuait d'en tirer un rendez-vous suivant.
  // L'établissement cesse d'être ERP, et la fiche annonçait quand même
  // « une vérification est attendue dans 120 jours » sur le désenfumage.
  const ARCHIVE = "Ne s'applique plus — Vérification annuelle du désenfumage";

  it("garde le fait passé, et lui seul", () => {
    expect(
      lecturesCalendrier(
        {
          statut: "realisee_conforme",
          datePrevue: jours(120),
          dateRealisee: jours(-245),
          periodicite: "annuelle",
          libelleObligation: ARCHIVE,
        },
        NOW,
      ),
    ).toEqual([
      { date: jours(-245), registre: "faite", lecture: "realisation" },
    ]);
  });

  it("n'annonce rien du tout quand rien n'a été réalisé", () => {
    // Le cas d'un rapport « non vérifiable » : la ligne porte une preuve
    // mais aucune date de réalisation, et son statut gelé dit « dépassée ».
    expect(
      lecturesCalendrier(
        {
          statut: "depassee",
          datePrevue: jours(-30),
          dateRealisee: null,
          periodicite: "annuelle",
          libelleObligation: ARCHIVE,
        },
        NOW,
      ),
    ).toEqual([]);
  });

  it("une ligne active, elle, annonce toujours ses deux lectures", () => {
    const lectures = lecturesCalendrier(
      {
        statut: "realisee_conforme",
        datePrevue: jours(120),
        dateRealisee: jours(-245),
        periodicite: "annuelle",
        libelleObligation: "Vérification annuelle du désenfumage",
      },
      NOW,
    );
    expect(lectures.map((l) => l.lecture)).toEqual([
      "realisation",
      "prochaine",
    ]);
  });

  it("sans libellé, la ligne est lue comme active", () => {
    // Les appelants qui n'ont pas le libellé sous la main ne doivent pas
    // voir leurs lignes disparaître.
    expect(
      lecturesCalendrier(
        {
          statut: "planifiee",
          datePrevue: jours(10),
          dateRealisee: null,
          libelleObligation: "Vérification périodique",
          periodicite: "annuelle",
        },
        NOW,
      ),
    ).toHaveLength(1);
  });
});
