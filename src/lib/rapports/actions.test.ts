// Dépôt et retrait d'un rapport de vérification — server actions, base et
// stockage simulés.
//
// Depuis l'ADR-034 (lot N2, 2026-09-11), c'est ICI que la ligne roule : le
// dépôt d'un rapport réalisé écrit sur le rapport l'échéance qu'il honorait et
// ouvre l'échéance suivante sur la ligne, dans la même transaction. La
// régénération ne roule plus rien. Les cas qui NE roulent pas sont testés un
// par un — non vérifiable, antidaté, one-shot —, parce que chacun a une raison
// différente de ne pas bouger.
//
// Le cas historique reste : le résultat « non vérifiable ». L'ancienne
// implémentation écrivait `dateRealisee` avec un statut `a_planifier`, ce qui
// faisait passer le contrôle pour réalisé, repoussait l'échéance d'une période
// entière, et faisait détruire le rapport par la régénération qui suivait.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { depuisCleJourCivil } from "@/lib/dates";

type LigneVerif = {
  id: string;
  etablissementId: string;
  datePrevue: Date;
  dateRealisee: Date | null;
  statut: string;
  periodicite: string;
  /** Porteur de la ligne. Non nul = échéance d'une personne, sur laquelle
   *  aucun document ne se dépose (ADR-023 § 2). */
  salarieId: string | null;
};

type RapportFaux = {
  id: string;
  etablissementId: string;
  verificationId: string;
  dateRapport: Date;
  resultat: string;
  echeanceHonoree: Date | null;
  fichierCle: string;
  /** Départage deux rapports du même jour, comme en base. */
  createdAt: Date;
};

const h = vi.hoisted(() => {
  const db = {
    verification: null as LigneVerif | null,
    rapports: [] as RapportFaux[],
  };
  const stockage = { fichiers: new Set<string>() };

  const memeInstant = (a: Date | null | undefined, b: Date | null | undefined) =>
    (a ?? null) === null || (b ?? null) === null
      ? (a ?? null) === (b ?? null)
      : a!.getTime() === b!.getTime();

  /**
   * Le `where` et le `orderBy` sont HONORÉS, et c'est ce qui rend les tests
   * capables de rougir : la suppression cherche tantôt le dernier réalisé
   * (ordre décroissant), tantôt le successeur d'un rapport retiré (ordre
   * croissant, borné par `dateRapport >= …`). Un faux client qui rendrait
   * toujours le même rapport laisserait passer les deux.
   */
  const rapportsRealises = (
    where: {
      verificationId: string;
      resultat?: { in: string[] };
      dateRapport?: { gte?: Date };
    },
    orderBy: { dateRapport?: "asc" | "desc"; createdAt?: "asc" | "desc" }[] = [
      { dateRapport: "desc" },
    ],
  ) => {
    const sens = orderBy[0]?.dateRapport === "asc" ? 1 : -1;
    return db.rapports
      .filter(
        (r) =>
          r.verificationId === where.verificationId &&
          (where.resultat === undefined || where.resultat.in.includes(r.resultat)) &&
          (where.dateRapport?.gte === undefined ||
            r.dateRapport.getTime() >= where.dateRapport.gte.getTime()),
      )
      .sort(
        (a, b) =>
          sens * (a.dateRapport.getTime() - b.dateRapport.getTime()) ||
          sens * (a.createdAt.getTime() - b.createdAt.getTime()),
      );
  };

  const prisma: Record<string, unknown> = {
    verification: {
      findUnique: async () => db.verification,
      /** Écriture CONDITIONNÉE, comme en production : rend un compte. */
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; datePrevue?: Date; statut?: string };
        data: Record<string, unknown>;
      }) => {
        const v = db.verification;
        if (
          v === null ||
          v.id !== where.id ||
          (where.datePrevue !== undefined && !memeInstant(v.datePrevue, where.datePrevue)) ||
          (where.statut !== undefined && v.statut !== where.statut)
        ) {
          return { count: 0 };
        }
        Object.assign(v, data);
        return { count: 1 };
      },
    },
    rapportVerification: {
      create: async ({ data }: { data: RapportFaux }) => {
        db.rapports.push(data);
        return data;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const r = db.rapports.find((x) => x.id === where.id);
        if (!r) return null;
        const v = db.verification!;
        return {
          ...r,
          verification: {
            datePrevue: v.datePrevue,
            statut: v.statut,
            periodicite: v.periodicite,
          },
        };
      },
      findFirst: async ({
        where,
        orderBy,
      }: {
        where: {
          verificationId: string;
          resultat?: { in: string[] };
          dateRapport?: { gte?: Date };
        };
        orderBy?: { dateRapport?: "asc" | "desc"; createdAt?: "asc" | "desc" }[];
      }) => rapportsRealises(where, orderBy)[0] ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const r = db.rapports.find((x) => x.id === where.id);
        if (r) Object.assign(r, data);
        return r ?? null;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const i = db.rapports.findIndex((x) => x.id === where.id);
        return i === -1 ? null : db.rapports.splice(i, 1)[0];
      },
      count: async () => db.rapports.length,
    },
  };
  // La transaction ANNULE, comme en base : sans restauration, un test ne peut
  // pas affirmer qu'un dépôt refusé ne laisse pas un rapport orphelin — il
  // décrirait le faux client, pas la garantie.
  prisma.$transaction = async (arg: unknown) => {
    if (typeof arg !== "function") return Promise.all(arg as Promise<unknown>[]);
    const avant = {
      verification: db.verification ? { ...db.verification } : null,
      rapports: db.rapports.map((r) => ({ ...r })),
    };
    try {
      return await (arg as (tx: unknown) => Promise<unknown>)(prisma);
    } catch (e) {
      db.verification = avant.verification;
      db.rapports = avant.rapports;
      throw e;
    }
  };

  return { db, prisma, stockage, genererCalendrier: vi.fn(async () => ({})) };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/lib/calendrier/actions", () => ({
  genererCalendrier: h.genererCalendrier,
}));
vi.mock("@/lib/storage", () => ({
  getStorage: () => ({
    put: async (cle: string) => {
      h.stockage.fichiers.add(cle);
    },
    delete: async (cle: string) => {
      h.stockage.fichiers.delete(cle);
    },
  }),
  cleRapport: (etab: string, id: string, nom: string) =>
    `rapports/${etab}/${id}-${nom}`,
}));

