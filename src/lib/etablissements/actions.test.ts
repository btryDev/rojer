// Fiche établissement — deux régressions silencieuses couvertes ici :
//
//  1. modifier le régime ou la catégorie ne recalculait jamais les
//     obligations : une boutique qui devenait ERP n'héritait pas de la
//     vérification électrique annuelle par organisme agréé ;
//  2. supprimer l'établissement effaçait les versions de DUERP, que la loi
//     impose de conserver 40 ans. La base refuse désormais ; l'utilisateur
//     doit lire une explication, pas une erreur Prisma.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NOM_BATIMENT_PRINCIPAL } from "@/lib/batiments/schema";

const h = vi.hoisted(() => {
  const db = {
    etablissement: {
      id: "etab-1",
      entrepriseId: "ent-1",
      raisonDisplay: "Le Bistrot",
      adresse: "1 rue des Lilas",
      codeNaf: "56.10A",
      effectifSurSite: 5,
      estEtablissementTravail: true,
      estERP: false,
      estIGH: false,
      estHabitation: false,
      typeErp: null as string | null,
      categorieErp: null as string | null,
      classeIgh: null as string | null,
      effectifPublicAdmis: null as number | null,
      dateAutorisationOuverture: null as Date | null,
      dateCertificatConformite: null as Date | null,
      comporteLocauxSommeilPublic: null as boolean | null,
    },
    nbVersionsDuerp: 0,
    supprimes: [] as string[],
    crees: [] as Record<string, unknown>[],
    // Ce que le cookie d'établissement actif a reçu (ADR-028).
    cookiePose: null as { nom: string; valeur: string } | null,
  };

  const prisma = {
    etablissement: {
      // Copie : Prisma rend un objet détaché, et c'est essentiel ici —
      // l'action compare l'état lu avant `update` à celui écrit après.
      findUnique: async () => ({ ...db.etablissement }),
      findFirst: async () => ({ ...db.etablissement }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(db.etablissement, data);
        return db.etablissement;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        db.crees.push(data);
        return { ...db.etablissement, id: `etab-${db.crees.length}` };
      },
      delete: async ({ where }: { where: { id: string } }) => {
        db.supprimes.push(where.id);
        return db.etablissement;
      },
    },
    duerpVersion: {
      count: async () => db.nbVersionsDuerp,
    },
  };

  return {
    db,
    prisma,
    genererCalendrier: vi.fn(async () => ({})),
    marquerCalendrierPerime: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (nom: string, valeur: string) => {
      h.db.cookiePose = { nom, valeur };
    },
    get: () => undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "user-1" })),
  assertEntrepriseOwnership: vi.fn(async () => ({ id: "user-1" })),
  // Le nom du cookie voyage avec les gardes : il est défini là où il est LU
  // (`scope.ts`), pour qu'écriture et lecture ne puissent pas diverger.
  COOKIE_ETABLISSEMENT_ACTIF: "etablissement-actif",
}));
vi.mock("@/lib/calendrier/actions", () => ({
  genererCalendrier: h.genererCalendrier,
}));
vi.mock("@/lib/calendrier/reconciliation", () => ({
  marquerCalendrierPerime: h.marquerCalendrierPerime,
}));

const { creerEtablissement, modifierEtablissement, supprimerEtablissement } =
  await import("./actions");

/** Le formulaire poste toutes ses cases : les non cochées sont absentes. */
function formulaire(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("raisonDisplay", "Le Bistrot");
  fd.set("adresse", "1 rue des Lilas");
  fd.set("codeNaf", "56.10A");
  fd.set("effectifSurSite", "5");
  fd.set("estEtablissementTravail", "on");
  // Dû depuis le 2026-09-20 à un ERP que ni sa catégorie ni son effectif ne
  // portent au seuil de R. 4227-34 — le cas de presque tous les tests d'ici.
  fd.set("personnesPresentesHabituellement", "30");
  for (const [k, v] of Object.entries(over)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  h.db.etablissement.estERP = false;
  h.db.etablissement.typeErp = null;
  h.db.etablissement.categorieErp = null;
  h.db.etablissement.effectifPublicAdmis = null;
  h.db.etablissement.dateAutorisationOuverture = null;
  h.db.etablissement.dateCertificatConformite = null;
  h.db.etablissement.effectifSurSite = 5;
  h.db.nbVersionsDuerp = 0;
  h.db.supprimes = [];
  h.db.crees = [];
  h.db.cookiePose = null;
  h.genererCalendrier.mockClear();
});

