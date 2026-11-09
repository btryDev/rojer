// Le type déclaré d'un appareil, là où une catégorie en réunit plusieurs
// (ADR-057 § 5, 2026-11-07).
//
// `PORTE_AUTO` et `PORTAIL_AUTO` ne font plus qu'une catégorie ; les trois EPI
// vérifiables ont rejoint `EPI`. Deux lignes du référentiel distinguent la
// porte du portail (CO 48 § 3 e) pour les portes, l'arrêté du 21 décembre 1993
// art. 2 pour les passages de véhicules) ; trois distinguent les EPI (la
// vérification de douze mois de l'arrêté du 19 mars 1993, le maintien en état
// de R. 4322-1 pour les autres). La différence est désormais une
// caractéristique de l'appareil, lue par les conditions `enum_egale` /
// `enum_differente` du référentiel.
//
// Le type NOMME UN OBJET — un harnais, un portail —, jamais une conclusion de
// droit (« soumis à vérification ») : c'est le motif qui avait fait préférer
// des catégories en 2026-09-04, et il tient (notes de
// `epi-verification-generale-periodique`).
//
// La réponse est EXIGÉE à la saisie (`equipementSchema`) ; les appareils déjà
// en base l'ont reçue de leur ancienne catégorie (migration
// `20261107120100_categories_jumelles_reprise`).
//
// Module pur : ni Prisma, ni React.

import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

export const TYPES_PORTE = ["porte", "portail"] as const;
export type TypePorte = (typeof TYPES_PORTE)[number];

export const TYPES_EPI = ["antichute", "respiratoire", "gilet_sauvetage", "autre"] as const;
export type TypeEpi = (typeof TYPES_EPI)[number];

type Option = { libelle: string; aide: string };

/**
 * Les propriétés de type, une par catégorie qui en pose un. La validation,
 * la normalisation, la sérialisation et la page de modification bouclent
 * dessus ; `categories-jumelles.test.ts` la lie à `QUESTION_DE_TYPE`.
 */
export const PROPRIETES_DE_TYPE = ["typePorte", "typeEpi"] as const;
export type ProprieteDeType = (typeof PROPRIETES_DE_TYPE)[number];

/**
 * La question de type d'une catégorie : la propriété écrite dans
 * `caracteristiques`, la question posée, et chaque réponse avec son aide.
 */
export type QuestionDeType = {
  propriete: ProprieteDeType;
  question: string;
  options: readonly (Option & { valeur: string })[];
};

const OPTIONS_PORTE: Record<TypePorte, Option> = {
  // Reprend `DESCRIPTION_CATEGORIE.PORTE_AUTO` d'avant la fusion.
  porte: {
    libelle: "Porte automatique (passage des personnes)",
    aide: "Porte motorisée piétonne, entrée automatique.",
  },
  // Reprend `DESCRIPTION_CATEGORIE.PORTAIL_AUTO` d'avant la fusion — le
  // rideau métallique et la barrière levante y étaient rangés (décision de c6
  // du 2026-10-17, relecture du 2026-10-18) et y restent.
  portail: {
    libelle: "Portail, barrière levante ou rideau métallique",
    aide: "Portail motorisé de véhicule. Le rideau métallique motorisé d'une devanture et la barrière levante motorisée se déclarent aussi ici.",
  },
};

const OPTIONS_EPI: Record<TypeEpi, Option> = {
  antichute: {
    libelle: "Harnais antichute, système de retenue ou de maintien au travail",
    aide: "Le harnais et sa longe, l'antichute mobile ou à rappel automatique, le connecteur, les systèmes de retenue et de maintien au travail. Pas le point d'ancrage scellé dans le bâtiment.",
  },
  respiratoire: {
    libelle: "Appareil de protection respiratoire ou cartouches filtrantes",
    aide: "Appareil respiratoire isolant autonome d'évacuation, équipement complet d'intervention en milieu hostile, stock de cartouches filtrantes antigaz — y compris pour un demi-masque. Pas le masque de confort ni le masque jetable sans cartouche.",
  },
  gilet_sauvetage: {
    libelle: "Gilet de sauvetage gonflable",
    aide: "Le gilet qui se gonfle par cartouche. Le gilet en mousse n'est pas de ce type.",
  },
  autre: {
    libelle: "Autre EPI (casque, gants, chaussures, lunettes, protections auditives…)",
    aide: "Ce qu'une personne porte pour se protéger et qu'aucun texte ne soumet à une vérification de douze mois.",
  },
};

const options = <T extends string>(o: Record<T, Option>, ordre: readonly T[]) =>
  ordre.map((valeur) => ({ valeur, ...o[valeur] }));

export const QUESTION_DE_TYPE: Partial<Record<CategorieEquipement, QuestionDeType>> = {
  PORTE_PORTAIL_MOTORISE: {
    propriete: "typePorte",
    question: "Porte ou portail ?",
    options: options(OPTIONS_PORTE, TYPES_PORTE),
  },
  EPI: {
    propriete: "typeEpi",
    question: "Quel équipement ?",
    options: options(OPTIONS_EPI, TYPES_EPI),
  },
};

/**
 * Le libellé court du type déclaré d'un appareil, lu dans ses
 * caractéristiques ; `null` si la catégorie n'en pose pas ou s'il manque.
 */
export function libelleDuType(
  categorie: CategorieEquipement,
  caracteristiques: Readonly<Record<string, unknown>> | null | undefined,
): string | null {
  const q = QUESTION_DE_TYPE[categorie];
  if (!q || !caracteristiques) return null;
  const valeur = caracteristiques[q.propriete];
  return q.options.find((o) => o.valeur === valeur)?.libelle ?? null;
}
