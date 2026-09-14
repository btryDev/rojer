// Lectures du tableau de bord — tests sur une base Prisma simulée.
//
// Ce qui se joue ici ne peut pas se tester sur les fonctions pures : les
// bugs les plus coûteux du board étaient dans les **clauses `where`**. La
// requête qui alimentait le moteur de recommandations prenait les trente
// plus anciennes `datePrevue` sans filtrer les occurrences déjà réalisées ;
// or celles-ci sont conservées à vie (le registre de sécurité en dépend).
// Au bout de deux ans d'usage, ces trente lignes étaient toutes des
// vérifications archivées : le board annonçait « rien à traiter » à côté
// d'un compteur affichant douze retards.
//
// Le magasin simulé ci-dessous n'implémente que les formes de `where`
// réellement utilisées par le module — assez pour que le filtre soit
// vraiment exercé, et pas assez pour devenir un second Prisma.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ajouterJours, instantCivil } from "@/lib/dates";

/** 10 août 2026, 08:00 heure de Paris — le matin, moment où les règles de
 *  retard comparées à `now` brut basculaient à tort. */
const NOW = instantCivil(2026, 8, 10, 8);
/** Le jour civil courant, à minuit : les échéances sont stockées ainsi. */
const AUJOURDHUI = instantCivil(2026, 8, 10);

const jour = (n: number) => ajouterJours(AUJOURDHUI, n);

type LigneVerif = {
  id: string;
  etablissementId: string;
  equipementId: string;
  statut: string;
  datePrevue: Date;
  /** Le rythme. Le magasin simulé rend la ligne entière, non typée : l'oubli
   *  ici ne compile pas moins — il se lit `undefined`, et c'est la règle qui
   *  doit y résister (`estVerificationRealisee`), pas la fixture. */
  periodicite: string;
  /** `null` = ligne ouverte (ADR-034). */
  archiveLe: Date | null;
  libelleObligation: string;
  /** Les rapports de la ligne (ADR-034), pour la jointure « dernière
   *  réalisation » et les clauses `rapports: { some }`. */
  rapports?: { dateRapport: Date; resultat: string }[];
};

type LigneAction = {
  id: string;
  etablissementId: string;
  statut: string;
  echeance: Date | null;
  libelle: string;
};

