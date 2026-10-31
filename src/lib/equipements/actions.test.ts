// Suppression d'un équipement — la version physique cascadait sur toutes ses
// vérifications, donc sur les rapports du registre de sécurité et sur les
// actions correctives. On vérifie ici l'arbitrage retenu (ADR-012) :
// suppression physique seulement si l'équipement ne porte aucune trace,
// désactivation sinon.

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const db = {
    equipements: [{ id: "eq-1", etablissementId: "etab-1", actif: true }],
    /** Nombre de vérifications porteuses de trace pour l'équipement. */
    nbTraces: 0,
    supprimesPhysiquement: [] as string[],
    crees: [] as Record<string, unknown>[],
    /** Lignes reçues par `createMany`, pour prouver qu'un refus n'écrit rien. */
    creesEnLot: [] as unknown[],
    /** Les UPDATE reçus par le faux `$executeRaw`, tels qu'émis. */
    requetes: [] as { sql: string; valeurs: unknown[] }[],
    /** Une écriture concurrente, jouée APRÈS la lecture de l'appareil. */
    apresLecture: null as null | (() => void),
    /** La réponse à « Fournissez-vous des EPI ? », et l'ordre des écritures. */
    etablissement: { id: "etab-1", epiPresents: false as boolean | null },
    journal: [] as string[],
    regime: {
      estERP: false,
      typeErp: null as string | null,
      categorieErp: null as string | null,
      ssiCategorieAouB: null as boolean | null,
    },
  };

  const prisma = {
    equipement: {
      // Une PHOTO, comme la base en rend une. [2026-10-14 : plus aucune lecture
      // de l'action ne passe par ici — elles sont bornées au compte, par
      // `findFirst` ci-dessous ; gardé pour qu'une régression vers la lecture
      // par le seul id reste observable.]
      findUnique: async ({ where }: { where: { id: string } }) => {
        const e = db.equipements.find((x) => x.id === where.id);
        const photo = e ? structuredClone(e) : null;
        db.apresLecture?.();
        return photo;
      },
      // La lecture d'entrée porte le compte (`appareilDuCompte`) : le faux
      // l'applique — « etab-1 » est au compte « user-1 » du test, tout autre
      // établissement à un voisin. Elle rend aussi une photo et déclenche
      // `apresLecture`, pour que les tests de concurrence portent sur elle.
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { id: string; etablissement?: { entreprise?: { userId?: string } } };
        }) => {
          const e = db.equipements.find(
            (x) =>
              x.id === where.id &&
              (where.etablissement?.entreprise?.userId === undefined ||
                (x.etablissementId === "etab-1" ? "user-1" : "u-voisin") ===
                  where.etablissement.entreprise.userId),
          );
          const photo = e ? structuredClone(e) : null;
          db.apresLecture?.();
          return photo;
        },
      ),
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const e = db.equipements.find((x) => x.id === where.id);
        Object.assign(e as object, data);
        return e;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        db.supprimesPhysiquement.push(where.id);
        const e = db.equipements.find((x) => x.id === where.id);
        db.equipements = db.equipements.filter((x) => x.id !== where.id);
        return e;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        db.crees.push(data);
        return { id: "eq-nouveau" };
      },
      createMany: async ({ data }: { data: unknown[] }) => {
        db.creesEnLot.push(...data);
        return { count: data.length };
      },
    },
    // Le faux `$executeRaw` applique la fusion CLÉ À CLÉ que la base applique
    // à un `jsonb_set` d'une seule ligne. Il reproduit cette sémantique, il ne
    // la démontre pas : ce que le test prouve, c'est que l'action la délègue
    // à la base au lieu de fusionner tout l'objet elle-même (même limite que
    // `activites/actions.test.ts`).
    $executeRaw: async (strings: TemplateStringsArray, ...valeurs: unknown[]) => {
      db.requetes.push({ sql: strings.join("?"), valeurs });
      const [cle, valeur, id, etablissementId] = valeurs as [string, boolean, string, string];
      // La garde « actif » (revue du 2026-10-13, R2) n'est appliquée que si le
      // SQL la porte : le faux joue ce que la requête dit, pas ce qu'on espère.
      const exigeActif = /"actif"\s*=\s*true/.test(strings.join("?"));
      const e = db.equipements.find(
        (x) =>
          x.id === id &&
          x.etablissementId === etablissementId &&
          (!exigeActif || x.actif === true),
      ) as (Record<string, unknown> & { caracteristiques?: unknown }) | undefined;
      if (!e) return 0;
      const base =
        e.caracteristiques !== null && typeof e.caracteristiques === "object" && !Array.isArray(e.caracteristiques)
          ? (e.caracteristiques as Record<string, unknown>)
          : {};
      e.caracteristiques = { ...base, [cle]: valeur };
      return 1;
    },
    verification: {
      count: async () => db.nbTraces,
    },
    // Les points qu'un contrôle d'ensemble a désignés sur l'appareil
    // (ADR-048) : aucun ici, les traces sont celles des vérifications.
    action: { count: async () => 0 },
    etablissement: {
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; OR: { epiPresents: boolean | null }[] };
        data: { epiPresents: boolean };
      }) => {
        const e = db.etablissement;
        const vise =
          e.id === where.id && where.OR.some((c) => c.epiPresents === e.epiPresents);
        if (vise) {
          e.epiPresents = data.epiPresents;
          db.journal.push("epiPresents");
        }
        return { count: vise ? 1 : 0 };
      },
      // Le régime que l'exigence des réponses lit (2026-10-12).
      findUnique: async () => db.regime,
    },
  };

  return {
    db,
    prisma,
    genererCalendrier: vi.fn(async () => ({})),
    // Comme le vrai : un établissement qui n'est pas au compte « user-1 » → 404.
    assertOwnership: vi.fn(async (etablissementId: string) => {
      if (etablissementId !== "etab-1") throw new Error("NEXT_NOT_FOUND");
      return { id: "user-1", etablissementId };
    }),
    marquerCalendrierPerime: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// La règle des EPI constatés vit dans `epi-constate.ts`, testée là ; ici, on
// vérifie que chaque écriture d'équipement l'appelle, AVANT la régénération.
vi.mock("@/lib/etablissements/epi-constate", () => ({
  constaterEpiDuCompte: vi.fn(async (_db: unknown, id: string, opts?: { regenerer?: boolean }) => {
    h.db.journal.push(`constat:${id}:${opts?.regenerer === false ? "sans-regen" : "regen"}`);
    return false;
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
// La marque « calendrier périmé » passe par le client de la session (ADR-051).
const dbDuCompte = vi.hoisted(() => ({ nom: "client du compte" }));
vi.mock("@/lib/auth/compte", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/compte")>()),
  getOptionalCompte: async () => ({ user: { id: "user-1" }, db: dbDuCompte }),
}));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: h.assertOwnership,
  // La garde rend aussi le client borné (ADR-051) : ici, le client simulé.
  assertEtablissementDuCompte: async (...a: unknown[]) => ({
    user: (await (h.assertOwnership as (...x: unknown[]) => unknown)(...a)) ?? { id: "u1" },
    db: (await import("@/lib/prisma")).prisma,
  }),
}));
vi.mock("@/lib/batiments/queries", () => ({
  batimentParDefaut: async () => ({ id: "bat-1" }),
}));
vi.mock("@/lib/calendrier/actions", () => ({
  genererCalendrier: h.genererCalendrier,
}));
vi.mock("@/lib/calendrier/reconciliation", () => ({
  marquerCalendrierPerime: h.marquerCalendrierPerime,
}));

const {
  creerEquipement,
  creerEquipementsDepuisPreRemplissage,
  modifierEquipement,
  supprimerEquipement,
} = await import("./actions");
const { questionsExigeesPour, CATEGORIES_A_REPONSE_EXIGEE, REGIME_TRAVAIL } = await import(
  "./reponses-exigees"
);
const { MESSAGE_APPAREIL_RETIRE } = await import("./retrait");

beforeEach(() => {
  h.db.equipements = [{ id: "eq-1", etablissementId: "etab-1", actif: true }];
  h.db.nbTraces = 0;
  h.db.supprimesPhysiquement = [];
  h.db.crees = [];
  h.db.creesEnLot = [];
  h.db.requetes = [];
  h.db.apresLecture = null;
  h.db.etablissement = { id: "etab-1", epiPresents: false };
  h.db.journal = [];
  h.db.regime = { estERP: false, typeErp: null, categorieErp: null, ssiCategorieAouB: null };
  h.assertOwnership.mockClear();
  h.prisma.equipement.findFirst.mockClear();
  h.genererCalendrier.mockClear();
  h.genererCalendrier.mockImplementation(async () => {
    h.db.journal.push("régénération");
    return {};
  });
  h.marquerCalendrierPerime.mockClear();
});

describe("supprimerEquipement", () => {
  it("supprime physiquement un équipement sans aucun historique", async () => {
    h.db.nbTraces = 0;

    const res = await supprimerEquipement("eq-1");

    expect(res).toEqual({ statut: "supprime" });
    expect(h.db.supprimesPhysiquement).toEqual(["eq-1"]);
  });

  it("désactive au lieu de supprimer dès qu'un rapport ou une action existe", async () => {
    h.db.nbTraces = 1;

    const res = await supprimerEquipement("eq-1");

    expect(res.statut).toBe("desactive");
    expect(h.db.supprimesPhysiquement).toEqual([]);
    expect(h.db.equipements[0].actif).toBe(false);
  });

  it("une preuve arrivée entre le comptage et la suppression : la base refuse, l'appareil est désactivé (2026-10-28)", async () => {
    // Le comptage n'a rien vu ; un rapport est déposé juste après. Depuis la
    // migration `20261030100000_preuves_protegees_en_base`, la base refuse la
    // suppression (P2003) au lieu d'emporter le rapport en cascade.
    h.db.nbTraces = 0;
    const supprimer = h.prisma.equipement.delete;
    h.prisma.equipement.delete = async () => {
      throw new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint violated: RapportVerification_verificationId_fkey",
        { code: "P2003", clientVersion: "6" },
      );
    };
    try {
      const res = await supprimerEquipement("eq-1");

      expect(res.statut).toBe("desactive");
      expect(h.db.equipements[0].actif).toBe(false);
    } finally {
      h.prisma.equipement.delete = supprimer;
    }
  });

  it("une autre erreur de la base à la suppression n'est pas maquillée en désactivation", async () => {
    h.db.nbTraces = 0;
    const supprimer = h.prisma.equipement.delete;
    h.prisma.equipement.delete = async () => {
      throw new Error("base indisponible");
    };
    try {
      await expect(supprimerEquipement("eq-1")).rejects.toThrow("base indisponible");
      expect(h.db.equipements[0].actif).toBe(true);
    } finally {
      h.prisma.equipement.delete = supprimer;
    }
  });

  it("explique à l'utilisateur ce qui est conservé et pourquoi", async () => {
    h.db.nbTraces = 3;
    const res = await supprimerEquipement("eq-1");

    expect(res.statut).toBe("desactive");
    if (res.statut !== "desactive") return;
    expect(res.message).toContain("conservés");
    // La phrase dit « pouvoir les présenter » : c'est une conservation, donc
    // D. 4711-3. L. 4711-5 n'impose rien (relu à la source le 2026-09-20).
    expect(res.message).toContain("D. 4711-3");
  });

  it("régénère le calendrier dans les deux cas", async () => {
    await supprimerEquipement("eq-1");
    expect(h.genererCalendrier).toHaveBeenCalledWith("etab-1");
  });

  it("remonte l'échec de régénération au lieu de l'avaler", async () => {
    h.genererCalendrier.mockImplementation(async () => {
      throw new Error("base indisponible");
    });

    const res = await supprimerEquipement("eq-1");

    expect(res.statut).toBe("erreur");
    if (res.statut !== "erreur") return;
    // Le tableau de bord répare aussi à l'affichage depuis le 2026-09-14 : le
    // message nomme les deux portes, et non plus la seule page Calendrier.
    expect(res.message).toContain("tableau de bord ou du calendrier");
  });

  /**
   * C'est ici que se joue la promesse « ça se remet à jour tout seul ».
   *
   * Une régénération qui échoue derrière une mutation réussie laisse un
   * calendrier ni vide ni périmé en version : l'auto-réparation à
   * l'affichage ne le reprend pas, et sans marque il resterait faux
   * jusqu'à la prochaine modification d'équipement — sans que personne le
   * sache. Marquer l'établissement périmé le fait recalculer à la
   * prochaine ouverture du calendrier. Sans cette ligne, il faudrait
   * rendre la main à l'utilisateur — un bouton « recalculer », c'est-à-dire
   * lui demander de réparer nos pannes.
   */
  it("marque le calendrier périmé quand la régénération échoue", async () => {
    h.genererCalendrier.mockImplementation(async () => {
      throw new Error("base indisponible");
    });

    await supprimerEquipement("eq-1");

    expect(h.marquerCalendrierPerime).toHaveBeenCalledWith(dbDuCompte, "etab-1");
  });

  it("ne marque rien quand la régénération passe", async () => {
    await supprimerEquipement("eq-1");

    expect(h.marquerCalendrierPerime).not.toHaveBeenCalled();
  });
});