const { supprimerRapport, uploadRapport } = await import("./actions");

function formulaire(resultat: string, dateRapport: string): FormData {
  const fd = new FormData();
  fd.set("dateRapport", dateRapport);
  fd.set("resultat", resultat);
  // Le formulaire poste toujours ces champs, vides le cas échéant.
  fd.set("organismeVerif", "");
  fd.set("commentaires", "");
  fd.set(
    "fichier",
    new File([new Uint8Array([1, 2, 3])], "rapport.pdf", {
      type: "application/pdf",
    }),
  );
  return fd;
}

let horlogeCreation = 0;
function rapport(partiel: Partial<RapportFaux> & { id: string; dateRapport: Date }): RapportFaux {
  return {
    etablissementId: "etab-1",
    verificationId: "v-1",
    resultat: "conforme",
    echeanceHonoree: null,
    fichierCle: `rapports/etab-1/${partiel.id}-x.pdf`,
    // Croissant dans l'ordre de pose : deux rapports du même jour se
    // départagent comme en base.
    createdAt: new Date(2020, 0, 1, 0, 0, (horlogeCreation += 1)),
    ...partiel,
  };
}

/** L'échéance de départ de la ligne, déjà passée au moment des tests. */
const ECHEANCE = new Date("2026-01-15T00:00:00Z");

beforeEach(() => {
  h.db.rapports = [];
  h.stockage.fichiers.clear();
  h.genererCalendrier.mockClear();
  h.db.verification = {
    salarieId: null,
    id: "v-1",
    etablissementId: "etab-1",
    datePrevue: ECHEANCE,
    dateRealisee: null,
    statut: "a_planifier",
    periodicite: "annuelle",
  };
});

describe("uploadRapport — résultat « non vérifiable »", () => {
  it("n'écrit pas de date de réalisation", async () => {
    const res = await uploadRapport("v-1", { status: "idle" }, formulaire("non_verifiable", "2026-06-01"));

    expect(res.status).toBe("success");
    expect(h.db.verification?.dateRealisee).toBeNull();
  });

  it("ne repousse pas l'échéance et la signale comme dépassée", async () => {
    await uploadRapport("v-1", { status: "idle" }, formulaire("non_verifiable", "2026-06-01"));

    expect(h.db.verification?.datePrevue).toEqual(ECHEANCE);
    expect(h.db.verification?.statut).toBe("depassee");
  });

  it("conserve le rapport et son fichier, sans échéance honorée", async () => {
    await uploadRapport("v-1", { status: "idle" }, formulaire("non_verifiable", "2026-06-01"));

    expect(h.db.rapports).toHaveLength(1);
    expect(h.db.rapports[0].resultat).toBe("non_verifiable");
    // Rien n'a été vérifié : ce rapport n'honore aucune échéance.
    expect(h.db.rapports[0].echeanceHonoree).toBeNull();
    expect(h.stockage.fichiers.size).toBe(1);
  });
});

