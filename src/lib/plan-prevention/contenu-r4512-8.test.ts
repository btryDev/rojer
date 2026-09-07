import { describe, it, expect } from "vitest";
import {
  RUBRIQUES_R4512_8,
  contenuR4512_8,
  rubriquesManquantes,
  type ContenuPlan,
} from "./contenu-r4512-8";

/**
 * Le contenu minimal du plan de prévention, tenu par un test parce qu'il est
 * IMPRIMÉ. Ce que `contenuR4512_8` rend part dans le fichier
 * `07_Plans_de_prevention.txt` du ZIP de contrôle, remis à un inspecteur, un
 * assureur, un bailleur ou un acquéreur.
 *
 * `R. 4512-8` écrit « comportent AU MOINS les dispositions suivantes », puis
 * cinq alinéas — verbatim relevé sur Légifrance le 2026-09-07
 * (LEGIARTI000018529781, en vigueur au 1er mai 2008).
 *
 * CE QUE CES TESTS NE FONT PAS : recopier les cinq libellés. Une liste
 * exhaustive se répare en la recopiant, et cesse alors de vérifier quoi que ce
 * soit — elle dirait seulement que deux copies de la même liste sont égales.
 * Ce qui est tenu ici, c'est le COMPORTEMENT que les surfaces attendent, aux
 * deux bornes et sur la frontière voisine.
 */
describe("contenu minimal du plan — art. R. 4512-8", () => {
  const vide = (): ContenuPlan => ({
    phasesDangereuses: [],
    adaptationMateriels: null,
    instructionsTravailleurs: null,
    organisationSecours: null,
    participationCroisee: null,
  });

  const complet = (): ContenuPlan => ({
    phasesDangereuses: [
      { phase: "Découpe au chalumeau en toiture", moyensPrevention: "Permis de feu, extincteur à poste" },
    ],
    adaptationMateriels: "Nacelle vérifiée le 12-03-2026",
    instructionsTravailleurs: "Accueil sécurité, harnais obligatoire",
    organisationSecours: "Deux SST en journée, DAE dans le hall",
    participationCroisee: "Aucun salarié du site ne participe aux travaux",
  });

  describe("borne basse — un plan qui ne dit rien", () => {
    it("compte toutes les rubriques comme manquantes", () => {
      expect(rubriquesManquantes(vide())).toHaveLength(
        RUBRIQUES_R4512_8.length,
      );
    });

    it("n'omet aucune rubrique du document imprimé", () => {
      // LE POINT DE CE TEST : une rubrique vide doit s'IMPRIMER vide, pas
      // disparaître. Un destinataire qui lit un plan dont trois rubriques ont
      // été silencieusement omises lit un plan qu'il croit complet — c'est le
      // défaut exact que ce lot corrige, et le seul que le ZIP puisse
      // reproduire sans que personne s'en aperçoive.
      const texte = contenuR4512_8(vide()).join("\n");
      for (const r of RUBRIQUES_R4512_8) {
        expect(texte).toContain(`${r.numero}° ${r.titre} : NON RENSEIGNÉE`);
      }
    });
  });

  describe("borne haute — un plan qui les porte toutes", () => {
    it("ne compte aucune rubrique manquante", () => {
      expect(rubriquesManquantes(complet())).toHaveLength(0);
    });

    it("imprime ce qui a été saisi, et ne dit « non renseignée » nulle part", () => {
      const texte = contenuR4512_8(complet()).join("\n");
      expect(texte).toContain("Nacelle vérifiée le 12-03-2026");
      expect(texte).toContain("Accueil sécurité, harnais obligatoire");
      expect(texte).toContain("Deux SST en journée, DAE dans le hall");
      expect(texte).toContain("Aucun salarié du site ne participe aux travaux");
      expect(texte).toContain("Découpe au chalumeau en toiture");
      expect(texte).toContain("Permis de feu, extincteur à poste");
      expect(texte).not.toContain("NON RENSEIGNÉE");
    });
  });

  describe("la couche voisine — le 1° n'est pas l'analyse d'interférence", () => {
    it("tient le 1° pour manquant sur un plan qui n'a que ses lignes risque ↔ mesures", () => {
      // LA DÉCISION DU 2026-09-07, ET CELLE QU'UN REFACTOR PEUT DÉFAIRE SANS
      // QUE RIEN NE CRIE. Les `LignePlanPrevention` transcrivent le second
      // alinéa de R. 4512-6 — les risques « pouvant résulter de
      // l'INTERFÉRENCE entre les activités » —, quand le 1° de R. 4512-8 vise
      // les phases dangereuses de l'opération elle-même. Une couverture de
      // toiture sans co-activité n'a aucun risque d'interférence et garde ses
      // phases dangereuses.
      //
      // `ContenuPlan` ne connaît volontairement PAS les lignes : c'est la
      // garantie structurelle. Ce test la rend visible — un plan par ailleurs
      // complet, mais sans phases, doit encore signaler le 1°.
      const sansPhases: ContenuPlan = { ...complet(), phasesDangereuses: [] };
      const manquantes = rubriquesManquantes(sansPhases);
      expect(manquantes.map((r) => r.numero)).toEqual([1]);
    });
  });

  describe("le renseigné à moitié", () => {
    it("tient le 1° pour renseigné quand une phase n'a pas encore ses moyens", () => {
      // Le moyen manquant se voit — « À compléter » sur la fiche, « — » dans
      // le ZIP — mais la rubrique existe : la jeter aurait fait disparaître la
      // phase que le dirigeant a nommée.
      const partiel: ContenuPlan = {
        ...complet(),
        phasesDangereuses: [
          { phase: "Travail en espace confiné", moyensPrevention: null },
        ],
      };
      expect(rubriquesManquantes(partiel)).toHaveLength(0);
      const texte = contenuR4512_8(partiel).join("\n");
      expect(texte).toContain("Travail en espace confiné");
      expect(texte).toContain("→ moyens : —");
    });

    it("ne prend pas des espaces pour une réponse", () => {
      const blanc: ContenuPlan = {
        ...complet(),
        organisationSecours: "   \n  ",
        phasesDangereuses: [{ phase: "  ", moyensPrevention: "x" }],
      };
      expect(rubriquesManquantes(blanc).map((r) => r.numero)).toEqual([1, 4]);
    });
  });
});
