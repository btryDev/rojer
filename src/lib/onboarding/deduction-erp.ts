import type {
  CategorieErp,
  TypeErp,
} from "@/lib/referentiels/types-communs";

/**
 * Logique déterministe (pure, testable) pour déduire le `typeErp` et la
 * `categorieErp` à partir des questions simples posées au dirigeant dans
 * l'assistant.
 *
 * ── Ce que le texte permet de déduire, et ce qu'il ne permet pas ──────────
 *
 * L'article R. 143-19 du CCH (ex R. 123-19) classe les ERP d'après l'effectif
 * du public et du personnel :
 *   - 1ʳᵉ catégorie : au-dessus de 1500 personnes
 *   - 2ᵉ catégorie  : de 701 à 1500
 *   - 3ᵉ catégorie  : de 301 à 700
 *   - 4ᵉ catégorie  : 300 personnes et au-dessous, **à l'exception** des
 *     établissements relevant de la 5ᵉ catégorie
 *   - 5ᵉ catégorie  : établissements dans lesquels l'effectif du public
 *     n'atteint pas le chiffre minimal fixé, **pour chaque type
 *     d'exploitation**, par le règlement de sécurité (arrêté du 25 juin 1980 ;
 *     règles PE de l'arrêté du 22 juin 1990 pour cette 5ᵉ catégorie)
 *
 * Les quatre premières bornes sont donc universelles et déductibles. La
 * frontière 4ᵉ / 5ᵉ, elle, **ne l'est pas** : elle dépend d'un seuil propre au
 * type d'ERP (et, pour plusieurs types, du niveau — sous-sol, étages, total).
 * Aucun seuil universel de 300 ne sépare la 4ᵉ de la 5ᵉ.
 *
 * ── Conséquence sur le code (amendement 2026-08) ─────────────────────────
 *
 * L'ancienne version approximait « moins de 300 → 5ᵉ catégorie », et ne
 * produisait donc **jamais** de 4ᵉ catégorie. L'approximation n'était pas
 * neutre : un restaurant de 250 personnes classé à tort en 5ᵉ recevait la
 * vérification électrique triennale de 5ᵉ catégorie au lieu
 * de la vérification ANNUELLE par organisme agréé de criticité 5
 * (`elec-erp-cat1-4-annuelle`), et perdait la vérification triennale du SSI.
 * Un faux négatif silencieux sur une obligation vitale.
 *
 * Amendement 2026-08-25 : la table des seuils du second groupe est désormais
 * encodée (`SEUILS_5E_CATEGORIE`), type par type, pour les seuls types dont
 * l'article « 1 » des dispositions particulières a été relu mot pour mot sur
 * Légifrance ce jour — chaque entrée porte l'article, la version lue et
 * l'URL. `deduire4eOu5e` applique ces seuils, et refuse de trancher dès
 * qu'une information nécessaire manque (type hors table, occupation d'un
 * niveau inconnue, condition hors effectif). Pour les types non encodés, le
 * comportement antérieur demeure : la catégorie est **demandée**, la 4ᵉ
 * figure explicitement dans les choix, et toute déduction reste une
 * proposition modifiable.
 *
 * ── Retiré du parcours de création le 2026-09-01 ─────────────────────────
 *
 * L'onboarding ne déduit plus rien : il fait **déclarer** le type et la
 * catégorie (ADR-025 § 2). Les huit cartes d'activité et leur mappage sont
 * partis avec le mode guidé — elles ne servaient qu'à lui, et ne couvraient
 * que huit types sur vingt-deux.
 *
 * Ce qui reste ci-dessous n'est **appelé par aucun écran** aujourd'hui, et
 * c'est délibéré : la table des seuils a été relue article par article sur
 * Légifrance le 2026-08-25, chaque entrée porte sa version et son URL. La
 * jeter reviendrait à refaire ce dépouillement le jour où le produit voudra
 * signaler une incohérence — « vous avez déclaré la 5ᵉ catégorie et quatre
 * cents personnes admises » —, ce que la fiche établissement permet déjà de
 * poser puisqu'elle porte `effectifPublicAdmis` en regard de la catégorie.
 * Ne pas rebrancher ces fonctions sur une déduction : la décision de séance
 * est de ne pas deviner.
 */

