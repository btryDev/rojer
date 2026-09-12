import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ajouterJours, instantCivil } from "@/lib/dates";
import { evaluerEtatDuerp } from "./duerp";
import {
  genererRecommandations,
  type EntreeRecos,
} from "./recommandations";

// 20 avril 2026, 10:00 heure de Paris.
const NOW = instantCivil(2026, 4, 20, 10);

/** Une date civile décalée de N jours — jamais un `+ N × 86 400 000`, qui
 *  décale d'une heure aux changements d'heure. */
function dateDecalee(joursDeNow: number): Date {
  return ajouterJours(instantCivil(2026, 4, 20), joursDeNow);
}

/** État de DUERP dont la dernière version a `ageJours` jours, dans une
 *  entreprise soumise à la mise à jour annuelle. */
function duerpDe(ageJours: number | null, effectif = 20) {
  return evaluerEtatDuerp(
    {
      ouvert: true,
      dateDerniereVersion: ageJours === null ? null : dateDecalee(-ageJours),
      effectif,
    },
    NOW,
  );
}

/**
 * Dossier « mûr » : équipements déclarés, secteur DUERP choisi, au moins
 * un rapport déposé — aucune règle d'amorçage ne se déclenche, les tests
 * historiques ne testent que les urgences réelles.
 */
function baseEntree(): EntreeRecos {
  return {
    etablissementId: "etab-x",
    verifications: [],
    actions: [],
    nbEquipements: 3,
    duerpSecteurChoisi: true,
    nbRapports: 2,
    transmissions: {
      domainesSansPrestataire: [],
      obligationsSupposantUnePersonne: [],
    },
  };
}

describe("genererRecommandations — tri par urgence", () => {
  it("liste vide quand rien à faire", () => {
    expect(
      genererRecommandations(baseEntree(), { now: NOW }).length,
    ).toBe(0);
  });

  it("vérif dépassée passe en tête", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "depassee",
          datePrevue: dateDecalee(-10),
          libelleObligation: "Vérification élec",
          equipementLibelle: "TGBT",
          archiveLe: null,
        },
      ],
      actions: [
        {
          id: "a1",
          statut: "ouverte",
          echeance: dateDecalee(-5),
          libelle: "Refaire câble",
        },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs[0].kind).toBe("verif_depassee");
    expect(recs[1].kind).toBe("action_en_retard");
  });

  it("vérif dépassée plus ancienne avant plus récente", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v-recent",
          statut: "depassee",
          datePrevue: dateDecalee(-1),
          libelleObligation: "VMC",
          equipementLibelle: "CTA",
          archiveLe: null,
        },
        {
          id: "v-ancien",
          statut: "depassee",
          datePrevue: dateDecalee(-30),
          libelleObligation: "Extincteurs",
          equipementLibelle: "Extincteurs",
          archiveLe: null,
        },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs[0].titre).toContain("Extincteurs");
  });

  it("tronque à 5 items max par défaut", () => {
    const verifs = Array.from({ length: 10 }, (_, i) => ({
      id: `v-${i}`,
      statut: "depassee" as const,
      datePrevue: dateDecalee(-i),
      libelleObligation: `Vérif ${i}`,
      equipementLibelle: "X",
      archiveLe: null,
    }));
    const e: EntreeRecos = { ...baseEntree(), verifications: verifs };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs.length).toBe(5);
  });

  it("accepte une limite custom", () => {
    const actions = Array.from({ length: 10 }, (_, i) => ({
      id: `a-${i}`,
      statut: "ouverte" as const,
      echeance: dateDecalee(-i - 1),
      libelle: `Action ${i}`,
    }));
    const e: EntreeRecos = { ...baseEntree(), actions };
    const recs = genererRecommandations(e, { now: NOW, limite: 3 });
    expect(recs.length).toBe(3);
  });
});

