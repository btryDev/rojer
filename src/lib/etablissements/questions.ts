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

/**
 * LA QUESTION DES MATIÈRES DE R. 4227-34, SES MOTS UNE FOIS (2026-10-13,
 * décision de la propriétaire, `lot/question-matieres`). Elle alimente
 * `manipuleMatieresR422722` et reste posée à tout employeur : ni le moteur ni
 * le référentiel n'ont bougé, seuls les mots changent.
 *
 * POURQUOI ELLE EST REFORMULÉE. L'ancien libellé — « Manipulez-vous et
 * mettez-vous en œuvre des matières explosives ou inflammables ? », aide
 * « Matières classées explosives, comburantes ou extrêmement inflammables… » —
 * reprenait la classification de `R. 4227-22`, qu'aucune étiquette actuelle
 * n'imprime. Personne ne s'y reconnaissait, et le silence laissait l'alarme,
 * la consigne et les exercices (`R. 4227-34`, `-37`, `-39`) « à confirmer ».
 * La question se répond désormais étiquette en main.
 *
 * CE QUI EST ÉTABLI, ET CE QUI NE L'EST PAS (recherche du 2026-10-13).
 * « Extrêmement inflammable » (R12, la classe de `R. 4227-22`) correspond à
 * H220 et H222 (Bruxelles-Environnement,
 * https://environnement.brussels/media/20620/download) ~~; H224 suit la même
 * logique sans avoir été trouvé noir sur blanc~~ [2026-10-13, revue de
 * `e6ba53d9` : faux — le même document, « Tableau détaillé CLP - Mention R »
 * (Bruxelles Environnement), met R12 « Extrêmement inflammable » en face de
 * H224, « Liquide inflammable, catégorie 1 » (p. 2), comme de H220 et H222 ;
 * relu le 2026-10-13]. Les trois mentions — « Gaz
 * extrêmement inflammable », « Aérosol extrêmement inflammable », « Liquide et
 * vapeurs extrêmement inflammables » —, le comburant (GHS 03, flamme sur un
 * cercle, H270 à H272) et l'explosif (GHS 01, bombe qui explose, ~~classe H200
 * à H205~~ H200 à H204 — [2026-10-13, revue : H205, « Expl. 1.5 », est
 * explosif mais SANS pictogramme, INERIS p. 1 ; la bombe ne le signale donc
 * pas]) sont lus dans le tableau CLP de l'INERIS (2025), relu le 2026-10-13.
 * D'où la tournure de l'aide : les signes « aident à repérer » les classes de
 * l'article, ils n'en sont pas la définition.
 *
 * ~~« Vos salariés utilisent-ils (pas seulement stockent-ils) … »~~ [2026-10-13,
 * revue de `e6ba53d9` : la formule restreignait le champ — `R. 4227-34` vise
 * l'établissement « où sont manipulées et mises en œuvre » les matières, quel
 * que soit l'auteur. La question porte sur l'établissement.]
 *
 * CE QUI RESTE OUVERT : des aérosols pulvérisés dans la journée suffisent-ils
 * à « manipulées et mises en œuvre » ? Question n° 1 au préventeur
 * (`docs/questions-preventeur.md`, branche `lot/tri-chantiers`). En attendant
 * sa réponse, les aérosols restent dans les exemples : c'est la lettre du
 * texte.
 *
 * UN SEUL TEXTE : la fiche (`EtablissementForm`), le parcours de création
 * (`StepTypologie`), la relance de la checklist (`relance.ts`) et la phrase
 * « à confirmer » (`PHRASE_SANS_REPONSE` — écrans, guide, MCP) l'importent
 * d'ici. `question-matieres.test.tsx` le vérifie surface par surface.
 */
export const QUESTION_MATIERES =
  "Dans l'établissement, utilise-t-on (pas seulement stocke-t-on) des produits dont l'étiquette porte la flamme sur un cercle, la bombe qui explose ou la mention « extrêmement inflammable » ?";

/** L'aide de la question, paragraphe par paragraphe, dans l'ordre affiché. */
export const AIDE_MATIERES: readonly string[] = [
  "Sur l'étiquette, dans un losange bordé de rouge : la flamme au-dessus d'un cercle signale un produit comburant (mentions de danger H270, H271, H272) ; la bombe qui explose, un produit explosif (H200 à H204). La mention « extrêmement inflammable » accompagne une flamme seule : gaz (H220), aérosol (H222), liquide (H224). Une flamme seule, sans cette mention, ne suffit pas.",
  "La question vise aussi les matières dont l'état physique peut provoquer une explosion ou une inflammation instantanée.",
  "Exemples courants, à vérifier sur l'étiquette ou la fiche de données de sécurité : bouteilles de gaz (propane, butane), oxygène, acétylène, aérosols étiquetés « extrêmement inflammable », certains solvants.",
  "Ces classes de produits — explosives, comburantes ou extrêmement inflammables — sont celles que nomme l'art. R. 4227-22 du Code du travail ; les signes ci-dessus aident à les repérer. La question porte sur leur usage : l'art. R. 4227-34 vise les établissements où elles sont « manipulées et mises en œuvre ». Les entreposer sans les mettre en œuvre ne relève pas de cette question — d'autres articles de la même section le visent, que Rojer ne suit pas.",
  "Si oui, l'alarme sonore, la consigne incendie et les exercices semestriels sont dus quel que soit l'effectif (art. R. 4227-34, R. 4227-37 et R. 4227-39 du Code du travail). Si non, ces lignes sont retirées, sauf là où plus de cinquante personnes sont habituellement présentes : ce seuil suffit à les rendre dues. Tant que la question n'a pas de réponse, elles s'affichent « à confirmer ».",
];

/**
 * Le renvoi de la relance (2026-10-13, revue de `e6ba53d9`) : la checklist ne
 * reprend que le premier paragraphe — l'aide entière y faisait environ 1 400
 * signes — et renvoie au reste, que la fiche affiche en entier.
 */
export const RENVOI_AIDE_MATIERES =
  "Les exemples, les articles visés et ce que change votre réponse sont détaillés sous la question, sur la fiche de l'établissement.";

/** Le lien de l'aide : le tableau CLP de l'INERIS, relu le 2026-10-13. */
export const LIEN_TABLEAU_CLP = {
  intro: "Les pictogrammes et les mentions de danger, classe par classe :",
  libelle: "tableau de classification et d'étiquetage CLP de l'INERIS (PDF)",
  url: "https://clp-info.ineris.fr/sites/snar-clp/files/guide_brochure/2025_Tableau_Classification_Etiquetage_CLP_VF.pdf",
} as const;