const h = vi.hoisted(() => {
  const db = {
    verifications: [] as Array<Record<string, unknown>>,
    actions: [] as Array<Record<string, unknown>>,
    duerp: null as Record<string, unknown> | null,
    nbEquipements: 0,
    nbRapports: 0,
  };

  /**
   * Comparateur minimal des clauses `where` du module : égalité simple,
   * `in`, bornes de date et `OR`. Les clés de portée (`etablissement`) sont
   * ignorées — l'isolation par utilisateur est testée ailleurs.
   */
  function correspond(
    ligne: Record<string, unknown>,
    where: Record<string, unknown>,
  ): boolean {
    for (const [cle, attendu] of Object.entries(where)) {
      if (cle === "etablissement" || cle === "verification") continue;
      if (cle === "OR") {
        const branches = attendu as Record<string, unknown>[];
        if (!branches.some((b) => correspond(ligne, b))) return false;
        continue;
      }
      // `rapports: { some: … }` (ADR-034) : lu sur les rapports que la ligne
      // factice porte. L'ignorer ferait passer toute ligne — un filtre
      // fantôme, que le matcher refuse d'être.
      if (cle === "rapports") {
        const { some, ...reste } = attendu as { some?: Record<string, unknown> };
        if (some === undefined || Object.keys(reste).length > 0) {
          throw new Error(`clause rapports non interprétée : ${JSON.stringify(attendu)}`);
        }
        const rapports = (ligne.rapports ?? []) as Record<string, unknown>[];
        if (!rapports.some((r) => correspond(r, some))) return false;
        continue;
      }
      const valeur = ligne[cle];
      if (attendu === null) {
        if (valeur !== null && valeur !== undefined) return false;
        continue;
      }
      if (attendu instanceof Date) {
        if ((valeur as Date | null)?.getTime() !== attendu.getTime()) return false;
        continue;
      }
      if (typeof attendu === "object") {
        const filtre = attendu as Record<string, unknown>;
        // Un opérateur que ce comparateur ne connaît pas serait un FILTRE
        // FANTÔME : `notIn` était ignoré jusqu'au 2026-09-13, et toute ligne le
        // passait. Refusé plutôt que deviné, comme `rapports` plus haut.
        const inconnus = Object.keys(filtre).filter(
          (k) => !["in", "notIn", "gte", "gt", "lte", "lt"].includes(k),
        );
        if (inconnus.length > 0) {
          throw new Error(`opérateur non interprété sur ${cle} : ${inconnus.join(", ")}`);
        }
        if ("in" in filtre) {
          if (!(filtre.in as unknown[]).includes(valeur)) return false;
        }
        if ("notIn" in filtre) {
          if ((filtre.notIn as unknown[]).includes(valeur)) return false;
        }
        for (const borne of ["gte", "gt", "lte", "lt"] as const) {
          if (!(borne in filtre)) continue;
          if (valeur === null || valeur === undefined) return false;
          const a = (valeur as Date).getTime();
          const b = (filtre[borne] as Date).getTime();
          if (borne === "gte" && !(a >= b)) return false;
          if (borne === "gt" && !(a > b)) return false;
          if (borne === "lte" && !(a <= b)) return false;
          if (borne === "lt" && !(a < b)) return false;
        }
        continue;
      }
      if (valeur !== attendu) return false;
    }
    return true;
  }

  const trier = (
    lignes: Record<string, unknown>[],
    orderBy?: Record<string, "asc" | "desc">,
  ) => {
    if (!orderBy) return lignes;
    const [cle, sens] = Object.entries(orderBy)[0];
    return [...lignes].sort((a, b) => {
      const va = (a[cle] as Date | null)?.getTime() ?? Infinity;
      const vb = (b[cle] as Date | null)?.getTime() ?? Infinity;
      return sens === "asc" ? va - vb : vb - va;
    });
  };

  const prisma = {
    verification: {
      findMany: async (args: {
        where: Record<string, unknown>;
        orderBy?: Record<string, "asc" | "desc">;
        take?: number;
        select?: { rapports?: { where?: Record<string, unknown> } };
      }) => {
        const out = trier(
          db.verifications.filter((v) => correspond(v, args.where)),
          args.orderBy,
        ).map((v) => ({
          ...v,
          equipement: { libelle: `Éq. ${v.equipementId}` },
          // La relation `rapports` sélectionnée AVEC SA CLAUSE (barres de
          // l'année) : la rendre brute ferait compter un rapport « non
          // vérifiable » comme un contrôle fait — un filtre fantôme de plus.
          ...(args.select?.rapports
            ? {
                rapports: ((v.rapports ?? []) as Record<string, unknown>[]).filter(
                  (r) => correspond(r, args.select!.rapports!.where ?? {}),
                ),
              }
            : {}),
        }));
        return args.take ? out.slice(0, args.take) : out;
      },
    },
    action: {
      findMany: async (args: {
        where: Record<string, unknown>;
        orderBy?: Record<string, "asc" | "desc">;
        take?: number;
      }) => {
        const out = trier(
          db.actions.filter((a) => correspond(a, args.where)),
          args.orderBy,
        );
        return args.take ? out.slice(0, args.take) : out;
      },
      count: async (args: { where: Record<string, unknown> }) =>
        db.actions.filter((a) => correspond(a, args.where)).length,
    },
    duerp: { findFirst: async () => db.duerp },
    equipement: { count: async () => db.nbEquipements },
    rapportVerification: {
      /**
       * Deux comptes passent par ici : le total des rapports du dossier, et
       * ceux de la fenêtre de douze mois (`rapports12m`). Le second porte des
       * clauses — il faut les HONORER, sinon les deux cartes afficheraient le
       * même chiffre dans les tests quoi qu'il arrive.
       */
      count: async (args?: { where?: Record<string, unknown> }) => {
        const where = args?.where ?? {};
        const { dateRapport, resultat } = where as {
          dateRapport?: { gte?: Date };
          resultat?: { in: string[] };
        };
        if (dateRapport === undefined && resultat === undefined) {
          return db.nbRapports;
        }
        return db.verifications
          .flatMap((v) => (v.rapports ?? []) as { dateRapport: Date; resultat: string }[])
          .filter(
            (r) =>
              (dateRapport?.gte === undefined ||
                r.dateRapport.getTime() >= dateRapport.gte.getTime()) &&
              (resultat === undefined || resultat.in.includes(r.resultat)),
          ).length;
      },
      /** La jointure « dernière réalisation » (ADR-034) : les rapports que
       *  portent les lignes factices, filtrés comme en base. */
      findMany: async (args: { where: Record<string, unknown> }) => {
        const { verificationId, ...reste } = args.where as {
          verificationId: { in: string[] };
        };
        return db.verifications
          .filter((v) => verificationId.in.includes(v.id as string))
          .flatMap((v) =>
            ((v.rapports ?? []) as Record<string, unknown>[]).map((r) => ({
              ...r,
              verificationId: v.id,
            })),
          )
          .filter((r) => correspond(r, reste));
      },
    },
  };

  return { db, prisma };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: "user-1" }),
}));
// Le rapprochement des transmissions (ADR-024) est testé chez lui, sur sa
// partie pure. Ici on ne veut que les agrégats du tableau de bord : le
// simuler évite de modéliser trois modèles Prisma de plus dans un faux qui
// n'a rien à en dire. Même raison que `compterActions` juste en dessous.
vi.mock("./transmissions", () => ({
  chargerTransmissions: async () => ({
    domainesSansPrestataire: [],
    obligationsSupposantUnePersonne: [],
  }),
}));
// Les états permanents sont testés chez eux — leur module a son propre
// passage de matching et ses propres gardes d'appartenance. Ici on ne veut
// que le terme d'indétermination qu'ils apportent au score, et le laisser à
// zéro décrit un dossier entièrement renseigné : les cas où il ne l'est pas
// sont éprouvés dans `score.test.ts`, sur la fonction pure.
vi.mock("@/lib/etats-permanents/queries", () => ({
  compterEtatsPermanents: async () => ({ total: 0, enPlace: 0 }),
}));
// `compterActions` est testé chez lui ; ici on ne veut que ses agrégats.
vi.mock("@/lib/actions/queries", () => ({
  compterActions: async () => ({
    ouvertes: 0,
    enCours: 0,
    enRetard: 0,
    leveesRecemment: 0,
    totalACouvrir: 0,
  }),
}));

