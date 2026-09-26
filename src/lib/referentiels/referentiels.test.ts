import { describe, expect, it } from "vitest";
import { ACTIVITES_PUBLIEES, ACTIVITES_RETIREES } from "./activites-publiees";
import {
  referentielsSectoriels,
  risquesTransverses,
  questionsDetectionTransverses,
  tousRisquesConnus,
  trouverReferentielParNaf,
} from "./index";

describe("referentiels", () => {
  it("résout un NAF de restauration vers le référentiel restauration", () => {
    expect(trouverReferentielParNaf("56.10A")?.id).toBe("restauration");
    expect(trouverReferentielParNaf("56.10a")?.id).toBe("restauration");
  });

  it("ne résout rien pour un NAF inconnu", () => {
    expect(trouverReferentielParNaf("99.99Z")).toBeUndefined();
    expect(trouverReferentielParNaf(null)).toBeUndefined();
  });

  it("tousRisquesConnus contient les risques sectoriels et transverses", () => {
    const map = tousRisquesConnus();
    // au moins un risque sectoriel connu (sourcé INRS ED 880)
    expect(map.has("resto-coupure")).toBe(true);
    // et un transverse (ED 840 fiche 4)
    expect(map.has("trv-routier")).toBe(true);
  });

  it("aucun ID de risque n'est dupliqué entre secteurs et transverses", () => {
    const transIds = new Set(risquesTransverses.map((r) => r.id));
    for (const ref of referentielsSectoriels) {
      for (const r of ref.risques) {
        expect(transIds.has(r.id)).toBe(false);
      }
    }
  });

  it("les unitesAssociees d'un risque existent dans le référentiel", () => {
    for (const ref of referentielsSectoriels) {
      const unitIds = new Set(ref.unitesTravailSuggerees.map((u) => u.id));
      for (const r of ref.risques) {
        for (const u of r.unitesAssociees) {
          expect(unitIds.has(u)).toBe(true);
        }
      }
    }
  });
});

/**
 * Les activités non couvertes portent une contrainte de plus que le reste du
 * référentiel : leur identifiant est **persisté** dans les réponses du
 * dirigeant (`ReponsesActivites`) et figé dans les snapshots de version,
 * conservés quarante ans. Une collision d'identifiants entre deux secteurs
 * ferait basculer une réponse d'une activité à une autre à la relecture — un
 * « oui » à la découpe de viande devenu un « oui » à autre chose.
 */
describe("sourçage des risques", () => {
  /**
   * Un risque proposé au dirigeant sans source vérifiable est une cotation
   * inventée : il l'accepte telle quelle, et le document unique porte un
   * chiffre que personne ne peut justifier. La description est le seul endroit
   * qui porte cette source — le type `RisqueReferentiel` n'a pas de champ
   * dédié, à la différence des obligations de conformité.
   */
  const SOURCE = /\bED\s?\d{3,4}\b|\bTJ\s?\d+\b|\bINRS\b|\bOiRA\b|\bart\.\s?[RLD]\.\s?\d/;

  it("chaque risque transverse cite sa source", () => {
    for (const r of risquesTransverses) {
      expect(r.description, `${r.id} : description absente`).toBeDefined();
      expect(SOURCE.test(r.description ?? ""), `${r.id} → « ${r.description} »`).toBe(
        true,
      );
    }
  });

  /**
   * Cinq risques de restauration sont entrés au référentiel sans description,
   * ~~cinq~~ quatre depuis le 2026-09-26 (`resto-incendie` sourcé, C35),
   * donc sans source. Ils ne sont pas corrigés ici : leur rédaction demande
   * d'ouvrir les fiches INRS correspondantes, pas de deviner un numéro.
   * La liste est figée pour que la dette reste comptée et ne grossisse pas —
   * tout nouveau risque sans source fait échouer la suite.
   */
  const SANS_SOURCE_TOLERES = [
    "resto-brulure",
    "resto-chute-hauteur",
    "resto-chimique",
    "resto-ambiance-thermique",
  ];

  it("chaque risque sectoriel cite sa source", () => {
    for (const ref of referentielsSectoriels) {
      for (const r of ref.risques) {
        if (SANS_SOURCE_TOLERES.includes(r.id)) continue;
        expect(r.description, `${r.id} : description absente`).toBeDefined();
        expect(SOURCE.test(r.description ?? ""), `${r.id} → « ${r.description} »`).toBe(
          true,
        );
      }
    }
  });

  it("la dette de sourçage ne grossit pas", () => {
    const sans = [
      ...referentielsSectoriels.flatMap((ref) => ref.risques),
      ...risquesTransverses,
    ]
      .filter((r) => !r.description)
      .map((r) => r.id)
      .sort();
    expect(sans, "un risque sans source est apparu — le sourcer ou le retirer").toEqual(
      [...SANS_SOURCE_TOLERES].sort(),
    );
  });

  it("chaque question de détection vise un risque transverse existant", () => {
    const ids = new Set(risquesTransverses.map((r) => r.id));
    for (const q of questionsDetectionTransverses) {
      expect(ids, `${q.id} → ${q.risqueIdAssocie}`).toContain(q.risqueIdAssocie);
    }
  });

  it("chaque risque transverse déclenché par question a bien sa question", () => {
    // L'inverse du test précédent : un risque transverse sans question ne
    // peut jamais entrer dans un dossier. Les sept d'origine et les deux
    // ajoutés en 2026-08 sont tous déclenchés ainsi.
    const vises = new Set(
      questionsDetectionTransverses.map((q) => q.risqueIdAssocie),
    );
    for (const r of risquesTransverses) {
      expect(vises, `${r.id} n'est déclenché par aucune question`).toContain(r.id);
    }
  });
});