describe("un appareil retiré du parc est en lecture seule (décision du 2026-10-12)", () => {
  // Plus de réactivation : le retrait est définitif, et toute écriture sur
  // l'appareil retiré est refusée avec la même phrase (`retrait.ts`).
  beforeEach(() => {
    h.db.equipements[0].actif = false;
  });
  const formulaire = () => {
    const fd = new FormData();
    fd.set("libelle", "Extincteur");
    fd.set("categorie", "EXTINCTEUR");
    return fd;
  };

  it("modifier : refusé, rien n'est écrit, rien n'est régénéré", async () => {
    const r = await modifierEquipement("eq-1", { status: "idle" }, formulaire());
    expect(r).toEqual({ status: "error", message: MESSAGE_APPAREIL_RETIRE });
    expect(h.db.equipements[0]).not.toHaveProperty("libelle");
    expect(h.genererCalendrier).not.toHaveBeenCalled();
    // L'appartenance est contrôlée avant le refus : la lecture même porte le
    // compte (`appareilDuCompte`).
    expect(h.prisma.equipement.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "eq-1", etablissement: { entreprise: { userId: "user-1" } } },
      }),
    );
  });

  it("retirer à nouveau : refusé, même sans trace — l'appareil n'est jamais détruit après coup", async () => {
    h.db.nbTraces = 0;
    const r = await supprimerEquipement("eq-1");
    expect(r).toEqual({ statut: "erreur", message: MESSAGE_APPAREIL_RETIRE });
    expect(h.db.supprimesPhysiquement).toEqual([]);
  });

  it("la phrase dit l'issue : lecture seule, pas de remise en service, un nouvel appareil s'il revient", () => {
    expect(MESSAGE_APPAREIL_RETIRE).toContain("ne peut plus être modifié ni remis en service");
    expect(MESSAGE_APPAREIL_RETIRE).toContain("nouvel appareil");
  });
});

