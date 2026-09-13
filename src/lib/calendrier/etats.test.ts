import { describe, expect, it } from "vitest";
import {
  aUnRendezVous,
  classerDate,
  classerVerification,
  lecturesCalendrier,
  statutDeLaLecture,
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
    // `archiveLe: null` = ligne OUVERTE (ADR-034, N3). C'est ce champ, et non
    // plus un préfixe de libellé, que `classerVerification` lit en premier —
    // d'où le fait qu'il soit requis. Le libellé n'est plus qu'un affichage.
    archiveLe: null,
    periodicite: "annuelle",
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
        { statut: "a_planifier", datePrevue: jours(-40), dateRealisee: null, archiveLe: null, periodicite: "annuelle", libelleObligation: "Vérification périodique" },
        NOW,
      ),
    ).toBe("enRetard");
    // À date future, en revanche, elle attend son rendez-vous : sa date
    // de génération ne la classe ni proche ni lointaine.
    expect(
      classerVerification(
        { statut: "a_planifier", datePrevue: jours(10), dateRealisee: null, archiveLe: null, periodicite: "annuelle", libelleObligation: "Vérification périodique" },
        NOW,
      ),
    ).toBe("aPlanifier");
  });

  it("la COLONNE GELÉE ne classe plus rien : une ligne d'avant reste en retard", () => {
    // Une ligne écrite avant l'ADR-034 porte encore une `dateRealisee`, et son
    // statut dit « planifiée » parce qu'un dépôt l'a fait rouler. Tant que le
    // classement lisait cette colonne, elle sortait en « faite » — donc hors
    // de tous les comptes — alors que son échéance ouverte était dépassée.
    // C'est le défaut du lot 3 bis, et c'est ce que le N3 ferme : seul un
    // STATUT réalisé purge une échéance.
    expect(
      classerVerification(
        {
          statut: "planifiee",
          datePrevue: jours(-40),
          dateRealisee: jours(-400),
          archiveLe: null,
          periodicite: "annuelle",
          libelleObligation: "Vérification périodique",
        },
        NOW,
      ),
    ).toBe("enRetard");
  });

  it("un statut réalisé ne purge que sans rendez-vous suivant : la date décide sur une périodique", () => {
    // LA RÈGLE DU 2026-09-13 (`estVerificationRealisee`). Ce test disait « une
    // vérification réalisée n'est jamais en retard », et c'était vrai d'une
    // ligne SANS rendez-vous suivant seulement. Sur une obligation périodique,
    // « réalisée » dit qu'un contrôle a eu lieu, pas que le suivant n'est pas
    // dû — et les rangées d'avant l'ADR-034 portent exactement ça : le statut
    // du contrôle passé, le rendez-vous suivant dans `datePrevue`. Lues par
    // le statut, elles étaient « faites » à perpétuité ; lues par la date,
    // elles sont en retard quand la date est passée. C'est GestBAT par
    // construction : son modèle n'a pas de statut, rien n'y éteint la date.
    const realisee = (periodicite: string, datePrevue: Date) => ({
      statut: "realisee_conforme",
      datePrevue,
      dateRealisee: jours(-400),
      archiveLe: null,
      periodicite,
      libelleObligation: "Vérification périodique",
    });
    // Sans rendez-vous suivant : faite, quelle que soit la date.
    expect(
      classerVerification(realisee("mise_en_service_uniquement", jours(-40)), NOW),
    ).toBe("faite");
    // Périodique, date passée : EN RETARD — la rangée gelée à six mois.
    expect(classerVerification(realisee("annuelle", jours(-40)), NOW)).toBe(
      "enRetard",
    );
    // Périodique, date à venir : classée comme n'importe quelle date.
    expect(classerVerification(realisee("annuelle", jours(10)), NOW)).toBe(
      "proche",
    );
    // Statut réalisé sans `dateRealisee` : même règle, le rythme décide.
    expect(
      classerVerification(
        { ...realisee("mise_en_service_uniquement", jours(-40)), statut: "realisee_ecart_majeur", dateRealisee: null },
        NOW,
      ),
    ).toBe("faite");
  });

  it("le statut « depassee » l'emporte même sur une date future", () => {
    // Une occurrence marquée dépassée en base reste un retard, quelle que
    // soit la date affichée — même règle que `estVerificationEnRetard`.
    expect(
      classerVerification(
        { statut: "depassee", datePrevue: jours(5), dateRealisee: null, archiveLe: null, periodicite: "annuelle", libelleObligation: "Vérification périodique" },
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
        { statut: "a_planifier", datePrevue: NOW, dateRealisee: null, archiveLe: null, periodicite: "annuelle", libelleObligation: "Vérification périodique" },
        NOW,
      ),
    ).toBe(false);
  });

  it("le refuse aussi à une date future, qui est le cas trompeur", () => {
    // Une date à venir ressemble à un rendez-vous ; c'est précisément là que
    // la fiche se trompait, et pas seulement sur la date du jour.
    expect(
      aUnRendezVous(
        { statut: "a_planifier", datePrevue: jours(10), dateRealisee: null, archiveLe: null, periodicite: "annuelle", libelleObligation: "Vérification périodique" },
        NOW,
      ),
    ).toBe(false);
  });

  it("l'accorde à une occurrence planifiée, proche ou lointaine", () => {
    // Borne basse : le prédicat ne doit pas effacer les dates réelles.
    for (const d of [jours(1), jours(10), jours(200)]) {
      expect(
        aUnRendezVous(
          { statut: "planifiee", datePrevue: d, dateRealisee: null, archiveLe: null, periodicite: "annuelle", libelleObligation: "Vérification périodique" },
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
        { statut: "a_planifier", datePrevue: jours(-3), dateRealisee: null, archiveLe: null, periodicite: "annuelle", libelleObligation: "Vérification périodique" },
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
          archiveLe: null,
          derniereRealisation: null,
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
          archiveLe: null,
          derniereRealisation: null,
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
   * LE cas qui a motivé la fonction, et il est de retour. Un contrôle annuel
   * soldé d'avant l'ADR-034 porte `dateRealisee` = jour du contrôle et
   * `datePrevue` = rendez-vous suivant : deux vies sur une rangée. Lue d'un
   * bloc à `datePrevue`, elle peignait la prochaine échéance en vert
   * « faite », un an trop tôt.
   *
   * LE N4 A CRU CETTE RANGÉE MORTE et a réduit ce test à « ne pose plus que
   * son fait » — en écrivant que la perte était « bornée à la régénération ».
   * Elle ne l'était pas : seule la page calendrier régénère, et toutes les
   * lignes existantes sont de ce modèle-là. Depuis les corrections du
   * 2026-09-13, `estVerificationRealisee` fait décider la date sur une
   * obligation périodique : la rangée gelée se lit comme une ligne roulée —
   * le fait au jour du fait, l'échéance à sa date, en `courante`. Aucune
   * perte, et le test d'origine retrouve son objet.
   */
  it("une rangée gelée d'avant l'ADR-034 se lit comme une ligne roulée", () => {
    expect(
      lecturesCalendrier(
        {
          statut: "realisee_conforme",
          datePrevue: jours(300),
          dateRealisee: jours(-65),
          archiveLe: null,
          derniereRealisation: null,
          libelleObligation: "Vérification périodique",
          periodicite: "annuelle",
        },
        NOW,
      ),
    ).toEqual([
      { date: jours(-65), registre: "faite", lecture: "realisation" },
      { date: jours(300), registre: "lointain", lecture: "courante" },
    ]);
  });

  it("une rangée gelée dont le rendez-vous est PASSÉ se lit en retard", () => {
    // Le cas que les deux relectures ont nommé : contrôle le 01/03/2025,
    // rendez-vous au 01/03/2026, six mois de retard aujourd'hui — et le N4 la
    // lisait « faite » sur quatre surfaces. Ici : le fait, puis l'échéance
    // dépassée.
    expect(
      lecturesCalendrier(
        {
          statut: "realisee_conforme",
          datePrevue: jours(-180),
          dateRealisee: jours(-545),
          archiveLe: null,
          derniereRealisation: null,
          libelleObligation: "Vérification périodique",
          periodicite: "annuelle",
        },
        NOW,
      ),
    ).toEqual([
      { date: jours(-545), registre: "faite", lecture: "realisation" },
      { date: jours(-180), registre: "enRetard", lecture: "courante" },
    ]);
  });

  it("une échéance ouverte sous 30 jours est proche", () => {
    // Même garantie qu'avant le N4 — la fenêtre s'applique à l'échéance que la
    // ligne annonce —, portée par la ligne roulée qui l'annonce désormais :
    // statut « planifiée », le fait lu sur son dernier rapport.
    const lectures = lecturesCalendrier(
      {
        statut: "planifiee",
        datePrevue: jours(20),
        dateRealisee: null,
        archiveLe: null,
        derniereRealisation: jours(-345),
        libelleObligation: "Vérification périodique",
        periodicite: "annuelle",
      },
      NOW,
    );
    expect(lectures[1]).toEqual({
      date: jours(20),
      registre: "proche",
      lecture: "courante",
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
          archiveLe: null,
          derniereRealisation: null,
          libelleObligation: "Vérification périodique",
          periodicite: "mise_en_service_uniquement",
        },
        NOW,
      ),
    ).toEqual([
      { date: jours(-3), registre: "faite", lecture: "realisation" },
    ]);
  });

  /**
   * LE MODÈLE DE L'ADR-034. La ligne a roulé au dépôt : elle ne porte que son
   * échéance ouverte, « planifiée », et le contrôle fait se lit sur le rapport.
   * Les deux lectures reviennent — le fait au jour du fait, l'échéance à sa
   * date —, mais l'échéance est COURANTE, classée comme n'importe quelle date.
   */
  it("une ligne roulée pose le fait lu sur le rapport, puis son échéance ouverte", () => {
    expect(
      lecturesCalendrier(
        {
          statut: "planifiee",
          datePrevue: jours(300),
          dateRealisee: null,
          archiveLe: null,
          derniereRealisation: jours(-65),
          libelleObligation: "Vérification périodique",
          periodicite: "annuelle",
        },
        NOW,
      ),
    ).toEqual([
      { date: jours(-65), registre: "faite", lecture: "realisation" },
      { date: jours(300), registre: "lointain", lecture: "courante" },
    ]);
  });

  it("une échéance ouverte PASSÉE sur un appareil déjà contrôlé se lit en retard", () => {
    // Le défaut du lot 3 bis, qui disparaît par construction : l'ancien modèle
    // classait « faite » toute ligne portant une réalisation, et une échéance
    // suivante dépassée sortait de tous les comptes pendant que la grille la
    // peignait en rouge.
    const lectures = lecturesCalendrier(
      {
        statut: "planifiee",
        datePrevue: jours(-10),
        dateRealisee: null,
        archiveLe: null,
        derniereRealisation: jours(-375),
        libelleObligation: "Vérification périodique",
        periodicite: "annuelle",
      },
      NOW,
    );
    expect(lectures[1]).toEqual({
      date: jours(-10),
      registre: "enRetard",
      lecture: "courante",
    });
  });

  it("un statut réalisé sans date de réalisation : le rythme dit ce qu'il reste", () => {
    const sansDate = (periodicite: string) => ({
      statut: "realisee_observations",
      datePrevue: jours(-40),
      dateRealisee: null,
      archiveLe: null,
      derniereRealisation: null,
      libelleObligation: "Vérification périodique",
      periodicite,
    });
    // Sans rendez-vous suivant : le fait, daté à défaut à `datePrevue`, et rien
    // d'autre — aucun rendez-vous suivant ne peut être affirmé.
    expect(lecturesCalendrier(sansDate("mise_en_service_uniquement"), NOW)).toEqual([
      { date: jours(-40), registre: "faite", lecture: "realisation" },
    ]);
    // Périodique : la ligne ATTEND, et sa date est passée. Rien ne date le
    // fait, donc rien ne le pose ; l'échéance, elle, est due.
    expect(lecturesCalendrier(sansDate("annuelle"), NOW)).toEqual([
      { date: jours(-40), registre: "enRetard", lecture: "courante" },
    ]);
  });
});


describe("statutDeLaLecture (ADR-034)", () => {
  it("le FAIT porte le résultat de son rapport, pas l'état de l'échéance ouverte", () => {
    // Le défaut : une tuile verte « fait le 1er juin » affichait « En retard »
    // dès que l'échéance suivante de la même ligne était passée.
    expect(
      statutDeLaLecture("realisation", {
        statut: "depassee",
        dernierResultat: "conforme",
      }),
    ).toBe("realisee_conforme");
    expect(
      statutDeLaLecture("realisation", {
        statut: "planifiee",
        dernierResultat: "ecart_majeur",
      }),
    ).toBe("realisee_ecart_majeur");
  });

  it("l'échéance ouverte garde l'état de la ligne", () => {
    // La lecture `prochaine` a disparu au N4 : elle désignait le rendez-vous
    // suivant d'un cycle soldé, c'est-à-dire la seconde vie d'une rangée qui
    // n'en a plus qu'une. L'échéance ouverte EST ce rendez-vous, et elle se lit
    // `courante`.
    expect(statutDeLaLecture("courante", { statut: "depassee" })).toBe(
      "depassee",
    );
    expect(statutDeLaLecture("courante", { statut: "planifiee" })).toBe(
      "planifiee",
    );
  });

  it("sans résultat connu — ligne d'avant l'ADR-034 — le statut de la ligne fait foi", () => {
    expect(
      statutDeLaLecture("realisation", { statut: "realisee_observations" }),
    ).toBe("realisee_observations");
  });
});

describe("lecturesCalendrier — lignes archivées (ADR-012)", () => {
  // Une ligne dont l'obligation ne s'applique plus est marquée, pas
  // supprimée : elle porte un rapport. Mais son statut reste **gelé** dans
  // son dernier état connu — l'enum Prisma n'a pas de valeur `archivee` —,
  // si bien qu'un cycle soldé continuait d'en tirer un rendez-vous suivant.
  // L'établissement cesse d'être ERP, et la fiche annonçait quand même
  // « une vérification est attendue dans 120 jours » sur le désenfumage.
  // L'archivage est une DATE (ADR-034, N3) : le libellé des lignes archivées
  // est celui du référentiel, comme celui des lignes ouvertes.
  const ARCHIVE_LE = new Date("2026-07-01T00:00:00.000Z");

  it("garde le fait passé, et lui seul", () => {
    expect(
      lecturesCalendrier(
        {
          statut: "realisee_conforme",
          datePrevue: jours(120),
          dateRealisee: jours(-245),
          archiveLe: ARCHIVE_LE,
          derniereRealisation: null,
          periodicite: "annuelle",
          libelleObligation: "Vérification annuelle du désenfumage",
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
          archiveLe: ARCHIVE_LE,
          derniereRealisation: null,
          periodicite: "annuelle",
          libelleObligation: "Vérification annuelle du désenfumage",
        },
        NOW,
      ),
    ).toEqual([]);
  });

  it("une ligne active, elle, annonce toujours ses deux lectures", () => {
    const lectures = lecturesCalendrier(
      {
        statut: "planifiee",
        datePrevue: jours(120),
        dateRealisee: null,
        archiveLe: null,
        derniereRealisation: jours(-245),
        periodicite: "annuelle",
        libelleObligation: "Vérification annuelle du désenfumage",
      },
      NOW,
    );
    expect(lectures.map((l) => l.lecture)).toEqual([
      "realisation",
      "courante",
    ]);
  });

  it("une ligne dont `archiveLe` est nul est lue comme active", () => {
    // Ce test lisait « sans libellé, la ligne est lue comme active » : il
    // gardait le repli d'un appelant qui n'avait pas le libellé sous la main,
    // du temps où le marqueur y vivait. Le libellé ne décide plus de rien, mais
    // la garantie reste la même sur le champ qui l'a remplacé — une ligne
    // ouverte ne disparaît pas de l'écran de qui la lit.
    expect(
      lecturesCalendrier(
        {
          statut: "planifiee",
          datePrevue: jours(10),
          dateRealisee: null,
          archiveLe: null,
          derniereRealisation: null,
          libelleObligation: "Vérification périodique",
          periodicite: "annuelle",
        },
        NOW,
      ),
    ).toHaveLength(1);
  });
});
