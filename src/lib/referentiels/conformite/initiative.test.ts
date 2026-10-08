import { describe, expect, it } from "vitest";
import { obligationsConformite } from "./index";
import {
  estLignePourInformation,
  estPourInformation,
  libelleRealisateurs,
  MENTION_POUR_INFORMATION,
  OBLIGATIONS_A_L_INITIATIVE_DE_L_ADMINISTRATION,
  REALISATEUR_POUR_INFORMATION,
} from "./initiative";
import { repartirVerifications } from "@/lib/pdf/etat-verifications";
import { classerVerification, statutAffiche } from "@/lib/calendrier/etats";
import {
  AUCUNE_PRUDENCE,
  estEnRetardQuiCompte,
  horsDesComptesDeLExploitant,
} from "@/lib/calendrier/prudence";
import { urgenceSeule } from "@/lib/calendrier/portee";
import { genererReadme } from "@/lib/pdf/readme-controle";

/**
 * La visite de la commission de sécurité « pour information » (C64,
 * 2026-10-08 — décision 2 de la synthèse de revue, option A, sans migration).
 *
 * Ce que ces tests tiennent : la projection client (la liste) est égale au
 * champ, dans les deux sens ; une ligne pour information reste visible, mais
 * ne compte ni en retard, ni à planifier, ni à venir, ni dans l'indice ; une
 * ligne ordinaire à la même date, elle, compte. Aucun test ne recopie la liste
 * des neuf identifiants : la liste et le champ sont deux sources, comparées.
 */

const NOW = new Date("2026-10-08T09:00:00Z");
const PASSEE = new Date("2025-01-15T00:00:00Z");
const PROCHE = new Date("2026-10-20T00:00:00Z");

const PORTANT = obligationsConformite.filter((o) => estPourInformation(o));
const UNE = PORTANT[0];

function ligne(obligationId: string, datePrevue: Date, statut = "planifiee") {
  return {
    id: `v-${obligationId}-${datePrevue.getTime()}`,
    obligationId,
    prescriptionId: null as string | null,
    statut,
    datePrevue,
    periodicite: "quinquennale",
    archiveLe: null as Date | null,
    libelleObligation: "Visite",
    derniereRealisation: null as Date | null,
  };
}

const ORDINAIRE = obligationsConformite.find(
  (o) => !estPourInformation(o) && o.periodicite === "annuelle",
)!;

describe("le champ et sa projection client", () => {
  it("borne basse : la visite de 5ᵉ catégorie (PE 37) et au moins une ligne de GE 4 sont pour information", () => {
    const ids = PORTANT.map((o) => o.id);
    expect(ids).toContain("incendie-erp-5-visite-commission");
    expect(ids.some((id) => id.startsWith("incendie-erp-visite-commission-"))).toBe(true);
  });

  it("la liste du module feuille est EXACTEMENT l'ensemble des obligations qui portent le champ", () => {
    expect(new Set(PORTANT.map((o) => o.id))).toEqual(
      new Set(OBLIGATIONS_A_L_INITIATIVE_DE_L_ADMINISTRATION),
    );
  });

  it("borne haute : aucune autre visite ni vérification n'est pour information", () => {
    // Le champ ne vaut que pour la commission : toutes ses lignes portent
    // « commission » dans leur libellé.
    for (const o of PORTANT) expect(o.libelle).toMatch(/commission de sécurité/i);
  });

  it("le réalisateur affiché est la commission ; le champ garde l'organisme agréé (pas de migration)", () => {
    expect(UNE.realisateurs).toContain("organisme_agree");
    expect(libelleRealisateurs({ obligationId: UNE.id }, ["Organisme agréé"])).toEqual([
      REALISATEUR_POUR_INFORMATION,
    ]);
    expect(libelleRealisateurs({ obligationId: ORDINAIRE.id }, ["Organisme agréé"])).toEqual([
      "Organisme agréé",
    ]);
  });
});

