import { z } from "zod";
import {
  depuisCleJourCivil,
  depuisSaisieDateHeure,
  estJourCivilReel,
  estSaisieDateHeureReelle,
  formaterDateFr,
} from "@/lib/dates";
import {
  EN_CLAIR_ECRIT,
  RAISON_TRAVAUX_DANGEREUX,
  ligneHeuresRevisees,
  raisonDureeEstimee,
  raisonHeuresRevisees,
  type EtatEcrit,
} from "./annonces-plan";

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
 *   - Travaux sur la liste de l'arrêté du 19 mars 1993 : écrit obligatoire
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
  .refine(estSaisieDateHeureReelle, "Cette date ou cette heure n'existe pas")
  // Ancré sur Europe/Paris — cf. ADR-011 et `depuisSaisieDateHeure`.
  .transform((v) => depuisSaisieDateHeure(v));

const dateFromDate = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z
    .string()
    .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
    .refine(estJourCivilReel, "Cette date n'existe pas")
    .optional()
    .transform((v) => (v ? depuisCleJourCivil(v) : undefined)),
);

export const ligneSchema = z.object({
  risque: z.string().trim().min(3, "Décrire le risque").max(500),
  mesureEntrepriseUtilisatrice: optionalTrimmed(500),
  mesureEntrepriseExterieure: optionalTrimmed(500),
});

export type LigneInput = z.infer<typeof ligneSchema>;

/**
 * Le 1° de `R. 4512-8` : « La définition des phases d'activité dangereuses et
 * des moyens de prévention spécifiques **correspondants**. »
 *
 * Une paire, et non deux listes : c'est la correspondance que le texte demande
 * d'écrire, et un bloc de prose l'aurait perdue. `moyensPrevention` reste
 * facultatif pour la même raison que les mesures d'une `ligneSchema` — une
 * phase nommée sans son moyen se voit à l'écran, là où un champ obligatoire
 * aurait fait écrire n'importe quoi pour pouvoir enregistrer.
 */
export const phaseSchema = z.object({
  phase: z
    .string()
    .trim()
    .min(3, "Décrire la phase d'activité dangereuse, ou vider aussi ses moyens")
    .max(500),
  moyensPrevention: optionalTrimmed(500),
});

export type PhaseInput = z.infer<typeof phaseSchema>;

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

    // ── Contenu minimal du plan — `R. 4512-8` ──────────────────────────
    // Les cinq rubriques que « les mesures prévues par le plan de prévention
    // comportent AU MOINS ». Aucune n'est requise ici, et ce n'est pas un
    // oubli : le produit n'a aucune porte de validation sur les plans, et en
    // poser une au seul point de création aurait bloqué la saisie sans rien
    // exiger de la clôture ni des plans déjà en base. Le manque est rendu
    // VISIBLE — fiche et ZIP nomment la rubrique vide —, il n'est pas rendu
    // bloquant. Voir `rubriquesManquantes` plus bas, qui est la lecture
    // partagée par ces surfaces.
    phases: z.array(phaseSchema).optional().default([]),
    adaptationMateriels: optionalTrimmed(4000),
    instructionsTravailleurs: optionalTrimmed(4000),
    organisationSecours: optionalTrimmed(4000),
    participationCroisee: optionalTrimmed(4000),
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
  /**
   * Les trois réponses possibles à « l'écrit est-il obligatoire ? ».
   * `indetermine` : durée non renseignée ET travaux non déclarés dangereux.
   * Tout ce qui décide d'afficher `R. 4512-12` lit ce champ, jamais
   * `ecritObligatoire` — voir `citeR4512_12`.
   */
  ecrit: EtatEcrit;
  /** `ecrit === "obligatoire"`, et rien d'autre : l'indéterminé n'y entre pas. */
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
  /**
   * Le seuil atteint EN COURS de chantier — R. 4512-7, 1°, seconde phrase
   * (2026-10-12) : le nombre d'heures prévisible revu et noté sur la fiche
   * atteint 400. À part de `seuil400`, qui ne lit que l'estimation initiale,
   * pour la même règle : ce qui annote un fait se déduit de ce fait-là.
   */
  seuil400EnCours: boolean;
  raisons: string[];
  recommandation: string;
};

