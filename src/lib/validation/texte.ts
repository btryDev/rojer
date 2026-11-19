import { z } from "zod";

/**
 * Un texte saisi dans un formulaire, borné à `max` caractères comptés comme
 * le navigateur les compte.
 *
 * L'attribut `maxLength` d'un champ compte un saut de ligne pour un
 * caractère ; l'envoi du formulaire en fait deux (`\r\n`, multipart). Sans
 * normaliser, un texte que le champ accepte est refusé au serveur dès qu'il
 * frôle la borne. Les fins de ligne sont donc ramenées à `\n`, puis les
 * espaces de début et de fin retirés, AVANT de compter.
 *
 * [2026-11-19 : posé pour le formulaire de contact. Les autres zones de texte
 * bornées des deux côtés au même seuil (assistance, carnet sanitaire, permis
 * de feu, plan de prévention…) ont le même défaut : à brancher ici, lot à
 * part.]
 */
export function texteSaisi(max: number, tropLong: string) {
  return z
    .string()
    .overwrite((t) => t.replace(/\r\n?/g, "\n").trim())
    .max(max, tropLong);
}

/** Une ligne, sans saut de ligne ni espaces répétés : un nom, un sujet d'e-mail. */
export function surUneLigne(t: string): string {
  return t.replace(/\s+/g, " ").trim();
}
