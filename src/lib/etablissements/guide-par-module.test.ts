import { describe, expect, it } from "vitest";
import { POLITIQUE_ABSENCE } from "@/lib/matching/absence";
import type { QuestionSansReponse } from "@/lib/matching/types";
import { PHRASE_SANS_REPONSE } from "@/lib/matching/sans-reponse";
import { phraseFicheIncomplete } from "@/lib/etats-permanents/phrases";
import { FAITS_ACTIVITE } from "./faits-activite";
import {
  enumerer,
  FOYER_DE_LA_QUESTION,
  lienPourRepondre,
  manquesDeLaFiche,
  poseeSurLaFiche,
  precisionsManquantes,
  type RegimeDeLaFiche,
} from "./guide-par-module";

const TRAVAIL: RegimeDeLaFiche = { estERP: false, typeErp: null, typesErpAutres: [], categorieErp: null };
const HOTEL_N3: RegimeDeLaFiche = { estERP: true, typeErp: "O", typesErpAutres: [], categorieErp: "N3" };
const TOUTES = Object.keys(FOYER_DE_LA_QUESTION) as QuestionSansReponse[];

describe("guide par module", () => {
  it("renvoie au DUERP la question de chaque fait d'activité, et rien d'autre", () => {
    // La clé de question vient de la table du moteur, pas d'une liste recopiée.
    const questionsDesFaits = FAITS_ACTIVITE.map((f) => POLITIQUE_ABSENCE[f.champ].question);
    for (const q of questionsDesFaits) expect(FOYER_DE_LA_QUESTION[q].module, q).toBe("duerp");
    const auDuerp = TOUTES.filter((q) => FOYER_DE_LA_QUESTION[q].module === "duerp");
    expect([...auDuerp].sort()).toEqual([...questionsDesFaits].sort());
  });

  it("ne range que les questions muettes du module", () => {
    expect(
      precisionsManquantes("fiche", ["matieres_r4227_22", "manutention_manuelle"], TRAVAIL),
    ).toEqual(["matières inflammables"]);
    expect(precisionsManquantes("duerp", ["matieres_r4227_22"], TRAVAIL)).toEqual([]);
  });

  it("n'annonce pas une question que la fiche ne pose pas à cet établissement", () => {
    const muettes: QuestionSansReponse[] = ["locaux_sommeil_public", "ssi_categorie_ab"];
    expect(precisionsManquantes("fiche", muettes, TRAVAIL)).toEqual([]);
    expect(precisionsManquantes("fiche", muettes, HOTEL_N3)).toEqual([
      "système de sécurité incendie",
      "hébergement de nuit",
    ]);
    expect(poseeSurLaFiche("ssi_categorie_ab", { ...HOTEL_N3, categorieErp: "N5" })).toBe(false);
  });

  it("énumère en français", () => {
    expect(enumerer([])).toBe("");
    expect(enumerer(["a"])).toBe("a");
    expect(enumerer(["a", "b"])).toBe("a et b");
    expect(enumerer(["a", "b", "c"])).toBe("a, b et c");
  });

  it("manquesDeLaFiche : les questions de la fiche derrière des phrases, sans doublon ni fait d'activité", () => {
    const phrases = [
      PHRASE_SANS_REPONSE.matieres_r4227_22,
      PHRASE_SANS_REPONSE.manutention_manuelle,
      PHRASE_SANS_REPONSE.matieres_r4227_22,
      "une phrase inconnue",
    ];
    expect(manquesDeLaFiche(phrases, TRAVAIL)).toEqual(["matières inflammables"]);
    // Une question que la fiche ne pose pas à cet établissement n'est pas dite.
    expect(manquesDeLaFiche([PHRASE_SANS_REPONSE.ssi_categorie_ab], TRAVAIL)).toEqual([]);
  });

  it("lienPourRepondre : la page des risques pour les seuls faits d'activité, la fiche sinon", () => {
    expect(lienPourRepondre([PHRASE_SANS_REPONSE.epi_presents], "e").href).toBe(
      "/etablissements/e/equipe/risques",
    );
    expect(
      lienPourRepondre([PHRASE_SANS_REPONSE.epi_presents, PHRASE_SANS_REPONSE.matieres_r4227_22], "e").href,
    ).toBe("/etablissements/e/modifier");
    expect(lienPourRepondre([], "e").href).toBe("/etablissements/e/modifier");
  });

  it("phraseFicheIncomplete : rien sans ligne ni manque, accordée sinon", () => {
    expect(phraseFicheIncomplete(0, ["a"])).toBeNull();
    expect(phraseFicheIncomplete(2, [])).toBeNull();
    expect(phraseFicheIncomplete(1, ["a"])).toBe(
      "Une ligne est à confirmer : il manque a sur la fiche de l'établissement.",
    );
    expect(phraseFicheIncomplete(3, ["a", "b"])).toBe(
      "3 lignes sont à confirmer : il manque a et b sur la fiche de l'établissement.",
    );
  });
});
