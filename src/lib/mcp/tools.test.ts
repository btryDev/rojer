import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIBELLE_CATEGORIE } from "./tools";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";

/**
 * Serveur MCP — ce qui est vérifié ici est d'abord une propriété de
 * sécurité, pas un formatage.
 *
 * Le serveur sert **un** établissement, celui qu'on lui a désigné au
 * démarrage. Deux façons de perdre cette garantie :
 *
 *   1. une lecture qui oublie la portée dans sa clause `where` — elle
 *      remonterait alors les lignes de toute la base, tous clients
 *      confondus ;
 *   2. un schéma d'outil qui accepterait un identifiant d'établissement —
 *      le client (donc le modèle, donc l'utilisateur) choisirait le dossier
 *      à lire.
 *
 * Les deux se testent en inspectant ce qui part vers Prisma et ce
 * qu'acceptent les schémas, prisma mocké et horloge injectée — même
 * approche que `src/lib/actions/queries.test.ts`.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $on: vi.fn(),
    etablissement: { findUnique: vi.fn() },
    duerp: { findFirst: vi.fn() },
    action: { findMany: vi.fn() },
    equipement: { findMany: vi.fn() },
    verification: { findMany: vi.fn() },
  },
}));

vi.mock("./prisma", () => ({ prismaMcp: prismaMock }));

import { OUTILS_MCP, type ContexteMcp } from "./tools";
import { getEtatDuerp, listerActions } from "./queries";

/** 10 août 2026, 9 h à Paris. */
const NOW = new Date("2026-08-10T07:00:00Z");
const ETABLISSEMENT_ID = "etab_demo_1";
const AUTRE_ETABLISSEMENT = "etab_du_voisin";

const ctx: ContexteMcp = {
  scope: { etablissementId: ETABLISSEMENT_ID },
  now: NOW,
};

/** Date civile telle que Prisma la rend. */
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const outil = (nom: string) => {
  const o = OUTILS_MCP.find((x) => x.nom === nom);
  if (!o) throw new Error(`outil ${nom} absent`);
  return o;
};

beforeEach(() => {
  prismaMock.etablissement.findUnique.mockReset().mockResolvedValue(null);
  prismaMock.duerp.findFirst.mockReset().mockResolvedValue(null);
  prismaMock.action.findMany.mockReset().mockResolvedValue([]);
  prismaMock.equipement.findMany.mockReset().mockResolvedValue([]);
  prismaMock.verification.findMany.mockReset().mockResolvedValue([]);
});

describe("portée des lectures", () => {
  it("la fiche est lue sur l'établissement de la session, pas un autre", async () => {
    prismaMock.etablissement.findUnique.mockResolvedValue({
      raisonDisplay: "Café du Port",
      adresse: "1 quai Neuf",
      codeNaf: "56.10A",
      effectifSurSite: 8,
      estEtablissementTravail: true,
      estERP: true,
      estIGH: false,
      estHabitation: false,
      typeErp: "N",
      categorieErp: "cinq",
      entreprise: {
        raisonSociale: "Port SARL",
        siret: "12345678900011",
        codeNaf: "56.10A",
        effectif: 8,
      },
      _count: { equipements: 4, verifications: 12, actions: 3 },
    });

    await outil("fiche_etablissement").executer(ctx, {});

    expect(prismaMock.etablissement.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ETABLISSEMENT_ID } }),
    );
  });

  it("le DUERP est cherché par etablissementId", async () => {
    await getEtatDuerp(ETABLISSEMENT_ID, NOW);

    expect(prismaMock.duerp.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { etablissementId: ETABLISSEMENT_ID } }),
    );
  });

  it("le plan d'actions porte l'etablissementId, quels que soient les filtres", async () => {
    await listerActions(ETABLISSEMENT_ID, { criticiteMin: 9 }, NOW);

    const [{ where }] = prismaMock.action.findMany.mock.calls[0];
    expect(where.etablissementId).toBe(ETABLISSEMENT_ID);
    expect(where.criticite).toEqual({ gte: 9 });
  });

  it("aucun outil n'accepte d'identifiant d'établissement en argument", () => {
    // Le point de sécurité central : la portée vient du serveur. Un client
    // qui tenterait de désigner un autre dossier ne doit pas seulement être
    // refusé, il ne doit pas avoir de champ où l'écrire.
    for (const o of OUTILS_MCP) {
      const parse = o.schema.safeParse({
        etablissementId: AUTRE_ETABLISSEMENT,
        id: AUTRE_ETABLISSEMENT,
      });
      const retenu = parse.success ? parse.data : {};
      expect(Object.values(retenu)).not.toContain(AUTRE_ETABLISSEMENT);
    }
  });
});

