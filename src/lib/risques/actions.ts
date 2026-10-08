"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ecrireFaitActivite } from "@/lib/etablissements/faits-activite-ecriture";
import { requireRisque, requireUnite } from "@/lib/auth/scope";
import { calculerCriticite } from "@/lib/cotation";
import { tousRisquesConnus } from "@/lib/referentiels";

/**
 * Cloisonnement entre clients : il n'y a pas de RLS effective en base (le
 * rôle Prisma la contourne), donc chaque action qui reçoit un identifiant du
 * client doit remonter la chaîne unité → DUERP → établissement → entreprise
 * jusqu'à `userId` AVANT toute lecture ou écriture. Les helpers
 * `requireUnite` / `requireRisque` font ça et répondent 404 (pas 403) quand
 * l'objet n'appartient pas au user : on ne révèle même pas son existence.
 */

function defautCotation(
  ref: ReturnType<typeof tousRisquesConnus> extends Map<string, infer V>
    ? V | undefined
    : never,
) {
  const gravite = ref?.graviteParDefaut ?? 2;
  const probabilite = ref?.probabiliteParDefaut ?? 2;
  const maitrise = ref?.maitriseParDefaut ?? 2;
  return {
    gravite,
    probabilite,
    maitrise,
    criticite: calculerCriticite({ gravite, probabilite, maitrise }),
  };
}

/**
 * Ajoute un risque du référentiel à une unité si pas déjà présent,
 * le retire sinon. Les mesures saisies sont conservées tant que le risque
 * reste (suppression cascade) ; en cas de désélection, tout est perdu.
 */
export async function toggleRisqueReferentiel(
  uniteId: string,
  referentielId: string,
): Promise<void> {
  const { unite } = await requireUnite(uniteId);

  const existant = await prisma.risque.findUnique({
    where: { uniteId_referentielId: { uniteId, referentielId } },
  });

  if (existant) {
    await prisma.risque.delete({ where: { id: existant.id } });
  } else {
    const ref = tousRisquesConnus().get(referentielId);
    if (!ref) throw new Error(`Risque référentiel inconnu : ${referentielId}`);
    const cot = defautCotation(ref);
    await prisma.risque.create({
      data: {
        uniteId,
        referentielId,
        libelle: ref.libelle,
        description: ref.description,
        ...cot,
      },
    });
  }

  revalidatePath(`/duerp/${unite.duerpId}/risques`);
  revalidatePath(`/duerp/${unite.duerpId}/risques/${uniteId}`);
}

const risqueCustomSchema = z.object({
  libelle: z.string().trim().min(1, "Libellé requis").max(200),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type RisqueActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success" };

export async function ajouterRisqueCustom(
  uniteId: string,
  _prev: RisqueActionState,
  formData: FormData,
): Promise<RisqueActionState> {
  // Garde d'abord, validation ensuite : un id d'unité qui n'est pas au user
  // ne doit même pas atteindre le parsing du formulaire.
  const { unite } = await requireUnite(uniteId);

  const parsed = risqueCustomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const cot = defautCotation(undefined);
  await prisma.risque.create({
    data: {
      uniteId,
      libelle: parsed.data.libelle,
      description: parsed.data.description,
      ...cot,
    },
  });

  revalidatePath(`/duerp/${unite.duerpId}/risques`);
  revalidatePath(`/duerp/${unite.duerpId}/risques/${uniteId}`);
  return { status: "success" };
}

export async function supprimerRisque(risqueId: string): Promise<void> {
  const { duerpId, uniteId } = await requireRisque(risqueId);

  await prisma.risque.delete({ where: { id: risqueId } });
  revalidatePath(`/duerp/${duerpId}/risques`);
  revalidatePath(`/duerp/${duerpId}/risques/${uniteId}`);
}

export async function modifierRisqueCustom(
  risqueId: string,
  _prev: RisqueActionState,
  formData: FormData,
): Promise<RisqueActionState> {
  const { risque: existant, duerpId, uniteId } = await requireRisque(risqueId);

  const parsed = risqueCustomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (existant.referentielId) {
    return {
      status: "error",
      message: "Les risques du référentiel ne peuvent pas être modifiés.",
    };
  }

  await prisma.risque.update({
    where: { id: risqueId },
    data: {
      libelle: parsed.data.libelle,
      description: parsed.data.description,
    },
  });

  revalidatePath(`/duerp/${duerpId}/risques`);
  revalidatePath(`/duerp/${duerpId}/risques/${uniteId}`);
  return { status: "success" };
}

const cotationSchema = z.object({
  gravite: z.coerce.number().int().min(1).max(4),
  probabilite: z.coerce.number().int().min(1).max(4),
  maitrise: z.coerce.number().int().min(1).max(4),
});

export type CotationActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; criticite: number; alerte?: string };

const infosComplementairesSchema = z.object({
  nombreSalariesExposes: z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .optional()
    .or(z.literal(NaN).transform(() => undefined))
    .or(z.literal("").transform(() => undefined)),
  dateMesuresPhysiques: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => (v ? new Date(v) : null)),
  exposeCMR: z
    .union([z.literal("on"), z.literal("true"), z.literal("1")])
    .optional()
    .transform((v) => v !== undefined),
});

