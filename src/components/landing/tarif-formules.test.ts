import { describe, expect, it } from "vitest";
import { FORMULES, type Quotas } from "@/lib/abonnements/formules";
import { GRILLE, INCLUS, NON_INCLUS } from "./tarif-grille";

/**
 * La grille du tarif (page publique) recopie les volumes que `FORMULES`
 * applique : ce test les compare, pour qu'une formule changée sans sa page
 * (ou l'inverse) casse ici plutôt que chez un client.
 * Colonnes de la grille : 0 Essai, 1 Essentiel, 2 Pro, 3 Sur mesure.
 */
const LIGNES: Record<string, keyof Quotas> = {
  Établissements: "etablissements",
  Utilisateurs: "membres",
  "Signatures électroniques": "signaturesParAn",
  "Liens d'accès prestataires actifs": "liensAccesActifs",
  "Permis de feu (brouillons imprimables pendant l'essai)": "permisDeFeuParAn",
  "Plans de prévention (idem)": "plansDePreventionParAn",
  "Prestataires suivis (attestations, vigilance)": "prestataires",
  "Stockage des documents": "stockageGo",
  "Import d'un DUERP existant": "importsDuerp",
};

const lignes = GRILLE.flatMap((g) => g.lignes);
const caseDe = (libelle: string, colonne: number) => {
  const ligne = lignes.find((l) => l.libelle === libelle);
  if (!ligne) throw new Error(`ligne absente de la grille : ${libelle}`);
  return ligne.cases[colonne];
};
const nombre = (texte: string) => Number(texte.match(/\d+/)?.[0]);

describe("la grille du tarif suit FORMULES", () => {
  for (const [libelle, cle] of Object.entries(LIGNES)) {
    it(`${libelle} : Essentiel et Pro`, () => {
      expect(nombre(caseDe(libelle, 1))).toBe(FORMULES.essentiel.quotas[cle]);
      expect(nombre(caseDe(libelle, 2))).toBe(FORMULES.pro.quotas[cle]);
    });
  }

  it("Connecter un assistant IA", () => {
    const attendu = (oui: boolean) => (oui ? INCLUS : NON_INCLUS);
    expect(caseDe("Connecter un assistant IA", 1)).toBe(attendu(FORMULES.essentiel.quotas.connecterUnAssistant));
    expect(caseDe("Connecter un assistant IA", 2)).toBe(attendu(FORMULES.pro.quotas.connecterUnAssistant));
  });

  it("Rendez-vous avec l'expert", () => {
    expect(FORMULES.essentiel.quotas.heuresExpertParAn).toBe(0);
    expect(caseDe("Rendez-vous avec l'expert", 1)).toBe(NON_INCLUS);
    expect(nombre(caseDe("Rendez-vous avec l'expert", 2))).toBe(FORMULES.pro.quotas.heuresExpertParAn);
  });
});
