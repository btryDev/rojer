import { depuisCleJourCivil, estJourCivilReel } from "@/lib/dates";
import { z } from "zod";
import type { TypeAction } from "@prisma/client";

/**
 * Schémas Zod du plan d'actions unifié (étape 8, ADR-002).
 *
 * Portée V2 : une `Action` peut être rattachée soit à un `Risque` (mesure
 * DUERP) soit à une `Verification` (écart détecté sur un rapport).
 * Les schémas ci-dessous couvrent les parcours "depuis vérif" (création,
 * édition, clôture) — les mesures DUERP utilisent toujours `ajouterMesureCustom`
 * et `modifierMesure` dans `actions.ts` pour préserver le wizard existant.
 *
 * Depuis le 2026-10-12, l'édition reprend le schéma de la création
 * (`actionVerificationSchema`). `modifierActionSchema` — un patch que nul
 * écran n'envoyait — est retiré, avec `STATUTS_ACTION` qu'il était seul à lire.
 */

export const TYPES_ACTION = [
  "suppression",
  "reduction_source",
  "protection_collective",
  "protection_individuelle",
  "formation",
  "organisationnelle",
] as const satisfies readonly TypeAction[];

/**
 * L'échelle de `Action.criticite` — **1 à 5, et ce n'est pas celle du DUERP**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX GRANDEURS PORTENT LE MÊME NOM, ET LES CONFONDRE SE VOIT À L'ÉCRAN
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `Risque.criticite` est (gravité × probabilité) / maîtrise, bornée [1, 16] par
 * `lib/cotation` et écrite « 05/16 » partout où elle s'affiche. `Action
 * .criticite` est celle de l'écart à corriger, sur la même échelle que les
 * obligations du référentiel — `ObligationConformite.criticite: 1|2|3|4|5`,
 * « 1 = informatif, 5 = vital ». Les deux colonnes s'appellent `criticite`, et
 * la base ne borne ni l'une ni l'autre (`Int?`).
 *
 * Le 2026-09-04, la fiche d'une action affichait **« 6 sur 5 » et cinq points
 * tous pleins** : le seed recopiait la criticité du risque (échelle 16) dans
 * l'action (échelle 5). Sur un dossier réel avec un risque grave, ç'aurait été
 * « 16 sur 5 ». Le seed est corrigé — aucun écrivain de production ne mettait
 * cette valeur là, `toggleMesureReferentiel` et `ajouterMesureCustom` laissant
 * le champ vide — et la borne porte désormais un nom, pour que la validation
 * et l'affichage cessent d'écrire « 5 » chacun de leur côté.
 *
 * `CarteFiche.Cotation` reçoit cette constante en `sur` ; sa prop est
 * délibérément requise, pour qu'aucun appelant n'hérite en silence d'une
 * échelle qu'il n'a pas choisie.
 */
export const CRITICITE_ACTION_MIN = 1;
export const CRITICITE_ACTION_MAX = 5;

const DATE_FMT = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Schéma de création d'action depuis une vérification (écart de rapport).
 * Le type de mesure (hiérarchie L. 4121-2) est optionnel ici : la
 * hiérarchie s'impose aux mesures de prévention rattachées à un risque,
 * pas systématiquement aux actions de levée d'écart (qui peuvent être
 * simplement correctives).
 */
export const actionVerificationSchema = z.object({
  libelle: z.string().trim().min(1, "Libellé requis").max(300),
  description: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(2000).optional(),
  ),
  type: z.enum(TYPES_ACTION),
  criticite: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce
      .number()
      .int()
      .min(CRITICITE_ACTION_MIN)
      .max(CRITICITE_ACTION_MAX)
      .optional(),
  ),
  echeance: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z
      .string()
      .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
      .refine(estJourCivilReel, "Cette date n'existe pas")
      .optional()
      .transform((v) => (v ? depuisCleJourCivil(v) : undefined)),
  ),
  responsable: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(200).optional(),
  ),
});

export type ActionVerificationInput = z.infer<typeof actionVerificationSchema>;

/**
 * Schéma de clôture d'une action ouverte. Le commentaire est obligatoire
 * pour permettre une trace d'audit : on ne doit jamais fermer une action
 * sans justification.
 */
export const cloturerActionSchema = z.object({
  commentaire: z
    .string()
    .trim()
    .min(5, "Justificatif requis (minimum 5 caractères)")
    .max(2000),
  // Un champ ABSENT arrive `null` (`FormData.get`) : le formulaire ne pose le
  // choix du rapport que s'il y en a. `null` passait tel quel et refusait la
  // levée (« Formulaire invalide ») — relevé par les tests de la pièce, le
  // 2026-10-24.
  rapportId: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : undefined),
    z.string().optional(),
  ),
});

export type CloturerActionInput = z.infer<typeof cloturerActionSchema>;
