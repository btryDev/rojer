import { z } from "zod";
import { IDS_MESURES_COURANTES } from "./referentiel";
import { depuisSaisieDateHeure } from "@/lib/dates";
import { NatureTravauxPointChaud } from "@prisma/client";

const DATETIME_FMT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

export const NATURES_TRAVAUX = [
  "soudage_arc",
  "soudage_gaz",
  "soudage_oxyacetylenique",
  "decoupe_plasma",
  "brasage",
  "meulage",
  "tronconnage",
  "chalumeau",
  "travaux_etancheite",
  "decapage_thermique",
  "autre",
] as const satisfies readonly NatureTravauxPointChaud[];

export const LABEL_NATURE: Record<NatureTravauxPointChaud, string> = {
  soudage_arc: "Soudage à l'arc",
  soudage_gaz: "Soudage au gaz",
  soudage_oxyacetylenique: "Soudage oxyacétylénique",
  decoupe_plasma: "Découpe plasma",
  brasage: "Brasage",
  meulage: "Meulage",
  tronconnage: "Tronçonnage",
  chalumeau: "Chalumeau",
  travaux_etancheite: "Travaux d'étanchéité",
  decapage_thermique: "Décapage thermique",
  autre: "Autre point chaud",
};

const optionalTrimmed = (max = 500) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(max).optional(),
  );

export const permisFeuSchema = z
  .object({
    // Prestataire — soit via FK (annuaire), soit saisie libre
    prestataireId: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v : undefined),
      z.string().optional(),
    ),
    prestataireRaison: z
      .string()
      .trim()
      .min(1, "Raison sociale requise")
      .max(200),
    prestataireContact: z
      .string()
      .trim()
      .min(1, "Contact requis")
      .max(200),
    prestataireEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("Email invalide")
      .max(200),

    // Donneur d'ordre
    donneurOrdreNom: z.string().trim().min(1, "Nom requis").max(200),
    donneurOrdreFonction: optionalTrimmed(120),

    // Travaux
    dateDebut: z
      .string()
      .regex(DATETIME_FMT, "Format attendu : AAAA-MM-JJTHH:MM")
      // Ancré sur Europe/Paris : `new Date(v)` sur une chaîne sans offset suit
      // le fuseau du serveur (ADR-011).
      .transform((v) => depuisSaisieDateHeure(v)),
    dateFin: z
      .string()
      .regex(DATETIME_FMT, "Format attendu : AAAA-MM-JJTHH:MM")
      // Ancré sur Europe/Paris : `new Date(v)` sur une chaîne sans offset suit
      // le fuseau du serveur (ADR-011).
      .transform((v) => depuisSaisieDateHeure(v)),
    lieu: z.string().trim().min(1, "Lieu requis").max(500),
    // ADR-019 : le bâtiment ; `lieu` reste la précision. Vide = non précisé.
    batimentId: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.string().optional(),
    ),
    naturesTravaux: z
      .array(z.enum(NATURES_TRAVAUX))
      .min(1, "Sélectionnez au moins un type de travaux")
      .transform((a) => Array.from(new Set(a))),
    descriptionTravaux: z
      .string()
      .trim()
      .min(10, "Décrivez précisément les travaux (min. 10 car.)")
      .max(4000),

    // Mesures
    // Une création n'accepte que la liste courante : un identifiant retiré ou
    // inconnu serait affiché comme une mesure qu'aucune liste ne propose plus
    // (contre-lecture du 2026-09-26).
    mesuresValidees: z
      .array(
        z.string().refine((id) => IDS_MESURES_COURANTES.has(id), {
          message: "Mesure inconnue ou retirée de la liste",
        }),
      )
      .default([])
      .transform((a) => Array.from(new Set(a))),
    mesuresNotes: optionalTrimmed(2000),

    dureeSurveillanceMinutes: z.coerce.number().int().min(30).max(720).default(120),
  })
  .refine((val) => val.dateFin > val.dateDebut, {
    message: "La date de fin doit être après la date de début.",
    path: ["dateFin"],
  });

export type PermisFeuInput = z.infer<typeof permisFeuSchema>;
