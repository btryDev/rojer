import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Prestataire } from "@prisma/client";
import { cleJourCivil } from "@/lib/dates";
import {
  MOIS_RENOUVELLEMENT_URSSAF,
  computeVigilance,
  echeanceAttestationUrssaf,
  mentionUrssaf,
  messageExpiration,
} from "./vigilance";
import { erreursDatesAttestation, remiseAttestationSchema } from "./schema";

/**
 * Les fichiers d'une surface qui s'affiche où un nom donné apparaît.
 *
 * Même périmètre que `referentiels/corpus/citations-ecran.ts` — `src/app` et
 * `src/components` —, et pour la même raison : ce qui atteint le dirigeant.
 * Un balayage plutôt qu'une liste d'écrans, pour qu'un écran neuf soit tenu
 * par la règle sans que personne ait pensé à l'y inscrire.
 */
function fichiersAffichant(nom: string): string[] {
  const trouves: string[] = [];
  const descendre = (d: string) => {
    for (const entree of readdirSync(d)) {
      const p = join(d, entree);
      if (statSync(p).isDirectory()) {
        if (entree !== "node_modules") descendre(p);
      } else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) {
        if (readFileSync(p, "utf8").includes(nom)) trouves.push(p);
      }
    }
  };
  for (const racine of ["src/app", "src/components"]) {
    descendre(join(process.cwd(), racine));
  }
  return trouves;
}

/**
 * Les dates de validité arrivent d'un `<input type="date">` : elles sont
 * stockées à **minuit UTC** (cf. ADR-011). Tous les cas ci-dessous les
 * construisent ainsi — `new Date("2026-08-10")` — et figent l'horloge à une
 * heure ouvrée de Paris.
 *
 * C'est ce que l'ancienne version de ces tests ne faisait pas : elle
 * construisait chaque date par `Date.now() + n × 86 400 000`, si bien que la
 * date portait la même heure que l'horloge et que la soustraction tombait
 * toujours sur un compte de jours entier. Le décalage d'un jour sur toute
 * l'échelle (« Expirée il y a 1 j » le jour même de la validité) était donc
 * structurellement invisible.
 */

/** 10 août 2026, 9 h à Paris (07:00 UTC — l'écart d'été qui faisait basculer
 *  l'ancien calcul du bon côté du zéro). */
const NOW = new Date("2026-08-10T07:00:00Z");
/** Le même jour civil, mais tard le soir (23:30 à Paris = 21:30 UTC). */
const NOW_SOIR = new Date("2026-08-10T21:30:00Z");

/** Date civile telle que Prisma la rend : minuit UTC. */
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
/** Le jour civil de Paris d'une date : ce que l'écran affiche. `ajouterMois`
 *  garde l'heure de Paris, donc minuit UTC en hiver devient 23:00 UTC la
 *  veille en été — même jour civil, instant différent. */
const civil = (d: Date | null) => (d ? cleJourCivil(d) : null);

/**
 * Remise et émission renseignées, lointaines de toute borne : la remise
 * suivante tombe le 1er février 2027. Les cas qui testent l'échelle de la
 * validité les portent, sans quoi l'attestation dirait « Date non
 * renseignée » — ce qui est la règle, mais pas ce qu'ils mesurent.
 */
const DATES_OK = {
  attestationUrssafRemiseLe: jour("2026-08-01"),
  attestationUrssafEmiseLe: jour("2026-07-25"),
};

function prestataireFake(p: Partial<Prestataire>): Prestataire {
  return {
    id: "p1",
    etablissementId: "e1",
    raisonSociale: "Test",
    siret: null,
    estOrganismeAgree: false,
    domaines: [],
    contactNom: "Nom",
    contactEmail: "test@ex.fr",
    contactTelephone: null,
    attestationUrssafCle: null,
    attestationUrssafNom: null,
    attestationUrssafValableJusquA: null,
    attestationUrssafRemiseLe: null,
    attestationUrssafEmiseLe: null,
    assuranceRcProCle: null,
    assuranceRcProNom: null,
    assuranceRcProValableJusquA: null,
    kbisCle: null,
    kbisNom: null,
    kbisDateEmission: null,
    notesInternes: null,
    createdAt: jour("2026-08-01"),
    // Fiche modifiée ce jour par défaut : le repli « rien déposé depuis plus
    // de six mois » ne s'applique pas.
    updatedAt: NOW,
    ...p,
  };
}

