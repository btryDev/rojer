/**
 * Cinq articles que le module du plan de prévention ne PORTE pas, et qu'il
 * DIT — dans leurs mots, UNE fois.
 *
 * POURQUOI CE MODULE EXISTE. `R. 4512-1`, `R. 4512-9`, `R. 4512-11`,
 * `R. 4512-12` et `R. 4463-8` sont au corpus en `obligation_manquante`, cause
 * `module` : le produit a le plan de prévention, et n'en disait rien à qui
 * l'utilise. Un dirigeant qui lisait l'écran concluait qu'il avait fini quand
 * il avait signé — l'information écrite de l'inspection du travail, la liste
 * des postes, les dossiers amiante, les nouveaux sous-traitants, la chaleur
 * n'étaient nommés nulle part. Le 2026-09-26, ils sont DITS sur les surfaces
 * existantes : le formulaire, la fiche du plan, le diagnostic, et le fichier
 * `07_Plans_de_prevention.txt` du ZIP de contrôle. Ils ne sont pas ENCODÉS :
 * aucun champ, aucune échéance, aucune migration — le statut au corpus reste
 * `obligation_manquante`, parce que le changer est une décision de produit.
 *
 * CE QUI EST AFFICHÉ EST LE TEXTE. Chaque constante est l'article, ou une
 * proposition entière de l'article, telle que le corpus la consigne — relue
 * sur la page propre de chaque article le 2026-09-26 (structure demandée en
 * aveugle, recopie, puis questions fermées sur les formulations décisives).
 * Aucune n'est résumée : « le cas échéant » reste « le cas échéant », le
 * débiteur écrit reste celui du texte (« le chef de l'entreprise
 * utilisatrice », « chaque entreprise concernée »), et `R. 4512-12` ne fixe
 * aucun délai — aucune surface n'en ajoute un.
 *
 * Les seules phrases qui ne sont pas du texte sont les CONSTATS SUR LE
 * PRODUIT (`CONSTAT_*`) : ce que Rojer enregistre ou n'enregistre pas. Ils ne
 * disent rien du droit — ni « vous devez », ni ce qu'un terme recouvre.
 *
 * `annonces-plan.test.ts` confronte chaque constante au verbatim du corpus.
 * Module sans dépendance : un composant client l'importe sans tirer le corpus.
 */

// ── R. 4512-12 — tenue à disposition et information de l'inspection ────
/** La proposition d'introduction, jusqu'aux deux-points. */
export const R4512_12_CHAPEAU =
  "Lorsque l'établissement d'un plan de prévention par écrit est obligatoire, en application de l'article R. 4512-7";

export const R4512_12_1 =
  "Ce plan est tenu, pendant toute la durée des travaux, à la disposition de l'inspection du travail, des agents de prévention des organismes de sécurité sociale et, le cas échéant, de l'Organisme professionnel de prévention du bâtiment et des travaux publics";

export const R4512_12_2 =
  "Le chef de l'entreprise utilisatrice informe par écrit l'inspection du travail de l'ouverture des travaux";

/** L'article entier, tel qu'une citation entre guillemets doit le rendre. */
export const EXTRAIT_R4512_12 =
  `${R4512_12_CHAPEAU} : 1° ${R4512_12_1} ; 2° ${R4512_12_2}.`;

export const URL_R4512_12 =
  "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529773";

// ── R. 4512-2, R. 4512-6, R. 4512-7 — le diagnostic, dans leurs mots ──────
/**
 * POURQUOI ICI. Le diagnostic écrivait « quelle que soit la durée
 * (art. R. 4512-6) » — ces mots ouvrent le 2° de R. 4512-7, R. 4512-6 ne les
 * porte pas —, rangeait l'inspection commune et l'accord sous un même « avant
 * le début des travaux » qui n'est que celui de R. 4512-6, disait « restent à
 * faire » même quand une inspection est datée, et « ce sont les 400 heures qui
 * commandent l'écrit » en taisant le 2° de R. 4512-7 (contre-lecture du
 * 2026-09-26). Chaque article garde ici ses mots, entre guillemets, relus sur
 * sa page propre le 2026-09-26 et confrontés au corpus par le test.
 */