describe("modifierEquipement — le groupe électrogène en trois états (C41)", () => {
  function formulaire(groupe: string): FormData {
    const fd = new FormData();
    fd.set("libelle", "TGBT");
    fd.set("categorie", "INSTALLATION_ELECTRIQUE");
    fd.set("aGroupeElectrogene", groupe);
    return fd;
  }
  const dernierUpdate = () =>
    h.db.equipements[0] as unknown as { caracteristiques?: unknown };

  it("« Je ne sais pas encore » efface un « non » déjà enregistré", async () => {
    // Le formulaire réécrit le JSON entier à chaque enregistrement : la clé
    // absente de la soumission disparaît de la base, et le « non » avec elle.
    Object.assign(h.db.equipements[0], {
      caracteristiques: { aGroupeElectrogene: false },
    });
    await modifierEquipement("eq-1", { status: "idle" }, formulaire(""));
    expect(dernierUpdate().caracteristiques).not.toHaveProperty(
      "aGroupeElectrogene",
    );
  });

  it("« Non » s'écrit `false`, « Oui » s'écrit `true`", async () => {
    await modifierEquipement("eq-1", { status: "idle" }, formulaire("non"));
    expect(dernierUpdate().caracteristiques).toMatchObject({
      aGroupeElectrogene: false,
    });
    await modifierEquipement("eq-1", { status: "idle" }, formulaire("oui"));
    expect(dernierUpdate().caracteristiques).toMatchObject({
      aGroupeElectrogene: true,
    });
  });
});

