import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Les lectures du calendrier décident de ce que l'utilisateur voit — et,
 * jusqu'ici, de ce qu'il ne voyait pas. Deux défauts sont couverts ici :
 *
 *  - la liste mensuelle et la grille ne montraient pas le même ensemble
 *    (la liste embarquait tout l'historique réalisé et n'avait aucune
 *    borne haute, la grille écartait le réalisé et s'arrêtait à deux ans) ;
 *  - « urgents » retenait toutes les occurrences `a_planifier`, y compris
 *    celles dont l'échéance n'était pas atteinte, et laissait sortir les
 *    occurrences planifiées dépassées.
 *
 * On teste les **clauses envoyées à la base**, pas la base : c'est là que
 * vit la règle. Le prisma est donc mocké, et l'horloge figée — sans quoi
 * les bornes de jour civil seraient irreproductibles.
 */

const { prismaMock, requireUserMock } = vi.hoisted(() => ({
  prismaMock: {
    verification: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    etablissement: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
  requireUserMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
  getOptionalUser: vi.fn(),
}));

import { REFERENTIEL_VERSION } from "@/lib/referentiels/conformite";
import {
  calendrierDesynchronise,
  compterEtatCalendrier,
  getVerification,
  grouperParMois,
  listerVerifications,
  type VerificationListee,
} from "./queries";

/** 10 août 2026, 9 h à Paris (07:00 UTC). */
const NOW = new Date("2026-08-10T07:00:00Z");
/** Minuit civil de Paris ce jour-là : 09/08 22:00 UTC. */
const DEBUT_DU_JOUR = new Date("2026-08-09T22:00:00Z");
/** Date civile telle que Prisma la rend. */
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  prismaMock.verification.findMany.mockClear().mockResolvedValue([]);
  prismaMock.verification.findFirst.mockClear().mockResolvedValue(null);
  prismaMock.etablissement.findFirst.mockClear().mockResolvedValue(null);
  requireUserMock.mockResolvedValue({ id: "user-1" });
});

afterEach(() => {
  vi.useRealTimers();
});

const dernierWhere = () =>
  prismaMock.verification.findMany.mock.calls.at(-1)![0].where;

/**
 * Les conditions du dernier `where`, à plat.
 *
 * Depuis que les conditions indépendantes sont composées par
 * `toutesLesConditions` (et non diffusées dans un littéral, où deux `OR`
 * s'écrasaient), une clause peut vivre à la racine ou dans le `AND`. On la
 * cherche donc dans les deux — sans **fusionner** les membres, ce qui
 * recréerait dans le test l'écrasement même que le composeur supprime.
 */
const clausesDe = (where: Record<string, unknown>): Record<string, unknown>[] => {
  const { AND, ...racine } = where as { AND?: Record<string, unknown>[] };
  return [racine, ...(AND ?? [])].filter((c) => Object.keys(c).length > 0);
};

/** La première condition du dernier `where` qui porte cette clé. */
const clause = (cle: string) =>
  clausesDe(dernierWhere()).find((c) => cle in c) as
    | Record<string, never>
    | undefined;

describe("listerVerifications — lecture documentaire par défaut", () => {
  it("ne pose aucune borne : les PDF ont besoin de tout l'historique", async () => {
    await listerVerifications("etab-1");
    const where = dernierWhere();
    expect(where).toEqual({
      etablissementId: "etab-1",
      etablissement: { entreprise: { userId: "user-1" } },
    });
  });

  it("scope toujours la lecture sur l'entreprise du user", async () => {
    await listerVerifications("etab-1", { urgentsSeulement: true });
    expect(clause("etablissement")?.etablissement).toEqual({
      entreprise: { userId: "user-1" },
    });
  });
});