describe("état du DUERP", () => {
  const duerpAvecVersion = (dateVersion: Date, effectif: number) => ({
    versions: [{ numero: 3, createdAt: dateVersion }],
    etablissement: { entreprise: { effectif } },
    unites: [
      {
        nom: "Salle",
        estTransverse: false,
        risques: [
          {
            libelle: "Chute de plain-pied",
            criticite: 12,
            gravite: 3,
            probabilite: 4,
            maitrise: 1,
            exposeCMR: false,
            _count: { actions: 2 },
          },
        ],
      },
    ],
  });

  it("annonce l'absence de DUERP sans inventer d'échéance", async () => {
    const texte = await outil("etat_duerp").executer(ctx, {});
    expect(texte).toContain("Aucun DUERP");
    expect(texte).not.toMatch(/échue|mise à jour annuelle à prévoir/i);
  });

  it("signale la mise à jour annuelle échue au-delà du seuil d'effectif", async () => {
    prismaMock.duerp.findFirst.mockResolvedValue(
      duerpAvecVersion(jour("2024-01-15"), 20),
    );

    const texte = await outil("etat_duerp").executer(ctx, {});

    expect(texte).toContain("Mise à jour annuelle échue");
    expect(texte).toContain("Chute de plain-pied");
    expect(texte).toContain("criticité 12");
  });

  it("n'oppose aucune échéance annuelle sous onze salariés (art. R. 4121-2)", async () => {
    // Une version de plus de deux ans, mais quatre salariés : le produit
    // n'a rien à reprocher au calendrier ici.
    prismaMock.duerp.findFirst.mockResolvedValue(
      duerpAvecVersion(jour("2024-01-15"), 4),
    );

    const texte = await outil("etat_duerp").executer(ctx, {});

    expect(texte).not.toContain("échue");
    expect(texte).toContain("ne s'applique pas");
  });
});

describe("plan d'actions", () => {
  const action = (over: Partial<Record<string, unknown>> = {}) => ({
    libelle: "Poser une main courante",
    statut: "ouverte",
    type: "protection_collective",
    criticite: 12,
    echeance: jour("2026-08-01"),
    risqueId: "risq_1",
    verificationId: null,
    risque: { libelle: "Chute dans l'escalier" },
    verification: null,
    ...over,
  });

  it("compte les retards avec le prédicat partagé du produit", async () => {
    prismaMock.action.findMany.mockResolvedValue([
      action(),
      // Échéance du jour même : jamais en retard, l'utilisateur a sa journée.
      action({ libelle: "Changer l'extincteur", echeance: jour("2026-08-10") }),
    ]);

    const texte = await outil("plan_actions").executer(ctx, {});

    expect(texte).toContain("2 action(s), dont 1 en retard.");
    expect(texte).toContain("Poser une main courante");
    expect(texte).toContain("origine DUERP : Chute dans l'escalier");
  });

  it("filtre les actions en retard après évaluation, pas en SQL", async () => {
    prismaMock.action.findMany.mockResolvedValue([
      action(),
      action({ libelle: "Changer l'extincteur", echeance: jour("2026-08-10") }),
    ]);

    const texte = await outil("plan_actions").executer(ctx, {
      enRetardSeulement: true,
    });

    expect(texte).toContain("1 action(s)");
    expect(texte).not.toContain("Changer l'extincteur");
    // Le filtre de statut reste en base : inutile de rapatrier les levées.
    const [{ where }] = prismaMock.action.findMany.mock.calls[0];
    expect(where.statut).toEqual({ in: ["ouverte", "en_cours"] });
  });

  it("le dit franchement quand rien ne correspond", async () => {
    const texte = await outil("plan_actions").executer(ctx, { criticiteMin: 99 });
    expect(texte).toContain("Aucune action");
  });

  it("rejette une criticité hors bornes", () => {
    const parse = outil("plan_actions").schema.safeParse({ criticiteMin: -3 });
    expect(parse.success).toBe(false);
  });
});