describe("uploadRapport — un rapport réalisé fait ROULER la ligne (ADR-034)", () => {
  it("le rapport garde l'échéance qu'il honorait", async () => {
    await uploadRapport("v-1", { status: "idle" }, formulaire("conforme", "2026-06-01"));

    // C'est la seule trace qui survive au roulement : la ligne, elle, ne porte
    // plus que l'échéance suivante.
    expect(h.db.rapports[0].echeanceHonoree).toEqual(ECHEANCE);
  });

  it("la ligne passe à l'échéance suivante, planifiée", async () => {
    await uploadRapport("v-1", { status: "idle" }, formulaire("conforme", "2026-06-01"));

    // Date du rapport + un an, et non l'ancienne échéance + un an : c'est
    // l'intervalle que le texte impose, il court depuis le contrôle.
    expect(h.db.verification?.datePrevue).toEqual(depuisCleJourCivil("2027-06-01"));
    expect(h.db.verification?.statut).toBe("planifiee");
    expect(h.genererCalendrier).toHaveBeenCalledWith("etab-1");
  });

  it("la réalisation vit sur le rapport, en date civile — la ligne n'en porte plus", async () => {
    await uploadRapport("v-1", { status: "idle" }, formulaire("conforme", "2026-06-01"));

    // La date saisie est une date **civile** : elle est ancrée à minuit heure
    // de Paris, pas à minuit UTC (ADR-011). `new Date("2026-06-01")` aurait
    // désigné 02:00 du matin heure française — l'écart qui faisait basculer
    // une échéance du jour en « en retard » dès 2 h.
    expect(h.db.rapports[0].dateRapport).toEqual(depuisCleJourCivil("2026-06-01"));
    // Et la colonne de la ligne n'est plus écrite (ADR-034) : une seule source.
    expect(h.db.verification?.dateRealisee).toBeNull();
  });

  it("un résultat avec écart roule pareil : le résultat vit sur le rapport", async () => {
    await uploadRapport("v-1", { status: "idle" }, formulaire("ecart_majeur", "2026-06-01"));

    expect(h.db.rapports[0].resultat).toBe("ecart_majeur");
    expect(h.db.verification?.statut).toBe("planifiee");
    expect(h.db.verification?.datePrevue).toEqual(depuisCleJourCivil("2027-06-01"));
  });

  it("un rapport ANTIDATÉ entre au registre sans faire reculer la ligne", async () => {
    // Un contrôle de 2026 est déjà déposé et la ligne a roulé à 2027. On
    // retrouve le rapport de 2025 : il se conserve, mais la ligne ne repart
    // pas vers 2026 — un rapport plus récent a déjà dépassé cette échéance.
    h.db.rapports = [
      rapport({ id: "rap-2026", dateRapport: depuisCleJourCivil("2026-06-01"), echeanceHonoree: ECHEANCE }),
    ];
    h.db.verification!.datePrevue = depuisCleJourCivil("2027-06-01");
    h.db.verification!.statut = "planifiee";
    h.db.verification!.dateRealisee = depuisCleJourCivil("2026-06-01");

    const res = await uploadRapport("v-1", { status: "idle" }, formulaire("conforme", "2025-05-01"));

    expect(res.status).toBe("success");
    expect(h.db.rapports).toHaveLength(2);
    const antidate = h.db.rapports.find((r) => r.id !== "rap-2026")!;
    expect(antidate.echeanceHonoree).toBeNull();
    expect(h.db.verification?.datePrevue).toEqual(depuisCleJourCivil("2027-06-01"));
    expect(h.db.verification?.dateRealisee).toEqual(depuisCleJourCivil("2026-06-01"));
    expect(h.db.verification?.statut).toBe("planifiee");
  });

  it("une obligation sans rendez-vous suivant garde son échéance et prend le statut du résultat", async () => {
    h.db.verification!.periodicite = "mise_en_service_uniquement";

    await uploadRapport("v-1", { status: "idle" }, formulaire("conforme", "2026-06-01"));

    expect(h.db.verification?.datePrevue).toEqual(ECHEANCE);
    expect(h.db.verification?.statut).toBe("realisee_conforme");
    expect(h.db.rapports[0].echeanceHonoree).toEqual(ECHEANCE);
  });

  it("n'écrit rien si la ligne a roulé entre la lecture et l'écriture", async () => {
    // Deux dépôts concurrents sur la même ligne. Le second lit l'échéance
    // d'avant, calcule dessus, et trouve la ligne changée : il ne doit ni
    // écrire une échéance honorée fausse, ni laisser un rapport orphelin de la
    // transaction annulée, ni un fichier.
    const original = (h.prisma as { verification: { updateMany: unknown } }).verification.updateMany;
    (h.prisma as { verification: { updateMany: unknown } }).verification.updateMany = async () => ({ count: 0 });

    const res = await uploadRapport("v-1", { status: "idle" }, formulaire("conforme", "2026-06-01"));

    (h.prisma as { verification: { updateMany: unknown } }).verification.updateMany = original;
    expect(res.status).toBe("error");
    expect(res.status === "error" && res.message).toMatch(/modifiée/);
    expect(h.stockage.fichiers.size).toBe(0);
    expect(h.db.verification?.datePrevue).toEqual(ECHEANCE);
  });

  it("nettoie le fichier si la base refuse l'écriture", async () => {
    const create = (h.prisma as { rapportVerification: { create: unknown } })
      .rapportVerification.create;
    (h.prisma as { rapportVerification: { create: unknown } }).rapportVerification.create =
      async () => {
        throw new Error("contrainte violée");
      };

    await expect(
      uploadRapport("v-1", { status: "idle" }, formulaire("conforme", "2026-06-01")),
    ).rejects.toThrow("contrainte violée");
    expect(h.stockage.fichiers.size).toBe(0);

    (h.prisma as { rapportVerification: { create: unknown } }).rapportVerification.create =
      create;
  });
});