describe("listerVerifications — filtre « urgents »", () => {
  it("retient le retard réel, pas le statut", async () => {
    await listerVerifications("etab-1", { urgentsSeulement: true });
    const urgence = clause("dateRealisee")!;
    // Une occurrence réalisée n'est jamais urgente, quel que soit son statut.
    expect(urgence.dateRealisee).toBeNull();
    expect(urgence.OR).toEqual([
      { statut: "depassee" },
      {
        statut: { in: ["planifiee", "a_planifier"] },
        datePrevue: { lt: DEBUT_DU_JOUR },
      },
    ]);
  });

  /**
   * Le défaut que ce test verrouille était invisible aux trois au-dessus,
   * et c'est ce qui le rend intéressant : chacun d'eux vérifiait **une**
   * clause, jamais deux ensemble. Or la portée par bâtiment et l'urgence
   * posent toutes deux la clé `OR` ; diffusées dans le même littéral, la
   * seconde écrasait la première, et le filtre par bâtiment disparaissait
   * du `where` sous « en retard seulement ».
   *
   * À l'écran : l'en-tête comptait sur le bâtiment — `compterEtatCalendrier`
   * n'a pas de condition d'urgence, donc pas de collision — pendant que la
   * liste dessous montrait l'établissement entier. Deux nombres qui se
   * contredisent, aucun signalé comme faux.
   */
  it("garde le filtre par bâtiment quand « urgents » est actif", async () => {
    await listerVerifications("etab-1", {
      urgentsSeulement: true,
      batimentId: "bat-1",
    });

    const portee = clausesDe(dernierWhere()).find((c) =>
      JSON.stringify(c).includes("batimentId"),
    );
    expect(
      portee,
      "Le filtre par bâtiment a disparu du `where` : une condition indépendante en a écrasé une autre (cf. `toutesLesConditions`).",
    ).toBeDefined();
    // Et il porte bien la forme qui laisse passer les échéances sans lieu.
    expect(portee!.OR).toEqual([
      { equipementId: null },
      { equipement: { batimentId: "bat-1" } },
    ]);

    // L'urgence est toujours là : on ne troque pas un écrasement contre l'autre.
    expect(clause("dateRealisee")).toBeDefined();
  });

  it("borne le retard au début du jour civil, pas à l'heure courante", async () => {
    await listerVerifications("etab-1", { urgentsSeulement: true });
    const borne = (clause("dateRealisee")!.OR as { datePrevue: { lt: Date } }[])[1]
      .datePrevue.lt;
    // Une occurrence datée d'aujourd'hui (stockée à 00:00 UTC, soit 02:00
    // à Paris) est postérieure à cette borne : elle n'est pas urgente.
    expect(jour("2026-08-10").getTime()).toBeGreaterThan(borne.getTime());
    expect(jour("2026-08-09").getTime()).toBeLessThan(borne.getTime());
  });
});

describe("compterEtatCalendrier", () => {
  const verif = (
    statut: string,
    datePrevue: string,
    dateRealisee: string | null = null,
    /** Le porteur (ADR-023) : `null` = équipement ou établissement. */
    salarieId: string | null = null,
  ) => ({
    statut,
    datePrevue: jour(datePrevue),
    dateRealisee: dateRealisee ? jour(dateRealisee) : null,
    salarieId,
  });

  it("partitionne en quatre ensembles disjoints", async () => {
    prismaMock.verification.findMany.mockResolvedValue([
      // En retard : la date décide, pas le statut (ADR-011).
      verif("a_planifier", "2026-08-01"),
      verif("planifiee", "2026-07-15"),
      verif("depassee", "2026-06-01"),
      // À planifier : pas encore dépassée.
      verif("a_planifier", "2026-09-30"),
      // À venir : dans l'horizon proche.
      verif("planifiee", "2026-08-10"),
      verif("planifiee", "2026-09-09"),
      // Hors horizon : ni retard, ni engagement de la période.
      verif("planifiee", "2026-12-01"),
      // Historique.
      verif("realisee_conforme", "2026-02-01", "2026-02-03"),
      verif("realisee_conforme", "2025-02-01", "2025-02-03"),
    ]);

    const etat = await compterEtatCalendrier("etab-1", NOW);
    expect(etat).toEqual({
      enRetard: 3,
      aPlanifier: 1,
      aVenir: 2,
      realisees12m: 1,
      enRetardParType: { verification: 3, "titre-salarie": 0 },
      aVenirParType: { verification: 2, "titre-salarie": 0 },
      toutesParType: { verification: 9, "titre-salarie": 0 },
    });
  });

  it("ventile les mêmes lignes par nature, selon leur porteur", async () => {
    // Le total ne bouge pas, sa ventilation si — c'est toute la promesse
    // du rattachement de la famille « personnel » (ADR-016, ADR-023).
    prismaMock.verification.findMany.mockResolvedValue([
      verif("depassee", "2026-06-01"),
      verif("depassee", "2026-06-01", null, "sal-1"),
      verif("planifiee", "2026-08-10", null, "sal-2"),
    ]);

    const etat = await compterEtatCalendrier("etab-1", NOW);
    expect(etat.enRetard).toBe(2);
    expect(etat.enRetardParType).toEqual({
      verification: 1,
      "titre-salarie": 1,
    });
    expect(etat.aVenirParType).toEqual({
      verification: 0,
      "titre-salarie": 1,
    });
    expect(etat.toutesParType).toEqual({
      verification: 1,
      "titre-salarie": 2,
    });
  });

  it("ne compte pas deux fois une occurrence à planifier et dépassée", async () => {
    prismaMock.verification.findMany.mockResolvedValue([
      verif("a_planifier", "2026-08-01"),
    ]);
    const etat = await compterEtatCalendrier("etab-1", NOW);
    expect(etat.enRetard).toBe(1);
    expect(etat.aPlanifier).toBe(0);
  });

  it("laisse sa journée à une échéance du jour", async () => {
    prismaMock.verification.findMany.mockResolvedValue([
      verif("planifiee", "2026-08-10"),
    ]);
    const etat = await compterEtatCalendrier("etab-1", NOW);
    expect(etat.enRetard).toBe(0);
    expect(etat.aVenir).toBe(1);
  });

  it("ne tient pas pour en retard une occurrence déjà réalisée", async () => {
    prismaMock.verification.findMany.mockResolvedValue([
      verif("depassee", "2026-01-01", "2026-01-15"),
    ]);
    const etat = await compterEtatCalendrier("etab-1", NOW);
    expect(etat.enRetard).toBe(0);
    expect(etat.realisees12m).toBe(1);
  });
});

