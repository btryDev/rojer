import { describe, expect, it } from "vitest";

import {
  determineObligationsApplicables,
  type EtablissementMatching,
} from "@/lib/matching";
import {
  genererProchainesVerifications,
  reconcilierCalendrier,
  type OccurrenceExistante,
} from "./generateur";

/**
 * LA CONTINUITÉ D'IDENTITÉ D'UNE OBLIGATION QUI SE SCINDE.
 *
 * `cleDeLigne` indexe une ligne de suivi sur `obligationId`. Une obligation
 * qui CHANGE de périodicité se réconcilie donc sans peine — la clé ne bouge
 * pas —, mais une obligation qui se SCINDE change l'identifiant que reçoit
 * une partie du parc : la clé neuve n'existe nulle part et part en création,
 * et l'ancienne, absente des applicables, tombe dans la branche des
 * obligations retirées du référentiel. Elle y est archivée « Ne s'applique
 * plus » si elle porte une trace, purement supprimée sinon.
 *
 * C'est arrivé le 2026-09-08, avec la scission de la colonne R du tableau de
 * GE 4 § 1 en 4ᵉ catégorie. Le lot ne changeait la périodicité de personne
 * — il déplaçait des établissements d'un identifiant vers un autre — et
 * aucun test de calendrier ne l'a vu, parce qu'aucun ne regardait ce que la
 * réconciliation fait d'un dossier existant quand le référentiel se réécrit.
 *
 * CE FICHIER GARDE LE MÉCANISME, PAS LA SEULE OCCURRENCE. Le premier bloc
 * éprouve la scission réelle sur le référentiel réel ; le second éprouve la
 * règle générale sur des identifiants fabriqués, pour qu'elle serve au
 * prochain lot qui scindera une ligne — et il y en aura d'autres.
 */

const NOW = new Date("2026-09-08T09:00:00Z");

const ANCIENNE_LIGNE = "incendie-erp-visite-commission-cat4-triennale";
const R_AVEC_HEBERGEMENT =
  "incendie-erp-visite-commission-cat4-r-avec-hebergement-triennale";
const R_SANS_HEBERGEMENT =
  "incendie-erp-visite-commission-cat4-r-sans-hebergement-quinquennale";

/** Un internat de 4ᵉ catégorie : type R, l'un des deux régimes du tableau. */
function internat(
  comporteLocauxSommeilPublic: boolean | null,
): EtablissementMatching {
  return {
    id: "etab-internat",
    effectifSurSite: 12,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "R",
    categorieErp: "N4",
    classeIgh: null,
    familleHabitation: null,
    comporteLocauxSommeilPublic,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
  };
}

/**
 * La ligne que ce dossier porte DÉJÀ : une visite faite le 2025-06-01, son
 * rapport au registre, la suivante calculée au 2028-06-01. C'est le dossier
 * ordinaire d'un établissement suivi, pas un cas limite.
 */
function ligneDeja(
  obligationId: string,
  over: Partial<OccurrenceExistante> = {},
): OccurrenceExistante {
  return {
    id: "v-visite-commission",
    obligationId,
    equipementId: null,
    salarieId: null,
    libelleObligation:
      "Visite périodique de la commission de sécurité (ERP 1ʳᵉ à 4ᵉ catégorie)",
    periodicite: "triennale",
    realisateurRequis: ["organisme_agree"],
    datePrevue: new Date("2028-06-01T00:00:00Z"),
    dateRealisee: new Date("2025-06-01T00:00:00Z"),
    statut: "planifiee",
    porteUnePreuve: true,
    prescriptionId: null,
    ...over,
  };
}

/** Les trois identifiants que la scission met en jeu, et eux seuls. */
const LIGNES_DE_VISITE = [
  ANCIENNE_LIGNE,
  R_AVEC_HEBERGEMENT,
  R_SANS_HEBERGEMENT,
];

/**
 * Ce que le référentiel d'aujourd'hui veut voir sur ce dossier, RÉDUIT aux
 * lignes de visite de commission.
 *
 * Le filtre est nécessaire et il ne cache rien : un établissement réel reçoit
 * des dizaines d'obligations, et les réconcilier toutes ferait de `aCreer` un
 * fourre-tout où le défaut cherché se noierait. Ce que ces tests éprouvent est
 * le sort d'UNE ligne dont l'identifiant change, pas la génération complète —
 * celle-là est éprouvée ailleurs.
 */
function aGenerer(etab: EtablissementMatching) {
  return genererProchainesVerifications(
    determineObligationsApplicables(etab, []),
    new Map(),
    { now: NOW },
  ).filter((g) => LIGNES_DE_VISITE.includes(g.obligationId));
}

function planPour(etab: EtablissementMatching, existante: OccurrenceExistante) {
  return reconcilierCalendrier([existante], aGenerer(etab), { now: NOW });
}

