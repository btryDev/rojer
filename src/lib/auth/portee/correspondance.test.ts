// La table de correspondance couvre tout le schéma, et chaque chemin mène au
// compte par des relations obligatoires (ADR-051 § 1). La liste des modèles
// est lue dans le schéma généré : un modèle ajouté demain sans classement fait
// tomber ce test en le nommant.

import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { CORRESPONDANCE, estHorsCompte, estRacine } from "./correspondance";

const MODELES = Prisma.dmmf.datamodel.models;
const PAR_NOM = new Map(MODELES.map((m) => [m.name, m]));

describe("table de correspondance", () => {
  it("le schéma est bien lu (borne basse)", () => {
    expect(MODELES.length).toBeGreaterThan(30);
  });

  it("classe chaque modèle du schéma", () => {
    const manquants = MODELES.map((m) => m.name).filter((n) => !(n in CORRESPONDANCE));
    expect(manquants).toEqual([]);
  });

  it("ne classe aucun modèle absent du schéma", () => {
    const fantomes = Object.keys(CORRESPONDANCE).filter((n) => !PAR_NOM.has(n));
    expect(fantomes).toEqual([]);
  });

  it.each(Object.entries(CORRESPONDANCE).filter(([, c]) => !estHorsCompte(c)))(
    "%s mène à une racine par des relations obligatoires",
    (nom) => {
      const vus = new Set<string>();
      let courant = nom;
      for (;;) {
        expect(vus.has(courant), `cycle en ${courant}`).toBe(false);
        vus.add(courant);
        const c = CORRESPONDANCE[courant];
        expect(c, `${courant} non classé`).toBeDefined();
        expect(estHorsCompte(c), `${courant} mène à un modèle hors compte`).toBe(false);
        const m = PAR_NOM.get(courant)!;
        if (estRacine(c)) {
          const champ = m.fields.find((f) => f.name === c.racine);
          expect(champ?.kind, `${courant}.${c.racine}`).toBe("scalar");
          break;
        }
        if (estHorsCompte(c)) break;
        const r = m.fields.find((f) => f.name === c.parent);
        expect(r?.kind, `${courant}.${c.parent} n'est pas une relation`).toBe("object");
        expect(r?.isList, `${courant}.${c.parent} est une liste`).toBe(false);
        expect(r?.isRequired, `${courant}.${c.parent} est facultative`).toBe(true);
        courant = r!.type;
      }
      expect(courant).toMatch(/^(Entreprise|DemandeAssistance)$/);
    },
  );

  it("aucune clé étrangère composée vers un modèle du compte (borne.ts la refuserait)", () => {
    const composees = MODELES.flatMap((m) =>
      m.fields
        .filter((f) => f.kind === "object" && (f.relationFromFields?.length ?? 0) > 1)
        .filter((f) => !estHorsCompte(CORRESPONDANCE[f.type] ?? { horsCompte: "" }))
        .map((f) => `${m.name}.${f.name}`),
    );
    expect(composees).toEqual([]);
  });

  it("un modèle hors compte (identité exceptée) n'est la cible d'aucune relation d'un modèle du compte", () => {
    // L'identité (`User`) est la seule cible permise : la racine y pointe.
    const hors = new Set(Object.keys(CORRESPONDANCE).filter((n) => "horsCompte" in CORRESPONDANCE[n]));
    const liens = MODELES.filter((m) => !estHorsCompte(CORRESPONDANCE[m.name])).flatMap((m) =>
      m.fields.filter((f) => f.kind === "object" && hors.has(f.type)).map((f) => `${m.name}.${f.name}`),
    );
    expect(liens).toEqual([]);
  });
});