import {
  compterObligationsParMois,
  compterVerifsParEquipement,
  getDashboardData,
} from "./queries";

const ETAB = "etab-1";

function verif(p: Partial<LigneVerif> & { id: string }): LigneVerif {
  return {
    etablissementId: ETAB,
    equipementId: "eq-1",
    statut: "planifiee",
    datePrevue: jour(10),
    periodicite: "annuelle",
    // Le magasin simulé ne sait pas projeter un `select` : il rend la ligne
    // entière. Sans cette valeur, `archiveLe` arriverait `undefined` aux
    // prédicats, qui testent `!== null` — chaque ligne du fichier serait alors
    // lue comme archivée, et tous les compteurs tomberaient à zéro en silence.
    archiveLe: null,
    libelleObligation: `Obligation ${p.id}`,
    ...p,
  };
}

function action(p: Partial<LigneAction> & { id: string }): LigneAction {
  return {
    etablissementId: ETAB,
    statut: "ouverte",
    echeance: null,
    libelle: `Action ${p.id}`,
    ...p,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  h.db.verifications = [];
  h.db.actions = [];
  h.db.duerp = null;
  h.db.nbEquipements = 3;
  h.db.nbRapports = 2;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getDashboardData — vérifications réalisées et archivées", () => {
  it("ne laisse pas 35 occurrences archivées masquer les retards", async () => {
    // Deux ans d'usage : 35 contrôles faits, dont les `datePrevue` sont les
    // plus anciennes de la table. L'ancienne requête (30 premières
    // `datePrevue`, aucun filtre) ne voyait qu'elles.
    for (let i = 0; i < 35; i += 1) {
      h.db.verifications.push(
        verif({
          id: `archive-${i}`,
          statut: "realisee_conforme",
          datePrevue: jour(-700 + i),
          // Consommées : c'est le sens de « contrôles faits » ici. En
          // « annuelle », trente-cinq rangées gelées à date passée seraient
          // trente-cinq retards — et ce test mesure l'ordre de la requête,
          // pas la règle du rythme.
          periodicite: "mise_en_service_uniquement",
        }),
      );
    }
    h.db.verifications.push(
      verif({ id: "r1", statut: "planifiee", datePrevue: jour(-40) }),
      verif({ id: "r2", statut: "planifiee", datePrevue: jour(-20) }),
      verif({ id: "r3", statut: "a_planifier", datePrevue: jour(-5) }),
    );

    const d = await getDashboardData(ETAB);

    expect(d.compteurs.verifsEnRetard).toBe(3);
    // Les archives sont hors fenêtre d'historique : elles ne gonflent rien.
    expect(d.compteurs.verifsRealisees12m).toBe(0);
    const retards = d.recommandations.filter((r) => r.kind === "verif_depassee");
    expect(retards.map((r) => r.titre)).toEqual([
      "Obligation r1",
      "Obligation r2",
      "Obligation r3",
    ]);
  });

  it("compte les réalisations de l'année sans les proposer comme à faire", async () => {
    h.db.verifications.push(
      verif({
        id: "faite",
        statut: "realisee_conforme",
        datePrevue: jour(-60),
        // Consommée : une réalisation qui ne laisse rien à faire. Périodique,
        // sa date passée la rangerait dans le retard, pas dans l'historique.
        periodicite: "mise_en_service_uniquement",
        // Le fait vit sur le rapport, seule source depuis le N5.
        rapports: [{ dateRapport: jour(-58), resultat: "conforme" }],
      }),
      verif({ id: "retard", statut: "planifiee", datePrevue: jour(-2) }),
    );

    const d = await getDashboardData(ETAB);
    expect(d.compteurs.verifsRealisees12m).toBe(1);
    expect(d.compteurs.verifsEnRetard).toBe(1);
    expect(d.recommandations.filter((r) => r.kind === "verif_depassee")).toHaveLength(
      1,
    );
  });

  it("« Rapports 12 m » compte les RAPPORTS déposés, pas les lignes couvertes", async () => {
    // Les deux comptes ont divergé avec l'ADR-034, et la carte du tableau de
    // bord parle de pièces : une ligne trimestrielle contrôlée quatre fois
    // dans l'année vaut quatre rapports, et une seule ligne au dénominateur du
    // score. Branchée sur le compte de lignes, la carte affichait « 0 » sur un
    // dossier dont le registre était plein.
    h.db.verifications.push(
      verif({
        id: "trimestrielle",
        statut: "planifiee",
        datePrevue: jour(-2),
        rapports: [
          { dateRapport: jour(-20), resultat: "conforme" },
          { dateRapport: jour(-110), resultat: "observations_mineures" },
          // Ni l'un ni l'autre ne compte : le premier n'atteste d'aucun
          // contrôle, le second est hors fenêtre.
          { dateRapport: jour(-5), resultat: "non_verifiable" },
          { dateRapport: jour(-400), resultat: "conforme" },
        ],
      }),
    );

    const d = await getDashboardData(ETAB);
    expect(d.compteurs.rapports12m).toBe(2);
    // La même ligne, elle, compte UNE fois — et comme un retard, puisque son
    // échéance ouverte est passée.
    expect(d.compteurs.verifsEnRetard).toBe(1);
    expect(d.compteurs.verifsRealisees12m).toBe(0);
  });

  it("compte les retards sur l'ensemble complet, même quand la file est tronquée", async () => {
    // Réflexe de `statsActionsEnRetard` : un compteur ne se calcule jamais
    // sur la liste coupée envoyée à l'affichage.
    for (let i = 0; i < 50; i += 1) {
      h.db.verifications.push(
        verif({ id: `v-${i}`, statut: "planifiee", datePrevue: jour(-i - 1) }),
      );
    }
    const d = await getDashboardData(ETAB);
    expect(d.compteurs.verifsEnRetard).toBe(50);
    expect(d.recommandations).toHaveLength(5);
    expect(d.recommandations.every((r) => r.kind === "verif_depassee")).toBe(true);
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ARCHIVAGE EST UN CHAMP, ET LES COMPTEURS DU BOARD LE LISENT (ADR-034, N3)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Les deux cas de ce bloc sont symétriques, et c'est ce qui les rend utiles
 * ensemble : l'un est une ligne que TOUT désigne comme un retard sauf le seul
 * fait qui compte, l'autre une ligne que son passé pourrait faire passer pour
 * réglée alors que son échéance ouverte est dépassée. Une garde qui ne tiendrait
 * que le premier se réparerait en excluant trop, et le second l'attrape.
 */
describe("getDashboardData — une rangée périodique gelée sur « réalisée » (d'avant l'ADR-034)", () => {
  it("compte en retard et se propose, le préfiltre SQL ne l'écarte plus", async () => {
    // LE BLOQUANT DES DEUX RELECTURES, vu depuis l'écran le plus lu : contrôle
    // fait il y a dix-huit mois, rendez-vous suivant dans `datePrevue`, passé
    // de six. Le préfiltre SQL ne retenait que les statuts ouverts : la ligne
    // disparaissait AVANT le classement, et un dossier en retard affichait
    // zéro. Mutation survivante du banc des corrections (2026-09-13).
    h.db.verifications.push(
      verif({
        id: "gelee",
        statut: "realisee_conforme",
        datePrevue: jour(-180),
      }),
      // Le témoin : la même ligne, consommée — sans rendez-vous suivant. Elle
      // ne réclame rien et ne doit pas passer la clause par sa branche
      // « périodique ».
      verif({
        id: "consommee",
        statut: "realisee_conforme",
        datePrevue: jour(-180),
        periodicite: "mise_en_service_uniquement",
      }),
    );

    const d = await getDashboardData(ETAB);

    expect(d.compteurs.verifsEnRetard).toBe(1);
    expect(
      d.recommandations.filter((r) => r.kind === "verif_depassee").map((r) => r.titre),
    ).toEqual(["Obligation gelee"]);
  });
});

describe("getDashboardData — l'archivage est un champ (ADR-034)", () => {
  it("une ligne archivée ne pèse sur aucun compteur, même gelée sur « dépassée »", async () => {
    // Son statut reste figé dans son dernier état connu — l'enum Prisma n'a pas
    // de valeur `archivee` — et sa date est passée depuis quarante jours. Elle
    // comptait donc un retard à perpétuité, et sa date étant la plus ancienne,
    // elle passait en tête de la file de propositions.
    h.db.verifications.push(
      verif({
        id: "eteinte",
        statut: "planifiee",
        datePrevue: jour(-40),
        archiveLe: jour(-3),
      }),
      verif({ id: "vivante", statut: "planifiee", datePrevue: jour(-10) }),
    );

    const d = await getDashboardData(ETAB);

    expect(d.compteurs.verifsEnRetard).toBe(1);
    // Ni rangée ailleurs : une ligne archivée sort des quatre ensembles, elle
    // ne se déplace pas de l'un à l'autre.
    expect(d.compteurs.verifsAPlanifier).toBe(0);
    expect(d.compteurs.verifsSous30j).toBe(0);
    expect(d.compteurs.verifsRealisees12m).toBe(0);
    // Et la file ne la propose pas : le moteur reçoit `archiveLe` et s'arrête
    // dessus, au lieu de titrer une carte sur une obligation éteinte. On filtre
    // sur le genre — le dossier de ce fichier n'a pas de DUERP, et l'amorce qui
    // le dit a toute sa place à côté.
    expect(
      d.recommandations
        .filter((r) => r.kind === "verif_depassee")
        .map((r) => r.titre),
    ).toEqual(["Obligation vivante"]);
  });

  it("une ligne roulée dont l'échéance ouverte est passée compte bien en retard", async () => {
    // Depuis l'ADR-034 la ligne ne porte QUE son échéance ouverte : au dépôt
    // d'un rapport elle roule, garde un statut vivant et reçoit la date
    // suivante — que celle-ci peut avoir dépassée à son tour. Le contrôle fait
    // vit sur le rapport, et ne met rien à l'abri : c'est le défaut du lot
    // 3 bis, où une ligne déjà contrôlée ne comptait plus en retard.
    h.db.verifications.push(
      verif({
        id: "roulee",
        statut: "planifiee",
        datePrevue: jour(-2),
        // La colonne gelée porte encore une date : c'est le cas d'une ligne
        // d'avant que la réconciliation n'a pas remise au modèle, que la
        // requête traite explicitement en repli. Elle est ici pour que le test
        // rougisse si un prédicat se remet à la lire — c'était la règle
        // d'hier, et elle taisait ce retard.
        rapports: [{ dateRapport: jour(-30), resultat: "conforme" }],
      }),
    );

    const d = await getDashboardData(ETAB);

    expect(d.compteurs.verifsEnRetard).toBe(1);
    // L'échéance ouverte prime : la ligne est comptée là, et nulle part
    // ailleurs — sans quoi elle diluerait le retard au dénominateur du score.
    expect(d.compteurs.verifsRealisees12m).toBe(0);
    // Le rapport, lui, reste un fait déposé et se compte comme tel.
    expect(d.compteurs.rapports12m).toBe(1);
    expect(
      d.recommandations.filter((r) => r.kind === "verif_depassee"),
    ).toHaveLength(1);
  });
});

describe("getDashboardData — le jour même de l'échéance", () => {
  it("ne déclare rien en retard le matin de l'échéance", async () => {
    h.db.verifications.push(
      verif({ id: "aujourdhui", statut: "planifiee", datePrevue: jour(0) }),
      verif({ id: "a-planifier", statut: "a_planifier", datePrevue: jour(0) }),
    );
    h.db.actions.push(action({ id: "a1", echeance: jour(0) }));

    const d = await getDashboardData(ETAB);
    expect(d.compteurs.verifsEnRetard).toBe(0);
    expect(d.compteurs.verifsAPlanifier).toBe(1);
    expect(d.compteurs.verifsSous30j).toBe(1);
    expect(d.compteurs.actionsEnRetard).toBe(0);
  });

  it("bascule le lendemain", async () => {
    h.db.verifications.push(
      verif({ id: "hier", statut: "planifiee", datePrevue: jour(-1) }),
    );
    h.db.actions.push(action({ id: "a1", echeance: jour(-1) }));

    const d = await getDashboardData(ETAB);
    expect(d.compteurs.verifsEnRetard).toBe(1);
    expect(d.compteurs.actionsEnRetard).toBe(1);
  });

  it("ne compte jamais deux fois une occurrence « à planifier » dépassée", async () => {
    h.db.verifications.push(
      verif({ id: "v", statut: "a_planifier", datePrevue: jour(-3) }),
    );
    const d = await getDashboardData(ETAB);
    expect(d.compteurs.verifsEnRetard).toBe(1);
    expect(d.compteurs.verifsAPlanifier).toBe(0);
  });
});

describe("getDashboardData — DUERP", () => {
  const duerpAvecVersion = (ageJours: number | null, effectif: number) => ({
    id: "duerp-1",
    referentielSecteurId: "restauration",
    versions:
      ageJours === null
        ? []
        : [{ numero: 1, createdAt: jour(-ageJours) }],
    etablissement: { entreprise: { effectif } },
  });

  it("distingue « aucune version validée » de « version trop ancienne »", async () => {
    h.db.duerp = duerpAvecVersion(null, 20);
    const d = await getDashboardData(ETAB);
    expect(d.duerp.existe).toBe(true);
    expect(d.duerp.ageJours).toBeNull();
    expect(d.duerp.estAJour).toBe(false);
    expect(d.duerp.etat.jamaisValide).toBe(true);
    expect(d.duerp.etat.majEchue).toBe(false);
    expect(
      d.recommandations.find((r) => r.kind === "duerp_a_jour")?.titre,
    ).toBe("Validez la première version de votre DUERP");
  });

  it("n'exige pas la mise à jour annuelle sous onze salariés (art. R. 4121-2)", async () => {
    h.db.duerp = duerpAvecVersion(400, 4);
    const d = await getDashboardData(ETAB);
    expect(d.duerp.estAJour).toBe(true);
    expect(d.recommandations.some((r) => r.kind === "duerp_a_jour")).toBe(false);
    expect(d.score.valeur).toBe(100);
  });

  it("l'exige à partir de onze salariés", async () => {
    h.db.duerp = duerpAvecVersion(400, 11);
    const d = await getDashboardData(ETAB);
    expect(d.duerp.estAJour).toBe(false);
    expect(d.recommandations.some((r) => r.kind === "duerp_a_jour")).toBe(true);
    expect(d.score.valeur).toBeLessThan(100);
  });
});

describe("getDashboardData — plan d'actions", () => {
  it("expose le total de toutes les actions, statuts finaux compris", async () => {
    h.db.actions.push(
      action({ id: "a1", statut: "levee", echeance: jour(-100) }),
      action({ id: "a2", statut: "abandonnee" }),
      action({ id: "a3", statut: "ouverte", echeance: jour(5) }),
    );
    const d = await getDashboardData(ETAB);
    expect(d.compteurs.actionsTotal).toBe(3);
    // Seule l'action encore ouverte alimente la file de propositions.
    expect(d.recommandations.filter((r) => r.kind === "action_proche")).toHaveLength(
      1,
    );
  });
});

describe("compterVerifsParEquipement", () => {
  it("n'allume pas la pastille rouge le matin de l'échéance", async () => {
    h.db.verifications.push(
      verif({ id: "v1", equipementId: "eq-1", datePrevue: jour(0) }),
    );
    const stats = (await compterVerifsParEquipement(ETAB)).get("eq-1")!;
    expect(stats.enRetard).toBe(0);
    expect(stats.sous30j).toBe(1);
    expect(stats.prochaineDate).toEqual(jour(0));
  });

  it("compte en retard une « à planifier » dépassée, et une seule fois", async () => {
    h.db.verifications.push(
      verif({
        id: "v1",
        equipementId: "eq-1",
        statut: "a_planifier",
        datePrevue: jour(-2),
      }),
    );
    const stats = (await compterVerifsParEquipement(ETAB)).get("eq-1")!;
    expect(stats.enRetard).toBe(1);
    expect(stats.aPlanifier).toBe(0);
  });

  it("ne compte pas en retard une occurrence déjà réalisée — sans rendez-vous suivant", async () => {
    // Le cas périodique, lui, est deux tests plus bas : la même ligne en
    // « annuelle » compte en retard.
    h.db.verifications.push(
      verif({
        id: "v1",
        equipementId: "eq-1",
        statut: "realisee_conforme",
        datePrevue: jour(-30),
        periodicite: "mise_en_service_uniquement",
        rapports: [{ dateRapport: jour(-28), resultat: "conforme" }],
      }),
    );
    const stats = (await compterVerifsParEquipement(ETAB)).get("eq-1")!;
    expect(stats.enRetard).toBe(0);
    expect(stats.derniereRealisee).toEqual(jour(-28));
  });

  it("n'annonce aucun rendez-vous sur une ligne sans date arrêtée", async () => {
    // TROUVÉ PAR MUTATION AU N4, et personne ne le tenait. La `datePrevue`
    // d'une ligne « à planifier » est la date où le générateur l'a produite,
    // pas un rendez-vous convenu (ADR-010) : l'annoncer comme prochaine
    // échéance sur la carte de l'appareil fabrique un engagement que personne
    // n'a pris. Le cas passé était couvert — il tombe dans la garde du retard,
    // deux tests plus haut ; le cas FUTUR n'est retenu que par la lecture du
    // statut, et rien ne la tenait.
    h.db.verifications.push(
      verif({
        id: "v1",
        equipementId: "eq-1",
        statut: "a_planifier",
        datePrevue: jour(20),
      }),
    );
    const stats = (await compterVerifsParEquipement(ETAB)).get("eq-1")!;
    expect(stats.aPlanifier).toBe(1);
    expect(stats.prochaineDate).toBeNull();
  });

  it("une ligne éteinte ne pèse sur aucune pastille (ADR-034)", async () => {
    // TROUVÉ PAR MUTATION AU N4. Le tableau de bord était la seule des neuf
    // surfaces dont l'exclusion des lignes archivées ne rougissait aucun test :
    // son statut est GELÉ dans son dernier état connu — ici « dépassée », l'enum
    // Prisma n'ayant pas de valeur `archivee` —, donc sans la lecture
    // d'`archiveLe` la carte de l'appareil compte un retard à perpétuité sur une
    // obligation qui ne s'applique plus. C'est le même défaut que le registre de
    // sécurité imprimait (`e450ea4`), sur un autre écran.
    h.db.verifications.push(
      verif({
        id: "eteinte",
        equipementId: "eq-1",
        statut: "planifiee",
        datePrevue: jour(-40),
        archiveLe: jour(-3),
      }),
    );
    const stats = (await compterVerifsParEquipement(ETAB)).get("eq-1")!;
    expect(stats.enRetard).toBe(0);
    // Ni rangée ailleurs : une ligne éteinte sort des trois comptes, elle ne se
    // déplace pas de l'un à l'autre.
    expect(stats.aPlanifier).toBe(0);
    expect(stats.sous30j).toBe(0);
    expect(stats.prochaineDate).toBeNull();
  });

  it("annonce le retard DATÉ comme prochaine échéance, devant une échéance à venir", async () => {
    // RETOURNÉ LE 2026-09-14 (lot tableau-de-bord-echeances). Ce test tenait
    // la garde « une ligne en retard n'a pas de prochaine échéance », pendant
    // que la vue du parc retenait le retard pour le même appareil : deux
    // réponses. La définition est désormais UNE (`prochaineEcheanceConnue`) :
    // un contrôle planifié puis manqué est la date qui engage le dirigeant.
    h.db.verifications.push(
      verif({ id: "v1", equipementId: "eq-1", datePrevue: jour(-5) }),
      verif({ id: "v2", equipementId: "eq-1", datePrevue: jour(40) }),
    );
    const stats = (await compterVerifsParEquipement(ETAB)).get("eq-1")!;
    expect(stats.enRetard).toBe(1);
    expect(stats.prochaineDate).toEqual(jour(-5));
  });

  it("n'annonce jamais la date de génération d'une « à planifier » en retard", async () => {
    // Le retard SANS date ne fournit aucune échéance : la vraie, à venir, est
    // la prochaine. Le compteur de retard, lui, ne bouge pas.
    h.db.verifications.push(
      verif({
        id: "generee",
        equipementId: "eq-1",
        statut: "a_planifier",
        datePrevue: jour(-9),
      }),
      verif({ id: "vraie", equipementId: "eq-1", datePrevue: jour(66) }),
    );
    const stats = (await compterVerifsParEquipement(ETAB)).get("eq-1")!;
    expect(stats.enRetard).toBe(1);
    expect(stats.prochaineDate).toEqual(jour(66));
  });

  it("une ligne éteinte gelée sur « planifiée » n'annonce pas non plus de rendez-vous", async () => {
    // MUTATION SURVIVANTE, la seconde : la fixture éteinte du test voisin est
    // gelée sur `depassee`, que la garde de statut écarte déjà. Or depuis le
    // N2 l'état gelé LE PLUS FRÉQUENT est « planifiée » — toute ligne roulée
    // l'est. Archivée à date future, elle annonçait « prochaine échéance » sur
    // une obligation éteinte, et seule la garde `etat !== "archivee"` l'en
    // empêche.
    h.db.verifications.push(
      verif({
        id: "eteinte-planifiee",
        equipementId: "eq-1",
        statut: "planifiee",
        datePrevue: jour(40),
        archiveLe: jour(-3),
      }),
    );
    const stats = (await compterVerifsParEquipement(ETAB)).get("eq-1")!;
    expect(stats.prochaineDate).toBeNull();
    expect(stats.sous30j).toBe(0);
  });

  it("compte en retard une rangée périodique gelée sur « réalisée » (d'avant l'ADR-034)", async () => {
    // LE BLOQUANT DES DEUX RELECTURES : contrôle fait, rendez-vous suivant
    // dans `datePrevue`, passé — et la pastille de l'appareil disait 0 en
    // retard, parce que le statut court-circuitait la date. La règle
    // `estVerificationRealisee` fait décider la date sur une périodique, et
    // le préfiltre SQL (`echeanceAttendue`) ne l'écarte plus en amont.
    h.db.verifications.push(
      verif({
        id: "gelee",
        equipementId: "eq-1",
        statut: "realisee_conforme",
        datePrevue: jour(-180),
      }),
    );
    const stats = (await compterVerifsParEquipement(ETAB)).get("eq-1")!;
    expect(stats.enRetard).toBe(1);
    expect(stats.derniereRealisee).toBeNull(); // hors fenêtre de douze mois
  });

  it("lit la dernière réalisation sur les rapports d'une ligne roulée (ADR-034)", async () => {
    // La ligne a roulé au dépôt : elle ne porte que son échéance ouverte, et
    // le contrôle fait vit sur le rapport. C'est lui que la pastille lit.
    h.db.verifications.push(
      verif({
        id: "v1",
        equipementId: "eq-1",
        statut: "planifiee",
        datePrevue: jour(200),
        rapports: [{ dateRapport: jour(-20), resultat: "conforme" }],
      }),
    );
    const stats = (await compterVerifsParEquipement(ETAB)).get("eq-1")!;
    expect(stats.derniereRealisee).toEqual(jour(-20));
  });
});

describe("compterObligationsParMois", () => {
  it("ne peint pas la barre en rouge le matin de l'échéance", async () => {
    h.db.verifications.push(
      verif({ id: "v1", datePrevue: jour(0) }),
      verif({ id: "v2", datePrevue: jour(0) }),
    );
    const barres = (await compterObligationsParMois(ETAB, 2026)).mois;
    const aout = barres[7];
    expect(aout.retard).toBe(0);
    expect(aout.aVenir).toBe(2);
  });

  it("une « à planifier » n'occupe aucun mois, dépassée ou non", async () => {
    // CE TEST A CHANGÉ DE RÉPONSE (2026-09-14). Il affirmait « compte en
    // retard une à planifier dépassée » — sur sa date de GÉNÉRATION, qui n'est
    // pas une échéance (`aUnRendezVous`). La barre du calendrier l'écartait
    // déjà ; celle du tableau de bord suit. La ligne reste comptée en retard
    // là où le retard se compte (bandeau, pastilles, score).
    h.db.verifications.push(
      verif({ id: "v1", statut: "a_planifier", datePrevue: jour(-3) }),
      verif({ id: "v2", statut: "a_planifier", datePrevue: jour(5) }),
    );
    const { mois: barres, sansEcheance } = await compterObligationsParMois(ETAB, 2026);
    expect(barres.every((b) => b.retard === 0 && b.aVenir === 0)).toBe(true);
    // Hors des mois, JAMAIS hors des comptes : le premier jet les retirait de
    // tout, et l'anneau perdait ses retards (relecture, 2026-09-14).
    expect(sansEcheance).toEqual({ retard: 1, aVenir: 1 });
  });

  it("range une réalisation dans son mois de réalisation", async () => {
    h.db.verifications.push(
      verif({
        id: "v1",
        statut: "realisee_conforme",
        periodicite: "mise_en_service_uniquement",
        datePrevue: instantCivil(2026, 3, 12),
        // Le fait, sur le rapport : en mai, pas au mois de l'échéance.
        rapports: [{ dateRapport: instantCivil(2026, 5, 3), resultat: "conforme" }],
      }),
    );
    const barres = (await compterObligationsParMois(ETAB, 2026)).mois;
    expect(barres[4].couvert).toBe(1);
    expect(barres[2].couvert).toBe(0);
  });

  it("compte chaque rapport réalisé dans son mois, pas seulement le dernier", async () => {
    // Trimestrielle contrôlée en mars puis en juin : la barre de mars
    // retombait à 0 au dépôt de juin (relecture système du 2026-09-14). Le
    // rapport « non vérifiable » d'avril n'atteste d'aucun contrôle.
    h.db.verifications.push(
      verif({
        id: "v1",
        periodicite: "trimestrielle",
        datePrevue: instantCivil(2026, 9, 11),
        rapports: [
          { dateRapport: instantCivil(2026, 3, 12), resultat: "conforme" },
          { dateRapport: instantCivil(2026, 4, 2), resultat: "non_verifiable" },
          { dateRapport: instantCivil(2026, 6, 11), resultat: "conforme" },
        ],
      }),
    );
    const barres = (await compterObligationsParMois(ETAB, 2026)).mois;
    expect(barres.map((b) => b.couvert)).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
    expect(barres[8].aVenir).toBe(1);
    expect(barres.reduce((n, b) => n + b.retard, 0)).toBe(0);
  });
});