describe("genererRecommandations — catégories", () => {
  it("vérif à venir sous 7 jours", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "planifiee",
          datePrevue: dateDecalee(3),
          libelleObligation: "Contrôle alarme",
          equipementLibelle: "SSI",
          archiveLe: null,
        },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs[0].kind).toBe("verif_proche");
  });

  it("vérif à venir au-delà de 7 jours — ignorée", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "planifiee",
          datePrevue: dateDecalee(30),
          libelleObligation: "Contrôle",
          equipementLibelle: "X",
          archiveLe: null,
        },
      ],
    };
    expect(genererRecommandations(e, { now: NOW }).length).toBe(0);
  });

  it("action à venir sous 15 jours", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      actions: [
        {
          id: "a1",
          statut: "ouverte",
          echeance: dateDecalee(10),
          libelle: "Remplacer BAES",
        },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs[0].kind).toBe("action_proche");
  });

  it("DUERP périmé → recommande la mise à jour", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      duerp: duerpDe(400),
      duerpId: "duerp-x",
    };
    const recs = genererRecommandations(e, { now: NOW });
    const reco = recs.find((r) => r.kind === "duerp_a_jour");
    expect(reco?.titre).toBe("DUERP à mettre à jour");
    expect(reco?.sousTitre).toBe("Dernière version il y a 13 mois");
  });

  it("DUERP récent → pas de recommandation", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      duerp: duerpDe(100),
      duerpId: "duerp-x",
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs.some((r) => r.kind === "duerp_a_jour")).toBe(false);
  });

  it("prévient un mois avant l'échéance annuelle", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      duerp: duerpDe(350),
      duerpId: "duerp-x",
    };
    const reco = genererRecommandations(e, { now: NOW }).find(
      (r) => r.kind === "duerp_a_jour",
    );
    expect(reco?.sousTitre).toBe("Mise à jour annuelle à prévoir");
  });

  it("ne parle pas de « mise à jour » quand aucune version n'a été validée", () => {
    // Un DUERP tout juste ouvert n'a pas « plus de douze mois » : il n'a
    // simplement rien de figé. Deux situations, deux libellés.
    const e: EntreeRecos = {
      ...baseEntree(),
      duerp: duerpDe(null),
      duerpId: "duerp-x",
    };
    const reco = genererRecommandations(e, { now: NOW }).find(
      (r) => r.kind === "duerp_a_jour",
    );
    expect(reco?.titre).toBe("Validez la première version de votre DUERP");
  });

  it("ne reproche pas l'ancienneté sous onze salariés (art. R. 4121-2)", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      duerp: duerpDe(400, 4),
      duerpId: "duerp-x",
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs.some((r) => r.kind === "duerp_a_jour")).toBe(false);
  });

  it("action clôturée ignorée", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      actions: [
        {
          id: "a-closed",
          statut: "levee",
          echeance: dateDecalee(-30),
          libelle: "Déjà fait",
        },
      ],
    };
    expect(genererRecommandations(e, { now: NOW }).length).toBe(0);
  });
});