describe("D29 (a) : les réponses exigées d'un appareil de levage", () => {
  // Décision de la propriétaire du 2026-09-28. Les questions viennent de la
  // dérivation (`questionsExigeesPour`), pas d'une liste. Éprouvé en retirant
  // la porte (`reponsesExigeesManquantes`) des deux actions.
  const LEVAGE = CATEGORIES_A_REPONSE_EXIGEE[0];
  const exigees = questionsExigeesPour(LEVAGE, REGIME_TRAVAIL);
  function formulaire(reponses: Record<string, string>, categorie: string = LEVAGE) {
    const fd = new FormData();
    fd.set("libelle", "Palan");
    fd.set("categorie", categorie);
    for (const [k, v] of Object.entries(reponses)) fd.set(k, v);
    return fd;
  }
  const toutesNon = () => Object.fromEntries(exigees.map((c) => [c, "non"]));

  it("déclaration : sans les réponses exigées, refusée, chaque question nommée, rien n'est créé", async () => {
    const r = await creerEquipement("etab-1", { status: "idle" }, formulaire({}));
    expect(r.status).toBe("error");
    expect(Object.keys((r as { fieldErrors?: object }).fieldErrors ?? {}).sort()).toEqual([...exigees].sort());
    expect(h.db.crees).toHaveLength(0);
  });

  it("déclaration : une seule réponse manquante suffit à refuser", async () => {
    const reponses = toutesNon();
    delete reponses[exigees[exigees.length - 1]];
    const r = await creerEquipement("etab-1", { status: "idle" }, formulaire(reponses));
    expect(r.status).toBe("error");
    expect(h.db.crees).toHaveLength(0);
  });

  it("déclaration : toutes répondues, l'appareil est créé", async () => {
    await expect(creerEquipement("etab-1", { status: "idle" }, formulaire(toutesNon()))).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.crees).toHaveLength(1);
  });

  it("modification d'un appareil ANCIEN sans réponse : refusée tant que la fiche n'y répond pas", async () => {
    Object.assign(h.db.equipements[0], { categorie: LEVAGE, caracteristiques: null, libelle: "Palan" });
    const r = await modifierEquipement("eq-1", { status: "idle" }, formulaire({}));
    expect(r.status).toBe("error");
    expect((h.db.equipements[0] as { libelle?: string }).libelle).toBe("Palan");
    const ok = await modifierEquipement("eq-1", { status: "idle" }, formulaire(toutesNon()));
    expect(ok.status).toBe("success");
  });

  it("un appareil hors de la décision s'enregistre sans ces questions", async () => {
    const r = await modifierEquipement("eq-1", { status: "idle" }, formulaire({}, "EXTINCTEUR"));
    expect(r.status).toBe("success");
  });
});

