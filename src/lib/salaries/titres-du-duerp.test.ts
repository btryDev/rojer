// Le lien DUERP → titre salarié (ADR-038), et ce qu'il retire ailleurs.
//
// Pas de liste exhaustive des liens : elle se réparerait en recopiant le
// référentiel. On tient trois bornes — le lien ne pointe que vers des titres
// qui existent, un titre gouverné ne s'affiche plus comme dû à tous, et ce qui
// est dû à tous reste affiché — et un cas par réponse.

import { describe, expect, it } from "vitest";
import { questionsDetectionTransverses } from "@/lib/referentiels";
import { titreParId, titresGouvernesParUneQuestion } from "./catalogue";
import { obligationsDeclencheesParUnFait } from "./obligations-evenementielles";
import { titresDuDuerpPourUnePersonne } from "./titres-du-duerp";
import { repondreAuxQuestionsTransverses } from "@/lib/transverses/etat";

describe("référentiel — le lien part d'une question et finit sur un titre", () => {
  it("chaque titre déclenché est un titre du catalogue salarié", () => {
    const morts = questionsDetectionTransverses.flatMap((q) =>
      (q.declencheTitres ?? [])
        .filter((id) => titreParId(id) === undefined)
        .map((id) => `${q.id} → ${id}`),
    );
    expect(morts).toEqual([]);
  });

  it("au moins une question gouverne l'habilitation électrique et la conduite", () => {
    // Borne basse : la raison d'être du lot. Retirer l'un de ces liens doit
    // se voir ici, pas sur une fiche.
    const gouvernes = titresGouvernesParUneQuestion();
    expect(gouvernes.has("elec-salarie-habilitation")).toBe(true);
    expect(gouvernes.has("conduite-salarie-formation")).toBe(true);
  });
});

describe("une seule surface par titre", () => {
  it("un titre gouverné ne figure plus parmi ce qui est dû à tous", () => {
    const gouvernes = titresGouvernesParUneQuestion();
    const aTous = obligationsDeclencheesParUnFait().map((d) => d.obligation.id);
    expect(aTous.filter((id) => gouvernes.has(id))).toEqual([]);
  });

  it("la formation à la sécurité de L. 4141-2, due à tous, y reste", () => {
    // Borne de l'autre côté : le filtre ne doit pas vider la carte.
    const aTous = obligationsDeclencheesParUnFait().map((d) => d.obligation.id);
    expect(aTous).toContain("formation-securite-salarie-accueil");
  });
});

describe("titresDuDuerpPourUnePersonne", () => {
  const CONDUITE = "q-conduite-engins";
  const trouver = (r: ReturnType<typeof titresDuDuerpPourUnePersonne>, id = CONDUITE) =>
    r.find((x) => x.question.id === id)!;

  it("sans DUERP, chaque question qui déclenche un titre est sans réponse — et présente", () => {
    const r = titresDuDuerpPourUnePersonne(null, []);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.reponse === "sans_reponse")).toBe(true);
    // Une question sans titre (le risque routier) n'a rien à faire sur la fiche.
    expect(r.some((x) => x.question.id === "q-routier")).toBe(false);
  });

  it("« oui » porte les titres, avec la dernière délivrance de cette personne", () => {
    const repondues = repondreAuxQuestionsTransverses(["trv-conduite-engins"], null);
    const titres = [
      { obligationId: "conduite-salarie-formation", delivreLe: new Date("2024-03-01") },
      { obligationId: "conduite-salarie-formation", delivreLe: new Date("2025-06-01") },
    ];
    const q = trouver(titresDuDuerpPourUnePersonne(repondues, titres));
    expect(q.reponse).toBe("oui");
    const formation = q.titres.find((t) => t.obligation.id === "conduite-salarie-formation")!;
    expect(formation.dernierTitreLe).toEqual(new Date("2025-06-01"));
    const autorisation = q.titres.find((t) => t.obligation.id === "conduite-salarie-autorisation")!;
    expect(autorisation.dernierTitreLe).toBeNull();
    expect(autorisation.condition).toMatch(/risques particuliers/);
  });

  it("« non » reste présent sur la fiche, avec ses titres nommés", () => {
    const repondues = repondreAuxQuestionsTransverses([], { [CONDUITE]: false });
    const q = trouver(titresDuDuerpPourUnePersonne(repondues, []));
    expect(q.reponse).toBe("non");
    expect(q.titres.length).toBeGreaterThan(0);
  });
});
