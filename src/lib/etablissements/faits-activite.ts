// Les faits d'activité d'un établissement qui rendent dues des formations ou
// un suivi (ADR-041).
//
// UN FAIT VIT UNE FOIS, SUR L'ÉTABLISSEMENT. C'est la définition de Rojer :
// « le DUERP n'est pas un silo, c'est une vue spécifique sur cette donnée ».
// L'ADR-038 avait rangé la réponse dans le DUERP ; un dirigeant qui n'avait pas
// commencé son DUERP ne pouvait donc pas dire qu'un salarié conduit un chariot,
// et la conformité ne lisait pas la réponse. Ici, une colonne d'établissement
// par fait (`schema.prisma`, même régime que `chiffonsImpregnes`), et trois
// lecteurs :
//   - le moteur (`matching/`), qui retire sur un « non » déclaré les
//     obligations que le fait conditionne (`TypologieApplication.activite`) ;
//   - la fiche salarié, qui présente les titres que le fait rend dus
//     (`salaries/titres-du-duerp.ts`) ;
//   - le DUERP, dont l'étape transverse affiche et modifie la même réponse
//     (`questionTransverse`) et y rattache son risque.
//
// Le registre ne porte QUE des faits qu'un article attache à une formation, un
// titre ou un suivi — la règle de la propriétaire du 2026-10-08 : « déclenché
// par le DU et dans la législation → répercuté ». Il n'encode aucune
// obligation : il dit quel fait déclenche celles qui existent.
//
// Module pur.

import type { ActiviteDeclaree } from "@/lib/referentiels/types-communs";

/**
 * Les colonnes d'`Etablissement` qui portent un fait d'activité posé par ce
 * registre. `epiPresents` est aussi lu par le moteur, mais sa question vit sur
 * la fiche établissement depuis l'ADR-025 : il n'est pas reposé ici.
 */
export type ChampFaitActivite = Exclude<ActiviteDeclaree, "epiPresents">;

export type FaitActivite = {
  champ: ChampFaitActivite;
  /**
   * La question transverse du DUERP qui pose le même fait, s'il y en a une.
   * Son intitulé est la question affichée partout : un seul texte, relu une
   * fois (`commun.ts`, garde des citations).
   */
  questionTransverse?: string;
  /** L'intitulé, quand aucune question transverse ne le porte. */
  question?: string;
  /** Ce que la réponse change, en une phrase factuelle, avec son article. */
  pourquoi: string;
  /**
   * Les titres du catalogue salarié que ce fait rend dus à une partie de
   * l'effectif. Repris de `QuestionDetection.declencheTitres` (ADR-038), qui a
   * quitté les questions : le lien part du fait, la question n'en est qu'une
   * entrée. `titres-du-duerp.test.ts` exige que chacun existe et soit fondé
   * sur un article que le fait cite.
   */
  declencheTitres: readonly string[];
};

export const FAITS_ACTIVITE: readonly FaitActivite[] = [
  {
    champ: "manutentionManuelle",
    questionTransverse: "q-charges",
    pourquoi:
      "Si oui, l'employeur fait bénéficier ces travailleurs d'une formation à la sécurité portant sur les gestes et postures (art. R. 4541-8 du Code du travail).",
    declencheTitres: [],
  },
  {
    champ: "travailSurEcran",
    questionTransverse: "q-ecran",
    pourquoi:
      "Si oui, l'employeur assure l'information et la formation des travailleurs sur l'utilisation de l'écran, avant la première affectation (art. R. 4542-16 du Code du travail).",
    declencheTitres: [],
  },
  {
    champ: "operationsElectriques",
    questionTransverse: "q-operations-electriques",
    pourquoi:
      "Si oui, ces opérations sont réservées à des travailleurs habilités par l'employeur, après une formation théorique et pratique (art. R. 4544-9 et R. 4544-10 du Code du travail).",
    declencheTitres: [
      "elec-salarie-habilitation",
      "elec-salarie-attestation-medicale-voisinage",
    ],
  },
  {
    champ: "conduiteEngins",
    questionTransverse: "q-conduite-engins",
    pourquoi:
      "Si oui, la conduite est réservée aux travailleurs formés, et certains équipements exigent une autorisation de conduite de l'employeur (art. R. 4323-55 et R. 4323-56 du Code du travail).",
    declencheTitres: [
      "conduite-salarie-formation",
      "conduite-salarie-autorisation",
      "conduite-salarie-attestation-medicale",
    ],
  },
  {
    champ: "expositionCMR",
    question:
      "Des travailleurs sont-ils exposés à des agents cancérogènes, mutagènes ou toxiques pour la reproduction (CMR) ?",
    pourquoi:
      "Si oui, leurs postes présentent des risques particuliers et ouvrent droit au suivi individuel renforcé de leur état de santé (art. R. 4624-22 et R. 4624-23 du Code du travail).",
    declencheTitres: ["sante-travail-salarie-sir"],
  },
];

export function faitParChamp(champ: ChampFaitActivite): FaitActivite {
  const f = FAITS_ACTIVITE.find((x) => x.champ === champ);
  if (!f) throw new Error(`Fait d'activité inconnu : ${champ}`);
  return f;
}

/** Le fait qu'une question transverse du DUERP pose, s'il y en a un. */
export function faitDeLaQuestion(questionId: string): FaitActivite | undefined {
  return FAITS_ACTIVITE.find((f) => f.questionTransverse === questionId);
}

/** Les réponses d'un établissement, telles que la base les porte. */
export type ReponsesFaitsActivite = Record<ChampFaitActivite, boolean | null>;

/** Le `select` Prisma qui les lit — un seul, pour qu'aucun lecteur n'en oublie. */
export const SELECT_FAITS_ACTIVITE = {
  manutentionManuelle: true,
  travailSurEcran: true,
  operationsElectriques: true,
  conduiteEngins: true,
  expositionCMR: true,
} as const satisfies Record<ChampFaitActivite, true>;

/**
 * Les titres que les faits déclarés « non » écartent : le dirigeant a dit,
 * dans les mots de l'article, qu'aucun travailleur n'est exposé au fait qui
 * les rend dus. Un silence n'y entre jamais. Lu par le tableau de bord
 * (`dashboard/transmissions.ts`), qui fait taire le signal « suppose un titre
 * nominatif » sur ces titres.
 */
export function titresEcartesParLesFaits(
  faits: ReponsesFaitsActivite,
): ReadonlySet<string> {
  return new Set(
    FAITS_ACTIVITE.filter((f) => faits[f.champ] === false).flatMap(
      (f) => f.declencheTitres,
    ),
  );
}

/** Les titres qu'un fait d'activité, quel qu'il soit, gouverne. */
export function titresGouvernesParUnFait(): ReadonlySet<string> {
  return new Set(FAITS_ACTIVITE.flatMap((f) => f.declencheTitres));
}
