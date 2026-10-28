/**
 * Cinq articles que le module du plan de prévention ne PORTE pas, et qu'il
 * DIT — dans leurs mots, UNE fois.
 *
 * POURQUOI CE MODULE EXISTE. `R. 4512-1`, `R. 4512-9`, `R. 4512-11`,
 * `R. 4512-12` et `R. 4463-8` ~~sont~~ étaient (jusqu'au 2026-09-27) au corpus en `obligation_manquante`, cause
 * `module` : le produit a le plan de prévention, et n'en disait rien à qui
 * l'utilise. Un dirigeant qui lisait l'écran concluait qu'il avait fini quand
 * il avait signé — l'information écrite de l'inspection du travail, la liste
 * des postes, les dossiers amiante, les nouveaux sous-traitants, la chaleur
 * n'étaient nommés nulle part. Le 2026-09-26, ils sont DITS sur les surfaces
 * existantes : le formulaire, la fiche du plan, le diagnostic, et le fichier
 * `07_Plans_de_prevention.txt` du ZIP de contrôle. ~~Ils ne sont pas ENCODÉS :
 * aucun champ, aucune échéance, aucune migration — le statut au corpus reste
 * `obligation_manquante`, parce que le changer est une décision de produit.~~
 *
 * [2026-09-27, C45 — la décision est prise. Les cinq sont `non_couvert` au
 * corpus. `R. 4512-1`, `-9`, `-11` et `R. 4463-8` sont en plus ANNONCÉS sur la
 * page « Ce que Rojer ne couvre pas ». `R. 4512-12` a une trace : la date,
 * facultative, à laquelle l'inspection du travail a été informée
 * (`PlanPrevention.inspectionTravailInformeeLe`, migration 20260927140000) ;
 * son adresse est la carte « Art. R. 4512-12 » de la fiche. Rien n'a
 * d'échéance.]
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
/** L'article entier, tenu égal au corpus par `annonces-plan.test.ts`. */
export const R4512_2 =
  "Il est procédé, préalablement à l'exécution de l'opération réalisée par une entreprise extérieure, à une inspection commune des lieux de travail, des installations qui s'y trouvent et des matériels éventuellement mis à disposition des entreprises extérieures.";
export const URL_R4512_2 =
  "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529795";
export const URL_R4512_6 =
  "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529785";
export const URL_R4512_7 =
  "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529783";
export const R4512_6_MOMENT = "avant le début des travaux";
export const R4512_7_ECRIT = "établi par écrit et arrêté avant le commencement des travaux";
export const R4512_7_1_SEUIL =
  "égal au moins à 400 heures sur une période inférieure ou égale à douze mois";
export const R4512_7_2_LISTE = "travaux dangereux figurant sur une liste fixée";
export const R4512_7_2_DUREE = "Quelle que soit la durée prévisible de l'opération";
/**
 * La seconde phrase du 1° — le seuil atteint EN COURS de chantier
 * (2026-10-12). Confrontée au verbatim du corpus par `annonces-plan.test.ts`.
 */
export const R4512_7_1_EN_COURS =
  "Il en est de même dès lors qu'il apparaît, en cours d'exécution des travaux, que le nombre d'heures de travail doit atteindre 400 heures";

/**
 * Le fait noté, tel que la fiche, la raison du diagnostic, la page du lien et
 * le ZIP l'écrivent — une seule forme.
 */
export function ligneHeuresRevisees(heures: number, leTexte: string): string {
  // À 400 h et au-delà, la date gardée est la PREMIÈRE où elles ont été
  // notées (`noterHeuresRevisees`, 2026-10-12), pas celle de la dernière
  // révision : la phrase dit laquelle.
  return heures >= 400
    ? `Heures prévisibles revues : ${heures} h, seuil de 400 h noté le ${leTexte}`
    : `Heures prévisibles revues le ${leTexte} : ${heures} h`;
}

/** Constat sur le produit : ce que Rojer tient, et ce qu'il ne compte pas. */
export const CONSTAT_HEURES_REVISEES =
  "Rojer ne compte pas les heures réalisées : il garde le nombre d'heures prévisible que vous notez.";

/**
 * L'aide de saisie de la durée, au formulaire du plan. Le seuil n'y est pas
 * redit : le diagnostic juste au-dessus le porte, sa source sous le livre.
 */
export const AIDE_DUREE_HEURES =
  "Comptez les heures de tous les intervenants, sous-traitants de l'entreprise extérieure compris. Si le chiffre monte en cours de chantier, notez-le sur la fiche du plan.";

const minuscule = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/**
 * Les deux cas de l'écrit, 1° ET 2° — jamais l'un sans l'autre. Se lit sous
 * le livre, dont la tête porte déjà la référence. Les fragments entre
 * guillemets sont des constantes verbatim : la phrase les compose, elle ne
 * les recopie pas.
 */
export const SENS_R4512_7 =
  `Le plan de prévention est « ${R4512_7_ECRIT} » dans deux cas — ` +
  `1° un nombre total d'heures de travail prévisible « ${R4512_7_1_SEUIL} » ; ` +
  `2° des « ${R4512_7_2_LISTE} » par arrêté, « ${minuscule(R4512_7_2_DUREE)} ».`;

