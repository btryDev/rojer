// De la question du DUERP au titre sur la fiche : la chaîne entière, une
// question à la fois (ADR-038).
//
// Pourquoi une garde de plus (relevé le 2026-10-07, en injectant une
// INVERSION — les `declencheTitres` de la question électrique et de la
// question de conduite échangés) : trois tests tombaient déjà, mais par
// ricochet — deux du tableau de bord (`transmissions.test.ts`) et un de la
// fiche (`titres-du-duerp.test.ts`), chacun sur UN cas. Aucun ne disait la
// règle : qu'une question ne déclenche que ce que son article fonde. Ce
// fichier la dit, pour chaque question, et fait tomber l'inversion sur trois
// cas de plus (et la cause en clair dans le message d'échec).
//
// La garde ne recopie pas la liste des liens. Elle les confronte au DROIT
// déjà écrit ailleurs : un titre n'est déclenché par une question que si l'un
// des articles qui le fondent est cité par le risque que cette question ajoute
// au DUERP (sa description ou ses mesures). La conduite cite R. 4323-55/56,
// l'électricité R. 4544-9/10 : une inversion fait tomber les deux.

import { describe, expect, it } from "vitest";
import {
  questionsDetectionTransverses,
  tousRisquesConnus,
} from "@/lib/referentiels";
import { titreParId } from "@/lib/salaries/catalogue";
import { titresDuDuerpPourUnePersonne } from "@/lib/salaries/titres-du-duerp";
import { repondreAuxQuestionsTransverses } from "./etat";

const ARTICLE = /\b[LRD]\. ?\d{4}-\d+(?:-\d+)*/g;
const articlesCites = (texte: string) =>
  new Set((texte.match(ARTICLE) ?? []).map((a) => a.replace(/\s+/g, " ")));

const questionsQuiDeclenchent = questionsDetectionTransverses.filter(
  (q) => (q.declencheTitres ?? []).length > 0,
);

describe("chaque question qui déclenche un titre — la chaîne entière", () => {
  it("il y en a, et ce sont au moins l'électricité et la conduite", () => {
    // Borne basse : la raison d'être du lot, nommée.
    const parQuestion = new Map(
      questionsQuiDeclenchent.map((q) => [q.id, q.declencheTitres ?? []]),
    );
    expect(parQuestion.get("q-operations-electriques")).toContain("elec-salarie-habilitation");
    expect(parQuestion.get("q-conduite-engins")).toContain("conduite-salarie-formation");
  });

  for (const q of questionsQuiDeclenchent) {
    describe(q.id, () => {
      const risque = tousRisquesConnus().get(q.risqueIdAssocie);

      it("ajoute au DUERP un risque que l'écran des mesures sait retrouver", () => {
        // `mesures/page.tsx` lit `tousRisquesConnus().get(referentielId)` : un
        // risque absent de cette table n'aurait aucune mesure à l'écran.
        expect(risque, q.risqueIdAssocie).toBeDefined();
      });

      it("propose au DUERP une mesure de type formation", () => {
        expect(risque!.mesuresRecommandees.some((m) => m.type === "formation")).toBe(true);
      });

      it("ne déclenche que des titres fondés sur un article que son risque cite", () => {
        const cites = articlesCites(
          [risque!.description ?? "", ...risque!.mesuresRecommandees.map((m) => m.libelle)].join(" "),
        );
        const sansFondementCite = (q.declencheTitres ?? []).filter((id) => {
          const titre = titreParId(id);
          if (!titre) return true;
          return !titre.referencesLegales.some((r) => r.article && cites.has(r.article));
        });
        expect(sansFondementCite, `articles cités : ${[...cites].join(", ")}`).toEqual([]);
      });

      it("sur un « oui », arrive sur la fiche avec exactement ses titres", () => {
        const fiche = titresDuDuerpPourUnePersonne(
          repondreAuxQuestionsTransverses([q.risqueIdAssocie], null),
          [],
        );
        const ligne = fiche.find((x) => x.question.id === q.id)!;
        expect(ligne.reponse).toBe("oui");
        expect(ligne.titres.map((t) => t.obligation.id).sort()).toEqual(
          [...(q.declencheTitres ?? [])].sort(),
        );
        // Et un « oui » à CETTE question ne fait passer aucune autre à « oui ».
        expect(fiche.filter((x) => x.reponse === "oui").map((x) => x.question.id)).toEqual([q.id]);
      });
    });
  }
});
