import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  compterLignesAvecPreuve,
  dernierRapportSousLActe,
  lignesVisees,
  type LigneVisee,
  type PrescriptionAPreuver,
} from "./preuves";
import { raisonDuRefus } from "./refus-suppression";
import { cleJourCivil } from "@/lib/dates";
import { validerPrescription } from "./schema";

// La suppression d'une prescription : ce que le serveur refuse de détruire.
// La règle est pure (`preuves.ts`) et se teste sur les trois scénarios de la
// revue ; l'action est tenue sur un client simulé qui rend les lignes visées.

const h = vi.hoisted(() => {
  const etat = {
    prescription: null as Record<string, unknown> | null,
    lignes: [] as {
      statut: string;
      rapports: { dateRapport: Date; createdAt: Date }[];
      _count: { actions: number };
    }[],
  };
  const prisma = {
    prescriptionParticuliere: {
      findFirst: vi.fn(async () => etat.prescription),
      delete: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    verification: {
      findMany: vi.fn(async () => etat.lignes),
    },
  };
  return { etat, prisma };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => undefined),
}));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({
  regenererApresMutation: vi.fn(async () => undefined),
}));

const { leverPrescription, supprimerPrescription } = await import("./actions");

const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Une demande d'assureur qui rend le maintien en état d'un portail semestriel. */
const renforcement = (dateDocument: string): PrescriptionAPreuver => ({
  id: "presc-1",
  effet: "renforce_periodicite",
  obligationId: "porte-auto-maintien-en-etat",
  equipementId: "eq-portail",
  dateDocument: jour(dateDocument),
  dateFin: null,
  // Saisie ancienne par défaut : les tests de dates d'acte n'en dépendent pas.
  createdAt: jour("2020-01-01"),
});

const ligne = (rapports: string[], over: Partial<LigneVisee> = {}): LigneVisee => ({
  statut: "planifiee",
  // Enregistré le jour de sa date, par défaut.
  rapports: rapports.map((d) => ({ dateRapport: jour(d), createdAt: jour(d) })),
  nbActions: 0,
  ...over,
});

beforeEach(() => {
  h.etat.prescription = null;
  h.etat.lignes = [];
  vi.clearAllMocks();
});

describe("preuves faites sous l'acte (2026-09-15)", () => {
  it("SAISIE ERRONÉE sur une ligne déjà contrôlée : les rapports antérieurs à l'acte ne comptent pas", () => {
    // Le portail porte des rapports de 2025 ; la prescription, posée par
    // erreur, est datée de 2026. La régénération lui a inscrit la ligne : le
    // compte par `prescriptionId` valait 1 dès la création, et la suppression
    // tournait en rond. Aucun rapport n'a été fait sous elle.
    expect(
      compterLignesAvecPreuve(renforcement("2026-09-01"), [
        ligne(["2025-03-10", "2025-09-12"]),
      ]),
    ).toBe(0);
  });

  it("LEVÉE avec un rapport postérieur à l'acte : il compte, que la ligne la porte encore ou non", () => {
    // Levée, la prescription ne marque plus la ligne (`prescriptionId` à
    // `null`) : l'ancien compte tombait à zéro. Le rapport de mars 2026 a été
    // fait au rythme qu'elle imposait.
    expect(
      compterLignesAvecPreuve(renforcement("2025-12-01"), [
        ligne(["2025-06-01", "2026-03-15"]),
      ]),
    ).toBe(1);
  });

  it("RATTRAPÉE par le référentiel : même règle, les rapports faits sous l'acte comptent", () => {
    // La prescription reste affichée active, mais le référentiel impose déjà un
    // rythme au moins aussi strict : elle ne surcharge plus, la ligne perd son
    // marquage. Le rapport du jour même de l'acte compte — « à partir de ».
    expect(
      compterLignesAvecPreuve(renforcement("2026-01-10"), [
        ligne(["2026-01-10"]),
        ligne([]),
      ]),
    ).toBe(1);
  });

  it("une action seule ne compte pas sur un renforcement ; tout compte sur une obligation sur mesure", () => {
    const action = ligne([], { nbActions: 1 });
    expect(compterLignesAvecPreuve(renforcement("2026-01-10"), [action])).toBe(0);
    expect(
      compterLignesAvecPreuve(
        { ...renforcement("2026-01-10"), effet: "obligation_sur_mesure", obligationId: null },
        [action, ligne(["2020-01-01"]), ligne([], { statut: "realisee_conforme" })],
      ),
    ).toBe(3);
  });

  it("les lignes visées : obligation × appareil, toutes les lignes de l'obligation sans appareil, ses propres lignes sur mesure", () => {
    expect(lignesVisees("etab-1", renforcement("2026-01-10"))).toEqual({
      etablissementId: "etab-1",
      obligationId: "porte-auto-maintien-en-etat",
      equipementId: "eq-portail",
    });
    expect(
      lignesVisees("etab-1", { ...renforcement("2026-01-10"), equipementId: null }),
    ).toEqual({ etablissementId: "etab-1", obligationId: "porte-auto-maintien-en-etat" });
    expect(
      lignesVisees("etab-1", {
        ...renforcement("2026-01-10"),
        effet: "obligation_sur_mesure",
        obligationId: null,
      }),
    ).toEqual({ etablissementId: "etab-1", obligationId: "prescription:presc-1" });
    expect(
      lignesVisees("etab-1", { ...renforcement("2026-01-10"), obligationId: null }),
    ).toBeNull();
  });
});

