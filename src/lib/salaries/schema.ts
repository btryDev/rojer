import { z } from "zod";
import { estJourCivilReel } from "@/lib/dates";

/**
 * La saisie d'un salarié et de ses titres.
 *
 * Ce module est le seul du produit à porter des données nominatives de
 * personnes qui ne sont pas l'utilisateur. Deux règles en découlent, et elles
 * sont dans le schéma plutôt que dans l'écran, pour qu'on ne puisse pas les
 * contourner en appelant l'action d'ailleurs :
 *
 * 1. On ne demande que ce qui sert à identifier la personne et à dater ses
 *    titres. Pas de date de naissance, pas de numéro de sécurité sociale, pas
 *    de contact — rien de tout cela n'est nécessaire pour savoir qu'une
 *    attestation expire (`docs/rgpd.md` § 2.3, minimisation).
 * 2. Aucun champ ne peut recevoir un élément de santé. Le formulaire de titre
 *    n'a pas de dépôt de pièce quand l'obligation est marquée `pieceMedicale`,
 *    et la note libre est explicitement présentée comme non médicale.
 */

const nomSchema = z
  .string()
  .trim()
  .min(1, "Le nom est requis")
  .max(100, "100 caractères au maximum");

/**
 * Une date de calendrier saisie au format `<input type="date">`.
 *
 * Elle est lue à midi UTC et non à minuit. Une date civile stockée à
 * `00:00Z` se relit « la veille » dans tout fuseau à l'ouest de Greenwich,
 * et l'application vit en Europe/Paris (ADR-011) : une délivrance du 3 mars
 * s'afficherait « 2 mars » pour peu qu'un serveur rende en UTC−1.
 */
const dateCivile = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format JJ/MM/AAAA")
  .refine(estJourCivilReel, "Cette date n'existe pas")
  .transform((s) => new Date(`${s}T12:00:00.000Z`));

const dateCivileOptionnelle = z
  .union([dateCivile, z.literal("").transform(() => null)])
  .nullable()
  .default(null);

export const salarieSchema = z.object({
  nom: nomSchema,
  prenom: nomSchema,
  /**
   * Texte libre, et qui le reste. Le moteur ne déduit RIEN d'un intitulé de
   * poste : croire qu'un « électricien » a besoin d'une habilitation serait
   * le cinquième déclencheur (l'activité réellement exercée), qui n'est pas
   * implémenté — et le déduire d'une chaîne de caractères serait de
   * l'analyse de texte, que le produit s'interdit (ADR-023 § 1 bis).
   */
  poste: z
    .string()
    .trim()
    .max(120, "120 caractères au maximum")
    .optional()
    .transform((v) => (v ? v : null)),
  entreLe: dateCivileOptionnelle,
});

export type SalarieInput = z.infer<typeof salarieSchema>;

export const titreSchema = z
  .object({
    obligationId: z.string().trim().min(1, "Choisissez un titre"),
    delivreLe: dateCivile,
    echeanceLe: dateCivileOptionnelle,
    /**
     * L'organisme, le niveau d'habilitation, la référence du certificat.
     * Jamais un motif médical : l'écran le dit, et `frontiere-medicale.test.ts`
     * garde qu'aucun dépôt de pièce ne s'ouvre ici.
     */
    note: z
      .string()
      .trim()
      .max(500, "500 caractères au maximum")
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine(
    (t) => t.echeanceLe === null || t.echeanceLe.getTime() > t.delivreLe.getTime(),
    {
      message: "L'échéance doit être postérieure à la délivrance",
      path: ["echeanceLe"],
    },
  );

export type TitreInput = z.infer<typeof titreSchema>;
