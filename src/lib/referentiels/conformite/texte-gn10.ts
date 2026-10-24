/**
 * `GN 10` du règlement de sécurité ERP — l'application du règlement aux
 * établissements existants — dans ses mots, UNE fois.
 *
 * POURQUOI CE MODULE EXISTE (C60, 2026-10-07, revue indépendante de la
 * relecture du préventeur). La phrase qui cite GN 10 était recopiée à la main
 * dans six descriptions : quatre états permanents du livre III
 * (`incendie.ts` : PE 27 § 4 et § 5, PE 33, PE 35) et les deux lignes
 * d'identification des extincteurs (`signalisation.ts` : MS 38/MS 39 et
 * PE 26). Six copies d'un même verbatim divergent à la première correction,
 * et c'est la divergence qu'on ne verrait pas — le motif exact de
 * `REFERENCES_GE4` dans `incendie.ts`.
 *
 * Verbatim : celui du corpus (`arrete-1980-livre-1`, `GN 10`, version en
 * vigueur depuis le 23 janvier 2010). `texte-gn10.test.ts` le confronte à la
 * `citationCle` de l'entrée ; `conformite.test.ts` exige que tout état
 * permanent fondé sur le livre III ou sur MS 39 porte cette phrase entière.
 *
 * LES FICHIERS DE DONNÉES N'IMPORTENT PAS CETTE CONSTANTE, ils écrivent la
 * phrase en littéral : un fichier de `DONNEES_REFERENTIEL` ne porte ni
 * fonction ni import de valeur (`version-moteur.test.ts`), sans quoi il
 * sortirait du relevé du moteur. C'est la forme de `texte-r4121-2.ts` : la
 * constante est la référence, et `conformite.test.ts` exige que chaque
 * description concernée la contienne mot pour mot — une copie qui diverge
 * rougit, au lieu de passer.
 */

/** Le texte de GN 10, § 1 et § 2, tel que le corpus le consigne. */
export const CITATION_GN_10 =
  "§ 1. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants. § 2. Lorsque des travaux de remplacement d'installation, d'aménagement ou d'agrandissement sont entrepris dans ces établissements, les dispositions du présent règlement sont applicables aux seules parties de la construction ou des installations modifiées. Toutefois, si ces modifications ont pour effet d'accroître le risque de l'ensemble de l'établissement, notamment si une évacuation différée est rendue nécessaire, des mesures de sécurité complémentaires peuvent être imposées après avis de la commission de sécurité.";

/**
 * La phrase qui termine la description d'un état permanent servi à tout
 * établissement de la catégorie : la sur-application, rendue lisible.
 */
export const DESCRIPTION_GN_10 = `Les dispositions générales du règlement de sécurité écrivent, à l'article GN 10 (rédaction en vigueur depuis le 23 janvier 2010, arrêté du 24 septembre 2009) : « ${CITATION_GN_10} »`;

/** L'adresse de GN 10 en vigueur (corpus `arrete-1980-livre-1`, relu le 2026-09-27). */
export const URL_GN_10 =
  "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021231106";

/**
 * Vrai si l'obligation cite GN 10 entier dans sa description — la SEULE
 * lecture de « cette ligne porte GN 10 » (contrôle visuel de c6, 2026-10-17).
 *
 * POURQUOI UNE FONCTION. La phrase n'était que dans la `description`, que
 * l'écran « Ce qui doit être en place » n'affiche pas : la décision de la
 * propriétaire (servir ces lignes à tous parce que GN 10 le dit) ne se lisait
 * nulle part. L'écran en tire désormais une mention (`MENTION_GN_10`) ; aucune
 * surface ne compare de texte elle-même, elles lisent ce prédicat, par
 * `fondementDe` (`etats-permanents/fondement.ts`).
 */
export function porteGn10(o: { description?: string | null }): boolean {
  return (o.description ?? "").includes(DESCRIPTION_GN_10);
}

/**
 * La mention COURTE, sur la ligne, suivie de la pastille « GN 10 »
 * (décision de c6, 2026-10-17 : la phrase longue répétée sur onze lignes d'un
 * N3 faisait trop de texte). La phrase longue et le verbatim vont au dépli.
 */
// ~~« Peut ne pas s'appliquer à un établissement existant (art. GN 10). »~~
// [2026-10-24, retour de la propriétaire : « ça c'est pas clair » — le
// dirigeant ne pouvait rien en faire. La phrase dit maintenant à quoi tient
// l'exception : l'ouverture avant la règle. Les travaux (GN 10 § 2) restent
// au dépli, avec le texte entier : la phrase courte ne les résume pas.]
export const MENTION_GN_10_COURTE =
  "Si votre établissement a ouvert avant cette règle, elle peut ne pas s'imposer à vous (art. GN 10).";

/** Le geste, au dépli, après le verbatim : sans qualification. */
export const GESTE_GN_10 =
  "En cas de doute, la commission de sécurité ou votre préventeur peut vous le dire.";

/**
 * La mention LONGUE, au dépli de la pastille « GN 10 », avant le verbatim. Elle CITE GN 10 et dit ce
 * que fait Rojer, sans dater l'« existant » ni conclure pour le dirigeant :
 * le corpus a rayé le 2026-09-26 toute lecture qui rattache l'existant à
 * l'entrée en vigueur de chaque disposition (`arrete-1980-livre-1`, GN 10).
 * Le texte entier se déplie sous la pastille « GN 10 ».
 */
export const MENTION_GN_10 =
  "Le règlement de sécurité écrit qu'il « ne s'applique pas aux établissements existants », hors dispositions administratives, contrôles, vérifications et entretien (art. GN 10). Rojer, qui ne connaît pas l'histoire de votre établissement, vous sert cette ligne.";
