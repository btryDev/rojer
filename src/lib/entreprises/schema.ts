import { z } from "zod";
import { EFFECTIF_MAX } from "@/lib/etablissements/schema";

/**
 * Le refus de la porte au-delà de la borne du produit, pour l'effectif de
 * l'ENTREPRISE (décision de la propriétaire du 2026-09-26, ADR-031 : « c'est la
 * limite de Rojer »). Même borne que le site (`EFFECTIF_MAX`), même ton ; il
 * dit « dans l'entreprise » parce que c'est ce nombre-là qui la franchit.
 */
export const MESSAGE_REFUS_EFFECTIF_ENTREPRISE = `Rojer prend en charge les structures jusqu'à ${EFFECTIF_MAX} salariés dans l'entreprise, tous établissements confondus.`;

export const entrepriseSchema = z.object({
  raisonSociale: z
    .string()
    .trim()
    .min(1, "La raison sociale est obligatoire")
    .max(200, "200 caractères maximum"),
  // ~~siret, codeNaf~~ [2026-10-26 : à l'établissement (`etablissementSchema`).]
  // ~~effectif~~ [2026-11-03 : calculé depuis les établissements
  // (`entreprises/effectif.ts`), plus saisi.]
  // Même borne que l'adresse d'un établissement et que celle du parcours.
  adresse: z
    .string()
    .trim()
    .min(1, "L'adresse est obligatoire")
    .max(300, "300 caractères maximum"),
});

export type EntrepriseInput = z.infer<typeof entrepriseSchema>;

// ~~`entrepriseCreationSchema` — la porte de création d'une entreprise~~
// [2026-10-26 : retirée avec `/entreprises/nouvelle`. Une entreprise naît avec
// son premier établissement, et la borne de l'ADR-031 se fait respecter au
// parcours (`onboardingSchema`, effectif de l'entreprise) et, pour une
// entreprise reprise, par `finaliserOnboarding`.]
