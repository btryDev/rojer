import { describe, expect, it } from "vitest";
import { lignesPointDeReleve, NB_RELEVES_DU_DOSSIER } from "./export";

const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const releve = (iso: string) => ({
  dateReleve: jour(iso),
  temperatureCelsius: 55,
  conforme: true,
});
const point = (n: number) => ({
  nom: "Retour de boucle",
  localisation: null,
  typeReseau: "ECS_BOUCLAGE" as const,
  seuilMinCelsius: 50,
  releves: Array.from({ length: n }, (_, i) => releve(`2026-09-${String(i + 1).padStart(2, "0")}`)),
});

describe("lignesPointDeReleve — la pièce carnet sanitaire de l'export contrôle", () => {
  it("le libellé dit le nombre de relevés listés, pas la borne de la requête", () => {
    // Contrôle visuel du 2026-10-13 : « 10 derniers relevés : » suivi de six.
    const l = lignesPointDeReleve(point(6));
    expect(l).toContain("  6 derniers relevés :");
    expect(l.join("\n")).not.toContain(`${NB_RELEVES_DU_DOSSIER} derniers`);
    expect(l.filter((x) => x.startsWith("    "))).toHaveLength(6);
  });

  it("à la borne, le nombre est la borne", () => {
    expect(lignesPointDeReleve(point(NB_RELEVES_DU_DOSSIER))).toContain(
      `  ${NB_RELEVES_DU_DOSSIER} derniers relevés :`,
    );
  });

  it("un seul relevé, aucun relevé : pas de pluriel fabriqué", () => {
    expect(lignesPointDeReleve(point(1))).toContain("  Dernier relevé :");
    expect(lignesPointDeReleve(point(0))).toContain("  Aucun relevé enregistré.");
  });

  it("le type de réseau est le libellé de l'écran, jamais l'énumération", () => {
    const texte = lignesPointDeReleve(point(1)).join("\n");
    expect(texte).toContain("Type : ECS — bouclage");
    expect(texte).not.toMatch(/ECS_BOUCLAGE/);
  });
});
