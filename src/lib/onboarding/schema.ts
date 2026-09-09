import { z } from "zod";
import {
  CATEGORIES_ERP,
  EFFECTIF_MAX,
  TYPE_ERP,
  TYPES_ERP_QUESTION_LOCAUX_SOMMEIL,
} from "@/lib/etablissements/schema";

// Réexportée : la validation client du wizard la lit ici, au plus près du
// parcours qu'elle borne.
export { EFFECTIF_MAX };
import { evaluerScopeSecteur } from "./scope";

/**
 * Schéma fusionné du parcours d'onboarding — couvre Entreprise + premier
 * Etablissement en une seule validation.
 *
 * Les champs sont mutualisés : adresse / codeNaf / effectif sont saisis
 * UNE fois et copiés dans les deux entités côté server action.
 *
 * Les règles de cohérence flags ↔ précisions (ADR-004) sont recyclées
 * ici depuis `etablissements/schema.ts` — pas de duplication.
 */


const siretRegex = /^\d{14}$/;
const nafRegex = /^\d{2}\.?\d{2}[A-Z]?$/;
// Adresse recomposée côté client : "12 rue des Halles, 44000 Nantes".
// On revalide ici la forme finale pour détecter un client-side bypass.
const adresseRegex = /^.{3,},\s*\d{5}\s.{2,}$/;

