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
import { CHAMP_TEMOIN_TYPES_ERP_AUTRES } from "@/lib/etablissements/types-erp-affiches";

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
      typesErpAutres: [] as string[],
      categorieErp: null as string | null,
      classeIgh: null as string | null,
      effectifPublicAdmis: null as number | null,
      dateAutorisationOuverture: null as Date | null,
      dateCertificatConformite: null as Date | null,
      comporteLocauxSommeilPublic: null as boolean | null,
      epiPresents: null as boolean | null,
      epiPresentsDetail: null as string | null,
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
        // Comme Prisma : une clé `undefined` ne touche pas à la colonne.
        Object.assign(
          db.etablissement,
          Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
        );
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
    // Les tables qui portent une clé de stockage (`suppression/fichiers.ts`).
    rapportVerification: {
      findMany: async () => [{ fichierCle: "rap/1.pdf" }, { fichierCle: "rap/2.pdf" }],
    },
    prestataire: {
      findMany: async () => [
        { attestationUrssafCle: "presta/urssaf.pdf", assuranceRcProCle: null, kbisCle: "presta/kbis.pdf" },
      ],
    },
    analyseLegionelle: {
      findMany: async () => [{ rapportCle: "leg/analyse.pdf" }],
    },
    // Une pièce de prestataire remplacée (2026-10-12) : elle part aussi.
    piecePrestataire: {
      findMany: async () => [{ fichierCle: "presta/urssaf-ancienne.pdf" }],
    },
    // La pièce d'un point corrigé (ADR-048) : elle part aussi.
    action: {
      findMany: async () => [{ leveeFichierCle: "points/piece.pdf" }],
    },
    // Transaction sans isolation : le corps reçoit le même client. Suffisant
    // pour l'ordre des écritures, qui est ce que ces tests regardent.
    $transaction: async <T,>(fn: (tx: unknown) => Promise<T>) => fn(prisma),
  };

  const stockage = { delete: vi.fn<(cle: string) => Promise<void>>(async () => {}) };

  return {
    db,
    prisma,
    stockage,
    genererCalendrier: vi.fn(async () => ({})),
    marquerCalendrierPerime: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/storage", () => ({ getStorage: () => h.stockage }));
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
/**
 * Le formulaire de CRÉATION : les trois régimes y sont répondus en Oui / Non
 * (2026-09-27, A2) — sans réponse, la porte refuse.
 */
function creation(over: Record<string, string> = {}): FormData {
  return formulaire({ estERP: "non", estIGH: "non", estHabitation: "non", ...over });
}

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
  h.db.etablissement.typesErpAutres = [];
  h.db.etablissement.comporteLocauxSommeilPublic = null;
  h.db.etablissement.categorieErp = null;
  h.db.etablissement.effectifPublicAdmis = null;
  h.db.etablissement.dateAutorisationOuverture = null;
  h.db.etablissement.dateCertificatConformite = null;
  h.db.etablissement.effectifSurSite = 5;
  h.db.etablissement.epiPresents = null;
  h.db.etablissement.epiPresentsDetail = null;
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
      creerEtablissement("ent-1", { status: "idle" }, creation()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(h.db.crees).toHaveLength(1);
    expect(h.db.crees[0]).toMatchObject({ entrepriseId: "ent-1" });
  });

  it("ouvre le bâtiment principal du nouveau site (ADR-019)", async () => {
    // Tout établissement naît avec le sien : sans lui, les équipements du
    // second site n'auraient nulle part où être rangés.
    await expect(
      creerEtablissement("ent-1", { status: "idle" }, creation()),
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
      creerEtablissement("ent-1", { status: "idle" }, creation()),
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
      creerEtablissement("ent-1", { status: "idle" }, creation()),
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

describe("supprimerEtablissement — les fichiers stockés partent avec (2026-09-27)", () => {
  const TOUTES = [
    "leg/analyse.pdf",
    "points/piece.pdf",
    "presta/kbis.pdf",
    "presta/urssaf-ancienne.pdf",
    "presta/urssaf.pdf",
    "rap/1.pdf",
    "rap/2.pdf",
  ];

  it("libère chaque fichier de chaque table, après la suppression en base", async () => {
    h.db.nbVersionsDuerp = 0;
    h.db.supprimes = [];
    h.stockage.delete.mockReset();
    h.stockage.delete.mockImplementation(async () => {
      // Libéré APRÈS que la base a tranché.
      expect(h.db.supprimes).toEqual(["etab-1"]);
    });
    await expect(supprimerEtablissement("etab-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(h.stockage.delete.mock.calls.map((c) => c[0]).sort()).toEqual(TOUTES);
  });

  it("un refus de la base ne libère aucun fichier", async () => {
    h.db.nbVersionsDuerp = 0;
    h.stockage.delete.mockReset();
    const original = h.prisma.etablissement.delete;
    h.prisma.etablissement.delete = async () => {
      throw Object.assign(new Error("P2003"), { code: "P2003" });
    };
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await supprimerEtablissement("etab-1");
    expect(res.statut).toBe("refus");
    expect(h.stockage.delete).not.toHaveBeenCalled();
    h.prisma.etablissement.delete = original;
    erreur.mockRestore();
  });

  it("un échec du stockage n'annule pas la suppression : journalisé, et on redirige", async () => {
    h.db.nbVersionsDuerp = 0;
    h.db.supprimes = [];
    h.stockage.delete.mockReset();
    h.stockage.delete.mockRejectedValue(new Error("stockage indisponible"));
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(supprimerEtablissement("etab-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.supprimes).toEqual(["etab-1"]);
    expect(erreur.mock.calls.filter((c) => String(c[0]).includes("fichier non libéré"))).toHaveLength(TOUTES.length);
    erreur.mockRestore();
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

// ~~« la présence d'EPI se corrige à la fiche (2026-10-12, audit B2) »~~
// [2026-10-22 : la question quitte la fiche, devenue un fait d'activité.]
describe("modifierEtablissement — la fiche n'écrit plus la présence d'EPI (2026-10-22)", () => {
  // Les EPI découlent de l'évaluation des risques : la réponse se donne au
  // DUERP ou dans Équipe (`ecrireFaitActivite`), ou se constate par une mesure
  // (`epi-constate.ts`). Un champ forgé ne doit rien écrire ici.
  it("un epiPresents posté est ignoré, et ne régénère rien", async () => {
    h.db.etablissement.epiPresents = false;
    h.db.etablissement.epiPresentsDetail = null;
    const res = await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ epiPresents: "oui", epiPresentsDetail: "gants" }),
    );
    expect(res.status).toBe("success");
    expect(h.db.etablissement.epiPresents).toBe(false);
    expect(h.db.etablissement.epiPresentsDetail).toBeNull();
    expect(h.genererCalendrier).not.toHaveBeenCalled();
  });
});

describe("creerEtablissement — aucun régime lu « non » sans réponse (2026-09-27, A2)", () => {
  // La case vide valait « non » : un second établissement recevant du public
  // naissait non-ERP. Éprouvé en retirant le refus `regimesSansReponse`.
  it.each(["estERP", "estIGH", "estHabitation"])("%s absent : refus, rien n'est créé", async (champ) => {
    const fd = creation();
    fd.delete(champ);
    const res = await creerEtablissement("ent-1", { status: "idle" }, fd);
    expect(res.status).toBe("error");
    expect(res.status === "error" && res.fieldErrors?.[champ]).toBeTruthy();
  });

  it("« oui » à l'ERP s'écrit vrai, « non » faux", async () => {
    const avant = h.db.crees.length;
    await creerEtablissement(
      "ent-1",
      { status: "idle" },
      creation({ estERP: "oui", typeErp: "N", categorieErp: "N5" }),
    ).catch(() => undefined);
    const data = h.db.crees[avant] as Record<string, unknown>;
    expect(data.estERP).toBe(true);
    expect(data.estIGH).toBe(false);
    expect(data.estHabitation).toBe(false);
  });
});

/** Le formulaire, avec une ou plusieurs cases « autres types » cochées (ADR-045). */
function avecAutresTypes(fd: FormData, types: string[]): FormData {
  for (const t of types) fd.append("typesErpAutres", t);
  return fd;
}

describe("plusieurs types d'ERP — l'écriture respecte les contraintes de la base (ADR-045, lot 2)", () => {
  // Une contrainte CHECK (migration 20261017120000) : pas de `typeErp` parmi
  // les autres types. Une écriture qui l'ignorerait planterait en base ; le
  // double de Prisma ne la vérifie pas, ces tests vérifient donc ce que
  // l'action ÉCRIT.
  it("décocher l'ERP garde les autres types, comme le premier — une erreur de clic ne perd rien", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N3";
    h.db.etablissement.typesErpAutres = ["M"];
    await modifierEtablissement("etab-1", { status: "idle" }, formulaire());
    expect(h.db.etablissement.estERP).toBe(false);
    expect(h.db.etablissement.typeErp).toBe("N");
    expect(h.db.etablissement.typesErpAutres).toEqual(["M"]);
  });

  it("le premier type qui passe parmi les autres en est retiré", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N3";
    h.db.etablissement.typesErpAutres = ["M", "W"];
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ estERP: "on", typeErp: "M", categorieErp: "N3" }),
    );
    expect(h.db.etablissement.typesErpAutres).toEqual(["W"]);
  });

  it("non posté, la liste en base est gardée — et la réponse sur le sommeil qu'un autre type appelle aussi", async () => {
    // Un restaurant qui exploite aussi un hôtel : N en premier, O parmi les
    // autres. La fiche d'un N ne pose pas la question ; la réponse donnée
    // pour l'hôtel ne doit pas être effacée.
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N3";
    h.db.etablissement.typesErpAutres = ["O"];
    h.db.etablissement.comporteLocauxSommeilPublic = true;
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ estERP: "on", typeErp: "N", categorieErp: "N3" }),
    );
    expect(h.db.etablissement.typesErpAutres).toEqual(["O"]);
    expect(h.db.etablissement.comporteLocauxSommeilPublic).toBe(true);
  });

  it("posté, la liste s'écrit dédoublonnée, sans le premier type, et le calendrier se recalcule", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N3";
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      avecAutresTypes(formulaire({ estERP: "on", typeErp: "N", categorieErp: "N3" }), ["M", "M", "N"]),
    );
    expect(h.db.etablissement.typesErpAutres).toEqual(["M"]);
    expect(h.genererCalendrier).toHaveBeenCalled();
  });

  it("la même liste reposée ne recalcule rien : elle se compare par son contenu", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N3";
    h.db.etablissement.typesErpAutres = ["M"];
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      avecAutresTypes(formulaire({ estERP: "on", typeErp: "N", categorieErp: "N3" }), ["M"]),
    );
    expect(h.genererCalendrier).not.toHaveBeenCalled();
  });

  it("le même ensemble dans un autre ordre ne recalcule rien : il se compare trié", async () => {
    // Revue de c6 (2026-10-17) : la comparaison par `JSON.stringify` voyait un
    // changement dans ["W", "M"] → ["M", "W"]. Éprouvé en retirant le tri : rouge.
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N3";
    h.db.etablissement.typesErpAutres = ["W", "M"];
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      avecAutresTypes(formulaire({ estERP: "on", typeErp: "N", categorieErp: "N3" }), ["M", "W"]),
    );
    expect(h.genererCalendrier).not.toHaveBeenCalled();
  });

  it("une liste trop longue est refusée, d'un seul message, sans rien écrire", async () => {
    // Revue de c6 (2026-10-17) : sans borne, 300 000 entrées rendaient 52 Mo
    // d'erreurs, un million une RangeError et un 500. Éprouvé en retirant la
    // borne du schéma et la troncature de `typesErpAutresPostes` : rouge.
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N3";
    h.db.etablissement.typesErpAutres = ["M"];
    const res = await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      avecAutresTypes(
        formulaire({ estERP: "on", typeErp: "N", categorieErp: "N3" }),
        Array.from({ length: 5_000 }, () => "pas-un-type"),
      ),
    );
    expect(res.status).toBe("error");
    expect(res.status === "error" && res.fieldErrors?.typesErpAutres).toEqual([
      "La liste des autres types d'ERP est trop longue.",
    ]);
    expect(h.db.etablissement.typesErpAutres).toEqual(["M"]);
  });

  it("la porte refuse d'autres types sur un établissement qui n'est pas ERP", async () => {
    const res = await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      avecAutresTypes(formulaire(), ["M"]),
    );
    expect(res.status).toBe("error");
  });

  it("à la création, la question du sommeil est due dès qu'un des types l'appelle", async () => {
    const sansReponse = await creerEtablissement(
      "ent-1",
      { status: "idle" },
      avecAutresTypes(creation({ estERP: "oui", typeErp: "N", categorieErp: "N3" }), ["O"]),
    );
    expect(sansReponse.status).toBe("error");
    expect(h.db.crees).toEqual([]);

    await expect(
      creerEtablissement(
        "ent-1",
        { status: "idle" },
        avecAutresTypes(
          creation({ estERP: "oui", typeErp: "N", categorieErp: "N3", comporteLocauxSommeilPublic: "oui" }),
          ["O"],
        ),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.crees[0]).toMatchObject({ typeErp: "N", typesErpAutres: ["O"], comporteLocauxSommeilPublic: true });
  });
});

