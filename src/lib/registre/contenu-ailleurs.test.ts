import { describe, expect, it } from "vitest";
import {
  contenuTenuAilleursDepuis,
  type VerificationTenue,
} from "./contenu-ailleurs";
import type { SectionRegistre } from "./sections";

/**
 * Le marquage contractuel sur la surface où il coûte le plus cher (ADR-032).
 *
 * Le registre de sécurité est le document qu'on ouvre devant une commission
 * de sécurité ou un inspecteur : une échéance née d'une demande d'assureur
 * qui s'y lirait comme réglementaire est l'erreur que l'ADR-014 voulait
 * empêcher, et elle est invisible pour celui qui la subit — le dirigeant, qui
 * croit devoir au droit ce qu'il doit à son contrat.
 */

// Une fiche de la partie 3, celle que le calendrier alimente.
const sectionExtincteurs: SectionRegistre = {
  id: "verifications-moyens-extinction",
  partie: "3.1",
  titre: "Vérifications des moyens d'extinction",
  attendu: "Vérifications périodiques des extincteurs.",
  categoriesEquipement: ["EXTINCTEUR"],
};

function verif(partial: Partial<VerificationTenue> = {}): VerificationTenue {
  return {
    id: "v1",
    libelleObligation: "Vérification annuelle des extincteurs",
    datePrevue: new Date("2026-11-02T00:00:00Z"),
    derniereRealisation: null,
    periodicite: "annuelle",
    /** `null` = ligne OUVERTE. Requis depuis le N3 : c'est ce champ, et non
     *  plus un préfixe de libellé, qui dit qu'une obligation est éteinte. */
    archiveLe: null,
    statut: "a_planifier",
    equipement: { libelle: "Extincteurs RDC", categorie: "EXTINCTEUR" },
    prescription: null,
    ...partial,
  };
}

/** 10 août 2026, 9 h à Paris — l'horloge injectée (ADR-011) : la pastille
 *  d'une fiche dit l'état du jour, pas le statut stocké. */
const NOW = new Date("2026-08-10T07:00:00Z");

function lignesDe(verifications: VerificationTenue[], now: Date = NOW) {
  const contenu = contenuTenuAilleursDepuis(
    "etab-1",
    "3.1",
    sectionExtincteurs,
    [],
    verifications,
    now,
  );
  return contenu?.lignes ?? [];
}

describe("registre — ce qui a été fait, et ce qui vient (ADR-034)", () => {
  it("une ligne roulée dit la date du dernier rapport, puis l'échéance ouverte", () => {
    const [ligne] = lignesDe([
      verif({
        datePrevue: new Date("2027-06-01T00:00:00Z"),
        derniereRealisation: new Date("2026-06-01T00:00:00Z"),
        statut: "planifiee",
      }),
    ]);
    expect(ligne.meta).toContain("faite le 01 juin 2026");
    expect(ligne.meta).toContain("prochaine le 01 juin 2027");
  });

  it("la pastille dit l'état du jour, pas le statut stocké", () => {
    // MUTATION SURVIVANTE du banc des corrections (2026-09-13). Une ligne
    // roulée reste « planifiée » en base après le passage de sa date — rien ne
    // la réécrit hors régénération —, et la fiche remise en contrôle imprimait
    // « Planifiée » sur une ligne en retard.
    const [enRetard, aVenir] = lignesDe([
      verif({
        id: "v-retard",
        datePrevue: new Date("2026-06-01T00:00:00Z"),
        derniereRealisation: new Date("2025-06-01T00:00:00Z"),
        statut: "planifiee",
      }),
      verif({
        id: "v-avenir",
        datePrevue: new Date("2027-06-01T00:00:00Z"),
        derniereRealisation: new Date("2026-06-01T00:00:00Z"),
        statut: "planifiee",
      }),
    ]);
    expect(enRetard.statut).toBe("depassee");
    // Le témoin : une date à venir garde son statut, la pastille ne peint pas
    // tout en rose.
    expect(aVenir.statut).toBe("planifiee");
  });
});

