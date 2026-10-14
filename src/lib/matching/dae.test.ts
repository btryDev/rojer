import { describe, expect, it } from "vitest";
import { genererProchainesVerifications } from "@/lib/calendrier/generateur";
import { estEtatADeclarer } from "@/lib/etats-permanents/regle";
import { obligationParId } from "@/lib/referentiels/conformite";
import {
  mentionRythmeRetenu,
  PASTILLE_DEFAUT_ANNUEL,
} from "@/lib/referentiels/conformite/mention-rythme";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import { determineObligationsApplicables } from "./engine";
import type { EtablissementMatching } from "./types";

/**
 * Le défibrillateur automatisé externe (CCH R. 157-1 à R. 157-4), entré le
 * 2026-10-14 pour les ERP des catégories 1 à 4.
 *
 * Pas de liste exhaustive des catégories : une borne basse (deux profils qui
 * DOIVENT recevoir les trois lignes, de type et de catégorie différents), une
 * borne haute (deux profils qui ne doivent en recevoir AUCUNE), et la couche
 * voisine — la surface où chaque ligne atterrit. Chaque assertion a été
 * éprouvée en cassant le référentiel (élargir à N5, retirer N4, retirer le
 * rythme retenu, passer la détention en récurrente) : voir le commit.
 */

const DAE = [
  "dae-erp-detention",
  "dae-erp-maintenance",
  "dae-erp-declaration-geodae",
] as const;

const BASE: EtablissementMatching = {
  id: "etab",
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
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
};

function erp(typeErp: "N" | "M", categorieErp: "N3" | "N4" | "N5"): EtablissementMatching {
  return { ...BASE, estERP: true, typeErp, categorieErp };
}

function daeServies(e: EtablissementMatching): string[] {
  return determineObligationsApplicables(e, [])
    .map((a) => a.obligation.id)
    .filter((id) => id.startsWith("dae-"))
    .sort();
}

function ligne(id: (typeof DAE)[number]) {
  const o = obligationParId(id);
  if (!o) throw new Error(`${id} absente du référentiel`);
  return o;
}

describe("défibrillateur — borne basse : les ERP des catégories 1 à 4 reçoivent les trois lignes", () => {
  it("un restaurant (N) de 3ᵉ catégorie", () => {
    expect(daeServies(erp("N", "N3"))).toEqual([...DAE].sort());
  });

  it("un magasin (M) de 4ᵉ catégorie", () => {
    expect(daeServies(erp("M", "N4"))).toEqual([...DAE].sort());
  });
});

describe("défibrillateur — borne haute : rien hors des catégories 1 à 4", () => {
  it("un restaurant de 5ᵉ catégorie n'en reçoit aucune (le 2° de R. 157-1 n'est pas encodé)", () => {
    expect(daeServies(erp("N", "N5"))).toEqual([]);
  });

  it("un établissement qui n'est pas un ERP n'en reçoit aucune", () => {
    expect(daeServies(BASE)).toEqual([]);
  });
});

describe("défibrillateur — la surface de chaque ligne", () => {
  it("la détention et la déclaration Géo'DAE se déclarent « en place »", () => {
    expect(estEtatADeclarer(ligne("dae-erp-detention"))).toBe(true);
    expect(estEtatADeclarer(ligne("dae-erp-declaration-geodae"))).toBe(true);
  });

  it("la maintenance n'est pas « en place » : elle va au calendrier, annuelle, sous la mention du défaut", () => {
    const o = ligne("dae-erp-maintenance");
    expect(estEtatADeclarer(o)).toBe(false);
    expect(periodiciteEffective(o)).toBe("annuelle");
    const lignes = genererProchainesVerifications([
      { obligation: o, equipementsConcernes: [], porteur: "etablissement", raisons: ["fixture"] },
    ]);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].periodicite).toBe("annuelle");
    expect(mentionRythmeRetenu(o)?.court).toBe(PASTILLE_DEFAUT_ANNUEL);
  });
});
