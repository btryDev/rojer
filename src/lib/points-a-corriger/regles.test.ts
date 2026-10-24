import { describe, expect, it } from "vitest";
import { obligationParId } from "@/lib/referentiels/conformite";
import { appareilDesignable, categoriesCouvertes, estControleDEnsemble, recoitDesPoints } from "./regles";

const aeration = obligationParId("aeration-controle-installations-r4222-20")!;
const ligne = { equipementId: null, salarieId: null, archiveLe: null, appareilActif: null };

describe("règles d'un point à corriger (ADR-048)", () => {
  it("un contrôle d'ensemble n'a ni appareil ni personne", () => {
    expect(estControleDEnsemble(ligne)).toBe(true);
    expect(estControleDEnsemble({ ...ligne, equipementId: "eq" })).toBe(false);
    expect(estControleDEnsemble({ ...ligne, salarieId: "s" })).toBe(false);
  });

  it("une ligne reçoit des points, sauf titre de salarié, ligne éteinte, appareil retiré", () => {
    expect(recoitDesPoints(ligne)).toBe(true);
    expect(recoitDesPoints({ ...ligne, equipementId: "eq", appareilActif: true })).toBe(true);
    expect(recoitDesPoints({ ...ligne, salarieId: "s" })).toBe(false);
    expect(recoitDesPoints({ ...ligne, archiveLe: new Date() })).toBe(false);
    expect(recoitDesPoints({ ...ligne, equipementId: "eq", appareilActif: false })).toBe(false);
  });

  it("le contrôle de l'aération couvre les hottes, pas les extincteurs", () => {
    expect(categoriesCouvertes(aeration)).toContain("HOTTE_PRO");
    expect(appareilDesignable(aeration, { categorie: "HOTTE_PRO", actif: true })).toBe(true);
    expect(appareilDesignable(aeration, { categorie: "EXTINCTEUR", actif: true })).toBe(false);
  });

  it("un appareil retiré du parc ne se désigne pas", () => {
    expect(appareilDesignable(aeration, { categorie: "HOTTE_PRO", actif: false })).toBe(false);
  });

  it("un contrôle qui ne cite aucun appareil n'en couvre aucun", () => {
    expect(categoriesCouvertes({ equipementsEnContexte: undefined })).toEqual([]);
  });
});
