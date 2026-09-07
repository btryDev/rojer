import { z } from "zod";
import { depuisCleJourCivil, depuisSaisieDateHeure } from "@/lib/dates";

/**
 * Plan de prévention — art. R. 4512-6 à R. 4512-12 du code du travail.
 *
 * Ces articles descendent du décret n° 92-158 du 20 février 1992, qui a créé
 * les art. R. 237-1 à R. 237-28 du code du travail. Ce sont **ces articles-là**
 * que le décret n° 2008-244 du 7 mars 2008 a abrogés au 1er mai 2008, en les
 * recodifiant en R. 4511-* / R. 4512-*.
 *
 * La fiche du décret 92-158 reste affichée « en vigueur », et ce n'est pas une
 * anomalie : c'est un texte modificateur, sans contenu normatif propre.
 * L'abrogation se lit sur les articles du code — « Abrogé par Décret n°2008-244
 * du 7 mars 2008 - art. 9 (V) » sur R. 237-1 —, jamais sur le décret lui-même.
 *
 * La filiation se dit ici, dans un commentaire ; elle ne se cite plus à
 * l'écran ni dans le ZIP remis à un tiers, où « décret 92-158 » passait pour
 * une source en vigueur.
 *
 * DEUX ARTICLES, DEUX QUESTIONS, ET C'EST LE POINT QU'ON RATE. `R. 4512-6`
 * fait NAÎTRE le plan : au vu de l'inspection commune, les chefs d'entreprise
 * analysent en commun les risques d'interférence et, « lorsque ces risques
 * existent », arrêtent d'un commun accord un plan de prévention avant le début
 * des travaux — quelle que soit la durée, sans seuil d'aucune sorte.
 * `R. 4512-7` ne crée aucune obligation nouvelle : il dit dans quels deux cas
 * ce plan passe à l'ÉCRIT.
 *
 *   - Durée totale ≥ 400 h sur 12 mois : écrit obligatoire
 *   - Travaux sur liste dangereuse (arrêté 19-03-1993) : écrit obligatoire
 *     indépendamment de la durée
 *
 * Le diagnostic ne répond donc qu'à la seconde question. Sous le seuil,
 * l'inspection commune préalable (`R. 4512-2`) et l'accord sur les mesures
 * (`R. 4512-6`) restent dus : c'est la FORME qui n'est pas imposée, pas le
 * plan. Les surfaces qui disaient « le plan » là où le texte dit « le plan
 * écrit » laissaient entendre l'inverse, et `recommandation` disait que
 * l'écrit protège « en cas de litige » — un argument de prudence, là où le
 * texte porte une obligation.
 *
 * Verbatim des trois articles relevé le 2026-09-02 :
 * `referentiels/corpus/code-travail-plan-prevention.ts`.
 */

const DATETIME_FMT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const DATE_FMT = /^\d{4}-\d{2}-\d{2}$/;
const SIRET_FMT = /^\d{14}$/;

const optionalTrimmed = (max = 2000) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(max).optional(),
  );

const dateFromDatetime = z
  .string()
  .regex(DATETIME_FMT, "Format attendu : AAAA-MM-JJTHH:MM")
  // Ancré sur Europe/Paris — cf. ADR-011 et `depuisSaisieDateHeure`.
  .transform((v) => depuisSaisieDateHeure(v));

const dateFromDate = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z
    .string()
    .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
    .optional()
    .transform((v) => (v ? depuisCleJourCivil(v) : undefined)),
);

export const ligneSchema = z.object({
  risque: z.string().trim().min(3, "Décrire le risque").max(500),
  mesureEntrepriseUtilisatrice: optionalTrimmed(500),
  mesureEntrepriseExterieure: optionalTrimmed(500),
});

export type LigneInput = z.infer<typeof ligneSchema>;

