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
import type { ReponsesFaitsActivite } from "@/lib/etablissements/faits-activite";
import { CarteTitresDuDuerp, PHRASE_REPONSE, phraseFormation } from "./CarteTitresDuDuerp";

const tous = (v: boolean | null): ReponsesFaitsActivite => ({
  manutentionManuelle: v,
  travailSurEcran: v,
  operationsElectriques: v,
  conduiteEngins: v,
  expositionCMR: v,
});

const rendre = (faits: ReponsesFaitsActivite) => {
  const questions = titresDuDuerpPourUnePersonne(faits, []);
  const html = renderToStaticMarkup(
    <CarteTitresDuDuerp questions={questions} lienVersLaQuestion={(c) => `/q#${c}`} />,
  )
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
  return { questions, html };
};

// Les trois états, sur tous les faits qui déclenchent un titre.
const ETATS = {
  oui: () => rendre(tous(true)),
  non: () => rendre(tous(false)),
  sans_reponse: () => rendre(tous(null)),
} as const;

describe("CarteTitresDuDuerp — ce que l'écran nomme", () => {
  for (const [etat, faire] of Object.entries(ETATS)) {
    it(`nomme chaque titre gouverné, et sa question, quand le DUERP répond « ${etat} »`, () => {
      const { questions, html } = faire();
      expect(questions.length).toBeGreaterThan(0);
      for (const q of questions) {
        expect(q.reponse).toBe(etat);
        expect(html).toContain(q.intitule);
        expect(html).toContain(`/q#${q.champ}`);
        expect(q.titres.length + q.formations.length).toBeGreaterThan(0);
        for (const t of q.titres) expect(html, t.obligation.id).toContain(t.obligation.libelle);
        for (const o of q.formations) expect(html, o.id).toContain(o.libelle);
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

  it("ne dit pas qu'un « oui » rend chaque titre dû à tous les exposés", () => {
    // L'autorisation de conduite et les attestations ne sont dues que sous
    // condition (R. 4323-56 « certains équipements », R. 4544-10 voisinage de
    // pièces nues sous tension) : la carte renvoie à la condition de chaque
    // titre, elle ne la généralise pas (contre-relecture du 2026-10-05, N3).
    expect(ETATS.oui().html).not.toMatch(/sont dus aux|sont concernés/i);
    expect(ETATS.oui().html).toContain("à quelle condition");
  });

  it("écrit « s'il », jamais « si il »", () => {
    expect(ETATS.oui().html).not.toMatch(/\bsi ils?\b/i);
  });

  it("nomme la formation gestes et postures et la formation écran — ce qu'on ne voit pas ne sert à rien", () => {
    // Ni l'une ni l'autre n'est un titre : avant le 2026-10-08, la fiche les
    // taisait, alors qu'un salarié qui porte des charges doit les recevoir.
    const { html } = ETATS.oui();
    expect(html).toContain("gestes et postures");
    expect(html).toMatch(/écran/);
  });

  it("après un « non », ne renvoie pas à une ligne que le moteur a retirée", () => {
    for (const nature of ["etat_permanent", "evenementielle"]) {
      expect(phraseFormation("non", nature)).not.toMatch(/Ce qui doit être en place|Quand ça arrive/);
      expect(phraseFormation("oui", nature)).toMatch(/Ce qui doit être en place|Quand ça arrive/);
    }
  });
});
