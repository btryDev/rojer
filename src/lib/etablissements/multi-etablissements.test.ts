import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Deux établissements sous une même entreprise — le risque du lot (ADR-028).
 *
 * ## Ce qui est en jeu
 *
 * Le cloisonnement entre COMPTES ne bouge pas : il repose sur
 * `Entreprise.userId`, qui reste unique, et sur les dix helpers de
 * `auth/scope.ts`, qui ne sont pas touchés. Ce qui apparaît le 2026-09-01, c'est
 * un cloisonnement d'une autre nature, à l'intérieur d'un même compte : deux
 * dossiers qui ne doivent pas se mêler alors que **rien dans la base ne les
 * sépare** — même entreprise, même utilisateur, même session.
 *
 * Ce risque était masqué, et c'est ce qui le rend sérieux. Tant que
 * `Etablissement.entrepriseId` était `@unique`, une lecture qui aurait oublié de
 * borner sur l'établissement rendait quand même la bonne ligne : il n'y en avait
 * qu'une. Le `@unique` faisait passer pour juste tout code approximatif sur ce
 * point, et son retrait ne produit aucune erreur — il produit des chiffres d'un
 * autre site dans le tableau de bord de celui-ci.
 *
 * ## Pourquoi un faux Prisma qui applique vraiment le `where`
 *
 * Un mock qui rend une valeur figée testerait que le helper a été appelé, pas
 * qu'il cloisonne : il rendrait la même ligne quel que soit le `where`, y
 * compris un `where` vide. Le faux ci-dessous ÉVALUE la clause, relations
 * comprises. C'est ce qui rend le test capable de tomber — vérifié en le
 * cassant : en retirant `id: etablissementId` du `where` de
 * `requireEtablissement`, seuls les trois cas d'isolation passent au rouge, et
 * `requireEtablissement` rend alors « Le Bistrot » quand on lui demande
 * « La Cave ».
 */

const T0 = new Date("2026-01-10T09:00:00Z");
const T1 = new Date("2026-06-02T09:00:00Z");

/** Deux comptes, trois établissements — dont deux sous la même entreprise. */
const donnees = () => ({
  entreprise: [
    { id: "ent-1", userId: "user-1" },
    { id: "ent-2", userId: "user-2" },
    // Une seconde société du même compte (2026-10-26) : un autre SIREN.
    { id: "ent-3", userId: "user-1" },
  ],
  etablissement: [
    {
      id: "etab-A",
      entrepriseId: "ent-1",
      raisonDisplay: "Le Bistrot",
      createdAt: T0,
    },
    {
      id: "etab-B",
      entrepriseId: "ent-1",
      raisonDisplay: "La Cave",
      createdAt: T1,
    },
    {
      id: "etab-C",
      entrepriseId: "ent-3",
      raisonDisplay: "L'Épicerie",
      createdAt: new Date("2026-07-01T09:00:00Z"),
    },
    {
      id: "etab-Z",
      entrepriseId: "ent-2",
      raisonDisplay: "Chez le voisin",
      createdAt: T0,
    },
  ],
  action: [
    { id: "act-A", etablissementId: "etab-A", titre: "Extincteurs du Bistrot" },
    { id: "act-B", etablissementId: "etab-B", titre: "Extincteurs de la Cave" },
  ],
  verification: [
    { id: "ver-A", etablissementId: "etab-A" },
    { id: "ver-B", etablissementId: "etab-B" },
  ],
});

type Base = ReturnType<typeof donnees>;
type Table = keyof Base;
type Ligne = Record<string, unknown>;

/**
 * Les relations que le faux sait suivre, pour évaluer un `where` imbriqué.
 * Déclarées à la main : une réflexion sur le client Prisma généré ferait passer
 * ce test pour une vérification du schéma, ce qu'il n'est pas.
 */
const RELATIONS: Record<string, Record<string, { table: Table; cle: string }>> = {
  etablissement: { entreprise: { table: "entreprise", cle: "entrepriseId" } },
  action: { etablissement: { table: "etablissement", cle: "etablissementId" } },
  verification: {
    etablissement: { table: "etablissement", cle: "etablissementId" },
  },
  entreprise: {},
};

const h = vi.hoisted(() => ({ cookie: undefined as string | undefined }));

const base = donnees();

function correspond(table: Table, ligne: Ligne, where: Ligne): boolean {
  return Object.entries(where ?? {}).every(([cle, attendu]) => {
    const relation = RELATIONS[table]?.[cle];
    if (relation) {
      const parent = base[relation.table].find(
        (r) => (r as Ligne).id === ligne[relation.cle],
      );
      return parent
        ? correspond(relation.table, parent as Ligne, attendu as Ligne)
        : false;
    }
    return ligne[cle] === attendu;
  });
}

function projeter(ligne: Ligne, select?: Record<string, boolean>): Ligne {
  if (!select) return { ...ligne };
  return Object.fromEntries(
    Object.keys(select)
      .filter((c) => select[c])
      .map((c) => [c, ligne[c]]),
  );
}

function joindre(table: Table, ligne: Ligne, include?: Ligne): Ligne {
  if (!include) return ligne;
  const sortie = { ...ligne };
  for (const [nom, actif] of Object.entries(include)) {
    const relation = RELATIONS[table]?.[nom];
    if (actif && relation) {
      sortie[nom] = base[relation.table].find(
        (r) => (r as Ligne).id === ligne[relation.cle],
      );
    }
  }
  return sortie;
}