describe("scission de GE 4 § 1 — le dossier déjà suivi ne repart pas de zéro", () => {
  it("l'internat qui n'a pas répondu garde SA ligne, sa date et son rapport", () => {
    // LE CAS QUI COMPTE, ET C'EST CELUI QUI NE DEMANDE RIEN À PERSONNE. Un
    // internat de 4ᵉ catégorie n'a aucune raison d'avoir répondu à une
    // question posée le 2026-09-01 ; son rythme ne change pas (trois ans avec
    // hébergement, et le silence garde le rythme court). Rien ne doit donc
    // bouger sur son calendrier — ni la date, ni le rapport, ni la ligne.
    const plan = planPour(internat(null), ligneDeja(ANCIENNE_LIGNE));

    expect(
      plan.aArchiver,
      "La ligne a été barrée « Ne s'applique plus » alors que l'obligation " +
        "s'applique toujours — seul son identifiant a changé.",
    ).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(
      plan.aCreer,
      "Une seconde ligne « à planifier » est apparue à côté de la première : " +
        "le dossier annonce une visite urgente à un établissement à jour.",
    ).toEqual([]);
    expect(plan.inchangees + plan.aMettreAJour.length).toBe(1);

    // La date acquise ne bouge pas : elle vient du rapport de 2025, pas du
    // jour où le référentiel a été réécrit.
    const cible = plan.aMettreAJour[0];
    if (cible) {
      expect(cible.id).toBe("v-visite-commission");
      expect(cible.datePrevue).toEqual(new Date("2028-06-01T00:00:00Z"));
      expect(cible.dateRealisee).toEqual(new Date("2025-06-01T00:00:00Z"));
    }
  });

  it("l'internat qui déclare héberger est dans le même cas", () => {
    const plan = planPour(internat(true), ligneDeja(ANCIENNE_LIGNE));
    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aCreer).toEqual([]);
  });

  it("le centre de formation qui déclare ne pas héberger garde sa ligne, et sa date recule de deux ans", () => {
    // LE SEUL CAS OÙ QUELQUE CHOSE DOIT BOUGER, et ce qui bouge est la
    // périodicité, pas l'identité : la ligne reste la même, son rapport reste
    // attaché, et l'échéance passe de trois à cinq ans après la visite de
    // 2025 — ce que le tableau dit depuis 2014.
    const plan = planPour(internat(false), ligneDeja(ANCIENNE_LIGNE));

    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aCreer).toEqual([]);
    expect(plan.aMettreAJour).toHaveLength(1);
    expect(plan.aMettreAJour[0].id).toBe("v-visite-commission");
    expect(plan.aMettreAJour[0].periodicite).toBe("quinquennale");
    expect(plan.aMettreAJour[0].dateRealisee).toEqual(
      new Date("2025-06-01T00:00:00Z"),
    );
    expect(plan.aMettreAJour[0].datePrevue).toEqual(
      new Date("2030-06-01T00:00:00Z"),
    );
  });

  it("une ligne SANS trace n'est pas supprimée non plus", () => {
    // La branche voisine de l'archivage : sans preuve attachée, une ligne
    // devenue non applicable est supprimée sans bruit. C'est le cas le plus
    // silencieux des deux — rien ne resterait à l'écran pour signaler la
    // perte.
    const plan = planPour(
      internat(null),
      ligneDeja(ANCIENNE_LIGNE, {
        porteUnePreuve: false,
        dateRealisee: null,
        statut: "a_planifier",
      }),
    );

    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aCreer).toEqual([]);
  });

  it("l'EHPAD, lui, n'a jamais changé d'identifiant et ne doit rien voir bouger", () => {
    // LA BORNE HAUTE DE LA REPRISE : elle ne doit adopter que ce qui a
    // effectivement changé de main. J, O et U sont restés sur la ligne
    // d'origine ; leur dossier ne passe par aucune reprise.
    const ehpad: EtablissementMatching = {
      ...internat(null),
      id: "etab-ehpad",
      typeErp: "J",
    };
    const plan = planPour(ehpad, ligneDeja(ANCIENNE_LIGNE));

    expect(plan.aArchiver).toEqual([]);
    expect(plan.aSupprimer).toEqual([]);
    expect(plan.aCreer).toEqual([]);
    // `inchangees + aMettreAJour`, comme le premier test du fichier, et non
    // `inchangees` seul : la ligne part en mise à jour parce que le libellé de
    // CETTE FIXTURE diffère de celui du référentiel, ce qui n'a rien à voir
    // avec la continuité. Ce que ce test garde, c'est qu'une seule ligne sort,
    // et qu'elle n'est ni barrée ni recréée.
    expect(plan.inchangees + plan.aMettreAJour.length).toBe(1);
  });

  it("la reprise ne fabrique jamais deux lignes pour une seule visite", () => {
    // Ce que l'adoption ne doit pas devenir. Les deux lignes R se partagent
    // le même prédécesseur ; si toutes deux pouvaient adopter, un dossier
    // porterait deux visites de commission à deux dates. La partition des
    // typologies l'interdit en amont — un établissement ne reçoit qu'une des
    // deux —, et ce test l'éprouve sur les trois états de la réponse.
    for (const reponse of [true, false, null] as const) {
      const genere = aGenerer(internat(reponse));
      expect(genere, `réponse ${reponse ?? "absente"}`).toHaveLength(1);

      const plan = reconcilierCalendrier(
        [ligneDeja(ANCIENNE_LIGNE)],
        genere,
        { now: NOW },
      );
      expect(
        plan.aCreer.length + plan.aMettreAJour.length + plan.inchangees,
        `réponse ${reponse ?? "absente"}`,
      ).toBe(genere.length);
    }
  });
});
