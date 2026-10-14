import { cleJourCivil, depuisCleJourCivil, estJourCivilReel } from "@/lib/dates";
import { z } from "zod";
import type { TypePointReleve, TypeReseauEau } from "@prisma/client";

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
 * ~~`SEUIL_DEFAUT` : un seuil par TYPE DE RÉSEAU — `{ ECS: 50, EFS: 20,
 * ECS_BOUCLAGE: 50 }` —, lu comme un minimum en eau chaude et comme un maximum
 * en eau froide.~~ [2026-10-14, `lot/carnet-seuils-1014`, chantier § 5 :
 * retiré. Le réseau ne dit pas OÙ est le point, et c'est l'endroit qui décide
 * du seuil — un robinet de toilette à 60 °C se lisait « dans la plage ».]
 *
 * Son historique, gardé parce qu'il dit d'où viennent les valeurs :
 * ~~ECS: 50 // au puisage (arrêté 01-02-2010)~~ · ~~ECS_BOUCLAGE: 55 // retour
 * de boucle~~ — deux attributions fausses (2026-09-20). L'arrêté du 1er février
 * 2010 ne porte AUCUNE température (`corpus/arrete-2010-02-01-legionelles.ts`) ;
 * elles viennent de l'article 36 de l'arrêté du 23 juin 1978, dont l'article
 * 1er (lu le 2026-10-14) étend le titre III aux bâtiments d'habitation, de
 * bureaux et recevant du public.
 *
 * LE TYPE DE POINT (décision de la propriétaire du 2026-10-14). L'utilisateur
 * dit où est le point ; le type préremplit les seuils, qui restent modifiables,
 * et donne le réseau. Les valeurs, toutes PROPOSÉES :
 *   - sortie de production / stockage de 400 L et plus : 55 °C AU MOINS
 *     (art. 36 § 2 : « à la sortie des équipements » de stockage) ;
 *   - retour de boucle / réseau : 50 °C AU MOINS (art. 36 § 2 : « en tout
 *     point du système de distribution », quand plus de 3 litres séparent la
 *     mise en distribution du point le plus éloigné) ;
 *   - point de puisage de toilette (douche, lavabo) : 50 °C AU PLUS (§ 1), et
 *     PAS de minimum — le § 2 en exempte « les tubes finaux d'alimentation des
 *     points de puisage » ;
 *   - autre point de puisage : 60 °C AU PLUS (§ 1), pas de minimum non plus ;
 *   - eau froide : 20 °C AU PLUS — repère de Rojer, qu'aucun des deux textes
 *     ne fixe.
 * Les points créés avant le 2026-10-14 n'ont pas de type (`null`) : il ne se
 * déduit de rien de stocké, et ne se devine pas — sauf l'eau froide, que la
 * migration `20261014120000` a typée parce que c'est le seul type de son réseau.
 */
export const TYPES_POINT = [
  "SORTIE_STOCKAGE",
  "RETOUR_BOUCLE",
  "PUISAGE_TOILETTE",
  "PUISAGE_AUTRE",
  "EAU_FROIDE",
] as const satisfies readonly TypePointReleve[];

export const LABEL_TYPE_POINT: Record<TypePointReleve, string> = {
  SORTIE_STOCKAGE: "Sortie de production / stockage de 400 L ou plus",
  RETOUR_BOUCLE: "Retour de boucle / réseau de distribution",
  PUISAGE_TOILETTE: "Point de puisage de toilette (douche, lavabo)",
  PUISAGE_AUTRE: "Autre point de puisage",
  EAU_FROIDE: "Eau froide",
};

/** Les deux bornes d'une plage ; `null` : pas de borne de ce côté. */
export type SeuilsPoint = {
  seuilMinCelsius: number | null;
  seuilMaxCelsius: number | null;
};

export const SEUILS_TYPE_POINT: Record<TypePointReleve, SeuilsPoint> = {
  SORTIE_STOCKAGE: { seuilMinCelsius: 55, seuilMaxCelsius: null },
  RETOUR_BOUCLE: { seuilMinCelsius: 50, seuilMaxCelsius: null },
  PUISAGE_TOILETTE: { seuilMinCelsius: null, seuilMaxCelsius: 50 },
  PUISAGE_AUTRE: { seuilMinCelsius: null, seuilMaxCelsius: 60 },
  EAU_FROIDE: { seuilMinCelsius: null, seuilMaxCelsius: 20 },
};

/** Le réseau que le type de point donne : il n'est plus choisi à part. */
export const RESEAU_DU_TYPE_POINT: Record<TypePointReleve, TypeReseauEau> = {
  SORTIE_STOCKAGE: "ECS",
  RETOUR_BOUCLE: "ECS_BOUCLAGE",
  PUISAGE_TOILETTE: "ECS",
  PUISAGE_AUTRE: "ECS",
  EAU_FROIDE: "EFS",
};

