// Ce qui rend vraie la phrase « obligation légale de l'employeur envers le
// salarié » de `droits.ts` (décision E8, 2026-09-27).
//
// BORNE HAUTE, pas liste recopiée : un titre qui entre au catalogue sans
// figurer à l'audit fait échouer ce test, et on ne le répare pas en recopiant
// un identifiant — il faut une phrase qui soit, mot pour mot, dans la
// `citationCle` d'un article du corpus, donc un article lu.
//
// CE QUE LA GARDE NE PROUVE PAS : que la phrase met bien l'obligation à la
// charge de l'employeur envers CE salarié. Ça, c'est la lecture humaine de
// l'audit, consignée au journal (C42). La garde tient la phrase au texte et
// le catalogue à l'audit.

import { describe, expect, it } from "vitest";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import { cataloguerTitres } from "./catalogue";
import { texteInformation } from "./droits";
import {
  OBLIGATION_EMPLOYEUR,
  type NatureObligation,
} from "./obligation-employeur";

const espaces = (t: string) => t.replace(/\s+/g, " ").trim();
const INDEX = indexArticlesParRef();

describe("chaque titre suivi est une obligation de l'employeur envers le salarié (E8)", () => {
  it("aucun titre du catalogue n'échappe à l'audit", () => {
    const hors = cataloguerTitres()
      .map((t) => t.id)
      .filter((id) => !(id in OBLIGATION_EMPLOYEUR));
    expect(
      hors,
      "Titre entré au catalogue sans audit E8. `droits.ts` dit au salarié que " +
        "chaque titre suivi est une obligation légale de l'employeur envers " +
        "lui : trouver le texte qui la met à sa charge, ou ne pas l'encoder.",
    ).toEqual([]);
  });

  it("aucune entrée de l'audit ne survit à son titre", () => {
    const ids = new Set(cataloguerTitres().map((t) => t.id));
    expect(Object.keys(OBLIGATION_EMPLOYEUR).filter((id) => !ids.has(id))).toEqual([]);
  });

  it.each(Object.entries(OBLIGATION_EMPLOYEUR))(
    "%s : la phrase est dans le texte lu de son article",
    (_id, o) => {
      const lu = INDEX.get(o.article);
      expect(lu, `${o.article} absent du corpus`).toBeDefined();
      expect(lu!.article.statut).not.toBe("non_depouille");
      expect(espaces(lu!.article.citationCle ?? "")).toContain(espaces(o.phrase));
      // L'employeur est nommé — dans la phrase, ou dans l'intitulé de la
      // division qui porte un article écrit sans sujet (non confrontable au
      // corpus, qui ne porte pas ces intitulés : relu le 2026-09-27).
      if (o.employeurNommePar === "phrase") expect(o.phrase).toMatch(/employeur/);
      else expect(o.employeurNommePar.intituleDeDivision).toMatch(/employeur/);
    },
  );

  it.each(Object.entries(OBLIGATION_EMPLOYEUR))(
    "%s : l'article fondateur est celui que le référentiel cite",
    (id, o) => {
      const titre = cataloguerTitres().find((t) => t.id === id)!;
      expect(titre.referencesLegales.map((r) => r.article)).toContain(o.fondateur);
    },
  );
});

describe("le texte au salarié dit chaque nature d'obligation que l'audit établit", () => {
  // Contre-lecture du 2026-09-27 (M4/M5) : le texte rangeait tout sous
  // « formation, visite, habilitation ou autorisation », alors que l'audit
  // compte des pièces à conserver et une obligation envers le collectif.
  // Chaque nature présente à l'audit doit être dite, par ses mots.
  const MOTS: Record<NatureObligation, RegExp> = {
    formation: /vous former ou vous faire former/,
    habilitation: /une habilitation/,
    autorisation: /une autorisation/,
    piece_a_conserver: /conserver la copie d'une attestation médicale pendant sa\s+durée de validité/,
    service_de_sante: /organiser le service de prévention et de santé au\s+travail qui réalise vos visites/,
  };
  const texte = texteInformation({ raisonSociale: "X", titresSuivis: [] });
  const entrees = Object.values(OBLIGATION_EMPLOYEUR);

  it.each([...new Set(entrees.map((o) => o.nature))])("%s", (nature) => {
    expect(texte).toMatch(MOTS[nature]);
  });

  it("l'obligation envers le collectif est dite comme telle", () => {
    expect(entrees.some((o) => o.envers === "collectif")).toBe(true);
    expect(texte).toMatch(/pour le secourisme, envers l'ensemble du personnel/);
  });
});
