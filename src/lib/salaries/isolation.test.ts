// Cloisonnement des lectures de salariés (ADR-005).
//
// Prisma opère en rôle `postgres` et contourne donc RLS : l'isolation entre
// deux dossiers est une **convention applicative**, sans filet en base. Sur ce
// module-ci, la convention porte des données de personnes — c'est la surface
// la plus sensible du produit.
//
// Ce que ce fichier éprouve, et qui le distingue du motif déjà employé dans
// `batiments/charge.test.ts` : celui-ci capture le `where` émis et vérifie sa
// **forme** (`toMatchObject`). C'est une non-régression utile, mais elle ne dit
// rien de ce que la clause *fait*. Ici le faux Prisma **évalue réellement** le
// `where` contre deux entreprises en mémoire — chaîne de relations comprise —
// et l'assertion porte sur ce que la lecture rend. Le défaut d'origine était
// justement une clause qui avait l'air d'une portée sans en être une.
//
// Aucune base : le dépôt n'a ni `setupFiles` ni `globalSetup`, et un test de
// cloisonnement qui ne tournerait qu'avec Docker allumé ne tournerait pas.

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Deux dossiers voisins, et rien qui les relie.
// ---------------------------------------------------------------------------

const USER_A = "user-a";
const USER_B = "user-b";
const ETAB_A = "etab-a";
const ETAB_B = "etab-b";

