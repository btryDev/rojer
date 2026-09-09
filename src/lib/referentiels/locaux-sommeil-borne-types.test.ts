import { describe, expect, it } from "vitest";
import { obligationsConformite } from "./conformite";
import type { Obligation } from "./conformite/types";
import {
  TYPE_ERP,
  TYPES_ERP_QUESTION_LOCAUX_SOMMEIL,
  TYPES_ERP_HORS_QUESTION_LOCAUX_SOMMEIL,
} from "@/lib/etablissements/schema";

/**
 * LA BORNE PAR TYPE DES QUATRE LIGNES DE LOCAUX À SOMMEIL (2026-09-09).
 *
 * Ce que cette garde tient n'est pas la liste J, O, U, R — elle est une
 * décision de produit, arbitrée par la propriétaire sur l'avis d'un
 * spécialiste, et aucun article ne la fonde (cf. `NOTE_BORNE_TYPES_SOMMEIL`,
 * `conformite/incendie.ts`). Ce qu'elle tient, c'est que les DEUX ENDROITS où
 * cette décision vit ne divergent pas :
 *
 *   — le PARCOURS et la fiche, qui décident à qui la question est posée, par
 *     `TYPES_ERP_QUESTION_LOCAUX_SOMMEIL` (`etablissements/schema.ts`) ;
 *   — le RÉFÉRENTIEL, qui décide qui les obligations visent, par le
 *     `typesExclus` écrit en clair sur chacune des quatre.
 *
 * Les deux ne peuvent pas être la même constante : `src/lib/referentiels/` ne
 * doit pas dépendre du schéma Zod des formulaires. C'est donc ici que le lien
 * se fait, comme `categories-erp.test.ts` le fait déjà pour les catégories.
 *
 * LA LISTE N'EST PAS RECOPIÉE, ELLE EST DÉRIVÉE de `TYPE_ERP`. Une lettre
 * ajoutée à la nomenclature de `GN 1` et oubliée dans le `typesExclus` fait
 * tomber ce fichier en la nommant — et le sens de l'oubli est celui qui se
 * voit : le type inconnu tombe DANS le champ des obligations, jamais dehors.
 */

const IDS = [
  "incendie-erp-5-visite-commission",
  "incendie-erp-5-sommeil-contrat-entretien-sdi",
  "incendie-erp-5-sommeil-consigne-chambres",
  "incendie-erp-5-sommeil-plans-affiches",
] as const;

function ligne(id: string): Obligation {
  const trouvees = obligationsConformite.filter((o) => o.id === id);
  expect(
    trouvees.length,
    `\`${id}\` doit exister une fois et une seule au référentiel : c'est l'une ` +
      "des quatre lignes que la borne du 2026-09-09 restreint, et toute cette " +
      "garde en dépend.",
  ).toBe(1);
  return trouvees[0];
}

function erpDe(o: Obligation) {
  const erp = o.typologies?.erp;
  expect(
    typeof erp === "object" && erp !== null,
    `\`${o.id}\` doit porter une typologie ERP structurée (\`{ categories, ` +
      "typesExclus }`). Un `erp: true` la ferait tomber chez tout ERP, toutes " +
      "catégories et tous types confondus.",
  ).toBe(true);
  return erp as { categories?: string[]; types?: string[]; typesExclus?: string[] };
}

describe("locaux à sommeil — la borne par type, et son accord avec le parcours", () => {
  it("les quatre lignes excluent exactement le complément de J, O, U et R", () => {
    // LE CŒUR DE LA GARDE. `attendu` est calculé à partir de `TYPE_ERP` : il
    // n'y a rien à recopier, donc rien à « réparer » en recopiant. Une
    // divergence se corrige à sa source — soit la liste des quatre types, soit
    // le `typesExclus` de la ligne fautive.
    const attendu = [...TYPES_ERP_HORS_QUESTION_LOCAUX_SOMMEIL].sort();
    for (const id of IDS) {
      const erp = erpDe(ligne(id));
      expect([...(erp.typesExclus ?? [])].sort(), id).toEqual(attendu);
    }
  });

  it("aucune des quatre n'exclut l'un des quatre types de la question", () => {
    // La borne haute de la précédente, et elle tombe séparément : une liste
    // d'exclusion qui contiendrait « O » viderait la ligne de son public
    // principal sans que le compte des types ne bouge forcément.
    for (const id of IDS) {
      const exclus = erpDe(ligne(id)).typesExclus ?? [];
      for (const t of TYPES_ERP_QUESTION_LOCAUX_SOMMEIL) {
        expect(exclus, `${id} exclut ${t}`).not.toContain(t);
      }
    }
  });

  it("aucune des quatre n'emploie `types` — l'ERP sans type déclaré doit passer", () => {
    // CE TEST N'EST PAS UNE PRÉFÉRENCE DE STYLE. `types` REJETTE l'ERP dont le
    // `typeErp` n'est pas renseigné ; `typesExclus` le RETIENT. Écrire la même
    // borne avec `types: ["J","O","U","R"]` donnerait un référentiel qui a
    // l'air identique et qui retire quatre lignes, en silence, à tout dossier
    // dont le type n'a pas été rempli. C'est le faux négatif muet que la carto
    // des obligations hors équipement cherche à supprimer.
    for (const id of IDS) {
      const erp = erpDe(ligne(id));
      expect(
        erp.types,
        `\`${id}\` doit borner par \`typesExclus\`, jamais par \`types\` : ` +
          "une restriction `types` rejette l'ERP dont le type n'est pas " +
          "renseigné, et lui retirerait la ligne sans que personne ne le voie.",
      ).toBeUndefined();
    }
  });

  it("la borne reste couplée au critère de sommeil, elle ne le remplace pas", () => {
    // Sans ce test, retirer `locauxSommeilPublic: true` passerait au vert :
    // les quatre lignes tomberaient alors chez TOUS les J, O, U et R de 5ᵉ
    // catégorie, y compris ceux qui ont répondu « non ». Le type dit à qui la
    // question est posée ; la réponse dit si l'obligation est due.
    for (const id of IDS) {
      expect(ligne(id).typologies?.locauxSommeilPublic, id).toBe(true);
    }
  });

  it("les quatre types de la question sont tous à la nomenclature de GN 1", () => {
    // Une lettre inventée dans `TYPES_ERP_QUESTION_LOCAUX_SOMMEIL` sortirait
    // silencieusement du complément et ne bornerait plus rien.
    for (const t of TYPES_ERP_QUESTION_LOCAUX_SOMMEIL) {
      expect(TYPE_ERP as readonly string[], t).toContain(t);
    }
  });
});