describe("genererRecommandations — définition du retard (ADR-011)", () => {
  it("remonte une vérification « planifiee » dont la date est passée", () => {
    // Le statut `depassee` n'est écrit qu'à la génération du calendrier et
    // n'est jamais réévalué : « planifiée puis oubliée » est l'état normal
    // d'un contrôle en retard. Il n'entrait dans aucune règle — le bandeau
    // annonçait des échéances à traiter, la file de travail restait vide.
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "planifiee",
          datePrevue: dateDecalee(-40),
          libelleObligation: "Vérification élec",
          equipementLibelle: "TGBT",
          archiveLe: null,
        },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs[0].kind).toBe("verif_depassee");
    expect(recs[0].sousTitre).toContain("échéance dépassée");
  });

  it("remonte une vérification « a_planifier » dont la date est passée", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "a_planifier",
          datePrevue: dateDecalee(-3),
          libelleObligation: "Extincteurs",
          equipementLibelle: "Extincteurs",
          archiveLe: null,
        },
      ],
    };
    expect(genererRecommandations(e, { now: NOW })[0].kind).toBe(
      "verif_depassee",
    );
  });

  it("ne compte pas les jours d'une occurrence jamais planifiée", () => {
    // Sa `datePrevue` est la date de génération du calendrier, pas un
    // rendez-vous : la transmettre faisait afficher « dépassée depuis
    // 107 j », où 107 mesurait l'âge du dossier. Le fait vrai est
    // qu'aucune vérification n'est enregistrée.
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "a_planifier",
          datePrevue: dateDecalee(-107),
          libelleObligation: "Extincteurs",
          equipementLibelle: "Extincteurs",
          archiveLe: null,
        },
      ],
    };
    const reco = genererRecommandations(e, { now: NOW })[0];

    expect(reco.date).toBeUndefined();
    expect(reco.sousTitre).toContain("aucune vérification enregistrée");
    expect(reco.sousTitre).not.toContain("dépassée");
  });

  it("garde la date d'une échéance réellement manquée", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "planifiee",
          datePrevue: dateDecalee(-40),
          libelleObligation: "Vérification élec",
          equipementLibelle: "TGBT",
          archiveLe: null,
        },
      ],
    };
    const reco = genererRecommandations(e, { now: NOW })[0];

    expect(reco.date).toEqual(dateDecalee(-40));
    expect(reco.sousTitre).toContain("échéance dépassée");
  });

  it("n'étiquette pas « dépassée » une occurrence datée d'aujourd'hui", () => {
    // Deux règles opposées cohabitaient dans le même dossier : la requête
    // du dashboard documentait qu'`a_planifier` n'est pas un retard, le
    // moteur de recos la classait « échéance dépassée » dès le jour même.
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "a_planifier",
          datePrevue: dateDecalee(0),
          libelleObligation: "Extincteurs",
          equipementLibelle: "Extincteurs",
          archiveLe: null,
        },
      ],
    };
    expect(
      genererRecommandations(e, { now: NOW }).some(
        (r) => r.kind === "verif_depassee",
      ),
    ).toBe(false);
  });

  it("ignore une occurrence dont le STATUT dit qu'elle a eu lieu", () => {
    // Depuis l'ADR-034, c'est le statut — et lui seul — qui purge l'échéance.
    // Il n'en reste un de réalisé que sur une obligation sans rendez-vous
    // suivant, consommée.
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "realisee_conforme",
          datePrevue: dateDecalee(-1),
          libelleObligation: "Contrôle fait",
          equipementLibelle: "TGBT",
          archiveLe: null,
        },
      ],
    };
    expect(genererRecommandations(e, { now: NOW })).toHaveLength(0);
  });

  it("propose une ligne roulée dont l'échéance ouverte est passée, colonne gelée ou non", () => {
    // CE TEST DISAIT L'INVERSE, et c'était juste sous l'ancien modèle : une
    // `dateRealisee` renseignée suffisait à sortir la ligne des comptes. Depuis
    // que la ligne ne porte que son échéance OUVERTE (ADR-034), elle roule au
    // dépôt d'un rapport et garde un statut vivant ; la colonne est gelée, plus
    // aucun prédicat ne la lit. Une ligne contrôlée l'an dernier dont
    // l'échéance suivante est dépassée est un retard — c'est le défaut du lot
    // 3 bis, qui la taisait.
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "planifiee",
          datePrevue: dateDecalee(-1),
          dateRealisee: dateDecalee(-1),
          libelleObligation: "Contrôle fait",
          equipementLibelle: "TGBT",
          archiveLe: null,
        },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs).toHaveLength(1);
    expect(recs[0].kind).toBe("verif_depassee");
  });

  it("retient une vérification planifiée aujourd'hui comme « proche »", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v1",
          statut: "planifiee",
          datePrevue: dateDecalee(0),
          libelleObligation: "Contrôle alarme",
          equipementLibelle: "SSI",
          archiveLe: null,
        },
      ],
    };
    expect(genererRecommandations(e, { now: NOW })[0].kind).toBe("verif_proche");
  });

  it("une action dont l'échéance tombe aujourd'hui est « à venir », pas en retard", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      actions: [
        {
          id: "a1",
          statut: "en_cours",
          echeance: dateDecalee(0),
          libelle: "Remplacer BAES",
        },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs).toHaveLength(1);
    expect(recs[0].kind).toBe("action_proche");
  });
});

