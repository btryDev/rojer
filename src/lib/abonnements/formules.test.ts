import { describe, expect, it } from "vitest";
import { FORMULES, LOOKUP_KEYS, formuleDeLookupKey, lookupKey, sousLeQuota } from "./formules";

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

  it("au quota, la création suivante est refusée ; nul veut dire illimité", () => {
    expect(sousLeQuota(1, 0)).toBe(true);
    expect(sousLeQuota(1, 1)).toBe(false);
    expect(sousLeQuota(null, 10_000)).toBe(true);
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
