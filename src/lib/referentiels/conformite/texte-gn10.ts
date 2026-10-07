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
 * Module sans dépendance : les fichiers de données du référentiel
 * l'importent, et l'empreinte (`empreinteReferentiel`) lit la description
 * telle qu'elle est composée, donc une correction ici la déplace.
 */

/** Le texte de GN 10, § 1 et § 2, tel que le corpus le consigne. */
export const CITATION_GN_10 =
  "§ 1. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants. § 2. Lorsque des travaux de remplacement d'installation, d'aménagement ou d'agrandissement sont entrepris dans ces établissements, les dispositions du présent règlement sont applicables aux seules parties de la construction ou des installations modifiées. Toutefois, si ces modifications ont pour effet d'accroître le risque de l'ensemble de l'établissement, notamment si une évacuation différée est rendue nécessaire, des mesures de sécurité complémentaires peuvent être imposées après avis de la commission de sécurité.";

/**
 * La phrase qui termine la description d'un état permanent servi à tout
 * établissement de la catégorie : la sur-application, rendue lisible.
 */
export const DESCRIPTION_GN_10 = `Les dispositions générales du règlement de sécurité écrivent, à l'article GN 10 (rédaction en vigueur depuis le 23 janvier 2010, arrêté du 24 septembre 2009) : « ${CITATION_GN_10} »`;
