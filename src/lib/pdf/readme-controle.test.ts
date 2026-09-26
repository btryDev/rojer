import { describe, expect, it } from "vitest";
import { genererReadme } from "./readme-controle";

const base: Parameters<typeof genererReadme>[0] = {
  raisonSociale: "Btry",
  etablissement: "Le Comptoir",
  adresse: "1 rue des Lilas",
  dateNow: "26/09/2026",
  duerpNumeroVersion: null,
  aDuerpPdf: false,
  aRegistreAccessibilite: false,
  nbPrestataires: 0,
  nbPermisFeu: 0,
  nbPlansPrevention: 0,
  aCarnetSanitaire: false,
  nbEcheancesContractuelles: 0,
  etatDuerp: null,
  nbVerifsEnRetard: 0,
  avertissementCalendrier: null,
  inventaire: null,
};

const INVENTAIRE = {
  axe: "inventaire" as const,
  motif: "Aucun équipement en service n'est déclaré pour cet établissement.",
  consequence: "Aucune vérification attachée à un équipement ne peut donc figurer au calendrier ni au registre.",
};

/** Le README recoupé à 60 colonnes : on recolle les lignes pour chercher. */
const aplati = (t: string) => t.replace(/\n /g, " ");

describe("le README du ZIP dit « aucun équipement déclaré » (§ 15)", () => {
  it("l'écrit en tête, avant le contenu du dossier", () => {
    const t = aplati(genererReadme({ ...base, inventaire: INVENTAIRE }));
    const fait = t.indexOf(INVENTAIRE.motif);
    expect(fait).toBeGreaterThan(-1);
    expect(t).toContain(INVENTAIRE.consequence);
    expect(fait).toBeLessThan(t.indexOf("CONTENU DU DOSSIER"));
  });

  it("n'écrit rien quand l'inventaire n'est pas vide", () => {
    const t = genererReadme(base);
    expect(t).not.toContain("Aucun équipement");
    expect(t).not.toContain("À LIRE AVANT LE RESTE");
  });

  it("tient les deux faits ensemble sous le même titre", () => {
    const t = aplati(
      genererReadme({
        ...base,
        avertissementCalendrier: "Le calendrier n'a pas encore été calculé.",
        inventaire: INVENTAIRE,
      }),
    );
    expect(t.match(/À LIRE AVANT LE RESTE/g)).toHaveLength(1);
    expect(t).toContain("Le calendrier n'a pas encore été calculé.");
    expect(t).toContain(INVENTAIRE.motif);
  });
});
