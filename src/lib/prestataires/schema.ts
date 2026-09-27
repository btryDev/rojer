import { depuisCleJourCivil, joursCivilsEntre } from "@/lib/dates";
import { z } from "zod";
import { DomainePrestataire } from "@prisma/client";

/**
 * Schéma de validation d'un prestataire.
 *
 * Les champs de vigilance (URSSAF / RC Pro / Kbis) sont optionnels — un
 * prestataire peut être ajouté à l'annuaire en deux temps (création rapide
 * puis complétion des pièces quand on les reçoit).
 *
 * La matérialisation de l'obligation L8222-1 passe par `vigilance.ts`.
 */

const DATE_FMT = /^\d{4}-\d{2}-\d{2}$/;
const SIRET_FMT = /^\d{14}$/;
const TEL_FMT = /^[\d\s+.()-]{6,25}$/;

export const DOMAINES_PRESTATAIRE = [
  "electricite",
  "incendie",
  "ascenseur",
  "porte_automatique",
  "ventilation_vmc",
  "cuisson_hotte",
  "equipement_pression",
  "levage",
  "stockage_dangereux",
  "froid",
  "carnet_sanitaire",
  "bureau_controle",
  "entretien_general",
  "travaux_btp",
  "nettoyage",
  "organisme_formation",
  "service_sante_travail",
  "autre",
] as const satisfies readonly DomainePrestataire[];

export const LABEL_DOMAINE: Record<DomainePrestataire, string> = {
  electricite: "Électricité",
  incendie: "Sécurité incendie",
  ascenseur: "Ascenseurs",
  porte_automatique: "Portes & portails automatiques",
  ventilation_vmc: "Ventilation / VMC",
  cuisson_hotte: "Cuisson & hottes",
  equipement_pression: "Équipements sous pression",
  levage: "Levage",
  stockage_dangereux: "Stockage matières dangereuses",
  froid: "Froid & fluides frigorigènes",
  carnet_sanitaire: "Carnet sanitaire (eau)",
  bureau_controle: "Bureau de contrôle",
  entretien_general: "Entretien général",
  travaux_btp: "Travaux BTP",
  nettoyage: "Nettoyage",
  organisme_formation: "Organisme de formation",
  service_sante_travail: "Service de prévention et de santé au travail",
  autre: "Autre",
};

const optionalTrimmed = (max = 200) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(max).optional(),
  );

const optionalDate = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z
    .string()
    .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
    .optional()
    .transform((v) => (v ? depuisCleJourCivil(v) : undefined)),
);

/**
 * Les deux dates de l'attestation de vigilance (art. D. 8222-5), vérifiées
 * ensemble. Fonction pure, horloge injectée : les schémas l'appellent avec
 * l'heure du serveur, les tests avec la leur.
 *
 * - aucune des deux dans le futur : la remise est un fait accompli, et une
 *   attestation n'est pas émise demain ;
 * - l'émission ne suit pas la remise : on ne remet pas une pièce pas encore
 *   émise.
 *
 * Une émission de plus de six mois avant la remise n'est PAS refusée : c'est
 * un fait que l'écran doit montrer (« À redemander »), pas une saisie à
 * empêcher — la refuser cacherait précisément ce que D. 8222-5 fait vérifier.
 */
export function erreursDatesAttestation(
  remiseLe: Date | undefined,
  emiseLe: Date | undefined,
  now: Date,
): { champ: "attestationUrssafRemiseLe" | "attestationUrssafEmiseLe"; message: string }[] {
  const erreurs: ReturnType<typeof erreursDatesAttestation> = [];
  if (remiseLe && joursCivilsEntre(now, remiseLe) > 0) {
    erreurs.push({
      champ: "attestationUrssafRemiseLe",
      message: "La date de remise ne peut pas être dans le futur",
    });
  }
  if (emiseLe && joursCivilsEntre(now, emiseLe) > 0) {
    erreurs.push({
      champ: "attestationUrssafEmiseLe",
      message: "La date d'émission ne peut pas être dans le futur",
    });
  }
  if (remiseLe && emiseLe && joursCivilsEntre(remiseLe, emiseLe) > 0) {
    erreurs.push({
      champ: "attestationUrssafEmiseLe",
      message: "L'attestation ne peut pas être émise après sa remise",
    });
  }
  return erreurs;
}

const datesAttestation = {
  attestationUrssafRemiseLe: optionalDate,
  attestationUrssafEmiseLe: optionalDate,
};

function verifierDatesAttestation(
  v: { attestationUrssafRemiseLe?: Date; attestationUrssafEmiseLe?: Date },
  ctx: { addIssue: (issue: { code: "custom"; path: string[]; message: string }) => void },
) {
  for (const e of erreursDatesAttestation(
    v.attestationUrssafRemiseLe,
    v.attestationUrssafEmiseLe,
    new Date(),
  )) {
    ctx.addIssue({ code: "custom", path: [e.champ], message: e.message });
  }
}

/** La saisie, sur la fiche, d'une remise d'attestation. */
export const remiseAttestationSchema = z
  .object(datesAttestation)
  .superRefine(verifierDatesAttestation);

export const prestataireSchema = z.object({
  raisonSociale: z
    .string()
    .trim()
    .min(1, "Raison sociale requise")
    .max(200, "Raison sociale trop longue"),
  siret: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\s/g, "") || undefined : v),
    z
      .string()
      .regex(SIRET_FMT, "SIRET : 14 chiffres attendus")
      .optional(),
  ),
  estOrganismeAgree: z.coerce.boolean().optional().default(false),
  domaines: z
    .array(z.enum(DOMAINES_PRESTATAIRE))
    .default([])
    .transform((d) => Array.from(new Set(d))),

  contactNom: z
    .string()
    .trim()
    .min(1, "Nom du contact requis")
    .max(200),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email invalide")
    .max(200),
  contactTelephone: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z
      .string()
      .regex(TEL_FMT, "Téléphone invalide")
      .optional(),
  ),

  attestationUrssafValableJusquA: optionalDate,
  ...datesAttestation,
  assuranceRcProValableJusquA: optionalDate,
  kbisDateEmission: optionalDate,

  notesInternes: optionalTrimmed(1000),
}).superRefine(verifierDatesAttestation);

export type PrestataireInput = z.infer<typeof prestataireSchema>;