describe("équipements et calendrier", () => {
  const verif = (over: Partial<Record<string, unknown>> = {}) => ({
    libelleObligation: "Vérification périodique annuelle des extincteurs",
    periodicite: "annuelle",
    datePrevue: jour("2026-07-01"),
    dateRealisee: null,
    statut: "planifiee",
    equipement: { libelle: "Extincteur hall", categorie: "EXTINCTEUR" },
    // Le dernier rapport réalisé, tel que la requête le sélectionne (ADR-034).
    rapports: [],
    ...over,
  });

  it("lit les équipements de l'établissement de la session", async () => {
    await outil("equipements").executer(ctx, {});
    expect(prismaMock.equipement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { etablissementId: ETABLISSEMENT_ID } }),
    );
  });

  it("lit le calendrier de l'établissement de la session", async () => {
    await outil("verifications").executer(ctx, {});
    expect(prismaMock.verification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { etablissementId: ETABLISSEMENT_ID } }),
    );
  });

  it("compte les retards d'un équipement avec le prédicat partagé", async () => {
    prismaMock.equipement.findMany.mockResolvedValue([
      {
        libelle: "Extincteur hall",
        categorie: "EXTINCTEUR",
        localisation: "Entrée",
        dateMiseEnService: jour("2023-04-01"),
        actif: true,
        verifications: [
          // Échéance passée, non réalisée : en retard.
          {
            statut: "planifiee",
            datePrevue: jour("2026-07-01"),
            dateRealisee: null,
            libelleObligation: "Vérification périodique",
          },
          // Échéance du jour même : jamais en retard.
          {
            statut: "planifiee",
            datePrevue: jour("2026-08-10"),
            dateRealisee: null,
            libelleObligation: "Vérification périodique",
          },
        ],
      },
    ]);

    const texte = await outil("equipements").executer(ctx, {});
    expect(texte).toContain("Extincteur hall");
    expect(texte).toContain("extincteur");
    expect(texte).toContain("2 vérification(s), 1 en retard");
  });

  it("trouve une vérification par le nom courant de sa catégorie", async () => {
    // Le client ne connaît pas la nomenclature interne : « extincteur »
    // doit suffire, sans que personne ait à écrire EXTINCTEUR.
    prismaMock.verification.findMany.mockResolvedValue([
      verif(),
      verif({
        libelleObligation: "Vérification des installations électriques",
        equipement: { libelle: "TGBT", categorie: "INSTALLATION_ELECTRIQUE" },
      }),
    ]);

    const texte = await outil("verifications").executer(ctx, {
      recherche: "extincteur",
    });

    expect(texte).toContain("1 vérification(s)");
    expect(texte).toContain("Extincteur hall");
    expect(texte).not.toContain("TGBT");
  });

  it("annonce le retard en jours civils", async () => {
    prismaMock.verification.findMany.mockResolvedValue([verif()]);
    const texte = await outil("verifications").executer(ctx, {});
    // Du 01/07 au 10/08 : 40 jours.
    expect(texte).toContain("en retard");
    expect(texte).toContain("40 jour(s) de retard");
  });

  it("ne compte jamais une occurrence réalisée comme en retard", async () => {
    // La preuve prime sur l'état : un rapport déposé purge l'échéance,
    // même si le statut n'a pas été rafraîchi.
    prismaMock.verification.findMany.mockResolvedValue([
      verif({ dateRealisee: jour("2026-07-15") }),
    ]);

    const texte = await outil("verifications").executer(ctx, {});
    expect(texte).toContain("aucune en retard");
    expect(texte).toContain("réalisée le 15/07/2026");
  });

  it("le dit franchement quand rien ne correspond", async () => {
    const texte = await outil("verifications").executer(ctx, {
      recherche: "ascenseur",
    });
    expect(texte).toContain("Aucune vérification");
  });

  it("rend à l'assistant le contrôle fait ET l'échéance ouverte d'une ligne roulée", async () => {
    // ADR-034 : la ligne ne porte que l'échéance ouverte, le contrôle fait se
    // lit sur son rapport. L'assistant doit recevoir les deux — sans le
    // premier, il dirait « jamais contrôlé » d'un appareil vérifié en juillet.
    prismaMock.verification.findMany.mockResolvedValue([
      verif({
        datePrevue: jour("2027-07-15"),
        rapports: [{ dateRapport: jour("2026-07-15") }],
      }),
    ]);

    const texte = await outil("verifications").executer(ctx, {});
    expect(texte).toContain("dernière réalisation le 15/07/2026");
    expect(texte).toContain("échéance 15/07/2027");
  });
});