describe("computeVigilance — échelle de validité", () => {
  it("marque comme manquante une attestation non renseignée", () => {
    const v = computeVigilance(prestataireFake({}), NOW);
    expect(v.urssaf).toBe("manquante");
    expect(v.rcPro).toBe("manquante");
    expect(v.kbis).toBe("absent");
    expect(v.urssafARedemanderLe).toBeNull();
    expect(v.alertesOuvertes).toBe(2);
  });

  it("compte en jours civils, pas en tranches de 24 h", () => {
    const v = computeVigilance(
      prestataireFake({
        ...DATES_OK,
        attestationUrssafValableJusquA: jour("2026-09-15"),
        assuranceRcProValableJusquA: jour("2027-02-06"),
        kbisCle: "kbis/key",
      }),
      NOW,
    );
    expect(v.urssafExpireDans).toBe(36);
    expect(v.rcProExpireDans).toBe(180);
    expect(v.urssaf).toBe("a_jour");
    expect(v.rcPro).toBe("a_jour");
    expect(v.kbis).toBe("present");
    expect(v.alertesOuvertes).toBe(0);
  });

  it("laisse toute sa journée à une attestation valable « jusqu'au » aujourd'hui", () => {
    // Le cœur du défaut corrigé : la date est stockée à 00:00 UTC, soit
    // 02:00 à Paris. À 9 h, l'écart valait −7 h et l'arrondi vers le bas
    // annonçait « Expirée il y a 1 j » sur une pièce encore valable.
    const p = prestataireFake({
      ...DATES_OK,
      attestationUrssafValableJusquA: jour("2026-08-10"),
    });
    for (const horloge of [NOW, NOW_SOIR]) {
      const v = computeVigilance(p, horloge);
      expect(v.urssaf).toBe("expire_bientot");
      expect(v.urssafExpireDans).toBe(0);
      expect(messageExpiration(v.urssafExpireDans)).toBe("Expire aujourd'hui");
    }
  });

  it("bascule en expirée au minuit suivant, pas avant", () => {
    const veille = computeVigilance(
      prestataireFake({ ...DATES_OK, attestationUrssafValableJusquA: jour("2026-08-09") }),
      NOW,
    );
    expect(veille.urssaf).toBe("expiree");
    expect(veille.urssafExpireDans).toBe(-1);
    expect(messageExpiration(veille.urssafExpireDans)).toBe(
      "Expirée il y a 1 j",
    );
  });

  it("annonce « expire demain » la veille du dernier jour", () => {
    const v = computeVigilance(
      prestataireFake({ ...DATES_OK, attestationUrssafValableJusquA: jour("2026-08-11") }),
      NOW,
    );
    expect(v.urssafExpireDans).toBe(1);
    expect(messageExpiration(v.urssafExpireDans)).toBe("Expire demain");
  });

  it("alerte à trente jours pile, pas à trente et un", () => {
    const dans30 = computeVigilance(
      prestataireFake({ ...DATES_OK, attestationUrssafValableJusquA: jour("2026-09-09") }),
      NOW,
    );
    const dans31 = computeVigilance(
      prestataireFake({ ...DATES_OK, attestationUrssafValableJusquA: jour("2026-09-10") }),
      NOW,
    );
    expect(dans30.urssaf).toBe("expire_bientot");
    expect(dans31.urssaf).toBe("a_jour");
  });

  it("compte une alerte par pièce à durée de validité qui n'est pas à jour", () => {
    const v = computeVigilance(
      prestataireFake({
        ...DATES_OK,
        attestationUrssafValableJusquA: jour("2026-08-01"), // expirée
        assuranceRcProValableJusquA: jour("2026-08-20"), // expire bientôt
      }),
      NOW,
    );
    expect(v.alertesOuvertes).toBe(2);
  });
});

