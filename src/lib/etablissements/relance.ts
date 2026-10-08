// La relance des questions de la fiche dont le silence retient des lignes
// « à confirmer » (analyse du 2026-09-27, étape 3 ; revue indépendante du lot 1).
//
// UNE ENTRÉE PAR QUESTION, INDEXÉE PAR `QuestionSansReponse` : une question
// neuve que le moteur marquerait sans que la checklist sache la relancer ne
// compile pas. La première version relançait deux questions sur cinq, écrites
// à la main dans la page.
//
// Deux modes, selon la forme de la réponse :
//   - `oui_non` : la réponse se donne dans la checklist, et la question y reste
//     cochée une fois répondue ;
//   - `fiche` : la réponse demande un nombre ou une liste — elle se donne sur la
//     fiche de l'établissement, et l'étape disparaît quand le silence cesse.
//
// Module pur.

import type { QuestionSansReponse } from "@/lib/matching/types";
import { faitParChamp, intituleDuFait, type ChampFaitActivite } from "./faits-activite";

export type QuestionOuiNon =
  | "matieres_r4227_22"
  | "chiffons_impregnes"
  | "locaux_sommeil_public"
  | "manutention_manuelle"
  | "travail_ecran"
  | "operations_electriques"
  | "conduite_engins"
  | "exposition_cmr"
  | "epi_presents";

/** Les colonnes d'`Etablissement` qu'une relance oui/non écrit. */
export type ChampOuiNon =
  | "manipuleMatieresR422722"
  | "chiffonsImpregnes"
  | "comporteLocauxSommeilPublic"
  | ChampFaitActivite
  | "epiPresents";

export type Relance = {
  titre: string;
  pourquoi: string;
} & (
  | {
      mode: "oui_non";
      question: QuestionOuiNon;
      /** La colonne dont la réponse coche l'étape. */
      champ: ChampOuiNon;
    }
  | { mode: "fiche" }
);

const RAPPEL =
  "Tant que la question n'a pas de réponse, ces lignes s'affichent « à confirmer ».";

/**
 * La relance d'un fait d'activité : son titre EST la question, mot pour mot
 * (`intituleDuFait`), et sa raison celle du registre. Une reformulation à part
 * avait rétréci deux questions (relecture du 2026-10-08, R1).
 */
function relanceDuFait(question: QuestionOuiNon, champ: ChampFaitActivite): Relance {
  const fait = faitParChamp(champ);
  return {
    mode: "oui_non",
    question,
    champ,
    titre: intituleDuFait(fait),
    pourquoi: `${fait.pourquoi} ${RAPPEL}`,
  };
}

export const RELANCES: Record<QuestionSansReponse, Relance> = {
  matieres_r4227_22: {
    mode: "oui_non",
    question: "matieres_r4227_22",
    champ: "manipuleMatieresR422722",
    titre: "Dire si vous manipulez des matières explosives ou inflammables",
    pourquoi: `Matières classées explosives, comburantes ou extrêmement inflammables, manipulées et mises en œuvre chez vous. Si oui, l'alarme sonore, la consigne incendie et les exercices semestriels sont dus quel que soit l'effectif (art. R. 4227-34 du Code du travail). ${RAPPEL}`,
  },
  chiffons_impregnes: {
    mode: "oui_non",
    question: "chiffons_impregnes",
    champ: "chiffonsImpregnes",
    titre: "Dire si vous utilisez des chiffons imprégnés",
    pourquoi: `Chiffons, cotons ou papiers imprégnés d'huile, de graisse ou de liquides inflammables — un torchon de cuisine imbibé d'huile en est un. Si oui, ils se rangent après usage dans des récipients métalliques clos et étanches (art. R. 4227-26 du Code du travail). ${RAPPEL}`,
  },
  locaux_sommeil_public: {
    mode: "oui_non",
    question: "locaux_sommeil_public",
    champ: "comporteLocauxSommeilPublic",
    titre: "Dire si votre établissement héberge du public pour la nuit",
    pourquoi: `Chambres d'hôtel, chambres d'hôtes, gîte, hébergement — des locaux où le public dort. Si oui, en 5ᵉ catégorie, s'ajoutent un contrat d'entretien de la détection incendie, des consignes et des plans affichés, et une visite de la commission de sécurité (arrêté du 25 juin 1980, art. PE 4, PE 33, PE 35 et PE 37). ${RAPPEL}`,
  },
  // Les faits d'activité (ADR-041) : le texte de la question et sa raison sont
  // ceux du registre, une seule rédaction pour Équipe, la fiche et le DUERP.
  manutention_manuelle: relanceDuFait("manutention_manuelle", "manutentionManuelle"),
  travail_ecran: relanceDuFait("travail_ecran", "travailSurEcran"),
  operations_electriques: relanceDuFait("operations_electriques", "operationsElectriques"),
  conduite_engins: relanceDuFait("conduite_engins", "conduiteEngins"),
  exposition_cmr: relanceDuFait("exposition_cmr", "expositionCMR"),
  epi_presents: {
    mode: "oui_non",
    question: "epi_presents",
    champ: "epiPresents",
    // Jamais affichée : la fiche a déjà son étape EPI, avec le détail
    // (`etablissements/[id]/page.tsx`). Le typage exhaustif l'exige ; son
    // texte reprend celui de l'étape.
    titre: "Dire si vous fournissez des équipements de protection",
    pourquoi: `Gants, chaussures de sécurité, lunettes, protections auditives… Si oui, l'employeur élabore une consigne d'utilisation de ces équipements (art. R. 4323-105 du Code du travail). ${RAPPEL}`,
  },
  personnes_presentes: {
    mode: "fiche",
    titre: "Indiquer combien de personnes sont habituellement présentes",
    pourquoi: `Salariés et public compris. Au-delà de cinquante, l'alarme sonore, la consigne incendie et les exercices semestriels sont dus (art. R. 4227-34 du Code du travail). ${RAPPEL}`,
  },
  type_erp: {
    // Inatteignable en production depuis la contrainte CHECK
    // `Etablissement_erp_type_categorie_requis` (2026-09-27) : un ERP porte
    // toujours son type. L'entrée existe parce que le moteur sait émettre la
    // marque, et qu'une marque sans relance ne doit pas compiler.
    mode: "fiche",
    titre: "Préciser le type de votre établissement recevant du public",
    pourquoi: `Le type décide de plusieurs obligations de sécurité incendie. ${RAPPEL}`,
  },
};

/**
 * Les étapes de relance d'un dossier : chaque question muette qui retient une
 * ligne CHEZ CE DOSSIER ; et, pour une question oui/non, celle qui a déjà reçu
 * une réponse — elle reste cochée. Ordre : celui de la table.
 */
export function relancesDuDossier(
  questionsMuettes: readonly QuestionSansReponse[],
  reponses: Record<ChampOuiNon, boolean | null>,
): { question: QuestionSansReponse; relance: Relance; faite: boolean }[] {
  const out: { question: QuestionSansReponse; relance: Relance; faite: boolean }[] = [];
  for (const q of Object.keys(RELANCES) as QuestionSansReponse[]) {
    const relance = RELANCES[q];
    const muette = questionsMuettes.includes(q);
    const repondue =
      relance.mode === "oui_non" && reponses[relance.champ] !== null;
    if (muette || repondue) out.push({ question: q, relance, faite: !muette });
  }
  return out;
}