describe("supprimerRapport — la ligne recule d'un cycle (ADR-034)", () => {
  /** Une ligne roulée par un rapport de juin 2026. */
  function ligneRoulee() {
    h.db.verification = {
      salarieId: null,
      id: "v-1",
      etablissementId: "etab-1",
      datePrevue: depuisCleJourCivil("2027-06-01"),
      dateRealisee: depuisCleJourCivil("2026-06-01"),
      statut: "planifiee",
      periodicite: "annuelle",
    };
  }

  it("revient à l'échéance que le rapport honorait, et la signale dépassée", async () => {
    ligneRoulee();
    h.db.rapports = [
      rapport({ id: "rap-1", dateRapport: depuisCleJourCivil("2026-06-01"), echeanceHonoree: ECHEANCE }),
    ];
    h.stockage.fichiers.add("rapports/etab-1/rap-1-x.pdf");

    // `redirect` lève, comme en production : on l'absorbe.
    await expect(supprimerRapport("rap-1")).rejects.toThrow("NEXT_REDIRECT");

    // Plus de preuve → l'échéance du 15 janvier 2026 rouvre, en retard. Avant
    // l'ADR-034 la ligne restait à 2027 : le retard était blanchi par la
    // suppression de la pièce qui le justifiait.
    expect(h.db.verification?.datePrevue).toEqual(ECHEANCE);
    expect(h.db.verification?.dateRealisee).toBeNull();
    expect(h.db.verification?.statut).toBe("depassee");
    // Le fichier n'est libéré qu'après le commit.
    expect(h.stockage.fichiers.size).toBe(0);
  });

  it("se rabat sur le rapport réalisé précédent quand celui-ci reste", async () => {
    ligneRoulee();
    h.db.rapports = [
      rapport({ id: "rap-2025", dateRapport: depuisCleJourCivil("2025-05-01"), echeanceHonoree: null }),
      rapport({ id: "rap-2026", dateRapport: depuisCleJourCivil("2026-06-01"), echeanceHonoree: null }),
    ];

    await expect(supprimerRapport("rap-2026")).rejects.toThrow("NEXT_REDIRECT");

    // Rapport d'avant N2, sans échéance honorée : la ligne se recalcule depuis
    // le rapport qui reste — mai 2025 + un an, donc dépassée.
    expect(h.db.verification?.datePrevue).toEqual(depuisCleJourCivil("2026-05-01"));
    expect(h.db.verification?.dateRealisee).toBeNull();
    expect(h.db.verification?.statut).toBe("depassee");
  });

  it("retirer un rapport ANTIDATÉ ne touche pas la ligne", async () => {
    ligneRoulee();
    h.db.rapports = [
      rapport({ id: "rap-2025", dateRapport: depuisCleJourCivil("2025-05-01") }),
      rapport({ id: "rap-2026", dateRapport: depuisCleJourCivil("2026-06-01"), echeanceHonoree: ECHEANCE }),
    ];

    await expect(supprimerRapport("rap-2025")).rejects.toThrow("NEXT_REDIRECT");

    expect(h.db.rapports.map((r) => r.id)).toEqual(["rap-2026"]);
    expect(h.db.verification?.datePrevue).toEqual(depuisCleJourCivil("2027-06-01"));
    expect(h.db.verification?.statut).toBe("planifiee");
  });

  it("retirer un rapport non vérifiable ne touche pas la ligne", async () => {
    ligneRoulee();
    h.db.rapports = [
      rapport({ id: "rap-nv", dateRapport: depuisCleJourCivil("2026-08-01"), resultat: "non_verifiable" }),
    ];

    await expect(supprimerRapport("rap-nv")).rejects.toThrow("NEXT_REDIRECT");

    expect(h.db.verification?.datePrevue).toEqual(depuisCleJourCivil("2027-06-01"));
    expect(h.db.verification?.statut).toBe("planifiee");
  });

  it("sans échéance honorée ni autre rapport, la ligne garde sa date et rouvre son cycle", async () => {
    // Le cas d'avant N2 : on ne sait pas d'où la ligne venait, on n'invente
    // rien. Elle cesse seulement d'afficher une réalisation qu'aucune pièce ne
    // prouve.
    ligneRoulee();
    h.db.rapports = [
      rapport({ id: "rap-1", dateRapport: depuisCleJourCivil("2026-06-01"), echeanceHonoree: null }),
    ];

    await expect(supprimerRapport("rap-1")).rejects.toThrow("NEXT_REDIRECT");

    expect(h.db.verification?.datePrevue).toEqual(depuisCleJourCivil("2027-06-01"));
    expect(h.db.verification?.dateRealisee).toBeNull();
    expect(h.db.verification?.statut).toBe("a_planifier");
  });
});

