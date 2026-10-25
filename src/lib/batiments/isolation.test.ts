// Cloisonnement des deux lectures de bâtiment qui reçoivent un identifiant nu.
//
// ~~`charge.test.ts` couvre déjà `listerBatimentsAvecCharge`, mais par une
// assertion de **forme** sur le `where` émis.~~ [2026-10-25 : la fonction et
// son test sont retirés avec la plaque des zones du hero.] Les deux fonctions testées ici
// n'étaient couvertes par rien : retirer leur prédicat laissait les 1568 tests
// verts. Elles sont pourtant celles où la fuite serait la plus concrète —
// `resoudreBatimentOptionnel` est ce qui **valide** un `batimentId` avant
// écriture, et c'est aussi ce module qui porte la doctrine du prédicat.
//
// Même montage que `salaries/isolation.test.ts` : le faux Prisma **évalue** le
// `where` ET le `orderBy` contre deux entreprises en mémoire, et lève sur toute
// clause qu'il ne sait pas interpréter — jamais de clause ignorée en silence.
//
// Cette phrase a été fausse deux fois, et le bloc « le faux Prisma refuse ce
// qu'il ne sait pas évaluer », en fin de fichier, existe pour qu'elle cesse de
// dépendre de la bonne foi du lecteur :
//   1. le `orderBy` manquait tout court — le faux rendait la première ligne
//      insérée quel que soit le tri demandé ;
//   2. puis il n'était validé qu'à l'intérieur du comparateur de `Array.sort`,
//      que le moteur n'appelle **jamais** en dessous de deux lignes. La garantie
//      était donc muette exactement là où une fixture minimale la solliciterait.
// Les critères sont désormais validés avant le tri, donc indépendamment du
// nombre de lignes.

import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_A = "user-a";
const ETAB_A = "etab-a";
const ETAB_B = "etab-b";

const h = vi.hoisted(() => {
  type Ligne = Record<string, unknown>;

  const db = {
    entreprises: [] as Ligne[],
    etablissements: [] as Ligne[],
    batiments: [] as Ligne[],
  };

  const RELATIONS: Record<string, (l: Ligne) => Ligne | undefined> = {
    etablissement: (b) =>
      db.etablissements.find((e) => e.id === b.etablissementId),
    entreprise: (e) => db.entreprises.find((en) => en.id === e.entrepriseId),
  };

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
   * assertion prendrait pour le bon. Sans lui, ce faux rendait la **première
   * ligne insérée** quel que soit le tri demandé — et le cas
   * « rend le bâtiment d'ordre 0 » passait au vert sans rien éprouver.
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
        if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
        else if (typeof va === "string" && typeof vb === "string")
          cmp = va < vb ? -1 : 1;
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

  const prisma = {
    batiment: {
      findFirst: async ({
        where,
        orderBy,
      }: {
        where: Ligne;
        orderBy?: unknown;
      }) => trier(db.batiments.filter((b) => correspond(b, where)), orderBy)[0] ?? null,
      findMany: async ({
        where,
        orderBy,
      }: {
        where: Ligne;
        orderBy?: unknown;
      }) => trier(db.batiments.filter((b) => correspond(b, where)), orderBy),
    },
  };

  return { db, prisma, trier, requireUser: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: h.requireUser,
  getOptionalUser: vi.fn(),
}));

const { batimentParDefaut, resoudreBatimentOptionnel } = await import(
  "./queries"
);

beforeEach(() => {
  h.requireUser.mockResolvedValue({ id: USER_A, email: "a@exemple.fr" });
  h.db.entreprises = [
    { id: "ent-a", userId: USER_A },
    { id: "ent-b", userId: "user-b" },
  ];
  h.db.etablissements = [
    { id: ETAB_A, entrepriseId: "ent-a" },
    { id: ETAB_B, entrepriseId: "ent-b" },
  ];
  // L'annexe est insérée **avant** le siège, et porte un `ordre` plus grand
  // et un `createdAt` plus ancien. Trois mutations distinctes la font donc
  // remonter à tort : perdre le `orderBy` (ordre d'insertion), passer `ordre`
  // en `desc`, ou ne garder que le `createdAt: "asc"` du départage. Sans
  // cette disposition, le cas « rend le bâtiment d'ordre 0 » serait vert quoi
  // qu'il arrive — c'est ce qu'il était.
  h.db.batiments = [
    {
      id: "bat-a-annexe",
      etablissementId: ETAB_A,
      nom: "Annexe",
      ordre: 1,
      createdAt: new Date("2026-01-01T00:00:00+01:00"),
    },
    {
      id: "bat-a-siege",
      etablissementId: ETAB_A,
      nom: "Siège",
      ordre: 0,
      createdAt: new Date("2026-06-01T00:00:00+02:00"),
    },
    {
      id: "bat-b",
      etablissementId: ETAB_B,
      nom: "Atelier voisin",
      ordre: 0,
      createdAt: new Date("2026-01-01T00:00:00+01:00"),
    },
  ];
});

