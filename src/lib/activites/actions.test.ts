// Écriture d'une réponse d'activité hors couverture (ADR-020) — base simulée.
//
// Ce que ces tests prouvent, et ce qu'ils ne prouvent pas : il faut le dire
// franchement, parce que le défaut corrigé est un défaut de concurrence et
// qu'aucune suite unitaire ne prouve une atomicité de moteur.
//
// **Prouvé ici** : l'action n'effectue plus de lecture-modification-écriture
// de tout l'objet JSON (elle n'appelle plus `duerp.update`) ; elle émet un
// seul UPDATE, ciblant une seule clé, avec exactement trois valeurs liées —
// l'identifiant d'activité, le booléen et l'identifiant de DUERP — dont
// aucune n'est concaténée dans le texte SQL ; et deux réponses simultanées
// parties d'une même lecture périmée conservent chacune la sienne dès lors
// que la base applique la mutation clé à clé.
//
// **Non prouvé ici** : que PostgreSQL applique bien `jsonb_set` de façon
// atomique. C'est le fait d'un UPDATE d'une seule ligne en une seule
// instruction, pas d'une propriété de ce code, et il faudrait une vraie base
// pour l'observer. Le magasin simulé ci-dessous *reproduit* cette sémantique,
// il ne la démontre pas — la seule chose qu'il démontre, c'est que l'action
// lui délègue la fusion au lieu de la faire elle-même.
//
// **Non prouvé non plus** : le comportement exact du `CASE jsonb_typeof` sur
// une colonne `NULL` ou contenant un scalaire. Le simulateur suit la même
// règle (repartir d'un objet vide), et le texte SQL est vérifié à la lettre,
// mais c'est une vérification de forme.

import { beforeEach, describe, expect, it, vi } from "vitest";

/** Une écriture reçue par le faux `$executeRaw`, telle qu'émise. */
type Requete = { sql: string; valeurs: unknown[] };