export const R4512_2_MOMENT =
  "préalablement à l'exécution de l'opération réalisée par une entreprise extérieure";
export const R4512_6_MOMENT = "avant le début des travaux";
export const R4512_7_ECRIT = "établi par écrit et arrêté avant le commencement des travaux";
export const R4512_7_1_SEUIL =
  "égal au moins à 400 heures sur une période inférieure ou égale à douze mois";
export const R4512_7_2_LISTE = "travaux dangereux figurant sur une liste fixée";
export const R4512_7_2_DUREE = "Quelle que soit la durée prévisible de l'opération";

const minuscule = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Les deux cas de l'écrit, 1° ET 2° — jamais l'un sans l'autre. */
export const PHRASE_R4512_7 =
  `Art. R. 4512-7 : le plan de prévention est « ${R4512_7_ECRIT} » dans deux cas — ` +
  `1° un nombre total d'heures de travail prévisible « ${R4512_7_1_SEUIL} » ; ` +
  `2° des « ${R4512_7_2_LISTE} » par arrêté, « ${minuscule(R4512_7_2_DUREE)} ».`;

/** Le moment de l'inspection — le sien, pas celui de l'accord. Aucun « reste à faire ». */
export const PHRASE_R4512_2 =
  `Art. R. 4512-2 : l'inspection commune a lieu « ${R4512_2_MOMENT} ».`;

/** Le moment de l'accord. « Ces risques » du texte : ceux d'interférence de sa première phrase. */
export const PHRASE_R4512_6 =
  `Art. R. 4512-6 : lorsque des risques d'interférence existent, les employeurs arrêtent d'un commun accord le plan de prévention « ${R4512_6_MOMENT} ».`;

/**
 * TROIS ÉTATS, ET NON DEUX. `R. 4512-7` rend l'écrit obligatoire à 400 heures
 * ou sur travaux dangereux. La durée est facultative à la saisie : quand elle
 * manque et que les travaux ne sont pas déclarés dangereux, Rojer ne sait
 * pas. Rabattre ce cas sur « non imposé » faisait lire « elles ne sont pas
 * atteintes ici » et taisait `R. 4512-12` — l'incertitude réduisait la
 * couverture, ce que la règle du dépôt interdit (contre-lecture du
 * 2026-09-26).
 */
export type EtatEcrit = "obligatoire" | "non_impose" | "indetermine";

/**
 * `R. 4512-12` se dit quand l'écrit est obligatoire ET quand Rojer ne peut
 * pas dire qu'il ne l'est pas. Dans le second cas, il est cité sous sa
 * condition écrite — son chapeau, « Lorsque l'établissement d'un plan de
 * prévention par écrit est obligatoire… » —, précédé du fait qui manque.
 */
export const citeR4512_12 = (ecrit: EtatEcrit): boolean => ecrit !== "non_impose";

/** Le fait, sans conclusion : ce que Rojer ne sait pas quand la durée manque. */
export const FAIT_DUREE_NON_RENSEIGNEE =
  "Durée non renseignée : Rojer ne peut pas dire si le seuil de R. 4512-7 est atteint.";

/** Constat sur le produit : aucun champ du plan ne porte cette démarche. */
export const CONSTAT_R4512_12 =
  "Rojer n'enregistre pas l'information prévue au 2°.";

// ── R. 4512-1 — nouveaux sous-traitants ──────────────────────────────────
export const R4512_1 =
  "Lorsque, après le début de l'intervention, une entreprise extérieure recourt à de nouveaux sous-traitants, les procédures prévues par le présent chapitre sont à nouveau applicables à ces derniers.";

export const URL_R4512_1 =
  "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529799";

/**
 * « Le présent chapitre » est un renvoi sans antécédent pour qui lit l'écran
 * (C26 l'a relevé ailleurs). L'antécédent se dit HORS des guillemets, par les
 * bornes et le titre du chapitre tels que le fil d'Ariane de la page de
 * `R. 4512-1` les donne — relevés le 2026-09-26 (« Chapitre II : Mesures
 * préalables à l'exécution d'une opération (Articles R4512-1 à R4512-16) »).
 */