describe("activités non couvertes", () => {
  const activites = referentielsSectoriels.flatMap((ref) =>
    ref.activitesNonCouvertes.map((a) => ({ ref, a })),
  );

  it("aucun identifiant publié n'a disparu du référentiel", () => {
    // Le trou que ce test ferme : `questionsActivites` n'itère que sur le
    // référentiel courant. Un identifiant retiré ou renommé rend muettes,
    // sans erreur ni trace, toutes les réponses déjà données — et le prochain
    // DUERP gravé ne dit plus rien de l'activité déclarée.
    const presents = new Set(activites.map(({ a }) => a.id));
    const disparus = ACTIVITES_PUBLIEES.filter((id) => !presents.has(id));
    expect(
      disparus,
      "Un identifiant d'activité publié a disparu du référentiel. Les réponses " +
        "déjà données le portant deviendraient invisibles, y compris dans les " +
        "versions à figer. Cf. `activites-publiees.ts` : on ajoute, on ne " +
        "retire qu'après avoir migré les réponses.",
    ).toEqual([]);
  });

  it("toute activité du référentiel est déclarée au registre", () => {
    // L'autre sens : une activité posée à un dirigeant sans être inscrite au
    // registre pourrait être retirée plus tard sans que rien ne s'y oppose.
    const declares = new Set([...ACTIVITES_PUBLIEES, ...ACTIVITES_RETIREES]);
    const inconnues = activites
      .map(({ a }) => a.id)
      .filter((id) => !declares.has(id));
    expect(
      inconnues,
      "Ajoutez ces identifiants à `ACTIVITES_PUBLIEES` : c'est ce registre qui " +
        "les rend irréversibles.",
    ).toEqual([]);
  });

  it("aucun identifiant retiré n'est réemployé", () => {
    const presents = new Set(activites.map(({ a }) => a.id));
    const ressuscites = ACTIVITES_RETIREES.filter((id) => presents.has(id));
    expect(
      ressuscites,
      "Un identifiant retiré désigne autre chose dans les anciens snapshots.",
    ).toEqual([]);
  });

  it("aucun identifiant d'activité n'est dupliqué", () => {
    const ids = activites.map(({ a }) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("les activités d'un secteur partagent un préfixe propre à ce secteur", () => {
    // Le préfixe n'est pas décoratif : c'est ce qui rend une collision
    // improbable et ce qui permet, en lisant un snapshot, de savoir de quel
    // secteur venait une réponse même si l'activité a depuis disparu.
    const prefixes = new Map<string, string>();
    for (const { ref, a } of activites) {
      const prefixe = a.id.split("-")[0];
      expect(prefixe.length).toBeGreaterThan(1);
      // Un identifiant, ce n'est pas qu'un préfixe : il nomme l'activité.
      expect(a.id.length).toBeGreaterThan(prefixe.length + 1);
      const connu = prefixes.get(ref.id);
      if (connu) expect(prefixe).toBe(connu);
      else prefixes.set(ref.id, prefixe);
    }
    // Et deux secteurs n'utilisent jamais le même préfixe.
    const valeurs = [...prefixes.values()];
    expect(new Set(valeurs).size).toBe(valeurs.length);
  });

  it("chaque activité porte une question fermée, ce qui manque et pourquoi", () => {
    for (const { a } of activites) {
      expect(a.libelle.trim().length).toBeGreaterThan(0);
      // Une question tranchable finit par un point d'interrogation.
      expect(a.question.trim().endsWith("?")).toBe(true);
      // `cequiManque` est imprimé et lu par un tiers : il doit être descriptif,
      // donc bien plus qu'un mot-clé.
      expect(a.cequiManque.trim().length).toBeGreaterThan(40);
      // `pourquoi` s'imprime juste en dessous et doit tenir seul : sans lui,
      // la mention se lit comme une lacune du produit plutôt que comme le
      // bord connu d'un référentiel sectoriel.
      expect(a.pourquoi.trim().length).toBeGreaterThan(40);
    }
  });

  it("le pourquoi de chaque activité cite la source qui la traite ailleurs", () => {
    // La règle de rédaction du champ, rendue exécutable : on nomme ce qui
    // documente l'activité hors de ce référentiel — un outil OiRA, une
    // brochure ED, un dossier INRS. Une explication qui ne cite rien renvoie
    // à l'état d'avancement du produit, qui ne veut rien dire pour le lecteur
    // du document et vieillirait mal sur une pièce conservée quarante ans.
    for (const { a } of activites) {
      const citeUneSource = /OiRA|ED \d{3,4}|QR \d+|INRS/.test(a.pourquoi);
      expect(
        citeUneSource,
        `L'explication de « ${a.id} » ne nomme aucune source.`,
      ).toBe(true);
    }
  });

  it("aucune formulation de jugement dans ce qui sera imprimé", () => {
    // L'outil assiste, il ne certifie pas et ne reproche rien (CLAUDE.md).
    const interdits = [
      "conforme",
      "incomplet",
      "insuffisant",
      "vous devez",
      "obligatoire",
      "illégal",
    ];
    for (const { a } of activites) {
      const texte =
        `${a.libelle} ${a.question} ${a.aide ?? ""} ${a.cequiManque} ${a.pourquoi}`.toLowerCase();
      for (const mot of interdits) {
        expect(texte.includes(mot)).toBe(false);
      }
    }
  });
});
