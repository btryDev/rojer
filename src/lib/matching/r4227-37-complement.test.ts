import { describe, expect, it } from "vitest";
import {
  determineObligationsApplicables,
  type EtablissementMatching,
} from "./index";
import { CATEGORIES_ERP } from "@/lib/referentiels/types-communs";

/**
 * R. 4227-37, relu sur l'API Légifrance le 2026-09-27 : la consigne affichée
 * dans le champ de R. 4227-34, des instructions d'évacuation « dans les autres
 * établissements ». Et R. 4227-34 lui-même : être équipé d'une alarme sonore.
 *
 * Ce qui est tenu, chaque sens éprouvé :
 *  - hors du champ ÉTABLI (seuil non atteint ET matières « non ») : les
 *    instructions, jamais la consigne ;
 *  - dans le champ : la consigne et l'alarme, jamais les instructions ;
 *  - au silence : la consigne et l'alarme « à confirmer », pas les
 *    instructions — l'allègement ne se donne pas sur une absence supposée ;
 *  - jamais les deux, jamais aucune, sur toute combinaison engendrée.
 */

const CONSIGNE = "incendie-travail-consigne-affichee";
const INSTRUCTIONS = "incendie-travail-instructions-evacuation";
const ALARME = "incendie-travail-alarme-sonore";

const e = (over: Partial<EtablissementMatching>): EtablissementMatching => ({
  id: "e",
  effectifSurSite: 8,
  effectifEntreprise: 8,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  chiffonsImpregnes: null,
  ...over,
});
const ids = (x: EtablissementMatching) =>
  new Map(determineObligationsApplicables(x, []).map((o) => [o.obligation.id, o]));

describe("R. 4227-37 et R. 4227-34 : consigne, instructions, alarme", () => {
  it("hors du champ établi : les instructions seules", () => {
    const r = ids(e({ manipuleMatieresR422722: false }));
    expect(r.has(INSTRUCTIONS)).toBe(true);
    expect(r.has(CONSIGNE)).toBe(false);
    expect(r.has(ALARME)).toBe(false);
  });

  it("dans le champ (matières « oui », ou plus de cinquante) : consigne et alarme, pas d'instructions", () => {
    for (const x of [e({ manipuleMatieresR422722: true }), e({ effectifSurSite: 60, effectifEntreprise: 60 })]) {
      const r = ids(x);
      expect(r.has(CONSIGNE)).toBe(true);
      expect(r.has(ALARME)).toBe(true);
      expect(r.has(INSTRUCTIONS)).toBe(false);
    }
  });

  it("au silence : consigne et alarme « à confirmer », pas d'instructions", () => {
    const r = ids(e({}));
    expect(r.get(CONSIGNE)?.sansReponse).toEqual(["matieres_r4227_22"]);
    expect(r.get(ALARME)?.sansReponse).toEqual(["matieres_r4227_22"]);
    expect(r.has(INSTRUCTIONS)).toBe(false);
  });

  it("jamais les deux, jamais aucune — sur les combinaisons engendrées", () => {
    const erreurs: string[] = [];
    for (const matieres of [true, false, null])
      for (const personnes of [null, 10, 50, 51])
        for (const eff of [2, 50, 51])
          for (const erp of [null, ...CATEGORIES_ERP]) {
            const x = e({
              manipuleMatieresR422722: matieres,
              personnesPresentesHabituellement: personnes,
              effectifSurSite: eff,
              effectifEntreprise: eff,
              ...(erp ? { estERP: true, typeErp: "N", categorieErp: erp } : {}),
            });
            const r = ids(x);
            if (r.has(CONSIGNE) === r.has(INSTRUCTIONS)) {
              erreurs.push(JSON.stringify({ matieres, personnes, eff, erp, consigne: r.has(CONSIGNE) }));
            }
          }
    expect(erreurs).toEqual([]);
  });
});
