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
import type { EquipementMatching, EtablissementMatching } from "./types";

/**
 * Le défibrillateur automatisé externe (CCH R. 157-1 à R. 157-4), entré le
 * 2026-10-14 pour les ERP des catégories 1 à 4.
 *
 * Depuis le 2026-10-15 (décision de la propriétaire), la maintenance et la
 * déclaration Géo'DAE se portent sur l'APPAREIL (catégorie `DEFIBRILLATEUR`),
 * une ligne par DAE déclaré ; la détention reste à l'établissement, due même
 * sans appareil.
 *
 * Pas de liste exhaustive des catégories : une borne basse (deux profils qui
 * DOIVENT recevoir les lignes, de type et de catégorie différents), une borne
 * haute (deux profils qui n'en reçoivent AUCUNE, appareil déclaré compris), et
 * la couche voisine — la surface où chaque ligne atterrit. Chaque assertion a
 * été éprouvée en cassant le référentiel : voir les commits du 2026-10-14 et
 * du 2026-10-15.
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

const dae = (id: string): EquipementMatching => ({
  id,
  libelle: `DAE ${id}`,
  categorie: "DEFIBRILLATEUR",
  caracteristiques: null,
});

function daeServies(e: EtablissementMatching, parc: EquipementMatching[]): string[] {
  return determineObligationsApplicables(e, parc)
    .map((a) => a.obligation.id)
    .filter((id) => id.startsWith("dae-"))
    .sort();
}

/** Les lignes de calendrier DAE qu'un parc fait naître, par obligation. */
function lignesDuCalendrier(e: EtablissementMatching, parc: EquipementMatching[]) {
  const applicables = determineObligationsApplicables(e, parc).filter((a) =>
    a.obligation.id.startsWith("dae-"),
  );
  return genererProchainesVerifications(applicables);
}

function ligne(id: (typeof DAE)[number]) {
  const o = obligationParId(id);
  if (!o) throw new Error(`${id} absente du référentiel`);
  return o;
}

describe("défibrillateur — borne basse : les ERP des catégories 1 à 4", () => {
  it("un restaurant (N) de 3ᵉ catégorie qui déclare un DAE reçoit les trois lignes", () => {
    expect(daeServies(erp("N", "N3"), [dae("a")])).toEqual([...DAE].sort());
  });

  it("un magasin (M) de 4ᵉ catégorie qui déclare un DAE reçoit les trois lignes", () => {
    expect(daeServies(erp("M", "N4"), [dae("a")])).toEqual([...DAE].sort());
  });

  it("sans appareil déclaré, la détention est due quand même — et elle seule", () => {
    expect(daeServies(erp("N", "N3"), [])).toEqual(["dae-erp-detention"]);
  });
});

describe("défibrillateur — borne haute : rien hors des catégories 1 à 4, appareil déclaré ou non", () => {
  it("un restaurant de 5ᵉ catégorie qui déclare un DAE n'en reçoit aucune (le 2° de R. 157-1 n'est pas encodé)", () => {
    expect(daeServies(erp("N", "N5"), [dae("a")])).toEqual([]);
  });

  it("un établissement qui n'est pas un ERP et déclare un DAE n'en reçoit aucune", () => {
    expect(daeServies(BASE, [dae("a")])).toEqual([]);
  });
});

describe("défibrillateur — la surface de chaque ligne", () => {
  it("la détention se déclare « en place », pas la maintenance ni Géo'DAE", () => {
    expect(estEtatADeclarer(ligne("dae-erp-detention"))).toBe(true);
    expect(estEtatADeclarer(ligne("dae-erp-maintenance"))).toBe(false);
    expect(estEtatADeclarer(ligne("dae-erp-declaration-geodae"))).toBe(false);
  });

  it("deux DAE déclarés : une maintenance annuelle et une déclaration Géo'DAE par appareil, la détention reste unique", () => {
    const lignes = lignesDuCalendrier(erp("N", "N3"), [dae("a"), dae("b")]);
    const par = (id: string) => lignes.filter((l) => l.obligationId === id);

    const maintenance = par("dae-erp-maintenance");
    expect(maintenance.map((l) => l.equipementId).sort()).toEqual(["a", "b"]);
    expect(maintenance.every((l) => l.periodicite === "annuelle")).toBe(true);

    const geodae = par("dae-erp-declaration-geodae");
    expect(geodae.map((l) => l.equipementId).sort()).toEqual(["a", "b"]);
    expect(geodae.every((l) => l.periodicite === "mise_en_service_uniquement")).toBe(true);

    // La détention est un état sans rendez-vous : elle n'est pas au calendrier.
    expect(par("dae-erp-detention")).toEqual([]);
  });

  it("la maintenance porte la mention du rythme retenu par défaut", () => {
    const o = ligne("dae-erp-maintenance");
    expect(periodiciteEffective(o)).toBe("annuelle");
    expect(mentionRythmeRetenu(o)?.court).toBe(PASTILLE_DEFAUT_ANNUEL);
  });
});
