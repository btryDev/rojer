// La charge affichée sur une carte-bâtiment du hero.
//
// `listerBatimentsAvecCharge` ouvre la base ; ce qu'on vérifie ici est la
// seule chose qui pourrait diverger silencieusement : que le comptage passe
// bien par `repartirVerifications`, donc par les prédicats canoniques
// (ADR-011), et non par une septième définition maison du retard.
//
// Le cas qui a motivé ce test : une échéance datée d'AUJOURD'HUI n'est jamais
// en retard — le retard commence à minuit, heure de Paris, le lendemain. Une
// comparaison naïve `datePrevue < now` la compte en retard dès 00h01, et la
// carte annonce « 1 à traiter » à quelqu'un qui a toute sa journée.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { repartirVerifications } from "@/lib/pdf/etat-verifications";

const h = vi.hoisted(() => {
  const db = {
    batiments: [] as Array<Record<string, unknown>>,
    verifs: [] as Array<Record<string, unknown>>,
    requetes: [] as unknown[],
  };
  const prisma = {
    batiment: { findMany: async () => db.batiments },
    verification: {
      findMany: async (args: unknown) => {
        db.requetes.push(args);
        return db.verifs;
      },
    },
  };
  return { db, prisma, requireUser: vi.fn(async () => ({ id: "user-1" })) };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: h.requireUser }));

const { listerBatimentsAvecCharge } = await import("./queries");

const NOW = new Date("2026-08-21T14:30:00+02:00");

function verif(datePrevue: string, statut = "planifiee") {
  return {
    statut,
    datePrevue: new Date(datePrevue),
    dateRealisee: null,
    derniereRealisation: null,
    // `null` = ligne ouverte, ce qu'est toute ligne de ce bloc. L'archivage
    // se lisait dans un préfixe de libellé ; il a sa colonne depuis l'ADR-034,
    // et les prédicats ne regardent plus qu'elle.
    archiveLe: null,
    libelleObligation: "Vérification périodique",
  };
}

describe("charge d'un bâtiment", () => {
  it("ne compte pas en retard une échéance du jour même", () => {
    const etat = repartirVerifications([verif("2026-08-21T00:00:00+02:00")], NOW);
    expect(etat.enRetard).toHaveLength(0);
  });

  it("compte en retard l'échéance de la veille", () => {
    const etat = repartirVerifications([verif("2026-08-20T00:00:00+02:00")], NOW);
    expect(etat.enRetard).toHaveLength(1);
  });

  it("ne compte pas une occurrence déjà réalisée", () => {
    const etat = repartirVerifications(
      [
        {
          statut: "realisee_conforme",
          datePrevue: new Date("2026-07-01T00:00:00+02:00"),
          dateRealisee: new Date("2026-07-02T00:00:00+02:00"),
          derniereRealisation: null,
          archiveLe: null,
          libelleObligation: "Vérification périodique",
        },
      ],
      NOW,
    );
    expect(etat.enRetard).toHaveLength(0);
  });

  it("range dans « sous 30 jours » ce qui tombe dans l'horizon proche", () => {
    const etat = repartirVerifications([verif("2026-09-10T00:00:00+02:00")], NOW);
    expect(etat.aVenir).toHaveLength(1);
    expect(etat.enRetard).toHaveLength(0);
  });

  it("laisse hors des deux compteurs une échéance lointaine", () => {
    // Ni un retard, ni un engagement de la période : la carte n'en dit rien.
    const etat = repartirVerifications([verif("2027-03-01T00:00:00+01:00")], NOW);
    expect(etat.enRetard).toHaveLength(0);
    expect(etat.aVenir).toHaveLength(0);
  });

  it("répartit sans double compte — les ensembles sont disjoints", () => {
    const etat = repartirVerifications(
      [
        verif("2026-08-20T00:00:00+02:00"),
        verif("2026-09-10T00:00:00+02:00"),
        verif("2026-08-21T00:00:00+02:00"),
      ],
      NOW,
    );
    const somme =
      etat.enRetard.length +
      etat.aPlanifier.length +
      etat.aVenir.length +
      etat.realisees12m.length;
    expect(somme).toBe(etat.total);
  });
});


/**
 * La composition, et pas seulement le prédicat.
 *
 * Ce qui manquait au fichier : les cas ci-dessus éprouvent
 * `repartirVerifications`, déjà couvert ailleurs. Le défaut qu'ils ne
 * pouvaient pas voir vit **entre** la requête et lui — un `select` qui
 * n'emporte pas de quoi reconnaître une ligne archivée, un regroupement qui
 * perd ou double une occurrence. C'est là que deux écrans se mettent à
 * annoncer deux nombres.
 */
