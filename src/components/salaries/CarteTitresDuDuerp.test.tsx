// La carte « Formations liées aux risques du poste », RENDUE (ADR-038).
//
// Pourquoi rendre : la première rédaction ne nommait les titres que sur
// « oui ». Les données étaient justes et la garde qui les lisait passait ;
// c'est l'écran qui les taisait, sur tous les dossiers sans réponse — donc
// tous les dossiers existants à la mise en production (relecture du
// 2026-10-05). Seul un rendu voit ce que l'écran omet.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { titresDuDuerpPourUnePersonne } from "@/lib/salaries/titres-du-duerp";
import { repondreAuxQuestionsTransverses } from "@/lib/transverses/etat";
import { CarteTitresDuDuerp, PHRASE_REPONSE } from "./CarteTitresDuDuerp";

const rendre = (actifs: string[], brut: unknown) => {
  const questions = titresDuDuerpPourUnePersonne(
    repondreAuxQuestionsTransverses(actifs, brut),
    [],
  );
  const html = renderToStaticMarkup(
    <CarteTitresDuDuerp questions={questions} lienVersLaQuestion={(id) => `/q#${id}`} />,
  )
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
  return { questions, html };
};

// Les trois états, sur toutes les questions qui déclenchent un titre :
// « oui » partout, « non » partout, rien nulle part.
const tousOui = () => {
  const { questions } = rendre([], null);
  return questions.map((q) => q.question.risqueIdAssocie);
};
const tousNon = () => {
  const { questions } = rendre([], null);
  return Object.fromEntries(questions.map((q) => [q.question.id, false]));
};
const ETATS = {
  oui: () => rendre(tousOui(), null),
  non: () => rendre([], tousNon()),
  sans_reponse: () => rendre([], null),
} as const;

describe("CarteTitresDuDuerp — ce que l'écran nomme", () => {
  for (const [etat, faire] of Object.entries(ETATS)) {
    it(`nomme chaque titre gouverné, et sa question, quand le DUERP répond « ${etat} »`, () => {
      const { questions, html } = faire();
      expect(questions.length).toBeGreaterThan(0);
      for (const q of questions) {
        expect(q.reponse).toBe(etat);
        expect(html).toContain(q.question.intitule);
        expect(html).toContain(`/q#${q.question.id}`);
        expect(q.titres.length).toBeGreaterThan(0);
        for (const t of q.titres) expect(html, t.obligation.id).toContain(t.obligation.libelle);
      }
      expect(html).toContain(PHRASE_REPONSE[etat as keyof typeof PHRASE_REPONSE]);
    });
  }

  it("ne dit jamais qu'un titre n'est dû, ou proposé, à personne", () => {
    // Les titres restent déclarables sur chaque fiche : le formulaire n'est
    // filtré par aucune réponse. Une phrase qui dit le contraire ment.
    for (const faire of Object.values(ETATS)) {
      expect(faire().html).not.toMatch(/à personne|n'est dû à aucun|ne sont dus à aucun/i);
    }
  });

  it("écrit « s'il », jamais « si il »", () => {
    expect(ETATS.oui().html).not.toMatch(/\bsi ils?\b/i);
  });
});
