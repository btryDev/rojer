import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { etatStripe, findUnique, count } = vi.hoisted(() => ({ etatStripe: vi.fn(), findUnique: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/stripe/config", () => ({ etatStripe }));
// Le vrai module, épié : la garde ne doit pas dépendre de ce que
// `abonnementDuCompte` ne lit rien avant le lancement.
vi.mock("@/lib/abonnements/saisie", async (importOriginal) => {
  const m = await importOriginal<typeof import("@/lib/abonnements/saisie")>();
  return { ...m, abonnementDuCompte: vi.fn(m.abonnementDuCompte) };
});

import type { Db } from "@/lib/auth/compte";
import { abonnementDuCompte } from "./saisie";
import { refusQuotaEtablissements } from "./quotas";

// Le client borné au compte, réduit aux deux lectures de la garde.
const db = { abonnement: { findUnique }, etablissement: { count } } as unknown as Db;

function lancee(formule: string | null, nombre: number) {
  vi.stubEnv("ABONNEMENT_EXIGE", "oui");
  etatStripe.mockReturnValue({ active: true, mode: "test" });
  findUnique.mockResolvedValue(formule === null ? null : { statut: "active", formule });
  count.mockResolvedValue(nombre);
}

describe("refusQuotaEtablissements (ADR-053 § 11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("offre non lancée : aucune lecture, aucun refus", async () => {
    etatStripe.mockReturnValue({ active: true, mode: "test" });
    expect(await refusQuotaEtablissements(db, "c1")).toBeNull();
    vi.stubEnv("ABONNEMENT_EXIGE", "oui");
    etatStripe.mockReturnValue({ active: false, motif: null });
    count.mockResolvedValue(99);
    expect(await refusQuotaEtablissements(db, "c1")).toBeNull();
    expect(abonnementDuCompte).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });

  it("formule inconnue ou pas d'abonnement : pas de plafond, et rien n'est compté", async () => {
    for (const formule of ["rojer_surmesure_annuel", "", null]) {
      lancee(formule, 99);
      expect(await refusQuotaEtablissements(db, "c1"), String(formule)).toBeNull();
    }
    expect(count).not.toHaveBeenCalled();
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { compteId: "c1" } }));
  });

  it("Essentiel : le premier établissement passe, le deuxième est refusé avec la formule qui le permet", async () => {
    lancee("rojer_essentiel_mensuel", 0);
    expect(await refusQuotaEtablissements(db, "c1")).toBeNull();
    lancee("rojer_essentiel_annuel", 1);
    expect(await refusQuotaEtablissements(db, "c1")).toBe(
      "Votre formule Essentiel couvre 1 établissement : passez à Pro depuis la page Abonnement de votre compte pour en ajouter.",
    );
  });

  it("Pro : le cinquième passe, le sixième est refusé sans formule supérieure en libre-service", async () => {
    lancee("rojer_pro_annuel", 4);
    expect(await refusQuotaEtablissements(db, "c1")).toBeNull();
    lancee("rojer_pro_mensuel", 5);
    expect(await refusQuotaEtablissements(db, "c1")).toBe(
      "Votre formule Pro couvre 5 établissements : au-delà, la formule Sur mesure s'établit sur devis.",
    );
  });

  it("un compte déjà au-dessus du quota reste refusé à la création, sans plus", async () => {
    lancee("rojer_essentiel_mensuel", 3);
    expect(await refusQuotaEtablissements(db, "c1")).toMatch(/^Votre formule Essentiel couvre 1 établissement : passez à Pro/);
  });
});
