// Onboarding — le calendrier naît avec le premier établissement.
//
// Revue du 2026-09-14 : l'onboarding créait l'entreprise et l'établissement,
// puis conduisait à la déclaration des équipements, sans rien générer. Un
// bureau sans appareil, qui doit pourtant ses obligations d'établissement
// (ADR-022), n'avait aucune ligne en base, et son tableau de bord se disait
// vide tant que personne n'ouvrait la page Calendrier.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NOM_BATIMENT_PRINCIPAL } from "@/lib/batiments/schema";

const h = vi.hoisted(() => {
  const ordre: string[] = [];
  // Les entreprises en base, par `(userId, siren)` — la clé de l'upsert.
  const entreprises = new Map<
    string,
    { id: string; raisonSociale: string; effectif: number }
  >();
  type ArgsUpsert = {
    where: { userId_siren: { userId: string; siren: string } };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  };
  const tx = {
    entreprise: {
      upsert: vi.fn(async (args: ArgsUpsert) => {
        const { userId, siren } = args.where.userId_siren;
        const cle = `${userId}|${siren}`;
        let e = entreprises.get(cle);
        if (!e) {
          e = {
            id: `ent-${entreprises.size + 1}`,
            raisonSociale: String(args.create.raisonSociale),
            effectif: Number(args.create.effectif),
          };
          entreprises.set(cle, e);
          ordre.push("entreprise");
        }
        return { ...e };
      }),
    },
    etablissement: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        ordre.push("etablissement");
        return { id: "etab-1", entrepriseId: String(args.data.entrepriseId) };
      }),
    },
  };
  return {
    ordre,
    entreprises,
    tx,
    poserEtablissementActif: vi.fn(async (id: string) => {
      ordre.push(`cookie:${id}`);
    }),
    regenererApresMutation: vi.fn(async () => {
      ordre.push("generation");
      return true;
    }),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    // « commit » marque la fin de la transaction : la génération doit venir
    // APRÈS, sur des lignes validées — placée dans le callback, elle lirait un
    // établissement que la base ne voit pas encore.
    $transaction: async (fn: (tx: typeof h.tx) => Promise<unknown>) => {
      const res = await fn(h.tx);
      h.ordre.push("commit");
      return res;
    },
  },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/lib/etablissements/etablissement-actif", () => ({
  poserEtablissementActif: h.poserEtablissementActif,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    h.ordre.push("redirection");
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({
  regenererApresMutation: h.regenererApresMutation,
}));

const { finaliserOnboarding } = await import("./actions");

function formulaire(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("raisonSociale", "Cabinet Martin");
  // Le SIRET public du siège de l'INSEE : une clé de contrôle juste.
  fd.set("siret", "12002701600357");
  fd.set("adresse", "12 rue des halles, 44000 Nantes");
  fd.set("codeNaf", "69.10Z");
  fd.set("effectifSurSite", "6");
  fd.set("effectifEntreprise", "6");
  fd.set("estEtablissementTravail", "true");
  // Les trois régimes répondus « non » : sans réponse, la porte refuse
  // (2026-09-27, A2).
  fd.set("estERP", "false");
  fd.set("estIGH", "false");
  fd.set("estHabitation", "false");
  for (const [k, v] of Object.entries(over)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  h.ordre.length = 0;
  h.entreprises.clear();
  h.tx.entreprise.upsert.mockClear();
  h.regenererApresMutation.mockClear();
  h.tx.etablissement.create.mockClear();
});

