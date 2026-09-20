import { describe, expect, it } from "vitest";
import {
  reponseSommeilSuivantLeType,
  TYPES_ERP_QUESTION_LOCAUX_SOMMEIL,
} from "./schema";

/**
 * La réponse à la question du sommeil SUIT LE TYPE (arbitrage du 2026-09-21).
 *
 * Le piège que ce fichier tient : la question n'est affichée qu'à certains
 * types ; un champ masqué n'est pas posté, et un champ non posté n'écrit rien.
 * Un hôtel devenu restaurant aurait donc gardé son « oui » en base — et ses
 * quatre lignes, puisque dans le moteur une réponse explicite l'emporte —,
 * sans plus aucun écran pour le corriger.
 */
describe("reponseSommeilSuivantLeType", () => {
  it("L'HÔTEL DEVENU RESTAURANT perd sa réponse avec sa question", () => {
    const apres = reponseSommeilSuivantLeType({
      estERP: true,
      typeErp: "N",
      comporteLocauxSommeilPublic: true,
    });
    expect(apres.comporteLocauxSommeilPublic).toBeNull();
  });

  it("un ERP décoché perd sa réponse, quel que soit son ancien type", () => {
    const apres = reponseSommeilSuivantLeType({
      estERP: false,
      typeErp: "O",
      comporteLocauxSommeilPublic: true,
    });
    expect(apres.comporteLocauxSommeilPublic).toBeNull();
  });

  it("NE TOUCHE PAS à la réponse d'un type à qui la question est posée", () => {
    // Le pendant : sans lui, remettre `null` partout passerait au vert — et
    // effacerait le « non » d'un centre de formation à chaque enregistrement.
    for (const typeErp of TYPES_ERP_QUESTION_LOCAUX_SOMMEIL) {
      for (const reponse of [true, false]) {
        const apres = reponseSommeilSuivantLeType({
          estERP: true,
          typeErp,
          comporteLocauxSommeilPublic: reponse,
        });
        expect(apres.comporteLocauxSommeilPublic, typeErp).toBe(reponse);
      }
    }
  });

  it("laisse intacts les autres champs", () => {
    const avant = {
      estERP: true,
      typeErp: "M",
      comporteLocauxSommeilPublic: false,
      raisonDisplay: "La Boutique",
    };
    expect(reponseSommeilSuivantLeType(avant)).toEqual({
      ...avant,
      comporteLocauxSommeilPublic: null,
    });
  });
});
