import { afterEach, describe, expect, it, vi } from "vitest";
import { JOURS_HORIZON_PROCHE } from "./index";
import {
  estActionEnRetard,
  estActionOuverte,
  estActionSansEcheance,
  estDansLesProchainsJours,
  estEnRetard,
  estVerificationAPlanifier,
  estVerificationArchivee,
  estVerificationAVenir,
  estVerificationEnRetard,
  joursDeRetard,
  type ActionDatee,
  type VerificationDatee,
} from "./retard";

// Toutes les fixtures utilisent des dates civiles **stockées à minuit
// UTC** — la forme exacte que produit
// `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform(v => new Date(v))`
// dans les schémas de saisie. C'est le cas qui faisait basculer une
// échéance du jour en « en retard » dès 02:00 heure de Paris.

/** 10 août 2026, tel que stocké en base après saisie du formulaire. */
const AUJOURDHUI = new Date("2026-08-10T00:00:00Z");
const HIER = new Date("2026-08-09T00:00:00Z");
const DEMAIN = new Date("2026-08-11T00:00:00Z");

/** Le 10 août 2026 à 09:00 heure de Paris. */
const CE_MATIN = new Date("2026-08-10T07:00:00Z");
/** Le 10 août 2026 à 23:00 heure de Paris — dernier instant utile du jour. */
const CE_SOIR = new Date("2026-08-10T21:00:00Z");
/** Le 10 août 2026 à 00:30 heure de Paris — le piège : 22:30Z la veille. */
const CETTE_NUIT = new Date("2026-08-09T22:30:00Z");

afterEach(() => {
  vi.useRealTimers();
});

describe("estEnRetard — une échéance du jour n'est jamais en retard", () => {
  it("échéance du jour, consultée à 09:00 heure de Paris", () => {
    expect(estEnRetard(AUJOURDHUI, CE_MATIN)).toBe(false);
  });

  it("échéance du jour, consultée à 23:00 heure de Paris", () => {
    expect(estEnRetard(AUJOURDHUI, CE_SOIR)).toBe(false);
  });

  it("échéance du jour, consultée à 00:30 heure de Paris", () => {
    expect(estEnRetard(AUJOURDHUI, CETTE_NUIT)).toBe(false);
  });

  it("l'ancienne règle naïve (date < now) se serait trompée dès 02:00", () => {
    // Trace du bug corrigé : à 09:00 Paris, `date < now` était vrai.
    expect(AUJOURDHUI < CE_MATIN).toBe(true);
    expect(estEnRetard(AUJOURDHUI, CE_MATIN)).toBe(false);
  });

  it("l'échéance de la veille est en retard", () => {
    expect(estEnRetard(HIER, CE_MATIN)).toBe(true);
  });

  it("l'échéance de demain n'est pas en retard", () => {
    expect(estEnRetard(DEMAIN, CE_SOIR)).toBe(false);
  });

  it("bascule exactement à minuit heure de Paris", () => {
    const minuitParis = new Date("2026-08-10T22:00:00Z"); // 11 août, 00:00
    expect(estEnRetard(AUJOURDHUI, new Date(minuitParis.getTime() - 1))).toBe(
      false,
    );
    expect(estEnRetard(AUJOURDHUI, minuitParis)).toBe(true);
  });

  it("reste correct en hiver (décalage +1 h)", () => {
    const jour = new Date("2026-01-10T00:00:00Z"); // 01:00 Paris le 10
    expect(estEnRetard(jour, new Date("2026-01-10T08:00:00Z"))).toBe(false);
    expect(estEnRetard(jour, new Date("2026-01-10T23:30:00Z"))).toBe(true); // 11 à 00:30
  });

  it("reste correct au passage à l'heure d'été (nuit du 28 au 29 mars 2026)", () => {
    const le29 = new Date("2026-03-29T00:00:00Z"); // 01:00 Paris le 29
    expect(estEnRetard(le29, new Date("2026-03-29T12:00:00Z"))).toBe(false);
    expect(estEnRetard(le29, new Date("2026-03-29T23:00:00Z"))).toBe(true); // 30 à 01:00
    const le28 = new Date("2026-03-28T00:00:00Z");
    expect(estEnRetard(le28, new Date("2026-03-29T12:00:00Z"))).toBe(true);
  });

  it("reste correct au retour à l'heure d'hiver (nuit du 24 au 25 octobre 2026)", () => {
    const le25 = new Date("2026-10-25T00:00:00Z"); // 01:00 Paris le 25
    expect(estEnRetard(le25, new Date("2026-10-25T12:00:00Z"))).toBe(false);
    // 25 octobre 22:30Z = 23:30 Paris, encore le 25 (UTC+1).
    expect(estEnRetard(le25, new Date("2026-10-25T22:30:00Z"))).toBe(false);
    expect(estEnRetard(le25, new Date("2026-10-25T23:30:00Z"))).toBe(true);
  });
});

