import { describe, expect, it } from "vitest";
import { rapportMetadataSchema } from "./schema";
import {
  estResultatRealise,
  RESULTATS,
  STATUT_DEPUIS_RESULTAT,
} from "./resultats";

describe("rapportMetadataSchema", () => {
  it("accepte une saisie minimale valide", () => {
    const res = rapportMetadataSchema.safeParse({
      dateRapport: "2026-03-15",
      resultat: "conforme",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.dateRapport).toBeInstanceOf(Date);
  });

  it("refuse une date au format FR", () => {
    const res = rapportMetadataSchema.safeParse({
      dateRapport: "15/03/2026",
      resultat: "conforme",
    });
    expect(res.success).toBe(false);
  });

  it("refuse un résultat inconnu", () => {
    const res = rapportMetadataSchema.safeParse({
      dateRapport: "2026-03-15",
      resultat: "bizarre",
    });
    expect(res.success).toBe(false);
  });

  it("vide l'organisme si espaces seulement", () => {
    const res = rapportMetadataSchema.safeParse({
      dateRapport: "2026-03-15",
      resultat: "conforme",
      organismeVerif: "   ",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.organismeVerif).toBeUndefined();
  });

  it("refuse un commentaire trop long", () => {
    const res = rapportMetadataSchema.safeParse({
      dateRapport: "2026-03-15",
      resultat: "conforme",
      commentaires: "x".repeat(2001),
    });
    expect(res.success).toBe(false);
  });
});

describe("STATUT_DEPUIS_RESULTAT", () => {
  it("mappe chaque résultat réalisé sur un statut Prisma cohérent", () => {
    expect(STATUT_DEPUIS_RESULTAT.conforme).toBe("realisee_conforme");
    expect(STATUT_DEPUIS_RESULTAT.observations_mineures).toBe(
      "realisee_observations",
    );
    expect(STATUT_DEPUIS_RESULTAT.ecart_majeur).toBe("realisee_ecart_majeur");
  });

  // Garde-fou de non-régression : c'est cette entrée, avec sa valeur
  // « a_planifier », qui faisait passer une vérification non réalisable pour
  // réalisée (dateRealisee écrite) puis détruire le rapport à la régénération
  // suivante. Elle ne doit jamais réapparaître.
  it("n'expose aucun statut pour « non vérifiable »", () => {
    expect(
      Object.keys(STATUT_DEPUIS_RESULTAT).includes("non_verifiable"),
    ).toBe(false);
  });

  it("couvre exactement les résultats valant réalisation du contrôle", () => {
    const realises = RESULTATS.filter(estResultatRealise);
    expect(realises).toEqual([
      "conforme",
      "observations_mineures",
      "ecart_majeur",
    ]);
    expect(estResultatRealise("non_verifiable")).toBe(false);
    expect(Object.keys(STATUT_DEPUIS_RESULTAT).sort()).toEqual(
      [...realises].sort(),
    );
  });
});
