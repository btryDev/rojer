import { describe, expect, it } from "vitest";
import {
  FAITS_ACTIVITE,
  type ReponsesFaitsActivite,
} from "@/lib/etablissements/faits-activite";
import { titresSansPorteur } from "./titres-sans-porteur";

const AUCUN = Object.fromEntries(
  FAITS_ACTIVITE.map((f) => [f.champ, null]),
) as ReponsesFaitsActivite;
const RIEN = new Set<string>();

const ids = (r: ReturnType<typeof titresSansPorteur>) =>
  r.flatMap((f) => f.titres.map((t) => t.obligation.id)).sort();

describe("ce que le DUERP signale et que personne ne porte", () => {
  it("un « oui » à la conduite, personne de formé : formation et autorisation", () => {
    const r = titresSansPorteur({ ...AUCUN, conduiteEngins: true }, RIEN);
    expect(r.map((f) => f.champ)).toEqual(["conduiteEngins"]);
    expect(ids(r)).toEqual(["conduite-salarie-autorisation", "conduite-salarie-formation"]);
    // La condition de l'autorisation se dit : elle ne vaut pas pour tout engin.
    const autorisation = r[0].titres.find((t) => t.obligation.id === "conduite-salarie-autorisation");
    expect(autorisation?.condition).toContain("R. 4323-57");
  });

  it("aucune pièce médicale n'est réclamée à l'établissement", () => {
    // Elles conditionnent la validité d'un autre titre (R. 4323-56,
    // R. 4544-11-1) : sans titre, pas d'attestation à réclamer.
    const tout = Object.fromEntries(
      FAITS_ACTIVITE.map((f) => [f.champ, true]),
    ) as ReponsesFaitsActivite;
    for (const f of titresSansPorteur(tout, RIEN)) {
      for (const t of f.titres) expect(t.obligation.pieceMedicale, t.obligation.id).toBe(false);
    }
  });

  it("un titre détenu par quelqu'un éteint son alerte, l'autre reste", () => {
    const r = titresSansPorteur(
      { ...AUCUN, conduiteEngins: true },
      new Set(["conduite-salarie-formation"]),
    );
    expect(ids(r)).toEqual(["conduite-salarie-autorisation"]);
  });

  it("l'électricité ne double pas la ligne d'habilitation établie d'après les titres", () => {
    // La ligne « Habilitation électrique du personnel » dit déjà « aucun
    // titre » ; l'attestation de voisinage est une pièce médicale.
    expect(titresSansPorteur({ ...AUCUN, operationsElectriques: true }, RIEN)).toEqual([]);
  });

  it("seul un « oui » alerte : ni le silence ni un « non »", () => {
    expect(titresSansPorteur(AUCUN, RIEN)).toEqual([]);
    expect(titresSansPorteur({ ...AUCUN, conduiteEngins: false }, RIEN)).toEqual([]);
  });

  it("le « oui » à tout ne fait parler que des faits qui déclenchent un titre", () => {
    const tout = Object.fromEntries(
      FAITS_ACTIVITE.map((f) => [f.champ, true]),
    ) as ReponsesFaitsActivite;
    for (const f of titresSansPorteur(tout, RIEN)) {
      const fait = FAITS_ACTIVITE.find((x) => x.champ === f.champ)!;
      for (const t of f.titres) expect(fait.declencheTitres).toContain(t.obligation.id);
    }
  });
});