/**
 * Bornes du premier groupe, telles qu'écrites à l'article R. 143-19 du CCH.
 * Exposées pour que l'UI et les tests parlent des mêmes chiffres.
 */
export const SEUIL_1RE_CATEGORIE = 1500;
export const SEUIL_2E_CATEGORIE = 700;
export const SEUIL_3E_CATEGORIE = 300;

/**
 * Résultat d'une déduction de catégorie ERP à partir d'un effectif.
 *
 * Deux états, jamais confondus :
 *   - `proposee` : les bornes de R. 143-19 tranchent. La valeur reste une
 *     **proposition** que l'UI doit afficher comme modifiable — l'effectif
 *     saisi par le dirigeant est une estimation, pas une donnée certifiée.
 *   - `a_confirmer` : l'effectif est dans la bande « 300 et au-dessous », où la
 *     frontière 4ᵉ / 5ᵉ dépend du type d'ERP. Le code ne choisit pas : il rend
 *     les deux catégories possibles et la question à poser.
 */
export type DeductionCategorieErp =
  | {
      statut: "proposee";
      categorieErp: CategorieErp;
      /** Explication affichable, déterministe. */
      motif: string;
      /** Message d'avertissement si l'effectif frôle une borne. */
      avertissement?: string;
    }
  | {
      statut: "a_confirmer";
      categoriesPossibles: readonly CategorieErp[];
      motif: string;
      question: string;
    };

/**
 * Marge de proximité d'une borne, en pourcentage de la borne.
 *
 * Ce n'est pas une règle de droit mais un garde-fou d'interface : un effectif
 * annoncé « environ 700 » peut basculer d'une catégorie à l'autre, et une
 * erreur de catégorie change la nature des vérifications électriques. On
 * préfère poser la question. Valeur fixe pour rester déterministe.
 */
export const MARGE_PROXIMITE_SEUIL = 0.1;

/**
 * Renvoie un avertissement lorsque l'effectif est à moins de
 * `MARGE_PROXIMITE_SEUIL` d'une borne du premier groupe, sinon `undefined`.
 */
export function avertissementProximiteSeuil(
  effectif: number,
): string | undefined {
  for (const borne of [
    SEUIL_3E_CATEGORIE,
    SEUIL_2E_CATEGORIE,
    SEUIL_1RE_CATEGORIE,
  ]) {
    if (Math.abs(effectif - borne) <= borne * MARGE_PROXIMITE_SEUIL) {
      return `Effectif proche de la limite des ${borne} personnes : au-dessus, la catégorie change et les vérifications avec elle. Vérifiez la catégorie indiquée sur votre arrêté d'ouverture ou sur le PV de la commission de sécurité, s'il y en a un.`;
    }
  }
  return undefined;
}

/**
 * Déduit ce qui est déductible d'un effectif (public + personnel) et signale
 * explicitement ce qui ne l'est pas. Fonction de secours lorsque l'utilisateur
 * saisit un chiffre libre plutôt que de choisir une tranche.
 */
