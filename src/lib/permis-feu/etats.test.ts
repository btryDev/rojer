import { describe, expect, it } from "vitest";
import { ETAT_PERMIS, libellePastillePermis, titreSignaturesPermis } from "./etats";

/**
 * Le défaut que ce fichier ferme, et qu'il a fallu corriger deux fois.
 *
 * La pastille de la fiche construisait son libellé en interpolant le mot de
 * `ETAT_PERMIS` — `` `1 ${mot}` ``. Tant que la table portait « signature
 * manquante », le rendu était juste. Quand le mot a été unifié avec celui de
 * la liste — « En attente de signatures » —, l'interpolation n'a pas suivi et
 * l'écran a affiché « **1 En attente de signatures** ».
 *
 * Ce n'était pas un cas limite : c'est l'état intermédiaire normal du module,
 * une signature recueillie sur deux. Et rien ne l'a signalé, parce qu'aucun
 * test n'accompagnait la correction qui l'a introduit.
 */
describe("libellePastillePermis", () => {
  it("accorde le singulier — le défaut historique", () => {
    expect(libellePastillePermis("attente_signatures", 1)).toBe(
      "1 signature manquante",
    );
  });

  it("accorde le pluriel", () => {
    expect(libellePastillePermis("attente_signatures", 2)).toBe(
      "2 signatures manquantes",
    );
  });

  it("ne concatène jamais le mot de la table au décompte", () => {
    // La forme exacte du bogue : le libellé ne doit pas contenir le mot d'état
    // précédé d'un chiffre. Ce test tombe si quelqu'un réintroduit
    // l'interpolation, quel que soit le mot que la table portera alors.
    //
    // DEUX antislashs, pas quatre. La première version en portait quatre : dans
    // un gabarit, cela produit la chaîne `\\d+\\s+…`, donc une regex qui
    // cherche un antislash littéral suivi d'un `d`. Elle n'appariait jamais
    // rien, et le `not.toMatch` était vrai par construction — le test le plus
    // important du fichier ne testait rien.
    //
    // C'est le même mode de panne que le motif `/^scripts\/mcp-server\.ts$/`
    // corrigé le même jour sur l'autre branche : une expression régulière qui
    // ne peut structurellement rien attraper, dans une garde qui affirme
    // couvrir.
    const motif = new RegExp(
      `\\d+\\s+${ETAT_PERMIS.attente_signatures.mot}`,
    );
    // Le motif se vérifie lui-même avant de servir : sans cela, on ne saurait
    // pas s'il regarde au bon endroit.
    expect("1 " + ETAT_PERMIS.attente_signatures.mot).toMatch(motif);

    for (const n of [0, 1, 2, 5]) {
      expect(libellePastillePermis("attente_signatures", n)).not.toMatch(motif);
    }
  });

  it("retombe sur le mot d'état quand il ne manque rien", () => {
    // `manquantes <= 0` alors que le statut est encore « en attente » : le
    // décompte n'a rien à dire, le statut si.
    expect(libellePastillePermis("attente_signatures", 0)).toBe(
      ETAT_PERMIS.attente_signatures.mot,
    );
  });

  it("ignore le décompte sur tout autre statut", () => {
    expect(libellePastillePermis("en_cours", 3)).toBe(
      ETAT_PERMIS.en_cours.mot,
    );
    expect(libellePastillePermis("annule", 1)).toBe(ETAT_PERMIS.annule.mot);
  });

  it("le titre de la section et la pastille disent le même décompte (2026-10-12)", () => {
    for (const n of [1, 2]) {
      expect(titreSignaturesPermis(n)).toBe(libellePastillePermis("attente_signatures", n));
    }
    expect(titreSignaturesPermis(0)).toBe("Permis co-signé et valide");
  });

  it("nomme les six statuts de l'enum", () => {
    // `Record` exhaustif : ajouter une valeur sans la nommer ne compile pas.
    // Ce test garde en plus qu'aucun libellé ne reste vide.
    for (const [statut, { mot }] of Object.entries(ETAT_PERMIS)) {
      expect(mot.length, statut).toBeGreaterThan(0);
    }
    expect(Object.keys(ETAT_PERMIS)).toHaveLength(6);
  });
});
