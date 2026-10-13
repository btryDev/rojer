/**
 * Ce que « répondue » veut dire pour une question de paramétrage —
 * ADR-025 § 7, migration 20260901170000.
 *
 * Une fonction nommée, et pas un `!== null` recopié dans la page : la règle
 * qu'elle porte est facile à écrire à l'envers, et l'envers ne se voit pas.
 * `faite: etab.epiPresents === true` compile, s'affiche correctement pour qui
 * répond « oui », et **rouvre indéfiniment la question à qui répond « non »**
 * — c'est-à-dire à la majorité des dossiers, donc à la majorité des
 * utilisateurs. La checklist qui ne s'efface jamais devient un reproche
 * permanent pour une question déjà traitée.
 *
 * `null` veut dire « pas encore répondu », jamais « non ». C'est aussi la
 * règle du non-renseigné de l'ADR-022, prise ici du côté de l'affichage :
 * l'incertitude est visible, elle n'est jamais rabattue sur une valeur.
 */
export function questionRepondue(valeur: boolean | null | undefined): boolean {
  return valeur === true || valeur === false;
}

/**
 * LA QUESTION DES EPI, SES MOTS UNE FOIS — la checklist du tableau de bord la
 * pose, la fiche la corrige (2026-10-12, audit B2 : la checklist s'efface une
 * fois répondue, et un « non » ne se corrigeait plus nulle part).
 */
export const QUESTION_EPI =
  "Fournissez-vous des équipements de protection individuelle ?";
export const AIDE_EPI =
  "Harnais, casques, gants, chaussures de sécurité, protections auditives. Si oui, l'employeur élabore une consigne d'utilisation de ces équipements (art. R. 4323-105 du Code du travail) : elle s'affiche tant que la réponse n'est pas « non ». Vous pouvez aussi les déclarer un par un dans vos équipements, avec leur marque et leur lieu.";
export const LIBELLE_DETAIL_EPI = "Lesquels ? (facultatif)";
export const EXEMPLE_DETAIL_EPI =
  "Harnais antichute, gants anti-coupure, chaussures…";

/**
 * LA QUESTION DU SSI DE CATÉGORIE A OU B, SES MOTS UNE FOIS — la fiche la
 * pose, la relance la reprend (2026-10-12, décision de la propriétaire du
 * 2026-10-08 : « une seule question sur la fiche établissement, au lieu d'une
 * par désenfumage »). Elle n'est posée qu'aux catégories d'ERP où une
 * obligation la lit : DF 10 est au livre II, que PE 1 § 1 écarte en 5ᵉ
 * catégorie. `questions.test.ts` confronte la liste au référentiel.
 */
export const CATEGORIES_ERP_QUESTION_SSI = ["N1", "N2", "N3", "N4"] as const;
export const QUESTION_SSI =
  "L'établissement dispose-t-il d'un système de sécurité incendie (SSI) de catégorie A ou B ?";
export const AIDE_SSI =
  "Les SSI sont classés en cinq catégories, de A à E ; la catégorie figure dans les documents de l'installation ou sur le rapport de vérification, et votre installateur ou votre vérificateur la connaît. Avec un désenfumage mécanique, « Oui » fait vérifier ce désenfumage tous les trois ans par un organisme agréé (règlement de sécurité, art. DF 10 § 3) ; tant que la question n'a pas de réponse, cette vérification s'affiche « à confirmer », et « Non » la retire.";