describe("bornes de l'acte, en jour civil (2026-09-15)", () => {
  it("un rapport daté APRÈS la levée n'a pas été fait sous l'acte", () => {
    const levee = { ...renforcement("2025-12-01"), dateFin: jour("2026-03-01") };
    expect(compterLignesAvecPreuve(levee, [ligne(["2026-04-15"])])).toBe(0);
    // ~~Le jour même de la levée, la prescription est encore en vigueur.~~ Faux,
    // et contraire au moteur : « cesse de produire effet le 01/03 » veut dire
    // qu'elle n'en produit plus ce jour-là (relecture du 2026-09-15). La veille
    // compte ; le jour même, non.
    expect(compterLignesAvecPreuve(levee, [ligne(["2026-02-28"])])).toBe(1);
    expect(compterLignesAvecPreuve(levee, [ligne(["2026-03-01"])])).toBe(0);
  });

  it("compare des JOURS de Paris, pas des instants", () => {
    // Levée stockée à minuit UTC le 1er mars (1 h à Paris) ; un rapport à 0 h 30
    // à Paris le même 1er mars est un instant ANTÉRIEUR à la levée. En instants,
    // il comptait ; en jours, il tombe le jour de la levée, et ne compte pas.
    const p = { ...renforcement("2026-01-10"), dateFin: jour("2026-03-01") };
    const aMinuitTrente: LigneVisee = {
      statut: "planifiee",
      rapports: [
        {
          dateRapport: new Date("2026-02-28T23:30:00Z"),
          createdAt: new Date("2026-02-28T23:30:00Z"),
        },
      ],
      nbActions: 0,
    };
    expect(compterLignesAvecPreuve(p, [aMinuitTrente])).toBe(0);
  });
});

describe("option B — seuls comptent les rapports déposés après la saisie (2026-09-15)", () => {
  // Décision de la propriétaire. Un arrêté posé par erreur, daté de 2024 ;
  // le portail porte des rapports de 2025 déposés en 2025. La prescription est
  // saisie le 1er septembre 2026 : elle ne les a pas pilotés.
  const saisieErronee = {
    ...renforcement("2024-01-15"),
    createdAt: new Date("2026-09-01T08:00:00Z"),
  };

  it("saisie erronée datée avant des rapports existants : supprimable", () => {
    expect(
      compterLignesAvecPreuve(saisieErronee, [ligne(["2025-03-10", "2025-09-12"])]),
    ).toBe(0);
  });

  it("un rapport déposé APRÈS la saisie compte, même daté d'avant", () => {
    const deposeApres: LigneVisee = {
      statut: "planifiee",
      rapports: [
        { dateRapport: jour("2025-06-01"), createdAt: new Date("2026-09-10T14:00:00Z") },
      ],
      nbActions: 0,
    };
    expect(compterLignesAvecPreuve(saisieErronee, [deposeApres])).toBe(1);
  });

  it("sur mesure, tout compte encore, dépôt antérieur compris", () => {
    expect(
      compterLignesAvecPreuve(
        { ...saisieErronee, effet: "obligation_sur_mesure", obligationId: null },
        [ligne(["2025-03-10"])],
      ),
    ).toBe(1);
  });
});

describe("raisonDuRefus — une phrase, sans renvoi circulaire", () => {
  it("à une prescription LEVÉE, ne dit pas « levez-la »", () => {
    const r = raisonDuRefus(
      { effet: "renforce_periodicite", acte: "2025-12-01", fin: "2026-06-30", levee: true },
      1,
    );
    expect(r).toContain("du 01/12/2025 à la veille de sa levée du 30/06/2026");
    expect(r).not.toMatch(/levez-la/i);
  });

  it("accorde la liste d'une obligation sur mesure sans « fait » pendant", () => {
    const r = raisonDuRefus(
      { effet: "obligation_sur_mesure", acte: "2025-12-01", fin: null, levee: false },
      2,
    );
    expect(r).toContain(
      "2 vérifications visées par cette prescription portent un rapport, une action corrective ou un contrôle enregistré.",
    );
  });
});

describe("validerPrescription — un acte ne se date pas dans le futur (2026-09-15)", () => {
  const saisie = (dateDocument: string) =>
    validerPrescription({
      effet: "renforce_periodicite",
      source: "arrete_prefectoral",
      reference: "Arrêté n° 1",
      dateDocument,
      periodicite: "semestrielle",
      obligationId: "porte-auto-maintien-en-etat",
      realisateurRequis: [],
    });

  it("refuse « 2062 » pour « 2026 »", () => {
    const r = saisie("2062-01-10");
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.flatten().fieldErrors.dateDocument)).toContain("futur");
  });

  it("accepte aujourd'hui et le passé", () => {
    expect(saisie("2024-05-02").success).toBe(true);
    expect(saisie(cleJourCivil(new Date())).success).toBe(true);
  });
});