describe("genererRecommandations — amorçage (règles 6-8)", () => {
  it("dossier vierge → une seule reco : déclarer les équipements", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      nbEquipements: 0,
      duerpSecteurChoisi: false,
      nbRapports: 0,
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs).toHaveLength(1);
    expect(recs[0].kind).toBe("amorce_equipements");
    expect(recs[0].href).toBe("/etablissements/etab-x/equipements");
  });

  it("équipements déclarés mais secteur DUERP non choisi → amorce DUERP", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      nbEquipements: 2,
      duerpSecteurChoisi: false,
      nbRapports: 1,
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs).toHaveLength(1);
    expect(recs[0].kind).toBe("amorce_duerp");
    expect(recs[0].href).toBe("/etablissements/etab-x/duerp");
  });

  it("vérifications planifiées sans aucun rapport → amorce premier rapport", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      nbRapports: 0,
  transmissions: { domainesSansPrestataire: [], obligationsSupposantUnePersonne: [] },
      verifications: [
        {
          id: "v1",
          statut: "planifiee",
          datePrevue: dateDecalee(60),
          libelleObligation: "Vérif élec",
          equipementLibelle: "TGBT",
          archiveLe: null,
        },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs).toHaveLength(1);
    expect(recs[0].kind).toBe("amorce_rapport");
    expect(recs[0].href).toBe("/etablissements/etab-x/calendrier");
  });

  it("une urgence réelle passe toujours devant une amorce", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      duerpSecteurChoisi: false,
      verifications: [
        {
          id: "v1",
          statut: "depassee",
          datePrevue: dateDecalee(-10),
          libelleObligation: "Vérif élec",
          equipementLibelle: "TGBT",
          archiveLe: null,
        },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs[0].kind).toBe("verif_depassee");
    expect(recs.some((r) => r.kind === "amorce_duerp")).toBe(true);
  });

  it("dossier mûr → aucune amorce", () => {
    const recs = genererRecommandations(baseEntree(), { now: NOW });
    expect(recs).toHaveLength(0);
  });

  it("pas d'amorce DUERP tant qu'aucun équipement n'est déclaré (une étape à la fois)", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      nbEquipements: 0,
      duerpSecteurChoisi: false,
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs.some((r) => r.kind === "amorce_duerp")).toBe(false);
    expect(recs.some((r) => r.kind === "amorce_equipements")).toBe(true);
  });
});

describe("genererRecommandations — href", () => {
  it("génère les bons chemins d'URL", () => {
    const e: EntreeRecos = {
      ...baseEntree(),
      verifications: [
        {
          id: "v-123",
          statut: "depassee",
          datePrevue: dateDecalee(-5),
          libelleObligation: "Test",
          equipementLibelle: "E",
          archiveLe: null,
        },
      ],
    };
    const recs = genererRecommandations(e, { now: NOW });
    expect(recs[0].href).toBe("/etablissements/etab-x/verifications/v-123");
  });
});