export function deduireCategorieErp(effectif: number): DeductionCategorieErp {
  if (effectif > SEUIL_1RE_CATEGORIE) {
    return {
      statut: "proposee",
      categorieErp: "N1",
      motif: `Plus de ${SEUIL_1RE_CATEGORIE} personnes : 1ʳᵉ catégorie (CCH, art. R. 143-19).`,
      avertissement: avertissementProximiteSeuil(effectif),
    };
  }
  if (effectif > SEUIL_2E_CATEGORIE) {
    return {
      statut: "proposee",
      categorieErp: "N2",
      motif: `De ${SEUIL_2E_CATEGORIE + 1} à ${SEUIL_1RE_CATEGORIE} personnes : 2ᵉ catégorie (CCH, art. R. 143-19).`,
      avertissement: avertissementProximiteSeuil(effectif),
    };
  }
  if (effectif > SEUIL_3E_CATEGORIE) {
    return {
      statut: "proposee",
      categorieErp: "N3",
      motif: `De ${SEUIL_3E_CATEGORIE + 1} à ${SEUIL_2E_CATEGORIE} personnes : 3ᵉ catégorie (CCH, art. R. 143-19).`,
      avertissement: avertissementProximiteSeuil(effectif),
    };
  }
  return {
    statut: "a_confirmer",
    categoriesPossibles: ["N4", "N5"],
    motif: `${SEUIL_3E_CATEGORIE} personnes ou moins : l'établissement relève de la 4ᵉ ou de la 5ᵉ catégorie. La limite entre les deux dépend d'un seuil propre à votre type d'activité, fixé par le règlement de sécurité — l'effectif seul ne permet pas de trancher.`,
    question:
      "Votre arrêté d'ouverture ou le PV de la commission de sécurité, s'il y en a un, indique-t-il « 4ᵉ catégorie » ou « 5ᵉ catégorie » ? Un établissement de 5ᵉ catégorie sans hébergement du public n'a pas d'autorisation d'ouverture à demander (art. R. 143-38 CCH) : il peut n'avoir ni l'un ni l'autre.",
  };
}

/**
 * Variante à valeur simple : renvoie la catégorie quand elle est déductible,
 * et `null` quand la question doit être posée (bande « 300 et au-dessous »).
 *
 * Le `null` est volontaire : renvoyer « N5 » par défaut est précisément le
 * bug corrigé en 2026-08. Aucun appelant ne doit substituer une valeur par
 * défaut à ce `null` — la catégorie doit venir d'une réponse du dirigeant.
 */
export function deduireCategorieErpDepuisEffectif(
  effectifPublic: number,
): CategorieErp | null {
  const d = deduireCategorieErp(effectifPublic);
  return d.statut === "proposee" ? d.categorieErp : null;
}

/**
 * LA CLASSE D'IGH ET LA FAMILLE D'HABITATION NE SONT PLUS DEMANDÉES (2026-09-03).
 *
 * Deux grilles de choix vivaient ici — `CHOIX_CLASSES_IGH`, dix classes de
 * l'article R. 146-4 du CCH, et `CHOIX_FAMILLES_HABITATION`, cinq familles de
 * l'article 3 de l'arrêté du 31 janvier 1986. Toutes deux ont été confrontées à
 * leur texte les 2026-09-01 et 2026-09-03, et toutes deux étaient JUSTES au
 * terme de cette confrontation. Elles ne partent pas parce qu'elles étaient
 * fausses : elles partent parce qu'elles ne décidaient de rien.
 *
 * Mesuré en appelant le moteur le 2026-09-03 : les dix classes et `null`
 * rendaient le même jeu d'obligations, les cinq familles et `null` aussi. La
 * lecture des deux règlements dit pourquoi, et dans les deux cas c'est une
 * question de DESTINATAIRE ou d'OBJET :
 *
 *   — arrêté du 30 décembre 2011 : GH 5 met les vérifications périodiques à la
 *     charge des « propriétaires » sans les moduler par classe ; la seule
 *     périodicité indexée sur la classe (GH 4 § 3) est celle de la visite de la
 *     commission de sécurité ; et GH 66 dispose que le classement retient
 *     « l'usage principal de l'immeuble », les dispositions de chaque classe
 *     s'appliquant « dans chacune des parties concernées » — la classe déclarée
 *     de la tour n'est donc même pas le bon objet pour décrire le plateau qu'on
 *     y occupe ;
 *   — arrêté du 31 janvier 1986 : l'article 101, unique obligation périodique
 *     du texte, vise « le propriétaire » sans mentionner de famille. Les
 *     familles gouvernent la construction (articles 97 et 98).
 *
 * Les deux corpus portent le détail article par article. Ce qui reste : les
 * colonnes, les énumérations Prisma, leurs reflets dans `types-communs.ts`, et
 * la capacité du moteur à exprimer `igh: { classes }` / `habitation:
 * { familles }` — retirer la question n'est pas retirer la capacité.
 */


