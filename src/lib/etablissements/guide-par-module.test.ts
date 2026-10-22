import { describe, expect, it } from "vitest";
import { POLITIQUE_ABSENCE } from "@/lib/matching/absence";
import type { QuestionSansReponse } from "@/lib/matching/types";
import { FAITS_ACTIVITE } from "./faits-activite";
import {
  enumerer,
  FOYER_DE_LA_QUESTION,
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
      precisionsManquantes("fiche", ["matieres_r4227_22", "manutention_manuelle"], true, TRAVAIL),
    ).toEqual(["matières inflammables"]);
    expect(precisionsManquantes("duerp", ["matieres_r4227_22"], false, TRAVAIL)).toEqual([]);
  });

  it("relance la présence d'EPI tant qu'elle n'a pas de réponse, même non marquée", () => {
    expect(precisionsManquantes("fiche", [], false, TRAVAIL)).toEqual(["équipements de protection"]);
    expect(precisionsManquantes("fiche", [], true, TRAVAIL)).toEqual([]);
  });

  it("n'annonce pas une question que la fiche ne pose pas à cet établissement", () => {
    const muettes: QuestionSansReponse[] = ["locaux_sommeil_public", "ssi_categorie_ab"];
    expect(precisionsManquantes("fiche", muettes, true, TRAVAIL)).toEqual([]);
    expect(precisionsManquantes("fiche", muettes, true, HOTEL_N3)).toEqual([
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
});
