"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
 * « Évaluer les risques de vos salariés » d'Équipe, ou la relance de la fiche
 * établissement (ADR-041). `null` retire la réponse.
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

const reponseBooleenne = z.enum(["oui", "non"]);

/** La même, au format du composant `QuestionParametrage` (relances de la fiche). */
export async function repondreFaitActiviteFormulaire(
  etablissementId: string,
  champ: ChampFaitActivite,
  _prev: ReponseParametrage,
  formData: FormData,
): Promise<ReponseParametrage> {
  const parsed = reponseBooleenne.safeParse(formData.get("reponse"));
  if (!parsed.success) return { status: "error", message: "Répondez oui ou non." };
  // La relance de la fiche n'affiche pas l'avertissement du risque conservé :
  // l'étape transverse du DUERP le dit, à l'endroit où l'on peut agir.
  const r = await repondreFaitActivite(etablissementId, champ, parsed.data === "oui");
  return r.status === "success_avec_avertissement"
    ? { status: r.status, message: r.message }
    : r.status === "error"
      ? { status: "error", message: r.message }
      : { status: r.status };
}