describe("attestation URSSAF — la remise pilote les six mois (art. D. 8222-5)", () => {
  // « lors de la conclusion et tous les six mois jusqu'à la fin de son
  // exécution » : la remise suivante tombe six mois calendaires après la
  // dernière remise, et ce jour-là compte encore (« aujourd'hui »).
  const avecRemise = (remise: string, extra: Partial<Prestataire> = {}) =>
    prestataireFake({
      attestationUrssafCle: "urssaf/key",
      attestationUrssafRemiseLe: jour(remise),
      attestationUrssafEmiseLe: jour("2026-01-20"),
      ...extra,
    });

  it("six mois pile : la remise suivante est aujourd'hui", () => {
    const v = computeVigilance(avecRemise("2026-02-10"), NOW);
    expect(civil(v.urssafARedemanderLe)).toBe("2026-08-10");
    expect(civil(v.urssafRemiseSuivante)).toBe("2026-08-10");
    expect(v.urssafExpireDans).toBe(0);
    expect(v.urssaf).toBe("expire_bientot");
    expect(messageExpiration(v.urssafExpireDans)).toBe("Expire aujourd'hui");
  });

  it("la veille des six mois : demain", () => {
    const v = computeVigilance(avecRemise("2026-02-11"), NOW);
    expect(v.urssafExpireDans).toBe(1);
    expect(v.urssaf).toBe("expire_bientot");
  });

  it("le lendemain des six mois : à redemander, en retard", () => {
    const v = computeVigilance(avecRemise("2026-02-09"), NOW);
    expect(v.urssafExpireDans).toBe(-1);
    expect(v.urssaf).toBe("expiree");
    expect(v.etatLePlusGrave).toBe("enRetard");
  });

  it("alerte à trente jours de la remise suivante, pas à trente et un", () => {
    expect(computeVigilance(avecRemise("2026-03-09"), NOW).urssaf).toBe("expire_bientot");
    expect(computeVigilance(avecRemise("2026-03-10"), NOW).urssaf).toBe("a_jour");
  });

  it("une validité saisie plus proche que la remise suivante l'emporte", () => {
    const v = computeVigilance(
      avecRemise("2026-08-01", { attestationUrssafValableJusquA: jour("2026-09-01") }),
      NOW,
    );
    expect(civil(v.urssafARedemanderLe)).toBe("2026-09-01");
    expect(civil(v.urssafRemiseSuivante)).toBe("2027-02-01");
  });

  it("une validité lointaine ne repousse pas la remise suivante", () => {
    const v = computeVigilance(
      avecRemise("2026-03-01", { attestationUrssafValableJusquA: jour("2030-12-31") }),
      NOW,
    );
    expect(civil(v.urssafARedemanderLe)).toBe("2026-09-01");
    expect(v.urssafExpireDans).toBe(22);
    expect(v.urssaf).toBe("expire_bientot");
  });

  it("n'applique le rythme qu'à l'URSSAF — la RC Pro n'a pas de périodicité légale", () => {
    const v = computeVigilance(
      prestataireFake({
        assuranceRcProValableJusquA: jour("2027-06-30"),
        attestationUrssafRemiseLe: jour("2024-01-01"),
      }),
      NOW,
    );
    expect(v.rcPro).toBe("a_jour");
  });

  it("garde six mois pour périodicité — la constante est celle du texte", () => {
    expect(MOIS_RENOUVELLEMENT_URSSAF).toBe(6);
  });
});

describe("attestation URSSAF — « datant de moins de six mois » (art. D. 8222-5, 1°)", () => {
  const remiseLe10Aout = (emise: string) =>
    prestataireFake({
      attestationUrssafCle: "urssaf/key",
      attestationUrssafRemiseLe: jour("2026-08-10"),
      attestationUrssafEmiseLe: jour(emise),
    });

  it("émise six mois pile avant la remise : ce n'est pas « moins de six mois »", () => {
    const v = computeVigilance(remiseLe10Aout("2026-02-10"), NOW);
    expect(v.urssaf).toBe("emission_hors_delai");
    expect(v.etatLePlusGrave).toBe("enRetard");
    expect(mentionUrssaf(v)).toContain("« datant de moins de six mois »");
  });

  it("émise la veille des six mois : l'attestation est à jour", () => {
    const v = computeVigilance(remiseLe10Aout("2026-02-11"), NOW);
    expect(v.urssaf).toBe("a_jour");
    // La RC Pro, non fournie, garde l'ardoise ; l'URSSAF ne pèse plus.
    expect(v.piecesExpirees).toBe(0);
  });

  it("émise le jour de la remise : à jour", () => {
    expect(computeVigilance(remiseLe10Aout("2026-08-10"), NOW).urssaf).toBe("a_jour");
  });

  it("une remise suivante déjà passée l'emporte sur l'écart d'émission", () => {
    const v = computeVigilance(
      prestataireFake({
        attestationUrssafRemiseLe: jour("2026-01-01"),
        attestationUrssafEmiseLe: jour("2025-01-01"),
      }),
      NOW,
    );
    expect(v.urssaf).toBe("expiree");
  });
});

