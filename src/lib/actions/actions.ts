"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { estJourCivilReel } from "@/lib/dates";
import { requireMesure, requireRisque } from "@/lib/auth/scope";
import { tousRisquesConnus } from "@/lib/referentiels";
import { statutUIVersAction } from "./mapping";
import { assertOrigineActionValide } from "./origine";

/**
 * Server actions pour l'entité `Action` — unifiée DUERP + vérifications
 * (cf. ADR-002). Ce module remplace l'ancien `lib/mesures/actions.ts`.
 * Les libellés UI « mesure » sont préservés dans le wizard DUERP : une
 * `Action` dont `risqueId` est non-null est sémantiquement une mesure de
 * prévention au sens L. 4121-2.
 *
 * Cloisonnement : `risqueId` et `mesureId` arrivent du client. Chaque action
 * commence par `requireRisque` / `requireMesure`, qui remontent jusqu'à
 * `Entreprise.userId` et répondent 404 quand l'objet est celui d'un autre
 * client — la RLS PostgreSQL n'étant pas effective, c'est le seul rempart.
 */

const TYPES_ACTION = [
  "suppression",
  "reduction_source",
  "protection_collective",
  "protection_individuelle",
  "formation",
  "organisationnelle",
] as const;

// Alias DUERP : le wizard continue d'exposer `statut: existante | prevue`.
// La conversion se fait ici pour préserver la compatibilité avec les
// composants existants tant que l'UI n'est pas refondue (étape 8 du plan).
const STATUTS_DUERP = ["existante", "prevue"] as const;

export type MesureActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success" };

// Invalidation des pages du wizard qui affichent les mesures d'un risque.
// Les identifiants sont passés par l'appelant, qui les tient déjà de
// `requireRisque` : pas de relecture non scopée juste pour construire un
// chemin de cache.
function revalidateMesure(
  duerpId: string,
  uniteId: string,
  risqueId: string,
): void {
  revalidatePath(`/duerp/${duerpId}/risques/${uniteId}/${risqueId}/mesures`);
  revalidatePath(`/duerp/${duerpId}/risques/${uniteId}`);
}

export async function toggleMesureReferentiel(
  risqueId: string,
  referentielMesureId: string,
): Promise<void> {
  const { risque, duerpId, uniteId, etablissementId } =
    await requireRisque(risqueId);

  const existant = await prisma.action.findUnique({
    where: {
      risqueId_referentielMesureId: { risqueId, referentielMesureId },
    },
  });

  if (existant) {
    await prisma.action.delete({ where: { id: existant.id } });
  } else {
    if (!risque.referentielId) {
      throw new Error("Risque personnalisé : pas de mesure référentielle");
    }
    const ref = tousRisquesConnus().get(risque.referentielId);
    const mesureRef = ref?.mesuresRecommandees.find(
      (m) => m.id === referentielMesureId,
    );
    if (!mesureRef) throw new Error("Mesure référentielle inconnue");

    // XOR d'origine (ADR-002) : une mesure du wizard se rattache au risque,
    // jamais à une vérification.
    assertOrigineActionValide({ risqueId, verificationId: null });
    await prisma.action.create({
      data: {
        etablissementId,
        risqueId,
        referentielMesureId,
        libelle: mesureRef.libelle,
        type: mesureRef.type,
        statut: "levee", // "existante" côté UI = mesure déjà en place
        leveeLe: new Date(),
      },
    });
  }

  revalidateMesure(duerpId, uniteId, risqueId);
}

const mesureCustomSchema = z.object({
  libelle: z.string().trim().min(1, "Libellé requis").max(300),
  type: z.enum(TYPES_ACTION),
  statut: z.enum(STATUTS_DUERP),
  // Un jour réel avant `new Date(v)` (ASVS V2.2.1, 2026-10-13) : « n'importe
  // quoi » faisait une date invalide refusée en 500 par Prisma, et
  // « 2026-04-31 » devenait le 1er mai.
  echeance: z
    .string()
    .trim()
    .refine(estJourCivilReel, "Cette date n'existe pas")
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => (v ? new Date(v) : undefined)),
  responsable: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export async function ajouterMesureCustom(
  risqueId: string,
  _prev: MesureActionState,
  formData: FormData,
): Promise<MesureActionState> {
  const { duerpId, uniteId, etablissementId } = await requireRisque(risqueId);

  const parsed = mesureCustomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const statutAction = statutUIVersAction(
    parsed.data.statut,
    parsed.data.echeance ?? null,
  );

  assertOrigineActionValide({ risqueId, verificationId: null });
  await prisma.action.create({
    data: {
      etablissementId,
      risqueId,
      libelle: parsed.data.libelle,
      type: parsed.data.type,
      statut: statutAction,
      echeance: parsed.data.echeance,
      responsable: parsed.data.responsable,
      leveeLe: statutAction === "levee" ? new Date() : null,
    },
  });

  revalidateMesure(duerpId, uniteId, risqueId);
  return { status: "success" };
}

const patchSchema = z.object({
  statut: z.enum(STATUTS_DUERP).optional(),
  type: z.enum(TYPES_ACTION).optional(),
  echeance: z
    .string()
    .refine(estJourCivilReel, "Cette date n'existe pas")
    .optional()
    .or(z.literal("").transform(() => null))
    .transform((v) =>
      v === undefined ? undefined : v === null ? null : new Date(v),
    ),
  responsable: z.string().trim().max(200).optional().nullable(),
});

export async function modifierMesure(
  mesureId: string,
  patch: z.input<typeof patchSchema>,
): Promise<void> {
  const { action: actuelle } = await requireMesure(mesureId);

  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) throw new Error("Patch invalide");

  const { statut: statutDuerp, ...rest } = parsed.data;
  const data: Parameters<typeof prisma.action.update>[0]["data"] = { ...rest };
  if (statutDuerp !== undefined) {
    const echeanceEff =
      rest.echeance !== undefined ? rest.echeance : actuelle.echeance;
    const nouveau = statutUIVersAction(statutDuerp, echeanceEff);
    data.statut = nouveau;
    data.leveeLe = nouveau === "levee" ? actuelle.leveeLe ?? new Date() : null;
  }

  await prisma.action.update({
    where: { id: mesureId },
    data,
  });

  if (actuelle.risqueId) {
    const { duerpId, uniteId } = await requireRisque(actuelle.risqueId);
    revalidateMesure(duerpId, uniteId, actuelle.risqueId);
  }
}

export async function supprimerMesure(mesureId: string): Promise<void> {
  const { action } = await requireMesure(mesureId);

  // Le risque porteur est résolu (et re-scopé) avant la suppression : c'est
  // lui qui donne les chemins de cache du wizard à invalider.
  const cible = action.risqueId ? await requireRisque(action.risqueId) : null;

  await prisma.action.delete({ where: { id: mesureId } });

  if (cible && action.risqueId) {
    revalidateMesure(cible.duerpId, cible.uniteId, action.risqueId);
  }
}