// ~~« un EPI déclaré contredit un « non » aux EPI » (B2)~~ — la règle est
// partagée depuis le 2026-10-22 (`constaterEpiDuCompte`, testée dans
// `etablissements/epi-constate.test.ts`) ; ici, l'appel et son ordre.
describe("une écriture d'équipement fait constater les EPI, avant la régénération (B2, 2026-10-22)", () => {
  function epi(categorie: string): FormData {
    const fd = new FormData();
    fd.set("libelle", "Harnais");
    fd.set("categorie", categorie);
    return fd;
  }

  it("déclarer un équipement", async () => {
    await expect(creerEquipement("etab-1", { status: "idle" }, epi("EPI"))).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.journal).toEqual(["constat:etab-1:sans-regen", "régénération"]);
  });

  it("le modifier", async () => {
    await modifierEquipement("eq-1", { status: "idle" }, epi("EPI"));
    expect(h.db.journal).toEqual(["constat:etab-1:sans-regen", "régénération"]);
  });

  it("le pré-remplissage", async () => {
    await creerEquipementsDepuisPreRemplissage("etab-1", [
      { categorie: "EXTINCTEUR", libelle: "Extincteur" },
      { categorie: "EPI", libelle: "Gants" },
    ]);
    expect(h.db.journal).toEqual(["constat:etab-1:sans-regen", "régénération"]);
  });
});

describe("décision du 2026-10-08 : « désenfumage mécanique » exigé là où il fait naître DF 10 § 3", () => {
  // La porte est au serveur, et elle lit le régime de l'établissement.
  // Éprouvé en retirant l'entrée de `QUESTIONS_EXIGEES_PAR_DECISION`.
  function desenfumage(mecanique?: string) {
    const fd = new FormData();
    fd.set("libelle", "Désenfumage");
    fd.set("categorie", "DESENFUMAGE");
    if (mecanique !== undefined) fd.set("estDesenfumageMecanique", mecanique);
    return fd;
  }

  it("ERP N3 : sans réponse, refusé et rien n'est créé ; avec, créé", async () => {
    h.db.regime = { estERP: true, typeErp: "M", categorieErp: "N3", ssiCategorieAouB: null };
    const r = await creerEquipement("etab-1", { status: "idle" }, desenfumage());
    expect(r.status).toBe("error");
    expect(Object.keys((r as { fieldErrors?: object }).fieldErrors ?? {})).toEqual(["estDesenfumageMecanique"]);
    expect(h.db.crees).toHaveLength(0);
    await expect(creerEquipement("etab-1", { status: "idle" }, desenfumage("non"))).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.crees).toHaveLength(1);
  });

  it("ERP N5 : la question reste facultative", async () => {
    h.db.regime = { estERP: true, typeErp: "M", categorieErp: "N5", ssiCategorieAouB: null };
    await expect(creerEquipement("etab-1", { status: "idle" }, desenfumage())).rejects.toThrow("NEXT_REDIRECT");
  });
});

/**
 * Un identifiant d'appareil ne dit pas s'il existe chez un autre client
 * (audit du 2026-10-13). L'appareil était lu par son seul `id`, puis son
 * établissement vérifié : « Équipement introuvable » pour un id absent, le
 * 404 du contrôle pour l'appareil d'autrui. Les deux répondent pareil, et
 * rien ne s'écrit.
 */
describe("périmètre : absent et hors compte répondent pareil", () => {
  const issue = async (f: () => Promise<unknown>) => {
    try {
      return { rend: await f() };
    } catch (e) {
      return { leve: (e as Error).message };
    }
  };
  const fd = () => {
    const f = new FormData();
    f.set("libelle", "Extincteur");
    f.set("categorie", "EXTINCTEUR");
    f.set("reponse", "non");
    return f;
  };
  const ACTIONS: [string, (id: string) => Promise<unknown>][] = [
    ["modifierEquipement", (id) => modifierEquipement(id, { status: "idle" }, fd())],
    ["supprimerEquipement", (id) => supprimerEquipement(id)],
  ];

  it.each(ACTIONS)("%s", async (_nom, action) => {
    h.db.equipements.push({ id: "eq-voisin", etablissementId: "etab-voisin", actif: true });
    const absent = await issue(() => action("eq-inexistant"));
    const voisin = await issue(() => action("eq-voisin"));
    expect(voisin).toEqual(absent);
    expect(voisin).toEqual({ leve: "NEXT_NOT_FOUND" });
    expect(h.db.equipements.find((e) => e.id === "eq-voisin")).toEqual({
      id: "eq-voisin",
      etablissementId: "etab-voisin",
      actif: true,
    });
    expect(h.db.supprimesPhysiquement).toEqual([]);
    expect(h.genererCalendrier).not.toHaveBeenCalled();
  });
});

