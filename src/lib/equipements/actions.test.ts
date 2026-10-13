// Suppression d'un équipement — la version physique cascadait sur toutes ses
// vérifications, donc sur les rapports du registre de sécurité et sur les
// actions correctives. On vérifie ici l'arbitrage retenu (ADR-012) :
// suppression physique seulement si l'équipement ne porte aucune trace,
// désactivation sinon.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const db = {
    equipements: [{ id: "eq-1", etablissementId: "etab-1", actif: true }],
    /** Nombre de vérifications porteuses de trace pour l'équipement. */
    nbTraces: 0,
    supprimesPhysiquement: [] as string[],
    crees: [] as Record<string, unknown>[],
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
      findUnique: async ({ where }: { where: { id: string } }) =>
        db.equipements.find((e) => e.id === where.id) ?? null,
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
      createMany: async ({ data }: { data: unknown[] }) => ({
        count: data.length,
      }),
    },
    verification: {
      count: async () => db.nbTraces,
    },
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
    assertOwnership: vi.fn(async (etablissementId: string) => ({ id: "user-1", etablissementId })),
    marquerCalendrierPerime: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: h.assertOwnership,
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
  repondreQuestionEquipement,
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
  h.db.etablissement = { id: "etab-1", epiPresents: false };
  h.db.journal = [];
  h.db.regime = { estERP: false, typeErp: null, categorieErp: null, ssiCategorieAouB: null };
  h.assertOwnership.mockClear();
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

    expect(h.marquerCalendrierPerime).toHaveBeenCalledWith("etab-1");
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
    // L'appartenance est contrôlée avant le refus.
    expect(h.assertOwnership).toHaveBeenCalledWith("etab-1");
  });

  it("répondre à une question : refusé", async () => {
    Object.assign(h.db.equipements[0], {
      categorie: CATEGORIES_A_REPONSE_EXIGEE[0],
      caracteristiques: {},
    });
    const [champ] = questionsExigeesPour(CATEGORIES_A_REPONSE_EXIGEE[0], REGIME_TRAVAIL);
    const fd = new FormData();
    fd.set("reponse", "non");
    const r = await repondreQuestionEquipement("eq-1", champ, { status: "idle" }, fd);
    expect(r).toEqual({ status: "error", message: MESSAGE_APPAREIL_RETIRE });
    expect(h.db.equipements[0]).toMatchObject({ caracteristiques: {} });
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

describe("repondreQuestionEquipement : la relance d'un appareil muet (D29 (a))", () => {
  const LEVAGE = CATEGORIES_A_REPONSE_EXIGEE[0];
  const [champ] = questionsExigeesPour(LEVAGE, REGIME_TRAVAIL);
  const reponse = (v: string) => {
    const fd = new FormData();
    fd.set("reponse", v);
    return fd;
  };
  beforeEach(() => {
    Object.assign(h.db.equipements[0], {
      etablissementId: "etab-1",
      categorie: LEVAGE,
      caracteristiques: { notes: "garder" },
    });
  });

  it("contrôle l'appartenance par l'établissement de l'appareil, écrit la réponse sans rien effacer, régénère", async () => {
    const r = await repondreQuestionEquipement("eq-1", champ, { status: "idle" }, reponse("non"));
    expect(r.status).toBe("success");
    expect(h.assertOwnership).toHaveBeenCalledWith("etab-1");
    expect((h.db.equipements[0] as { caracteristiques?: unknown }).caracteristiques).toEqual({ notes: "garder", [champ]: false });
    expect(h.genererCalendrier).toHaveBeenCalled();
  });

  it("refuse une réponse vide — pas de repli sur « non »", async () => {
    const r = await repondreQuestionEquipement("eq-1", champ, { status: "idle" }, reponse(""));
    expect(r.status).toBe("error");
    expect((h.db.equipements[0] as { caracteristiques?: unknown }).caracteristiques).toEqual({ notes: "garder" });
  });

  it("refuse une question que la décision n'exige pas pour cet appareil", async () => {
    const r = await repondreQuestionEquipement(
      "eq-1",
      "aGroupeElectrogene",
      { status: "idle" },
      reponse("oui"),
    );
    expect(r.status).toBe("error");
  });

  it("régénération ratée : la réponse est acquise, et on le dit", async () => {
    h.genererCalendrier.mockImplementationOnce(async () => {
      throw new Error("base indisponible");
    });
    const r = await repondreQuestionEquipement("eq-1", champ, { status: "idle" }, reponse("oui"));
    expect(r.status).toBe("success_avec_avertissement");
  });
});

describe("un EPI déclaré contredit un « non » aux EPI (relecture indépendante du 2026-10-12, B2)", () => {
  function epi(categorie: string): FormData {
    const fd = new FormData();
    fd.set("libelle", "Harnais");
    fd.set("categorie", categorie);
    return fd;
  }

  it("déclarer un EPI fait passer la réponse à « oui », AVANT la régénération", async () => {
    await expect(creerEquipement("etab-1", { status: "idle" }, epi("EPI"))).rejects.toThrow("NEXT_REDIRECT");

    expect(h.db.etablissement.epiPresents).toBe(true);
    expect(h.db.journal).toEqual(["epiPresents", "régénération"]);
  });

  it("une réponse muette aussi : la déclaration vaut « oui »", async () => {
    h.db.etablissement.epiPresents = null;
    await modifierEquipement("eq-1", { status: "idle" }, epi("EPI"));
    expect(h.db.etablissement.epiPresents).toBe(true);
  });

  it("le pré-remplissage, de même", async () => {
    await creerEquipementsDepuisPreRemplissage("etab-1", [
      { categorie: "EXTINCTEUR", libelle: "Extincteur" },
      { categorie: "EPI", libelle: "Gants" },
    ]);
    expect(h.db.etablissement.epiPresents).toBe(true);
  });

  it("un équipement qui n'est pas un EPI ne touche pas à la réponse", async () => {
    await modifierEquipement("eq-1", { status: "idle" }, epi("EXTINCTEUR"));
    expect(h.db.etablissement.epiPresents).toBe(false);
    expect(h.db.journal).toEqual(["régénération"]);
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

  it("la relance du tableau de bord accepte la question là où elle est exigée", async () => {
    h.db.regime = { estERP: true, typeErp: "M", categorieErp: "N2", ssiCategorieAouB: null };
    Object.assign(h.db.equipements[0], { categorie: "DESENFUMAGE", caracteristiques: null });
    const fd = new FormData();
    fd.set("reponse", "oui");
    const r = await repondreQuestionEquipement("eq-1", "estDesenfumageMecanique", { status: "idle" }, fd);
    expect(r.status).toBe("success");
    expect((h.db.equipements[0] as { caracteristiques?: unknown }).caracteristiques).toEqual({
      estDesenfumageMecanique: true,
    });
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

  it("la relance du tableau de bord accepte la question en ERP", async () => {
    h.db.regime = { estERP: true, typeErp: "N", categorieErp: "N2", ssiCategorieAouB: null };
    Object.assign(h.db.equipements[0], { categorie: "INSTALLATION_ELECTRIQUE", caracteristiques: null });
    const fd = new FormData();
    fd.set("reponse", "non");
    const r = await repondreQuestionEquipement("eq-1", "aGroupeElectrogene", { status: "idle" }, fd);
    expect(r.status).toBe("success");
    expect((h.db.equipements[0] as { caracteristiques?: unknown }).caracteristiques).toEqual({
      aGroupeElectrogene: false,
    });
  });
});
