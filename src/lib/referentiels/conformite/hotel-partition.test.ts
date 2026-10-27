import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "@/lib/matching";
import type { EtablissementMatching } from "@/lib/matching";
import { CATEGORIES_ERP, TYPES_ERP } from "../types-communs";

/**
 * L'hôtel de 5ᵉ catégorie : une ligne par acte (2026-10-13).
 *
 * Deux actes du livre III sont dus à tout ERP de 5ᵉ catégorie, et l'hôtel les
 * doit à un autre rythme : le contrôle de l'ensemble des installations
 * techniques (PE 4 § 2, trois ans au plus ; PO 1 § 3, deux ans) et
 * l'instruction du personnel (PE 27 § 5, sans rythme ; PO 7, deux séances par
 * an). Aux hôtels existants, PO 8 § 1 applique sa section « en complément
 * des articles PE 4, […] PO 1 (§ 3) », qui restent donc dus, et PO 12 rend
 * applicables PE 27 § 5 et PO 7 : l'hôtel doit les deux textes de chaque
 * paire, mais un seul contrôle et une seule formation. La ligne générale
 * exclut le type O, la ligne de l'hôtel ne vise que lui.
 *
 * Le test tient la partition sur ce que reçoit l'établissement, pour chacun
 * des types d'ERP en 5ᵉ catégorie : exactement une ligne de chaque paire.
 * Il rougit si l'exclusion du type O est retirée d'une ligne générale (deux
 * rendez-vous pour un acte), ou si la ligne de l'hôtel cesse de le viser
 * (aucun).
 */

const PAIRES = [
  {
    acte: "contrôle de l'ensemble des installations techniques",
    general: "incendie-erp-pe4-entretien-installations-techniques",
    hotel: "incendie-hotel-po-controle-biennal-installations",
  },
  {
    acte: "instruction et entraînement du personnel",
    general: "incendie-erp-5-instruction-personnel",
    hotel: "incendie-hotel-po-instruction-personnel-semestrielle",
  },
] as const;

const etab = (o: Partial<EtablissementMatching>): EtablissementMatching => ({
  id: "etab",
  effectifSurSite: 8,
  effectifEntreprise: 8,
  estEtablissementTravail: true,
  estERP: true,
  estIGH: false,
  estHabitation: false,
  typeErp: "N",
  typesErpAutres: [],
  categorieErp: "N5",
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: 30,
  effectifPublicAdmis: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
  ...o,
});

const ids = (e: EtablissementMatching) =>
  new Set(determineObligationsApplicables(e, []).map((a) => a.obligation.id));

describe("ERP de 5ᵉ catégorie : une ligne par acte, l'hôtel à son rythme", () => {
  for (const typeErp of TYPES_ERP) {
    it(`type ${typeErp}`, () => {
      const recues = ids(etab({ typeErp }));
      for (const { acte, general, hotel } of PAIRES) {
        const attendue = typeErp === "O" ? hotel : general;
        expect(
          [general, hotel].filter((id) => recues.has(id)),
          `${acte}, type ${typeErp}`,
        ).toEqual([attendue]);
      }
    });
  }
});

describe("l'hôtel des quatre premières catégories ne reçoit aucune des deux", () => {
  // Le chapitre PO est au livre III : 5ᵉ catégorie seulement. Le livre II a
  // son propre chapitre O, qui n'est pas ouvert.
  for (const categorieErp of CATEGORIES_ERP.filter((c) => c !== "N5")) {
    it(categorieErp, () => {
      const recues = ids(etab({ typeErp: "O", typesErpAutres: [], categorieErp }));
      for (const { general, hotel } of PAIRES) {
        expect(recues.has(general)).toBe(false);
        expect(recues.has(hotel)).toBe(false);
      }
    });
  }
});
