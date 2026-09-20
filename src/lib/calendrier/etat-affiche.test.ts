import { describe, expect, it } from "vitest";
import { etatSelonCalendrier, type EtatPiece } from "./etat-affiche";
import type { FraicheurCalendrier } from "./fraicheur";

/**
 * Ce que ces tests défendent : la règle ne va QUE dans un sens.
 *
 * Une règle qui rabat un état sur un autre peut se tromper de deux façons —
 * en rassurant à tort (le défaut d'origine) ou en alarmant à tort (ce qu'une
 * correction trop large produirait). Les deux sont couvertes ici, parce que
 * seule la première a été constatée et que rien n'empêcherait la seconde
 * d'arriver par une simplification bien intentionnée.
 */

const INCERTAINS: FraicheurCalendrier[] = [
  { etat: "jamais_genere" },
  { etat: "echec_regeneration" },
  { etat: "perime", sceauPose: "vieux", sceauAttendu: "neuf" },
];
const SAIN: FraicheurCalendrier = { etat: "a_jour" };

describe("etatSelonCalendrier", () => {
  it("un calendrier à jour ne change rien, sur aucun état", () => {
    const tous: EtatPiece[] = ["a_jour", "a_planifier", "en_retard"];
    for (const e of tous) expect(etatSelonCalendrier(SAIN, e)).toBe(e);
  });

  it("SUR UN CALENDRIER INCERTAIN, « à jour » devient « à planifier »", () => {
    // Le défaut d'origine, dit en une ligne : zéro retard sur un calendrier
    // jamais calculé n'est pas une bonne nouvelle.
    for (const f of INCERTAINS) {
      expect(etatSelonCalendrier(f, "a_jour"), f.etat).toBe("a_planifier");
    }
  });

  it("ELLE NE VA QUE DANS UN SENS : un retard reste un retard", () => {
    // La péremption peut AJOUTER des retards, elle n'en retire aucun. Rabattre
    // « en retard » sur « à planifier » effacerait un fait constaté — l'erreur
    // symétrique de celle qu'on corrige, et personne ne la verrait puisqu'elle
    // va dans le sens rassurant.
    for (const f of INCERTAINS) {
      expect(etatSelonCalendrier(f, "en_retard"), f.etat).toBe("en_retard");
    }
  });

  it("« à planifier » reste « à planifier » — la règle est idempotente", () => {
    // Appliquée à son propre résultat, elle le rend. Sans quoi deux appels
    // successifs, ou un appel sur un état déjà rabattu, dériveraient.
    for (const f of [...INCERTAINS, SAIN]) {
      const une = etatSelonCalendrier(f, "a_jour");
      expect(etatSelonCalendrier(f, une)).toBe(une);
    }
  });
});
