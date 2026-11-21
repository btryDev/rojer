import { describe, it, expect } from "vitest";
import {
  CHAPEAU_R4512_8,
  TEXTE_R4512_8,
  RUBRIQUES_R4512_8,
  rubriquesManquantes,
  rubriquesRenseignees,
  type ContenuPlan,
} from "./contenu-r4512-8";

describe("rubriquesRenseignees : le complément de rubriquesManquantes (2026-11-21)", () => {
  it("les deux se partagent les cinq rubriques ; les remplies dans l'ordre de l'article", () => {
    const plan: ContenuPlan = {
      phasesDangereuses: [],
      adaptationMateriels: "Matériel vérifié",
      instructionsTravailleurs: null,
      organisationSecours: "  ",
      participationCroisee: "Chef de chantier",
    };
    expect(rubriquesRenseignees(plan).map((r) => r.numero)).toEqual([2, 5]);
    expect([...rubriquesRenseignees(plan), ...rubriquesManquantes(plan)].map((r) => r.numero).sort()).toEqual(
      RUBRIQUES_R4512_8.map((r) => r.numero),
    );
  });
});
import { CODE_TRAVAIL_PLAN_PREVENTION } from "@/lib/referentiels/corpus/code-travail-plan-prevention";

/**
 * Le contenu minimal du plan de prévention, tenu par un test parce qu'il est
 * IMPRIMÉ — dans le PDF du plan, joint au ZIP de contrôle et remis à un
 * inspecteur, un assureur, un bailleur ou un acquéreur. ~~Ce que
 * `contenuR4512_8` rend part dans le fichier `07_Plans_de_prevention.txt`~~
 * [2026-11-21 : le 07 n'est plus qu'un index ; `contenuR4512_8` et ses tests
 * de mise en texte (rubrique vide « NON RENSEIGNÉE », saisie citée qui ne
 * contrefait pas la structure) sont retirés avec lui].
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
describe("ce que les surfaces citent est bien le relevé du corpus", () => {
  const entree = CODE_TRAVAIL_PLAN_PREVENTION.articles.find(
    (a) => a.ref === "R. 4512-8",
  );

  it("recompose exactement la citation relevée sur Légifrance", () => {
    // LE SEUL TEST QUI TIENNE LE VERBATIM, ET IL A MANQUÉ DEUX FOIS. La fiche
    // recopiait les cinq alinéas à la main ; les remplacer par une source
    // unique n'a rien tenu de plus, parce que RIEN ne surveillait cette
    // source : `citations-ecran.ts` ne balaie que `src/app`, `src/components`
    // et `src/lib/pdf`, et ne vérifie que des NUMÉROS d'article. En déplaçant
    // le verbatim dans `src/lib/plan-prevention/`, on l'a même sorti du seul
    // balayage existant. Une mutation remplaçant les cinq verbatims par
    // « PERDU » laissait la suite verte.
    //
    // L'ancre est le `citationCle` du corpus, qui porte la date de relevé, la
    // version en vigueur et l'URL Légifrance. Ce test dit : ce que le
    // dirigeant lit à l'écran est ce que quelqu'un est allé relever.
    const recompose = `${CHAPEAU_R4512_8} ${RUBRIQUES_R4512_8.map(
      (r) => `${r.numero}° ${r.verbatim}`,
    ).join(" ; ")}.`;
    expect(recompose).toBe(entree?.citationCle);
    // La même recomposition, telle que les deux écrans l'affichent sous le livre.
    expect(TEXTE_R4512_8).toBe(entree?.citationCle);
  });

  it("garde des titres qui abrègent leur alinéa, sans le trahir", () => {
    // Le PDF et la page du lien impriment le TITRE, pas le verbatim : un titre
    // qui dérive n'est donc pas cosmétique. On ne fige pas les cinq
    // chaînes — une liste figée se répare en la recopiant. On tient le lien :
    // chaque mot substantiel d'un titre se retrouve dans son alinéa.
    const normaliser = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    // Les mots d'interprétation, nommés un par un plutôt que tolérés en bloc :
    // « croisée » résume « d'une entreprise aux travaux réalisés par une
    // autre », que le titre ne pouvait pas porter en entier.
    const interpretations = new Set(["croisee"]);

    for (const r of RUBRIQUES_R4512_8) {
      const alinea = normaliser(r.verbatim);
      const mots = normaliser(r.titre)
        .split(/[^\p{L}]+/u)
        .filter((m) => m.length >= 5 && !interpretations.has(m));
      expect(mots.length).toBeGreaterThanOrEqual(2);
      for (const mot of mots) {
        expect(alinea, `${r.numero}° : « ${mot} » absent de l'alinéa`).toContain(
          mot,
        );
      }
    }
  });
});

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
      expect(rubriquesRenseignees(vide())).toHaveLength(0);
    });
  });

  describe("borne haute — un plan qui les porte toutes", () => {
    it("ne compte aucune rubrique manquante", () => {
      expect(rubriquesManquantes(complet())).toHaveLength(0);
      expect(rubriquesRenseignees(complet())).toHaveLength(RUBRIQUES_R4512_8.length);
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
      // Le moyen manquant se voit — « À compléter » sur la fiche, « non
      // renseignés » dans le PDF — mais la rubrique existe : la jeter aurait
      // fait disparaître la phase que le dirigeant a nommée.
      const partiel: ContenuPlan = {
        ...complet(),
        phasesDangereuses: [
          { phase: "Travail en espace confiné", moyensPrevention: null },
        ],
      };
      expect(rubriquesManquantes(partiel)).toHaveLength(0);
    });

    it("ne prend pas des espaces pour une réponse", () => {
      const blanc: ContenuPlan = {
        ...complet(),
        organisationSecours: "   \n  ",
        phasesDangereuses: [],
      };
      expect(rubriquesManquantes(blanc).map((r) => r.numero)).toEqual([1, 4]);
    });

    it("n'efface pas des moyens stockés sous une phase restée blanche", () => {
      // LE CAS QUI A CHANGÉ LA RÈGLE DU 1°. Une phase en base dont le libellé
      // est blanc mais dont les moyens sont écrits faisait imprimer
      // « 1° … : NON RENSEIGNÉE », et le contenu stocké DISPARAISSAIT du
      // document remis. Une rubrique remplie ne s'efface pas : le 1° reste
      // renseigné, donc imprimé (`rubriquesRenseignees`).
      const bancal: ContenuPlan = {
        ...vide(),
        phasesDangereuses: [
          { phase: "  ", moyensPrevention: "Consignation électrique" },
        ],
      };
      expect(rubriquesManquantes(bancal).map((r) => r.numero)).toEqual([
        2, 3, 4, 5,
      ]);
      expect(rubriquesRenseignees(bancal).map((r) => r.numero)).toEqual([1]);
    });
  });
});