describe("leverPrescription — une levée ne précède pas un contrôle fait sous l'acte (2026-09-15)", () => {
  // Le scénario de la relecture : acte du 01/01/2024 saisi le jour même, deux
  // rapports déposés en 2025 à son rythme, puis levée « au 01/06/2024 ». Le
  // compte tombait à zéro et la suppression passait.
  const poser = () => {
    h.etat.prescription = {
      ...renforcement("2024-01-01"),
      createdAt: new Date("2024-01-01T09:00:00Z"),
      actif: true,
    };
    h.etat.lignes = [
      {
        statut: "planifiee",
        rapports: [
          { dateRapport: jour("2025-03-10"), createdAt: jour("2025-03-10") },
          { dateRapport: jour("2025-09-12"), createdAt: jour("2025-09-12") },
        ],
        _count: { actions: 0 },
      },
    ];
  };
  const lever = (date: string) => {
    const fd = new FormData();
    fd.set("dateFin", date);
    return leverPrescription("etab-1", "presc-1", { status: "idle" }, fd);
  };

  it("refuse une levée antidatée avant le dernier rapport, et dit la date", async () => {
    poser();
    const res = await lever("2024-06-01");
    expect(res.status).toBe("error");
    expect(res.status === "error" ? res.message : "").toContain("12/09/2025");
    expect(h.prisma.prescriptionParticuliere.update).not.toHaveBeenCalled();
  });

  it("refuse aussi une levée le jour même du dernier rapport : l'acte n'y produit plus d'effet", async () => {
    poser();
    expect((await lever("2025-09-12")).status).toBe("error");
  });

  it("accepte une levée postérieure au dernier rapport", async () => {
    poser();
    const res = await lever("2025-09-13");
    expect(res.status).toBe("success");
    expect(h.prisma.prescriptionParticuliere.update).toHaveBeenCalledTimes(1);
  });

  it("le dernier rapport sous l'acte ignore la borne de levée, et ce qui précède la saisie", () => {
    const p = { ...renforcement("2024-01-01"), dateFin: jour("2024-06-01"), createdAt: jour("2024-01-01") };
    expect(dernierRapportSousLActe(p, [ligne(["2023-05-01", "2025-09-12", "2025-03-10"])]))
      .toEqual(jour("2025-09-12"));
    expect(
      dernierRapportSousLActe({ ...p, createdAt: jour("2026-01-01") }, [ligne(["2025-09-12"])]),
    ).toBeNull();
  });
});

describe("supprimerPrescription", () => {
  const poser = (dateDocument: string, rapports: string[]) => {
    h.etat.prescription = { ...renforcement(dateDocument), actif: true };
    h.etat.lignes = [
      {
        statut: "planifiee",
        rapports: rapports.map((d) => ({ dateRapport: jour(d), createdAt: jour(d) })),
        _count: { actions: 0 },
      },
    ];
  };

  it("accepte la saisie erronée posée sur une ligne contrôlée avant l'acte", async () => {
    poser("2026-09-01", ["2025-03-10"]);
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("success");
    expect(h.prisma.prescriptionParticuliere.delete).toHaveBeenCalledTimes(1);
  });

  it("refuse, sans renvoi circulaire, dès qu'un rapport a été fait sous l'acte", async () => {
    poser("2025-12-01", ["2026-03-15"]);
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("error");
    expect(h.prisma.prescriptionParticuliere.delete).not.toHaveBeenCalled();
    const message = res.status === "error" ? res.message : "";
    expect(message).toContain("01/12/2025");
    // Le message ne renvoie ni à « annuler la levée » ni à une suppression
    // ultérieure : il dit ce qui reste et comment arrêter l'effet.
    expect(message).not.toMatch(/annul/i);
  });

  it("accepte la saisie erronée datée AVANT des rapports déposés avant elle (option B)", async () => {
    poser("2024-01-15", ["2025-03-10"]);
    h.etat.prescription = {
      ...h.etat.prescription,
      createdAt: new Date("2026-09-01T08:00:00Z"),
    };
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("success");
  });

  it("refuse dès qu'un rapport a été déposé après la saisie, et le dit", async () => {
    poser("2024-01-15", []);
    h.etat.prescription = {
      ...h.etat.prescription,
      createdAt: new Date("2026-09-01T08:00:00Z"),
    };
    h.etat.lignes[0]!.rapports = [
      { dateRapport: jour("2025-06-01"), createdAt: new Date("2026-09-10T14:00:00Z") },
    ];
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("error");
    expect(res.status === "error" ? res.message : "").toContain(
      "déposé depuis la saisie de la prescription",
    );
  });

  it("lit les lignes par cible, jamais par `prescriptionId`", async () => {
    poser("2026-09-01", []);
    await supprimerPrescription("etab-1", "presc-1");
    expect(h.prisma.verification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          etablissementId: "etab-1",
          obligationId: "porte-auto-maintien-en-etat",
          equipementId: "eq-portail",
        },
      }),
    );
  });
});
