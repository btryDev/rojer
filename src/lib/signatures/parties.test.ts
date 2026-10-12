import { describe, expect, it } from "vitest";
import type { PartieSignataire } from "@prisma/client";
import { partieRecevable, repartirSignatures } from "./parties";

/**
 * La répartition que lisent les deux fiches (plan, permis) — audit du
 * 2026-10-12, constat 7. Les cas sont ceux que l'adresse trompait.
 */
const sig = (id: string, partie: PartieSignataire | null, email = "chef@ee.fr") => ({
  id,
  partie,
  signataireEmail: email,
});

describe("repartirSignatures", () => {
  it("deux signatures de la même personne, au nom de l'EE : l'entreprise utilisatrice manque toujours", () => {
    const r = repartirSignatures("permis_feu", [
      sig("a", "entreprise_exterieure"),
      sig("b", "entreprise_exterieure"),
    ]);
    expect(r.parPartie.entreprise_utilisatrice).toBeUndefined();
    expect(r.manquantes).toEqual(["entreprise_utilisatrice"]);
  });

  it("une adresse autre que celle de la fiche ne vaut pas donneur d'ordre", () => {
    const r = repartirSignatures("permis_feu", [
      sig("a", "entreprise_exterieure", "autre-adresse@ee.fr"),
    ]);
    expect(r.parPartie.entreprise_exterieure?.id).toBe("a");
    expect(r.manquantes).toEqual(["entreprise_utilisatrice"]);
  });

  it("une signature sans partie (avant le 2026-10-12) n'est comptée pour personne, et reste rendue", () => {
    const r = repartirSignatures("plan_prevention", [sig("a", null), sig("b", null)]);
    expect(r.sansPartie.map((s) => s.id)).toEqual(["a", "b"]);
    expect(r.manquantes).toEqual(["entreprise_utilisatrice", "entreprise_exterieure"]);
  });

  it("les deux parties signées : rien ne manque", () => {
    const r = repartirSignatures("plan_prevention", [
      sig("a", "entreprise_exterieure"),
      sig("b", "entreprise_utilisatrice", "gerant@site.fr"),
    ]);
    expect(r.manquantes).toEqual([]);
    expect(r.sansPartie).toEqual([]);
  });
});

describe("partieRecevable", () => {
  it("un acte co-signé exige une de ses parties ; un rapport n'en prend aucune", () => {
    expect(partieRecevable("plan_prevention", undefined)).toBe(false);
    expect(partieRecevable("permis_feu", "entreprise_exterieure")).toBe(true);
    expect(partieRecevable("rapport_verification", undefined)).toBe(true);
    expect(partieRecevable("rapport_verification", "entreprise_exterieure")).toBe(false);
  });
});
