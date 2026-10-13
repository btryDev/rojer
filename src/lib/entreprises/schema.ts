import { z } from "zod";
import { EFFECTIF_MAX } from "@/lib/etablissements/schema";

/**
 * Le refus de la porte au-delà de la borne du produit, pour l'effectif de
 * l'ENTREPRISE (décision de la propriétaire du 2026-09-26, ADR-031 : « c'est la
 * limite de Rojer »). Même borne que le site (`EFFECTIF_MAX`), même ton ; il
 * dit « dans l'entreprise » parce que c'est ce nombre-là qui la franchit.
 */
export const MESSAGE_REFUS_EFFECTIF_ENTREPRISE = `Rojer prend en charge les structures jusqu'à ${EFFECTIF_MAX} salariés dans l'entreprise, tous établissements confondus.`;

/** `Entreprise.effectif` est un `Int` Prisma, soit un `integer` Postgres
 *  (int4) : au-delà, l'écriture échoue. */
const EFFECTIF_COLONNE_MAX = 2_147_483_647;

const siretRegex = /^\d{14}$/;
const nafRegex = /^\d{2}\.?\d{2}[A-Z]?$/;

export const entrepriseSchema = z.object({
  raisonSociale: z
    .string()
    .trim()
    .min(1, "La raison sociale est obligatoire")
    .max(200, "200 caractères maximum"),
  siret: z
    .string()
    .trim()
    .regex(siretRegex, "SIRET = 14 chiffres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  codeNaf: z
    .string()
    .trim()
    .toUpperCase()
    .regex(nafRegex, "Code NAF invalide (ex. 56.10A)"),
  // Zéro est une réponse : l'effectif compte les salariés de l'entreprise
  // apprentis non compris (L. 1111-3), et une entreprise peut n'employer qu'un
  // apprenti (C37). Le vide n'en est pas une — `z.coerce` en ferait un zéro.
  effectif: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce
      .number({ message: "Indiquez l'effectif de l'entreprise" })
      .int("Effectif entier")
      .min(0, "L'effectif ne peut pas être négatif")
      // La borne de la COLONNE, pas celle du produit (ASVS V2.2.1,
      // 2026-10-13) : 10^12 passait le schéma, puis Postgres le refusait en
      // erreur 500. Les cinquante salariés de l'ADR-031 ne valent qu'à la
      // création (`entrepriseCreationSchema`) ; une entreprise existante qui
      // les dépasse reste modifiable.
      .max(EFFECTIF_COLONNE_MAX, "Effectif hors limites"),
  ),
  // Même borne que l'adresse d'un établissement et que celle du parcours.
  adresse: z
    .string()
    .trim()
    .min(1, "L'adresse est obligatoire")
    .max(300, "300 caractères maximum"),
});

export type EntrepriseInput = z.infer<typeof entrepriseSchema>;

/**
 * La porte de CRÉATION d'une entreprise : la borne s'y ajoute. Le schéma de
 * base sert aussi à MODIFIER une entreprise existante, et celle-là n'est jamais
 * refusée : comme le site (ADR-031 § 1 bis), une entreprise qui passe de
 * quarante-cinq à soixante salariés reste servie, et son dossier porte le
 * manque (`perimetre/couverture.ts`, axe `effectif`).
 */
export const entrepriseCreationSchema = entrepriseSchema.superRefine(
  (val, ctx) => {
    if (val.effectif > EFFECTIF_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["effectif"],
        message: MESSAGE_REFUS_EFFECTIF_ENTREPRISE,
      });
    }
  },
);
