// Le guide de mise en place renvoie à un MODULE, il ne pose pas les questions
// une par une (décision de la propriétaire du 2026-10-22 : « dire remplir
// équipements ou DUERP plutôt que question par question sur le board »).
//
// Chaque question dont le silence retient une ligne « à confirmer » a un
// foyer où elle se répond déjà :
//   - les faits d'activité → l'étape « Risques transverses » du DUERP, qui les
//     pose tous les cinq sur la même colonne d'établissement (ADR-041) ;
//   - les autres → la fiche de l'établissement (`EtablissementForm`).
// Les précisions d'équipement se répondent sur la fiche de l'appareil.
//
// Indexé par `QuestionSansReponse` : une question neuve que le moteur
// marquerait sans foyer ici ne compile pas.
//
// Module pur.

import type { QuestionSansReponse } from "@/lib/matching/types";
import { CATEGORIES_ERP_QUESTION_SSI } from "./questions";
import { questionSommeilPosee } from "./schema";

export type ModuleDuGuide = "duerp" | "fiche";

export const FOYER_DE_LA_QUESTION: Record<
  QuestionSansReponse,
  { module: ModuleDuGuide; nomCourt: string }
> = {
  manutention_manuelle: { module: "duerp", nomCourt: "manutention" },
  travail_ecran: { module: "duerp", nomCourt: "écran" },
  operations_electriques: { module: "duerp", nomCourt: "électricité" },
  conduite_engins: { module: "duerp", nomCourt: "engins" },
  exposition_cmr: { module: "duerp", nomCourt: "CMR" },
  epi_presents: { module: "fiche", nomCourt: "équipements de protection" },
  ssi_categorie_ab: { module: "fiche", nomCourt: "système de sécurité incendie" },
  locaux_sommeil_public: { module: "fiche", nomCourt: "hébergement de nuit" },
  matieres_r4227_22: { module: "fiche", nomCourt: "matières inflammables" },
  type_erp: { module: "fiche", nomCourt: "type d'ERP" },
  personnes_presentes: { module: "fiche", nomCourt: "personnes présentes" },
};

/** Ce que la fiche lit pour décider des questions qu'elle pose. */
export type RegimeDeLaFiche = {
  estERP: boolean;
  typeErp: string | null;
  typesErpAutres: readonly string[];
  categorieErp: string | null;
};

/**
 * La fiche pose-t-elle cette question à cet établissement ? Mêmes règles que
 * `EtablissementForm` : les locaux à sommeil selon les types
 * (`questionSommeilPosee`), le SSI aux quatre premières catégories d'ERP. Une
 * question que la fiche ne pose pas n'est pas annoncée : l'étape renverrait à
 * un champ absent et ne se fermerait jamais (revue du 2026-10-22).
 */
export function poseeSurLaFiche(q: QuestionSansReponse, regime: RegimeDeLaFiche): boolean {
  if (q === "locaux_sommeil_public") return questionSommeilPosee(regime);
  if (q === "ssi_categorie_ab") {
    return (
      regime.estERP &&
      (CATEGORIES_ERP_QUESTION_SSI as readonly string[]).includes(regime.categorieErp ?? "")
    );
  }
  return true;
}

/**
 * Les noms courts des questions muettes d'un module, dans l'ordre de la table.
 * `epiRepondue` : la présence d'EPI se relance même quand le moteur ne la
 * marque pas — elle conditionne la consigne d'utilisation, et le guide la
 * demandait déjà comme étape à part.
 */
export function precisionsManquantes(
  module: ModuleDuGuide,
  questionsMuettes: readonly QuestionSansReponse[],
  epiRepondue: boolean,
  regime: RegimeDeLaFiche,
): string[] {
  return (Object.keys(FOYER_DE_LA_QUESTION) as QuestionSansReponse[])
    .filter((q) => FOYER_DE_LA_QUESTION[q].module === module)
    .filter((q) => module !== "fiche" || poseeSurLaFiche(q, regime))
    .filter((q) =>
      questionsMuettes.includes(q) || (q === "epi_presents" && !epiRepondue),
    )
    .map((q) => FOYER_DE_LA_QUESTION[q].nomCourt);
}

/** « a », « a et b », « a, b et c ». */
export function enumerer(noms: readonly string[]): string {
  if (noms.length <= 1) return noms.join("");
  return `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
}