export const CHAPITRE_R4512 =
  "Le présent chapitre : articles R. 4512-1 à R. 4512-16, « Mesures préalables à l'exécution d'une opération ».";

/** Constat sur le produit : le modèle ne connaît qu'une entreprise extérieure par plan. */
export const CONSTAT_R4512_1 =
  "Rojer ne rattache à un plan qu'une seule entreprise extérieure.";

// ── R. 4512-9 — liste des postes relevant du suivi individuel renforcé ──
export const R4512_9 =
  "Chaque entreprise concernée fournit la liste des postes occupés par les travailleurs susceptibles de relever du suivi individuel renforcé prévu par les articles R. 4624-22 à R. 4624-28 ou, s'il s'agit d'un salarié agricole, par l'article R. 717-16 du code rural et de la pêche maritime, en raison des risques liés aux travaux réalisés dans l'entreprise utilisatrice. Cette liste figure dans le plan de prévention.";

export const URL_R4512_9 =
  "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769545";

export const CONSTAT_R4512_9 =
  "Le plan tenu dans Rojer n'a pas de champ pour cette liste.";

// ── R. 4512-11 — dossiers techniques amiante ─────────────────────────────
export const R4512_11 =
  "Les dossiers techniques regroupant les informations relatives à la recherche et à l'identification des matériaux contenant de l'amiante prévus aux articles R. 1334-29-4 à R. 1334-29-6 du code de la santé publique et à l'article R. 126-10 du code de la construction et de l'habitation ou, le cas échéant, le rapport de repérage de l'amiante prévu à l'article R. 4412-97-5 du présent code sont joints au plan de prévention.";

export const URL_R4512_11 =
  "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025819097";

export const CONSTAT_R4512_11 =
  "Le plan tenu dans Rojer ne permet pas d'y joindre ces pièces.";

// ── R. 4463-8 — chaleur intense ──────────────────────────────────────────
/**
 * L'article entier, PGC et PPSPS compris. Le couper à « Le plan de
 * prévention prévu à l'article R. 4512-6 […] tiennent compte » aurait laissé
 * un sujet singulier devant un verbe pluriel, ou demandé de réécrire le verbe :
 * la phrase se cite entière, ou pas.
 */
export const R4463_8 =
  "Le plan de prévention prévu à l'article R. 4512-6, le plan général de coordination prévu à l'article L. 4532-8, et le plan particulier de sécurité et de protection de la santé prévu à l'article L. 4532-9 tiennent compte, le cas échéant, des risques liés à l'exposition aux épisodes de chaleur intense.";

export const URL_R4463_8 =
  "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676941";

/**
 * Les lignes du fichier `07_Plans_de_prevention.txt` qui portent ces textes.
 *
 * `enTete` : une fois pour le fichier — `R. 4512-9` et `R. 4512-11` valent pour
 * tout plan, et le lecteur du ZIP (inspecteur, assureur, acquéreur) doit
 * apprendre que ce fichier ne les contient pas plutôt que de conclure à leur
 * absence de l'obligation.
 *
 * Les lignes de `R. 4512-12` par plan vivent dans `annonces-zip.ts` : elles
 * appellent le diagnostic, que ce module sans dépendance n'importe pas.
 */
export const annoncesZip = {
  enTete: (): string[] => [
    `Art. R. 4512-9 : « ${R4512_9} »`,
    `  ${CONSTAT_R4512_9} Ce fichier ne la contient pas.`,
    `Art. R. 4512-11 : « ${R4512_11} »`,
    `  ${CONSTAT_R4512_11} Ce fichier ne les contient pas.`,
  ],
  parPlan: (ecrit: EtatEcrit): string[] =>
    !citeR4512_12(ecrit)
      ? []
      : [
          ...(ecrit === "indetermine" ? [`  ${FAIT_DUREE_NON_RENSEIGNEE}`] : []),
          `  Art. R. 4512-12 : « ${EXTRAIT_R4512_12} »`,
          `    ${CONSTAT_R4512_12}`,
        ],
};
