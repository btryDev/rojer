import { z } from "zod";

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
      .min(0, "L'effectif ne peut pas être négatif"),
  ),
  adresse: z.string().trim().min(1, "L'adresse est obligatoire"),
});

export type EntrepriseInput = z.infer<typeof entrepriseSchema>;