// -----------------------------------------------------------------------------
// Frontière 4ᵉ / 5ᵉ catégorie — table des seuils, type par type (2026-08-25)
// -----------------------------------------------------------------------------

/**
 * Seuil d'assujettissement au premier groupe (1ʳᵉ à 4ᵉ catégorie), exprimé en
 * **effectif du public seul** — jamais public + personnel (CCH, art.
 * R. 143-19, dernier tiret : « 5e catégorie : établissements […] dans
 * lesquels l'effectif du public n'atteint pas le chiffre minimum fixé par le
 * règlement de sécurité pour chaque type d'exploitation »).
 *
 * Chaque article « 1 » des dispositions particulières de l'arrêté du
 * 25 juin 1980 formule le seuil ainsi : l'établissement est assujetti au
 * premier groupe si l'effectif du public est « supérieur ou égal à l'un des
 * chiffres suivants » — sous-sol, étages (galeries, ouvrages en élévation),
 * total. Un **seul** chiffre atteint suffit. Un restaurant de 150 couverts
 * est donc de 5ᵉ catégorie en rez-de-chaussée, mais de 4ᵉ si 100 d'entre eux
 * sont en sous-sol.
 *
 * Un niveau absent (`undefined`) signifie que l'article ne pose pas de seuil
 * distinct pour ce niveau (type O : un seul chiffre total).
 */
export type SeuilParNiveau = {
  sousSol?: number;
  etages?: number;
  total: number;
};

/** Traçabilité commune : quel article, dans quelle version, lu quand. */
type SourceSeuil = {
  /** Article des dispositions particulières qui fixe le seuil (ex. « N 1 »). */
  article: string;
  /** Date de la version de l'article lue sur Légifrance. */
  versionLue: string;
  urlLegifrance: string;
  /** Date de relecture effective du texte. */
  dateLecture: string;
};

/**
 * Union discriminée (amendement 2026-08-25). Auparavant `seuil` et
 * `conditionSupplementaire` cohabitaient dans un seul type : dès qu'une
 * condition était posée, `deduire4eOu5e` rendait `a_confirmer` sans jamais
 * lire `seuil`, qui devenait de la donnée morte que rien ne signalait — c'est
 * ce qu'a relevé la revue sur le type X. La séparation rend l'incohérence
 * impossible à écrire : un type non déductible n'a pas de champ `seuil`, et
 * le compilateur refuse d'en lire un.
 */
export type Seuil5eCategorie =
  | ({
      /** L'effectif suffit à trancher : le seuil est applicable tel quel. */
      deductible: true;
      seuil: SeuilParNiveau;
    } & SourceSeuil)
  | ({
      /**
       * L'article pose une condition qui ne se lit pas dans l'effectif. La
       * déduction ne tranche jamais, quelle que soit la capacité déclarée.
       */
      deductible: false;
      condition: string;
      /**
       * Seuils du texte, conservés pour la traçabilité de la relecture.
       * Volontairement nommés à part : ils ne sont jamais appliqués.
       */
      seuilTexte?: SeuilParNiveau;
    } & SourceSeuil);

