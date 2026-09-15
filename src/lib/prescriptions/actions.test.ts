import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  compterLignesAvecPreuve,
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

describe("aucune borne de levée dans le compte (2026-09-15, relecture d'intégration)", () => {
  it("un rapport déposé sous la prescription compte encore après une levée, même antidatée", () => {
    // ~~Un rapport daté APRÈS la levée n'a pas été fait sous l'acte.~~ La borne
    // rendait supprimable un acte levé « au 01/06/2024 » après deux rapports de
    // 2025. Le compte ne lit plus la levée : `PrescriptionAPreuver` ne la porte
    // même plus.
    expect(compterLignesAvecPreuve(renforcement("2024-01-01"), [ligne(["2025-03-10"])])).toBe(1);
  });

  it("compare des JOURS de Paris, pas des instants", () => {
    // Acte stocké à minuit UTC le 10 janvier (1 h à Paris) ; un rapport daté du
    // même jour à minuit Paris est un instant ANTÉRIEUR à l'acte. En instants,
    // il ne comptait pas ; en jours, il est du jour de l'acte, et compte.
    const p = renforcement("2026-01-10");
    const minuitParis: LigneVisee = {
      statut: "planifiee",
      rapports: [
        {
          dateRapport: new Date("2026-01-09T23:00:00Z"),
          createdAt: new Date("2026-01-10T10:00:00Z"),
        },
      ],
      nbActions: 0,
    };
    expect(compterLignesAvecPreuve(p, [minuitParis])).toBe(1);
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
      { effet: "renforce_periodicite", acte: "2025-12-01", levee: true },
      1,
    );
    expect(r).toContain("du 01/12/2025 ou après");
    expect(r).not.toMatch(/levez-la/i);
  });

  it("accorde la liste d'une obligation sur mesure sans « fait » pendant", () => {
    const r = raisonDuRefus(
      { effet: "obligation_sur_mesure", acte: "2025-12-01", levee: false },
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

describe("leverPrescription — la levée garde la date de la pièce (2026-09-15)", () => {
  // La garde qui refusait une levée antérieure au dernier rapport est retirée :
  // elle empêchait d'enregistrer la vraie date. C'est la suppression qui
  // protège désormais, en comptant les preuves sans borne de levée.
  const poser = (effet: "renforce_periodicite" | "obligation_sur_mesure" = "renforce_periodicite") => {
    h.etat.prescription = {
      ...renforcement("2024-01-01"),
      effet,
      createdAt: new Date("2024-01-01T09:00:00Z"),
      dateFin: null,
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

  it("accepte une levée le jour même d'un rapport (le PV et le rapport du même jour)", async () => {
    poser();
    expect((await lever("2025-09-12")).status).toBe("success");
  });

  it("accepte une levée antidatée, et la suppression reste refusée", async () => {
    poser();
    expect((await lever("2024-06-01")).status).toBe("success");
    // Levée désormais « au 01/06/2024 » : les rapports de 2025 comptent encore.
    h.etat.prescription = { ...h.etat.prescription, dateFin: jour("2024-06-01") };
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("error");
    expect(h.prisma.prescriptionParticuliere.delete).not.toHaveBeenCalled();
  });

  it("une obligation sur mesure se lève à la date voulue", async () => {
    poser("obligation_sur_mesure");
    expect((await lever("2024-06-01")).status).toBe("success");
  });
});

describe("supprimerPrescription", () => {
  const poser = (dateDocument: string, rapports: string[]) => {
    h.etat.prescription = { ...renforcement(dateDocument), dateFin: null, actif: true };
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
