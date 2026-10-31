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
    etablissement: { findUnique: vi.fn(), findFirst: vi.fn() },
    duerp: { findFirst: vi.fn() },
    action: { findMany: vi.fn() },
    equipement: { findMany: vi.fn() },
    verification: { findMany: vi.fn(), count: vi.fn() },
  },
}));

// Le client des lectures : le client borné simulé (`vitest.setup.ts`) sur
// le faux Prisma — les refus de la borne s'y appliquent, les assertions
// portent sur ce que reçoit `prismaMock`.
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("./db", async () => {
  const { clientDuCompteSimule } = await import("@/test/garde-simulee");
  return { clientMcp: async () => clientDuCompteSimule() };
});
// ADR-039 : aucune obligation livrée ne porte encore de rythme retenu (lot 3).
// Pour éprouver que la mention voyage jusqu'à l'assistant, une ligne FICTIVE
// en reçoit une ; toutes les autres reçoivent `null`, ce que la fonction réelle
// rend aujourd'hui pour chacune.
const ID_RYTHME_FICTIF = "fixture-rythme-retenu";
vi.mock("@/lib/referentiels/conformite/mention-de-ligne", () => ({
  mentionRythmeDeVerification: (v: { obligationId: string }) =>
    v.obligationId === ID_RYTHME_FICTIF
      ? {
          motif: "defaut_annuel",
          court: "Rythme retenu par défaut",
          long: "Le texte dit « périodicité appropriée » ; rythme retenu par défaut : annuel.",
        }
      : null,
}));

import { ErreurOutilMcp, OUTILS_MCP, type ContexteMcp } from "./tools";
import { SCEAU_CALENDRIER } from "@/lib/calendrier/version-moteur";
import { getEtatDuerp, getFraicheurCalendrier, getParcEquipements, listerActions } from "./queries";
import { couvertureDeLInventaire } from "@/lib/perimetre/couverture";
import { PHRASE_SANS_REPONSE } from "@/lib/matching/sans-reponse";
import { QUESTION_MATIERES } from "@/lib/etablissements/questions";

/** 10 août 2026, 9 h à Paris. */
const NOW = new Date("2026-08-10T07:00:00Z");
const ETABLISSEMENT_ID = "etab_demo_1";
const AUTRE_ETABLISSEMENT = "etab_du_voisin";

const { clientDuCompteSimule } = await import("@/test/garde-simulee");
const client = await clientDuCompteSimule();
const db = async () => client;
const ctx: ContexteMcp = {
  scope: { etablissementId: ETABLISSEMENT_ID },
  now: NOW,
  db: await db(),
};

/** Date civile telle que Prisma la rend. */
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const outil = (nom: string) => {
  const o = OUTILS_MCP.find((x) => x.nom === nom);
  if (!o) throw new Error(`outil ${nom} absent`);
  return o;
};

/** La requête du nom (`getNomEtablissement`) : un établissement existe, par défaut. */
const estRequeteDuNom = (args: { select?: Record<string, unknown> } | undefined) =>
  Boolean(args?.select) && Object.keys(args!.select!).sort().join(",") === "adresse,raisonDisplay";

beforeEach(() => {
  // Par défaut, l'établissement EXISTE (requête du nom), et le reste du dossier
  // est vide. Avant le 2026-09-26, `null` partout faisait passer pour un
  // dossier vide un établissement introuvable — le défaut même que l'outil ne
  // commet plus (C38).
  prismaMock.etablissement.findUnique
    .mockReset()
    .mockImplementation(async (args?: { select?: Record<string, unknown> }) =>
      estRequeteDuNom(args) ? { raisonDisplay: "Le Comptoir", adresse: "1 rue des Lilas, 75011 Paris" } : null,
    );
  // Les marques « à confirmer » (`marquesAConfirmerDuDossier`) : par défaut,
  // rien à marquer.
  prismaMock.etablissement.findFirst.mockReset().mockResolvedValue(null);
  prismaMock.duerp.findFirst.mockReset().mockResolvedValue(null);
  prismaMock.action.findMany.mockReset().mockResolvedValue([]);
  prismaMock.equipement.findMany.mockReset().mockResolvedValue([]);
  prismaMock.verification.findMany.mockReset().mockResolvedValue([]);
  // Par défaut, un dossier dont le calendrier est à jour : les tests qui
  // portent sur autre chose n'ont pas à porter l'avertissement de fraîcheur.
  prismaMock.verification.count.mockReset().mockResolvedValue(0);
});