describe("attestation URSSAF — dates vides : jamais « à jour »", () => {
  const VALIDITE_LOINTAINE = { attestationUrssafValableJusquA: jour("2030-12-31") };

  it("sans remise ni émission, la pièce est « à dater », pas à jour", () => {
    const v = computeVigilance(
      prestataireFake({ attestationUrssafCle: "urssaf/key", ...VALIDITE_LOINTAINE }),
      NOW,
    );
    expect(v.urssaf).toBe("a_dater");
    expect(v.urssafDatesNonRenseignees).toEqual(["remise", "emission"]);
    expect(v.etatLePlusGrave).toBe("aPlanifier");
    expect(mentionUrssaf(v)).toContain("Dates de remise et d'émission non renseignées.");
    expect(mentionUrssaf(v)).toContain("À saisir sur la fiche du prestataire.");
  });

  it("l'émission seule manquante suffit à refuser « à jour »", () => {
    const v = computeVigilance(
      prestataireFake({ attestationUrssafRemiseLe: jour("2026-08-01") }),
      NOW,
    );
    expect(v.urssaf).toBe("a_dater");
    expect(v.urssafDatesNonRenseignees).toEqual(["emission"]);
    expect(mentionUrssaf(v)).toContain("Date d'émission non renseignée.");
    // La remise, elle, est dite, avec la suivante.
    expect(mentionUrssaf(v)).toContain("Remise suivante le");
  });

  it("une pièce déposée sans aucune date n'a pas d'échéance, et n'est pas à jour", () => {
    const v = computeVigilance(prestataireFake({ attestationUrssafCle: "urssaf/key" }), NOW);
    expect(v.urssaf).toBe("a_dater");
    expect(v.urssafExpireDans).toBeNull();
    expect(v.urssafARedemanderLe).toBeNull();
  });

  it("aucune combinaison de dates manquantes ne rend « à jour »", () => {
    // Borne basse de la règle, balayée plutôt que citée : chaque manière
    // d'avoir une pièce (clé, validité, remise, émission) sans l'une des deux
    // dates du texte.
    const presences: Partial<Prestataire>[] = [
      { attestationUrssafCle: "k" },
      VALIDITE_LOINTAINE,
      { attestationUrssafRemiseLe: jour("2026-08-01") },
      { attestationUrssafEmiseLe: jour("2026-08-01") },
      { attestationUrssafCle: "k", ...VALIDITE_LOINTAINE, attestationUrssafRemiseLe: jour("2026-08-01") },
    ];
    for (const p of presences) {
      const v = computeVigilance(prestataireFake(p), NOW);
      expect(v.urssaf, JSON.stringify(p)).not.toBe("a_jour");
      expect(v.etatLePlusGrave, JSON.stringify(p)).not.toBeNull();
    }
  });

  it("le repli sur `updatedAt` ne fait qu'aggraver : plus de six mois sans dépôt, c'est à redemander", () => {
    // `updatedAt` est postérieur à tout dépôt : plus de six mois sans
    // écriture sur la fiche, la pièce en dossier a plus de six mois de remise.
    const ancien = computeVigilance(
      prestataireFake({
        attestationUrssafCle: "urssaf/key",
        ...VALIDITE_LOINTAINE,
        updatedAt: new Date("2026-02-09T07:00:00Z"),
      }),
      NOW,
    );
    expect(ancien.urssaf).toBe("a_dater_depot_ancien");
    expect(ancien.etatLePlusGrave).toBe("enRetard");
    expect(mentionUrssaf(ancien)).toContain(
      "Rien n'a été déposé sur cette fiche depuis plus de six mois.",
    );
    // Six mois pile : pas encore — même bascule que l'échéance datée.
    const pile = computeVigilance(
      prestataireFake({
        attestationUrssafCle: "urssaf/key",
        ...VALIDITE_LOINTAINE,
        updatedAt: new Date("2026-02-10T07:00:00Z"),
      }),
      NOW,
    );
    expect(pile.urssaf).toBe("a_dater");
  });
});

describe("computeVigilance — extrait Kbis", () => {
  it("expose l'âge de l'extrait sans en tirer de statut", () => {
    const v = computeVigilance(
      prestataireFake({
        kbisCle: "kbis/key",
        kbisDateEmission: jour("2026-05-12"),
      }),
      NOW,
    );
    expect(v.kbis).toBe("present");
    expect(v.kbisEmisLe).toEqual(jour("2026-05-12"));
    expect(v.kbisAgeJours).toBe(90);
    // Aucune périodicité citable pour le Kbis : il ne pèse pas sur les
    // alertes, même vieux de plusieurs années.
    expect(v.alertesOuvertes).toBe(2);
  });

  it("ne rend aucun âge quand la date d'émission n'est pas renseignée", () => {
    const v = computeVigilance(
      prestataireFake({ kbisCle: "kbis/key" }),
      NOW,
    );
    expect(v.kbisEmisLe).toBeNull();
    expect(v.kbisAgeJours).toBeNull();
  });
});

