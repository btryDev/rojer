"use server";

import { revalidatePath } from "next/cache";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import {
  MESSAGE_REGEN_ECHEC,
  regenererApresMutation,
} from "@/lib/calendrier/regeneration-sure";
import { FAITS_ACTIVITE, type ChampFaitActivite } from "./faits-activite";
import { ecrireFaitActivite } from "./faits-activite-ecriture";
import type { ReponseParametrage } from "./parametrage";

const CHAMPS = new Set<string>(FAITS_ACTIVITE.map((f) => f.champ));

/**
 * Répond à un fait d'activité depuis un écran qui n'est pas le DUERP — l'écran
 * « Évaluer les risques de vos salariés » d'Équipe~~, ou la relance de la fiche
 * établissement~~ [2026-10-22, `lot/guide-par-module` : relance retirée, le guide renvoie à la fiche] (ADR-041). `null` retire la réponse.
 *
 * Le calendrier est régénéré : la réponse ajoute ou retire des obligations,
 * comme une réponse de la fiche (`parametrage.ts`).
 */
export async function repondreFaitActivite(
  etablissementId: string,
  champ: ChampFaitActivite,
  valeur: boolean | null,
): Promise<ReponseParametrage & { risqueConserve?: boolean }> {
  await assertEtablissementOwnership(etablissementId);
  // Le champ vient du client : une colonne arbitraire n'entre pas en base.
  if (!CHAMPS.has(champ)) return { status: "error", message: "Question inconnue." };
  // `boolean | null` n'est qu'un type : la valeur vient aussi du client.
  if (valeur !== true && valeur !== false && valeur !== null) {
    return { status: "error", message: "Répondez oui ou non." };
  }
  const { conserve } = await ecrireFaitActivite(etablissementId, champ, valeur, "si_vierge");
  const regenere = await regenererApresMutation(etablissementId, `faits-activite/${champ}`);
  revalidatePath(`/etablissements/${etablissementId}`, "layout");
  // L'étape transverse du DUERP lit le même fait.
  revalidatePath("/duerp/[id]/transverses", "page");
  const base: ReponseParametrage = regenere
    ? { status: "success" }
    : { status: "success_avec_avertissement", message: MESSAGE_REGEN_ECHEC };
  return conserve ? { ...base, risqueConserve: true } : base;
}