export async function enregistrerCotation(
  risqueId: string,
  _prev: CotationActionState,
  formData: FormData,
): Promise<CotationActionState> {
  const { duerpId, uniteId, etablissementId } = await requireRisque(risqueId);

  const entries = Object.fromEntries(formData);
  const parsed = cotationSchema.safeParse(entries);
  if (!parsed.success) {
    return { status: "error", message: "Répondez aux trois questions." };
  }
  const criticite = calculerCriticite(parsed.data);

  // Infos complémentaires (facultatives, ne bloquent pas la cotation)
  const complementaires = infosComplementairesSchema.safeParse(entries);
  const extra = complementaires.success
    ? {
        nombreSalariesExposes:
          complementaires.data.nombreSalariesExposes ?? null,
        dateMesuresPhysiques: complementaires.data.dateMesuresPhysiques,
        exposeCMR: complementaires.data.exposeCMR ?? false,
      }
    : {};

  const risque = await prisma.risque.update({
    where: { id: risqueId },
    data: {
      ...parsed.data,
      ...extra,
      criticite,
      cotationSaisie: true,
    },
  });

  // Une exposition CMR cochée vaut « oui » pour l'établissement (ADR-041) :
  // le suivi individuel renforcé (R. 4624-23, I, 3°) est alors proposé sur les
  // fiches salarié. Décocher ne vaut pas « non » — un autre risque peut porter
  // l'exposition, et une case vide n'a jamais été une réponse.
  if (risque.exposeCMR) {
    await ecrireFaitActivite(etablissementId, "expositionCMR", true, "si_vierge");
  }

  // Alerte de sous-évaluation : on compare la gravité et la probabilité
  // isolément aux défauts du référentiel, pas la criticité agrégée.
  // Raison : la maîtrise (M) divise C, donc une bonne prévention fait
  // mécaniquement chuter C — ce n'est pas une sous-cotation, c'est l'effet
  // recherché. G et P décrivent le risque intrinsèque (ce qui peut arriver,
  // à quelle fréquence) : c'est là que la sous-évaluation est suspecte.
  let alerte: string | undefined;
  if (risque.referentielId) {
    const ref = tousRisquesConnus().get(risque.referentielId);
    if (ref) {
      const ecarts: string[] = [];
      if (parsed.data.gravite < ref.graviteParDefaut) {
        ecarts.push(
          `gravité cotée ${parsed.data.gravite}/4 (repère indicatif : ${ref.graviteParDefaut}/4)`,
        );
      }
      if (parsed.data.probabilite < ref.probabiliteParDefaut) {
        ecarts.push(
          `probabilité cotée ${parsed.data.probabilite}/4 (repère indicatif : ${ref.probabiliteParDefaut}/4)`,
        );
      }
      if (ecarts.length > 0) {
        alerte = `Écart avec le repère par défaut : ${ecarts.join(" · ")}. Si votre situation le justifie (activité marginale, faible population exposée, particularité locale), c'est acceptable — sinon réévaluez. Ce repère n'a pas de valeur réglementaire.`;
      }
    }
  }

  revalidatePath(`/duerp/${duerpId}/risques`);
  revalidatePath(`/duerp/${duerpId}/risques/${uniteId}`);
  return { status: "success", criticite, alerte };
}