describe("messageExpiration", () => {
  it("produit un message humain pour chaque plage", () => {
    expect(messageExpiration(null)).toBe("Non renseignée");
    expect(messageExpiration(-3)).toBe("Expirée il y a 3 j");
    expect(messageExpiration(0)).toBe("Expire aujourd'hui");
    expect(messageExpiration(1)).toBe("Expire demain");
    expect(messageExpiration(15)).toBe("Expire dans 15 j");
    expect(messageExpiration(120)).toBe("Valide 120 j de plus");
  });
});

describe("etatLePlusGrave — la couleur ne se déduit pas du compte", () => {
  /**
   * `alertesOuvertes` fond trois états dans un chiffre : pièce expirée, pièce
   * qui expire bientôt, pièce jamais fournie. Les écrans qui s'en servaient
   * pour CHOISIR UNE COULEUR peignaient donc en rose un prestataire créé le
   * matin même, dont aucune pièce n'a d'échéance — au-dessus de ses propres
   * pastilles « Non fournie » en ardoise, sur la même page.
   *
   * Corrigé trois fois : la carte, le compteur d'en-tête, puis la fiche. Les
   * deux premières fois sans test, d'où la troisième. `alertesOuvertes` était
   * assuré cinq fois dans ce fichier, `etatLePlusGrave` jamais.
   */
  it("une pièce jamais fournie n'est pas un retard", () => {
    const v = computeVigilance(
      prestataireFake({
        attestationUrssafValableJusquA: null,
        assuranceRcProValableJusquA: null,
      }),
      NOW,
    );
    expect(v.alertesOuvertes).toBe(2);
    expect(v.piecesManquantes).toBe(2);
    expect(v.piecesExpirees).toBe(0);
    // Le point du test : deux alertes, et pourtant PAS de rose.
    expect(v.etatLePlusGrave).toBe("aPlanifier");
  });

  it("une pièce expirée l'emporte sur tout le reste", () => {
    const v = computeVigilance(
      prestataireFake({
        ...DATES_OK,
        attestationUrssafValableJusquA: jour("2026-07-01"),
        assuranceRcProValableJusquA: null,
      }),
      NOW,
    );
    expect(v.piecesExpirees).toBe(1);
    expect(v.etatLePlusGrave).toBe("enRetard");
  });

  it("une échéance proche l'emporte sur une absence, pas sur une expiration", () => {
    const v = computeVigilance(
      prestataireFake({
        ...DATES_OK,
        attestationUrssafValableJusquA: jour("2026-08-20"),
        assuranceRcProValableJusquA: null,
      }),
      NOW,
    );
    expect(v.piecesProches).toBe(1);
    expect(v.piecesManquantes).toBe(1);
    expect(v.etatLePlusGrave).toBe("proche");
  });

  it("rien à signaler quand les deux pièces sont à jour", () => {
    const v = computeVigilance(
      prestataireFake({
        ...DATES_OK,
        attestationUrssafValableJusquA: jour("2026-09-20"),
        assuranceRcProValableJusquA: jour("2027-06-01"),
      }),
      NOW,
    );
    expect(v.alertesOuvertes).toBe(0);
    expect(v.etatLePlusGrave).toBeNull();
  });
});

/**
 * L'ancrage des six mois — décision B2, 2026-09-27.
 *
 * Jusqu'à cette date, la borne partait de `updatedAt` : toute écriture sur la
 * fiche la repoussait de six mois, et l'alerte n'arrivait jamais. Elle part
 * désormais de la remise saisie. Ces tests rougissent si `updatedAt` redevient
 * la source.
 */
