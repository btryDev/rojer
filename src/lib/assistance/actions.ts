"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { requireEtablissement } from "@/lib/auth/scope";
import { decouperCheminInterne } from "@/lib/navigation/provenance";
import {
  CATEGORIES_ASSISTANCE,
  CONTEXTE_MAX,
  DEMANDES_PAR_JOUR_MAX,
  MESSAGE_MAX,
  TELEPHONE_MAX,
} from "./libelles";

export type DemandeAssistanceState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

// Un champ absent du formulaire arrive `null` (`FormData.get`), un champ
// vide arrive "" : les deux valent « non renseigné ».
const texte = (max: number) =>
  z.preprocess(
    (v) => (v === null ? undefined : typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(max).optional(),
  );

const schema = z.object({
  categorie: z.enum(CATEGORIES_ASSISTANCE),
  message: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1, "Décrivez votre besoin en quelques mots").max(MESSAGE_MAX),
  ),
  telephone: texte(TELEPHONE_MAX),
  // Champs cachés, nés des données de la page : ils se tronquent, jamais ne
  // refusent — l'utilisateur ne pourrait rien y corriger (revue du 2026-10-24).
  contexte: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().slice(0, CONTEXTE_MAX) || undefined : undefined),
    z.string().optional(),
  ),
  page: z.preprocess((v) => (typeof v === "string" && v.length <= 512 ? v : ""), z.string()),
  etablissementId: texte(64),
});

/**
 * Enregistre une demande d'assistance (« Besoin d'aide ? »). L'établissement,
 * s'il est donné, doit être celui du compte ; la page n'est gardée que si
 * c'est un chemin de ce site. L'envoi par e-mail viendra plus tard : la
 * demande est en base, et rien ne part.
 */
export async function demanderAssistance(
  _prev: DemandeAssistanceState,
  formData: FormData,
): Promise<DemandeAssistanceState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    categorie: formData.get("categorie"),
    message: formData.get("message"),
    telephone: formData.get("telephone"),
    contexte: formData.get("contexte"),
    page: formData.get("page") ?? "",
    etablissementId: formData.get("etablissementId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Formulaire invalide", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  // L'établissement donné, à défaut celui de la page (« /etablissements/{id}/… ») ;
  // 404 pour celui d'un autre compte, comme partout.
  const chemin = decouperCheminInterne(d.page);
  const deLaPage = chemin ? /^\/etablissements\/([^/]+)/.exec(chemin.pathname)?.[1] : undefined;
  const voulu = d.etablissementId ?? (deLaPage && deLaPage !== "nouveau" ? deLaPage : undefined);
  const etablissementId = voulu ? (await requireEtablissement(voulu)).etablissement.id : null;

  const depuis = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentes = await prisma.demandeAssistance.count({
    where: { userId: user.id, createdAt: { gte: depuis } },
  });
  if (recentes >= DEMANDES_PAR_JOUR_MAX) {
    return {
      status: "error",
      message: "Vos demandes du jour sont bien enregistrées : nos experts reviennent vers vous.",
    };
  }

  await prisma.demandeAssistance.create({
    data: {
      userId: user.id,
      etablissementId,
      categorie: d.categorie,
      message: d.message,
      telephone: d.telephone ?? null,
      contexte: d.contexte ?? null,
      page: chemin ? chemin.pathname : "",
    },
  });
  return { status: "success" };
}