describe("listerBatimentsAvecCharge", () => {
  const RESERVE = "b-reserve";
  const PRINCIPAL = "b-principal";

  /**
   * Une ligne du parc. Les variantes passent par un objet d'options plutôt
   * que par des positions : le libellé n'est plus ce qui porte l'archivage
   * (ADR-034), et une liste d'arguments positionnels dont le troisième
   * signifiait tantôt un texte tantôt un état est ce qui a rendu l'ancien
   * marqueur si facile à oublier.
   */
  const ligne = (
    batimentId: string,
    datePrevue: string,
    o: {
      statut?: string;
      /** Le jour où l'obligation a cessé de s'appliquer. */
      archiveLe?: string;
      /** La colonne gelée (ADR-034), que plus aucun prédicat ne lit. */
      dateRealisee?: string;
      actif?: boolean;
    } = {},
  ) => ({
    statut: o.statut ?? "planifiee",
    datePrevue: new Date(datePrevue),
    dateRealisee: o.dateRealisee ? new Date(o.dateRealisee) : null,
    archiveLe: o.archiveLe ? new Date(o.archiveLe) : null,
    libelleObligation: "Vérification annuelle",
    equipement: { batimentId, actif: o.actif ?? true },
  });

  /** Une échéance que personne ne porte dans une zone : l'établissement
   *  lui-même, ou un salarié (ADR-022, ADR-023). */
  const ligneSansEquipement = (datePrevue: string) => ({
    statut: "planifiee",
    datePrevue: new Date(datePrevue),
    dateRealisee: null,
    archiveLe: null,
    libelleObligation: "Contrôle annuel des installations d'aération",
    equipement: null,
  });

  beforeEach(() => {
    h.db.requetes = [];
    h.db.batiments = [
      { id: PRINCIPAL, nom: "Bâtiment principal", complementAdresse: null, ordre: 0, _count: { equipements: 4 } },
      { id: RESERVE, nom: "Réserve", complementAdresse: null, ordre: 1, _count: { equipements: 1 } },
    ];
    h.db.verifs = [];
  });

  it("ventile les retards par bâtiment sans en perdre ni en doubler", async () => {
    h.db.verifs = [
      ligne(PRINCIPAL, "2026-08-20T00:00:00+02:00"),
      ligne(PRINCIPAL, "2026-08-19T00:00:00+02:00"),
      ligne(RESERVE, "2026-08-18T00:00:00+02:00"),
      ligne(RESERVE, "2026-09-10T00:00:00+02:00"),
    ];

    const charge = await listerBatimentsAvecCharge("etab-1", NOW);
    const parId = new Map(charge.map((b) => [b.id, b.nbEnRetard]));

    expect(parId.get(PRINCIPAL)).toBe(2);
    expect(parId.get(RESERVE)).toBe(1);
    // La somme des cartes est le nombre de l'établissement : c'est l'égalité
    // que le hero met côte à côte, et c'est elle qui doit tenir.
    const somme = charge.reduce((n, b) => n + b.nbEnRetard, 0);
    const toutes = h.db.verifs as unknown as Array<{
      statut: string;
      datePrevue: Date;
      dateRealisee: Date | null;
      archiveLe: Date | null;
      libelleObligation: string;
    }>;
    expect(somme).toBe(
      repartirVerifications(
        toutes.map((v) => ({ ...v, derniereRealisation: null })),
        NOW,
      ).enRetard.length,
    );
  });

  /**
   * L'ARCHIVAGE EST UN CHAMP, ET LA PASTILLE DOIT LE LIRE (ADR-034, lot N3).
   *
   * Le cas est celui d'une ligne où TOUT dit « en retard » sauf le seul fait
   * qui compte. Son statut est gelé sur `depassee` — l'enum Prisma n'a pas de
   * valeur `archivee`, la ligne reste donc figée dans son dernier état connu —
   * et sa `datePrevue` est passée. Un compteur qui ne regarde pas `archiveLe`
   * annonce donc un retard à perpétuité sur une obligation éteinte.
   */
  it("une ligne archivée ne pèse sur aucune carte, même gelée sur « dépassée »", async () => {
    h.db.verifs = [
      ligne(RESERVE, "2026-08-18T00:00:00+02:00", {
        statut: "depassee",
        archiveLe: "2026-08-19T00:00:00+02:00",
      }),
    ];

    const charge = await listerBatimentsAvecCharge("etab-1", NOW);

    expect(charge.find((b) => b.id === RESERVE)?.nbEnRetard).toBe(0);
    // Et pas davantage ailleurs : une exclusion qui déplacerait la ligne d'une
    // zone à l'autre passerait la ligne du dessus.
    expect(charge.reduce((n, b) => n + b.nbEnRetard, 0)).toBe(0);
  });

  it("emporte `archiveLe` dans le `select`, sans quoi la carte est aveugle", async () => {
    // La garde d'à côté ne peut pas voir ce manque : le magasin simulé rend la
    // ligne entière quel que soit le `select`. En base, un champ non
    // sélectionné arrive `undefined`, et `undefined !== null` — chaque ligne
    // serait alors lue comme archivée, et toutes les pastilles tomberaient à
    // zéro. C'est l'inverse exact du défaut d'origine, et tout aussi muet.
    await listerBatimentsAvecCharge("etab-1", NOW);

    const args = h.db.requetes[0] as { select: Record<string, unknown> };
    expect(
      args.select.archiveLe,
      "sans ce champ, la carte ne peut pas reconnaître une ligne archivée",
    ).toBe(true);
  });

  /**
   * LE PENDANT : CE QUI A ROULÉ RESTE DÛ.
   *
   * Depuis l'ADR-034 la ligne ne porte QUE son échéance ouverte : au dépôt d'un
   * rapport elle roule, garde un statut vivant et reçoit la date suivante. Un
   * contrôle passé ne la met donc pas à l'abri — c'est le défaut du lot 3 bis,
   * où `dateRealisee` suffisait à sortir des comptes une ligne dont l'échéance
   * suivante était pourtant dépassée. La colonne est ici renseignée exprès :
   * elle est gelée, et plus aucun prédicat ne doit s'y arrêter.
   */
  it("une ligne roulée dont l'échéance ouverte est passée pèse bien sur sa carte", async () => {
    h.db.verifs = [
      ligne(PRINCIPAL, "2026-08-19T00:00:00+02:00", {
        dateRealisee: "2026-02-01T00:00:00+01:00",
      }),
    ];

    const charge = await listerBatimentsAvecCharge("etab-1", NOW);

    expect(charge.find((b) => b.id === PRINCIPAL)?.nbEnRetard).toBe(1);
  });

  it("un bâtiment sans occurrence est à jour, pas absent", async () => {
    h.db.verifs = [ligne(PRINCIPAL, "2026-08-20T00:00:00+02:00")];

    const charge = await listerBatimentsAvecCharge("etab-1", NOW);

    expect(charge.map((b) => b.id)).toEqual([PRINCIPAL, RESERVE]);
    expect(charge.find((b) => b.id === RESERVE)?.nbEnRetard).toBe(0);
  });

  it("borne la lecture au dossier du user", async () => {
    // Sans RLS (ADR-005), l'isolation est applicative : une lecture qui ne
    // porte pas le prédicat d'appartenance est une convention rompue.
    await listerBatimentsAvecCharge("etab-1", NOW);

    const args = h.db.requetes[0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({
      etablissementId: "etab-1",
      etablissement: { entreprise: { userId: "user-1" } },
    });
  });

  /**
   * LA LECTURE NE DOIT PLUS ÉCARTER EN SQL CE QUE LE REGROUPEMENT ÉCARTE.
   *
   * Le `where` portait `equipement: { actif: true }`, c'est-à-dire une
   * jointure interne : les échéances d'établissement et de salarié
   * n'atteignaient jamais le TypeScript. Deux gardes disaient la même chose,
   * et une seule était atteignable par un test.
   *
   * L'exclusion vit désormais dans `grouperChargeParBatiment` — seule forme
   * qu'on puisse SONDER en lui passant une ligne de chaque porteur, ce dont
   * dépend la phrase affichée sous la plaque des zones
   * (`perimetre/porteurs-comptes.ts`). Remettre la jointure ici ne changerait
   * aucun chiffre affiché, et rendrait la sonde menteuse : elle mesurerait une
   * fonction que la donnée réelle n'atteint plus.
   */
  it("ramène les lignes sans équipement, pour que ce soit le code qui les écarte", async () => {
    await listerBatimentsAvecCharge("etab-1", NOW);

    const args = h.db.requetes[0] as {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    };
    expect(
      args.where.equipement,
      "une jointure interne ici rendrait l'exclusion insondable",
    ).toBeUndefined();
    expect(args.select.equipement).toMatchObject({
      select: { batimentId: true, actif: true },
    });
  });

  it("une échéance sans équipement ne pèse sur aucune carte", async () => {
    // Elle n'est dans aucune zone : la compter dans chacune gonflerait
    // autant de pastilles qu'il y a de volumes, dans une seule serait
    // arbitraire. Elle reste lisible au calendrier, et le relevé
    // « Dépassées » du hero la compte.
    h.db.verifs = [
      ligne(PRINCIPAL, "2026-08-20T00:00:00+02:00"),
      ligneSansEquipement("2026-08-18T00:00:00+02:00"),
    ];

    const charge = await listerBatimentsAvecCharge("etab-1", NOW);

    expect(charge.reduce((n, b) => n + b.nbEnRetard, 0)).toBe(1);
  });

  it("un appareil retiré du parc ne pèse sur aucune carte", async () => {
    // ADR-012 : la ligne survit au retrait quand elle porte une preuve, elle
    // ne réclame plus rien pour autant.
    h.db.verifs = [
      ligne(PRINCIPAL, "2026-08-20T00:00:00+02:00", { actif: false }),
    ];

    const charge = await listerBatimentsAvecCharge("etab-1", NOW);

    expect(charge.find((b) => b.id === PRINCIPAL)?.nbEnRetard).toBe(0);
  });
});