const h = vi.hoisted(() => {
  const db = {
    /** La colonne `Duerp.reponsesActivitesNonCouvertes`, `null` au départ. */
    colonne: null as unknown,
    /** Ce que `requireDuerp` rendra — une photo, potentiellement périmée. */
    lecture: null as unknown,
    referentielSecteurId: "commerce" as string | null,
    lignesTouchees: 1,
    requetes: [] as Requete[],
  };

  const prisma = {
    // Un seul UPDATE, appliqué clé à clé : la sémantique de `jsonb_set` avec
    // `create_missing`, y compris le repli sur un objet vide quand la colonne
    // n'est pas un objet JSON (NULL, scalaire, tableau).
    // L'écriture passe par `ecrireReponseFermee`, qui compose un
    // `Prisma.sql` : le nom de colonne y est inliné (`Prisma.raw`), les
    // valeurs restent liées. On lit donc `strings` et `values` de l'objet —
    // exactement ce que Prisma enverra au moteur.
    $executeRaw: async (requete: {
      strings: readonly string[];
      values: unknown[];
    }): Promise<number> => {
      const { strings, values: valeurs } = requete;
      db.requetes.push({ sql: strings.join("?"), valeurs });
      if (db.lignesTouchees === 0) return 0;

      const base =
        db.colonne !== null &&
        typeof db.colonne === "object" &&
        !Array.isArray(db.colonne)
          ? (db.colonne as Record<string, unknown>)
          : {};

      // Deux formes d'UPDATE, distinguées comme la base les distingue : le
      // retrait ne lie que la clé et l'identifiant, l'écriture lie aussi le
      // booléen.
      const retrait = strings.join("").includes('"reponsesActivitesNonCouvertes" - ');
      if (retrait) {
        const [cle] = valeurs as [string];
        const suite = { ...base };
        delete suite[cle];
        db.colonne = suite;
        return 1;
      }

      const [cle, valeur] = valeurs as [string, boolean];
      db.colonne = { ...base, [cle]: valeur };
      return 1;
    },
    duerp: {
      // Piège à régression : le retour au round-trip applicatif passerait par
      // là, et c'est exactement ce qui perdait une réponse sur deux.
      update: vi.fn(async () => {
        throw new Error("duerp.update ne doit plus être appelé");
      }),
    },
  };

  return { db, prisma, requireDuerp: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({ requireDuerp: h.requireDuerp }));

const { repondreActivite } = await import("./actions");

// Deux activités réellement instruites pour le secteur commerce : le test ne
// vaut que sur des clés que le référentiel connaît, l'action refusant les
// autres.
const VIANDE = "com-decoupe-viande";
const MAREE = "com-rayon-maree";
const DUERP = "duerp-1";

beforeEach(() => {
  h.db.colonne = null;
  h.db.lecture = null;
  h.db.referentielSecteurId = "commerce";
  h.db.lignesTouchees = 1;
  h.db.requetes = [];
  h.prisma.duerp.update.mockClear();
  h.requireDuerp.mockReset();
  h.requireDuerp.mockImplementation(async () => ({
    user: { id: "user-1" },
    duerp: {
      id: DUERP,
      referentielSecteurId: h.db.referentielSecteurId,
      reponsesActivitesNonCouvertes: h.db.lecture,
    },
  }));
});

describe("repondreActivite — écriture concurrente", () => {
  it("garde les deux réponses parties d'une même lecture périmée", async () => {
    // Les deux onglets ont chargé la page avant toute réponse : chacun lira
    // `null`. C'est le scénario qui effaçait silencieusement la première
    // écriture.
    h.db.lecture = null;

    await Promise.all([
      repondreActivite(DUERP, VIANDE, true),
      repondreActivite(DUERP, MAREE, false),
    ]);

    expect(h.db.colonne).toEqual({ [VIANDE]: true, [MAREE]: false });
  });

  it("n'écrase pas une réponse absente de la photo lue", async () => {
    // Un onglet ouvert avant que la marée soit répondue : sa lecture ignore
    // cette clé. Répondre viande ne doit pas la faire disparaître.
    h.db.colonne = { [MAREE]: true };
    h.db.lecture = {};

    await repondreActivite(DUERP, VIANDE, false);

    expect(h.db.colonne).toEqual({ [MAREE]: true, [VIANDE]: false });
  });

  it("ne repasse jamais par une mise à jour applicative de l'objet", async () => {
    await repondreActivite(DUERP, VIANDE, true);
    expect(h.prisma.duerp.update).not.toHaveBeenCalled();
  });
});

describe("repondreActivite — la requête émise", () => {
  it("ne lie que la clé, le booléen et l'identifiant, sans les concaténer", async () => {
    await repondreActivite(DUERP, VIANDE, true);

    expect(h.db.requetes).toHaveLength(1);
    const { sql, valeurs } = h.db.requetes[0];

    // L'ordre compte : c'est celui des `$1, $2, $3` du SQL.
    expect(valeurs).toEqual([VIANDE, true, DUERP]);
    // Rien de ce qui vient du client n'apparaît dans le texte de la requête.
    expect(sql).not.toContain(VIANDE);
    expect(sql).not.toContain(DUERP);
  });

  it("cible une seule clé, en la créant si elle manque", async () => {
    await repondreActivite(DUERP, VIANDE, true);
    const { sql } = h.db.requetes[0];

    expect(sql).toContain("jsonb_set(");
    expect(sql).toContain("ARRAY[");
    expect(sql).toContain("]::text[]");
    // Le 4e argument de `jsonb_set` : sans lui, une question jamais répondue
    // le resterait — la mutation serait ignorée au lieu de créer la clé.
    expect(sql).toMatch(/\),\s*true\s*\)/);
  });

  it("écrit un booléen JSON, pas une chaîne", async () => {
    await repondreActivite(DUERP, MAREE, false);
    const { sql, valeurs } = h.db.requetes[0];

    // `"false"` relu par `lireReponsesActivites` redeviendrait un silence.
    expect(valeurs[1]).toBe(false);
    expect(sql).toContain("to_jsonb(");
    expect(sql).toContain("::boolean");
  });

  it("repart d'un objet vide quand la colonne n'est pas un objet JSON", async () => {
    // Vérification de forme : `jsonb_set` échoue sur `NULL` et sur un scalaire.
    // Le `CASE` est la seule chose qui couvre le dossier jamais répondu.
    await repondreActivite(DUERP, VIANDE, true);
    const { sql } = h.db.requetes[0];

    expect(sql).toContain("jsonb_typeof(");
    expect(sql).toContain("'object'");
    expect(sql).toContain("ELSE '{}'::jsonb");
  });

  it("horodate la ligne, que Prisma ne touche pas en SQL brut", async () => {
    await repondreActivite(DUERP, VIANDE, true);
    // `@updatedAt` est appliqué par le client Prisma, pas par la base : sans
    // ce `NOW()`, la fiche resterait datée de sa dernière écriture ORM.
    expect(h.db.requetes[0].sql).toContain('"updatedAt" = NOW()');
  });
});