describe("uploadRapport — la frontière médicale, tenue côté serveur", () => {
  /**
   * D'un titre de salarié, l'outil ne garde que l'existence, la date et
   * l'échéance — jamais le document (ADR-023 § 2, `docs/rgpd.md` § 2.3).
   *
   * Trois documents l'affirmaient, et rien ne l'empêchait : la garde vivait
   * dans un ternaire JSX de la fiche de vérification. Cette action serveur est
   * exposée en RPC ; un appel direct, ou une refonte de cet écran, déposait le
   * fichier sans un mot — l'attestation médicale d'une personne dans le
   * système de fichiers.
   */
  beforeEach(() => {
    h.db.verification = {
      salarieId: "sal-1",
      id: "v-titre",
      etablissementId: "etab-1",
      datePrevue: ECHEANCE,
      dateRealisee: null,
      statut: "a_planifier",
      periodicite: "quinquennale",
    };
  });

  it("refuse un dépôt sur l'échéance d'une personne", async () => {
    const res = await uploadRapport(
      "v-titre",
      { status: "idle" },
      formulaire("conforme", "2026-06-01"),
    );
    expect(res.status).toBe("error");
  });

  it("ne stocke aucun fichier et ne crée aucun rapport", async () => {
    // Le point qui compte : le refus doit intervenir AVANT l'écriture. Un
    // message d'erreur rendu après avoir posé le buffer dans le stockage ne
    // vaudrait rien.
    await uploadRapport(
      "v-titre",
      { status: "idle" },
      formulaire("conforme", "2026-06-01"),
    );
    expect(h.stockage.fichiers.size).toBe(0);
    expect(h.db.rapports).toEqual([]);
  });

  it("le refus porte sur le PORTEUR, pas sur le caractère médical", async () => {
    // Dix-neuf titres salarié restent à encoder, dont la plupart ne sont pas
    // médicaux — SST, CACES, autorisation de conduite. Aucun n'a de document à
    // déposer ici non plus : indexer la garde sur `pieceMedicale` la lèverait
    // au premier d'entre eux.
    const res = await uploadRapport(
      "v-titre",
      { status: "idle" },
      formulaire("conforme", "2026-06-01"),
    );
    expect(res.status === "error" && res.message).toMatch(/personne/i);
  });
});