/**
 * Table des seuils, **uniquement** pour les types dont l'article « 1 » a été
 * relu mot pour mot sur Légifrance le 2026-08-25. Les autres types ne sont
 * pas dans la table, et la catégorie leur est demandée (cf. `deduire4eOu5e`).
 *
 * Types volontairement absents, et pourquoi :
 *   - **R** (enseignement, crèches) : sous-sol interdit aux élèves, étages
 *     assujettis « quel que soit l'effectif » pour les maternelles/crèches,
 *     seuil propre aux locaux à sommeil — et le texte de R 1 n'a pas pu être
 *     relu mot pour mot. L'effectif seul ne tranche jamais.
 *   - **U** (soins) : seuil en effectif simultané OU en lits (20 lits
 *     d'hospitalisation), et le champ de U 1 vise les établissements de
 *     santé, pas les cabinets libéraux.
 *   - **J** (accueil de personnes âgées ou handicapées) : seuil en capacité
 *     d'hébergement (25 / 20 lits), pas en public. Le type est entré dans
 *     l'enum `TypeErp` le 2026-09-03 ; sa ligne de seuils, elle, n'a toujours
 *     pas été relue mot pour mot, donc il reste hors table.
 *   - **L** : deux grilles selon la nature de la salle (a, b, e, f, g :
 *     100 en sous-sol / 200 au total ; c, d — projection, spectacles,
 *     cabarets : 20 / 50). L'assistant ne demande pas le sous-type.
 *   - OA, GA, PA, CTS, SG, PS, EF, REF : hors grille TPE, non relus.
 *
 * Point d'attention : l'article PE 2 (Livre III) reproduit cette table, mais
 * sa version courante n'a pas pu être relue. Les chiffres ci-dessous viennent
 * des articles « 1 » eux-mêmes, qui sont la source ; PE 2 n'en est que la
 * copie. L'audit du 2026-08-25 a montré que la distinction n'est pas
 * théorique : pour le type O, la table résume « 100 » là où O 1 pose aussi un
 * seuil de plus de 15 personnes pour les hébergements autres qu'hôteliers.
 *
 * Les dix URL ci-dessous ont été ouvertes une à une le 2026-08-25 : chacune
 * mène bien au chapitre de son type, et les chiffres encodés concordent avec
 * l'article « 1 » correspondant.
 */
export const SEUILS_5E_CATEGORIE: Partial<Record<TypeErp, Seuil5eCategorie>> = {
  N: {
    deductible: true,
    seuil: { sousSol: 100, etages: 200, total: 200 },
    article: "N 1",
    versionLue: "1982-08-12",
    urlLegifrance:
      "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020334913/",
    dateLecture: "2026-08-25",
  },
  M: {
    deductible: true,
    seuil: { sousSol: 100, etages: 100, total: 200 },
    article: "M 1",
    versionLue: "2017-07-01",
    urlLegifrance:
      "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020334831",
    dateLecture: "2026-08-25",
  },
  W: {
    deductible: true,
    seuil: { sousSol: 100, etages: 100, total: 200 },
    article: "W 1",
    versionLue: "1983-05-21",
    urlLegifrance:
      "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020336387/",
    dateLecture: "2026-08-25",
  },
  T: {
    deductible: true,
    seuil: { sousSol: 100, etages: 100, total: 200 },
    article: "T 1",
    versionLue: "1988-01-15",
    urlLegifrance:
      "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000025194889/2023-09-04",
    dateLecture: "2026-08-25",
  },
  S: {
    deductible: true,
    seuil: { sousSol: 100, etages: 100, total: 200 },
    article: "S 1",
    versionLue: "1995-10-18",
    urlLegifrance:
      "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020334994/2023-09-20/",
    dateLecture: "2026-08-25",
  },
  Y: {
    deductible: true,
    seuil: { sousSol: 100, etages: 100, total: 200 },
    article: "Y 1",
    versionLue: "1995-10-18",
    urlLegifrance:
      "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020336982/",
    dateLecture: "2026-08-25",
  },
  V: {
    deductible: true,
    seuil: { sousSol: 100, etages: 200, total: 300 },
    article: "V 1",
    versionLue: "1983-05-21",
    urlLegifrance:
      "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020336386/2019-07-01",
    dateLecture: "2026-08-25",
  },
  O: {
    // Corrigé à l'audit 2026-08-25 : l'article O 1 pose DEUX seuils, et la
    // table du second groupe (PE 2) n'en reproduit que le premier. Les hôtels
    // sont assujettis à partir de 100 personnes ; les « autres établissements
    // d'hébergement » — résidences de tourisme, ensembles de chambres ou
    // d'appartements meublés sous gestion commune — le sont dès **plus de 15
    // personnes**. L'assistant ne demande pas laquelle des deux natures
    // s'applique, et l'écart entre les deux seuils est tel qu'un faux négatif
    // classerait en 5ᵉ catégorie un établissement du premier groupe. Or le
    // type O comporte des locaux à sommeil : c'est précisément là que se
    // jouent la visite périodique de la commission de sécurité et la
    // vérification électrique annuelle par organisme agréé. On ne tranche
    // donc pas.
    deductible: false,
    condition:
      "Le seuil dépend de la nature de l'hébergement : 100 personnes pour un hôtel ou une pension de famille, mais plus de 15 personnes pour les autres établissements d'hébergement (résidence de tourisme, ensemble de chambres ou d'appartements meublés sous gestion commune).",
    seuilTexte: { total: 100 },
    article: "O 1",
    versionLue: "2012-01-01",
    urlLegifrance:
      "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020334940/",
    dateLecture: "2026-08-25",
  },
  P: {
    deductible: true,
    seuil: { sousSol: 20, etages: 100, total: 120 },
    article: "P 1",
    versionLue: "1985-01-20",
    urlLegifrance:
      "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020334969/",
    dateLecture: "2026-08-25",
  },
  X: {
    // Le `seuil` porté ici n'a jamais été lu : la condition ci-dessous fait
    // rendre `a_confirmer` avant. Il est désormais nommé `seuilTexte`, ce qui
    // dit ce qu'il est — une trace de relecture, pas une règle appliquée.
    deductible: false,
    condition:
      "Salles polyvalentes à dominante sportive : assujetties seulement si surface < 1 200 m² et hauteur sous plafond ≥ 6,50 m.",
    seuilTexte: { sousSol: 100, etages: 100, total: 200 },
    article: "X 1",
    versionLue: "1982-07-08",
    urlLegifrance:
      "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020336672/2019-07-01",
    dateLecture: "2026-08-25",
  },
};

