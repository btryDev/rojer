import { beforeEach, describe, expect, it, vi } from "vitest";

// La suppression d'une prescription, sur un client simulé : ce qui est tenu ici
// est la GARDE — ce que le serveur refuse de détruire —, pas la base.

const h = vi.hoisted(() => {
  const etat = {
    prescription: null as { actif: boolean; dateFin: Date | null } | null,
    lignesAvecPreuve: 0,
  };
  const prisma = {
    prescriptionParticuliere: {
      findFirst: vi.fn(async () => etat.prescription),
      delete: vi.fn(async () => ({})),
    },
    verification: {
      count: vi.fn(async () => etat.lignesAvecPreuve),
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

const { supprimerPrescription } = await import("./actions");

const JOUR = 24 * 60 * 60 * 1000;

beforeEach(() => {
  h.etat.prescription = null;
  h.etat.lignesAvecPreuve = 0;
  vi.clearAllMocks();
});

describe("supprimerPrescription — ce qui ne se détruit pas", () => {
  it("refuse une prescription LEVÉE, même quand plus aucune ligne ne la porte (2026-09-15)", async () => {
    // LE SCÉNARIO DE LA RELECTURE : une demande d'assureur rend
    // `porte-auto-maintien-en-etat` semestrielle, un rapport est déposé, la
    // prescription est levée. La régénération rend à la ligne le rythme du
    // référentiel et remet `prescriptionId` à `null` : le compte des lignes
    // porteuses de preuve tombe à ZÉRO. Sans la garde, la suppression passait,
    // et l'acte qui justifiait le rythme du rapport disparaissait.
    h.etat.prescription = {
      actif: true,
      dateFin: new Date(Date.now() - 30 * JOUR),
    };
    h.etat.lignesAvecPreuve = 0;

    const res = await supprimerPrescription("etab-1", "presc-1");

    expect(res.status).toBe("error");
    expect(h.prisma.prescriptionParticuliere.delete).not.toHaveBeenCalled();
  });

  it("refuse aussi une prescription désactivée", async () => {
    h.etat.prescription = { actif: false, dateFin: null };
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("error");
    expect(h.prisma.prescriptionParticuliere.delete).not.toHaveBeenCalled();
  });

  it("accepte une prescription en vigueur qui n'a rien produit de probant — la saisie erronée", async () => {
    // Le témoin : sans lui, la garde pourrait refuser toute suppression.
    h.etat.prescription = { actif: true, dateFin: null };
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("success");
    expect(h.prisma.prescriptionParticuliere.delete).toHaveBeenCalledTimes(1);
  });

  it("une levée programmée n'est pas encore une levée : ses lignes la portent toujours", async () => {
    // `dateFin` future : la surcharge s'applique encore, la régénération laisse
    // `prescriptionId` sur les lignes, et c'est le compte qui décide. C'est
    // aussi ce que l'écran affiche — « active », bouton de suppression compris.
    h.etat.prescription = {
      actif: true,
      dateFin: new Date(Date.now() + 30 * JOUR),
    };
    h.etat.lignesAvecPreuve = 0;
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("success");
  });

  it("refuse une prescription en vigueur dont une ligne porte une preuve", async () => {
    h.etat.prescription = { actif: true, dateFin: null };
    h.etat.lignesAvecPreuve = 2;
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("error");
    expect(h.prisma.prescriptionParticuliere.delete).not.toHaveBeenCalled();
  });
});