describe("les cas limites que la relecture du 2026-09-12 a trouvés", () => {
  it("supprimer les rapports du PLUS ANCIEN au plus récent ne blanchit pas le retard", () => {
    // LE DÉFAUT BLOQUANT. Deux dépôts sur la même ligne : juin, puis
    // septembre. On supprime juin, puis septembre. À la fin il ne reste aucune
    // pièce, et la ligne doit être revenue à l'échéance d'origine, dépassée.
    // Elle restait à 2027, « à planifier » : le retard disparaissait avec les
    // pièces qui le prouvaient.
    return (async () => {
      h.db.verification = {
        salarieId: null,
        id: "v-1",
        etablissementId: "etab-1",
        datePrevue: depuisCleJourCivil("2027-09-01"),
        dateRealisee: null,
        statut: "planifiee",
        periodicite: "annuelle",
      };
      h.db.rapports = [
        rapport({
          id: "rap-juin",
          dateRapport: depuisCleJourCivil("2026-06-01"),
          echeanceHonoree: ECHEANCE,
        }),
        rapport({
          id: "rap-sept",
          dateRapport: depuisCleJourCivil("2026-09-01"),
          echeanceHonoree: depuisCleJourCivil("2027-06-01"),
        }),
      ];

      await expect(supprimerRapport("rap-juin")).rejects.toThrow("NEXT_REDIRECT");
      // L'échéance que juin honorait est reportée sur septembre, qui l'honore
      // désormais : c'est elle qui rouvrira quand septembre partira.
      expect(h.db.rapports[0].echeanceHonoree).toEqual(ECHEANCE);

      await expect(supprimerRapport("rap-sept")).rejects.toThrow("NEXT_REDIRECT");
      expect(h.db.verification?.datePrevue).toEqual(ECHEANCE);
      expect(h.db.verification?.statut).toBe("depassee");
      expect(h.db.rapports).toEqual([]);
    })();
  });

  it("deux rapports du MÊME JOUR : le second n'est pas perdu au retrait du premier", async () => {
    // Un rapport et sa contre-visite, déposés le même jour. Le premier fait
    // rouler, le second est traité comme antidaté. Retirer le premier ne doit
    // pas laisser la ligne sans échéance à rouvrir.
    h.db.verification = {
      salarieId: null,
      id: "v-1",
      etablissementId: "etab-1",
      datePrevue: depuisCleJourCivil("2027-06-01"),
      dateRealisee: null,
      statut: "planifiee",
      periodicite: "annuelle",
    };
    h.db.rapports = [
      rapport({
        id: "rap-a",
        dateRapport: depuisCleJourCivil("2026-06-01"),
        echeanceHonoree: ECHEANCE,
      }),
      rapport({ id: "rap-b", dateRapport: depuisCleJourCivil("2026-06-01") }),
    ];

    await expect(supprimerRapport("rap-a")).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.rapports[0].echeanceHonoree).toEqual(ECHEANCE);
    await expect(supprimerRapport("rap-b")).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.verification?.datePrevue).toEqual(ECHEANCE);
    expect(h.db.verification?.statut).toBe("depassee");
  });

  it("un rapport daté dans le futur est refusé", async () => {
    // Depuis que la ligne roule sur la date du rapport, une coquille — 2062 au
    // lieu de 2026 — rendrait tout dépôt suivant antidaté, donc sans effet :
    // la ligne resterait figée jusqu'à ce qu'on pense à supprimer la pièce.
    const res = await uploadRapport(
      "v-1",
      { status: "idle" },
      formulaire("conforme", "2062-06-01"),
    );

    expect(res.status).toBe("error");
    expect(h.db.rapports).toEqual([]);
    expect(h.stockage.fichiers.size).toBe(0);
    expect(h.db.verification?.datePrevue).toEqual(ECHEANCE);
  });

  it("le retrait d'un rapport ne recule pas la ligne AVANT ce qu'un rapport restant prouve", async () => {
    // Échéance de 2026. Un contrôle d'août 2026 fait rouler la ligne à 2027,
    // puis un antidaté de mai 2026 entre au registre. En retirant celui d'août,
    // la ligne ne doit pas revenir à janvier 2026 : le rapport de mai, toujours
    // là, porte l'échéance à mai 2027.
    h.db.verification = {
      salarieId: null,
      id: "v-1",
      etablissementId: "etab-1",
      datePrevue: depuisCleJourCivil("2027-08-01"),
      dateRealisee: null,
      statut: "planifiee",
      periodicite: "annuelle",
    };
    h.db.rapports = [
      rapport({ id: "rap-mai", dateRapport: depuisCleJourCivil("2026-05-01") }),
      rapport({
        id: "rap-aout",
        dateRapport: depuisCleJourCivil("2026-08-01"),
        echeanceHonoree: ECHEANCE,
      }),
    ];

    await expect(supprimerRapport("rap-aout")).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.verification?.datePrevue).toEqual(depuisCleJourCivil("2027-05-01"));
    expect(h.db.verification?.statut).toBe("planifiee");
  });

  it("un « non vérifiable » ne déclasse pas une obligation ponctuelle déjà faite", async () => {
    // Une vérification à la mise en service, faite. Le prestataire repasse et
    // ne peut rien contrôler : sa pièce entre au registre, mais la ligne ne
    // redevient pas « à planifier » — il n'y a plus rien à planifier.
    h.db.verification = {
      salarieId: null,
      id: "v-1",
      etablissementId: "etab-1",
      datePrevue: ECHEANCE,
      dateRealisee: null,
      statut: "realisee_conforme",
      periodicite: "mise_en_service_uniquement",
    };

    await uploadRapport("v-1", { status: "idle" }, formulaire("non_verifiable", "2026-08-01"));

    expect(h.db.verification?.statut).toBe("realisee_conforme");
    expect(h.db.verification?.datePrevue).toEqual(ECHEANCE);
  });

  it("un dépôt éteint la colonne gelée d'une ligne d'avant l'ADR-034", async () => {
    // Tant qu'elle porte une date de réalisation, les prédicats d'avant N3 la
    // tiennent pour « jamais en retard ». Le dépôt qui la fait rouler doit
    // donc l'éteindre, sans attendre la régénération — qui peut échouer.
    h.db.verification!.dateRealisee = depuisCleJourCivil("2025-06-01");

    await uploadRapport("v-1", { status: "idle" }, formulaire("conforme", "2026-06-01"));

    expect(h.db.verification?.dateRealisee).toBeNull();
  });

  it("un dépôt refusé pour conflit ne laisse aucun rapport orphelin", async () => {
    // La transaction annule : sans cela, le registre garderait une pièce que
    // la ligne ne connaît pas.
    const original = (h.prisma as { verification: { updateMany: unknown } }).verification
      .updateMany;
    (h.prisma as { verification: { updateMany: unknown } }).verification.updateMany =
      async () => ({ count: 0 });

    const res = await uploadRapport(
      "v-1",
      { status: "idle" },
      formulaire("conforme", "2026-06-01"),
    );

    (h.prisma as { verification: { updateMany: unknown } }).verification.updateMany =
      original;
    expect(res.status).toBe("error");
    expect(h.db.rapports).toEqual([]);
  });

  it("une suppression concurrente ne fait pas échouer le retrait", async () => {
    // Le rapport est supprimé, la ligne a bougé entre-temps : on abandonne le
    // recul plutôt que de lever — l'erreur remonterait en page d'erreur sur un
    // retrait qui a réussi, et le calendrier est recalé juste après.
    h.db.rapports = [
      rapport({
        id: "rap-1",
        dateRapport: depuisCleJourCivil("2026-06-01"),
        echeanceHonoree: ECHEANCE,
      }),
    ];
    const original = (h.prisma as { verification: { updateMany: unknown } }).verification
      .updateMany;
    (h.prisma as { verification: { updateMany: unknown } }).verification.updateMany =
      async () => ({ count: 0 });

    await expect(supprimerRapport("rap-1")).rejects.toThrow("NEXT_REDIRECT");

    (h.prisma as { verification: { updateMany: unknown } }).verification.updateMany =
      original;
    expect(h.db.rapports).toEqual([]);
    expect(h.genererCalendrier).toHaveBeenCalled();
  });
});