/**
 * Effectif du public tel que le dirigeant peut le déclarer : le total, et —
 * seulement si l'établissement en accueille — le nombre en sous-sol et en
 * étage. `0` vaut « aucun public à ce niveau » ; `undefined` vaut « non
 * renseigné » et empêche de trancher dès que le seuil du type en dépend.
 */
export type EffectifPublicParNiveau = {
  total: number;
  sousSol?: number;
  etages?: number;
};

const QUESTION_CATEGORIE =
  "Votre arrêté d'ouverture ou le PV de la commission de sécurité indique-t-il « 4ᵉ catégorie » ou « 5ᵉ catégorie » ?";

function aConfirmer(motif: string): DeductionCategorieErp {
  return {
    statut: "a_confirmer",
    categoriesPossibles: ["N4", "N5"],
    motif,
    question: QUESTION_CATEGORIE,
  };
}

/**
 * Tranche entre 4ᵉ et 5ᵉ catégorie pour un établissement dont l'effectif
 * total (public + personnel) est de 300 personnes ou moins.
 *
 * Règle de prudence, verrouillée par les tests :
 *   - type absent de la table ⇒ `a_confirmer` ;
 *   - article posant une condition hors effectif ⇒ `a_confirmer` ;
 *   - seuil dépendant d'un niveau (sous-sol, étages) dont l'occupation n'est
 *     pas renseignée ⇒ `a_confirmer`, sauf si le total suffit déjà à
 *     atteindre le premier groupe (auquel cas la réponse est acquise quelle
 *     que soit la répartition).
 *
 * Le résultat reste une **proposition** : l'effectif du public est une
 * déclaration du chef d'établissement (R. 143-19, al. 1), et la catégorie
 * arrêtée figure sur l'arrêté d'ouverture ou le PV de la commission.
 */
