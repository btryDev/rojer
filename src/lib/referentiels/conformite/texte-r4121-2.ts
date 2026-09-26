/**
 * `R. 4121-2` du Code du travail — la mise à jour du document unique — dans
 * ses mots, UNE fois.
 *
 * POURQUOI CE MODULE EXISTE. L'article était récrit, à la main et chaque fois
 * autrement, sur huit surfaces : la ligne « Quand ça arrive », la carte des
 * trois cas des écrans du document unique, la page du document unique de
 * l'établissement, le guide « Chez vous », la foire aux questions publique,
 * le PDF du document unique (deux fois), les motifs de version et l'outil MCP.
 * La contre-lecture du 2026-09-26 les a relevées : « À toute décision » pour
 * « Lors de toute décision », « au moins une fois par an » pour « au moins
 * chaque année », « d'évaluation des risques » sans « professionnels » dans
 * une citation présentée entre guillemets, « après un accident » donné comme
 * un cas à part, et des exemples — « nouveau poste, nouvel équipement,
 * changement de locaux » — qui disaient au dirigeant ce qu'est un
 * « aménagement important », ce que le texte ne dit pas.
 *
 * Toutes ces surfaces lisent désormais ce module. Module sans dépendance : il
 * peut être importé par un composant client sans y tirer le référentiel.
 *
 * Verbatim : celui du corpus (`code-travail-duerp`, `R. 4121-2`, version en
 * vigueur depuis le 31 mars 2022, lu par un agent le 2026-09-02), confronté à
 * Légifrance par la contre-lecture du 2026-09-26 — pas relu ce jour de
 * première main.
 */

/** La phrase d'introduction de l'article, jusqu'aux deux-points. */
export const MAJ_DUERP_CHAPEAU =
  "La mise à jour du document unique d'évaluation des risques professionnels est réalisée";

/** 1° — le seul des trois cas qui dépende de l'effectif, et le seul qui se date. */
export const MAJ_DUERP_ANNUELLE =
  "Au moins chaque année dans les entreprises d'au moins onze salariés";

/** 2° — quel que soit l'effectif. */
export const MAJ_DUERP_AMENAGEMENT_IMPORTANT =
  "Lors de toute décision d'aménagement important modifiant les conditions de santé et de sécurité ou les conditions de travail";

/** 3° — quel que soit l'effectif. */
export const MAJ_DUERP_INFORMATION_NOUVELLE =
  "Lorsqu'une information supplémentaire intéressant l'évaluation d'un risque est portée à la connaissance de l'employeur";

/** Le cas au fil d'une phrase : sans sa majuscule initiale. */
export const enMinuscule = (cas: string) => cas.charAt(0).toLowerCase() + cas.slice(1);

/** Le premier alinéa de l'article, entier, tel qu'une citation entre guillemets doit le rendre. */
export const EXTRAIT_R4121_2 =
  `${MAJ_DUERP_CHAPEAU} : 1° ${MAJ_DUERP_ANNUELLE} ; ` +
  `2° ${MAJ_DUERP_AMENAGEMENT_IMPORTANT} ; 3° ${MAJ_DUERP_INFORMATION_NOUVELLE}.`;