function modele(table: Table) {
  const filtrer = (args: { where?: Ligne; orderBy?: Ligne }) => {
    const lignes = (base[table] as unknown as Ligne[]).filter((l) =>
      correspond(table, l, args.where ?? {}),
    );
    const ordre = args.orderBy as { createdAt?: "asc" | "desc" } | undefined;
    if (ordre?.createdAt) {
      const sens = ordre.createdAt === "asc" ? 1 : -1;
      lignes.sort(
        (a, b) =>
          sens *
          ((a.createdAt as Date).getTime() - (b.createdAt as Date).getTime()),
      );
    }
    return lignes;
  };

  type Args = {
    where?: Ligne;
    orderBy?: Ligne;
    select?: Record<string, boolean>;
    include?: Ligne;
  };

  return {
    findFirst: async (args: Args = {}) => {
      const l = filtrer(args)[0];
      return l ? joindre(table, projeter(l, args.select), args.include) : null;
    },
    findMany: async (args: Args = {}) =>
      filtrer(args).map((l) =>
        joindre(table, projeter(l, args.select), args.include),
      ),
  };
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    entreprise: modele("entreprise"),
    etablissement: modele("etablissement"),
    action: modele("action"),
    verification: modele("verification"),
  },
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: "user-1", email: "dirigeant@exemple.fr" }),
  getOptionalUser: async () => ({ id: "user-1", email: "dirigeant@exemple.fr" }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nom: string) =>
      nom === "etablissement-actif" && h.cookie !== undefined
        ? { name: nom, value: h.cookie }
        : undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    const e = new Error("NEXT_NOT_FOUND");
    (e as { digest?: string }).digest = "NEXT_HTTP_ERROR_FALLBACK;404";
    throw e;
  },
}));

const {
  COOKIE_ETABLISSEMENT_ACTIF,
  getOptionalUserEtablissement,
  requireAction,
  requireEtablissement,
  requireVerification,
} = await import("@/lib/auth/scope");
const { listerEtablissementsDuCompte } = await import("./queries");

beforeEach(() => {
  h.cookie = undefined;
});

describe("deux établissements d'une même entreprise ne se mêlent pas", () => {
  it("chaque identifiant rend SON établissement, jamais le premier venu", async () => {
    // Le cas nu, et celui qui passait tout seul quand la base garantissait
    // qu'il n'y en avait qu'un.
    const a = await requireEtablissement("etab-A");
    const b = await requireEtablissement("etab-B");

    expect(a.etablissement.raisonDisplay).toBe("Le Bistrot");
    expect(b.etablissement.raisonDisplay).toBe("La Cave");
    // Même entreprise, même utilisateur : rien dans la base ne les sépare.
    expect(a.etablissement.entrepriseId).toBe(b.etablissement.entrepriseId);
  });

  it("une action reste rattachée au site où elle a été ouverte", async () => {
    // Une action attribuée au mauvais site déplace un travail à faire d'un
    // dossier à l'autre — et le plan d'actions du premier s'allège tout seul.
    const a = await requireAction("act-A");
    const b = await requireAction("act-B");

    expect(a.etablissementId).toBe("etab-A");
    expect(b.etablissementId).toBe("etab-B");
  });

  it("une vérification reste rattachée à son site", async () => {
    const a = await requireVerification("ver-A");
    const b = await requireVerification("ver-B");

    expect(a.etablissementId).toBe("etab-A");
    expect(b.etablissementId).toBe("etab-B");
  });

  it("la fratrie se liste entière, toutes entreprises du compte, et s'arrête au compte", async () => {
    const fratrie = await listerEtablissementsDuCompte();

    // Les deux sites de la première société, puis celui de la seconde.
    expect(fratrie.map((e) => e.id)).toEqual(["etab-A", "etab-B", "etab-C"]);
    // La borne haute : l'établissement du voisin n'y est pas, alors qu'il
    // porterait le même écran s'il y entrait.
    expect(fratrie.map((e) => e.id)).not.toContain("etab-Z");
  });
});

describe("le cookie d'établissement actif est une entrée utilisateur", () => {
  it("sert l'établissement qu'il désigne quand il appartient au compte", async () => {
    h.cookie = "etab-B";
    expect((await getOptionalUserEtablissement())?.id).toBe("etab-B");
  });

  it("retombe sur le plus ancien quand il est absent", async () => {
    // Le défaut raisonnable : celui qu'a créé l'onboarding.
    expect((await getOptionalUserEtablissement())?.id).toBe("etab-A");
  });

  it("ne sert JAMAIS l'établissement d'un autre compte", async () => {
    // Le cookie est modifiable — c'est un en-tête de requête. Un `findUnique`
    // sur l'identifiant seul aurait ouvert le dossier du voisin à quiconque
    // devine un cuid ; ici le `where` remonte à `entreprise.userId`, la ligne
    // ne sort pas, et le repli joue.
    h.cookie = "etab-Z";
    const actif = await getOptionalUserEtablissement();

    expect(actif?.id).toBe("etab-A");
    expect(actif?.raisonDisplay).not.toBe("Chez le voisin");
  });

  it("retombe sur le défaut quand il désigne un établissement disparu", async () => {
    // Cas ordinaire, pas une attaque : le site a été supprimé, le cookie lui
    // survit. Il ne doit pas rendre `null` — un compte sans établissement
    // actif serait renvoyé à l'onboarding alors qu'il a un dossier ouvert.
    h.cookie = "etab-supprime-depuis";
    expect((await getOptionalUserEtablissement())?.id).toBe("etab-A");
  });

  it("porte le nom que le sélecteur écrit", () => {
    // Deux littéraux pour un même cookie — l'un à l'écriture, l'autre à la
    // lecture — ne divergent jamais bruyamment : la commutation cesserait
    // simplement d'avoir un effet.
    expect(COOKIE_ETABLISSEMENT_ACTIF).toBe("etablissement-actif");
  });
});