describe("le serveur dit quand le calendrier n'est pas à jour", () => {
  /** Un établissement lisible, dont le repère de calendrier est paramétrable. */
  function dossier(repere: string | null) {
    return {
      raisonDisplay: "Café du Port",
      adresse: "1 quai Neuf",
      ville: "Sète",
      referentielVersionCalendrier: repere,
      codeNaf: "56.10A",
      effectifSurSite: 8,
      estEtablissementTravail: true,
      estERP: true,
      estIGH: false,
      estHabitation: false,
      typeErp: "N",
      typesErpAutres: [],
      categorieErp: "N5",
      entreprise: {
        raisonSociale: "Port SARL",
        siret: "12345678900011",
        codeNaf: "56.10A",
        effectif: 8,
      },
      equipements: [],
      _count: { equipements: 0, verifications: 0, actions: 0 },
    };
  }

  it("préfixe les vérifications quand le calendrier n'a jamais été calculé", async () => {
    // LE DÉFAUT : `listerVerifications` rend une liste vide, et un modèle en
    // conclut « rien à signaler ». Le serveur est en lecture seule, il ne peut
    // pas régénérer — mais il peut dire d'où vient son silence.
    prismaMock.etablissement.findUnique.mockResolvedValue(dossier(null));
    prismaMock.verification.count.mockResolvedValue(0);

    const texte = await outil("verifications").executer(ctx, {});

    expect(texte).toContain("n'a pas encore été calculé");
    expect(texte).toContain("ne veut pas dire qu'il n'y en a pas");
  });

  it("tenancy : les lignes comptées pour le repère sont celles de l'établissement servi", async () => {
    prismaMock.etablissement.findUnique.mockResolvedValue(dossier(null));
    prismaMock.verification.count.mockResolvedValue(0);
    await getFraicheurCalendrier(await db(), ETABLISSEMENT_ID);
    expect(prismaMock.verification.count).toHaveBeenCalledWith({ where: { etablissementId: ETABLISSEMENT_ID } });
  });

  it("ne dit rien quand le calendrier est à jour", async () => {
    // Un avertissement permanent cesse d'être lu.
    prismaMock.etablissement.findUnique.mockResolvedValue(
      dossier(SCEAU_CALENDRIER),
    );

    const texte = await outil("verifications").executer(ctx, {});

    expect(texte).not.toContain("n'a pas encore été calculé");
    expect(texte).not.toMatch(/calendrier des vérifications n'a pas/i);
  });

  it("préfixe aussi le plan d'actions, qui naît en partie du calendrier", async () => {
    prismaMock.etablissement.findUnique.mockResolvedValue(dossier(null));
    prismaMock.verification.count.mockResolvedValue(0);

    const texte = await outil("plan_actions").executer(ctx, {});

    expect(texte).toContain("n'a pas encore été calculé");
  });
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
      typesErpAutres: [],
      categorieErp: "N5",
      entreprise: {
        raisonSociale: "Port SARL",
        siret: "12345678900011",
        codeNaf: "56.10A",
        effectif: 8,
      },
      equipements: [],
      _count: { equipements: 4, verifications: 12, actions: 3 },
    });

    await outil("fiche_etablissement").executer(ctx, {});

    expect(prismaMock.etablissement.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ETABLISSEMENT_ID } }),
    );
  });

  it("le DUERP est cherché par etablissementId", async () => {
    await getEtatDuerp(await db(), ETABLISSEMENT_ID, NOW);

    expect(prismaMock.duerp.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { etablissementId: ETABLISSEMENT_ID } }),
    );
  });

  it("le plan d'actions porte l'etablissementId, quels que soient les filtres", async () => {
    await listerActions(await db(), ETABLISSEMENT_ID, { criticiteMin: 9 }, NOW);

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
    // `null` = ligne ouverte. L'archivage est un champ depuis l'ADR-034 (N3),
    // et la requête du serveur le sélectionne en clair.
    archiveLe: null,
    statut: "planifiee",
    equipement: { libelle: "Extincteur hall", categorie: "EXTINCTEUR" },
    // Le dernier rapport réalisé, tel que la requête le sélectionne (ADR-034).
    rapports: [],
    ...over,
  });

  it("range les lignes sans échéance connue en tête, pas à leur date de génération", async () => {
    // Relecture système du 2026-09-14 : triée sur `datePrevue` brute, une
    // « à planifier » générée le 05/07 s'intercalait entre deux dates que
    // l'assistant reçoit, sous un libellé qui n'en porte aucune.
    prismaMock.verification.findMany.mockResolvedValue([
      verif({ libelleObligation: "Contrôle daté A", datePrevue: jour("2026-07-01") }),
      verif({
        libelleObligation: "Contrôle sans date",
        statut: "a_planifier",
        datePrevue: jour("2026-07-05"),
      }),
      verif({ libelleObligation: "Contrôle daté B", datePrevue: jour("2026-08-20") }),
    ]);

    const texte = await outil("verifications").executer(ctx, { horizonJours: 30 });
    const rang = (s: string) => texte.indexOf(s);
    expect(rang("Contrôle sans date")).toBeGreaterThan(-1);
    expect(rang("Contrôle sans date")).toBeLessThan(rang("Contrôle daté A"));
    expect(rang("Contrôle daté A")).toBeLessThan(rang("Contrôle daté B"));
  });

  it("ne range pas une obligation éteinte en tête avec les lignes sans échéance", async () => {
    prismaMock.verification.findMany.mockResolvedValue([
      verif({ libelleObligation: "Contrôle daté A", datePrevue: jour("2026-07-01") }),
      verif({
        libelleObligation: "Obligation éteinte",
        datePrevue: jour("2026-07-20"),
        archiveLe: jour("2026-07-25"),
      }),
      verif({
        libelleObligation: "Contrôle sans date",
        statut: "a_planifier",
        datePrevue: jour("2026-07-05"),
      }),
    ]);

    const texte = await outil("verifications").executer(ctx, {});
    const rang = (s: string) => texte.indexOf(s);
    expect(rang("Contrôle sans date")).toBeLessThan(rang("Contrôle daté A"));
    expect(rang("Contrôle daté A")).toBeLessThan(rang("Obligation éteinte"));
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
            archiveLe: null,
            libelleObligation: "Vérification périodique",
          },
          // Échéance du jour même : jamais en retard.
          {
            statut: "planifiee",
            datePrevue: jour("2026-08-10"),
            archiveLe: null,
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

  it("une ligne « à planifier » en retard n'a pas d'échéance ni de jours à compter", async () => {
    // Relecture système du 2026-09-14 : l'assistant recevait « échéance
    // 01/07/2026, 40 jour(s) de retard » sur la date de génération de la
    // ligne — l'âge du dossier. Il reçoit qu'elle est en retard, sans échéance
    // connue.
    prismaMock.verification.findMany.mockResolvedValue([
      verif({ statut: "a_planifier" }),
    ]);
    const texte = await outil("verifications").executer(ctx, {});
    // La LIGNE, pas l'en-tête (« dont 1 en retard ») qui satisfaisait déjà
    // un `toContain("en retard")` sur le texte entier.
    const ligne = texte.split("\n").find((l) => l.startsWith("•")) ?? "";
    expect(ligne).toContain("en retard");
    expect(ligne).toContain("sans échéance connue");
    expect(ligne).not.toContain("jour(s) de retard");
    expect(ligne).not.toContain("01/07/2026");
  });

  it("une ligne sans rendez-vous le dit une fois, sans « sans échéance connue » (limite 1)", async () => {
    prismaMock.verification.findMany.mockResolvedValue([
      verif({ statut: "a_planifier", periodicite: "autre" }),
    ]);
    const texte = await outil("verifications").executer(ctx, {});
    const ligne = texte.split("\n").find((l) => l.startsWith("•")) ?? "";
    expect(ligne).toContain("sans date fixée");
    expect(ligne).not.toContain("sans échéance connue");
    expect(ligne).not.toContain("en retard");
  });

  it("l'assistant reçoit la dernière réalisation ET l'échéance ouverte", async () => {
    // Relecture externe du 2026-09-13 : l'échéance était écrite en alternative
    // avec la réalisation. L'assistant recevait « réalisée le … » sans pouvoir
    // dire quelle échéance était due. Contrôle le 20/07/2025, ligne roulée au
    // 20/07/2026 : passée de 21 jours au 10/08.
    prismaMock.verification.findMany.mockResolvedValue([
      verif({
        statut: "planifiee",
        datePrevue: jour("2026-07-20"),
        rapports: [{ dateRapport: jour("2025-07-20"), resultat: "conforme" }],
      }),
    ]);
    const texte = await outil("verifications").executer(ctx, {});
    expect(texte).toContain("dernière réalisation le 20/07/2025");
    expect(texte).toContain("échéance 20/07/2026");
    expect(texte).toContain("21 jour(s) de retard");
  });

  it("une obligation éteinte ne s'applique plus, malgré son statut gelé", async () => {
    // Le statut d'une ligne archivée reste GELÉ dans son dernier état connu —
    // l'enum Prisma n'a pas de valeur `archivee` —, ici « dépassée ». Sans
    // lecture de `archiveLe`, l'assistant recevait « en retard, 40 jour(s) de
    // retard » sur une obligation qui ne s'applique plus, et le répétait au
    // dirigeant sous un en-tête qui, lui, n'en comptait aucune : la ligne et
    // son total se contredisaient dans la même réponse.
    prismaMock.verification.findMany.mockResolvedValue([
      verif({ statut: "planifiee", archiveLe: jour("2026-07-20") }),
    ]);

    const texte = await outil("verifications").executer(ctx, {});

    expect(texte).toContain("plus suivie");
    expect(texte).toContain("aucune en retard");
    expect(texte).not.toContain("jour(s) de retard");
    // Et le libellé sort NU : le marqueur texte a disparu des libellés au N3,
    // c'est l'état rendu qui porte le fait.
    expect(texte).not.toContain("Ne s'applique plus —");
  });

  it("et elle ne ressort pas non plus dans les prochaines échéances", async () => {
    prismaMock.verification.findMany.mockResolvedValue([
      verif({
        statut: "planifiee",
        datePrevue: jour("2026-08-20"),
        archiveLe: jour("2026-07-20"),
      }),
    ]);

    const texte = await outil("verifications").executer(ctx, { horizonJours: 30 });
    expect(texte).toContain("Aucune vérification");
  });

  it("une ligne roulée rend son contrôle fait ET son échéance dépassée (ADR-034)", async () => {
    // CE TEST ATTENDAIT L'INVERSE, et son inverse est devenu faux. Il posait
    // une ligne `planifiee` portant une `dateRealisee` et exigeait « aucune en
    // retard » : la colonne purgeait l'échéance. Depuis que la ligne roule au
    // dépôt, elle ne porte plus que l'échéance OUVERTE — une échéance passée
    // sur un appareil pourtant contrôlé EST un retard, et l'ancien modèle la
    // sortait de tous les comptes (le défaut du lot 3 bis).
    //
    // Ce qui purge encore une échéance est le statut réalisé d'une obligation
    // consommée : c'est le test « une obligation ponctuelle déjà faite », plus
    // bas, qui le tient.
    prismaMock.verification.findMany.mockResolvedValue([
      verif({ rapports: [{ dateRapport: jour("2026-07-15") }] }),
    ]);

    const texte = await outil("verifications").executer(ctx, {});
    expect(texte).toContain("dont 1 en retard");
    expect(texte).toContain("dernière réalisation le 15/07/2026");
    expect(texte).toContain("40 jour(s) de retard");
  });

  it("le dit franchement quand rien ne correspond", async () => {
    const texte = await outil("verifications").executer(ctx, {
      recherche: "ascenseur",
    });
    expect(texte).toContain("Aucune vérification");
  });

  it("une obligation ponctuelle déjà faite n'est ni « planifiée » ni en retard", async () => {
    // Le défaut le plus grave de la relecture du 2026-09-12 : depuis que la
    // réconciliation éteint la colonne, `dateRealisee` ne dit plus qu'un
    // contrôle de mise en service a eu lieu — seul son statut le dit. Lue sur
    // la colonne, la garde tombait, et l'assistant recevait « planifiée,
    // 40 jour(s) de retard » sous un en-tête « aucune en retard ».
    prismaMock.verification.findMany.mockResolvedValue([
      verif({
        periodicite: "mise_en_service_uniquement",
        statut: "realisee_conforme",
        datePrevue: jour("2026-07-01"),
        rapports: [{ dateRapport: jour("2026-06-20") }],
      }),
    ]);

    const texte = await outil("verifications").executer(ctx, {});
    expect(texte).toContain("aucune en retard");
    expect(texte).not.toContain("jour(s) de retard");
    expect(texte).toContain("réalisée");
  });

  it("et elle ne ressort pas dans les prochaines échéances", async () => {
    prismaMock.verification.findMany.mockResolvedValue([
      verif({
        periodicite: "mise_en_service_uniquement",
        statut: "realisee_conforme",
        datePrevue: jour("2026-07-01"),
        rapports: [{ dateRapport: jour("2026-06-20") }],
      }),
    ]);

    const texte = await outil("verifications").executer(ctx, { horizonJours: 30 });
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
    typesErpAutres: [],
    categorieErp: "N5",
    entreprise: {
      raisonSociale: "Maak",
      siret: "93476576900039",
      codeNaf: "47.25Z",
      effectif: 2,
    },
    equipements: [],
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

  it("dit tous les types d'ERP déclarés, pas le seul premier (ADR-045)", async () => {
    prismaMock.etablissement.findUnique.mockResolvedValue({
      ...fiche,
      typeErp: "O",
      typesErpAutres: ["N", "L"],
      categorieErp: "N3",
    });
    const texte = await outil("fiche_etablissement").executer(ctx, {});
    // « catégorie 3 », et non le code « N3 » (revue du lot 3, R2).
    expect(texte).toContain("ERP (O, N, L, catégorie 3)");
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

  // ~~« rend la réponse sans préfixe plutôt que d'échouer si le nom manque »
  // — la donnée compte plus que son étiquette~~ — rayé le 2026-09-26 (C38) :
  // si le nom manque, l'établissement n'existe pas, et il n'y a pas de donnée.
  // « Aucune action », « aucun équipement déclaré », « aucun DUERP ouvert »
  // décrivaient alors un dossier vide qui n'existait pas.
  it("sur un établissement introuvable, ne décrit aucun dossier — le défaut de l'audit", async () => {
    prismaMock.etablissement.findUnique.mockReset().mockResolvedValue(null);
    // Depuis l'audit du 2026-09-27, l'outil ÉCHOUE (`ErreurOutilMcp`), et le
    // transport rend le message en `isError` : un texte ordinaire se lisait
    // comme une réponse réussie.
    for (const o of OUTILS_MCP) {
      const echec = await o.executer(ctx, {}).then(
        (texte: string) => ({ texte, erreur: null as unknown }),
        (erreur: unknown) => ({ texte: null, erreur }),
      );
      expect(echec.texte, o.nom).toBeNull();
      expect(echec.erreur, o.nom).toBeInstanceOf(ErreurOutilMcp);
      const message = (echec.erreur as Error).message;
      expect(message, o.nom).toContain("Établissement introuvable pour ce connecteur");
      expect(message, o.nom).not.toMatch(/Aucune? (action|équipement|DUERP|vérification)/);
    }
  });

  it("une liste vide sans filtre ne se dit pas « ne correspond à ces critères »", async () => {
    const actions = await outil("plan_actions").executer(ctx, {});
    expect(actions).toContain("Le plan d'actions ne contient aucune action.");
    const filtrees = await outil("plan_actions").executer(ctx, { enRetard: true });
    expect(filtrees).toContain("ne correspond à ces critères");
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUCUNE CATÉGORIE NE SORT EN CLÉ BRUTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE DÉFAUT (2026-09-04). `LIBELLE_CATEGORIE` est la SEULE table du dépôt
 * indexée par `string` et non par `CategorieEquipement` — les ~~quatre~~ trois autres
 * (`ICONE_CATEGORIE`, `LABEL_CATEGORIE_EQUIPEMENT`, `DESCRIPTION_CATEGORIE`,
 * ~~`PICTO_CATEGORIE_EQUIPEMENT`~~ [2026-10-14 : `lib/equipements/pictos.ts`,
 * importé nulle part, supprimé — audit Next.js B7]) sont typées, et `tsc` refuse d'en compiler une
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

describe("une ligne retenue par prudence le dit à l'assistant (2026-09-27)", () => {
  // Analyse du 2026-09-27, § 6.3 : le MCP restituait comme due une ligne que
  // seul le silence de la fiche fait exister. Éprouvé en retirant la clause
  // `à confirmer` de `formaterVerifications` : ce test rougit.
  const bureauMuet = {
    id: ETABLISSEMENT_ID,
    effectifSurSite: 3,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: false,
    estHabitation: false,
    typeErp: null,
    typesErpAutres: [],
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    entreprise: { effectif: 3 },
    equipements: [],
  };
  const ligneExercice = {
    obligationId: "incendie-travail-exercice-semestriel",
    prescriptionId: null,
    libelleObligation: "Essais du matériel et exercices d'évacuation semestriels",
    periodicite: "semestrielle",
    datePrevue: jour("2026-09-01"),
    archiveLe: null,
    statut: "planifiee",
    equipement: null,
    prescription: null,
    salarieId: null,
    rapports: [],
  };

  it("un rythme retenu voyage avec la ligne, en toutes lettres (ADR-039)", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue(bureauMuet);
    prismaMock.verification.findMany.mockResolvedValue([
      { ...ligneExercice, obligationId: ID_RYTHME_FICTIF, periodicite: "annuelle" },
    ]);
    const texte = await outil("verifications").executer(ctx, {});
    expect(texte).toContain("Le texte dit « périodicité appropriée » ; rythme retenu par défaut : annuel.");
  });

  it("muet sur les matières : la ligne porte « à confirmer » et la phrase", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue(bureauMuet);
    prismaMock.verification.findMany.mockResolvedValue([ligneExercice]);
    const texte = await outil("verifications").executer(ctx, {});
    // ~~« à confirmer : La fiche de l'établissement ne dit pas si des
    // matières »~~ [2026-10-13, `lot/question-matieres` : la phrase cite la
    // question reformulée, et l'assistant la reçoit entière, question
    // comprise — c'est la surface MCP de `question-matieres.test.tsx`.]
    expect(texte).toContain(`à confirmer : ${PHRASE_SANS_REPONSE.matieres_r4227_22}`);
    expect(texte).toContain(QUESTION_MATIERES);
    // La lecture porte la portée du jeton.
    expect(prismaMock.etablissement.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ETABLISSEMENT_ID } }),
    );
  });

  it("« non » déclaré : plus de marque", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue({
      ...bureauMuet,
      manipuleMatieresR422722: false,
    });
    prismaMock.verification.findMany.mockResolvedValue([ligneExercice]);
    const texte = await outil("verifications").executer(ctx, {});
    expect(texte).not.toContain("à confirmer");
  });

  // D1 (a), 2026-09-28 : échue, la ligne prudente n'est pas « en retard » pour
  // l'assistant — ni dans son état, ni dans l'en-tête, ni en jours de retard.
  // Éprouvé en rendant « en_retard » sans lire la prudence dans `etatDe`.
  const exerciceEchu = { ...ligneExercice, datePrevue: jour("2026-03-01") };

  it("muet, échue : « à confirmer », aucune en retard", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue(bureauMuet);
    prismaMock.verification.findMany.mockResolvedValue([exerciceEchu]);
    const texte = await outil("verifications").executer(ctx, {});
    expect(texte).toContain("aucune en retard");
    expect(texte).not.toContain("jour(s) de retard");
  });

  it("« oui » déclaré, échue : la ligne est due, et en retard", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue({
      ...bureauMuet,
      manipuleMatieresR422722: true,
    });
    prismaMock.verification.findMany.mockResolvedValue([exerciceEchu]);
    const texte = await outil("verifications").executer(ctx, {});
    expect(texte).toContain("dont 1 en retard");
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * UN DOSSIER QUI N'A RIEN DÉCLARÉ LE DIT À L'ASSISTANT (§ 15, 2026-10-13)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE DÉFAUT. Les écrans disaient depuis le 2026-09-26 qu'un dossier n'a déclaré
 * aucun équipement (axe `inventaire`, `perimetre/couverture.ts`). Le serveur,
 * non : à ce dossier, `verifications` et `equipements` rendaient des listes
 * vides, qu'un modèle lit « rien à faire ». Et la fiche comptait un appareil
 * RETIRÉ du parc comme déclaré.
 *
 * Les phrases attendues ne sont pas recopiées ici : elles sont demandées à
 * l'axe lui-même (`couvertureDeLInventaire`). C'est ce qui éprouve que le
 * serveur lit la même fonction que les écrans — une phrase propre au MCP, même
 * juste, ferait tomber ces tests.
 */
describe("le serveur dit qu'aucun équipement n'est déclaré (§ 15)", () => {
  const OUTILS_DU_PARC = ["verifications", "equipements", "fiche_etablissement"];

  const appareil = (actif: boolean) => ({
    libelle: actif ? "Extincteur hall" : "Ancien extincteur",
    categorie: "EXTINCTEUR",
    localisation: null,
    dateMiseEnService: null,
    actif,
    verifications: [],
  });

  /**
   * Pose le parc d'un scénario aux DEUX endroits où le serveur le lit : la
   * liste des équipements (`equipements`, `verifications`) et la fiche, qui
   * compte le parc en service et liste les retirés dans sa propre requête.
   * La fiche et le nom passent tous deux par `findUnique`.
   */
  function parc(appareils: ReturnType<typeof appareil>[]) {
    prismaMock.equipement.findMany.mockResolvedValue(appareils);
    prismaMock.etablissement.findUnique.mockResolvedValue({
      raisonDisplay: "Le Comptoir",
      adresse: "1 rue des Lilas, 75011 Paris",
      codeNaf: "56.10A",
      effectifSurSite: 3,
      estEtablissementTravail: true,
      estERP: false,
      estIGH: false,
      estHabitation: false,
      typeErp: null,
      typesErpAutres: [],
      categorieErp: null,
      referentielVersionCalendrier: SCEAU_CALENDRIER,
      entreprise: { raisonSociale: "Comptoir SAS", siret: null, codeNaf: "56.10A", effectif: 3 },
      equipements: appareils.filter((a) => !a.actif).map((_, i) => ({ id: `retire-${i}` })),
      _count: { equipements: appareils.filter((a) => a.actif).length, verifications: 0, actions: 0 },
    });
  }

  const sansRien = couvertureDeLInventaire({ nbEquipements: 0, nbRetires: 0 })!;
  const toutRetire = couvertureDeLInventaire({ nbEquipements: 0, nbRetires: 1 })!;
  const lignes = (t: string) => t.split("\n");

  it("dossier sans équipement : chaque outil du parc porte la phrase de l'axe, avant le contenu", async () => {
    parc([]);
    // Une obligation d'établissement au calendrier : la liste n'est PAS vide,
    // et elle tait pourtant tout ce qu'un équipement porterait.
    prismaMock.verification.findMany.mockResolvedValue([
      {
        libelleObligation: "Consigne de sécurité incendie",
        periodicite: "autre",
        datePrevue: jour("2026-09-01"),
        archiveLe: null,
        statut: "planifiee",
        equipement: null,
        rapports: [],
      },
    ]);
    for (const nom of OUTILS_DU_PARC) {
      const texte = await outil(nom).executer(ctx, {});
      expect(texte, nom).toContain(sansRien.motif);
      expect(texte, nom).toContain(sansRien.consequence);
      // Juste après le nom de l'établissement : un modèle qui tronque lit le début.
      expect(texte.split("\n\n")[1], nom).toBe(`${sansRien.motif} ${sansRien.consequence}`);
    }
    // Aussi sur une liste filtrée : le filtre ne change pas le parc.
    const filtree = await outil("verifications").executer(ctx, { enRetardSeulement: true });
    expect(filtree).toContain(sansRien.motif);
  });

  it("dossier avec un équipement actif : aucune phrase d'inventaire, aucun retiré annoncé", async () => {
    parc([appareil(true)]);
    for (const nom of OUTILS_DU_PARC) {
      const texte = await outil(nom).executer(ctx, {});
      expect(texte, nom).not.toContain(sansRien.motif);
      expect(texte, nom).not.toContain(toutRetire.motif);
      // Pas de « (0 retiré(s) du parc) » : sans retiré, rien n'en est dit.
      expect(texte, nom).not.toContain("retiré(s) du parc");
    }
    const ficheTexte = await outil("fiche_etablissement").executer(ctx, {});
    expect(lignes(ficheTexte)).toContain("Équipements déclarés en service : 1");
    const liste = await outil("equipements").executer(ctx, {});
    expect(lignes(liste)).toContain("1 équipement(s) déclaré(s).");
  });

  it("un appareil actif à côté d'un retiré suffit : pas de phrase", async () => {
    parc([appareil(true), appareil(false)]);
    for (const nom of OUTILS_DU_PARC) {
      const texte = await outil(nom).executer(ctx, {});
      expect(texte, nom).not.toContain(toutRetire.motif);
    }
    const liste = await outil("equipements").executer(ctx, {});
    expect(lignes(liste)).toContain("1 équipement(s) déclaré(s) en service, 1 retiré(s) du parc.");
    const ficheTexte = await outil("fiche_etablissement").executer(ctx, {});
    expect(lignes(ficheTexte)).toContain("Équipements déclarés en service : 1 (1 retiré(s) du parc)");
  });

  it("parc entièrement retiré : compte comme non déclaré, avec la phrase des retirés", async () => {
    parc([appareil(false)]);
    for (const nom of OUTILS_DU_PARC) {
      const texte = await outil(nom).executer(ctx, {});
      expect(texte, nom).toContain(toutRetire.motif);
      expect(texte, nom).toContain(toutRetire.consequence);
    }
    const ficheTexte = await outil("fiche_etablissement").executer(ctx, {});
    expect(lignes(ficheTexte)).toContain("Équipements déclarés en service : 0 (1 retiré(s) du parc)");
    const liste = await outil("equipements").executer(ctx, {});
    expect(lignes(liste)).toContain("0 équipement(s) déclaré(s) en service, 1 retiré(s) du parc.");
    expect(liste).toContain("Ancien extincteur — extincteur · retiré du parc");
  });

  it("tenancy : chaque lecture du parc porte l'établissement du jeton, et lui seul", async () => {
    await getParcEquipements(await db(), ETABLISSEMENT_ID);
    expect(prismaMock.equipement.findMany).toHaveBeenCalledWith({
      where: { etablissementId: ETABLISSEMENT_ID },
      select: { actif: true },
    });

    parc([appareil(true), appareil(false)]);
    prismaMock.equipement.findMany.mockClear();
    prismaMock.etablissement.findUnique.mockClear();
    for (const nom of OUTILS_DU_PARC) {
      // Un client qui glisse un autre établissement est refusé par le schéma
      // strict ; l'outil, lui, ne lit que la portée du contexte.
      expect(outil(nom).schema.safeParse({ etablissementId: AUTRE_ETABLISSEMENT }).success).toBe(false);
      await outil(nom).executer(ctx, {});
    }
    // TOUTES les clauses `where` qui lisent le parc — la liste des équipements,
    // et la fiche qui le compte dans sa propre requête —, pas un échantillon.
    const parEquipement = prismaMock.equipement.findMany.mock.calls.map(
      (appel) => (appel[0] as { where: unknown }).where,
    );
    const parEtablissement = prismaMock.etablissement.findUnique.mock.calls.map(
      (appel) => (appel[0] as { where: unknown }).where,
    );
    expect(parEquipement.length).toBeGreaterThan(0);
    expect(parEtablissement.length).toBeGreaterThan(0);
    for (const where of parEquipement) {
      expect(where).toEqual({ etablissementId: ETABLISSEMENT_ID });
    }
    for (const where of parEtablissement) {
      expect(where).toEqual({ id: ETABLISSEMENT_ID });
    }
  });
});