describe("joursDeRetard", () => {
  it("vaut 0 pour une échéance du jour", () => {
    expect(joursDeRetard(AUJOURDHUI, CE_MATIN)).toBe(0);
    expect(joursDeRetard(AUJOURDHUI, CE_SOIR)).toBe(0);
  });

  it("vaut 0 pour une échéance à venir (jamais de négatif)", () => {
    expect(joursDeRetard(DEMAIN, CE_MATIN)).toBe(0);
    expect(joursDeRetard(new Date("2027-01-01"), CE_MATIN)).toBe(0);
  });

  it("vaut 1 pour l'échéance de la veille", () => {
    expect(joursDeRetard(HIER, CE_MATIN)).toBe(1);
    expect(joursDeRetard(HIER, CE_SOIR)).toBe(1);
  });

  it("compte en jours civils sur une période longue", () => {
    expect(joursDeRetard(new Date("2026-05-10"), CE_MATIN)).toBe(92);
  });

  it("compte juste en traversant un changement d'heure", () => {
    // Du 20 mars au 10 avril 2026 : 21 jours, malgré l'heure perdue.
    expect(
      joursDeRetard(new Date("2026-03-20"), new Date("2026-04-10T09:00:00Z")),
    ).toBe(21);
  });
});

describe("estDansLesProchainsJours", () => {
  it("inclut aujourd'hui", () => {
    expect(estDansLesProchainsJours(AUJOURDHUI, CE_MATIN, 30)).toBe(true);
    expect(estDansLesProchainsJours(AUJOURDHUI, CE_SOIR, 30)).toBe(true);
  });

  it("inclut le dernier jour de la fenêtre en entier", () => {
    const dans30j = new Date("2026-09-09T00:00:00Z");
    expect(estDansLesProchainsJours(dans30j, CE_MATIN, 30)).toBe(true);
    const dans31j = new Date("2026-09-10T00:00:00Z");
    expect(estDansLesProchainsJours(dans31j, CE_MATIN, 30)).toBe(false);
  });

  it("exclut le passé", () => {
    expect(estDansLesProchainsJours(HIER, CE_MATIN, 30)).toBe(false);
  });

  it("aucune échéance ne tombe dans un trou : retard XOR fenêtre pour l'horizon proche", () => {
    // Le bug historique : borne basse à `now` brut, borne haute à
    // `now + 30j` — une échéance du jour n'était ni en retard ni à venir.
    const jours = [HIER, AUJOURDHUI, DEMAIN, new Date("2026-08-25")];
    for (const d of jours) {
      const retard = estEnRetard(d, CE_MATIN);
      const fenetre = estDansLesProchainsJours(d, CE_MATIN, JOURS_HORIZON_PROCHE);
      expect(retard || fenetre).toBe(true);
      expect(retard && fenetre).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------
// Vérifications
// ---------------------------------------------------------------------

function verif(p: Partial<VerificationDatee> = {}): VerificationDatee {
  return {
    statut: "planifiee",
    datePrevue: AUJOURDHUI,
    dateRealisee: null,
    // Nu = ligne ACTIVE. Les cas archivés passent un libellé marqué.
    libelleObligation: "Vérification périodique",
    ...p,
  };
}

describe("estVerificationEnRetard", () => {
  it("statut depassee est toujours en retard", () => {
    expect(
      estVerificationEnRetard(
        verif({ statut: "depassee", datePrevue: DEMAIN }),
        CE_MATIN,
      ),
    ).toBe(true);
  });

  it("planifiee dont la date est passée est en retard", () => {
    expect(
      estVerificationEnRetard(verif({ statut: "planifiee", datePrevue: HIER }), CE_MATIN),
    ).toBe(true);
  });

  it("planifiee pour aujourd'hui n'est pas en retard", () => {
    expect(estVerificationEnRetard(verif(), CE_SOIR)).toBe(false);
  });

  it("a_planifier dont la date est passée est en retard (arbitrage ADR-011)", () => {
    expect(
      estVerificationEnRetard(
        verif({ statut: "a_planifier", datePrevue: HIER }),
        CE_MATIN,
      ),
    ).toBe(true);
  });

  it("a_planifier dont la date est à venir n'est pas en retard", () => {
    expect(
      estVerificationEnRetard(
        verif({ statut: "a_planifier", datePrevue: DEMAIN }),
        CE_MATIN,
      ),
    ).toBe(false);
  });

  it("a_planifier pour aujourd'hui n'est pas en retard", () => {
    expect(
      estVerificationEnRetard(verif({ statut: "a_planifier" }), CE_SOIR),
    ).toBe(false);
  });

  it("une occurrence réalisée n'est jamais en retard, même statut depassee", () => {
    expect(
      estVerificationEnRetard(
        verif({ statut: "depassee", datePrevue: HIER, dateRealisee: HIER }),
        CE_MATIN,
      ),
    ).toBe(false);
  });

  it("les statuts realisee_* ne sont jamais en retard", () => {
    for (const statut of [
      "realisee_conforme",
      "realisee_observations",
      "realisee_ecart_majeur",
    ]) {
      expect(
        estVerificationEnRetard(verif({ statut, datePrevue: HIER }), CE_MATIN),
      ).toBe(false);
    }
  });
});

describe("estVerificationAPlanifier", () => {
  it("a_planifier à venir est un simple « à faire »", () => {
    expect(
      estVerificationAPlanifier(
        verif({ statut: "a_planifier", datePrevue: DEMAIN }),
        CE_MATIN,
      ),
    ).toBe(true);
  });

  it("a_planifier pour aujourd'hui reste un « à faire »", () => {
    expect(
      estVerificationAPlanifier(verif({ statut: "a_planifier" }), CE_SOIR),
    ).toBe(true);
  });

  it("a_planifier en retard n'est plus un simple « à faire »", () => {
    expect(
      estVerificationAPlanifier(
        verif({ statut: "a_planifier", datePrevue: HIER }),
        CE_MATIN,
      ),
    ).toBe(false);
  });

  it("planifiee n'est pas « à planifier »", () => {
    expect(estVerificationAPlanifier(verif(), CE_MATIN)).toBe(false);
  });

  it("les deux compteurs ne doublonnent jamais", () => {
    const cas: VerificationDatee[] = [
      verif({ statut: "a_planifier", datePrevue: HIER }),
      verif({ statut: "a_planifier", datePrevue: AUJOURDHUI }),
      verif({ statut: "a_planifier", datePrevue: DEMAIN }),
      verif({ statut: "planifiee", datePrevue: HIER }),
      verif({ statut: "planifiee", datePrevue: DEMAIN }),
      verif({ statut: "depassee", datePrevue: HIER }),
      verif({ statut: "realisee_conforme", datePrevue: HIER, dateRealisee: HIER }),
    ];
    for (const v of cas) {
      expect(
        estVerificationEnRetard(v, CE_MATIN) && estVerificationAPlanifier(v, CE_MATIN),
      ).toBe(false);
    }
  });
});

describe("estVerificationAVenir", () => {
  it("planifiee dans la fenêtre", () => {
    expect(
      estVerificationAVenir(
        verif({ datePrevue: new Date("2026-08-25") }),
        CE_MATIN,
        JOURS_HORIZON_PROCHE,
      ),
    ).toBe(true);
  });

  it("planifiee pour aujourd'hui compte comme à venir", () => {
    expect(estVerificationAVenir(verif(), CE_SOIR, JOURS_HORIZON_PROCHE)).toBe(true);
  });

  it("planifiee hors fenêtre", () => {
    expect(
      estVerificationAVenir(
        verif({ datePrevue: new Date("2026-12-01") }),
        CE_MATIN,
        JOURS_HORIZON_PROCHE,
      ),
    ).toBe(false);
  });

  it("a_planifier n'est pas annoncée comme à venir (pas de date arrêtée)", () => {
    expect(
      estVerificationAVenir(
        verif({ statut: "a_planifier", datePrevue: DEMAIN }),
        CE_MATIN,
        JOURS_HORIZON_PROCHE,
      ),
    ).toBe(false);
  });

  it("une occurrence réalisée n'est pas à venir", () => {
    expect(
      estVerificationAVenir(
        verif({ datePrevue: DEMAIN, dateRealisee: HIER }),
        CE_MATIN,
        JOURS_HORIZON_PROCHE,
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------

function action(p: Partial<ActionDatee> = {}): ActionDatee {
  return { statut: "ouverte", echeance: AUJOURDHUI, ...p };
}

describe("estActionEnRetard", () => {
  it("action ouverte dont l'échéance est passée", () => {
    expect(estActionEnRetard(action({ echeance: HIER }), CE_MATIN)).toBe(true);
  });

  it("action en cours dont l'échéance est passée", () => {
    expect(
      estActionEnRetard(action({ statut: "en_cours", echeance: HIER }), CE_MATIN),
    ).toBe(true);
  });

  it("action à échéance d'aujourd'hui, même à 23:00", () => {
    expect(estActionEnRetard(action(), CE_SOIR)).toBe(false);
  });

  it("action levée n'est jamais en retard", () => {
    expect(
      estActionEnRetard(action({ statut: "levee", echeance: HIER }), CE_MATIN),
    ).toBe(false);
  });

  it("action abandonnée n'est jamais en retard", () => {
    expect(
      estActionEnRetard(action({ statut: "abandonnee", echeance: HIER }), CE_MATIN),
    ).toBe(false);
  });

  it("action sans échéance n'est pas en retard", () => {
    expect(estActionEnRetard(action({ echeance: null }), CE_MATIN)).toBe(false);
  });
});

describe("estActionSansEcheance", () => {
  it("repère une action ouverte non datée", () => {
    expect(estActionSansEcheance(action({ echeance: null }))).toBe(true);
    expect(
      estActionSansEcheance(action({ statut: "en_cours", echeance: null })),
    ).toBe(true);
  });

  it("ignore une action datée", () => {
    expect(estActionSansEcheance(action())).toBe(false);
  });

  it("ignore une action close, même non datée", () => {
    expect(
      estActionSansEcheance(action({ statut: "levee", echeance: null })),
    ).toBe(false);
    expect(
      estActionSansEcheance(action({ statut: "abandonnee", echeance: null })),
    ).toBe(false);
  });
});

describe("estActionOuverte", () => {
  it("distingue les statuts encore à traiter", () => {
    expect(estActionOuverte(action({ statut: "ouverte" }))).toBe(true);
    expect(estActionOuverte(action({ statut: "en_cours" }))).toBe(true);
    expect(estActionOuverte(action({ statut: "levee" }))).toBe(false);
    expect(estActionOuverte(action({ statut: "abandonnee" }))).toBe(false);
  });
});

describe("horloge injectée", () => {
  it("les prédicats ignorent l'horloge système", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    // Malgré une horloge système très avancée, seule la date passée en
    // paramètre compte : l'échéance du jour reste à l'heure.
    expect(estEnRetard(AUJOURDHUI, CE_MATIN)).toBe(false);
    expect(estActionEnRetard(action(), CE_SOIR)).toBe(false);
  });
});

// ---------------------------------------------------------------------
// Lignes archivées (ADR-012)
// ---------------------------------------------------------------------
// Le marqueur d'archivage vit dans le LIBELLÉ, faute de valeur `archivee`
// dans l'enum Prisma : le statut d'une ligne archivée reste GELÉ dans son
// dernier état connu. Une ligne gelée sur `depassee` se lisait donc « en
// retard » à perpétuité — et le champ qui porte le marqueur était OPTIONNEL,
// donc silencieusement absent chez les sept surfaces qui ne le
// sélectionnaient pas : la fiche, le serveur MCP, deux widgets, le bandeau
// de recommandations, le registre de sécurité en PDF. Il est requis
// désormais, et les prédicats s'arrêtent dessus avant de regarder les dates.

describe("lignes archivées", () => {
  const ARCHIVEE = "Ne s'applique plus — Vérification du désenfumage";

  it("une ligne archivée n'est jamais en retard, même gelée sur `depassee`", () => {
    const v = verif({
      statut: "depassee",
      datePrevue: HIER,
      libelleObligation: ARCHIVEE,
    });
    expect(estVerificationArchivee(v)).toBe(true);
    expect(
      estVerificationEnRetard(v, AUJOURDHUI),
      "l'obligation ne s'applique plus : annoncer un retard dessus est un mensonge de dossier",
    ).toBe(false);
  });

  it("elle n'est ni à planifier, ni à venir", () => {
    expect(
      estVerificationAPlanifier(
        verif({
          statut: "a_planifier",
          datePrevue: DEMAIN,
          libelleObligation: ARCHIVEE,
        }),
        AUJOURDHUI,
      ),
    ).toBe(false);
    expect(
      estVerificationAVenir(
        verif({
          statut: "planifiee",
          datePrevue: DEMAIN,
          libelleObligation: ARCHIVEE,
        }),
        AUJOURDHUI,
        JOURS_HORIZON_PROCHE,
      ),
    ).toBe(false);
  });

  it("la même ligne NON archivée, elle, est bien en retard", () => {
    // Le témoin. Sans lui, les cas ci-dessus passeraient tout autant avec un
    // prédicat qui rendrait `false` pour tout le monde.
    expect(
      estVerificationEnRetard(
        verif({ statut: "depassee", datePrevue: HIER }),
        AUJOURDHUI,
      ),
    ).toBe(true);
  });
});
