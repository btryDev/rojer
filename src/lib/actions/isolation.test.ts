import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Non-régression IDOR sur le plan d'actions (ADR-002) : mesures du wizard
 * DUERP (`actions.ts`) et actions correctives (`plan.ts`).
 *
 * Ces server actions écrivaient toutes à partir d'un identifiant reçu du
 * client — `risqueId`, `mesureId`, `actionId`, `verificationId` — sans
 * contrôle de propriété. `supprimerActionPlan` faisait même un `delete` sur
 * l'id brut : l'action corrective d'un autre client disparaissait de son
 * plan sans laisser de trace. Pas de RLS effective en base pour rattraper.
 *
 * Ce fichier couvre aussi deux invariants voisins vérifiés au même endroit :
 * le XOR d'origine d'une action, et le statut initial d'une action créée le
 * jour de son échéance.
 */

const { prismaMock, requireUserMock } = vi.hoisted(() => {
  const modele = () => ({
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  });
  return {
    prismaMock: {
      duerp: modele(),
      uniteTravail: modele(),
      risque: modele(),
      action: modele(),
      verification: modele(),
      rapportVerification: modele(),
    },
    requireUserMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
  getOptionalUser: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  ajouterMesureCustom,
  modifierMesure,
  supprimerMesure,
  toggleMesureReferentiel,
} from "./actions";
import {
  abandonnerAction,
  cloturerAction,
  creerActionDepuisVerification,
  modifierActionPlan,
  rouvrirAction,
  supprimerActionPlan,
} from "./plan";

const USER = { id: "user-legitime", email: "dirigeant@exemple.fr" };

function estNotFound(e: unknown): boolean {
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.includes("404");
}

function aucuneEcriture(): void {
  for (const modele of Object.values(prismaMock)) {
    expect(modele.create).not.toHaveBeenCalled();
    expect(modele.update).not.toHaveBeenCalled();
    expect(modele.delete).not.toHaveBeenCalled();
  }
}

function formulaireActionVerif(echeance?: string): FormData {
  const fd = new FormData();
  fd.set("libelle", "Remplacer le bloc de secours défectueux");
  fd.set("description", "");
  fd.set("type", "protection_collective");
  fd.set("criticite", "");
  fd.set("echeance", echeance ?? "");
  fd.set("responsable", "");
  return fd;
}

function formulaireMesure(): FormData {
  const fd = new FormData();
  fd.set("libelle", "Poser un revêtement antidérapant");
  fd.set("type", "protection_collective");
  fd.set("statut", "prevue");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue(USER);
  for (const modele of Object.values(prismaMock)) {
    modele.findFirst.mockResolvedValue(null);
    modele.findUnique.mockResolvedValue(null);
    modele.findMany.mockResolvedValue([]);
  }
});

describe("mesures du wizard DUERP — identifiant d'un autre client", () => {
  it("toggleMesureReferentiel refuse et n'écrit rien", async () => {
    await expect(
      toggleMesureReferentiel("risque-autre-client", "mesure_ref_1"),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("ajouterMesureCustom refuse et n'écrit rien", async () => {
    await expect(
      ajouterMesureCustom(
        "risque-autre-client",
        { status: "idle" },
        formulaireMesure(),
      ),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("modifierMesure refuse et n'écrit rien", async () => {
    await expect(
      modifierMesure("mesure-autre-client", { statut: "existante" }),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("supprimerMesure refuse et ne supprime rien", async () => {
    await expect(supprimerMesure("mesure-autre-client")).rejects.toSatisfy(
      estNotFound,
    );
    expect(prismaMock.action.delete).not.toHaveBeenCalled();
  });
});

describe("plan d'actions — identifiant d'un autre client", () => {
  it("creerActionDepuisVerification refuse sur une vérification tierce", async () => {
    await expect(
      creerActionDepuisVerification(
        "verif-autre-client",
        { status: "idle" },
        formulaireActionVerif(),
      ),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("modifierActionPlan refuse et n'écrit rien", async () => {
    await expect(
      modifierActionPlan(
        "action-autre-client",
        { status: "idle" },
        formulaireActionVerif(),
      ),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("abandonnerAction refuse et n'écrit rien", async () => {
    await expect(abandonnerAction("action-autre-client")).rejects.toSatisfy(
      estNotFound,
    );
    aucuneEcriture();
  });

  it("cloturerAction refuse et n'écrit rien", async () => {
    const fd = new FormData();
    fd.set("commentaire", "Travaux réalisés le 12/03");
    await expect(
      cloturerAction("action-autre-client", { status: "idle" }, fd),
    ).rejects.toSatisfy(estNotFound);
    aucuneEcriture();
  });

  it("rouvrirAction refuse et n'écrit rien", async () => {
    await expect(rouvrirAction("action-autre-client")).rejects.toSatisfy(
      estNotFound,
    );
    aucuneEcriture();
  });

  it("supprimerActionPlan refuse et ne supprime rien", async () => {
    await expect(supprimerActionPlan("action-autre-client")).rejects.toSatisfy(
      estNotFound,
    );
    expect(prismaMock.action.delete).not.toHaveBeenCalled();
  });
});

describe("cloturerAction — justificatif d'un autre client", () => {
  it("refuse un rapport qui n'est pas de l'établissement de l'action", async () => {
    prismaMock.action.findFirst.mockResolvedValue({
      id: "a1",
      etablissementId: "e1",
      statut: "ouverte",
      risqueId: null,
      verificationId: "v1",
    });
    // Le rapport visé appartient à un autre établissement : la requête
    // scopée sur `etablissementId` ne le trouve pas.
    prismaMock.rapportVerification.findFirst.mockResolvedValue(null);

    const fd = new FormData();
    fd.set("commentaire", "Levée sur rapport tiers");
    fd.set("rapportId", "rapport-autre-client");

    const res = await cloturerAction("a1", { status: "idle" }, fd);

    expect(res.status).toBe("error");
    expect(prismaMock.action.update).not.toHaveBeenCalled();
  });
});

describe("creerActionDepuisVerification — statut initial et origine", () => {
  // Horloge figée au 10 août 2026 à 08:00 heure de Paris (06:00 UTC, on est
  // en heure d'été). C'est exactement la configuration qui piégeait l'ancien
  // calcul : il est 08:00 pour l'utilisateur, mais une échéance du jour est
  // stockée à minuit UTC, donc déjà « passée » face à un `new Date()` brut.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T06:00:00.000Z"));
    prismaMock.verification.findFirst.mockResolvedValue({
      id: "v1",
      etablissementId: "e1",
    });
    prismaMock.action.create.mockResolvedValue({ id: "a1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("une échéance fixée au jour même naît « ouverte », pas « en cours »", async () => {
    // `estActionEnRetard` (lib/dates/retard, ADR-011) borne le retard au
    // début du jour civil de Paris : aujourd'hui n'est jamais en retard,
    // l'utilisateur a toute sa journée.
    const res = await creerActionDepuisVerification(
      "v1",
      { status: "idle" },
      formulaireActionVerif("2026-08-10"),
    );

    expect(res.status).toBe("success");
    expect(prismaMock.action.create.mock.calls[0][0].data.statut).toBe(
      "ouverte",
    );
  });

  it("une échéance d'hier naît « en cours »", async () => {
    await creerActionDepuisVerification(
      "v1",
      { status: "idle" },
      formulaireActionVerif("2026-08-09"),
    );

    expect(prismaMock.action.create.mock.calls[0][0].data.statut).toBe(
      "en_cours",
    );
  });

  it("une action sans échéance naît « ouverte »", async () => {
    await creerActionDepuisVerification(
      "v1",
      { status: "idle" },
      formulaireActionVerif(),
    );

    expect(prismaMock.action.create.mock.calls[0][0].data.statut).toBe(
      "ouverte",
    );
  });

  it("respecte le XOR d'origine : vérification renseignée, risque absent", async () => {
    await creerActionDepuisVerification(
      "v1",
      { status: "idle" },
      formulaireActionVerif(),
    );

    const data = prismaMock.action.create.mock.calls[0][0].data;
    expect(data.verificationId).toBe("v1");
    expect(data.risqueId).toBeUndefined();
  });
});