describe("décision du 2026-10-13 : « groupe électrogène » exigé pour une installation électrique en ERP", () => {
  // Les deux lignes d'EL 18 § 4 ne naissent que d'un « oui » : la réponse est
  // exigée là où elle décide, pour qu'il n'y ait plus de silence. Éprouvé en
  // retirant l'entrée de `QUESTIONS_EXIGEES_PAR_DECISION`.
  function installation(groupe?: string) {
    const fd = new FormData();
    fd.set("libelle", "TGBT");
    fd.set("categorie", "INSTALLATION_ELECTRIQUE");
    if (groupe !== undefined) fd.set("aGroupeElectrogene", groupe);
    return fd;
  }

  it("ERP N5 : sans réponse, refusé et rien n'est créé ; avec « non », créé", async () => {
    h.db.regime = { estERP: true, typeErp: "N", categorieErp: "N5", ssiCategorieAouB: null };
    const r = await creerEquipement("etab-1", { status: "idle" }, installation());
    expect(r.status).toBe("error");
    expect(Object.keys((r as { fieldErrors?: object }).fieldErrors ?? {})).toEqual(["aGroupeElectrogene"]);
    expect(h.db.crees).toHaveLength(0);
    await expect(creerEquipement("etab-1", { status: "idle" }, installation("non"))).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.crees).toHaveLength(1);
  });

  it("ERP N3 : « Je ne sais pas encore » (valeur vide) est refusé à la modification", async () => {
    h.db.regime = { estERP: true, typeErp: "N", categorieErp: "N3", ssiCategorieAouB: null };
    Object.assign(h.db.equipements[0], { categorie: "INSTALLATION_ELECTRIQUE", caracteristiques: null });
    const r = await modifierEquipement("eq-1", { status: "idle" }, installation(""));
    expect(r.status).toBe("error");
    expect(Object.keys((r as { fieldErrors?: object }).fieldErrors ?? {})).toEqual(["aGroupeElectrogene"]);
  });

  it("hors ERP : la question reste facultative", async () => {
    await expect(creerEquipement("etab-1", { status: "idle" }, installation())).rejects.toThrow("NEXT_REDIRECT");
  });
});

describe("pré-remplissage : la porte des réponses exigées tient aussi pour un appel forgé (reprise des suites du lot 3)", () => {
  // `suggererEquipements` ne propose aucune catégorie à réponse exigée ;
  // l'action serveur, elle, reçoit ce qu'on lui poste. Le refus lit
  // `questionsExigeesPour` dans le régime de l'établissement, comme
  // `creerEquipement`. Éprouvé en retirant le refus.
  it("levage : refusé en bloc, rien n'est écrit, l'appartenance est contrôlée d'abord", async () => {
    const [levage] = CATEGORIES_A_REPONSE_EXIGEE;
    expect(
      await creerEquipementsDepuisPreRemplissage("etab-1", [
        { categorie: "EXTINCTEUR", libelle: "Extincteur" },
        { categorie: levage, libelle: "Palan" },
      ]),
    ).toEqual({ status: "error", message: expect.stringContaining(levage) });
    expect(h.db.creesEnLot).toHaveLength(0);
    expect(h.genererCalendrier).not.toHaveBeenCalled();
    expect(h.assertOwnership).toHaveBeenCalledWith("etab-1");
  });

  it("désenfumage dans un ERP N3 (décision du 2026-10-08) : refusé, rien n'est écrit", async () => {
    h.db.regime = { estERP: true, typeErp: "M", categorieErp: "N3", ssiCategorieAouB: null };
    expect(
      await creerEquipementsDepuisPreRemplissage("etab-1", [
        { categorie: "DESENFUMAGE", libelle: "Désenfumage" },
      ]),
    ).toEqual({ status: "error", message: expect.stringContaining("DESENFUMAGE") });
    expect(h.db.creesEnLot).toHaveLength(0);
  });

  it("désenfumage là où la question est facultative : créé, comme par le formulaire", async () => {
    const r = await creerEquipementsDepuisPreRemplissage("etab-1", [
      { categorie: "DESENFUMAGE", libelle: "Désenfumage" },
    ]);
    expect(r).toMatchObject({ status: "success", created: 1 });
    expect(h.db.creesEnLot).toHaveLength(1);
  });

  it("ce que le pré-remplissage propose est créé", async () => {
    const r = await creerEquipementsDepuisPreRemplissage("etab-1", [
      { categorie: "EXTINCTEUR", libelle: "Extincteur" },
      { categorie: "BAES", libelle: "BAES" },
    ]);
    expect(r).toMatchObject({ status: "success", created: 2 });
    expect(h.db.creesEnLot).toHaveLength(2);
  });

  // Revue du 2026-10-13, R1 : une catégorie forgée n'atteint ni le cache de
  // `questionsExigeesPour` ni la base. Éprouvé en retirant le filtre sur
  // `CATEGORIES_EQUIPEMENT`.
  it("catégorie inconnue : refusée en bloc, avant de lire le régime, rien n'est écrit", async () => {
    let regimeLu = false;
    const lire = h.prisma.etablissement.findUnique;
    h.prisma.etablissement.findUnique = async () => {
      regimeLu = true;
      return h.db.regime;
    };
    try {
      expect(
        await creerEquipementsDepuisPreRemplissage("etab-1", [
          { categorie: "EXTINCTEUR", libelle: "Extincteur" },
          { categorie: "PAS_UNE_CATEGORIE" as never, libelle: "Forgé" },
        ]),
      ).toEqual({ status: "error", message: expect.stringContaining("PAS_UNE_CATEGORIE") });
    } finally {
      h.prisma.etablissement.findUnique = lire;
    }
    expect(regimeLu).toBe(false);
    expect(h.db.creesEnLot).toHaveLength(0);
    expect(h.genererCalendrier).not.toHaveBeenCalled();
  });
});