export function diagnostiquerPlan(params: {
  dureeHeuresEstimee: number | null;
  travauxDangereux: boolean;
  /** La dernière révision notée en cours de chantier, s'il y en a une. */
  heuresPrevisiblesRevisees?: number | null;
  heuresPrevisiblesReviseesLe?: Date | null;
}): ResultatDiagnostic {
  const revisees =
    params.heuresPrevisiblesRevisees != null && params.heuresPrevisiblesReviseesLe
      ? ligneHeuresRevisees(
          params.heuresPrevisiblesRevisees,
          formaterDateFr(params.heuresPrevisiblesReviseesLe),
        )
      : null;
  const heuresRevisees = revisees !== null ? params.heuresPrevisiblesRevisees : null;
  const seuil400EnCours = heuresRevisees != null && heuresRevisees >= 400;
  const raisons: string[] = [];
  // `>=` et non `>`. R. 4512-7 dit « un nombre total d'heures de travail
  // prévisible **égal au moins à** 400 heures », et ajoute « dès lors qu'il
  // apparaît, en cours d'exécution, que le nombre d'heures **doit atteindre**
  // 400 heures ». À 400 h pile, l'écrit est donc obligatoire ; le code
  // affichait « recommandé », c'est-à-dire l'inverse du texte.
  // Verbatim relevé sur Légifrance le 2026-08-27, version en vigueur au
  // 2008-05-01 (LEGIARTI000018529783).
  const dureeEstimee = params.dureeHeuresEstimee;
  const seuil400 = dureeEstimee !== null && dureeEstimee >= 400;
  // LES RAISONS DISENT LE FAIT SAISI, ET LUI SEUL (2026-10-28). Elles
  // citaient R. 4512-7 entre guillemets (depuis la revue du 2026-09-26, qui
  // avait remplacé deux paraphrases dont l'une affirmait un fait que le
  // dossier ne tient pas). Le verbatim se lit désormais sous le livre du
  // formulaire et sur la fiche (`SENS_R4512_7`) : le redire ici doublait le
  // pavé. Les phrases vivent dans `annonces-plan.ts`, sans guillemets ni
  // article — `annonces-plan.test.ts` le tient.
  if (dureeEstimee !== null && seuil400) {
    raisons.push(raisonDureeEstimee(dureeEstimee));
  }
  if (revisees !== null && seuil400EnCours) {
    raisons.push(raisonHeuresRevisees(revisees));
  }
  if (params.travauxDangereux) {
    raisons.push(RAISON_TRAVAUX_DANGEREUX);
  }
  // Un OU : l'estimation initiale, la révision en cours de chantier, la liste
  // dangereuse. Une révision à la baisse ne retire donc jamais ce que
  // l'estimation initiale a fait naître — `seuil400` ne la lit pas.
  const ecritObligatoire = seuil400 || seuil400EnCours || params.travauxDangereux;
  // Une révision notée est un nombre d'heures connu : Rojer n'est plus dans
  // l'indéterminé, même sans estimation initiale.
  const ecrit: EtatEcrit = ecritObligatoire
    ? "obligatoire"
    : params.dureeHeuresEstimee === null && revisees === null
      ? "indetermine"
      : "non_impose";
  // La règle en clair (`EN_CLAIR_ECRIT`) ; les articles se lisent sous le
  // livre du formulaire. Aucun « restent à faire » — le diagnostic ne sait
  // pas si l'inspection a eu lieu —, et aucun délai à R. 4512-12.
  return {
    ecrit,
    ecritObligatoire,
    seuil400,
    seuil400EnCours,
    raisons,
    recommandation:
      ecrit === "non_impose"
        ? `${revisees ?? `Durée saisie : ${params.dureeHeuresEstimee} heures`} ; travaux non déclarés dangereux. ${EN_CLAIR_ECRIT.non_impose}`
        : EN_CLAIR_ECRIT[ecrit],
  };
}