const h = vi.hoisted(() => {
  type Ligne = Record<string, unknown>;

  const db = {
    entreprises: [] as Ligne[],
    etablissements: [] as Ligne[],
    salaries: [] as Ligne[],
    titres: [] as Ligne[],
  };

  /**
   * Comment aller d'une ligne à la ligne qu'elle référence.
   *
   * C'est la seule chose que le faux Prisma sait des relations, et c'est
   * suffisant : les quatre `where` du module remontent tous cette chaîne,
   * `titreSalarie → salarie → etablissement → entreprise`.
   */
  const RELATIONS: Record<string, (l: Ligne) => Ligne | undefined> = {
    salarie: (t) => db.salaries.find((s) => s.id === t.salarieId),
    etablissement: (s) =>
      db.etablissements.find((e) => e.id === s.etablissementId),
    entreprise: (e) =>
      db.entreprises.find((en) => en.id === e.entrepriseId),
  };

  /**
   * Évalue un `where` Prisma contre une ligne.
   *
   * Volontairement **bruyant** sur ce qu'il ne sait pas faire : un filtre d'une
   * forme non gérée lève au lieu d'être ignoré. Un faux qui laisse passer en
   * silence une clause qu'il ne comprend pas rendrait ce fichier décoratif —
   * il annoncerait une garantie sans l'éprouver, ce que ces tests existent
   * précisément pour empêcher.
   */
  function correspond(ligne: Ligne, where: Ligne): boolean {
    for (const [cle, attendu] of Object.entries(where)) {
      const relation = RELATIONS[cle];
      if (relation) {
        const liee = relation(ligne);
        if (!liee) return false;
        if (!correspond(liee, attendu as Ligne)) return false;
        continue;
      }
      if (attendu !== null && typeof attendu === "object") {
        if ("not" in (attendu as Ligne)) {
          if (ligne[cle] === (attendu as Ligne).not) return false;
          continue;
        }
        throw new Error(
          `Faux Prisma : filtre non géré sur « ${cle} » — ` +
            `${JSON.stringify(attendu)}. Étendre \`correspond\` plutôt que ` +
            `laisser passer une clause non évaluée.`,
        );
      }
      if (ligne[cle] !== attendu) return false;
    }
    return true;
  }

  /**
   * Applique un `orderBy` Prisma. Même politique que `correspond` : ce qui
   * n'est pas compris lève, plutôt que de rendre un ordre arbitraire qu'une
   * assertion prendrait pour le bon.
   */
  function trier(lignes: Ligne[], orderBy: unknown): Ligne[] {
    if (orderBy === undefined) return lignes;
    const criteres = Array.isArray(orderBy) ? orderBy : [orderBy];

    // Validation AVANT le tri, jamais dedans. `Array.sort` n'appelle pas son
    // comparateur sur 0 ou 1 ligne : une vérification qui n'y vivrait que
    // serait muette exactement là où la fixture est la plus petite, et
    // rendrait la ligne sans avoir évalué la clause — ce que l'en-tête de ce
    // fichier promet de ne jamais faire.
    //
    // Attrape du même coup les deux formes que ce faux ne sait pas lire : le
    // tri relationnel (`{ etablissement: { nom: "asc" } }`) et la forme longue
    // de Prisma (`{ nom: { sort: "asc", nulls: "last" } }`), où le sens est un
    // objet et non « asc » / « desc ».
    for (const critere of criteres) {
      const entrees = Object.entries(critere as Ligne);
      if (entrees.length !== 1) {
        throw new Error(
          `Faux Prisma : critère de tri à ${entrees.length} clés — ` +
            `${JSON.stringify(critere)}. Un critère porte un champ et un sens.`,
        );
      }
      const [cle, sens] = entrees[0];
      if (sens !== "asc" && sens !== "desc") {
        throw new Error(
          `Faux Prisma : sens de tri non géré sur « ${cle} » — ` +
            `${JSON.stringify(sens)}. Étendre \`trier\` plutôt que laisser ` +
            `passer un tri non évalué.`,
        );
      }
    }

    return [...lignes].sort((a, b) => {
      for (const critere of criteres) {
        const [cle, sens] = Object.entries(critere as Ligne)[0];
        const va = a[cle];
        const vb = b[cle];
        if (va === vb) continue;
        let cmp: number;
        if (typeof va === "boolean" && typeof vb === "boolean") cmp = va ? 1 : -1;
        else if (typeof va === "string" && typeof vb === "string") cmp = va < vb ? -1 : 1;
        else if (va instanceof Date && vb instanceof Date) cmp = va < vb ? -1 : 1;
        else {
          throw new Error(
            `Faux Prisma : tri non géré sur « ${cle} » (${typeof va}).`,
          );
        }
        return sens === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }

  /** Les titres d'un salarié, tels que `include`/`select` les rendrait. */
  const titresDe = (salarieId: unknown) =>
    db.titres.filter((t) => t.salarieId === salarieId);

  const hydrater = (s: Ligne) => ({ ...s, titres: titresDe(s.id) });

  const prisma = {
    salarie: {
      findMany: async ({ where, orderBy }: { where: Ligne; orderBy?: unknown }) =>
        trier(
          db.salaries.filter((s) => correspond(s, where)),
          orderBy,
        ).map(hydrater),
      findFirst: async ({ where }: { where: Ligne }) => {
        const s = db.salaries.find((l) => correspond(l, where));
        return s ? hydrater(s) : null;
      },
    },
    titreSalarie: {
      findMany: async ({ where }: { where: Ligne }) =>
        db.titres.filter((t) => correspond(t, where)),
      groupBy: async ({ where }: { where: Ligne }) => {
        const vus = new Set<unknown>();
        for (const t of db.titres) {
          if (correspond(t, where)) vus.add(t.obligationId);
        }
        return [...vus].map((obligationId) => ({ obligationId }));
      },
    },
  };

  return { db, prisma, trier, requireUser: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: h.requireUser,
  getOptionalUser: vi.fn(),
}));

const {
  listerEquipe,
  getSalarie,
  compterTitresEnRetard,
  libellesTitresDeclares,
} = await import("./queries");

const NOW = new Date("2026-08-28T10:00:00+02:00");

/** Une échéance largement dépassée : `compterTitresEnRetard` doit la voir. */
const ECHUE = new Date("2026-01-15T00:00:00+01:00");

beforeEach(() => {
  h.requireUser.mockResolvedValue({ id: USER_A, email: "a@exemple.fr" });

  h.db.entreprises = [
    { id: "ent-a", userId: USER_A },
    { id: "ent-b", userId: USER_B },
  ];
  h.db.etablissements = [
    { id: ETAB_A, entrepriseId: "ent-a" },
    { id: ETAB_B, entrepriseId: "ent-b" },
  ];
  h.db.salaries = [
    {
      id: "sal-a",
      etablissementId: ETAB_A,
      nom: "Martin",
      prenom: "Claire",
      poste: null,
      entreLe: null,
      actif: true,
      createdAt: NOW,
    },
    {
      id: "sal-b",
      etablissementId: ETAB_B,
      nom: "Dubois",
      prenom: "Hervé",
      poste: null,
      entreLe: null,
      actif: true,
      createdAt: NOW,
    },
    // Sortie de l'effectif, chez A. Son nom la placerait **première** par
    // ordre alphabétique : seul `actif: "desc"` la renvoie en fin de liste.
    // Et son titre ne doit pas disparaître du texte d'information (art. 13),
    // le traitement se poursuivant après son départ (art. 17.3.b).
    {
      id: "sal-a-partie",
      etablissementId: ETAB_A,
      nom: "Ali",
      prenom: "Neyla",
      poste: null,
      entreLe: null,
      actif: false,
      createdAt: NOW,
    },
  ];
  h.db.titres = [
    {
      id: "titre-a",
      salarieId: "sal-a",
      obligationId: "attestation_medicale_r4544_11_1",
      delivreLe: new Date("2021-01-15T00:00:00+01:00"),
      echeanceLe: ECHUE,
      note: null,
    },
    {
      id: "titre-b",
      salarieId: "sal-b",
      obligationId: "attestation_medicale_r4544_11_1",
      delivreLe: new Date("2021-01-15T00:00:00+01:00"),
      echeanceLe: ECHUE,
      note: null,
    },
    // Titre de la personne partie, sur une **autre** obligation : c'est ce
    // qui rend visible la disparition si un `actif: true` s'invitait dans le
    // `where` de `libellesTitresDeclares`.
    {
      id: "titre-a-partie",
      salarieId: "sal-a-partie",
      obligationId: "habilitation_electrique_bs_be",
      delivreLe: new Date("2020-06-01T00:00:00+02:00"),
      echeanceLe: ECHUE,
      note: null,
    },
  ];
});

// ---------------------------------------------------------------------------
// L'épreuve : le dossier voisin, lu avec son identifiant.
// ---------------------------------------------------------------------------

describe("un identifiant d'établissement d'un autre dossier ne rend rien", () => {
  // Le scénario n'est pas hypothétique : `navigation/sidebar-counts.ts:33`
  // appelle `compterTitresEnRetard` avec un `etablissementId` nu, sans porter
  // lui-même la moindre garde. Aujourd'hui ses deux appelants vérifient en
  // amont ; le jour où un troisième ne le fait pas, c'est cette clause-ci qui
  // décide s'il y a fuite.

  it("listerEquipe ne montre personne de l'établissement voisin", async () => {
    expect(await listerEquipe(ETAB_B, NOW)).toEqual([]);
  });

  it("getSalarie ne rend pas la fiche d'une personne du voisin", async () => {
    expect(await getSalarie(ETAB_B, "sal-b", NOW)).toBeNull();
  });

  it("getSalarie refuse une personne d'un autre dossier sur SON établissement", async () => {
    // L'autre moitié de la portée, celle qui était déjà juste : l'utilisateur
    // est chez lui, mais l'identifiant de personne vient d'ailleurs. Ce cas
    // passait déjà avant la correction — il reste ici pour que la clause
    // `etablissementId` ne parte pas avec le refactor qui ajoute la seconde.
    expect(await getSalarie(ETAB_A, "sal-b", NOW)).toBeNull();
  });

  it("compterTitresEnRetard ne compte pas les retards du voisin", async () => {
    expect(await compterTitresEnRetard(ETAB_B, NOW)).toBe(0);
  });

  it("libellesTitresDeclares ne décrit pas le traitement du voisin", async () => {
    // Celle-ci alimente le texte d'information remis aux salariés (art. 13) :
    // une fuite ici ferait décrire à un employeur le traitement d'un autre.
    expect(await libellesTitresDeclares(ETAB_B)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Contre-épreuve — sans elle, les cinq cas ci-dessus passeraient avec une
// implémentation qui ne rend jamais rien.
// ---------------------------------------------------------------------------

describe("le propriétaire lit son propre dossier", () => {
  it("listerEquipe rend son équipe, titres compris", async () => {
    const equipe = await listerEquipe(ETAB_A, NOW);
    expect(equipe.map((s) => s.nom)).toEqual(["Martin", "Ali"]);
    expect(equipe[0].titres).toHaveLength(1);
  });

  it("listerEquipe garde les personnes sorties de l'effectif, en dernier", async () => {
    // Deux propriétés en une, et c'est voulu : la personne partie reste
    // **visible** — son titre prouve qu'elle était habilitée au moment où
    // elle a opéré, et cette preuve couvre l'employeur (`rgpd.md` § 4.3) —
    // mais elle passe **après** les actifs. « Ali » précède « Martin »
    // alphabétiquement : sans `actif: "desc"` en tête du tri, l'ordre
    // s'inverse et ce test tombe.
    const equipe = await listerEquipe(ETAB_A, NOW);
    expect(equipe.map((s) => s.actif)).toEqual([true, false]);
    expect(equipe.map((s) => s.nom)).toEqual(["Martin", "Ali"]);
  });

  it("getSalarie rend la fiche demandée", async () => {
    expect((await getSalarie(ETAB_A, "sal-a", NOW))?.nom).toBe("Martin");
  });

  it("compterTitresEnRetard ne compte que les personnes en poste", async () => {
    // Les deux titres de A sont échus, mais l'un est celui d'une personne
    // partie : le rail ne réclame pas un geste pour quelqu'un qui n'est plus
    // là. C'est la seule des quatre lectures qui filtre sur `actif`.
    expect(await compterTitresEnRetard(ETAB_A, NOW)).toBe(1);
  });

  it("compterTitresEnRetard voit une VIP échue sans date de fin saisie", async () => {
    // Relecture système du 2026-09-14. Le `where` portait `echeanceLe: { not:
    // null }` : une visite quinquennale délivrée le 1er juin 2020, sans
    // « valable jusqu'au », sortait de la requête avant d'être classée, et le
    // badge du rail valait 0 quand le calendrier la comptait en retard depuis
    // le 1er juin 2025. L'habilitation voisine, sans durée écrite, doit rester
    // hors du compte : c'est la contre-épreuve qui empêche de « réparer » en
    // comptant tout titre sans date.
    h.db.titres.push(
      {
        id: "titre-a-vip",
        salarieId: "sal-a",
        obligationId: "sante-travail-salarie-vip",
        delivreLe: new Date("2020-06-01T12:00:00.000Z"),
        echeanceLe: null,
        note: null,
      },
      {
        id: "titre-a-habilitation",
        salarieId: "sal-a",
        obligationId: "elec-salarie-habilitation",
        delivreLe: new Date("2020-06-01T12:00:00.000Z"),
        echeanceLe: null,
        note: null,
      },
    );
    expect(await compterTitresEnRetard(ETAB_A, NOW)).toBe(2);

    // Et la fiche dit la même chose que le badge, sur la même personne.
    const fiche = await getSalarie(ETAB_A, "sal-a", NOW);
    const etats = new Map(fiche?.titres.map((t) => [t.id, t.etat]));
    expect(etats.get("titre-a-vip")).toBe("enRetard");
    expect(etats.get("titre-a-habilitation")).toBe("aPlanifier");
    expect(fiche?.titres.find((t) => t.id === "titre-a-vip")?.echeance).toEqual(
      new Date("2025-06-01T12:00:00.000Z"),
    );
  });

  it("libellesTitresDeclares décrit AUSSI le titre d'une personne partie", async () => {
    // Sans `actif: true`, délibérément (art. 17.3.b) : le traitement se
    // poursuit après le départ, et le texte d'information remis aux salariés
    // doit décrire le traitement réel. Ajouter `actif: true` au `where` fait
    // tomber ce test de 2 à 1 — c'est ce qui garde la propriété.
    expect(await libellesTitresDeclares(ETAB_A)).toHaveLength(2);
  });
});