describe("creerEtablissement — le second dossier d'un compte (ADR-028)", () => {
  /**
   * Le verrou retiré ici ne refusait pas : il REDIRIGEAIT vers l'établissement
   * existant. Un dirigeant qui remplissait le formulaire pour son deuxième
   * commerce se retrouvait sur la fiche du premier, sans un mot — sa saisie
   * était perdue et rien ne disait pourquoi.
   *
   * Vérifié en le cassant : en remettant le `findFirst` + `redirect`, ces deux
   * tests tombent, et eux seuls.
   */
  it("crée, au lieu de renvoyer vers l'établissement existant", async () => {
    // Le faux Prisma rend TOUJOURS un établissement sur `findFirst` : c'est
    // exactement l'état qui déclenchait l'ancien renvoi.
    await expect(
      creerEtablissement("ent-1", { status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(h.db.crees).toHaveLength(1);
    expect(h.db.crees[0]).toMatchObject({ entrepriseId: "ent-1" });
  });

  it("ouvre le bâtiment principal du nouveau site (ADR-019)", async () => {
    // Tout établissement naît avec le sien : sans lui, les équipements du
    // second site n'auraient nulle part où être rangés.
    await expect(
      creerEtablissement("ent-1", { status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(h.db.crees[0].batiments).toEqual({
      create: { nom: NOM_BATIMENT_PRINCIPAL, ordre: 0 },
    });
  });

  it("bascule l'établissement actif sur celui qu'on vient de créer", async () => {
    // Sans ce trait, l'accueil renverrait au premier site juste après la
    // création du second : on aurait rempli un formulaire pour atterrir
    // ailleurs.
    await expect(
      creerEtablissement("ent-1", { status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(h.db.cookiePose).toEqual({
      nom: "etablissement-actif",
      valeur: "etab-1",
    });
  });

  it("génère le calendrier du nouvel établissement avant d'y conduire", async () => {
    // Revue du 2026-09-14 : le calendrier n'était généré qu'à la première
    // déclaration d'équipement ou à l'ouverture de la page Calendrier. Un site
    // sans appareil doit pourtant ses obligations d'établissement (ADR-022), et
    // son tableau de bord se disait vide en attendant.
    await expect(
      creerEtablissement("ent-1", { status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(h.genererCalendrier).toHaveBeenCalledWith("etab-1");
  });

  it("refuse un formulaire invalide sans rien créer", async () => {
    // La borne basse : lever le verrou n'a pas levé la validation.
    const res = await creerEtablissement(
      "ent-1",
      { status: "idle" },
      formulaire({ raisonDisplay: "" }),
    );

    expect(res.status).toBe("error");
    expect(h.db.crees).toHaveLength(0);
  });
});

describe("modifierEtablissement — recalcul des obligations", () => {
  it("régénère le calendrier quand l'établissement devient ERP", async () => {
    const res = await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ estERP: "on", typeErp: "N", categorieErp: "N5" }),
    );

    expect(res.status).toBe("success");
    expect(h.genererCalendrier).toHaveBeenCalledWith("etab-1");
  });

  it("régénère quand la catégorie ERP change (5e → 3e)", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N5";

    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ estERP: "on", typeErp: "N", categorieErp: "N3" }),
    );

    expect(h.genererCalendrier).toHaveBeenCalledTimes(1);
  });

  it("régénère quand l'effectif change (les seuils font basculer des obligations)", async () => {
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ effectifSurSite: "42" }),
    );

    expect(h.genererCalendrier).toHaveBeenCalledTimes(1);
  });

  it("ne régénère pas pour un simple changement d'adresse", async () => {
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ adresse: "2 rue des Lilas" }),
    );

    expect(h.genererCalendrier).not.toHaveBeenCalled();
  });

  it("avertit sans faire échouer la saisie si la régénération casse", async () => {
    h.genererCalendrier.mockImplementation(async () => {
      throw new Error("base indisponible");
    });

    const res = await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ estERP: "on", typeErp: "N", categorieErp: "N5" }),
    );

    expect(res.status).toBe("success_avec_avertissement");
    h.genererCalendrier.mockImplementation(async () => ({}));
  });
});