describe("finaliserOnboarding — le calendrier naît avec l'établissement", () => {
  it("génère le calendrier du nouvel établissement, APRÈS sa création et AVANT la redirection", async () => {
    await expect(
      finaliserOnboarding({ status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(h.regenererApresMutation).toHaveBeenCalledWith("etab-1", "onboarding");
    expect(h.ordre).toEqual([
      "entreprise",
      "etablissement",
      "commit",
      "generation",
      "cookie:etab-1",
      "redirection",
    ]);
  });

  it("ne génère rien quand le formulaire est refusé", async () => {
    const res = await finaliserOnboarding(
      { status: "idle" },
      formulaire({ raisonSociale: "" }),
    );

    expect(res.status).toBe("error");
    expect(h.regenererApresMutation).not.toHaveBeenCalled();
  });
});

// Le nombre de personnes (R. 4227-34) revient au parcours le 2026-09-20. Le
// schéma a ses tests ; ceux-ci tiennent le BRANCHEMENT — que le champ posté
// atteigne la base, et que rien n'y soit écrit quand personne n'a répondu.
// Retirer la ligne `personnesPresentesHabituellement` de l'objet `input`, ou
// le spread de l'écriture, laisse le schéma vert et crée un restaurant muet.
describe("finaliserOnboarding — le nombre de personnes atteint la base (2026-09-20)", () => {
  const restaurant = {
    codeNaf: "56.10A",
    estERP: "true",
    typeErp: "N",
    categorieErp: "N5",
  };
  const ecrit = () =>
    h.tx.etablissement.create.mock.calls[0]?.[0].data as Record<string, unknown>;

  it("écrit le nombre déclaré par un restaurant de 5ᵉ catégorie", async () => {
    await expect(
      finaliserOnboarding(
        { status: "idle" },
        formulaire({ ...restaurant, personnesPresentesHabituellement: "40" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(ecrit().personnesPresentesHabituellement).toBe(40);
  });

  it("refuse le même restaurant s'il ne répond pas, et ne crée rien", async () => {
    const res = await finaliserOnboarding(
      { status: "idle" },
      formulaire(restaurant),
    );
    expect(res.status).toBe("error");
    expect(
      res.status === "error" &&
        res.fieldErrors?.personnesPresentesHabituellement?.[0],
    ).toMatch(/combien de personnes/i);
    expect(h.tx.etablissement.create).not.toHaveBeenCalled();
  });

  it("n'écrit RIEN pour un bureau, à qui la question n'est pas posée", async () => {
    await expect(
      finaliserOnboarding({ status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(ecrit()).not.toHaveProperty("personnesPresentesHabituellement");
  });
});

describe("les deux effectifs (C37)", () => {
  // L'effectif de l'entreprise était recopié de celui du site, apprentis
  // compris. Il est demandé pour lui-même : c'est sur lui que se comptent le
  // CSE et le règlement intérieur (L. 2311-2 → L. 1111-2, L. 1111-3).
  it("écrit l'effectif de l'entreprise déclaré, pas celui du site", async () => {
    await expect(
      finaliserOnboarding(
        { status: "idle" },
        formulaire({ effectifSurSite: "12", effectifEntreprise: "10" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    const entreprise = h.tx.entreprise.upsert.mock.calls.at(-1)?.[0].create;
    const etablissement = h.tx.etablissement.create.mock.calls.at(-1)?.[0].data;
    expect(entreprise?.effectif).toBe(10);
    expect(etablissement?.effectifSurSite).toBe(12);
  });

  it("refuse un effectif d'entreprise vide plutôt que d'y lire zéro", async () => {
    const res = await finaliserOnboarding(
      { status: "idle" },
      formulaire({ effectifEntreprise: "" }),
    );
    expect(res.status).toBe("error");
    expect(
      res.status === "error" && res.fieldErrors?.effectifEntreprise?.[0],
    ).toBeTruthy();
  });
});

describe("finaliserOnboarding — un régime sans réponse ne vaut pas « non » (2026-09-27, A2)", () => {
  // `raw.estERP === "true"` faisait d'un champ vide un « non » : un ERP muet
  // naissait non-ERP. Éprouvé en rétablissant cette lecture.
  it.each(["estERP", "estIGH", "estHabitation"])(
    "%s vide : refus, et rien n'est créé",
    async (champ) => {
      const res = await finaliserOnboarding(
        { status: "idle" },
        formulaire({ [champ]: "" }),
      );
      expect(res.status).toBe("error");
      expect(h.tx.etablissement.create).not.toHaveBeenCalled();
    },
  );
});

describe("finaliserOnboarding — matières au parcours (2026-09-27) ; ~~et chiffons~~ (retirés le 2026-10-08)", () => {
  // Leur silence fait afficher des lignes « à confirmer » : la question est
  // posée là où l'on répond. « Je ne sais pas encore » n'écrit rien — la
  // colonne reste `null`, jamais un `false` que personne n'a déclaré.
  // Éprouvé en retirant les deux champs de l'objet `input`.
  const ecrit = () =>
    h.tx.etablissement.create.mock.calls.at(-1)?.[0].data as Record<string, unknown>;

  it("« oui » atteint la base ; un champ chiffons posté n'y atteint plus", async () => {
    // 2026-10-08 : la question des chiffons est retirée (décision de la
    // propriétaire) ; la colonne reste en base, inerte — rien ne l'écrit.
    await expect(
      finaliserOnboarding(
        { status: "idle" },
        formulaire({ manipuleMatieresR422722: "oui", chiffonsImpregnes: "non" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(ecrit().manipuleMatieresR422722).toBe(true);
    expect(ecrit()).not.toHaveProperty("chiffonsImpregnes");
  });

  it("« je ne sais pas encore » n'écrit rien", async () => {
    await expect(
      finaliserOnboarding({ status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(ecrit()).not.toHaveProperty("manipuleMatieresR422722");
    expect(ecrit()).not.toHaveProperty("chiffonsImpregnes");
  });
});

describe("finaliserOnboarding — matières « oui », pas de nombre exigé (revue du lot 1)", () => {
  // Même règle au serveur qu'au client. Éprouvé en retirant la ligne du schéma.
  it("un restaurant N5 qui manipule des matières est créé sans nombre de personnes", async () => {
    await expect(
      finaliserOnboarding(
        { status: "idle" },
        formulaire({ estERP: "true", typeErp: "N", categorieErp: "N5", manipuleMatieresR422722: "oui" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
  });
});

describe("finaliserOnboarding — une entreprise par SIREN, rattachée dans le compte (2026-10-26)", () => {
  it("exige un SIRET valide, et ne crée rien sans lui", async () => {
    for (const siret of ["", "12002701600358"]) {
      const res = await finaliserOnboarding({ status: "idle" }, formulaire({ siret }));
      expect(res.status === "error" && res.fieldErrors?.siret?.[0]).toBeTruthy();
    }
    expect(h.tx.entreprise.upsert).not.toHaveBeenCalled();
    expect(h.tx.etablissement.create).not.toHaveBeenCalled();
  });

  it("un SIREN nouveau crée l'entreprise ; le SIRET et le NAF vont au site", async () => {
    await expect(
      finaliserOnboarding({ status: "idle" }, formulaire({ siret: "120 027 016 00357" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    const appel = h.tx.entreprise.upsert.mock.calls.at(-1)?.[0];
    expect(appel?.where).toEqual({ userId_siren: { userId: "user-1", siren: "120027016" } });
    expect(appel?.create).toMatchObject({ userId: "user-1", siren: "120027016", raisonSociale: "Cabinet Martin" });
    expect(appel?.create).not.toHaveProperty("siret");
    expect(appel?.create).not.toHaveProperty("codeNaf");
    const etab = h.tx.etablissement.create.mock.calls.at(-1)?.[0].data;
    expect(etab).toMatchObject({ siret: "12002701600357", codeNaf: "69.10Z", raisonDisplay: "Cabinet Martin" });
    // ADR-019 : tout établissement naît avec son bâtiment principal — venu des
    // tests de `creerEtablissement`, retirée.
    expect(etab?.batiments).toEqual({ create: { nom: NOM_BATIMENT_PRINCIPAL, ordre: 0 } });
  });

  it("un second site du même SIREN rejoint l'entreprise et n'en réécrit rien", async () => {
    await expect(finaliserOnboarding({ status: "idle" }, formulaire())).rejects.toThrow("NEXT_REDIRECT");
    await expect(
      finaliserOnboarding(
        { status: "idle" },
        formulaire({
          siret: "12002701600357",
          raisonSociale: "Autre nom posté",
          effectifEntreprise: "2",
          nomUsage: "Cabinet Martin — Gare",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.entreprises.size).toBe(1);
    // Rien n'est écrit sur l'entreprise existante : ni le nom ni l'effectif postés.
    expect(h.tx.entreprise.upsert.mock.calls.at(-1)?.[0].update).toEqual({});
    expect([...h.entreprises.values()][0]).toMatchObject({ raisonSociale: "Cabinet Martin", effectif: 6 });
    const [premier, second] = h.tx.etablissement.create.mock.calls.map((c) => c[0].data);
    expect(second.entrepriseId).toBe(premier.entrepriseId);
    expect(second.raisonDisplay).toBe("Cabinet Martin — Gare");
  });

  it("un autre SIREN ouvre une seconde entreprise", async () => {
    await expect(finaliserOnboarding({ status: "idle" }, formulaire())).rejects.toThrow("NEXT_REDIRECT");
    await expect(
      finaliserOnboarding({ status: "idle" }, formulaire({ siret: "35600000000048" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.entreprises.size).toBe(2);
  });

  it("refuse un site dont l'entreprise reprise dépasse la borne, même si le formulaire poste moins", async () => {
    h.entreprises.set("user-1|120027016", { id: "ent-9", raisonSociale: "Grande SARL", effectif: 60 });
    const res = await finaliserOnboarding({ status: "idle" }, formulaire({ effectifEntreprise: "5" }));
    expect(res.status === "error" && res.fieldErrors?.effectifEntreprise?.[0]).toBeTruthy();
    expect(h.tx.etablissement.create).not.toHaveBeenCalled();
  });

  it("pose le cookie de l'établissement actif sur le site créé, avant la redirection", async () => {
    await expect(finaliserOnboarding({ status: "idle" }, formulaire())).rejects.toThrow("NEXT_REDIRECT");
    const i = h.ordre.indexOf("cookie:etab-1");
    expect(i).toBeGreaterThan(h.ordre.indexOf("commit"));
    expect(i).toBeLessThan(h.ordre.indexOf("redirection"));
  });
});

// Venus de `creerEtablissement` (retiré le 2026-10-26) : la seule porte de
// création porte le filtre à l'accueil.
describe("finaliserOnboarding — filtre à l'accueil (2026-10-17)", () => {
  const erp = (over: Record<string, string>) =>
    formulaire({ estERP: "true", categorieErp: "N5", personnesPresentesHabituellement: "30", ...over });

  it("un type J est refusé, rien n'est écrit", async () => {
    const res = await finaliserOnboarding({ status: "idle" }, erp({ typeErp: "J", categorieErp: "N4", comporteLocauxSommeilPublic: "non" }));
    expect(res.status === "error" && res.fieldErrors?.typeErp?.[0]).toBeTruthy();
    expect(h.tx.etablissement.create).not.toHaveBeenCalled();
  });

  it("un R sans enfants passe, et la réponse n'est pas écrite", async () => {
    await expect(
      finaliserOnboarding({ status: "idle" }, erp({ typeErp: "R", accueilEnfants: "non", comporteLocauxSommeilPublic: "non" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.tx.etablissement.create.mock.calls.at(-1)?.[0].data).not.toHaveProperty("accueilEnfants");
  });

  it("un R qui accueille des enfants est refusé", async () => {
    const res = await finaliserOnboarding({ status: "idle" }, erp({ typeErp: "R", accueilEnfants: "oui", comporteLocauxSommeilPublic: "non" }));
    expect(res.status === "error" && res.fieldErrors?.accueilEnfants?.[0]).toBeTruthy();
    expect(h.tx.etablissement.create).not.toHaveBeenCalled();
  });
});
