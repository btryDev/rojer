// Validation des réponses saisies sur une fiche du registre.
//
// Le schéma n'est pas écrit à la main : il est **dérivé du catalogue de
// questions** (`champs.ts`). Une question ajoutée là-bas devient validable ici
// sans qu'on y touche, et il n'existe pas deux listes à tenir d'accord.
//
// Toutes les valeurs sont stockées en **chaîne**, y compris les nombres et les
// dates. C'est délibéré : ces réponses s'impriment, elles ne se calculent
// jamais. Une date reste donc une clé de jour civil « AAAA-MM-JJ » (ADR-011),
// jamais un instant — un registre consigne le jour d'un exercice, pas l'heure
// UTC à laquelle quelqu'un a rempli le champ.
//
// Module **pur** : ni Prisma, ni React.

import { z } from "zod";
import { estJourCivilReel } from "@/lib/dates";
import { saisiePourSection, type ChampFiche } from "./champs";

const CLE_JOUR = /^\d{4}-\d{2}-\d{2}$/;

/** Une ligne de journal, telle qu'elle est rangée dans `contenu`. */
export type LigneJournal = {
  id: string;
  /** Clé de champ → réponse. `null` = laissé vide. */
  valeurs: Record<string, string | null>;
  /** Horodatage de la saisie, en ISO. Ce n'est pas la date de l'événement. */
  saisieLe: string;
};

export type ContenuFiche =
  | { champs: Record<string, string | null> }
  | { lignes: LigneJournal[] };

/** Le validateur d'une réponse, selon le type déclaré au catalogue. */
function validateurDuChamp(champ: ChampFiche): z.ZodType<string | null> {
  const vide = (v: unknown) =>
    typeof v === "string" ? v.trim() || null : (v ?? null);

  switch (champ.type) {
    case "date":
      return z.preprocess(
        vide,
        z
          .string()
          .regex(CLE_JOUR, "Format attendu : AAAA-MM-JJ")
          .refine(estJourCivilReel, "Cette date n'existe pas")
          .nullable(),
      ) as z.ZodType<string | null>;
    case "nombre":
      return z.preprocess(
        vide,
        z
          .string()
          .regex(/^\d{1,9}$/, "Nombre entier attendu")
          .nullable(),
      ) as z.ZodType<string | null>;
    case "email":
      return z.preprocess(
        vide,
        z.string().email("Adresse e-mail invalide").max(200).nullable(),
      ) as z.ZodType<string | null>;
    case "telephone":
      return z.preprocess(
        vide,
        z.string().max(40, "Numéro trop long").nullable(),
      ) as z.ZodType<string | null>;
    case "texte_long":
      return z.preprocess(
        vide,
        z.string().max(2000, "2000 caractères maximum").nullable(),
      ) as z.ZodType<string | null>;
    case "texte":
      return z.preprocess(
        vide,
        z.string().max(300, "300 caractères maximum").nullable(),
      ) as z.ZodType<string | null>;
  }
}

/**
 * Le schéma des réponses d'une fiche, dérivé de ses questions.
 *
 * `null` si la fiche n'est pas à saisie libre — inventaire et vérifications
 * sont alimentés par leurs propres modèles, on ne les écrit pas ici.
 */
export function schemaDeLaFiche(sectionId: string) {
  const saisie = saisiePourSection(sectionId);
  if (!saisie) return null;
  const champs = saisie.forme === "journal" ? saisie.colonnes : saisie.champs;
  // Une fiche adossée à l'établissement ne se saisit pas ici : sa réponse vit
  // sur une colonne existante. L'écrire dans `contenu` en ferait une seconde
  // copie, vouée à diverger de celle qu'affiche la fiche établissement.
  if (saisie.forme === "etablissement") return null;

  const forme: Record<string, z.ZodType<string | null>> = {};
  for (const c of champs) forme[c.cle] = validateurDuChamp(c);
  return z.object(forme);
}

/** Lecture défensive du JSON venu de la base — il n'a pas de type. */
export function lireContenu(brut: unknown): ContenuFiche {
  if (brut && typeof brut === "object" && !Array.isArray(brut)) {
    const o = brut as Record<string, unknown>;
    if (Array.isArray(o.lignes)) {
      return { lignes: o.lignes as LigneJournal[] };
    }
    if (o.champs && typeof o.champs === "object") {
      return { champs: o.champs as Record<string, string | null> };
    }
  }
  return { champs: {} };
}

/** Les lignes d'un journal, les plus récemment saisies d'abord. */
export function lignesDuJournal(brut: unknown): LigneJournal[] {
  const c = lireContenu(brut);
  if (!("lignes" in c)) return [];
  return [...c.lignes].sort((a, b) => b.saisieLe.localeCompare(a.saisieLe));
}