export const planPreventionSchema = z
  .object({
    prestataireId: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v : undefined),
      z.string().optional(),
    ),
    entrepriseExterieureRaison: z
      .string()
      .trim()
      .min(1, "Raison sociale requise")
      .max(200),
    entrepriseExterieureSiret: z.preprocess(
      (v) => (typeof v === "string" ? v.replace(/\s/g, "") || undefined : v),
      z.string().regex(SIRET_FMT, "SIRET : 14 chiffres attendus").optional(),
    ),
    efChefNom: z.string().trim().min(1).max(200),
    efChefEmail: z.string().trim().toLowerCase().email().max(200),
    efEffectifIntervenant: z.coerce.number().int().min(1).max(9999),

    euChefNom: z.string().trim().min(1).max(200),
    euChefFonction: optionalTrimmed(120),

    dateDebut: dateFromDatetime,
    dateFin: dateFromDatetime,
    dureeHeuresEstimee: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce.number().int().min(1).max(99999).optional(),
    ),
    lieux: z.string().trim().min(1).max(1000),
    // ADR-019 : rattachement principal ; `lieux` garde le détail multi-lieux.
    batimentId: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.string().optional(),
    ),
    naturesTravaux: z.string().trim().min(10).max(4000),
    travauxDangereux: z.coerce.boolean().optional().default(false),

    inspectionDate: dateFromDate,
    inspectionParticipants: optionalTrimmed(2000),

    lignes: z
      .array(ligneSchema)
      .min(1, "Ajoutez au moins un risque identifié"),
  })
  .refine((v) => v.dateFin > v.dateDebut, {
    message: "La date de fin doit être après la date de début",
    path: ["dateFin"],
  });

export type PlanPreventionInput = z.infer<typeof planPreventionSchema>;

/**
 * Diagnostic pédagogique — détermine si le plan écrit est exigé et produit
 * un message humain à afficher dans l'UI.
 */
export type ResultatDiagnostic = {
  ecritObligatoire: boolean;
  /**
   * Le seuil de `R. 4512-7` est-il atteint — et lui seul.
   *
   * Exposé à part parce qu'`ecritObligatoire` est un **OU** : il vaut aussi
   * pour les travaux de la liste dangereuse, qui n'ont pas de durée. Un écran
   * qui lisait `ecritObligatoire` pour annoter la DURÉE écrivait donc « seuil
   * des 400 h franchi » sous « 22 h » — constaté à l'écran le 2026-09-07 sur
   * la fiche PP-001. Le fondement affiché n'était pas celui qui s'appliquait,
   * sur un document qu'un inspecteur peut demander.
   *
   * La règle qui en sort : **ce qui annote un fait se déduit de ce fait-là,
   * jamais d'un agrégat qui le contient.**
   */
  seuil400: boolean;
  raisons: string[];
  recommandation: string;
};

export function diagnostiquerPlan(params: {
  dureeHeuresEstimee: number | null;
  travauxDangereux: boolean;
}): ResultatDiagnostic {
  const raisons: string[] = [];
  // `>=` et non `>`. R. 4512-7 dit « un nombre total d'heures de travail
  // prévisible **égal au moins à** 400 heures », et ajoute « dès lors qu'il
  // apparaît, en cours d'exécution, que le nombre d'heures **doit atteindre**
  // 400 heures ». À 400 h pile, l'écrit est donc obligatoire ; le code
  // affichait « recommandé », c'est-à-dire l'inverse du texte.
  // Verbatim relevé sur Légifrance le 2026-08-27, version en vigueur au
  // 2008-05-01 (LEGIARTI000018529783).
  const seuil400 =
    params.dureeHeuresEstimee !== null && params.dureeHeuresEstimee >= 400;
  if (seuil400) {
    raisons.push(
      `Les travaux atteignent 400 h sur 12 mois (seuil art. R4512-7)`,
    );
  }
  if (params.travauxDangereux) {
    raisons.push(
      `Les travaux figurent sur la liste dangereuse (arrêté 19-03-1993)`,
    );
  }
  const ecritObligatoire = seuil400 || params.travauxDangereux;
  return {
    ecritObligatoire,
    seuil400,
    raisons,
    recommandation: ecritObligatoire
      ? "Un plan de prévention ÉCRIT est obligatoire avant démarrage des travaux."
      : "Le plan reste dû : il naît de l'analyse conjointe dès qu'un risque d'interférence existe, quelle que soit la durée (art. R. 4512-6). Ce sont les 400 heures qui commandent l'écrit, et elles ne sont pas atteintes ici. L'inspection commune préalable et l'accord sur les mesures, eux, restent à faire avant le début des travaux.",
  };
}