describe("pré-remplissage : le panneau pose la question exigée, l'action en reçoit la réponse (option 2, 2026-10-13)", () => {
  // Décision de la propriétaire : le panneau pose `aGroupeElectrogene` à côté
  // de l'installation électrique d'un ERP. L'action accepte la réponse — champ
  // exigé pour cette catégorie dans ce régime, booléen strict, rien d'autre —
  // et refuse toujours ce qui manque.
  const ERP_N3 = { estERP: true, typeErp: "N", categorieErp: "N3", ssiCategorieAouB: null };
  const GE = ["elec-erp-groupe-electrogene-annuel", "elec-erp-groupe-electrogene-quinzaine"];
  const lignesGe = async (cree: unknown) => {
    const { determineObligationsApplicables } = await import("@/lib/matching/engine");
    const c = cree as { caracteristiques?: Record<string, unknown> };
    return determineObligationsApplicables(
      {
        id: "etab-1", effectifSurSite: 8, effectifEntreprise: 8, estEtablissementTravail: true,
        estERP: true, estIGH: false, estHabitation: false, typeErp: "N", typesErpAutres: [], categorieErp: "N3",
        classeIgh: null, familleHabitation: null, personnesPresentesHabituellement: null, effectifPublicAdmis: null,
        manipuleMatieresR422722: null, comporteLocauxSommeilPublic: null, manutentionManuelle: null,
        travailSurEcran: null, operationsElectriques: null, conduiteEngins: null, expositionCMR: null,
        epiPresents: null, ssiCategorieAouB: null,
      },
      [{ id: "e", libelle: "TGBT", categorie: "INSTALLATION_ELECTRIQUE", caracteristiques: c.caracteristiques ?? null }],
    )
      .map((a) => a.obligation.id)
      .filter((id) => GE.includes(id))
      .sort();
  };

  it("ERP, installation électrique et « oui » : créée avec `aGroupeElectrogene: true`, puis les deux lignes", async () => {
    h.db.regime = ERP_N3;
    const r = await creerEquipementsDepuisPreRemplissage("etab-1", [
      { categorie: "INSTALLATION_ELECTRIQUE", libelle: "TGBT", caracteristiques: { aGroupeElectrogene: true } },
      { categorie: "EXTINCTEUR", libelle: "Extincteur" },
    ]);
    expect(r).toMatchObject({ status: "success", created: 2 });
    const [elec, ext] = h.db.creesEnLot as { caracteristiques?: unknown }[];
    expect(elec.caracteristiques).toEqual({ aGroupeElectrogene: true });
    expect(ext).not.toHaveProperty("caracteristiques");
    expect(await lignesGe(elec)).toEqual(GE);
  });

  it("« non » : créée avec `aGroupeElectrogene: false`, aucune ligne", async () => {
    h.db.regime = ERP_N3;
    await creerEquipementsDepuisPreRemplissage("etab-1", [
      { categorie: "INSTALLATION_ELECTRIQUE", libelle: "TGBT", caracteristiques: { aGroupeElectrogene: false } },
    ]);
    const [elec] = h.db.creesEnLot as { caracteristiques?: unknown }[];
    expect(elec.caracteristiques).toEqual({ aGroupeElectrogene: false });
    expect(await lignesGe(elec)).toEqual([]);
  });

  it("réponse manquante : refusé en bloc, rien n'est écrit", async () => {
    h.db.regime = ERP_N3;
    expect(
      await creerEquipementsDepuisPreRemplissage("etab-1", [
        { categorie: "EXTINCTEUR", libelle: "Extincteur" },
        { categorie: "INSTALLATION_ELECTRIQUE", libelle: "TGBT", caracteristiques: {} },
      ]),
    ).toEqual({ status: "error", message: expect.stringContaining("INSTALLATION_ELECTRIQUE") });
    expect(h.db.creesEnLot).toHaveLength(0);
    expect(h.genererCalendrier).not.toHaveBeenCalled();
  });

  it("POST forgé sans réponse, ou avec une réponse hors cadre : refusé, rien n'est écrit", async () => {
    h.db.regime = ERP_N3;
    const forges: unknown[] = [
      undefined,
      { aGroupeElectrogene: "oui" },
      { aGroupeElectrogene: true, estVmcGaz: true },
      { aGroupeElectrogene: true, notes: "texte libre" },
      ["aGroupeElectrogene"],
      null,
    ];
    for (const caracteristiques of forges) {
      expect(
        await creerEquipementsDepuisPreRemplissage("etab-1", [
          {
            categorie: "INSTALLATION_ELECTRIQUE",
            libelle: "TGBT",
            ...(caracteristiques === undefined ? {} : { caracteristiques: caracteristiques as never }),
          },
        ]),
        JSON.stringify(caracteristiques),
      ).toEqual({ status: "error", message: expect.stringContaining("INSTALLATION_ELECTRIQUE") });
    }
    expect(h.db.creesEnLot).toHaveLength(0);
  });

  // Revue du 2026-10-13 : la réponse se lit sur les clés PROPRES. Un objet
  // dont le PROTOTYPE porte `aGroupeElectrogene: true` passait la porte des
  // manquantes (lecture par `?.[champ]`) sans rien écrire : l'appareil
  // naissait muet. Éprouvé en remettant la lecture par `?.[champ]`.
  it("une réponse portée par le prototype n'est pas une réponse : refusé, rien n'est écrit", async () => {
    h.db.regime = ERP_N3;
    const herite = Object.create({ aGroupeElectrogene: true }) as Record<string, boolean>;
    expect(herite.aGroupeElectrogene).toBe(true);
    expect(
      await creerEquipementsDepuisPreRemplissage("etab-1", [
        { categorie: "INSTALLATION_ELECTRIQUE", libelle: "TGBT", caracteristiques: herite },
      ]),
    ).toEqual({ status: "error", message: expect.stringContaining("INSTALLATION_ELECTRIQUE") });
    expect(h.db.creesEnLot).toHaveLength(0);
    expect(h.genererCalendrier).not.toHaveBeenCalled();
  });

  // Revue du 2026-10-13 : le libellé suit la règle de la création manuelle
  // (`libelleEquipementSchema`), et un refus se RETOURNE — Next masque en
  // production le message d'une exception levée par une action serveur.
  it("libellé hors règle (vide, trop long, pas une chaîne) : refusé sans exception, rien n'est écrit", async () => {
    for (const libelle of ["   ", "x".repeat(201), 42 as never, null as never]) {
      expect(
        await creerEquipementsDepuisPreRemplissage("etab-1", [
          { categorie: "EXTINCTEUR", libelle: "Extincteur" },
          { categorie: "BAES", libelle },
        ]),
        JSON.stringify(libelle),
      ).toEqual({ status: "error", message: expect.stringContaining("Libellé") });
    }
    expect(h.db.creesEnLot).toHaveLength(0);
  });

  it("le libellé écrit est le libellé rogné, et 200 caractères passent", async () => {
    const r = await creerEquipementsDepuisPreRemplissage("etab-1", [
      { categorie: "EXTINCTEUR", libelle: "  Extincteur  " },
      { categorie: "BAES", libelle: "b".repeat(200) },
    ]);
    expect(r).toMatchObject({ status: "success", created: 2 });
    expect((h.db.creesEnLot as { libelle: string }[]).map((e) => e.libelle)).toEqual([
      "Extincteur",
      "b".repeat(200),
    ]);
  });

  it("hors ERP : pas de question — créée sans réponse, et une réponse fournie est refusée", async () => {
    const r = await creerEquipementsDepuisPreRemplissage("etab-1", [
      { categorie: "INSTALLATION_ELECTRIQUE", libelle: "TGBT" },
    ]);
    expect(r).toMatchObject({ status: "success", created: 1 });
    expect(h.db.creesEnLot[0]).not.toHaveProperty("caracteristiques");
    expect(
      await creerEquipementsDepuisPreRemplissage("etab-1", [
        { categorie: "INSTALLATION_ELECTRIQUE", libelle: "TGBT", caracteristiques: { aGroupeElectrogene: true } },
      ]),
    ).toEqual({ status: "error", message: expect.stringContaining("INSTALLATION_ELECTRIQUE") });
  });
});