describe("plusieurs types d'ERP — la fiche poste la liste entière, avec son témoin (ADR-045, lot 3)", () => {
  const temoin = (fd: FormData) => {
    fd.set(CHAMP_TEMOIN_TYPES_ERP_AUTRES, "1");
    return fd;
  };

  it("des cases toutes décochées retirent les autres types", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N3";
    h.db.etablissement.typesErpAutres = ["M"];
    await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      temoin(formulaire({ estERP: "on", typeErp: "N", categorieErp: "N3" })),
    );
    expect(h.db.etablissement.typesErpAutres).toEqual([]);
  });

  it("un N + O posté sans réponse sur le sommeil est refusé — la question était à l'écran", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N3";
    h.db.etablissement.typesErpAutres = ["O"];
    const res = await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      avecAutresTypes(temoin(formulaire({ estERP: "on", typeErp: "N", categorieErp: "N3" })), ["O"]),
    );
    expect(res.status).toBe("error");
  });
});

describe("filtre à l'accueil — création et fiche (2026-10-17)", () => {
  const avecAutres = (fd: FormData, autres: string[]) => {
    fd.set(CHAMP_TEMOIN_TYPES_ERP_AUTRES, "1");
    for (const t of autres) fd.append("typesErpAutres", t);
    return fd;
  };
  const champs = (res: { status: string; fieldErrors?: Record<string, unknown> }) =>
    Object.keys(res.fieldErrors ?? {});

  it("création : un type J est refusé, rien n'est écrit", async () => {
    const res = await creerEtablissement("ent-1", { status: "idle" }, creation({ estERP: "oui", typeErp: "J", categorieErp: "N4" }));
    expect(res.status).toBe("error");
    expect(champs(res as never)).toContain("typeErp");
    expect(h.db.crees).toHaveLength(0);
  });

  it("création : un R sans enfants passe, et la réponse n'est pas écrite", async () => {
    await expect(
      creerEtablissement("ent-1", { status: "idle" }, creation({ estERP: "oui", typeErp: "R", categorieErp: "N5", accueilEnfants: "non", comporteLocauxSommeilPublic: "non" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.crees).toHaveLength(1);
    expect(h.db.crees[0]).not.toHaveProperty("accueilEnfants");
  });

  it("création : un R qui accueille des enfants est refusé", async () => {
    const res = await creerEtablissement("ent-1", { status: "idle" }, creation({ estERP: "oui", typeErp: "R", categorieErp: "N5", accueilEnfants: "oui", comporteLocauxSommeilPublic: "non" }));
    expect(champs(res as never)).toContain("accueilEnfants");
    expect(h.db.crees).toHaveLength(0);
  });

  it("fiche : un restaurant qui passe en J est refusé, la base ne bouge pas", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N4";
    const res = await modifierEtablissement("etab-1", { status: "idle" }, formulaire({ estERP: "on", typeErp: "J", categorieErp: "N4" }));
    expect(res.status).toBe("error");
    expect(champs(res as never)).toEqual(["typeErp"]);
    expect(h.db.etablissement.typeErp).toBe("N");
  });

  it("fiche : N → J avec la réponse au sommeil donnée, refusé par le filtre à la transition", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N4";
    const res = await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      formulaire({ estERP: "on", typeErp: "J", categorieErp: "N4", comporteLocauxSommeilPublic: "oui" }),
    );
    expect(champs(res as never)).toEqual(["typeErp"]);
    expect(h.db.etablissement.typeErp).toBe("N");
  });

  it("fiche : un U ajouté en autre type est refusé", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N4";
    const res = await modifierEtablissement(
      "etab-1",
      { status: "idle" },
      avecAutres(formulaire({ estERP: "on", typeErp: "N", categorieErp: "N4" }), ["U"]),
    );
    expect(champs(res as never)).toEqual(["typesErpAutres"]);
  });

  it("fiche : un dossier J créé avant le filtre s'enregistre comme avant", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "J";
    h.db.etablissement.categorieErp = "N4";
    const res = await modifierEtablissement("etab-1", { status: "idle" }, formulaire({ estERP: "on", typeErp: "J", categorieErp: "N4", adresse: "2 rue des Lilas", comporteLocauxSommeilPublic: "oui" }));
    expect(res.status).toBe("success");
  });

  it("fiche : R qui entre sans réponse est refusé ; avec « non », accepté ; la réponse ne s'écrit pas", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "N";
    h.db.etablissement.categorieErp = "N5";
    const sans = await modifierEtablissement("etab-1", { status: "idle" }, formulaire({ estERP: "on", typeErp: "R", categorieErp: "N5", comporteLocauxSommeilPublic: "non" }));
    expect(champs(sans as never)).toEqual(["accueilEnfants"]);
    const non = await modifierEtablissement("etab-1", { status: "idle" }, formulaire({ estERP: "on", typeErp: "R", categorieErp: "N5", accueilEnfants: "non", comporteLocauxSommeilPublic: "non" }));
    expect(non.status).toBe("success");
    expect(h.db.etablissement).not.toHaveProperty("accueilEnfants");
  });

  it("fiche : un établissement déjà R n'est pas réinterrogé, et une réponse postée est refusée", async () => {
    h.db.etablissement.estERP = true;
    h.db.etablissement.typeErp = "R";
    h.db.etablissement.categorieErp = "N5";
    const res = await modifierEtablissement("etab-1", { status: "idle" }, formulaire({ estERP: "on", typeErp: "R", categorieErp: "N5", comporteLocauxSommeilPublic: "non" }));
    expect(res.status).toBe("success");
    const force = await modifierEtablissement("etab-1", { status: "idle" }, formulaire({ estERP: "on", typeErp: "R", categorieErp: "N5", accueilEnfants: "non", comporteLocauxSommeilPublic: "non" }));
    expect(champs(force as never)).toEqual(["accueilEnfants"]);
  });
});
