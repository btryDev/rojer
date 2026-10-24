// Ce qui est gravé comme absent, et ce qui ne l'est pas (§ 17.2).
//
// Trois réponses, une seule entre au document : le « non ». Le « oui » se lit
// déjà dans l'inventaire des risques, le silence n'est pas un refus (ADR-022).

import { describe, expect, it } from "vitest";
import type { ReponsesFaitsActivite } from "@/lib/etablissements/faits-activite";
import { questionsDetectionTransverses } from "@/lib/referentiels";
import {
  expositionsAbsentesSnapshot,
  figerExpositionsAbsentes,
} from "./expositions-absentes";
import type { DuerpSnapshot, RisqueSnapshot, UniteSnapshot } from "./snapshot";

const SILENCE: ReponsesFaitsActivite = {
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
};

const intitule = (id: string) =>
  questionsDetectionTransverses.find((q) => q.id === id)!.intitule;

function risque(referentielId: string, exposeCMR = false): RisqueSnapshot {
  return {
    id: `r-${referentielId}`,
    referentielId,
    libelle: referentielId,
    description: null,
    gravite: 2,
    probabilite: 2,
    maitrise: 2,
    criticite: 2,
    cotationSaisie: true,
    nombreSalariesExposes: null,
    dateMesuresPhysiques: null,
    exposeCMR,
    mesures: [],
  };
}

function transverse(...risques: RisqueSnapshot[]): UniteSnapshot {
  return {
    id: "u-trv",
    nom: "Risques transverses",
    description: null,
    estTransverse: true,
    aucunRisqueJustif: null,
    risques,
  };
}

describe("figerExpositionsAbsentes — le « non » seul", () => {
  it("grave un « non » transverse avec le texte de la question", () => {
    const g = figerExpositionsAbsentes([], { "q-routier": false }, SILENCE);
    expect(g).toEqual([
      { id: "q-routier", question: intitule("q-routier"), reponse: false },
    ]);
  });

  it("grave un fait d'activité déclaré « non », par l'intitulé de sa question", () => {
    const g = figerExpositionsAbsentes([], null, {
      ...SILENCE,
      conduiteEngins: false,
    });
    expect(g.map((e) => e.question)).toEqual([intitule("q-conduite-engins")]);
  });

  it("grave le CMR, que porte un fait sans question transverse", () => {
    const g = figerExpositionsAbsentes([], null, { ...SILENCE, expositionCMR: false, epiPresents: false });
    expect(g).toHaveLength(1);
    expect(g[0].id).toBe("expositionCMR");
    expect(g[0].question).toMatch(/cancérogènes, mutagènes ou toxiques/);
  });

  it("ne grave ni un « oui » ni un silence", () => {
    // « oui » par le risque (question sans fait) et par le fait.
    const g = figerExpositionsAbsentes(
      [transverse(risque("trv-routier"))],
      { "q-public": undefined },
      { ...SILENCE, conduiteEngins: true },
    );
    expect(g).toEqual([]);
  });

  it("ne lit pas une clé `false` d'une question qui pose un fait", () => {
    // ADR-041 : la colonne de l'établissement fait foi ; la clé du DUERP
    // n'est plus lue. Un reste en base ne devient pas une absence.
    const g = figerExpositionsAbsentes([], { "q-charges": false }, SILENCE);
    expect(g).toEqual([]);
  });
});

describe("figerExpositionsAbsentes — le document ne se contredit pas", () => {
  it("un « non » dont le risque est gravé n'est pas dit absent", () => {
    // « Non » depuis Équipe, risque travaillé gardé (ADR-041, point 5).
    const g = figerExpositionsAbsentes(
      [transverse(risque("trv-conduite-engins"))],
      null,
      { ...SILENCE, conduiteEngins: false },
    );
    expect(g).toEqual([]);
  });

  it("un CMR « non » n'est pas dit absent si un risque gravé porte l'exposition", () => {
    const unite: UniteSnapshot = { ...transverse(risque("x", true)), estTransverse: false };
    const g = figerExpositionsAbsentes([unite], null, { ...SILENCE, expositionCMR: false, epiPresents: false });
    expect(g).toEqual([]);
  });
});

describe("expositionsAbsentesSnapshot — la lecture du document", () => {
  it("une version d'avant le champ ne liste rien", () => {
    expect(expositionsAbsentesSnapshot({} as DuerpSnapshot)).toEqual([]);
  });

  it("ne lit comme « non » qu'un `false` écrit", () => {
    const snap = {
      expositionsDeclareesAbsentes: [
        { id: "a", question: "Q1 ?", reponse: false },
        { id: "b", question: "Q2 ?", reponse: true },
        { id: "c", question: "Q3 ?", reponse: null },
        { id: "d", question: "", reponse: false },
      ],
    } as unknown as DuerpSnapshot;
    expect(expositionsAbsentesSnapshot(snap).map((e) => e.id)).toEqual(["a"]);
  });
});