/** Le moment de l'accord. « Ces risques » du texte : ceux d'interférence de sa première phrase. */
export const SENS_R4512_6 =
  `Lorsque des risques d'interférence existent, les employeurs arrêtent d'un commun accord le plan de prévention « ${R4512_6_MOMENT} ».`;

// ── En clair (2026-10-28) ────────────────────────────────────────────────
/**
 * CE QUE L'ÉCRAN DIT, LE TEXTE ÉTANT SOUS LE LIVRE. La propriétaire, devant
 * le diagnostic d'un nouveau plan : « on est obligé de mettre tout ce pavé ? »
 * Quatre articles cités mot pour mot, puis deux livres « Texte » identiques.
 * L'écran dit désormais la règle en une ou deux phrases ; les verbatims
 * ci-dessus se lisent sous un livre (`Textes`), inchangés.
 *
 * Ce sont des libellés d'écran, pas du droit. Chacun est écrit en relisant
 * les constantes verbatim de ce module : il simplifie, il n'ajoute ni délai,
 * ni débiteur, ni condition que le texte ne porte pas. Aucun ne cite un
 * numéro d'article ni ne met de guillemets — `annonces-plan.test.ts` le tient.
 */
export const EN_CLAIR_R4512_12 =
  "Le plan reste à la disposition de l'inspection du travail pendant toute la durée des travaux, et vous informez par écrit l'inspection du travail de l'ouverture des travaux.";

/** Le diagnostic, état par état. `non_impose` suit le fait saisi. */
export const EN_CLAIR_ECRIT: Record<EtatEcrit, string> = {
  obligatoire:
    "Après l'inspection commune des lieux, le plan s'arrête par écrit avec l'entreprise extérieure, avant le commencement des travaux. " +
    EN_CLAIR_R4512_12,
  indetermine:
    "Le plan est dû. Il s'écrit si l'opération compte au moins 400 heures de travail sur douze mois au plus, ou si les travaux figurent sur la liste des travaux dangereux : renseignez la durée estimée.",
  non_impose:
    "L'écrit n'est pas imposé. Si l'inspection commune révèle des risques d'interférence, le plan s'arrête d'un commun accord avec l'entreprise extérieure, avant le début des travaux.",
};

/** La fiche, carte de R. 4512-12 dans l'indéterminé : sous sa condition. */
export const EN_CLAIR_R4512_12_SI_ECRIT = `Si l'écrit est obligatoire, ${minuscule(EN_CLAIR_R4512_12)}`;

export const EN_CLAIR_R4512_2 =
  "L'inspection commune des lieux, des installations et du matériel mis à disposition se fait avec l'entreprise extérieure avant l'exécution de l'opération, quelle que soit la durée des travaux.";

/** La fiche, sans date d'inspection : le moment de R. 4512-2, le sien seul. */
export const EN_CLAIR_R4512_2_MOMENT =
  "L'inspection commune a lieu avant l'exécution de l'opération.";

export const EN_CLAIR_R4512_7_EN_COURS =
  "Si, en cours de chantier, il apparaît que les 400 heures seront atteintes, l'écrit devient obligatoire : notez-le ici.";

export const EN_CLAIR_R4512_1 =
  "Si l'entreprise extérieure fait venir un nouveau sous-traitant après le début de l'intervention, les mêmes étapes valent pour lui.";

export const EN_CLAIR_R4512_9 =
  "Chaque entreprise fournit la liste des postes dont les travailleurs sont susceptibles de relever du suivi individuel renforcé en raison des travaux faits chez vous ; cette liste figure dans le plan.";

export const EN_CLAIR_R4512_11 =
  "Les dossiers techniques amiante ou, le cas échéant, le rapport de repérage de l'amiante sont joints au plan.";

export const EN_CLAIR_R4463_8 =
  "Le plan tient compte, le cas échéant, des risques liés aux épisodes de chaleur intense.";

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

/**
 * Constat sur le produit. ~~« Rojer n'enregistre pas l'information prévue au
 * 2°. » : aucun champ du plan ne portait cette démarche.~~ [2026-09-27, C45 :
 * le plan porte une date déclarée, `inspectionTravailInformeeLe`, facultative.
 * Rojer n'informe toujours personne ; il garde la date qu'on lui déclare.]
 */
export const CONSTAT_R4512_12 =
  "Rojer n'informe pas l'inspection du travail : il garde la date de cette information, si vous la notez.";

/**
 * La trace du 2°, dite comme un fait : la date déclarée, ou qu'elle ne l'est
 * pas. Jamais « non informée » — Rojer ne le sait pas. Aucun délai : le texte
 * n'en fixe pas.
 */
export function ligneInformationInspection(dateTexte: string | null): string {
  return dateTexte
    ? `Information écrite de l'inspection du travail (2°) : ${dateTexte}`
    : "Information écrite de l'inspection du travail (2°) : date non renseignée";
}

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
  parPlan: (ecrit: EtatEcrit, informeeLeTexte: string | null): string[] =>
    !citeR4512_12(ecrit)
      ? []
      : [
          ...(ecrit === "indetermine" ? [`  ${FAIT_DUREE_NON_RENSEIGNEE}`] : []),
          `  Art. R. 4512-12 : « ${EXTRAIT_R4512_12} »`,
          `    ${CONSTAT_R4512_12}`,
          `    ${ligneInformationInspection(informeeLeTexte)}`,
        ],
};
