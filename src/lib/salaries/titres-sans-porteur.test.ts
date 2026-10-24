import { describe, expect, it } from "vitest";
import {
  FAITS_ACTIVITE,
  type FaitActivite,
  type ReponsesFaitsActivite,
} from "@/lib/etablissements/faits-activite";
import { titresSansPorteur, type PersonneLue } from "./titres-sans-porteur";

const AUCUN = Object.fromEntries(
  FAITS_ACTIVITE.map((f) => [f.champ, null]),
) as ReponsesFaitsActivite;
const TOUT = Object.fromEntries(
  FAITS_ACTIVITE.map((f) => [f.champ, true]),
) as ReponsesFaitsActivite;
const PERSONNE: readonly PersonneLue[] = [];
const presente = (...ids: string[]): PersonneLue => ({
  actif: true,
  titres: ids.map((obligationId) => ({ obligationId })),
});

const ids = (r: ReturnType<typeof titresSansPorteur>) =>
  r.flatMap((f) => f.titres.map((t) => t.obligation.id)).sort();

describe("ce que le DUERP signale et que personne ne porte", () => {
  it("un « oui » à la conduite, personne de formé : formation et autorisation", () => {
    const r = titresSansPorteur({ ...AUCUN, conduiteEngins: true }, PERSONNE);
    expect(r.map((f) => f.champ)).toEqual(["conduiteEngins"]);
    expect(ids(r)).toEqual(["conduite-salarie-autorisation", "conduite-salarie-formation"]);
    // La condition de l'autorisation se dit : elle ne vaut pas pour tout engin.
    const autorisation = r[0].titres.find((t) => t.obligation.id === "conduite-salarie-autorisation");
    expect(autorisation?.condition).toContain("R. 4323-57");
  });

  it("un « oui » au CMR rappelle le suivi renforcé, dû au poste à risque (R. 4624-22)", () => {
    // Revue indépendante du 2026-10-24 : un filtre sur toute pièce médicale
    // le retirait, et le « oui » ne rappelait plus rien.
    const r = titresSansPorteur({ ...AUCUN, expositionCMR: true }, PERSONNE);
    expect(ids(r)).toEqual(["sante-travail-salarie-sir"]);
    // Ce que la question ne couvre pas se dit avec elle.
    expect(r[0].horsQuestion).toContain("amiante");
  });

  it("aucune pièce qui conditionne un autre titre n'est réclamée à l'établissement", () => {
    // R. 4323-56, R. 4544-11-1 : sans autorisation ni habilitation, pas
    // d'attestation à réclamer.
    expect(ids(titresSansPorteur(TOUT, PERSONNE))).not.toContain("conduite-salarie-attestation-medicale");
    expect(ids(titresSansPorteur(TOUT, PERSONNE))).not.toContain(
      "elec-salarie-attestation-medicale-voisinage",
    );
  });

  it("un titre qu'un autre appelle n'est pas réclamé : la fiche de qui détient le premier le date", () => {
    // Un fait fictif qui déclencherait la visite intermédiaire : elle n'est
    // due qu'à qui relève du suivi renforcé (ADR-043).
    const fictif: FaitActivite = {
      ...FAITS_ACTIVITE.find((f) => f.champ === "expositionCMR")!,
      declencheTitres: ["sante-travail-salarie-sir-visite-intermediaire"],
    };
    expect(titresSansPorteur({ ...AUCUN, expositionCMR: true }, PERSONNE, [fictif])).toEqual([]);
  });

  it("un titre détenu par une personne présente éteint son alerte, l'autre reste", () => {
    const r = titresSansPorteur({ ...AUCUN, conduiteEngins: true }, [
      presente("conduite-salarie-formation"),
    ]);
    expect(ids(r)).toEqual(["conduite-salarie-autorisation"]);
  });

  it("un titre détenu par une personne sortie de l'effectif ne couvre plus personne", () => {
    const r = titresSansPorteur({ ...AUCUN, conduiteEngins: true }, [
      { ...presente("conduite-salarie-formation"), actif: false },
    ]);
    expect(ids(r)).toContain("conduite-salarie-formation");
  });

  it("l'électricité ne double pas la ligne d'habilitation établie d'après les titres", () => {
    // La ligne « Habilitation électrique du personnel » dit déjà « aucun
    // titre » ; l'attestation de voisinage conditionne l'habilitation.
    expect(titresSansPorteur({ ...AUCUN, operationsElectriques: true }, PERSONNE)).toEqual([]);
  });

  it("seul un « oui » alerte : ni le silence ni un « non »", () => {
    expect(titresSansPorteur(AUCUN, PERSONNE)).toEqual([]);
    expect(titresSansPorteur({ ...AUCUN, conduiteEngins: false }, PERSONNE)).toEqual([]);
  });
});
