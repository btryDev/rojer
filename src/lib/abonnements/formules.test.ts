import { describe, expect, it } from "vitest";
import { FORMULES, LOOKUP_KEYS, estLookupKey, formuleDeLookupKey, formuleDuPrix, lookupKey, pointsDeFormule } from "./formules";

describe("formules", () => {
  it("une lookup_key par formule et par périodicité, relue à l'identique", () => {
    expect(LOOKUP_KEYS).toEqual(["rojer_essentiel_mensuel", "rojer_essentiel_annuel", "rojer_pro_mensuel", "rojer_pro_annuel"]);
    for (const cle of LOOKUP_KEYS) expect(lookupKey(formuleDeLookupKey(cle)!.formule, formuleDeLookupKey(cle)!.periodicite)).toBe(cle);
  });

  it("Stripe ne lit que 10 lookup_keys par requête : le catalogue doit y tenir", () => {
    expect(LOOKUP_KEYS.length).toBeLessThanOrEqual(10);
  });

  it("une clé inconnue ne donne aucune formule — jamais une formule par défaut", () => {
    for (const cle of [null, undefined, "", "suivi_annuel", "rojer_surmesure_mensuel", "rojer_pro_trimestriel", "rojer_constructor_mensuel", "rojer_pro_annuel_x"]) {
      expect(formuleDeLookupKey(cle), String(cle)).toBeNull();
    }
  });

  it("Pro va au moins aussi loin qu'Essentiel sur chaque quota", () => {
    const e = FORMULES.essentiel.quotas;
    const p = FORMULES.pro.quotas;
    for (const k of Object.keys(e) as (keyof typeof e)[]) {
      const [a, b] = [e[k], p[k]];
      if (typeof a === "boolean") expect(b === true || a === false, k).toBe(true);
      else expect(b === null || (a !== null && (b as number) >= a), k).toBe(true);
    }
  });
});

describe("formuleDuPrix, estLookupKey, libellés", () => {
  it("la clé du prix, sinon ses metadata ; jamais une formule inventée", () => {
    expect(formuleDuPrix({ lookup_key: "rojer_pro_mensuel" })).toBe("rojer_pro_mensuel");
    expect(formuleDuPrix({ lookup_key: null, metadata: { formule: "pro", periodicite: "annuel" } })).toBe("rojer_pro_annuel");
    expect(formuleDuPrix({ lookup_key: null, metadata: { formule: "surmesure", periodicite: "annuel" } })).toBeNull();
    expect(formuleDuPrix({ lookup_key: null, metadata: { formule: "pro", periodicite: "trimestriel" } })).toBeNull();
    expect(formuleDuPrix({ lookup_key: "autre", metadata: null })).toBeNull();
  });

  it("estLookupKey n'accepte que le catalogue", () => {
    expect(estLookupKey("rojer_essentiel_annuel")).toBe(true);
    for (const v of ["", "rojer_surmesure_annuel", 12, null]) expect(estLookupKey(v)).toBe(false);
  });

  it("les points d'une formule : établissements et utilisateurs au singulier comme au pluriel", () => {
    expect(pointsDeFormule("essentiel").slice(0, 2)).toEqual(["1 établissement", "1 utilisateur"]);
    expect(pointsDeFormule("pro").slice(0, 2)).toEqual(["5 établissements", "5 utilisateurs"]);
  });
});
