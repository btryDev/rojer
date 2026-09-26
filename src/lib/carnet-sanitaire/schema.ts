import { depuisCleJourCivil } from "@/lib/dates";
import { z } from "zod";
import { TypeReseauEau } from "@prisma/client";

const DATE_FMT = /^\d{4}-\d{2}-\d{2}$/;

export const TYPES_RESEAU = [
  "ECS",
  "EFS",
  "ECS_BOUCLAGE",
] as const satisfies readonly TypeReseauEau[];

export const LABEL_RESEAU: Record<TypeReseauEau, string> = {
  ECS: "Eau chaude sanitaire (ECS)",
  EFS: "Eau froide sanitaire",
  ECS_BOUCLAGE: "ECS — bouclage",
};

/**
 * Valeurs PROPOSÉES à la création d'un point — modifiables, et qui ne sont pas
 * des seuils de l'arrêté du 1er février 2010 : ce texte ne porte AUCUNE
 * température (lu le 2026-09-20, `corpus/arrete-2010-02-01-legionelles.ts`).
 *
 * ~~ECS: 50 // au puisage (arrêté 01-02-2010)~~ · ~~ECS_BOUCLAGE: 55 // retour
 * de boucle~~ — deux attributions fausses. Les températures viennent de
 * l'article 36 § 2 de l'arrêté du 23 juin 1978 :
 *   - 50 °C AU MOINS « en tout point du système de distribution, à l'exception
 *     des tubes finaux » — donc le retour de boucle, et PAS le robinet, où le
 *     § 1 fixe au contraire 50 °C AU PLUS dans les pièces de toilette ;
 *   - 55 °C AU MOINS « à la sortie des équipements » de stockage de 400 litres
 *     et plus — pas au retour de boucle, où le module le plaçait.
 * Le bouclage passe donc de 55 à 50. Seuls les points créés ensuite sont
 * touchés : chaque point existant garde le seuil qu'il a enregistré.
 *
 * 20 °C pour l'eau froide ne vient d'aucun des deux textes : repère du produit.
 */
export const SEUIL_DEFAUT: Record<TypeReseauEau, number> = {
  ECS: 50,
  EFS: 20,
  ECS_BOUCLAGE: 50,
};


export const pointReleveSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(200),
  localisation: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(200).optional(),
  ),
  // ADR-019 : le bâtiment du point ; `localisation` reste la précision.
  batimentId: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().optional(),
  ),
  typeReseau: z.enum(TYPES_RESEAU),
  seuilMinCelsius: z.coerce.number().min(0).max(100).default(50),
});

export const releveTemperatureSchema = z.object({
  pointReleveId: z.string().min(1),
  dateReleve: z
    .string()
    .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
    .transform((v) => depuisCleJourCivil(v)),
  temperatureCelsius: z.coerce.number().min(0).max(100),
  operateur: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(200).optional(),
  ),
  commentaire: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(1000).optional(),
  ),
});

export const analyseLegionelleSchema = z.object({
  dateAnalyse: z
    .string()
    .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
    .transform((v) => depuisCleJourCivil(v)),
  laboratoire: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(200).optional(),
  ),
  valeurUfcParL: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).max(1_000_000).optional(),
  ),
  commentaire: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(2000).optional(),
  ),
});

export type PointReleveInput = z.infer<typeof pointReleveSchema>;
export type ReleveTemperatureInput = z.infer<typeof releveTemperatureSchema>;
export type AnalyseLegionelleInput = z.infer<typeof analyseLegionelleSchema>;

/**
 * Limite de qualité en Legionella pneumophila — arrêté du 1er février 2010,
 * ARTICLE 4 (« inférieurs à la limite de qualité fixée à 1 000 unités formant
 * colonie par litre au niveau de tous les points d'usage à risque »).
 * ~~« Seuil d'action légal », « annexe II »~~ : l'annexe 2 ne porte que des
 * fréquences, et le texte dit « limite de qualité » depuis le 1er janvier 2023.
 */
export const SEUIL_LEGIONELLE_UFC_PAR_L = 1000;

/**
 * Ce qu'une analyse dit, lu sur SA VALEUR — jamais sur la colonne `conforme`.
 *
 * LE DÉFAUT (relecture du 2026-09-26). Une analyse enregistrée SANS valeur
 * était écrite `conforme: true`, et le fichier 08 du ZIP de contrôle imprimait
 * « sous la limite de qualité (< 1 000 UFC/L) » pour un résultat que personne
 * n'avait saisi. Une valeur absente n'est ni sous la limite, ni au-dessus :
 * elle manque. Les lignes déjà en base portent `conforme: true` sans valeur ;
 * lire le résultat sur la valeur les rend justes sans les réécrire.
 */
export type ResultatAnalyse = "sans_valeur" | "sous_limite" | "limite_atteinte";

export function resultatAnalyse(valeurUfcParL: number | null | undefined): ResultatAnalyse {
  if (valeurUfcParL === null || valeurUfcParL === undefined) return "sans_valeur";
  return valeurUfcParL < SEUIL_LEGIONELLE_UFC_PAR_L ? "sous_limite" : "limite_atteinte";
}

/**
 * Vérifie si un relevé est conforme en fonction du seuil du point.
 * Pour ECS : température ≥ seuilMinCelsius (50 °C proposés par défaut).
 * Pour EFS : température ≤ seuilMinCelsius (traité comme plafond supérieur).
 */
export function estReleveConforme(
  temperatureCelsius: number,
  seuilMinCelsius: number,
  typeReseau: TypeReseauEau,
): boolean {
  if (typeReseau === "EFS") {
    return temperatureCelsius <= seuilMinCelsius;
  }
  return temperatureCelsius >= seuilMinCelsius;
}