describe("une ligne pour information ne compte pas comme une échéance de l'exploitant", () => {
  it("passée : ni en retard ni dans le total de l'indice — la ligne ordinaire à la même date, si", () => {
    const visite = ligne(UNE.id, PASSEE);
    const autre = ligne(ORDINAIRE.id, PASSEE);
    const e = repartirVerifications([visite, autre], NOW, AUCUNE_PRUDENCE);
    expect(e.enRetard).toEqual([autre]);
    expect(e.pourInformation).toEqual([visite]);
    expect(e.total).toBe(1);
  });

  it("proche ou à planifier : ni « à venir » ni « à planifier »", () => {
    const e = repartirVerifications(
      [ligne(UNE.id, PROCHE), ligne(UNE.id, NOW, "a_planifier")],
      NOW,
      AUCUNE_PRUDENCE,
    );
    expect(e.aVenir).toHaveLength(0);
    expect(e.aPlanifier).toHaveLength(0);
    expect(e.total).toBe(0);
  });

  it("un procès-verbal déposé ne fait pas monter l'indice (hors de `realisees12m`)", () => {
    const visite = { ...ligne(UNE.id, new Date("2030-01-01T00:00:00Z")), derniereRealisation: new Date("2026-06-01T00:00:00Z") };
    const e = repartirVerifications([visite], NOW, AUCUNE_PRUDENCE);
    expect(e.realisees12m).toHaveLength(0);
    expect(e.total).toBe(0);
  });

  it("classement et peinture : « pourInformation », peinte « pour_information », jamais en retard", () => {
    const visite = ligne(UNE.id, PASSEE);
    expect(classerVerification(visite, NOW)).toBe("pourInformation");
    expect(statutAffiche(visite, NOW)).toBe("pour_information");
    expect(estEnRetardQuiCompte(visite, NOW, AUCUNE_PRUDENCE)).toBe(false);
    expect(horsDesComptesDeLExploitant({ ...visite, aConfirmer: [] })).toBe(true);
    // La ligne ordinaire, elle, reste en retard.
    expect(classerVerification(ligne(ORDINAIRE.id, PASSEE), NOW)).toBe("enRetard");
  });

  it("le filtre SQL des urgences l'écarte", () => {
    const where = JSON.stringify(urgenceSeule(NOW));
    expect(where).toContain(UNE.id);
    expect(where).toContain("notIn");
  });

  it("une ligne sans `obligationId` n'est pas pour information (le côté visible)", () => {
    expect(estLignePourInformation({})).toBe(false);
  });
});

describe("le ZIP de contrôle l'annonce", () => {
  it("le README nomme la mention quand le dossier en porte, et se tait sinon", () => {
    const base = {
      raisonSociale: "R",
      etablissement: "E",
      adresse: "A",
      dateNow: "08/10/2026",
      duerpNumeroVersion: null,
      aDuerpPdf: false,
      aRegistreAccessibilite: false,
      nbPrestataires: 0,
      nbPermisFeu: 0,
      nbPlansPrevention: 0,
      aCarnetSanitaire: false,
      nbEcheancesContractuelles: 0,
      rythmesRetenus: new Map<string, string>(),
      visitesPourInformation: new Set<string>(),
      etatDuerp: null,
      retards: { nbEnRetard: 0, calendrier: { etat: "a_jour" }, inventaire: null },
      avertissementCalendrier: null,
      inventaire: null,
      presents: new Set(["01_Dossier_conformite.pdf", "03_Registre_securite.pdf"]),
      regime: { estERP: true, estIGH: false },
      duerpLu: true,
      echecs: new Map(),
      piecesPrestatairesManquantes: 0,
      piecesPrestataires: { attestation: 0, rcPro: 0, kbis: 0 },
    } as Parameters<typeof genererReadme>[0];
    expect(genererReadme(base)).not.toContain(MENTION_POUR_INFORMATION);
    expect(genererReadme({ ...base, visitesPourInformation: new Set(["v1"]) })).toContain(
      MENTION_POUR_INFORMATION,
    );
  });
});
