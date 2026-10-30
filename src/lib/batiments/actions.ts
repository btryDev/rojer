"use server";

import { requireCompte } from "@/lib/auth/compte";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import { batimentSchema, MAX_ZONES, PLAFOND_ZONES } from "./schema";

/**
 * Mutations des zones (ADR-029, qui remplace l'ADR-019). Une zone est un
 * lieu : on la nomme, on la renomme, on la supprime après avoir déplacé ce
 * qu'elle contient. Rien ici ne touche au matching ni au calendrier — la
 * zone ne porte aucun régime, la déplacer ne change aucune obligation.
 *
 * Le modèle reste `Batiment` en base : la zone est exactement le bâtiment de
 * l'ADR-019, seul le vocabulaire d'écran change.
 */

export type BatimentActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success"; id: string };

function revalider(etablissementId: string) {
  // Tous les écrans qui nomment une zone, pas seulement ceux qui les
  // listent : le calendrier porte le lieu sur chaque ligne et son sélecteur,
  // et les trois formulaires d'opérations et de relevés proposent le champ
  // « zone ». Renommer « Réserve » en « Annexe » y laissait l'ancien nom.
  const base = `/etablissements/${etablissementId}`;
  for (const chemin of [
    "",
    "/batiments",
    "/equipements",
    "/calendrier",
    "/permis-feu",
    "/plan-prevention",
    "/carnet-sanitaire",
  ]) {
    revalidatePath(`${base}${chemin}`);
  }
}

/** Scope d'une zone : elle appartient au user via son établissement. */
async function trouverBatimentDuUser(id: string) {
  const { user, db } = await requireCompte();
  return db.batiment.findFirst({
    where: { id, etablissement: { entreprise: { userId: user.id } } },
    select: { id: true, etablissementId: true, ordre: true },
  });
}

function estDoublonDeNom(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

export async function creerBatiment(
  etablissementId: string,
  _prev: BatimentActionState,
  formData: FormData,
): Promise<BatimentActionState> {
  const { db } = await assertEtablissementDuCompte(etablissementId);
  const parsed = batimentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Le rang du prochain et le compte se lisent d'un seul passage : ils
  // portent sur le même ensemble, et deux requêtes en donneraient deux
  // photos décalées.
  const existant = await db.batiment.aggregate({
    where: { etablissementId },
    _max: { ordre: true },
    _count: true,
  });

  // Le plafond vaut à l'ajout, jamais à la lecture (ADR-029) : un dossier
  // qui porte déjà quatre lieux n'en perd aucun, il n'en gagne plus.
  if (existant._count >= MAX_ZONES) {
    return {
      status: "error",
      message: PLAFOND_ZONES,
      fieldErrors: { nom: [PLAFOND_ZONES] },
    };
  }

  try {
    const b = await db.batiment.create({
      data: {
        etablissementId,
        nom: parsed.data.nom,
        complementAdresse: parsed.data.complementAdresse ?? null,
        ordre: (existant._max.ordre ?? -1) + 1,
      },
      select: { id: true },
    });
    revalider(etablissementId);
    return { status: "success", id: b.id };
  } catch (e) {
    if (estDoublonDeNom(e)) {
      return {
        status: "error",
        message: "Une zone porte déjà ce nom",
        fieldErrors: { nom: ["Une zone porte déjà ce nom"] },
      };
    }
    throw e;
  }
}

export async function modifierBatiment(
  id: string,
  _prev: BatimentActionState,
  formData: FormData,
): Promise<BatimentActionState> {
  const b = await trouverBatimentDuUser(id);
  if (!b) return { status: "error", message: "Zone introuvable" };

  const parsed = batimentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.batiment.update({
      where: { id },
      data: {
        nom: parsed.data.nom,
        complementAdresse: parsed.data.complementAdresse ?? null,
      },
    });
  } catch (e) {
    if (estDoublonDeNom(e)) {
      return {
        status: "error",
        message: "Une zone porte déjà ce nom",
        fieldErrors: { nom: ["Une zone porte déjà ce nom"] },
      };
    }
    throw e;
  }
  revalider(b.etablissementId);
  return { status: "success", id };
}

/**
 * Supprime une zone après avoir déplacé **tout** son contenu vers
 * `versBatimentId` — équipements (actifs ou retirés du parc : les seconds
 * gardent leur historique, ADR-012), points de relevé, permis, plans.
 *
 * La destination est toujours exigée, même pour une zone qui paraît vide :
 * l'interface compte les équipements actifs, la base en connaît peut-être de
 * désactivés, et les rattachements optionnels retomberaient à `null` par
 * `SetNull` — une information donnée par l'utilisateur, perdue en silence.
 *
 * La dernière zone d'un établissement ne se supprime pas (ADR-029).
 */
export async function supprimerBatiment(
  id: string,
  versBatimentId: string,
): Promise<BatimentActionState> {
  const b = await trouverBatimentDuUser(id);
  if (!b) return { status: "error", message: "Zone introuvable" };

  const destination = await prisma.batiment.findFirst({
    where: {
      id: versBatimentId,
      etablissementId: b.etablissementId,
      NOT: { id },
    },
    select: { id: true },
  });
  if (!destination) {
    // Couvre aussi la dernière zone : elle n'a aucune destination possible.
    return {
      status: "error",
      message:
        "Choisissez une autre zone de l'établissement où déplacer le contenu",
    };
  }

  // TOCTOU : entre le déplacement et le `delete`, une création concurrente
  // peut viser la zone en cours de suppression. La FK refuse alors — et
  // c'est ce qu'on veut, rien ne doit rester orphelin —, mais l'erreur
  // remontait brute depuis la server action. On la traduit.
  try {
    await prisma.$transaction(async (tx) => {
      const deplacement = {
        where: { batimentId: id },
        data: { batimentId: destination.id },
      };
      await tx.equipement.updateMany(deplacement);
      await tx.pointReleve.updateMany(deplacement);
      await tx.permisFeu.updateMany(deplacement);
      await tx.planPrevention.updateMany(deplacement);
      await tx.batiment.delete({ where: { id } });
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2003"
    ) {
      return {
        status: "error",
        message:
          "Cette zone a reçu du contenu pendant la suppression. Réessayez.",
      };
    }
    throw e;
  }

  revalider(b.etablissementId);
  return { status: "success", id };
}
