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