/** Un seuil saisi : vide = pas de borne de ce côté. */
const seuilFacultatif = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.number().min(0).max(100).nullable(),
);


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
  /**
   * Requis à la création (`creerPointReleve`). Absent à la correction d'un
   * point créé avant le type : le point garde alors son `typeReseau`, que le
   * formulaire renvoie tel quel.
   */
  typePoint: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.enum(TYPES_POINT).optional(),
  ),
  typeReseau: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.enum(TYPES_RESEAU).optional(),
  ),
  seuilMinCelsius: seuilFacultatif,
  seuilMaxCelsius: seuilFacultatif,
})
  // Le type donne le réseau ; sans type, le réseau reçu est gardé.
  .transform(({ typeReseau, ...p }) => ({
    ...p,
    typeReseau: p.typePoint ? RESEAU_DU_TYPE_POINT[p.typePoint] : typeReseau,
  }))
  .superRefine((p, ctx) => {
    if (!p.typeReseau) {
      ctx.addIssue({ code: "custom", path: ["typePoint"], message: "Type de point requis" });
    }
    if (p.seuilMinCelsius === null && p.seuilMaxCelsius === null) {
      ctx.addIssue({
        code: "custom",
        path: ["seuilMinCelsius"],
        message: "Indiquez au moins un seuil : un minimum, un maximum, ou les deux.",
      });
    }
    if (
      p.seuilMinCelsius !== null &&
      p.seuilMaxCelsius !== null &&
      p.seuilMinCelsius > p.seuilMaxCelsius
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["seuilMaxCelsius"],
        message: "Le maximum ne peut pas être inférieur au minimum.",
      });
    }
  });

/**
 * Une date de relevé ou d'analyse : un fait accompli, donc jamais dans le
 * futur (2026-10-12, audit des modules). « 2062 » au lieu de « 2026 » passait,
 * et repoussait d'autant l'analyse suivante au calendrier et la fraîcheur du
 * carnet au tableau de bord. Même borne, en jour civil de Paris (ADR-011), que
 * la date d'un rapport (`rapports/schema.ts`) ou d'un acte
 * (`prescriptions/schema.ts`).
 */
const dateFaitAccompli = (message: string) =>
  z
    .string()
    .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
    .refine(estJourCivilReel, "Cette date n'existe pas")
    .transform((v) => depuisCleJourCivil(v))
    .refine((d) => !Number.isNaN(d.getTime()), "Date invalide")
    .refine((d) => cleJourCivil(d) <= cleJourCivil(new Date()), message);

export const releveTemperatureSchema = z.object({
  pointReleveId: z.string().min(1),
  dateReleve: dateFaitAccompli(
    "Un relevé ne peut pas être daté dans le futur : c'est le jour de la mesure.",
  ),
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
  dateAnalyse: dateFaitAccompli(
    "Une analyse ne peut pas être datée dans le futur : c'est le jour du prélèvement.",
  ),
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
 * Un relevé tombe-t-il dans la plage du point ? Au-dessus du minimum quand il
 * y en a un, au-dessous du maximum quand il y en a un — bornes incluses. La
 * SEULE lecture des seuils : la saisie, la correction, le recalcul au
 * changement de seuils (`actions.ts`) et l'aperçu du formulaire de relevé la
 * lisent ; la carte, le graphique et le ZIP lisent la colonne qu'elle écrit.
 *
 * ~~`(temperatureCelsius, seuilMinCelsius, typeReseau)` : en ECS
 * `temperature >= seuil`, en EFS `temperature <= seuil` (le même champ lu
 * comme un plafond).~~ [2026-10-14, chantier § 5 : un seul seuil ne disait pas
 * le maximum d'un robinet de toilette, et toute eau chaude au-dessus du
 * minimum passait. Le réseau n'est plus lu ; le seuil de l'eau froide a été
 * recopié en maximum par la migration `20261014120000`.]
 *
 * Le champ s'appelle `conforme` en base ; l'écran dit « dans la plage » —
 * l'outil ne prononce pas la conformité d'une installation (règle 8).
 */
export function estReleveConforme(temperatureCelsius: number, seuils: SeuilsPoint): boolean {
  if (seuils.seuilMinCelsius !== null && temperatureCelsius < seuils.seuilMinCelsius) {
    return false;
  }
  if (seuils.seuilMaxCelsius !== null && temperatureCelsius > seuils.seuilMaxCelsius) {
    return false;
  }
  return true;
}

/**
 * La plage d'un point, en mots : « min 50 °C », « max 60 °C »,
 * « min 50 °C · max 60 °C ». Un seul libellé pour la fiche, le formulaire de
 * relevé et l'export de contrôle.
 */
export function libelleSeuils(
  seuils: SeuilsPoint,
  formater: (celsius: number) => string,
): string {
  const parties: string[] = [];
  if (seuils.seuilMinCelsius !== null) parties.push(`min ${formater(seuils.seuilMinCelsius)}`);
  if (seuils.seuilMaxCelsius !== null) parties.push(`max ${formater(seuils.seuilMaxCelsius)}`);
  return parties.join(" · ");
}