describe("supprimerEtablissement — conservation 40 ans", () => {
  it("refuse la suppression quand une version de DUERP est archivée", async () => {
    h.db.nbVersionsDuerp = 2;

    const res = await supprimerEtablissement("etab-1");

    expect(res.statut).toBe("refus");
    expect(h.db.supprimes).toEqual([]);
    // Le message doit être compréhensible sans être juriste, et citer le texte.
    expect(res.message).toContain("R. 4121-4");
    expect(res.message).toContain("40 ans");
    expect(res.exportHref).toBe("/etablissements/etab-1/controle");
  });

  it("ne laisse jamais remonter une erreur Prisma brute", async () => {
    h.db.nbVersionsDuerp = 0; // le comptage ne voit rien…
    const original = h.prisma.etablissement.delete;
    // …mais la base refuse quand même (course, ou nouveau Restrict).
    h.prisma.etablissement.delete = async () => {
      throw Object.assign(new Error("Foreign key constraint failed"), {
        code: "P2003",
      });
    };

    const res = await supprimerEtablissement("etab-1");

    expect(res.statut).toBe("refus");
    expect(res.message).not.toContain("P2003");
    expect(res.message).toContain("conservation obligatoire");

    h.prisma.etablissement.delete = original;
  });

  it("supprime — et redirige — quand aucune pièce à conserver n'existe", async () => {
    h.db.nbVersionsDuerp = 0;

    await expect(supprimerEtablissement("etab-1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(h.db.supprimes).toEqual(["etab-1"]);
  });
});

describe("modifierEtablissement — les champs ERP ne s'effacent pas tout seuls", () => {
  // Relevé en revue. Les trois colonnes de la fiche « Renseignements
  // généraux » ne sont rendues que dans le bloc `{estERP && (…)}` du
  // formulaire. Décocher la case les retirait du FormData, le schéma les
  // coerçait en null, et Prisma les écrasait en base. Un dirigeant qui
  // décochait par erreur, enregistrait, puis recochait, retrouvait son type
  // et sa catégorie — protégés de longue date par `|| undefined` — mais avait
  // perdu ses dates pour de bon.
  it("conserve les valeurs quand la case ERP est décochée", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "CINQUIEME";
    h.db.etablissement.effectifPublicAdmis = 120;
    h.db.etablissement.dateAutorisationOuverture = new Date("2020-03-01");

    // Le formulaire sans `estERP` : les trois champs ne sont pas postés.
    await modifierEtablissement("etab-1", { status: "idle" }, formulaire());

    expect(h.db.etablissement.effectifPublicAdmis).toBe(120);
    expect(h.db.etablissement.dateAutorisationOuverture).toEqual(
      new Date("2020-03-01"),
    );
  });

  it("écrit bien la valeur quand le champ est posté", async () => {
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({
        estERP: "on",
        typeErp: "N",
        categorieErp: "N5",
        effectifPublicAdmis: "80",
      }),
    );

    expect(h.db.etablissement.effectifPublicAdmis).toBe(80);
  });
});

describe("modifierEtablissement — la réponse sur le sommeil suit le type (2026-09-20)", () => {
  // LE BRANCHEMENT, pas la fonction. `reponse-sommeil.test.ts` tient
  // `reponseSommeilSuivantLeType` comme fonction pure ; la revue du lot a
  // retiré ses trois appels d'`actions.ts` et 3131 tests sont restés verts.
  // Une règle juste que personne n'appelle ne protège rien : c'est ici qu'on
  // vérifie qu'elle est sur le chemin d'écriture.
  it("un hôtel devenu restaurant perd sa réponse en base", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "O";
    h.db.etablissement.categorieErp = "N5";
    h.db.etablissement.comporteLocauxSommeilPublic = true;

    // Le formulaire d'un type N n'affiche plus la question : le champ n'est
    // pas posté. Sans le branchement, rien n'écrirait la colonne et le « oui »
    // de l'ancien hôtel survivrait.
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ estERP: "on", typeErp: "N", categorieErp: "N5" }),
    );

    expect(h.db.etablissement.comporteLocauxSommeilPublic).toBeNull();
  });

  it("un hôtel qui répond voit sa réponse écrite", async () => {
    h.db.etablissement.comporteLocauxSommeilPublic = null;
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({
        estERP: "on",
        typeErp: "O",
        categorieErp: "N5",
        comporteLocauxSommeilPublic: "non",
      }),
    );
    expect(h.db.etablissement.comporteLocauxSommeilPublic).toBe(false);
  });

  it("LA PORTE refuse un hôtel muet — la réponse est due côté serveur", async () => {
    // Le `required` du formulaire ne tient que dans le navigateur.
    h.db.etablissement.comporteLocauxSommeilPublic = null;
    const res = await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ estERP: "on", typeErp: "O", categorieErp: "N5" }),
    );
    expect(res.status).toBe("error");
    expect(h.db.etablissement.comporteLocauxSommeilPublic).toBeNull();
  });
});