export function deduire4eOu5e(
  type: TypeErp,
  effectifPublic: EffectifPublicParNiveau,
): DeductionCategorieErp {
  const s = SEUILS_5E_CATEGORIE[type];
  if (!s) {
    return aConfirmer(
      `Le seuil de 5ᵉ catégorie du type ${type} n'est pas encodé : la limite entre 4ᵉ et 5ᵉ dépend d'un seuil propre à votre type d'activité, fixé par le règlement de sécurité.`,
    );
  }
  if (!s.deductible) {
    return aConfirmer(
      `Pour le type ${type}, l'article ${s.article} pose une condition qui ne se lit pas dans l'effectif (${s.condition}).`,
    );
  }
  const { seuil } = s;
  const source = `arrêté du 25 juin 1980, art. ${s.article}`;

  if (effectifPublic.total >= seuil.total) {
    return {
      statut: "proposee",
      categorieErp: "N4",
      motif: `${effectifPublic.total} personnes du public au total, seuil de ${seuil.total} atteint (${source}) : 4ᵉ catégorie.`,
    };
  }
  if (seuil.sousSol !== undefined && effectifPublic.sousSol === undefined) {
    return aConfirmer(
      `Pour le type ${type}, le seuil dépend aussi du public accueilli en sous-sol (${seuil.sousSol} personnes, ${source}) : indiquez ce nombre, ou 0.`,
    );
  }
  if (seuil.etages !== undefined && effectifPublic.etages === undefined) {
    return aConfirmer(
      `Pour le type ${type}, le seuil dépend aussi du public accueilli en étage (${seuil.etages} personnes, ${source}) : indiquez ce nombre, ou 0.`,
    );
  }
  if (
    seuil.sousSol !== undefined &&
    effectifPublic.sousSol !== undefined &&
    effectifPublic.sousSol >= seuil.sousSol
  ) {
    return {
      statut: "proposee",
      categorieErp: "N4",
      motif: `${effectifPublic.sousSol} personnes du public en sous-sol, seuil de ${seuil.sousSol} atteint (${source}) : 4ᵉ catégorie.`,
    };
  }
  if (
    seuil.etages !== undefined &&
    effectifPublic.etages !== undefined &&
    effectifPublic.etages >= seuil.etages
  ) {
    return {
      statut: "proposee",
      categorieErp: "N4",
      motif: `${effectifPublic.etages} personnes du public en étage, seuil de ${seuil.etages} atteint (${source}) : 4ᵉ catégorie.`,
    };
  }
  return {
    statut: "proposee",
    categorieErp: "N5",
    motif: `Effectif du public sous les seuils de l'article ${s.article} (${[
      seuil.sousSol !== undefined ? `${seuil.sousSol} en sous-sol` : null,
      seuil.etages !== undefined ? `${seuil.etages} en étage` : null,
      `${seuil.total} au total`,
    ]
      .filter(Boolean)
      .join(", ")}) : 5ᵉ catégorie.`,
  };
}

/**
 * Déduction complète de la catégorie ERP à partir de ce que l'assistant
 * collecte : l'effectif du public (par niveau) et l'effectif du personnel.
 *
 * Deux effectifs, deux règles (R. 143-19) :
 *   - les bornes 1ʳᵉ / 2ᵉ / 3ᵉ se lisent sur public **+ personnel** (al. 3 :
 *     « majorer l'effectif du public de celui du personnel n'occupant pas
 *     des locaux indépendants ») ;
 *   - la frontière 4ᵉ / 5ᵉ se lit sur le public **seul** (dernier tiret).
 * Le personnel est pris égal à `effectifSurSite`, ce qui suppose qu'il
 * n'occupe pas de locaux indépendants avec leurs propres dégagements — c'est
 * le cas général en TPE, et l'hypothèse la plus prudente (elle ne peut que
 * rehausser la catégorie).
 */
export function deduireCategorieErpComplete(
  type: TypeErp,
  effectifPublic: EffectifPublicParNiveau,
  effectifPersonnel: number,
): DeductionCategorieErp {
  const total = effectifPublic.total + effectifPersonnel;
  if (total > SEUIL_3E_CATEGORIE) return deduireCategorieErp(total);
  return deduire4eOu5e(type, effectifPublic);
}