describe("l'échéance ne dépend plus de la dernière modification de la fiche", () => {
  const REMISE = jour("2026-03-01");

  it("une retouche de la fiche ne déplace plus l'échéance", () => {
    const instantanes = [
      new Date("2024-01-01T07:00:00Z"),
      new Date("2026-03-10T07:00:00Z"),
      NOW,
    ].map((updatedAt) =>
      computeVigilance(
        prestataireFake({
          attestationUrssafValableJusquA: jour("2030-12-31"),
          attestationUrssafRemiseLe: REMISE,
          attestationUrssafEmiseLe: jour("2026-02-20"),
          updatedAt,
        }),
        NOW,
      ),
    );
    for (const v of instantanes) {
      // La valeur, pas seulement l'égalité entre elles : six mois après la
      // remise, pas après une écriture.
      expect(civil(v.urssafARedemanderLe)).toBe("2026-09-01");
      expect(v.urssafExpireDans).toBe(22);
      expect(v.urssaf).toBe("expire_bientot");
    }
  });

  it("le calendrier date l'attestation par la même règle, sans `updatedAt`", () => {
    expect(
      civil(
        echeanceAttestationUrssaf({
          attestationUrssafValableJusquA: jour("2030-12-31"),
          attestationUrssafRemiseLe: REMISE,
        }),
      ),
    ).toBe("2026-09-01");
  });

  it("les surfaces qui affichent l'échéance URSSAF disent ses dates", () => {
    // Un écran qui affiche `urssafExpireDans` sans `mentionUrssaf` montre
    // « Expire dans 22 j » sans dire depuis quelle remise, ni qu'une date
    // manque. Balayage, pas liste : un écran neuf est tenu d'office.
    const fautifs = fichiersAffichant("urssafExpireDans").filter(
      (f) => !readFileSync(f, "utf8").includes("mentionUrssaf("),
    );
    expect(fautifs).toEqual([]);
  });

  it("le balayage voit vraiment un écran, sinon il ne prouve rien", () => {
    expect(fichiersAffichant("urssafExpireDans").length).toBeGreaterThan(0);
  });

  it("le palliatif ne revient sur aucun écran", () => {
    // La phrase qui avouait l'ancrage sur la fiche, et sa constante.
    // Blancs écrasés : une phrase de JSX se coupe en fin de ligne, et la
    // coupure seule suffisait à faire passer la phrase sous la garde.
    const traces = [
      "MENTION_ANCRAGE_URSSAF",
      "urssafPlafonneeParLeSemestre",
      "dernière modification de cette fiche",
      "dernière modification de la fiche",
    ];
    const ecrans = fichiersAffichant("prestataire").concat(
      fichiersAffichant("Prestataire"),
    );
    expect(ecrans.length).toBeGreaterThan(0);
    for (const f of ecrans) {
      const plat = readFileSync(f, "utf8").replace(/\s+/g, " ");
      for (const trace of traces) {
        expect(plat.includes(trace), `${f} : ${trace}`).toBe(false);
      }
    }
  });
});


describe("saisie des dates de l'attestation (formulaires)", () => {
  it("refuse une remise ou une émission dans le futur, et une émission après la remise", () => {
    const champs = (r?: string, e?: string) =>
      erreursDatesAttestation(r ? jour(r) : undefined, e ? jour(e) : undefined, NOW).map(
        (x) => `${x.champ}: ${x.message}`,
      );
    expect(champs("2026-08-11")).toEqual([
      "attestationUrssafRemiseLe: La date de remise ne peut pas être dans le futur",
    ]);
    expect(champs(undefined, "2026-08-11")).toEqual([
      "attestationUrssafEmiseLe: La date d'émission ne peut pas être dans le futur",
    ]);
    expect(champs("2026-08-01", "2026-08-02")).toEqual([
      "attestationUrssafEmiseLe: L'attestation ne peut pas être émise après sa remise",
    ]);
  });

  it("accepte aujourd'hui, le même jour, et une émission ancienne — un fait à montrer, pas à cacher", () => {
    expect(erreursDatesAttestation(jour("2026-08-10"), jour("2026-08-10"), NOW)).toEqual([]);
    expect(erreursDatesAttestation(jour("2026-08-10"), jour("2025-01-01"), NOW)).toEqual([]);
    expect(erreursDatesAttestation(undefined, undefined, NOW)).toEqual([]);
  });

  it("le schéma de la fiche porte la règle", () => {
    const r = remiseAttestationSchema.safeParse({
      attestationUrssafRemiseLe: "2026-08-01",
      attestationUrssafEmiseLe: "2026-08-05",
    });
    expect(r.success).toBe(false);
    const ok = remiseAttestationSchema.safeParse({
      attestationUrssafRemiseLe: "",
      attestationUrssafEmiseLe: "",
    });
    expect(ok.success && ok.data).toEqual({});
  });
});
