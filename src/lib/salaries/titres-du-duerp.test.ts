// La fiche salarié lit les faits d'activité (ADR-038, ADR-041), et ce que ça
// retire ailleurs. La chaîne fait → titre est gardée par
// `etablissements/faits-activite.test.ts` ; ici, les bornes de la fiche.

import { describe, expect, it } from "vitest";
import {
  titresGouvernesParUnFait,
  type ReponsesFaitsActivite,
} from "@/lib/etablissements/faits-activite";
import { obligationsDeclencheesParUnFait } from "./obligations-evenementielles";
import { titresDuDuerpPourUnePersonne } from "./titres-du-duerp";

const AUCUN: ReponsesFaitsActivite = {
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
};

describe("une seule surface par titre", () => {
  it("un titre gouverné ne figure plus parmi ce qui est dû à tous", () => {
    const gouvernes = titresGouvernesParUnFait();
    const aTous = obligationsDeclencheesParUnFait().map((d) => d.obligation.id);
    expect(aTous.filter((id) => gouvernes.has(id))).toEqual([]);
  });

  it("la formation à la sécurité de L. 4141-2, due à tous, y reste", () => {
    const aTous = obligationsDeclencheesParUnFait().map((d) => d.obligation.id);
    expect(aTous).toContain("formation-securite-salarie-accueil");
  });
});

describe("titresDuDuerpPourUnePersonne", () => {
  const trouver = (r: ReturnType<typeof titresDuDuerpPourUnePersonne>, champ = "conduiteEngins") =>
    r.find((x) => x.champ === champ)!;

  it("sans réponse, chaque fait qui déclenche un titre est présent — et sans réponse", () => {
    const r = titresDuDuerpPourUnePersonne(AUCUN, []);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.reponse === "sans_reponse")).toBe(true);
    // La manutention n'a pas de titre, mais une formation (R. 4541-8) : elle
    // est sur la fiche, sinon elle ne servirait à rien.
    const manutention = r.find((x) => x.champ === "manutentionManuelle");
    expect(manutention?.titres).toEqual([]);
    expect(manutention?.formations.map((o) => o.id)).toContain(
      "formation-securite-etablissement-manutention",
    );
  });

  it("« oui » porte les titres, avec la dernière délivrance de cette personne", () => {
    const titres = [
      { obligationId: "conduite-salarie-formation", delivreLe: new Date("2024-03-01") },
      { obligationId: "conduite-salarie-formation", delivreLe: new Date("2025-06-01") },
    ];
    const q = trouver(titresDuDuerpPourUnePersonne({ ...AUCUN, conduiteEngins: true }, titres));
    expect(q.reponse).toBe("oui");
    const formation = q.titres.find((t) => t.obligation.id === "conduite-salarie-formation")!;
    expect(formation.dernierTitreLe).toEqual(new Date("2025-06-01"));
    const autorisation = q.titres.find((t) => t.obligation.id === "conduite-salarie-autorisation")!;
    expect(autorisation.dernierTitreLe).toBeNull();
    expect(autorisation.condition).toMatch(/risques particuliers/);
  });

  it("« non » reste présent sur la fiche, avec ses titres nommés", () => {
    const q = trouver(titresDuDuerpPourUnePersonne({ ...AUCUN, conduiteEngins: false }, []));
    expect(q.reponse).toBe("non");
    expect(q.titres.length).toBeGreaterThan(0);
  });

  it("le CMR déclaré fait apparaître le suivi individuel renforcé (R. 4624-23, I, 3°)", () => {
    const q = trouver(titresDuDuerpPourUnePersonne({ ...AUCUN, expositionCMR: true }, []), "expositionCMR");
    expect(q.titres.map((t) => t.obligation.id)).toContain("sante-travail-salarie-sir");
  });
});
