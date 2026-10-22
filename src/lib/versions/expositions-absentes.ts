// Les expositions que le dirigeant a déclarées absentes, gravées avec la
// version et relues par le document (chantiers-ouverts § 17.2, décision de la
// propriétaire du 2026-10-12).
//
// Le pendant de la couverture de l'ADR-020, un cran plus bas : celle-là grave
// ce que le DUERP ne couvre pas, celle-ci ce qu'il a examiné et écarté. L'INRS
// veut que le document dise sa méthode et l'inventaire des risques évalués ; le
// rapport complet OiRA récapitule aussi les risques jugés en ordre. Sans cette
// liste, un « non » à la conduite d'engins et une question jamais lue
// donnaient le même document.
//
// ## Deux sources, aucune nouvelle phrase
//
// - les questions transverses, lues par la règle de `transverses/etat.ts` —
//   le risque d'abord, puis le fait d'activité (ADR-041), puis
//   `Duerp.reponsesTransverses` : l'écran et le document ne relisent pas les
//   réponses chacun à sa façon ;
// - les faits d'activité qu'aucune question transverse ne porte (le CMR),
//   avec l'intitulé du registre (`intituleDuFait`).
// Le texte imprimé est celui de la question, jamais un code ni une
// reformulation : un seul intitulé, relu une fois.
//
// ## Le document ne se contredit pas
//
// Un « non » donné depuis Équipe garde au DUERP un risque déjà travaillé
// (ADR-041, point 5). Le document imprimerait alors le risque ET son absence.
// `transverses/etat.ts` le tranche déjà pour les autres questions — « le
// risque est ce que le document imprime ; l'état ne peut pas le contredire » —
// et la même règle vaut ici : un « non » dont le risque est au document n'est
// pas gravé comme absent. Même chose pour le CMR, dès qu'un risque gravé porte
// l'exposition.
//
// Module pur : ni base ni horloge.

import {
  FAITS_ACTIVITE,
  intituleDuFait,
  type ReponsesFaitsActivite,
} from "@/lib/etablissements/faits-activite";
import {
  repondreAuxQuestionsTransverses,
  risquesTransversesActifs,
} from "@/lib/transverses/etat";
import type {
  DuerpSnapshot,
  ExpositionAbsenteSnapshot,
  UniteSnapshot,
} from "./snapshot";

/**
 * Les « non » à graver, dans l'ordre du référentiel puis du registre des faits.
 *
 * `unites` : les unités telles qu'elles partent dans le snapshot — c'est sur
 * elles, et non sur la base, que se juge la contradiction avec le document.
 * `reponsesTransverses` : la colonne `Duerp.reponsesTransverses`, telle quelle.
 */
export function figerExpositionsAbsentes(
  unites: readonly Pick<UniteSnapshot, "estTransverse" | "risques">[],
  reponsesTransverses: unknown,
  faits: ReponsesFaitsActivite,
): ExpositionAbsenteSnapshot[] {
  const actifs = new Set(risquesTransversesActifs(unites));
  const transverses = repondreAuxQuestionsTransverses(
    actifs,
    reponsesTransverses,
    faits,
  )
    .filter((q) => q.reponse === "non")
    // Le risque est au document : la question n'y sera pas dite absente.
    .filter((q) => !actifs.has(q.question.risqueIdAssocie))
    .map<ExpositionAbsenteSnapshot>((q) => ({
      id: q.question.id,
      question: q.question.intitule,
      reponse: false,
    }));

  const cmrAuDocument = unites.some((u) => u.risques.some((r) => r.exposeCMR));
  const autresFaits = FAITS_ACTIVITE.filter((f) => !f.questionTransverse)
    .filter((f) => faits[f.champ] === false)
    .filter((f) => !(f.champ === "expositionCMR" && cmrAuDocument))
    // Fournir ou non des EPI n'est pas une exposition : un « non » ne se grave
    // pas comme un risque examiné et écarté (2026-10-22).
    .filter((f) => f.champ !== "epiPresents")
    .map<ExpositionAbsenteSnapshot>((f) => ({
      id: f.champ,
      question: intituleDuFait(f),
      reponse: false,
    }));

  return [...transverses, ...autresFaits];
}

/**
 * Ce que le document imprime. `[]` pour une version figée avant le champ — elle
 * se régénère telle qu'elle était, sans section, et sans qu'on aille chercher
 * les réponses d'aujourd'hui. Seul un `false` écrit est lu comme un « non » :
 * une ligne abîmée ou d'une autre forme ne devient pas une absence déclarée.
 */
export function expositionsAbsentesSnapshot(
  snapshot: Pick<DuerpSnapshot, "expositionsDeclareesAbsentes">,
): ExpositionAbsenteSnapshot[] {
  const liste = snapshot.expositionsDeclareesAbsentes;
  if (!Array.isArray(liste)) return [];
  return liste.filter(
    (e) => e.reponse === false && typeof e.question === "string" && e.question.length > 0,
  );
}