// Revue du lot du 2026-10-14, point 8 : quitter « Autre équipement » efface
// le matériel non suivi. Sans quoi la fiche d'un extincteur dirait « Rojer ne
// suit pas l'usage des échelles ». Éprouvé en retirant l'écriture de
// `materielNonCouvert` dans `modifierEquipement`.
describe("modifierEquipement — le matériel non suivi suit la catégorie", () => {
  function formulaire(categorie: string, materiel?: string): FormData {
    const fd = new FormData();
    fd.set("libelle", "Appareil de la réserve");
    fd.set("categorie", categorie);
    if (materiel !== undefined) fd.set("materielNonCouvert", materiel);
    return fd;
  }

  it("en AUTRE, la clé est écrite", async () => {
    const r = await modifierEquipement("eq-1", { status: "idle" }, formulaire("AUTRE", "echelle"));
    expect(r.status).toBe("success");
    expect((h.db.equipements[0] as Record<string, unknown>).materielNonCouvert).toBe("echelle");
  });

  it("quitter AUTRE efface la clé (champ vide envoyé par le formulaire)", async () => {
    (h.db.equipements[0] as Record<string, unknown>).materielNonCouvert = "echelle";
    const r = await modifierEquipement("eq-1", { status: "idle" }, formulaire("EXTINCTEUR", ""));
    expect(r.status).toBe("success");
    expect((h.db.equipements[0] as Record<string, unknown>).materielNonCouvert).toBeNull();
  });
});