export const onboardingSchema = z
  .object({
    // ─── Étape 1 — Identité juridique + lieu ──────────────
    raisonSociale: z
      .string()
      .trim()
      .min(1, "La raison sociale est obligatoire")
      .max(200, "200 caractères maximum"),
    siret: z.preprocess(
      (v) =>
        typeof v === "string" ? v.trim() || undefined : v,
      z
        .string()
        .regex(siretRegex, "SIRET = 14 chiffres")
        .optional(),
    ),
    adresse: z
      .string()
      .trim()
      .regex(
        adresseRegex,
        "Adresse attendue au format « Rue, 75000 Ville »",
      )
      .max(300),
    codeNaf: z
      .string()
      .trim()
      .toUpperCase()
      .regex(nafRegex, "Code NAF invalide (ex. 56.10A)"),
    effectifSurSite: z.coerce
      .number()
      .int("Effectif entier")
      .min(1, "Au moins 1 salarié")
      .max(
        EFFECTIF_MAX,
        `Rojer prend en charge les structures jusqu'à ${EFFECTIF_MAX} salariés.`,
      ),

    // ─── Étape 3 — Typologie (ADR-004, flags cumulables) ────
    estEtablissementTravail: z.coerce.boolean().default(true),
    estERP: z.coerce.boolean().default(false),
    estIGH: z.coerce.boolean().default(false),
    estHabitation: z.coerce.boolean().default(false),
    typeErp: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.enum(TYPE_ERP).optional(),
    ),
    categorieErp: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.enum(CATEGORIES_ERP).optional(),
    ),
    // ─── Locaux à sommeil pour le public (2026-09-09) ───────
    //
    // Posée au parcours depuis ce jour, et seulement aux quatre types de
    // `TYPES_ERP_QUESTION_LOCAUX_SOMMEIL`. Trois réponses comme sur la fiche :
    // « je ne sais pas encore » (vide), « oui », « non ».
    //
    // `undefined` EST UNE RÉPONSE VALIDE ET C'EST LE CŒUR DU CHAMP. Il traverse
    // jusqu'à la server action, qui n'écrit alors rien : la colonne reste
    // `null`, c'est-à-dire « pas encore répondu ». La question ne bloque donc
    // aucune création — c'est ce que le recadrage du 2026-09-01 exigeait en
    // sortant deux questions de technicien du parcours — et rien n'est inscrit
    // au dossier que personne n'a déclaré.
    comporteLocauxSommeilPublic: z.preprocess(
      (v) =>
        v === "oui"
          ? true
          : v === "non"
            ? false
            : v === true || v === false
              ? v
              : undefined,
      z.boolean().optional(),
    ),
    // `classeIgh` et `familleHabitation` ont quitté ce schéma le 2026-09-03
    // avec les deux questions du parcours qui les posaient. Voir le bloc en
    // tête de `@/lib/etablissements/schema`.
  })
  .superRefine((val, ctx) => {
    // Le code NAF ne conditionne plus la création (lib/onboarding/scope.ts).
    // Seul son FORMAT est exigé : un code illisible n'est rattachable à rien,
    // ni référentiel sectoriel ni écran, et c'est une erreur de saisie.
    //
    // L'absence de référentiel pour un code bien formé n'est pas une erreur
    // de formulaire : c'est un fait du produit, dit à l'écran puis porté en
    // permanence par `perimetre/couverture.ts`. Le refuser ici bloquait
    // l'accès au référentiel de conformité — qui ne lit jamais le NAF — pour
    // une cotation de risques que l'utilisateur n'avait pas demandée.
    if (evaluerScopeSecteur(val.codeNaf).status === "format_invalide") {
      ctx.addIssue({
        code: "custom",
        path: ["codeNaf"],
        message: "Le code NAF doit ressembler à 56.10A.",
      });
    }

    // Mêmes invariants que etablissementSchema (ADR-004).
    if (val.estERP) {
      if (!val.typeErp) {
        ctx.addIssue({
          code: "custom",
          path: ["typeErp"],
          message: "Type ERP requis si l'établissement accueille du public",
        });
      }
      if (!val.categorieErp) {
        ctx.addIssue({
          code: "custom",
          path: ["categorieErp"],
          message: "Catégorie ERP requise (1 à 5)",
        });
      }
    } else {
      if (val.typeErp) {
        ctx.addIssue({
          code: "custom",
          path: ["typeErp"],
          message: "Ne doit être posé que si l'établissement est ERP",
        });
      }
      if (val.categorieErp) {
        ctx.addIssue({
          code: "custom",
          path: ["categorieErp"],
          message: "Ne doit être posée que si l'établissement est ERP",
        });
      }
    }

    // La réponse aux locaux à sommeil n'est acceptée QUE des quatre types à qui
    // le parcours pose la question. Même forme que les deux gardes ci-dessus,
    // et même raison : un champ qui n'est pas à l'écran ne doit pas pouvoir
    // être posté depuis un client trafiqué. Ce qui serait écrit ici est un fait
    // que personne n'a été invité à déclarer.
    //
    // Ce refus n'enferme personne : la question reste posée sur la fiche
    // établissement à TOUT ERP, et un exploitant de type N qui comporte des
    // chambres peut y répondre. Sa réponse ne déclenche cependant aucune des
    // quatre obligations, la borne de type et le critère de sommeil se lisant
    // en ET — réserve nommée dans `NOTE_BORNE_TYPES_SOMMEIL`
    // (`referentiels/conformite/incendie.ts`), non corrigée à ce jour.
    if (
      val.comporteLocauxSommeilPublic !== undefined &&
      !(
        val.estERP &&
        val.typeErp !== undefined &&
        (TYPES_ERP_QUESTION_LOCAUX_SOMMEIL as readonly string[]).includes(
          val.typeErp,
        )
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["comporteLocauxSommeilPublic"],
        message:
          "La question des locaux à sommeil n'est posée qu'aux types J, O, U et R.",
      });
    }

    // Le seul cumul refusé (ADR-025 § 1) : un ERP en IGH relève du règlement
    // de sécurité des IGH, jamais dépouillé. L'IGH seul reste servi — un
    // employeur locataire d'une tour de bureaux relève du Code du travail, que
    // le produit sert entièrement, et les obligations du règlement IGH pèsent
    // sur l'exploitant de l'immeuble, pas sur lui.
    if (val.estERP && val.estIGH) {
      ctx.addIssue({
        code: "custom",
        path: ["estIGH"],
        message:
          "Un établissement recevant du public situé dans un immeuble de grande hauteur relève du règlement de sécurité des IGH, que Rojer ne couvre pas.",
      });
    }

    // Quatre règles vivaient ici et sont tombées le 2026-09-03 avec les deux
    // questions qu'elles bornaient : classe IGH exigée puis interdite hors
    // IGH, famille d'habitation exigée puis interdite hors habitation. Le
    // parcours cesse de réclamer deux précisions dont aucune obligation ne
    // dépend ; les deux régimes se déclarent par leur seul booléen.

    const aucunRegime =
      !val.estEtablissementTravail &&
      !val.estERP &&
      !val.estIGH &&
      !val.estHabitation;
    if (aucunRegime) {
      ctx.addIssue({
        code: "custom",
        path: ["estEtablissementTravail"],
        message:
          "Cochez au moins un régime : travail, ERP, IGH ou habitation.",
      });
    }
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/**
 * Valeurs par défaut d'un wizard vide. Utilisé comme état initial
 * côté client (WizardShell).
 */
export const onboardingValeursInitiales = {
  raisonSociale: "",
  siret: "",
  adresse: "",
  codeNaf: "",
  effectifSurSite: "" as string | number,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: "" as string | undefined,
  categorieErp: "" as string | undefined,
  comporteLocauxSommeilPublic: "" as string,
};