describe("resoudreBatimentOptionnel — la fonction qui valide avant écriture", () => {
  it("refuse le bâtiment d'un autre dossier", async () => {
    // Le scénario que le prédicat ferme : un appelant qui n'aurait pas gardé
    // son `etablissementId` ferait confirmer par cette fonction le bâtiment
    // d'un autre compte, et le permis de feu s'y rattacherait. Ses trois
    // appelants gardent aujourd'hui — c'est ce qui ne doit pas être seul.
    expect(await resoudreBatimentOptionnel(ETAB_B, "bat-b")).toEqual({
      ok: false,
    });
  });

  it("refuse aussi un bâtiment étranger présenté sur SON établissement", async () => {
    expect(await resoudreBatimentOptionnel(ETAB_A, "bat-b")).toEqual({
      ok: false,
    });
  });

  it("accepte le bâtiment du dossier de l'utilisateur", async () => {
    // Contre-épreuve : sans elle, une implémentation qui refuse tout
    // passerait les deux cas ci-dessus.
    expect(await resoudreBatimentOptionnel(ETAB_A, "bat-a-siege")).toEqual({
      ok: true,
      id: "bat-a-siege",
    });
  });

  it("laisse passer l'absence de bâtiment, sans ouvrir la base", async () => {
    expect(await resoudreBatimentOptionnel(ETAB_A, null)).toEqual({
      ok: true,
      id: null,
    });
  });
});

describe("batimentParDefaut", () => {
  it("lève sur un établissement d'un autre dossier, sans rien en dire", async () => {
    // Le refus passe par l'erreur d'invariant ADR-019 : bruyant, et il ne
    // divulgue rien du dossier voisin — le message ne nomme que
    // l'identifiant que l'appelant a lui-même fourni.
    await expect(batimentParDefaut(ETAB_B)).rejects.toThrow(/invariant ADR-019/);
  });

  it("rend le bâtiment d'ordre 0, pas le premier venu", async () => {
    // Ce que garde ce cas n'est pas de la sécurité, c'est une destination :
    // `equipements/actions.ts` appelle cette fonction pour ranger un
    // équipement créé sans bâtiment choisi. Un tri perdu ou inversé le pose
    // dans l'annexe, sans erreur et sans que rien ne le signale.
    expect(await batimentParDefaut(ETAB_A)).toMatchObject({
      id: "bat-a-siege",
    });
  });
});

// ---------------------------------------------------------------------------
// Le faux Prisma lui-même.
//
// Ce fichier a déjà livré une fois une garantie que son en-tête annonçait et
// que son code n'assurait pas. Elle est donc éprouvée ici, et pas seulement
// affirmée — sur les tailles où elle a lâché : `Array.sort` n'appelle pas son
// comparateur en dessous de deux lignes, si bien qu'une validation logée dans
// le comparateur est muette exactement là où une fixture minimale la
// solliciterait.
// ---------------------------------------------------------------------------

describe("le faux Prisma refuse ce qu'il ne sait pas évaluer", () => {
  const UNE = [{ id: "seul", ordre: 0, nom: "Siège" }];

  it("lève sur un sens invalide, même à une seule ligne", () => {
    expect(() => h.trier(UNE, [{ ordre: "PAS_UN_SENS" }])).toThrow(
      /sens de tri non géré/,
    );
  });

  it("lève sur un sens invalide, même à zéro ligne", () => {
    expect(() => h.trier([], [{ ordre: "PAS_UN_SENS" }])).toThrow(
      /sens de tri non géré/,
    );
  });

  it("lève sur un tri relationnel", () => {
    // `orderBy: { etablissement: { nom: "asc" } }` : le sens est un objet.
    // Le faux ne sait pas traverser une relation pour trier — il doit le dire
    // plutôt que rendre les lignes dans leur ordre d'insertion.
    expect(() =>
      h.trier(UNE, [{ etablissement: { nom: "asc" } }]),
    ).toThrow(/sens de tri non géré/);
  });

  it("lève sur la forme longue de Prisma", () => {
    // `{ nom: { sort: "asc", nulls: "last" } }` — valide côté Prisma, illisible
    // pour ce faux.
    expect(() =>
      h.trier(UNE, [{ nom: { sort: "asc", nulls: "last" } }]),
    ).toThrow(/sens de tri non géré/);
  });

  it("lève sur un critère à deux clés", () => {
    expect(() => h.trier(UNE, [{ ordre: "asc", nom: "asc" }])).toThrow(
      /critère de tri à 2 clés/,
    );
  });

  it("trie normalement ce qu'il sait lire", () => {
    // Contre-épreuve : sans elle, un `trier` qui lèverait sur tout passerait
    // les cinq cas ci-dessus.
    const deux = [
      { id: "b", ordre: 1 },
      { id: "a", ordre: 0 },
    ];
    expect(h.trier(deux, [{ ordre: "asc" }]).map((l) => l.id)).toEqual([
      "a",
      "b",
    ]);
    expect(h.trier(deux, [{ ordre: "desc" }]).map((l) => l.id)).toEqual([
      "b",
      "a",
    ]);
  });
});