describe("grouperParMois", () => {
  it("range chaque occurrence dans son mois civil de Paris", () => {
    const ligne = (id: string, d: Date) =>
      ({ id, datePrevue: d }) as unknown as VerificationListee;
    const map = grouperParMois([
      ligne("a", jour("2026-08-01")),
      ligne("b", jour("2026-08-31")),
      // 31 août 23:30 à Paris : l'heure UTC est déjà le 31 à 21:30, mais
      // une clé calculée en UTC sur un horodatage du soir d'hiver basculerait
      // au mois suivant.
      ligne("c", new Date("2026-08-31T21:30:00Z")),
      ligne("d", jour("2026-09-01")),
    ]);
    expect([...map.keys()]).toEqual(["2026-08", "2026-09"]);
    expect(map.get("2026-08")).toHaveLength(3);
  });
});

/**
 * Le cloisonnement des trois autres lectures du fichier (ADR-005).
 *
 * `listerVerifications` avait le sien depuis toujours ; `compterEtatCalendrier`,
 * `getVerification` et `calendrierDesynchronise` ne l'avaient pas — leur
 * `entreprise: { userId }` pouvait être retiré sans qu'aucun test ne bouge,
 * alors que ce sont les trois lectures qui alimentent l'en-tête du calendrier,
 * la fiche d'une échéance et le déclencheur de régénération.
 *
 * Comme au-dessus : on éprouve la **clause envoyée**, parce que c'est là que
 * vit la règle. Aucune RLS ne la rattrape en base.
 */
describe("cloisonnement des lectures par entreprise (ADR-005)", () => {
  it("compterEtatCalendrier scope sur l'entreprise du user", async () => {
    await compterEtatCalendrier("etab-1", NOW);
    expect(clause("etablissement")?.etablissement).toEqual({
      entreprise: { userId: "user-1" },
    });
  });

  it("compterEtatCalendrier garde le scope sous filtre par bâtiment", async () => {
    // Deux conditions indépendantes, dont l'une pose un `OR` : c'est
    // exactement la collision qui a fait disparaître le filtre par bâtiment
    // de `listerVerifications`. Le scope ne doit pas s'y perdre non plus.
    await compterEtatCalendrier("etab-1", NOW, { batimentId: "bat-1" });
    expect(clause("etablissement")?.etablissement).toEqual({
      entreprise: { userId: "user-1" },
    });
    expect(
      clausesDe(dernierWhere()).find((c) =>
        JSON.stringify(c).includes("batimentId"),
      ),
    ).toBeDefined();
  });

  it("getVerification scope sur l'entreprise du user", async () => {
    await getVerification("verif-1");
    expect(
      prismaMock.verification.findFirst.mock.calls.at(-1)![0].where,
    ).toEqual({
      id: "verif-1",
      etablissement: { entreprise: { userId: "user-1" } },
    });
  });

  it("getVerification ne rend rien pour la vérification d'un autre client", async () => {
    // La base ne renvoie rien parce que la clause l'exclut : la fonction rend
    // `null`, et l'appelant fait son 404. Sans la clause, elle rendrait la
    // fiche du dossier d'en face.
    prismaMock.verification.findFirst.mockResolvedValue(null);
    expect(await getVerification("verif-d-un-autre")).toBeNull();
  });

  it("calendrierDesynchronise scope sur l'entreprise du user", async () => {
    await calendrierDesynchronise("etab-1");
    expect(
      prismaMock.etablissement.findFirst.mock.calls.at(-1)![0].where,
    ).toEqual({ id: "etab-1", entreprise: { userId: "user-1" } });
  });
});

describe("calendrierDesynchronise — la comparaison de version", () => {
  it("dit « désynchronisé » quand la version en base est antérieure", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue({
      referentielVersionCalendrier: "2000-01-01.1",
    });
    expect(await calendrierDesynchronise("etab-1")).toBe(true);
  });

  it("dit « désynchronisé » quand aucune version n'a jamais été écrite", async () => {
    // `null` = jamais réconcilié depuis l'introduction du mécanisme. Ces
    // établissements sont rattrapés au premier affichage ; les tenir pour à
    // jour les laisserait avec un calendrier vide indéfiniment.
    prismaMock.etablissement.findFirst.mockResolvedValue({
      referentielVersionCalendrier: null,
    });
    expect(await calendrierDesynchronise("etab-1")).toBe(true);
  });

  it("dit « à jour » quand la version en base est la version courante", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue({
      referentielVersionCalendrier: REFERENTIEL_VERSION,
    });
    expect(await calendrierDesynchronise("etab-1")).toBe(false);
  });

  it("ne relance pas la régénération sur un établissement introuvable", async () => {
    // Introuvable, ici, veut dire « pas au user » aussi bien que « supprimé ».
    // Rendre `true` ferait boucler la page sur une régénération qui échouera.
    prismaMock.etablissement.findFirst.mockResolvedValue(null);
    expect(await calendrierDesynchronise("etab-inconnu")).toBe(false);
  });
});