describe("ce que la carte peut afficher sans le couper", () => {
  /**
   * Une garantie sur un plan que les tests de contenu ne voient pas : la place.
   *
   * Le défaut qui l'a fait écrire : un sous-titre de 213 signes, juste au mot
   * près, mesuré dans le DOM à 1 115 px pour 638 px disponibles — **tronqué à
   * 57 %**. Tout ce qu'une correction venait d'ajouter était dans la partie
   * coupée, à commencer par la clause qui retire le ton de reproche. Et la
   * coupe tombait au milieu d'une référence d'article : « (D. 46… ».
   *
   * ⚠ CE QUE CE TEST NE FAIT PAS, et il faut le lire avant de s'y fier : il
   * compte des CARACTÈRES, pas des pixels. Un caractère n'a pas de largeur
   * fixe, « il » et « MM » ne mesurent pas la même chose, et rien ici ne rend
   * la page. C'est un garde-fou par approximation, pas une mesure.
   *
   * Il vaut quand même mieux que rien, et voici sur quoi il est calibré : le
   * contrôle visuel a mesuré un sous-titre de 104 signes occupant exactement
   * 638 px, soit la largeur disponible. Une ligne ≈ 104 signes, deux lignes
   * (`line-clamp-2`) ≈ 208. Le budget est fixé à 170 pour garder de la marge —
   * les glyphes larges, et la date que `CarteTache` ajoute au sous-titre sur
   * les recommandations datées.
   *
   * ⚠ CE SEUIL A ÉTÉ FAUX PENDANT UN TOUR, et pas pour la raison annoncée.
   * Sa première rédaction disait déjà « je compte des caractères, pas des
   * pixels » — c'était honnête, et ce n'était pas la limite. Le vrai défaut
   * était ailleurs : le seuil valait deux lignes alors que le widget RÉELLEMENT
   * AFFICHÉ n'en avait qu'une. Entre 104 et 170 signes, l'écran refusait ce
   * que ce test acceptait, et une phrase de 138 signes est passée ici avant
   * d'être coupée là-bas.
   *
   * Une approximation déclarée reste une approximation ; un seuil calibré sur
   * le mauvais rendu est simplement faux. Ce qui le rend juste aujourd'hui
   * n'est pas ce fichier mais `board-meta.test.ts`, qui garde que les DEUX
   * widgets clampent à deux lignes. Si l'un revenait à une ligne, ce budget
   * redeviendrait faux pour lui seul — et c'est ce test-là qui le dirait.
   *
   * Ce qu'il attrape réellement : une phrase qui DOUBLE de longueur, ce qui est
   * la forme qu'a prise le défaut. Ce qu'il laisserait passer : un
   * dépassement de quelques signes en typographie large. Le dire plutôt que de
   * le simuler.
   */
  const BUDGET = 170;

  /** Les sous-titres écrits en dur, quelle que soit la branche qui les produit. */
  function sousTitresLitteraux(): { fichier: string; texte: string }[] {
    const fichiers = [
      "src/lib/dashboard/recommandations.ts",
      "src/lib/prestataires/domaines.ts",
    ];
    const out: { fichier: string; texte: string }[] = [];
    for (const f of fichiers) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      for (const m of src.matchAll(/sousTitre:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)) {
        out.push({ fichier: f, texte: m[1] });
      }
    }
    return out;
  }

  it("aucun sous-titre ne dépasse ce que deux lignes tiennent", () => {
    const trop = sousTitresLitteraux()
      .filter((s) => s.texte.length > BUDGET)
      .map((s) => `${s.fichier} → ${s.texte.length} signes : ${s.texte.slice(0, 60)}…`);

    expect(
      trop,
      `Ces sous-titres dépassent ${BUDGET} signes et seront tronqués à ` +
        `l'écran, en silence. Raccourcir, ou déplacer ce qui ne tient pas vers ` +
        `une surface qui a la place — l'obligation porte ses références, la ` +
        `carte oriente.`,
    ).toEqual([]);
  });

  it("le budget garde quelque chose : des sous-titres existent, et ils sont longs", () => {
    // Contre-épreuve. Sans elle, une expression régulière qui cesserait de
    // trouver les sous-titres rendrait ce test vert et vide — le mode d'échec
    // le plus courant d'une garde qui lit du source.
    const tous = sousTitresLitteraux();
    expect(tous.length, "Plus aucun sous-titre trouvé : la garde ne garde rien").toBeGreaterThan(5);
    expect(
      Math.max(...tous.map((s) => s.texte.length)),
      "Tous les sous-titres sont courts : le budget ne contraint plus rien",
    ).toBeGreaterThan(80);
  });
});