describe("repondreActivite — retirer une réponse", () => {
  // Le troisième état de l'ADR-020 doit être atteignable dans les deux sens.
  // Sans retrait, un « non » cliqué par erreur restait écrit, et la version
  // figée affirmait pour quarante ans que le dirigeant avait *déclaré ne pas
  // exercer* l'activité.
  it("ramène la question au silence, clé retirée et non mise à false", async () => {
    h.db.colonne = { [VIANDE]: false, [MAREE]: true };

    await repondreActivite(DUERP, VIANDE, null);

    expect(h.db.colonne).toEqual({ [MAREE]: true });
    expect(Object.keys(h.db.colonne as object)).not.toContain(VIANDE);
  });

  it("ne touche qu'une clé : le retrait n'efface pas les réponses voisines", async () => {
    h.db.colonne = { [VIANDE]: true, [MAREE]: false };
    h.db.lecture = {};

    await Promise.all([
      repondreActivite(DUERP, VIANDE, null),
      repondreActivite(DUERP, MAREE, true),
    ]);

    expect(h.db.colonne).toEqual({ [MAREE]: true });
  });

  it("émet un retrait jsonb, sans concaténer la clé dans le SQL", async () => {
    await repondreActivite(DUERP, VIANDE, null);

    expect(h.db.requetes).toHaveLength(1);
    const { sql, valeurs } = h.db.requetes[0];
    expect(sql).toContain('"reponsesActivitesNonCouvertes" - ');
    expect(sql).not.toContain("jsonb_set(");
    expect(sql).not.toContain(VIANDE);
    expect(valeurs).toEqual([VIANDE, DUERP]);
    expect(sql).toContain('"updatedAt" = NOW()');
  });

  it("refuse un retrait sur une clé que le référentiel ne connaît pas", async () => {
    await expect(repondreActivite(DUERP, "com-inventee", null)).rejects.toThrow(
      /Activité inconnue/,
    );
    expect(h.db.requetes).toHaveLength(0);
  });

  it("ne se tait pas si le retrait ne touche aucune ligne", async () => {
    h.db.lignesTouchees = 0;
    await expect(repondreActivite(DUERP, VIANDE, null)).rejects.toThrow(
      /introuvable/,
    );
  });
});

describe("repondreActivite — refus", () => {
  it("refuse une clé absente du référentiel du secteur retenu", async () => {
    await expect(
      repondreActivite(DUERP, "com-inventee", true),
    ).rejects.toThrow(/Activité inconnue/);
    expect(h.db.requetes).toHaveLength(0);
  });

  it("refuse aussi quand aucun secteur n'est encore confirmé", async () => {
    h.db.referentielSecteurId = null;

    await expect(repondreActivite(DUERP, VIANDE, true)).rejects.toThrow(
      /Activité inconnue/,
    );
    expect(h.db.requetes).toHaveLength(0);
  });

  it("ne se tait pas si l'UPDATE ne touche aucune ligne", async () => {
    // Le dossier a disparu entre le contrôle d'appartenance et l'écriture :
    // se taire renverrait l'écran à une réponse qui n'existe pas en base.
    h.db.lignesTouchees = 0;

    await expect(repondreActivite(DUERP, VIANDE, true)).rejects.toThrow(
      /introuvable/,
    );
  });

  it("passe par le contrôle d'appartenance avant d'écrire", async () => {
    h.requireDuerp.mockImplementation(async () => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(repondreActivite(DUERP, VIANDE, true)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(h.db.requetes).toHaveLength(0);
  });
});