describe("registre — une obligation ponctuelle consommée n'annonce pas de suite", () => {
  it("dit ce qui a été fait, sans promettre une prochaine échéance", () => {
    // Sa `datePrevue` n'est que son échéance d'origine : l'annoncer
    // « prochaine » promet au dirigeant un contrôle que rien n'attend.
    const [ligne] = lignesDe([
      verif({
        datePrevue: new Date("2026-07-01T00:00:00Z"),
        derniereRealisation: new Date("2026-06-20T00:00:00Z"),
        statut: "realisee_conforme",
        // PONCTUELLE, et le rythme le dit : c'est lui, et non le statut, qui
        // fait qu'aucune suite n'est due (`estVerificationRealisee`).
        periodicite: "mise_en_service_uniquement",
      }),
    ]);
    expect(ligne.meta).toContain("faite le 20 juin 2026");
    expect(ligne.meta).not.toContain("prochaine");
  });

  it("mais une PÉRIODIQUE gelée sur « réalisée » annonce bien sa suite", () => {
    // La rangée d'avant l'ADR-034 : statut du contrôle passé, rendez-vous
    // suivant dans `datePrevue`. Lue par le statut, la fiche taisait une
    // échéance due ; lue par le rythme, elle l'annonce (2026-09-13).
    const [ligne] = lignesDe([
      verif({
        datePrevue: new Date("2027-06-20T00:00:00Z"),
        derniereRealisation: new Date("2026-06-20T00:00:00Z"),
        statut: "realisee_conforme",
        periodicite: "annuelle",
      }),
    ]);
    expect(ligne.meta).toContain("faite le 20 juin 2026");
    expect(ligne.meta).toContain("prochaine le 20 juin 2027");
  });
});

describe("registre — une obligation éteinte ne se présente pas en retard", () => {
  /**
   * LE DOCUMENT QU'ON PRÉSENTE À UNE COMMISSION. Jusqu'au N3, le préfixe
   * « Ne s'applique plus — » vivait dans le libellé : la fiche se dénonçait
   * d'elle-même. La migration l'a retiré, et ce module n'avait pas reçu le
   * champ — la fiche imprimait « En retard », en rose, sur une obligation qui
   * ne s'applique plus. Neuvième surface, trouvée en relecture le 2026-09-12.
   */
  const eteinte = () =>
    verif({
      statut: "depassee",
      datePrevue: new Date("2025-03-01T00:00:00Z"),
      archiveLe: new Date("2026-02-01T00:00:00Z"),
      derniereRealisation: new Date("2024-03-01T00:00:00Z"),
    });

  it("ne porte aucune pastille de statut", () => {
    const [ligne] = lignesDe([eteinte()]);
    expect(ligne.statut).toBeUndefined();
  });

  it("dit qu'elle ne s'applique plus, et n'annonce aucune prochaine échéance", () => {
    const [ligne] = lignesDe([eteinte()]);
    expect(ligne.meta).toContain("ne s'applique plus depuis le 01 févr. 2026");
    expect(ligne.meta).not.toContain("prochaine");
  });

  it("garde la preuve du contrôle qui a eu lieu", () => {
    // L'archivage tait ce qui est ATTENDU, jamais ce qui a EU LIEU (ADR-012).
    const [ligne] = lignesDe([eteinte()]);
    expect(ligne.meta).toContain("faite le 01 mars 2024");
  });
});

describe("registre — marquage des échéances contractuelles", () => {
  it("une échéance née d'une demande d'assureur est marquée", () => {
    const [ligne] = lignesDe([
      verif({ prescription: { source: "demande_assureur" } }),
    ]);
    expect(ligne.contractuelle).toBe(true);
  });

  it("une échéance du référentiel ne l'est pas", () => {
    // Borne haute : marquer une obligation réglementaire « engagement
    // d'assurance » la ferait paraître facultative, et personne ne viendrait
    // le relever.
    const [ligne] = lignesDe([verif()]);
    expect(ligne.contractuelle).toBe(false);
  });

  it("une échéance née d'un arrêté préfectoral ne l'est pas non plus", () => {
    // La couche voisine : toutes les lignes de prescription ne sont pas
    // contractuelles. Un arrêté est un acte d'autorité, opposable.
    const [ligne] = lignesDe([
      verif({ prescription: { source: "arrete_prefectoral" } }),
    ]);
    expect(ligne.contractuelle).toBe(false);
  });

  it("le marquage ne se cache pas dans le texte tronqué de la ligne", () => {
    // `meta` est rendu avec `truncate` : un marquage qui y serait glissé
    // disparaîtrait sur un libellé long, c'est-à-dire précisément sur les
    // lignes que l'assureur impose et qui portent des noms à rallonge.
    const [ligne] = lignesDe([
      verif({ prescription: { source: "demande_assureur" } }),
    ]);
    expect(ligne.meta ?? "").not.toContain("assurance");
  });
});