describe("provenance de la réponse", () => {
  const fiche = {
    raisonDisplay: "Maak",
    adresse: "rue pepouze, 31300 Toulouse",
    codeNaf: "47.25Z",
    effectifSurSite: 2,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "M",
    categorieErp: "cinq",
    entreprise: {
      raisonSociale: "Maak",
      siret: "93476576900039",
      codeNaf: "47.25Z",
      effectif: 2,
    },
    _count: { equipements: 13, verifications: 43, actions: 21 },
  };

  it("nomme l'établissement en tête de chaque réponse", async () => {
    // Un même client peut brancher deux connecteurs Rojer sur deux dossiers,
    // avec les mêmes outils et les mêmes noms. Sans ce rappel, une réponse
    // juste sur le mauvais dossier se lit comme une réponse fausse.
    prismaMock.etablissement.findUnique.mockResolvedValue(fiche);

    for (const o of OUTILS_MCP) {
      const texte = await o.executer(ctx, {});
      expect(texte.startsWith("Établissement : Maak")).toBe(true);
    }
  });

  it("ajoute la ville, pour départager deux homonymes", async () => {
    prismaMock.etablissement.findUnique.mockResolvedValue(fiche);
    const texte = await outil("plan_actions").executer(ctx, {});
    expect(texte).toContain("Établissement : Maak (Toulouse)");
  });

  it("ne répète pas le nom dans la fiche, qui le portait déjà", async () => {
    prismaMock.etablissement.findUnique.mockResolvedValue(fiche);
    const texte = await outil("fiche_etablissement").executer(ctx, {});
    expect(texte.match(/Maak \(Toulouse\)/g)).toHaveLength(1);
  });

  it("rend la réponse sans préfixe plutôt que d'échouer si le nom manque", async () => {
    // Un établissement supprimé entre deux appels ne doit pas faire tomber
    // l'outil : la donnée compte plus que son étiquette.
    prismaMock.etablissement.findUnique.mockResolvedValue(null);
    const texte = await outil("plan_actions").executer(ctx, {});
    expect(texte).not.toContain("Établissement :");
    expect(texte).toContain("Aucune action");
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUCUNE CATÉGORIE NE SORT EN CLÉ BRUTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE DÉFAUT (2026-09-04). `LIBELLE_CATEGORIE` est la SEULE table du dépôt
 * indexée par `string` et non par `CategorieEquipement` — les quatre autres
 * (`ICONE_CATEGORIE`, `LABEL_CATEGORIE_EQUIPEMENT`, `DESCRIPTION_CATEGORIE`,
 * `PICTO_CATEGORIE_EQUIPEMENT`) sont typées, et `tsc` refuse d'en compiler une
 * incomplète. Celle-ci ne peut rien signaler : une clé manquante n'est pas une
 * erreur de type sur un `Record<string, …>`.
 *
 * Résultat, quatre catégories ouvertes le même jour sortaient en
 * « epi_antichute » et « epi_gilet_sauvetage » au client MCP, par le repli
 * `?? c.toLowerCase()`. Le repli est bon — un serveur qui parle à un modèle ne
 * doit pas casser sur une valeur neuve — mais il rend l'oubli SILENCIEUX, et
 * c'est très exactement pourquoi ce test existe : il rend au repli son rôle de
 * filet, en lui retirant celui de couverture.
 *
 * Pourquoi ne pas simplement typer la table en `Record<CategorieEquipement, …>` :
 * parce que `categorieLisible` reçoit ce que la base rend, et qu'une valeur
 * d'enum ajoutée par migration existe en base avant d'exister dans le type
 * généré. Le repli doit rester possible ; c'est son emploi comme excuse qui ne
 * doit plus l'être.
 */
describe("le serveur MCP nomme toutes les catégories", () => {
  it("chaque catégorie du modèle a un libellé, aucune ne tombe sur le repli", () => {
    const sansLibelle = CATEGORIES_EQUIPEMENT.filter(
      (c) => !(c in LIBELLE_CATEGORIE),
    );
    expect(
      sansLibelle,
      "Ces catégories sortiraient du serveur MCP en clé brute — " +
        "« epi_antichute » plutôt que « harnais antichute ». `tsc` ne peut pas " +
        "le voir : la table est indexée par `string`.",
    ).toEqual([]);
  });

  it("aucune clé COMPOSÉE n'est rendue par sa seule mise en minuscules", () => {
    // Le second mode de panne : une entrée ajoutée pour faire taire le test
    // ci-dessus, en recopiant la clé. Elle passerait le `in` sans rien nommer.
    //
    // RESTREINT AUX CLÉS COMPOSÉES, et la première rédaction ne l'était pas :
    // elle dénonçait EXTINCTEUR, ASCENSEUR et AUTRE, dont la minuscule est le
    // mot français juste. Un test qui accuse le code d'avoir raison est pire
    // qu'un test absent — celui-ci ne regarde donc que les clés à underscore,
    // où « epi_gilet_sauvetage » n'est jamais une façon de parler.
    const paresseux = CATEGORIES_EQUIPEMENT.filter(
      (c) => c.includes("_") && LIBELLE_CATEGORIE[c] === c.toLowerCase(),
    );
    expect(
      paresseux,
      "Ces libellés sont la clé en minuscules, underscores compris : c'est ce " +
        "que le repli fait déjà, et le dirigeant n'y lit pas un objet.",
    ).toEqual([]);
  });
});
